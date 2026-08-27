// PPT Slide Builder Controller (Events, Canvas Drag & Resize, Exports)
import { defaultPptSettings, sampleQuestions, pptThemes, getSlideSettings } from "../pptBranch.js";
import { getQuestionImages } from "./pptUI.js";
import { parseDocxFile, parseQuestionsText } from "../../core/docxParser.js";
import { exportQuestionsToPdf } from "../../core/pdfExporter.js";
import { exportQuestionsToPptx } from "../../core/pptxExporter.js";
import { handleFullscreenAction, bindFullscreenEvents } from "./fullscreen/fullscreenController.js";
import { renderThumbnailSlideHtml } from "./fullscreen/components/slideThumbnails.js";
import { parseRangeToIndices, calculateBatchSets, formatFileName, renderExportModalPreviewHtml } from "./fullscreen/components/exportModal.js";
import { openInPlaceCrop, initInPlaceCrop, finalizeInPlaceCrop } from "./components/inPlaceCropEngine.js";
import { openImageCropMode, initImageCropModal } from "./components/imageCropModal.js";
import { removeImageBackground, getActiveSelectedImage } from "./components/imageTools.js";



export function isTargetCurrentScope(ppt) {
  if (!ppt) return false;
  // If the user checked "Current Slide Only", ANY edit on ANY tab (Home, Design, Editor, Insert, View, Canvas, Color, Font, Stretch) applies ONLY to the active slide!
  return ppt.applyScope === "current";
}

let lastFocusedPptInput = null;
let lastFocusedPptCanvasTarget = null;
let lastActiveFormattingTarget = "english";
let pptInputUndoTimer = null;
let lastSavedRange = null;

function saveCurrentSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const el = (container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement)?.closest("[contenteditable='true']");
    if (el && el.closest(".ppt-slide-canvas-wrapper")) {
      lastSavedRange = range.cloneRange();
    }
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("selectionchange", saveCurrentSelection);
  document.addEventListener("mouseup", saveCurrentSelection);
  document.addEventListener("keyup", saveCurrentSelection);
}

export function syncCanvasEditableToState(el, state) {
  if (!el) return;
  const field = el.dataset.pptCanvasField;
  const activeQ = state.ppt?.questions?.[state.ppt.activeQuestionIndex];
  if (!activeQ) return;
  const html = el.innerHTML;
  const text = el.innerText || el.textContent || "";

  if (field === "topic") {
    activeQ.topicHtml = html;
    activeQ.topic = text;
    state.ppt.settings.topicHtml = html;
    state.ppt.settings.topic = text;
    if (state.ppt.applyScope === "all") {
      state.ppt.questions.forEach((q) => {
        q.topicHtml = html;
        q.topic = text;
      });
    }
    const ribbonInput = document.querySelector("[data-ppt-ribbon-topic]");
    if (ribbonInput && document.activeElement !== ribbonInput) ribbonInput.value = text;
  } else if (field === "english") {
    activeQ.englishHtml = html;
    activeQ.english = text;
  } else if (field === "hindi") {
    activeQ.hindiHtml = html;
    activeQ.hindi = text;
  } else if (field === "exam") {
    activeQ.examHtml = html;
    activeQ.exam = text;
  } else if (field === "number") {
    activeQ.numberHtml = html;
    activeQ.number = text;
  } else if (field === "option") {
    const oIdx = Number(el.dataset.pptCanvasOptIdx || 0);
    if (!activeQ.options) activeQ.options = [];
    if (!activeQ.options[oIdx]) activeQ.options[oIdx] = { key: String.fromCharCode(65 + oIdx), text: "" };
    activeQ.options[oIdx].textHtml = html;
    activeQ.options[oIdx].text = text;
  } else if (field === "footer") {
    state.ppt.settings.footerHtml = html;
    state.ppt.settings.footerText = text;
    if (state.ppt.applyScope === "all") {
      state.ppt.questions.forEach((q) => {
        if (q.settings) {
          q.settings.footerHtml = html;
          q.settings.footerText = text;
        }
      });
    }
  }
}

export function applyInlineFormatting(command, value, app, state, saveState) {
  let sel = window.getSelection();
  let range = null;
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    range = sel.getRangeAt(0);
  } else if (lastSavedRange) {
    range = lastSavedRange;
  }

  if (range && !range.collapsed) {
    const container = range.commonAncestorContainer;
    const el = (container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement)?.closest("[contenteditable='true']");
    if (el && el.closest(".ppt-slide-canvas-wrapper")) {
      el.focus();
      sel.removeAllRanges();
      sel.addRange(range);
      try {
        document.execCommand("styleWithCSS", false, true);
      } catch (err) {}
      document.execCommand(command, false, value);
      
      if (sel.rangeCount > 0) {
        lastSavedRange = sel.getRangeAt(0).cloneRange();
      }
      
      syncCanvasEditableToState(el, state);
      saveState(state);
      return true;
    }
  }
  return false;
}


export function ensurePptState(state) {
  if (!state.ppt) {
    state.ppt = {
      settings: { ...defaultPptSettings },
      questions: [...sampleQuestions],
      activeQuestionIndex: 0,
      showPasteBox: false,
      fsZoom: 100
    };
  }
  state.ppt.settings = { ...defaultPptSettings, ...(state.ppt.settings || {}) };
  if (!state.ppt.questions || !state.ppt.questions.length) state.ppt.questions = [...sampleQuestions];
  if (!state.ppt.fsZoom || state.ppt.fsZoom === 90 || state.ppt.fsZoom === 85 || state.ppt.fsZoom === 95 || state.ppt.fsZoom === 110) {
    state.ppt.fsZoom = 100;
  }
  if (!state.ppt.exportSettings) {
    state.ppt.exportSettings = {
      format: "pdf",
      quality: "medium",
      scope: "all",
      customRange: "",
      chunkSize: 25,
      mandatoryPrefix: "1, 2",
      mandatorySuffix: "",
      fileNamePattern: "{topic}_Set_{set}_Q{start}-Q{end}"
    };
  }
}

export function bindPptEvents(app, state, render, recordUndo, saveState, undoState, redoState) {
  if (state.mode !== "ppt-builder") return;
  ensurePptState(state);

  const fileInput = app.querySelector("[data-ppt-file-input]");
  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        await processUploadedPptFile(file, app, state, recordUndo, render);
      }
    });
  }

  const diagramFileInput = app.querySelector("[data-ppt-diagram-file-input]");
  if (diagramFileInput) {
    diagramFileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          attachImageToActiveSlide(loadEvt.target.result, app, state, recordUndo, saveState, render);
          diagramFileInput.value = "";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const dropzone = app.querySelector(".ppt-dropzone");
  if (dropzone) {
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });
    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("is-dragover");
    });
    dropzone.addEventListener("drop", async (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
      const file = e.dataTransfer.files?.[0];
      if (file) {
        await processUploadedPptFile(file, app, state, recordUndo, render);
      }
    });
  }

  // Track focused text input (middle editor)
  app.querySelectorAll("[data-ppt-q-field], [data-ppt-option-index], [data-ppt-paste-input]").forEach((input) => {
    input.addEventListener("focus", () => {
      lastFocusedPptInput = input;
      lastFocusedPptCanvasTarget = null;
      if (input.hasAttribute("data-ppt-option-index")) {
        lastActiveFormattingTarget = "options";
      } else if (input.dataset.pptQField === "hindi") {
        lastActiveFormattingTarget = "hindi";
      } else if (input.dataset.pptQField === "topic") {
        lastActiveFormattingTarget = "topic";
      } else if (input.dataset.pptQField === "exam") {
        lastActiveFormattingTarget = "exam";
      } else {
        lastActiveFormattingTarget = "english";
      }
      updateToolbarDisplay(app, state);
    });
  });

  // Track on-slide contenteditable focus
  app.querySelectorAll("[data-ppt-canvas-field]").forEach((el) => {
    el.addEventListener("focus", () => {
      recordUndo();
      lastFocusedPptCanvasTarget = el;
      lastFocusedPptInput = null;
      const field = el.dataset.pptCanvasField;
      if (field === "option") {
        lastActiveFormattingTarget = "options";
      } else if (field === "hindi") {
        lastActiveFormattingTarget = "hindi";
      } else if (field === "topic") {
        lastActiveFormattingTarget = "topic";
      } else if (field === "exam") {
        lastActiveFormattingTarget = "exam";
      } else if (field === "footer") {
        lastActiveFormattingTarget = "footer";
      } else {
        lastActiveFormattingTarget = "english";
      }
      updateToolbarDisplay(app, state);
    });
    el.addEventListener("input", (e) => handlePptCanvasInput(e, app, state, recordUndo, saveState));
  });

  // Live input handlers for active question
  app.querySelectorAll("[data-ppt-q-field]").forEach((input) => {
    input.addEventListener("input", (e) => handlePptQuestionFieldInput(e, app, state, recordUndo, saveState));
  });

  // Live input handlers for options
  app.querySelectorAll("[data-ppt-option-index]").forEach((input) => {
    input.addEventListener("input", (e) => handlePptOptionInput(e, app, state, recordUndo, saveState));
  });

  // Live input handlers for customizer settings
  app.querySelectorAll("[data-ppt-setting]").forEach((input) => {
    input.addEventListener("input", (e) => handlePptSettingInput(e, app, state, recordUndo, saveState));
    input.addEventListener("change", (e) => handlePptSettingInput(e, app, state, recordUndo, saveState));
  });

  // Live input handler for Topic Ribbon Input
  app.querySelectorAll("[data-ppt-ribbon-topic]").forEach((input) => {
    input.addEventListener("focus", () => {
      recordUndo();
    });
    input.addEventListener("input", (e) => {
      recordUndo();
      const val = e.target.value;
      const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
      if (activeQ) {
        activeQ.topic = val;
        activeQ.topicHtml = escapeHtml(val.toUpperCase());
      }
      state.ppt.settings.topic = val;
      state.ppt.settings.topicHtml = escapeHtml(val.toUpperCase());
      if (state.ppt.applyScope === "all") {
        state.ppt.questions.forEach((q) => {
          q.topic = val;
          q.topicHtml = escapeHtml(val.toUpperCase());
        });
      }
      const canvasTopic = app.querySelector('.slide-topic-title[data-ppt-canvas-field="topic"]');
      if (canvasTopic && document.activeElement !== canvasTopic) {
        canvasTopic.textContent = val.toUpperCase();
      }
      updateLiveCanvasSlide(app, state, saveState);
      saveState(state);
    });
  });

  // Toolbar font select
  const fontSel = app.querySelector('[data-ppt-tb-action="fontFamily"]');
  if (fontSel) {
    fontSel.addEventListener("change", (e) => {
      recordUndo();
      const isCurrentScope = isTargetCurrentScope(state.ppt);
      const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
      const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : state.ppt.settings;
      const targetType = getActiveFormattingTarget(app);

      if (targetType === "options") {
        targetObj.optionFontFamily = e.target.value;
      } else if (targetType === "hindi") {
        targetObj.hindiFontFamily = e.target.value;
      } else if (targetType === "topic") {
        targetObj.topicFontFamily = e.target.value;
      } else {
        targetObj.engFontFamily = e.target.value;
      }
      updateLiveCanvasSlide(app, state, saveState);
      updateToolbarDisplay(app, state);
    });
  }

  // Toolbar line height select
  const lineHSel = app.querySelector('[data-ppt-tb-action="lineHeight"]');
  if (lineHSel) {
    lineHSel.addEventListener("change", (e) => {
      recordUndo();
      const isCurrentScope = isTargetCurrentScope(state.ppt);
      const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
      const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : state.ppt.settings;
      targetObj.lineHeight = Number(e.target.value);
      updateLiveCanvasSlide(app, state, saveState);
    });
  }

  // Toolbar color inputs
  app.querySelectorAll("[data-ppt-tb-color]").forEach((colorInput) => {
    colorInput.addEventListener("input", (e) => {
      recordUndo();
      const type = e.target.dataset.pptTbColor;
      const newColor = e.target.value;

      // If text is selected on canvas, apply color ONLY to that selected text range
      const cmd = (type === "highlightColor" || type === "hiliteColor") ? "hiliteColor" : "foreColor";
      const appliedInline = applyInlineFormatting(cmd, newColor, app, state, saveState);
      if (appliedInline) {
        return;
      }

      const isCurrentScope = isTargetCurrentScope(state.ppt);
      const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
      const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : state.ppt.settings;
      const targetType = getActiveFormattingTarget(app);

      if (type === "textColor") {
        if (targetType === "options") {
          targetObj.optionTextColor = newColor;
        } else if (targetType === "hindi") {
          targetObj.hindiColor = newColor;
        } else if (targetType === "topic") {
          targetObj.topicColor = newColor;
        } else if (targetType === "exam") {
          targetObj.examColor = newColor;
        } else {
          targetObj.engColor = newColor;
        }
      } else if (type === "highlightColor") {
        targetObj.highlightColor = newColor;
      }
      updateLiveCanvasSlide(app, state, saveState);
      updateToolbarDisplay(app, state);
    });
  });

  // Toolbar action buttons
  app.querySelectorAll("[data-ppt-tb-action]").forEach((btn) => {
    if (btn.tagName === "SELECT") return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      handlePptToolbarAction(btn.dataset.pptTbAction, app, state, recordUndo, saveState, undoState, redoState, render);
    });
  });

  // Direct LaTeX Snippet Insert Buttons
  app.querySelectorAll("[data-ppt-latex]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      insertPptLatexSnippet(btn.dataset.pptLatex, app, state, recordUndo, saveState);
    });
  });

  // Format toggles (Bold, Italic, Underline, etc.)
  app.querySelectorAll("[data-ppt-tb-format]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const format = btn.dataset.pptTbFormat;
      const appliedInline = applyInlineFormatting(format, null, app, state, saveState);
      if (!appliedInline) {
        document.execCommand(format, false, null);
      }
      btn.classList.toggle("is-active", document.queryCommandState(format));
    });
  });

  // Export Settings Field Inputs (range, chunkSize, prefix, filename)
  app.querySelectorAll("[data-ppt-export-field]").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      state.ppt.exportSettings = state.ppt.exportSettings || {};
      const field = e.target.dataset.pptExportField;

      if (field === "chunkSize") {
        state.ppt.exportSettings[field] = Number(e.target.value) || 25;
      } else {
        state.ppt.exportSettings[field] = e.target.value;
      }
      saveState(state);

      const previewCol = app.querySelector(".ppt-export-col-preview");
      if (previewCol) {
        previewCol.innerHTML = renderExportModalPreviewHtml(state);
      }
    });
  });

  // Direct On-Canvas Resize Handles (Interactive Live Resizing)
  initCanvasResizeHandles(app, state, recordUndo, saveState, render);
  initInPlaceCrop(app, state, recordUndo, saveState, render);
  initImageCropModal(app, state, recordUndo, saveState, render);
  updateToolbarDisplay(app, state);
  bindFullscreenEvents(app, state, render, recordUndo, saveState);
  initSlideImageDragAndDrop(app, state, recordUndo, saveState, render);

  // Slide Image Click (Select & Switch to Insert Tab) and Double Click (In-Place Crop Mode)
  app.querySelectorAll(".slide-image-container").forEach((box) => {
    const imgId = box.dataset.imageId;
    box.addEventListener("click", (e) => {
      if (e.target.closest(".slide-image-delete-btn") || e.target.closest(".canva-handle") || e.target.closest(".slide-image-floating-toolbar") || e.target.closest(".slide-inplace-crop-overlay")) return;
      state.ppt.selectedImageId = imgId;
      if (state.ppt.fsActiveTab !== "insert") {
        state.ppt.fsActiveTab = "insert";
        render();
      } else {
        app.querySelectorAll(".slide-image-container").forEach((b) => b.classList.remove("is-selected"));
        box.classList.add("is-selected");
        saveState(state);
      }
    });

    box.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openInPlaceCrop(imgId, app, state, render);
    });
  });

  // Image Adjustment Sliders (Opacity, Brightness, Contrast)
  app.querySelectorAll("[data-ppt-img-adj]").forEach((slider) => {
    const adjType = slider.dataset.pptImgAdj;
    const label = app.querySelector(`[data-ppt-img-val="${adjType}"]`);

    slider.addEventListener("input", () => {
      const val = Number(slider.value);
      if (label) label.textContent = `${val}%`;
      const selectedImg = getActiveSelectedImage(state);
      if (selectedImg && typeof selectedImg === "object") {
        selectedImg[adjType] = val;
        const imgEl = app.querySelector(`.slide-image-container[data-image-id="${selectedImg.id}"] img`) || app.querySelector(".slide-image-container.is-selected img");
        if (imgEl) {
          const op = selectedImg.opacity !== undefined ? selectedImg.opacity : 100;
          const br = selectedImg.brightness !== undefined ? selectedImg.brightness : 0;
          const co = selectedImg.contrast !== undefined ? selectedImg.contrast : 0;
          let filterCss = `opacity(${op}%) brightness(${100 + br}%) contrast(${100 + co}%)`;
          if (selectedImg.filter === "grayscale") filterCss += " grayscale(100%)";
          else if (selectedImg.filter === "invert") filterCss += " invert(100%)";
          else if (selectedImg.filter === "high-contrast") filterCss += " contrast(180%) brightness(110%)";
          else if (selectedImg.filter === "gold") filterCss += " sepia(80%) saturate(200%) hue-rotate(5deg)";
          else if (selectedImg.filter === "blue") filterCss += " sepia(50%) saturate(200%) hue-rotate(180deg)";
          imgEl.style.filter = filterCss;
        }
      }
    });

    slider.addEventListener("change", () => {
      recordUndo();
      saveState(state);
      render();
    });
  });

  const activeEmbeddedThumb = app.querySelector(".ppt-slide-card.is-active") || app.querySelector(".ppt-sidebar-item.is-active");
  if (activeEmbeddedThumb) {
    activeEmbeddedThumb.scrollIntoView({ block: "nearest", behavior: "auto" });
  }
}


function getActiveFormattingTarget(app) {
  const selectedBox = app.querySelector(".ppt-slide-canvas-wrapper .canva-transform-box.is-selected");
  if (selectedBox) {
    if (selectedBox.classList.contains("slide-options-container") || selectedBox.closest(".slide-options-container")) return "options";
    if (selectedBox.classList.contains("slide-hindi-section") || selectedBox.closest(".slide-hindi-section")) return "hindi";
    if (selectedBox.classList.contains("slide-topic-box") || selectedBox.closest(".slide-topic-box")) return "topic";
    if (selectedBox.classList.contains("slide-exam-section") || selectedBox.closest(".slide-exam-section")) return "exam";
    if (selectedBox.classList.contains("slide-eng-section") || selectedBox.closest(".slide-eng-section")) return "english";
  }

  if (lastFocusedPptCanvasTarget && document.contains(lastFocusedPptCanvasTarget)) {
    const field = lastFocusedPptCanvasTarget.dataset.pptCanvasField;
    if (field === "option" || field === "options" || lastFocusedPptCanvasTarget.closest(".slide-options-container")) return "options";
    if (field === "hindi" || lastFocusedPptCanvasTarget.closest(".slide-hindi-section")) return "hindi";
    if (field === "topic" || lastFocusedPptCanvasTarget.closest(".slide-topic-box")) return "topic";
    if (field === "exam" || lastFocusedPptCanvasTarget.closest(".slide-exam-section")) return "exam";
    if (field === "footer" || lastFocusedPptCanvasTarget.closest(".slide-footer-bar")) return "footer";
    if (field === "english" || lastFocusedPptCanvasTarget.closest(".slide-eng-section")) return "english";
  }

  return lastActiveFormattingTarget || "english";
}

function updateToolbarDisplay(app, state) {
  const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
  const settings = getSlideSettings(state.ppt.settings, activeQ);
  const target = getActiveFormattingTarget(app);

  let font = settings.engFontFamily || "Segoe UI, Arial, sans-serif";
  let size = settings.engFontSize || 19;
  let color = settings.engColor || "#111111";

  if (target === "options") {
    font = settings.optionFontFamily || settings.engFontFamily || font;
    size = settings.optionFontSize || 18;
    color = settings.optionTextColor || color;
  } else if (target === "hindi") {
    font = settings.hindiFontFamily || "Mangal, Noto Sans Devanagari, Arial, sans-serif";
    size = settings.hindiFontSize || 18;
    color = settings.hindiColor || "#7A0000";
  } else if (target === "topic") {
    font = settings.topicFontFamily || font;
    size = settings.topicFontSize || 20;
    color = settings.topicColor || "#FFD700";
  } else if (target === "exam") {
    size = settings.examFontSize || 15;
    color = settings.examColor || "#FFFFFF";
  }

  const fontSel = app.querySelector('[data-ppt-tb-action="fontFamily"]');
  if (fontSel) fontSel.value = font;

  const sizeVal = app.querySelector("[data-ppt-tb-size-display]");
  if (sizeVal) sizeVal.textContent = size + "px";

  const textColorInp = app.querySelector('[data-ppt-tb-color="textColor"]');
  if (textColorInp && color.startsWith("#")) textColorInp.value = color;

  ["bold", "italic", "underline"].forEach((fmt) => {
    const btn = app.querySelector(`[data-ppt-tb-format="${fmt}"]`);
    if (btn) btn.classList.toggle("is-active", document.queryCommandState(fmt));
  });
}

function insertPptLatexSnippet(snippet, app, state, recordUndo, saveState) {
  recordUndo();
  if (lastFocusedPptCanvasTarget && document.contains(lastFocusedPptCanvasTarget) && lastFocusedPptCanvasTarget.isContentEditable) {
    lastFocusedPptCanvasTarget.focus();
    document.execCommand("insertText", false, snippet);
    lastFocusedPptCanvasTarget.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (lastFocusedPptInput && document.contains(lastFocusedPptInput)) {
    const start = lastFocusedPptInput.selectionStart || 0;
    const end = lastFocusedPptInput.selectionEnd || 0;
    const text = lastFocusedPptInput.value;
    lastFocusedPptInput.value = text.slice(0, start) + snippet + text.slice(end);
    lastFocusedPptInput.selectionStart = lastFocusedPptInput.selectionEnd = start + snippet.length;
    lastFocusedPptInput.focus();
    lastFocusedPptInput.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  const defaultInput = app.querySelector('[data-ppt-q-field="english"]');
  if (defaultInput) {
    defaultInput.value += " " + snippet;
    defaultInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

export function handlePptToolbarAction(action, app, state, recordUndo, saveState, undoState, redoState, render) {
  ensurePptState(state);
  const isCurrentScope = isTargetCurrentScope(state.ppt);

  const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
  const effective = getSlideSettings(state.ppt.settings, activeQ);
  const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : state.ppt.settings;

  if (action === "undo") {
    undoState();
    return;
  }
  if (action === "redo") {
    redoState();
    return;
  }

  recordUndo();
  const targetType = getActiveFormattingTarget(app);

  if (action === "font-size-inc") {
    if (targetType === "options") {
      targetObj.optionFontSize = Math.min(36, (effective.optionFontSize || 18) + 1);
    } else if (targetType === "hindi") {
      targetObj.hindiFontSize = Math.min(36, (effective.hindiFontSize || 18) + 1);
    } else if (targetType === "topic") {
      targetObj.topicFontSize = Math.min(36, (effective.topicFontSize || 20) + 1);
    } else if (targetType === "exam") {
      targetObj.examFontSize = Math.min(28, (effective.examFontSize || 15) + 1);
    } else {
      targetObj.engFontSize = Math.min(36, (effective.engFontSize || 19) + 1);
    }
    syncCustomizerSliders(app, state);
    updateLiveCanvasSlide(app, state, saveState);
    updateToolbarDisplay(app, state);
  } else if (action === "font-size-dec") {
    if (targetType === "options") {
      targetObj.optionFontSize = Math.max(10, (effective.optionFontSize || 18) - 1);
    } else if (targetType === "hindi") {
      targetObj.hindiFontSize = Math.max(10, (effective.hindiFontSize || 18) - 1);
    } else if (targetType === "topic") {
      targetObj.topicFontSize = Math.max(12, (effective.topicFontSize || 20) - 1);
    } else if (targetType === "exam") {
      targetObj.examFontSize = Math.max(10, (effective.examFontSize || 15) - 1);
    } else {
      targetObj.engFontSize = Math.max(10, (effective.engFontSize || 19) - 1);
    }
    syncCustomizerSliders(app, state);
    updateLiveCanvasSlide(app, state, saveState);
    updateToolbarDisplay(app, state);
  } else if (action === "align-left" || action === "align-center" || action === "align-right" || action === "align-justify") {
    const align = action.replace("align-", "");
    if (targetType === "options") {
      targetObj.optionAlign = align;
    } else {
      targetObj.textAlign = align;
    }
    if (lastFocusedPptCanvasTarget && document.contains(lastFocusedPptCanvasTarget) && lastFocusedPptCanvasTarget.isContentEditable) {
      document.execCommand(align === "left" ? "justifyLeft" : align === "center" ? "justifyCenter" : align === "right" ? "justifyRight" : "justifyFull");
    }
    updateLiveCanvasSlide(app, state, saveState);
    if (render) render();
  } else if (action === "valign-top" || action === "valign-middle" || action === "valign-bottom") {
    const valign = action.replace("valign-", "");
    if (targetType === "options") {
      targetObj.optValign = valign;
    } else {
      targetObj.valign = valign;
    }
    updateLiveCanvasSlide(app, state, saveState);
    if (render) render();
  } else if (action === "bullet-list") {
    const input = lastFocusedPptCanvasTarget || lastFocusedPptInput || app.querySelector('[data-ppt-q-field="english"]');
    if (input) {
      if (input.isContentEditable) {
        input.focus();
        document.execCommand("insertUnorderedList");
      } else {
        const start = input.selectionStart || 0;
        input.value = input.value.slice(0, start) + "\n• " + input.value.slice(start);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  } else if (action === "number-list") {
    const input = lastFocusedPptCanvasTarget || lastFocusedPptInput || app.querySelector('[data-ppt-q-field="english"]');
    if (input) {
      if (input.isContentEditable) {
        input.focus();
        document.execCommand("insertOrderedList");
      } else {
        const start = input.selectionStart || 0;
        input.value = input.value.slice(0, start) + "\n1. " + input.value.slice(start);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  } else if (action === "outdent") {
    const input = lastFocusedPptCanvasTarget || lastFocusedPptInput;
    if (input && input.isContentEditable) {
      input.focus();
      document.execCommand("outdent");
    }
  } else if (action === "indent") {
    const input = lastFocusedPptCanvasTarget || lastFocusedPptInput;
    if (input && input.isContentEditable) {
      input.focus();
      document.execCommand("indent");
    }
  } else if (action === "clear-format") {
    if (lastFocusedPptCanvasTarget && document.contains(lastFocusedPptCanvasTarget) && lastFocusedPptCanvasTarget.isContentEditable) {
      lastFocusedPptCanvasTarget.focus();
      document.execCommand("removeFormat");
    }
  } else if (action === "clean-math") {
    const input = lastFocusedPptCanvasTarget || lastFocusedPptInput || app.querySelector('[data-ppt-q-field="english"]');
    if (input) {
      let text = input.isContentEditable ? input.innerText : input.value;
      text = text
        .replace(/\s*\+\s*/g, " + ")
        .replace(/\s*-\s*/g, " − ")
        .replace(/\s*\*\s*/g, " × ")
        .replace(/\s*\/\s*/g, " ÷ ")
        .replace(/\s*=\s*/g, " = ");
      if (input.isContentEditable) {
        input.innerText = text;
      } else {
        input.value = text;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
}

export function handlePptAction(action, target, app, state, render, recordUndo, saveState, undoState, redoState) {
  ensurePptState(state);
  const ppt = state.ppt;
  const isCurrentScope = isTargetCurrentScope(ppt);
  const activeQ = ppt.questions[ppt.activeQuestionIndex];

  if (action === "ppt-undo" || action === "undo") {
    if (typeof undoState === "function") undoState();
    return;
  }
  if (action === "ppt-redo" || action === "redo") {
    if (typeof redoState === "function") redoState();
    return;
  }

  if (action.startsWith("ppt-fs-") || action === "ppt-open-fullscreen" || action === "ppt-close-fullscreen") {
    handleFullscreenAction(action, target, app, state, render, recordUndo, saveState);
    return;
  }

  switch (action) {

    case "ppt-toggle-fullscreen": {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      break;
    }
    case "ppt-toggle-global-current-scope": {
      recordUndo();
      ppt.applyScope = (target.checked || ppt.applyScope !== "current") ? "current" : "all";
      saveState(state);
      render();
      break;
    }
    case "ppt-set-scope": {
      const scope = target.dataset.scope || "all";
      recordUndo();
      ppt.applyScope = scope;
      saveState(state);
      render();
      break;
    }
    case "ppt-apply-slide-to-all": {
      if (activeQ) {
        recordUndo();
        const currentEffective = getSlideSettings(ppt.settings, activeQ);
        ppt.settings = { ...currentEffective };
        ppt.questions.forEach((q) => {
          delete q.settings;
        });
        ppt.applyScope = "all";
        render();
      }
      break;
    }
    case "ppt-reset-slide-override": {
      if (activeQ) {
        recordUndo();
        delete activeQ.settings;
        ppt.applyScope = "all";
        render();
      }
      break;
    }
    case "ppt-unselect-theme": {
      recordUndo();
      const isCurrentScope = (ppt.applyScope === "current");
      const activeQ = ppt.questions[ppt.activeQuestionIndex];
      const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : ppt.settings;
      targetObj.isCustomTemplateMode = true;
      targetObj.showHeader = false;
      targetObj.showFooter = false;
      targetObj.showDivider = false;
      targetObj.showQBadge = true;
      targetObj.showEnglish = true;
      targetObj.showHindi = true;
      targetObj.showExamTag = true;
      targetObj.showOptions = true;
      targetObj.optionStyle = "clean";
      if (targetObj.examTagPosition === "header") {
        targetObj.examTagPosition = "below-question";
      }
      targetObj.theme = "custom";
      if (!isCurrentScope) {
        ppt.questions.forEach((q) => {
          if (q.settings) {
            q.settings.showHeader = false;
            q.settings.showFooter = false;
            q.settings.showDivider = false;
            q.settings.optionStyle = "clean";
          }
        });
      }
      saveState(state);
      render();
      break;
    }
    case "ppt-apply-theme":
    case "ppt-set-theme": {
      const themeKey = target.dataset.themeKey || target.dataset.theme;
      const themeObj = pptThemes[themeKey];
      if (themeObj) {
        recordUndo();
        const isCurrentScope = (ppt.applyScope === "current");
        const activeQ = ppt.questions[ppt.activeQuestionIndex];
        const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : ppt.settings;
        delete targetObj.bgImage; // unselect custom background when theme selected
        delete targetObj.isCustomTemplateMode;
        targetObj.showHeader = true;
        targetObj.showFooter = true;
        targetObj.showDivider = true;
        targetObj.optionStyle = "card";
        if (!isCurrentScope) {
          ppt.questions.forEach((q) => {
            if (q.settings) {
              delete q.settings.bgImage;
              delete q.settings.isCustomTemplateMode;
            }
          });
        }
        Object.assign(targetObj, themeObj);
        targetObj.theme = themeKey;
        saveState(state);
        render();
      }
      break;
    }

    case "ppt-set-apply-scope": {
      const scope = target.dataset.scope || (ppt.applyScope === "current" ? "all" : "current");
      ppt.applyScope = scope;
      saveState(state);
      render();
      break;
    }
    case "ppt-set-bg-fit": {
      const fit = target.dataset.fit || "stretch";
      recordUndo();
      const isCurrentScope = (ppt.applyScope === "current");
      const activeQ = ppt.questions[ppt.activeQuestionIndex];
      const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : ppt.settings;
      targetObj.bgFit = fit;
      if (!isCurrentScope) {
        ppt.questions.forEach((q) => { if (q.settings) q.settings.bgFit = fit; });
      }
      saveState(state);
      render();
      break;
    }
    case "ppt-apply-bg-to-all":
    case "ppt-apply-to-all":
    case "ppt-apply-all": {
      recordUndo();
      const activeQ = ppt.questions[ppt.activeQuestionIndex];
      const currentEff = getSlideSettings(ppt.settings, activeQ);

      const keysToCopy = [
        "bgImage", "bgFit", "slideBg", "isCustomTemplateMode", "theme",
        "showHeader", "showFooter", "showDivider", "showEnglish", "showHindi", "showExamTag", "showQBadge", "showOptions",
        "qBadgePosX", "qBadgePosY", "qBadgeSize", "qBadgeBg", "qBadgeColor",
        "examTagPosX", "examTagPosY", "examFontSize", "examTagBg", "examTagColor", "examColor", "examTagPosition", "examTagStyle", "examTagRadius", "examTagPaddingX", "examTagPaddingY",
        "boxPosX", "boxPosY", "questionBoxWidth", "questionPadding", "layoutPreset",
        "engPosX", "engPosY", "engWidth", "engColor", "engFontSize", "engFontFamily",
        "hindiPosX", "hindiPosY", "hindiWidth", "hindiColor", "hindiFontSize", "hindiFontFamily",
        "textAlign", "lineHeight",
        "dividerPosX", "dividerPosY", "dividerWidth", "dividerThickness", "dividerColor", "dividerSpacing",
        "optionsPosX", "optionsPosY", "optionWidthPercent", "optionGap", "optionsLayout", "optionStyle",
        "optionCardBg", "optionCardBorder", "optionRadius", "optionPadding", "optionBadgeBg", "optionBadgeColor", "optionTextColor", "optionFontSize", "optionFontFamily", "optionAlign",
        "headerBg", "headerHeight", "topicPosX", "topicPosY", "topicColor", "topicFontSize",
        "footerBg", "footerColor", "footerHeight", "footerFontSize", "footerText"
      ];

      keysToCopy.forEach((k) => {
        if (currentEff[k] !== undefined) {
          ppt.settings[k] = currentEff[k];
        }
      });

      // Clear conflicting per-slide overrides on all question slides (preserving blank slide independence)
      ppt.questions.forEach((q) => {
        if (q.settings && q.layout !== "blank") {
          keysToCopy.forEach((k) => {
            delete q.settings[k];
          });
          if (Object.keys(q.settings).length === 0) delete q.settings;
        }
      });


      // Copy Topic to global settings and all slides from active slide or live canvas
      const canvasTopicEl = app.querySelector('.slide-topic-title[data-ppt-canvas-field="topic"]');
      const liveTopicVal = (canvasTopicEl && canvasTopicEl.textContent.trim()) ? canvasTopicEl.textContent.trim() : (activeQ?.topic || ppt.settings.topic);
      if (liveTopicVal) {
        if (activeQ) activeQ.topic = liveTopicVal;
        ppt.settings.topic = liveTopicVal;
        ppt.questions.forEach((q) => {
          q.topic = liveTopicVal;
        });
        const ribbonTopicInput = app.querySelector("[data-ppt-ribbon-topic]");
        if (ribbonTopicInput) ribbonTopicInput.value = liveTopicVal;
      }

      ppt.applyScope = "all";
      saveState(state);
      render();
      break;
    }


    case "ppt-set-preset":
    case "ppt-set-layout-preset": {
      const rawPreset = target.dataset.preset || "standard";
      const preset = (rawPreset === "standard") ? "full-width" : rawPreset;
      recordUndo();
      const isCurrentScope = (ppt.applyScope === "current");
      const activeQ = ppt.questions[ppt.activeQuestionIndex];
      const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : ppt.settings;
      targetObj.layoutPreset = preset;
      if (preset === "right-split") {
        targetObj.boxPosX = 42;
        targetObj.questionBoxWidth = 56;
      } else if (preset === "left-split") {
        targetObj.boxPosX = 0;
        targetObj.questionBoxWidth = 56;
      } else {
        targetObj.boxPosX = 0;
        targetObj.questionBoxWidth = 100;
      }
      saveState(state);
      render();
      break;
    }

    case "ppt-set-option-style": {
      const style = target.dataset.style || "card";
      recordUndo();
      const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : ppt.settings;
      targetObj.optionStyle = style;
      render();
      break;
    }
    case "ppt-wizard-set-preset": {
      const preset = target.dataset.preset;
      if (!ppt.wizardSettings) ppt.wizardSettings = { ...ppt.settings };
      ppt.wizardSettings.layoutPreset = preset;
      if (preset === "right-split") {
        ppt.wizardSettings.boxPosX = 42;
        ppt.wizardSettings.questionBoxWidth = 56;
      } else if (preset === "left-split") {
        ppt.wizardSettings.boxPosX = 0;
        ppt.wizardSettings.questionBoxWidth = 56;
      } else {
        ppt.wizardSettings.boxPosX = 0;
        ppt.wizardSettings.questionBoxWidth = 100;
      }
      render();
      break;
    }
    case "ppt-wizard-set-option-style": {
      const optStyle = target.dataset.style;
      if (!ppt.wizardSettings) ppt.wizardSettings = { ...ppt.settings };
      ppt.wizardSettings.optionStyle = optStyle;
      render();
      break;
    }
    case "ppt-wizard-set-theme": {
      const themeKey = target.dataset.theme;
      const themeObj = pptThemes[themeKey];
      if (!ppt.wizardSettings) ppt.wizardSettings = { ...ppt.settings };
      if (themeObj) {
        ppt.wizardSettings = { ...ppt.wizardSettings, ...themeObj, theme: themeKey };
      }
      render();
      break;
    }
    case "ppt-cancel-wizard": {
      ppt.showImportWizard = false;
      ppt.pendingImportQuestions = null;
      ppt.wizardSettings = null;
      render();
      break;
    }
    case "ppt-confirm-wizard-generate": {
      recordUndo();
      if (ppt.pendingImportQuestions && ppt.pendingImportQuestions.length) {
        ppt.questions = ppt.pendingImportQuestions;
        ppt.activeQuestionIndex = 0;
      }
      if (ppt.wizardSettings) {
        ppt.settings = { ...ppt.settings, ...ppt.wizardSettings };
      }
      ppt.showImportWizard = false;
      ppt.pendingImportQuestions = null;
      ppt.wizardSettings = null;
      render();
      break;
    }
    case "ppt-set-option-layout": {
      const layout = target.dataset.layout || "2-col";
      recordUndo();
      const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : ppt.settings;
      targetObj.optionsLayout = layout;
      render();
      break;
    }
    case "ppt-set-exam-position": {
      const pos = target.dataset.position || "below-question";
      recordUndo();
      const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : ppt.settings;
      targetObj.examTagPosition = pos;
      render();
      break;
    }
    case "ppt-set-exam-style": {
      const style = target.dataset.style || "pill";
      recordUndo();
      const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : ppt.settings;
      targetObj.examTagStyle = style;
      render();
      break;
    }
    case "ppt-reset-positions": {
      recordUndo();
      if (isCurrentScope && activeQ && activeQ.settings) {
        delete activeQ.settings;
      } else {
        ppt.settings.boxPosX = 0;
        ppt.settings.boxPosY = 0;
        ppt.settings.engPosX = 0;
        ppt.settings.engPosY = 0;
        ppt.settings.engWidth = 100;
        ppt.settings.hindiPosX = 0;
        ppt.settings.hindiPosY = 0;
        ppt.settings.hindiWidth = 100;
        ppt.settings.topicPosX = 0;
        ppt.settings.topicPosY = 0;
        ppt.settings.dividerPosX = 0;
        ppt.settings.dividerWidth = 100;
        ppt.settings.examTagPosX = 0;
        ppt.settings.examTagPosY = 0;
        ppt.settings.optionsPosX = 0;
        ppt.settings.optionsPosY = 0;
        ppt.settings.optionWidthPercent = 96;
      }
      render();
      break;
    }
    case "ppt-divider-match-eng": {
      recordUndo();
      const eff = getSlideSettings(ppt.settings, activeQ);
      const targetObj = (isCurrentScope && activeQ) ? (activeQ.settings = activeQ.settings || {}) : ppt.settings;
      targetObj.dividerWidth = eff.engWidth || 100;
      targetObj.dividerPosX = eff.engPosX || 0;
      render();
      break;
    }
    case "ppt-browse-file": {
      const fileInput = app.querySelector("[data-ppt-file-input]");
      if (fileInput) fileInput.click();
      break;
    }
    case "ppt-open-paste-modal":
    case "ppt-open-paste-box": {
      ppt.isPasteModalOpen = true;
      ppt.showPasteBox = true;
      render();
      break;
    }
    case "ppt-close-paste-modal":
    case "ppt-close-paste-box": {
      ppt.isPasteModalOpen = false;
      ppt.showPasteBox = false;
      render();
      break;
    }
    case "ppt-paste-from-clipboard-btn": {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then((clipText) => {
          const textarea = app.querySelector("[data-ppt-paste-input]");
          if (textarea && clipText) {
            textarea.value = clipText;
          }
        }).catch((err) => {
          console.warn("Clipboard read error:", err);
        });
      }
      break;
    }
    case "ppt-load-sample-paste": {
      const textarea = app.querySelector("[data-ppt-paste-input]");
      if (textarea) {
        textarea.value = `Q.1 If x + y = 10 and x - y = 4, find the value of x.
यदि x + y = 10 और x - y = 4 है, तो x का मान ज्ञात कीजिए।
(A) 7
(B) 6
(C) 5
(D) 3
[TOPIC: ALGEBRA]
Ans: A (SSC CGL 2024 Tier-1 Shift 1)

Q.2 In how many years will a sum become 3.5 times itself at 14% SI?
एक धनराशि 14% साधारण ब्याज पर कितने वर्षों में स्वयं की 3.5 गुनी हो जाएगी?
(A) 15 years
(B) 18 years
(C) 20 years
(D) 25 years
[TOPIC: SIMPLE INTEREST]
Ans: C (SSC GD 2024 Shift 2)`;
      }
      break;
    }
    case "ppt-apply-topic-to-all": {
      recordUndo();
      const activeQ = ppt.questions[ppt.activeQuestionIndex];
      const canvasTopicEl = app.querySelector('.slide-topic-title[data-ppt-canvas-field="topic"]');
      const ribbonTopicInput = app.querySelector("[data-ppt-ribbon-topic]");
      
      let topicVal = "";
      if (document.activeElement === canvasTopicEl && canvasTopicEl.textContent.trim()) {
        topicVal = canvasTopicEl.textContent.trim();
      } else if (ribbonTopicInput && ribbonTopicInput.value.trim()) {
        topicVal = ribbonTopicInput.value.trim();
      } else if (canvasTopicEl && canvasTopicEl.textContent.trim()) {
        topicVal = canvasTopicEl.textContent.trim();
      } else {
        topicVal = activeQ?.topic || ppt.settings.topic || "TOPIC";
      }

      if (activeQ) activeQ.topic = topicVal;
      ppt.settings.topic = topicVal;
      ppt.questions.forEach((q) => {
        q.topic = topicVal;
      });
      if (ribbonTopicInput) ribbonTopicInput.value = topicVal;
      updateLiveCanvasSlide(app, state, saveState);
      saveState(state);
      render();
      break;
    }
    case "ppt-process-paste": {
      const textarea = app.querySelector("[data-ppt-paste-input]");
      const topicInput = app.querySelector("[data-ppt-paste-topic]") || app.querySelector("[data-ppt-ribbon-topic]");
      const defaultTopic = (topicInput && topicInput.value.trim()) ? topicInput.value.trim() : (ppt.settings.topic || "TOPIC");
      const rawText = textarea ? textarea.value : "";
      if (!rawText.trim()) {
        alert("Please paste question text.");
        return;
      }
      const parsed = parseQuestionsText(rawText, defaultTopic);
      if (parsed.length) {
        recordUndo();
        ppt.pendingImportQuestions = parsed;
        ppt.wizardSettings = {
          ...ppt.settings,
          layoutPreset: "right-split",
          boxPosX: 42,
          questionBoxWidth: 56,
          optionStyle: "clean",
          theme: "dark",
          topic: defaultTopic,
          ...(pptThemes?.dark || {})
        };
        ppt.showImportWizard = true;
        ppt.showPasteBox = false;
        ppt.isPasteModalOpen = false;
        render();
      } else {
        alert("Could not parse any questions. Please check the format.");
      }
      break;
    }
    case "ppt-load-samples": {
      recordUndo();
      ppt.questions = JSON.parse(JSON.stringify(sampleQuestions));
      ppt.activeQuestionIndex = 0;
      render();
      break;
    }
    case "ppt-prev-slide": {
      if (ppt.activeQuestionIndex > 0) {
        ppt.activeQuestionIndex -= 1;
        render();
      }
      break;
    }
    case "ppt-next-slide": {
      if (ppt.activeQuestionIndex < ppt.questions.length - 1) {
        ppt.activeQuestionIndex += 1;
        render();
      }
      break;
    }
    case "ppt-move-slide-up": {
      const idx = Number(target.dataset.slideIndex ?? ppt.activeQuestionIndex);
      if (idx > 0 && idx < ppt.questions.length) {
        recordUndo();
        const [moved] = ppt.questions.splice(idx, 1);
        ppt.questions.splice(idx - 1, 0, moved);
        ppt.activeQuestionIndex = idx - 1;
        saveState(state);
        render();
      }
      break;
    }
    case "ppt-move-slide-down": {
      const idx = Number(target.dataset.slideIndex ?? ppt.activeQuestionIndex);
      if (idx >= 0 && idx < ppt.questions.length - 1) {
        recordUndo();
        const [moved] = ppt.questions.splice(idx, 1);
        ppt.questions.splice(idx + 1, 0, moved);
        ppt.activeQuestionIndex = idx + 1;
        saveState(state);
        render();
      }
      break;
    }
    case "ppt-select-slide":
    case "ppt-jump-slide": {
      const slideBtn = target.closest("[data-slide-index]");
      const idx = Number(slideBtn ? slideBtn.dataset.slideIndex : (target.dataset.slideIndex || 0));
      if (!isNaN(idx)) {
        recordUndo();
        ppt.activeQuestionIndex = Math.max(0, Math.min(idx, ppt.questions.length - 1));
        render();
      }
      break;
    }
    case "ppt-add-slide": {
      recordUndo();
      const currentIdx = (ppt.activeQuestionIndex >= 0 && ppt.activeQuestionIndex < ppt.questions.length) 
        ? ppt.activeQuestionIndex 
        : (ppt.questions.length - 1);
      const insertIdx = currentIdx + 1;
      const newIndex = insertIdx + 1;
      const newSlide = {
        id: `q_${Date.now()}`,
        number: `Q.${newIndex}`,
        exam: ppt.settings.defaultExam || "SSC CGL (Shift 1)",
        topic: ppt.settings.topic || "TOPIC",
        topicHtml: ppt.settings.topicHtml || "",
        english: "",
        hindi: "",
        options: [
          { key: "A", text: "" },
          { key: "B", text: "" },
          { key: "C", text: "" },
          { key: "D", text: "" }
        ]
      };
      ppt.questions.splice(insertIdx, 0, newSlide);
      ppt.activeQuestionIndex = insertIdx;
      saveState(state);
      render();
      break;
    }
    case "ppt-add-blank-slide": {
      recordUndo();
      const currentIdx = (ppt.activeQuestionIndex >= 0 && ppt.activeQuestionIndex < ppt.questions.length) 
        ? ppt.activeQuestionIndex 
        : (ppt.questions.length - 1);
      const insertIdx = currentIdx + 1;
      const newIndex = insertIdx + 1;
      const newSlide = {
        id: `q_${Date.now()}`,
        number: `Slide ${newIndex}`,
        layout: "blank",
        exam: "",
        topic: "",
        english: "",
        hindi: "",
        options: [],
        settings: {
          slideBg: "#FFFFFF",
          showDivider: false,
          showFooter: false
        }
      };
      ppt.questions.splice(insertIdx, 0, newSlide);
      ppt.activeQuestionIndex = insertIdx;
      saveState(state);
      render();
      break;
    }

    case "ppt-duplicate-slide": {
      const currentQ = ppt.questions[ppt.activeQuestionIndex];
      if (currentQ) {
        recordUndo();
        const copy = JSON.parse(JSON.stringify(currentQ));
        copy.id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        // Duplicate means exact 1:1 duplicate - keep exact original question number, formatting, and content
        ppt.questions.splice(ppt.activeQuestionIndex + 1, 0, copy);
        ppt.activeQuestionIndex += 1;
        saveState(state);
        render();
      }
      break;
    }
    case "ppt-delete-slide": {
      if (ppt.questions.length <= 1) {
        alert("Cannot delete the only slide.");
        return;
      }
      if (confirm("Delete this slide?")) {
        recordUndo();
        ppt.questions.splice(ppt.activeQuestionIndex, 1);
        ppt.activeQuestionIndex = Math.max(0, Math.min(ppt.activeQuestionIndex, ppt.questions.length - 1));
        render();
      }
      break;
    }
    case "ppt-export-pptx": {
      handlePptExportPptx(app, state);
      break;
    }
    case "ppt-export-pdf-high": {
      handlePptExportPdf("high", app, state);
      break;
    }
    case "ppt-export-pdf-medium": {
      handlePptExportPdf("medium", app, state);
      break;
    }
    case "ppt-export-pdf-low": {
      handlePptExportPdf("low", app, state);
      break;
    }
    case "ppt-set-export-quality":
    case "ppt-set-modal-export-quality": {
      ppt.exportSettings = ppt.exportSettings || {};
      ppt.exportSettings.quality = target.dataset.quality || "medium";
      saveState(state);
      render();
      break;
    }
    case "ppt-set-export-format": {
      ppt.exportSettings = ppt.exportSettings || {};
      ppt.exportSettings.format = target.dataset.format || "pdf";
      saveState(state);
      render();
      break;
    }
    case "ppt-set-export-scope":
    case "ppt-set-modal-export-scope": {
      ppt.exportSettings = ppt.exportSettings || {};
      ppt.exportSettings.scope = target.dataset.scope || "all";
      saveState(state);
      render();
      break;
    }
    case "ppt-open-export-modal": {
      ppt.isExportModalOpen = true;
      render();
      break;
    }
    case "ppt-close-export-modal": {
      ppt.isExportModalOpen = false;
      render();
      break;
    }
    case "ppt-insert-token": {
      const token = target.dataset.token;
      if (token) {
        ppt.exportSettings = ppt.exportSettings || {};
        ppt.exportSettings.fileNamePattern = (ppt.exportSettings.fileNamePattern || "") + token;
        saveState(state);
        render();
      }
      break;
    }
    case "ppt-run-configured-export": {
      handlePptRunConfiguredExport(app, state);
      break;
    }
    case "ppt-export-single-set-pdf": {
      const setNum = parseInt(target.dataset.setNum, 10) || 1;
      handlePptExportSingleSetPdf(setNum, app, state);
      break;
    }
    case "ppt-export-single-set-pptx": {
      const setNum = parseInt(target.dataset.setNum, 10) || 1;
      handlePptExportSingleSetPptx(setNum, app, state);
      break;
    }
    case "ppt-batch-export-all-sets": {
      handlePptBatchExportAllSets(app, state);
      break;
    }
    case "ppt-run-modal-single-pdf": {
      handlePptRunModalSinglePdf(app, state);
      break;
    }
    case "ppt-run-modal-single-pptx": {
      handlePptRunModalSinglePptx(app, state);
      break;
    }
    case "ppt-trigger-docx-upload": {
      const fileInput = app.querySelector(".ppt-fs-docx-hidden-input") || app.querySelector("[data-ppt-file-input]");
      if (fileInput) {
        fileInput.value = "";
        fileInput.click();
      }
      break;
    }
    case "ppt-upload-docx": {
      const file = target.files?.[0];
      if (file) {
        processUploadedPptFile(file, app, state, recordUndo, render);
      }
      break;
    }
    case "ppt-trigger-bg-image-upload": {
      const fileInput = app.querySelector(".ppt-fs-bg-image-hidden-input") || app.querySelector("[data-ppt-bg-image-input]");
      if (fileInput) {
        fileInput.value = "";
        fileInput.click();
      }
      break;
    }
    case "ppt-upload-bg-image": {
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
          recordUndo();
          const dataUrl = re.target.result;
          if (state.ppt.applyScope === "current") {
            if (activeQ) activeQ.bgImage = dataUrl;
          } else {
            state.ppt.settings.bgImage = dataUrl;
          }
          saveState(state);
          render();
        };
        reader.readAsDataURL(file);
      }
      break;
    }
    case "ppt-clear-bg-image": {
      recordUndo();
      if (state.ppt.applyScope === "current") {
        if (activeQ) delete activeQ.bgImage;
      } else {
        delete state.ppt.settings.bgImage;
        state.ppt.questions.forEach((q) => { delete q.bgImage; });
      }
      saveState(state);
      render();
      break;
    }
    case "ppt-trigger-image-upload": {
      const diagInput = app.querySelector("[data-ppt-diagram-file-input]");
      if (diagInput) diagInput.click();
      break;
    }


    case "ppt-remove-image": {
      const imgId = target?.dataset?.imageId || state.ppt.selectedImageId;
      if (activeQ) {
        recordUndo();
        if (Array.isArray(activeQ.images)) {
          if (imgId) {
            activeQ.images = activeQ.images.filter((im) => (im.id || im) !== imgId);
          } else {
            activeQ.images.pop();
          }
        }
        delete activeQ.image;
        saveState(state);
        render();
      }
      break;
    }
    case "ppt-trigger-crop-mode": {
      const imgId = target?.dataset?.imageId || state.ppt.selectedImageId;
      openInPlaceCrop(imgId, app, state, render);
      break;
    }
    case "ppt-crop-apply": {
      finalizeInPlaceCrop(app, state, recordUndo, saveState, render);
      break;
    }
    case "ppt-crop-cancel": {
      state.ppt.activeCrop = null;
      render();
      break;
    }
    case "ppt-crop-reset": {
      if (state.ppt.activeCrop) {
        state.ppt.activeCrop.cropLeft = 0;
        state.ppt.activeCrop.cropTop = 0;
        state.ppt.activeCrop.cropRight = 0;
        state.ppt.activeCrop.cropBottom = 0;
        render();
      }
      break;
    }
    case "ppt-remove-image-bg": {
      const selectedImg = getActiveSelectedImage(state);
      if (selectedImg && (selectedImg.dataUrl || typeof selectedImg === "string")) {
        recordUndo();
        const dataUrl = typeof selectedImg === "string" ? selectedImg : selectedImg.dataUrl;
        removeImageBackground(dataUrl, 35).then((transparentUrl) => {
          if (typeof selectedImg === "object") {
            selectedImg.dataUrl = transparentUrl;
          } else {
            activeQ.image = transparentUrl;
          }
          saveState(state);
          render();
        });
      }
      break;
    }
    case "ppt-make-transparent-math": {
      const selectedImg = getActiveSelectedImage(state);
      if (selectedImg && (selectedImg.dataUrl || typeof selectedImg === "string")) {
        recordUndo();
        const dataUrl = typeof selectedImg === "string" ? selectedImg : selectedImg.dataUrl;
        removeImageBackground(dataUrl, 50).then((transparentUrl) => {
          if (typeof selectedImg === "object") {
            selectedImg.dataUrl = transparentUrl;
            selectedImg.contrast = 35;
          } else {
            activeQ.image = transparentUrl;
          }
          saveState(state);
          render();
        });
      }
      break;
    }
    case "ppt-reset-image-adjustments": {
      const selectedImg = getActiveSelectedImage(state);
      if (selectedImg && typeof selectedImg === "object") {
        recordUndo();
        selectedImg.opacity = 100;
        selectedImg.brightness = 0;
        selectedImg.contrast = 0;
        selectedImg.filter = "none";
        selectedImg.rotation = 0;
        selectedImg.flipH = false;
        selectedImg.flipV = false;
        saveState(state);
        render();
      }
      break;
    }
    case "ppt-set-image-filter": {
      const filter = target?.dataset?.filter || "none";
      const selectedImg = getActiveSelectedImage(state);
      if (selectedImg && typeof selectedImg === "object") {
        recordUndo();
        selectedImg.filter = filter;
        saveState(state);
        render();
      }
      break;
    }
    case "ppt-rotate-image": {
      const selectedImg = getActiveSelectedImage(state);
      if (selectedImg && typeof selectedImg === "object") {
        recordUndo();
        selectedImg.rotation = ((selectedImg.rotation || 0) + 90) % 360;
        saveState(state);
        render();
      }
      break;
    }
    case "ppt-flip-image-h": {
      const selectedImg = getActiveSelectedImage(state);
      if (selectedImg && typeof selectedImg === "object") {
        recordUndo();
        selectedImg.flipH = !selectedImg.flipH;
        saveState(state);
        render();
      }
      break;
    }
    case "ppt-flip-image-v": {
      const selectedImg = getActiveSelectedImage(state);
      if (selectedImg && typeof selectedImg === "object") {
        recordUndo();
        selectedImg.flipV = !selectedImg.flipV;
        saveState(state);
        render();
      }
      break;
    }
    case "ppt-paste-image-clipboard": {
      pastePptImageFromClipboard(app, state, recordUndo, saveState, render);
      break;
    }
  }
}

export async function processUploadedPptFile(file, app, state, recordUndo, render) {
  ensurePptState(state);
  const isDocx = file.name.endsWith(".docx") || file.type.includes("wordprocessingml");

  try {
    let parsed = [];
    if (isDocx) {
      parsed = await parseDocxFile(file);
    } else {
      const text = await file.text();
      parsed = parseQuestionsText(text, state.ppt.settings.topic);
    }

    if (parsed && parsed.length) {
      recordUndo();
      state.ppt.pendingImportQuestions = parsed;
      state.ppt.wizardSettings = {
        ...state.ppt.settings,
        layoutPreset: "right-split",
        boxPosX: 42,
        questionBoxWidth: 56,
        optionStyle: "clean",
        theme: "dark",
        ...(pptThemes?.dark || {})
      };
      state.ppt.showImportWizard = true;
      render();
    } else {
      alert("No questions could be extracted from this file. Please check format.");
    }
  } catch (err) {
    console.error(err);
    alert("Error parsing file: " + err.message);
  }
}

function handlePptQuestionFieldInput(e, app, state, recordUndo, saveState) {
  ensurePptState(state);
  if (!pptInputUndoTimer) {
    recordUndo();
  }
  clearTimeout(pptInputUndoTimer);
  pptInputUndoTimer = setTimeout(() => {
    pptInputUndoTimer = null;
  }, 1000);

  const field = e.target.dataset.pptQField;
  const val = e.target.value;
  const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
  if (!activeQ) return;

  activeQ[field] = val;
  updateLiveCanvasSlide(app, state, saveState);
}

function handlePptOptionInput(e, app, state, recordUndo, saveState) {
  ensurePptState(state);
  if (!pptInputUndoTimer) {
    recordUndo();
  }
  clearTimeout(pptInputUndoTimer);
  pptInputUndoTimer = setTimeout(() => {
    pptInputUndoTimer = null;
  }, 1000);

  const optIndex = Number(e.target.dataset.pptOptionIndex);
  const val = e.target.value;
  const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
  if (!activeQ || isNaN(optIndex)) return;

  if (!activeQ.options) activeQ.options = [];
  if (!activeQ.options[optIndex]) {
    activeQ.options[optIndex] = { key: String.fromCharCode(65 + optIndex), text: val };
  } else {
    activeQ.options[optIndex].text = val;
  }

  updateLiveCanvasSlide(app, state, saveState);
}

function handlePptCanvasInput(e, app, state, recordUndo, saveState) {
  ensurePptState(state);
  if (!pptInputUndoTimer) {
    recordUndo();
  }
  clearTimeout(pptInputUndoTimer);
  pptInputUndoTimer = setTimeout(() => {
    pptInputUndoTimer = null;
  }, 1000);

  const field = e.target.dataset.pptCanvasField;
  const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
  if (!activeQ) return;
  const text = e.target.innerText || e.target.textContent || "";

  if (field === "english") {
    activeQ.english = text;
    const txtArea = app.querySelector('[data-ppt-q-field="english"]');
    if (txtArea && document.activeElement !== txtArea) txtArea.value = text;
  } else if (field === "hindi") {
    activeQ.hindi = text;
    const txtArea = app.querySelector('[data-ppt-q-field="hindi"]');
    if (txtArea && document.activeElement !== txtArea) txtArea.value = text;
  } else if (field === "number") {
    activeQ.number = text;
    const input = app.querySelector('[data-ppt-q-field="number"]');
    if (input && document.activeElement !== input) input.value = text;
    const activePill = app.querySelector(`.ppt-slide-pill[data-slide-index="${state.ppt.activeQuestionIndex}"]`);
    if (activePill) activePill.textContent = text;
  } else if (field === "exam") {
    activeQ.exam = text;
    const input = app.querySelector('[data-ppt-q-field="exam"]');
    if (input && document.activeElement !== input) input.value = text;
  } else if (field === "topic") {
    activeQ.topic = text;
    state.ppt.settings.topic = text;
    const input = app.querySelector('[data-ppt-q-field="topic"]');
    if (input && document.activeElement !== input) input.value = text;
    const ribbonTopicInput = app.querySelector("[data-ppt-ribbon-topic]");
    if (ribbonTopicInput && document.activeElement !== ribbonTopicInput) ribbonTopicInput.value = text;
    if (state.ppt.applyScope === "all") {
      state.ppt.questions.forEach((q) => { q.topic = text; });
    }
  } else if (field === "option") {
    const oIdx = Number(e.target.dataset.pptCanvasOptIdx || 0);
    if (!activeQ.options) activeQ.options = [];
    if (!activeQ.options[oIdx]) {
      activeQ.options[oIdx] = { key: String.fromCharCode(65 + oIdx), text };
    } else {
      activeQ.options[oIdx].text = text;
    }
    const optInput = app.querySelector(`[data-ppt-option-index="${oIdx}"]`);
    if (optInput && document.activeElement !== optInput) optInput.value = text;
  } else if (field === "footer") {
    state.ppt.settings.footerText = text;
    const footerInput = app.querySelector('[data-ppt-setting="footerText"]');
    if (footerInput && document.activeElement !== footerInput) footerInput.value = text;
  }

  syncCanvasEditableToState(e.target, state);
  updateLiveCanvasSlide(app, state, saveState);
  saveState(state);
}


function handlePptSettingInput(e, app, state, recordUndo, saveState) {
  ensurePptState(state);
  recordUndo();
  const key = e.target.dataset.pptSetting;
  let val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
  if (e.target.type === "range" || e.target.type === "number") val = Number(val);

  if (e.target.type === "color" && (key === "engColor" || key === "hindiColor" || key === "topicColor" || key === "optionTextColor" || key === "examTagColor" || key === "footerColor")) {
    const appliedInline = applyInlineFormatting("foreColor", val, app, state, saveState);
    if (appliedInline) {
      return;
    }
  }

  const ppt = state.ppt;
  const activeQ = ppt.questions?.[ppt.activeQuestionIndex];
  const isCurrentScope = isTargetCurrentScope(ppt);

  if (isCurrentScope && activeQ) {
    if (!activeQ.settings) activeQ.settings = {};
    activeQ.settings[key] = val;
    if (key === "topic") {
      activeQ.topic = val;
      activeQ.topicHtml = escapeHtml(val.toUpperCase());
    }
    if (key === "footerText") {
      activeQ.settings.footerHtml = escapeHtml(val);
    }
  } else {
    state.ppt.settings[key] = val;
    if (key === "topic") {
      state.ppt.settings.topicHtml = escapeHtml(val.toUpperCase());
      state.ppt.questions.forEach((q) => {
        q.topic = val;
        q.topicHtml = escapeHtml(val.toUpperCase());
      });
    }
    if (key === "footerText") {
      state.ppt.settings.footerHtml = escapeHtml(val);
    }
    state.ppt.questions.forEach((q) => {
      if (q.settings && key in q.settings) {
        delete q.settings[key];
        if (key === "footerText") delete q.settings.footerHtml;
        if (Object.keys(q.settings).length === 0) delete q.settings;
      }
    });
  }

  updateLiveCanvasSlide(app, state, saveState);
  saveState(state);
}

export function initCanvasResizeHandles(app, state, recordUndo, saveState, render) {
  const canvasWrappers = app.querySelectorAll(".ppt-slide-canvas-wrapper");
  if (!canvasWrappers.length) return;

  function isEventOnBorderOrPill(e, box) {
    if (e.target.closest(".canva-drag-bar") || e.target.closest(".canva-drag-pill") || e.target.closest(".slide-divider-drag")) {
      return true;
    }
    if (e.target.closest(".canva-handle") || e.target.closest(".slide-image-delete-btn")) {
      return false;
    }
    const rect = box.getBoundingClientRect();
    const borderMargin = 10; // 10px grab zone around the bounding box
    const x = e.clientX;
    const y = e.clientY;
    const nearTop = Math.abs(y - rect.top) <= borderMargin;
    const nearBottom = Math.abs(y - rect.bottom) <= borderMargin;
    const nearLeft = Math.abs(x - rect.left) <= borderMargin;
    const nearRight = Math.abs(x - rect.right) <= borderMargin;
    return nearTop || nearBottom || nearLeft || nearRight;
  }

  function getBoxTransformType(b) {
    let t = b.dataset.pptResizeType;
    if (!t) {
      if (b.classList.contains("slide-topic-box")) t = "topic-position";
      else if (b.classList.contains("slide-q-badge-box") || b.classList.contains("slide-standalone-q-badge-box")) t = "qbadge-position";
      else if (b.classList.contains("slide-exam-header-box") || b.classList.contains("slide-exam-section") || b.classList.contains("slide-standalone-exam-tag")) t = "exam-position";
      else if (b.classList.contains("slide-eng-section")) t = "eng-position";
      else if (b.classList.contains("slide-hindi-section")) t = "hindi-position";
      else if (b.classList.contains("slide-divider-wrapper")) t = "divider-position";
      else if (b.classList.contains("slide-options-container")) t = "options-position";
      else if (b.classList.contains("slide-image-container")) t = "image-position";
    }
    return t;
  }

  canvasWrappers.forEach((canvasWrapper) => {
    const resizableBoxes = canvasWrapper.querySelectorAll(".canva-transform-box");

    // 1. Marquee Drag Selection on Canvas Background
    canvasWrapper.addEventListener("mousedown", (e) => {
      if (e.target.closest(".canva-transform-box") || e.target.closest(".canva-handle") || e.target.closest(".slide-image-delete-btn")) {
        return;
      }

      if (!e.shiftKey && !e.ctrlKey) {
        resizableBoxes.forEach((b) => b.classList.remove("is-selected"));
      }

      const wrapperRect = canvasWrapper.getBoundingClientRect();
      const stageScaler = canvasWrapper.closest(".ppt-fs-stage-scaler");
      const zoomScale = stageScaler ? ((state.ppt.fsZoom || 100) / 100) : 1;

      const startCanvasX = (e.clientX - wrapperRect.left) / zoomScale;
      const startCanvasY = (e.clientY - wrapperRect.top) / zoomScale;

      const marquee = document.createElement("div");
      marquee.className = "canva-marquee-selection";
      marquee.style.left = `${startCanvasX}px`;
      marquee.style.top = `${startCanvasY}px`;
      marquee.style.width = "0px";
      marquee.style.height = "0px";
      canvasWrapper.appendChild(marquee);

      function onMarqueeMouseMove(moveEvt) {
        const curCanvasX = (moveEvt.clientX - wrapperRect.left) / zoomScale;
        const curCanvasY = (moveEvt.clientY - wrapperRect.top) / zoomScale;

        const left = Math.min(startCanvasX, curCanvasX);
        const top = Math.min(startCanvasY, curCanvasY);
        const width = Math.abs(curCanvasX - startCanvasX);
        const height = Math.abs(curCanvasY - startCanvasY);

        marquee.style.left = `${left}px`;
        marquee.style.top = `${top}px`;
        marquee.style.width = `${width}px`;
        marquee.style.height = `${height}px`;

        if (width > 4 || height > 4) {
          const marqueeRect = {
            left: Math.min(e.clientX, moveEvt.clientX),
            top: Math.min(e.clientY, moveEvt.clientY),
            right: Math.max(e.clientX, moveEvt.clientX),
            bottom: Math.max(e.clientY, moveEvt.clientY)
          };

          resizableBoxes.forEach((b) => {
            const bRect = b.getBoundingClientRect();
            const intersects = !(
              bRect.right < marqueeRect.left ||
              bRect.left > marqueeRect.right ||
              bRect.bottom < marqueeRect.top ||
              bRect.top > marqueeRect.bottom
            );
            if (intersects) {
              b.classList.add("is-selected");
            } else if (!e.shiftKey && !e.ctrlKey) {
              b.classList.remove("is-selected");
            }
          });
        }
      }

      function onMarqueeMouseUp() {
        document.removeEventListener("mousemove", onMarqueeMouseMove);
        document.removeEventListener("mouseup", onMarqueeMouseUp);
        if (marquee.parentNode) marquee.parentNode.removeChild(marquee);
      }

      document.addEventListener("mousemove", onMarqueeMouseMove);
      document.addEventListener("mouseup", onMarqueeMouseUp);
    });

    // 2. Individual Box Selection & Group Dragging
    resizableBoxes.forEach((box) => {
      box.addEventListener("mousemove", (e) => {
        if (e.target.closest(".canva-handle") || e.target.closest(".slide-image-delete-btn")) return;
        const isImage = box.classList.contains("slide-image-container");
        const onBorder = isImage || isEventOnBorderOrPill(e, box);
        if (onBorder) {
          box.style.cursor = "move";
        } else {
          const isText = !!(e.target.closest("[contenteditable='true']") || e.target.closest(".slide-eng-text") || e.target.closest(".slide-hindi-text") || e.target.closest(".slide-opt-text") || e.target.closest(".slide-topic-title") || e.target.closest(".slide-exam-title") || e.target.closest(".slide-q-badge") || e.target.closest(".slide-standalone-exam-tag"));
          box.style.cursor = isText ? "text" : "default";
        }
      });

      box.addEventListener("mousedown", (e) => {
        if (e.target.closest(".canva-handle") || e.target.closest(".canva-pill-action") || e.target.closest(".slide-image-delete-btn")) return;

        const isImage = box.classList.contains("slide-image-container");
        const isMultiToggle = e.shiftKey || e.ctrlKey;
        if (isMultiToggle) {
          box.classList.toggle("is-selected");
        } else {
          if (!box.classList.contains("is-selected")) {
            resizableBoxes.forEach((b) => b.classList.remove("is-selected"));
            box.classList.add("is-selected");
          }
        }

        const onBorder = isImage || isEventOnBorderOrPill(e, box);
        if (!onBorder) {
          return;
        }

        const isCurrentScope = isTargetCurrentScope(state.ppt);
        const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
        if (!activeQ) return;
        const initialSettings = { ...getSlideSettings(state.ppt.settings, activeQ) };
        const imgList = getQuestionImages(activeQ);

        // Collect all currently selected boxes on this slide for simultaneous group movement
        const selectedBoxes = Array.from(canvasWrapper.querySelectorAll(".canva-transform-box.is-selected"));
        if (!selectedBoxes.includes(box)) {
          selectedBoxes.push(box);
        }

        const groupItems = selectedBoxes.map((b) => {
          const bType = getBoxTransformType(b);
          const bImgId = b.dataset.imageId;
          const bImg = imgList.find((im) => (im.id || im) === bImgId) || imgList[0];
          return {
            box: b,
            type: bType,
            targetImg: bImg,
            initialImage: bImg ? { ...bImg } : null
          };
        }).filter((item) => !!item.type);

        if (!groupItems.length) return;

        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const stageScaler = canvasWrapper.closest(".ppt-fs-stage-scaler");
        const zoomScale = stageScaler ? ((state.ppt.fsZoom || 100) / 100) : 1;
        let hasMoved = false;

        function setTransform(key, value) {
          if (isCurrentScope && activeQ) {
            if (!activeQ.settings) activeQ.settings = {};
            activeQ.settings[key] = value;
          } else {
            state.ppt.settings[key] = value;
            if (activeQ && activeQ.settings && key in activeQ.settings) {
              delete activeQ.settings[key];
              if (Object.keys(activeQ.settings).length === 0) delete activeQ.settings;
            }
          }
        }

        function onBoxMouseMove(moveEvt) {
          const rawDeltaX = moveEvt.clientX - startX;
          const rawDeltaY = moveEvt.clientY - startY;

          if (!hasMoved) {
            if (Math.abs(rawDeltaX) > 2 || Math.abs(rawDeltaY) > 2) {
              hasMoved = true;
            } else {
              return;
            }
          }

          moveEvt.preventDefault();
          const deltaX = rawDeltaX / zoomScale;
          const deltaY = rawDeltaY / zoomScale;

          // Apply delta to EVERY selected item in the group simultaneously!
          groupItems.forEach((item) => {
            const { type, targetImg, initialImage } = item;
            if (type === "topic-position") {
              setTransform("topicPosX", Math.round((initialSettings.topicPosX || 0) + deltaX));
              setTransform("topicPosY", Math.round((initialSettings.topicPosY || 0) + deltaY));
            } else if (type === "qbadge-position") {
              setTransform("qBadgePosX", Math.round((initialSettings.qBadgePosX || 0) + deltaX));
              setTransform("qBadgePosY", Math.round((initialSettings.qBadgePosY || 0) + deltaY));
            } else if (type === "exam-position") {
              setTransform("examTagPosX", Math.round((initialSettings.examTagPosX || 0) + deltaX));
              setTransform("examTagPosY", Math.round((initialSettings.examTagPosY || 0) + deltaY));
            } else if (type === "eng-position") {
              setTransform("engPosX", Math.round((initialSettings.engPosX || 0) + deltaX));
              setTransform("engPosY", Math.round((initialSettings.engPosY || 0) + deltaY));
            } else if (type === "hindi-position") {
              setTransform("hindiPosX", Math.round((initialSettings.hindiPosX || 0) + deltaX));
              setTransform("hindiPosY", Math.round((initialSettings.hindiPosY || 0) + deltaY));
            } else if (type === "divider-position") {
              setTransform("dividerPosX", Math.round((initialSettings.dividerPosX || 0) + deltaX));
              setTransform("dividerPosY", Math.round((initialSettings.dividerPosY || 0) + deltaY));
            } else if (type === "options-position") {
              setTransform("optionsPosX", Math.round((initialSettings.optionsPosX || 0) + deltaX));
              setTransform("optionsPosY", Math.round((initialSettings.optionsPosY || 0) + deltaY));
            } else if (type === "image-position" && targetImg && initialImage) {
              targetImg.posX = Math.round((initialImage.posX || 0) + deltaX);
              targetImg.posY = Math.round((initialImage.posY || 0) + deltaY);
            }
          });

          updateLiveCanvasSlide(app, state, saveState);
          syncCustomizerSliders(app, state);
        }

        function onBoxMouseUp() {
          document.removeEventListener("mousemove", onBoxMouseMove);
          document.removeEventListener("mouseup", onBoxMouseUp);
          if (hasMoved) {
            recordUndo();
            syncCustomizerSliders(app, state);
            updateLiveCanvasSlide(app, state, saveState);
          } else if (isImage) {
            const imgId = box.dataset.imageId;
            const now = Date.now();
            const lastClick = box._lastClickTime || 0;
            if (now - lastClick < 350) {
              // Double click detected -> Open In-Place Crop Mode!
              box._lastClickTime = 0;
              openInPlaceCrop(imgId, app, state, render);
            } else {
              // Single click detected -> Select image & Switch to Insert tab!
              box._lastClickTime = now;
              state.ppt.selectedImageId = imgId;
              if (state.ppt.fsActiveTab !== "insert") {
                state.ppt.fsActiveTab = "insert";
                render();
              } else {
                canvasWrapper.querySelectorAll(".slide-image-container").forEach((b) => b.classList.remove("is-selected"));
                box.classList.add("is-selected");
                saveState(state);
                render();
              }
            }
          }
        }

        document.addEventListener("mousemove", onBoxMouseMove);
        document.addEventListener("mouseup", onBoxMouseUp);
      });
    });

    const handles = canvasWrapper.querySelectorAll("[data-ppt-resize-type]");
    handles.forEach((handle) => {
      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const type = handle.dataset.pptResizeType;
        const isCurrentScope = isTargetCurrentScope(state.ppt);

        const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
        const initialSettings = { ...getSlideSettings(state.ppt.settings, activeQ) };
        const imgId = handle.dataset.imageId;
        const imgList = getQuestionImages(activeQ);
        const targetImg = imgList.find((im) => (im.id || im) === imgId) || imgList[0];
        const initialImage = targetImg ? { ...targetImg } : { posX: 0, posY: 0, width: 320, height: 180 };
        const imgAspect = (initialImage.width && initialImage.height) ? (initialImage.width / initialImage.height) : (16 / 9);
        const wrapperRect = canvasWrapper.getBoundingClientRect();

        const startX = e.clientX;
        const startY = e.clientY;
        const stageScaler = canvasWrapper.closest(".ppt-fs-stage-scaler");
        const zoomScale = stageScaler ? ((state.ppt.fsZoom || 100) / 100) : 1;

        function setTransform(key, value) {
          if (isCurrentScope && activeQ) {
            if (!activeQ.settings) activeQ.settings = {};
            activeQ.settings[key] = value;
          } else {
            state.ppt.settings[key] = value;
            if (activeQ && activeQ.settings && key in activeQ.settings) {
              delete activeQ.settings[key];
              if (Object.keys(activeQ.settings).length === 0) delete activeQ.settings;
            }
          }
        }

        function onMouseMove(moveEvent) {
          const deltaX = (moveEvent.clientX - startX) / zoomScale;
          const deltaY = (moveEvent.clientY - startY) / zoomScale;
          const deltaPercent = (deltaX / (wrapperRect.width / zoomScale)) * 100;

          const clampW = (initialW, delta) => Math.round(Math.max(10, Math.min(250, (initialW || 100) + delta)));

          if (type === "eng-position") {
            setTransform("engPosX", Math.round((initialSettings.engPosX || 0) + deltaX));
            setTransform("engPosY", Math.round((initialSettings.engPosY || 0) + deltaY));
          } else if (type === "eng-resize-e") {
            setTransform("engWidth", clampW(initialSettings.engWidth, deltaPercent));
          } else if (type === "eng-resize-w") {
            setTransform("engWidth", clampW(initialSettings.engWidth, -deltaPercent));
            setTransform("engPosX", Math.round((initialSettings.engPosX || 0) + deltaX));
          } else if (type === "eng-resize-se" || type === "eng-resize-ne") {
            setTransform("engWidth", clampW(initialSettings.engWidth, deltaPercent));
          } else if (type === "eng-resize-sw" || type === "eng-resize-nw") {
            setTransform("engWidth", clampW(initialSettings.engWidth, -deltaPercent));
            setTransform("engPosX", Math.round((initialSettings.engPosX || 0) + deltaX));
          }

          else if (type === "hindi-position") {
            setTransform("hindiPosX", Math.round((initialSettings.hindiPosX || 0) + deltaX));
            setTransform("hindiPosY", Math.round((initialSettings.hindiPosY || 0) + deltaY));
          } else if (type === "hindi-resize-e") {
            setTransform("hindiWidth", clampW(initialSettings.hindiWidth, deltaPercent));
          } else if (type === "hindi-resize-w") {
            setTransform("hindiWidth", clampW(initialSettings.hindiWidth, -deltaPercent));
            setTransform("hindiPosX", Math.round((initialSettings.hindiPosX || 0) + deltaX));
          } else if (type === "hindi-resize-se" || type === "hindi-resize-ne") {
            setTransform("hindiWidth", clampW(initialSettings.hindiWidth, deltaPercent));
          } else if (type === "hindi-resize-sw" || type === "hindi-resize-nw") {
            setTransform("hindiWidth", clampW(initialSettings.hindiWidth, -deltaPercent));
            setTransform("hindiPosX", Math.round((initialSettings.hindiPosX || 0) + deltaX));
          }

          else if (type === "divider-position") {
            setTransform("dividerPosX", Math.round((initialSettings.dividerPosX || 0) + deltaX));
            setTransform("dividerPosY", Math.round((initialSettings.dividerPosY || 0) + deltaY));
          } else if (type === "divider-resize-e") {
            setTransform("dividerWidth", clampW(initialSettings.dividerWidth, deltaPercent));
          } else if (type === "divider-resize-w") {
            setTransform("dividerWidth", clampW(initialSettings.dividerWidth, -deltaPercent));
            setTransform("dividerPosX", Math.round((initialSettings.dividerPosX || 0) + deltaX));
          }

          else if (type === "qbadge-position") {
            setTransform("qBadgePosX", Math.round((initialSettings.qBadgePosX || 0) + deltaX));
            setTransform("qBadgePosY", Math.round((initialSettings.qBadgePosY || 0) + deltaY));
          } else if (type === "qbadge-resize-se" || type === "qbadge-resize-ne" || type === "qbadge-resize-sw" || type === "qbadge-resize-nw") {
            const scaleDelta = (type === "qbadge-resize-se" || type === "qbadge-resize-ne") ? deltaX : -deltaX;
            const newSize = Math.round(Math.max(10, Math.min(48, (initialSettings.qBadgeSize || 18) + (scaleDelta / 6))));
            setTransform("qBadgeSize", newSize);
          }

          else if (type === "topic-position") {
            setTransform("topicPosX", Math.round((initialSettings.topicPosX || 0) + deltaX));
            setTransform("topicPosY", Math.round((initialSettings.topicPosY || 0) + deltaY));
          } else if (type === "topic-resize-se" || type === "topic-resize-ne" || type === "topic-resize-sw" || type === "topic-resize-nw") {
            const scaleDelta = (type === "topic-resize-se" || type === "topic-resize-ne") ? deltaX : -deltaX;
            const newSize = Math.round(Math.max(12, Math.min(48, (initialSettings.topicFontSize || 20) + (scaleDelta / 8))));
            setTransform("topicFontSize", newSize);
          }

          else if (type === "exam-position") {
            setTransform("examTagPosX", Math.round((initialSettings.examTagPosX || 0) + deltaX));
            setTransform("examTagPosY", Math.round((initialSettings.examTagPosY || 0) + deltaY));
          } else if (type === "exam-resize-se" || type === "exam-resize-ne" || type === "exam-resize-sw" || type === "exam-resize-nw" || type === "exam-resize-e" || type === "exam-resize-w") {
            const scaleDelta = (type === "exam-resize-se" || type === "exam-resize-ne" || type === "exam-resize-e") ? deltaX : -deltaX;
            const newSize = Math.round(Math.max(10, Math.min(36, (initialSettings.examFontSize || 15) + (scaleDelta / 8))));
            setTransform("examFontSize", newSize);
          }


          else if (type === "options-position") {
            setTransform("optionsPosX", Math.round((initialSettings.optionsPosX || 0) + deltaX));
            setTransform("optionsPosY", Math.round((initialSettings.optionsPosY || 0) + deltaY));
          } else if (type === "options-resize-e") {
            setTransform("optionWidthPercent", clampW(initialSettings.optionWidthPercent || 96, deltaPercent));
          } else if (type === "options-resize-w") {
            setTransform("optionWidthPercent", clampW(initialSettings.optionWidthPercent || 96, -deltaPercent));
            setTransform("optionsPosX", Math.round((initialSettings.optionsPosX || 0) + deltaX));
          }

          // Exact Proportional & Side Image Resizing (Pinned 1:1 to Mouse Cursor)
          else if (type === "image-position" && targetImg) {
            targetImg.posX = Math.round((initialImage.posX || 0) + deltaX);
            targetImg.posY = Math.round((initialImage.posY || 0) + deltaY);
          } else if (type === "image-resize-se" && targetImg) {
            const initW = initialImage.width || 320;
            const initH = initialImage.height || 180;
            const diag = Math.sqrt(initW * initW + initH * initH);
            const proj = (deltaX * initW + deltaY * initH) / diag;
            const scale = Math.max(0.08, (diag + proj) / diag);
            const newW = Math.round(Math.max(30, initW * scale));
            const newH = Math.round(newW / imgAspect);
            targetImg.width = newW;
            targetImg.height = newH;
          } else if (type === "image-resize-sw" && targetImg) {
            const initW = initialImage.width || 320;
            const initH = initialImage.height || 180;
            const diag = Math.sqrt(initW * initW + initH * initH);
            const proj = (-deltaX * initW + deltaY * initH) / diag;
            const scale = Math.max(0.08, (diag + proj) / diag);
            const newW = Math.round(Math.max(30, initW * scale));
            const newH = Math.round(newW / imgAspect);
            targetImg.width = newW;
            targetImg.height = newH;
            targetImg.posX = Math.round((initialImage.posX || 0) + (initW - newW));
          } else if (type === "image-resize-ne" && targetImg) {
            const initW = initialImage.width || 320;
            const initH = initialImage.height || 180;
            const diag = Math.sqrt(initW * initW + initH * initH);
            const proj = (deltaX * initW - deltaY * initH) / diag;
            const scale = Math.max(0.08, (diag + proj) / diag);
            const newW = Math.round(Math.max(30, initW * scale));
            const newH = Math.round(newW / imgAspect);
            targetImg.width = newW;
            targetImg.height = newH;
            targetImg.posY = Math.round((initialImage.posY || 0) + (initH - newH));
          } else if (type === "image-resize-nw" && targetImg) {
            const initW = initialImage.width || 320;
            const initH = initialImage.height || 180;
            const diag = Math.sqrt(initW * initW + initH * initH);
            const proj = (-deltaX * initW - deltaY * initH) / diag;
            const scale = Math.max(0.08, (diag + proj) / diag);
            const newW = Math.round(Math.max(30, initW * scale));
            const newH = Math.round(newW / imgAspect);
            targetImg.width = newW;
            targetImg.height = newH;
            targetImg.posX = Math.round((initialImage.posX || 0) + (initW - newW));
            targetImg.posY = Math.round((initialImage.posY || 0) + (initH - newH));
          } else if (type === "image-resize-e" && targetImg) {
            targetImg.width = Math.round(Math.max(30, (initialImage.width || 320) + deltaX));
          } else if (type === "image-resize-w" && targetImg) {
            const initW = initialImage.width || 320;
            const newW = Math.round(Math.max(30, initW - deltaX));
            targetImg.posX = Math.round((initialImage.posX || 0) + (initW - newW));
            targetImg.width = newW;
          } else if (type === "image-resize-s" && targetImg) {
            targetImg.height = Math.round(Math.max(30, (initialImage.height || 180) + deltaY));
          } else if (type === "image-resize-n" && targetImg) {
            const initH = initialImage.height || 180;
            const newH = Math.round(Math.max(30, initH - deltaY));
            targetImg.posY = Math.round((initialImage.posY || 0) + (initH - newH));
            targetImg.height = newH;
          } else if (type === "image-rotation" && targetImg) {
            const centerX = (initialImage.posX || 0) + (initialImage.width || 320) / 2;
            const centerY = (initialImage.posY || 0) + (initialImage.height || 180) / 2;
            const mouseCanvasX = (moveEvent.clientX - wrapperRect.left) / zoomScale;
            const mouseCanvasY = (moveEvent.clientY - wrapperRect.top) / zoomScale;
            const rad = Math.atan2(mouseCanvasY - centerY, mouseCanvasX - centerX);
            let deg = Math.round(rad * (180 / Math.PI)) - 90;
            if (deg < 0) deg += 360;
            if (deg >= 360) deg -= 360;
            if (Math.abs(deg - 0) < 4 || Math.abs(deg - 360) < 4) deg = 0;
            if (Math.abs(deg - 90) < 4) deg = 90;
            if (Math.abs(deg - 180) < 4) deg = 180;
            if (Math.abs(deg - 270) < 4) deg = 270;
            targetImg.rotation = deg;
          }

          else if (type === "header-height") {
            const newH = Math.round(Math.max(48, Math.min(120, (initialSettings.headerHeight || 64) + deltaY)));
            setTransform("headerHeight", newH);
          } else if (type === "footer-height") {
            const newH = Math.round(Math.max(20, Math.min(60, (initialSettings.footerHeight || 28) - deltaY)));
            setTransform("footerHeight", newH);
          }

          updateLiveCanvasSlide(app, state, saveState);
          syncCustomizerSliders(app, state);
        }

        function onMouseUp() {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
          recordUndo();
          syncCustomizerSliders(app, state);
          updateLiveCanvasSlide(app, state, saveState);
        }

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    });
  });
}


export function syncCustomizerSliders(app, state) {
  const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
  const settings = getSlideSettings(state.ppt.settings, activeQ);
  const customizer = app.querySelector(".ppt-tools-panel") || app.querySelector(".ppt-customizer-panel");
  if (!customizer) return;

  customizer.querySelectorAll("[data-ppt-setting]").forEach((input) => {
    const key = input.dataset.pptSetting;
    if (settings[key] !== undefined) {
      if (input.type === "checkbox") {
        input.checked = settings[key];
      } else {
        input.value = settings[key];
      }
    }
  });
}

export function updateLiveCanvasSlide(app, state, saveState) {
  const canvasWrappers = typeof document !== "undefined" ? document.querySelectorAll(".ppt-slide-canvas-wrapper") : app.querySelectorAll(".ppt-slide-canvas-wrapper");
  if (!canvasWrappers.length) return;

  const ppt = state.ppt;
  const activeQ = ppt.questions[ppt.activeQuestionIndex] || {};
  const settings = getSlideSettings(ppt.settings, activeQ);
  const isBlankSlide = (activeQ.layout === "blank");

  canvasWrappers.forEach((canvasWrapper) => {
    if (isBlankSlide) {
      if (activeQ.settings && activeQ.settings.bgImage) {
        let bgSize = "100% 100%";
        if (activeQ.settings.bgFit === "cover") bgSize = "cover";
        else if (activeQ.settings.bgFit === "contain") bgSize = "contain";
        canvasWrapper.style.backgroundImage = `url("${activeQ.settings.bgImage}")`;
        canvasWrapper.style.backgroundSize = bgSize;
        canvasWrapper.style.backgroundPosition = "center";
        canvasWrapper.style.backgroundRepeat = "no-repeat";
      } else {
        canvasWrapper.style.backgroundImage = "none";
        canvasWrapper.style.background = (activeQ.settings && activeQ.settings.slideBg) || "#FFFFFF";
      }
    } else if (settings.bgImage) {
      let bgSize = "100% 100%";
      if (settings.bgFit === "cover") bgSize = "cover";
      else if (settings.bgFit === "contain") bgSize = "contain";
      canvasWrapper.style.backgroundImage = `url("${settings.bgImage}")`;
      canvasWrapper.style.backgroundSize = bgSize;
      canvasWrapper.style.backgroundPosition = "center";
      canvasWrapper.style.backgroundRepeat = "no-repeat";
    } else {
      canvasWrapper.style.backgroundImage = "none";
      canvasWrapper.style.background = settings.slideBg || "#FFFFFF";
    }




    // Blank slide direct text
    const pureBlank = canvasWrapper.querySelector(".ppt-pure-blank-canvas");
    if (pureBlank) {
      pureBlank.style.fontFamily = settings.engFontFamily || "Segoe UI, Arial, sans-serif";
      pureBlank.style.fontSize = `${settings.engFontSize || 20}px`;
      if (typeof document !== "undefined" && document.activeElement !== pureBlank && !pureBlank.contains(document.activeElement)) {
        pureBlank.textContent = activeQ.english || "";
      }
    }

    // Top Header Bar
    const headerBar = canvasWrapper.querySelector(".slide-header-bar");
    if (headerBar) {
      headerBar.style.display = (settings.showHeader !== false && !isBlankSlide) ? "flex" : "none";
      headerBar.style.background = settings.headerBg || "#7A0000";
      headerBar.style.height = `${settings.headerHeight || 64}px`;
    }

    const qBadgeBoxes = canvasWrapper.querySelectorAll(".slide-q-badge-box, .slide-standalone-q-badge-box");
    qBadgeBoxes.forEach((b) => {
      b.style.transform = `translate(${settings.qBadgePosX || 0}px, ${settings.qBadgePosY || 0}px)`;
    });

    const headerQBox = canvasWrapper.querySelector(".slide-q-badge-box");
    if (headerQBox) {
      headerQBox.style.display = (settings.showQBadge !== false && settings.showHeader !== false && !isBlankSlide) ? "inline-flex" : "none";
    }

    const standaloneQBox = canvasWrapper.querySelector(".slide-standalone-q-badge-box");
    if (standaloneQBox) {
      standaloneQBox.style.display = (settings.showHeader === false && settings.showQBadge !== false && !isBlankSlide) ? "inline-flex" : "none";
    }

    const qBadges = canvasWrapper.querySelectorAll(".slide-q-badge");
    qBadges.forEach((qBadge) => {
      qBadge.style.display = (settings.showQBadge !== false) ? (settings.showHeader !== false ? "flex" : "inline-flex") : "none";
      qBadge.style.background = settings.qBadgeBg || "#FFFFFF";
      const defaultQColor = settings.theme === "purple" ? "#4C1D95" : (settings.theme === "navy" ? "#0A1931" : "#7A0000");
      qBadge.style.color = settings.qBadgeColor || defaultQColor;
      qBadge.style.fontSize = `${settings.qBadgeSize || 18}px`;
      if (typeof document !== "undefined" && document.activeElement !== qBadge && !qBadge.contains(document.activeElement)) {
        qBadge.textContent = activeQ.number || `Q.${ppt.activeQuestionIndex + 1}`;
      }
    });


    const examHeaderBox = canvasWrapper.querySelector(".slide-exam-header-box");
    if (examHeaderBox) {
      examHeaderBox.style.display = (settings.showExamTag !== false && settings.examTagPosition === "header" && !isBlankSlide) ? "inline-flex" : "none";
      examHeaderBox.style.transform = `translate(${settings.examTagPosX || 0}px, ${settings.examTagPosY || 0}px)`;
    }

    const examTitle = canvasWrapper.querySelector(".slide-exam-title");
    if (examTitle) {
      examTitle.style.color = settings.examColor || "#FFFFFF";
      examTitle.style.fontSize = `${settings.examFontSize || 19}px`;
      if (typeof document !== "undefined" && document.activeElement !== examTitle && !examTitle.contains(document.activeElement)) {
        if (activeQ.examHtml) {
          examTitle.innerHTML = activeQ.examHtml;
        } else {
          examTitle.textContent = activeQ.exam || settings.defaultExam || "SSC CGL (Shift 1)";
        }
      }
    }


    const topicBox = canvasWrapper.querySelector(".slide-topic-box");
    if (topicBox) {
      topicBox.style.transform = `translate(${settings.topicPosX || 0}px, ${settings.topicPosY || 0}px)`;
    }
    const topicTitle = canvasWrapper.querySelector(".slide-topic-title");
    if (topicTitle) {
      topicTitle.style.color = settings.topicColor || "#FFD700";
      topicTitle.style.fontSize = `${settings.topicFontSize || 20}px`;
      if (typeof document !== "undefined" && document.activeElement !== topicTitle && !topicTitle.contains(document.activeElement)) {
        if (activeQ.topicHtml || settings.topicHtml) {
          topicTitle.innerHTML = activeQ.topicHtml || settings.topicHtml;
        } else {
          topicTitle.textContent = (activeQ.topic || settings.topic || "TOPIC").toUpperCase();
        }
      }
    }

    // Slide Body Area
    const bodyArea = canvasWrapper.querySelector(".slide-body-content");
    if (bodyArea) {
      const posX = settings.boxPosX !== undefined ? settings.boxPosX : (settings.layoutPreset === "right-split" ? 42 : 0);
      const boxW = settings.questionBoxWidth || (settings.layoutPreset === "right-split" || settings.layoutPreset === "left-split" ? 56 : 100);
      bodyArea.style.transform = `translate(${posX}%, ${settings.boxPosY || 0}px)`;
      bodyArea.style.width = `${boxW}%`;
      bodyArea.style.padding = `${settings.questionPadding || 16}px 24px`;
    }

    // English Text Section with Transform & Width
    const engSection = canvasWrapper.querySelector(".slide-eng-section");
    if (engSection) {
      engSection.style.display = (settings.showEnglish !== false) ? "block" : "none";
      engSection.style.transform = `translate(${settings.engPosX || 0}px, ${settings.engPosY || 0}px)`;
      engSection.style.width = settings.engWidth ? `${settings.engWidth}%` : "100%";
    }
    const engText = canvasWrapper.querySelector(".slide-eng-text");
    if (engText) {
      engText.style.color = settings.engColor || "#111111";
      engText.style.fontSize = `${settings.engFontSize || 19}px`;
      engText.style.fontFamily = settings.engFontFamily || "Segoe UI, Arial, sans-serif";
      engText.style.textAlign = settings.textAlign || "left";
      engText.style.lineHeight = settings.lineHeight || 1.36;
      if (typeof document !== "undefined" && document.activeElement !== engText && !engText.contains(document.activeElement)) {
        if (activeQ.englishHtml) {
          engText.innerHTML = activeQ.englishHtml;
        } else {
          engText.textContent = activeQ.english || "English question will appear here...";
        }
      }
    }

    // Divider Line Wrapper with Width & Transform
    const dividerWrapper = canvasWrapper.querySelector(".slide-divider-wrapper");
    if (dividerWrapper) {
      dividerWrapper.style.display = (settings.showDivider !== false && !isBlankSlide) ? "block" : "none";
      dividerWrapper.style.width = settings.dividerWidth ? `${settings.dividerWidth}%` : "100%";
      dividerWrapper.style.transform = `translate(${settings.dividerPosX || 0}px, ${settings.dividerPosY || 0}px)`;
      dividerWrapper.style.margin = `${settings.dividerSpacing || 6}px 0`;
    }
    const divider = canvasWrapper.querySelector(".slide-divider");
    if (divider) {
      divider.style.borderTop = `${settings.dividerThickness || 2}px solid ${settings.dividerColor || "#A30000"}`;
    }

    // Hindi Text Section with Transform & Width
    const hindiSection = canvasWrapper.querySelector(".slide-hindi-section");
    if (hindiSection) {
      hindiSection.style.display = (settings.showHindi !== false) ? "block" : "none";
      hindiSection.style.transform = `translate(${settings.hindiPosX || 0}px, ${settings.hindiPosY || 0}px)`;
      hindiSection.style.width = settings.hindiWidth ? `${settings.hindiWidth}%` : "100%";
    }
    const hindiText = canvasWrapper.querySelector(".slide-hindi-text");
    if (hindiText) {
      hindiText.style.color = settings.hindiColor || "#7A0000";
      hindiText.style.fontSize = `${settings.hindiFontSize || 18}px`;
      hindiText.style.fontFamily = settings.hindiFontFamily || "Mangal, Noto Sans Devanagari, Arial, sans-serif";
      hindiText.style.textAlign = settings.textAlign || "left";
      hindiText.style.lineHeight = settings.lineHeight || 1.38;
      if (typeof document !== "undefined" && document.activeElement !== hindiText && !hindiText.contains(document.activeElement)) {
        if (activeQ.hindiHtml) {
          hindiText.innerHTML = activeQ.hindiHtml;
        } else {
          hindiText.textContent = activeQ.hindi || "हिंदी प्रश्न यहाँ दिखाई देगा...";
        }
      }
    }

    // Standalone Exam Tag Section
    const examSection = canvasWrapper.querySelector(".slide-exam-section");
    if (examSection) {
      const isBelowQ = (settings.examTagPosition === "below-question" || settings.examTagPosition === "above-options") && !isBlankSlide;
      examSection.style.display = (settings.showExamTag !== false && isBelowQ) ? "inline-block" : "none";
      examSection.style.transform = `translate(${settings.examTagPosX || 0}px, ${settings.examTagPosY || 0}px)`;
      const tagEl = examSection.querySelector(".slide-standalone-exam-tag");
      if (tagEl) {
        tagEl.setAttribute("data-style", settings.examTagStyle || "pill");
        tagEl.style.background = settings.examTagStyle === "pill" ? (settings.examTagBg || "#DC2626") : (settings.examTagStyle === "highlight" ? "#FEF08A" : "transparent");
        tagEl.style.color = settings.examTagStyle === "pill" ? (settings.examTagColor || "#FFFFFF") : (settings.examTagStyle === "highlight" ? "#854D0E" : (settings.examColor || "#FFFFFF"));
        tagEl.style.fontSize = `${settings.examFontSize || 15}px`;
        const radius = settings.examTagRadius !== undefined ? `${settings.examTagRadius}px` : (settings.examTagStyle === "pill" ? "18px" : "4px");
        const padX = settings.examTagPaddingX !== undefined ? settings.examTagPaddingX : (settings.examTagStyle === "pill" ? 14 : 6);
        const padY = settings.examTagPaddingY !== undefined ? settings.examTagPaddingY : 4;
        tagEl.style.borderRadius = radius;
        tagEl.style.padding = `${padY}px ${padX}px`;
        tagEl.style.boxShadow = settings.examTagStyle === "pill" ? "0 2px 6px rgba(0,0,0,0.35)" : "none";
        if (typeof document !== "undefined" && document.activeElement !== tagEl && !tagEl.contains(document.activeElement)) {
          if (activeQ.examHtml) {
            tagEl.innerHTML = activeQ.examHtml;
          } else {
            tagEl.textContent = activeQ.exam || settings.defaultExam || "(SSC GD 22 Feb., 2024 Shift III)";
          }
        }
      }

    }

    // Options Container & Boundaries with Transform
    const optContainer = canvasWrapper.querySelector(".slide-options-container");
    if (optContainer) {
      optContainer.style.display = (settings.showOptions !== false && !isBlankSlide) ? "grid" : "none";
      optContainer.setAttribute("data-layout", settings.optionsLayout || "2-col");
      optContainer.setAttribute("data-option-style", settings.optionStyle || "card");
      optContainer.style.width = `${settings.optionWidthPercent || 96}%`;
      optContainer.style.gap = `${settings.optionGap || 10}px`;
      optContainer.style.transform = `translate(${settings.optionsPosX || 0}px, ${settings.optionsPosY || 0}px)`;
      const optionBoxes = optContainer.querySelectorAll(".slide-option-box");
      optionBoxes.forEach((box, idx) => {
        const opt = activeQ.options?.[idx] || { key: String.fromCharCode(65 + idx), text: "" };
        if (settings.optionStyle === "clean") {
          box.style.background = "transparent";
          box.style.border = "none";
        } else {
          box.style.background = settings.optionCardBg || "#FFFFFF";
          box.style.border = `${settings.optionCardBorderWidth ?? 1.5}px solid ${settings.optionBorderColor || "#CBD5E1"}`;
        }
        box.style.borderRadius = `${settings.optionCardRadius || 8}px`;
        box.style.padding = `${settings.optionCardPadding || 8}px 14px`;

        const circle = box.querySelector(".slide-opt-circle");
        if (circle) {
          if (settings.optionStyle === "clean") {
            circle.style.background = "transparent";
            circle.style.color = settings.optionTextColor || settings.hindiColor || "#FBBF24";
            circle.textContent = `(${(opt.key || String.fromCharCode(65 + idx)).toLowerCase()})`;
          } else {
            circle.style.background = settings.optionBadgeBg || "#7A0000";
            circle.style.color = settings.optionBadgeColor || "#FFFFFF";
            circle.textContent = opt.key || String.fromCharCode(65 + idx);
          }
        }

        const textEl = box.querySelector(".slide-opt-text");
        if (textEl) {
          textEl.style.color = settings.optionTextColor || (settings.optionStyle === "clean" && settings.theme === "dark" ? "#FFFFFF" : "#111111");
          textEl.style.fontSize = `${settings.optionFontSize || 18}px`;
          textEl.style.fontFamily = settings.optionFontFamily || settings.engFontFamily || "Segoe UI, Arial, sans-serif";
          textEl.style.textAlign = settings.optionAlign || "left";
          if (typeof document !== "undefined" && document.activeElement !== textEl && !textEl.contains(document.activeElement)) {
            if (opt.textHtml) {
              textEl.innerHTML = opt.textHtml;
            } else {
              textEl.textContent = opt.text || "";
            }
          }
        }
      });
    }


    // Diagram / Image Containers with Transform & Dimensions (Multiple Images)
    const imgList = getQuestionImages(activeQ);
    canvasWrapper.querySelectorAll(".slide-image-container").forEach((imgContainer) => {
      const imgId = imgContainer.dataset.imageId;
      const imgObj = imgList.find((im) => (im.id || im) === imgId) || imgList[0];
      if (imgObj) {
        imgContainer.style.transform = `translate(${imgObj.posX || 0}px, ${imgObj.posY || 0}px)`;
        imgContainer.style.width = `${imgObj.width || 360}px`;
        imgContainer.style.height = `${imgObj.height || 202}px`;
      }
    });

    // Footer Bar
    const footerBar = canvasWrapper.querySelector(".slide-footer-bar");
    if (footerBar) {
      footerBar.style.display = (settings.showFooter && !isBlankSlide) ? "flex" : "none";
      footerBar.style.background = settings.footerBg || "#7A0000";
      footerBar.style.color = settings.footerColor || "#FFFFFF";
      footerBar.style.height = `${settings.footerHeight || 28}px`;
      footerBar.style.fontSize = `${settings.footerFontSize || 13}px`;
      if (typeof document !== "undefined" && document.activeElement !== footerBar && !footerBar.contains(document.activeElement)) {
        if (settings.footerHtml) {
          footerBar.innerHTML = settings.footerHtml;
        } else {
          footerBar.textContent = settings.footerText || "";
        }
      }
    }
  });

  syncActiveThumbnail(app, state);
  saveState(state);
}

export function syncActiveThumbnail(app, state) {
  const ppt = state.ppt;
  if (!ppt) return;
  const activeIdx = ppt.activeQuestionIndex;
  const activeQ = ppt.questions[activeIdx];
  if (!activeQ) return;
  const settings = getSlideSettings(ppt.settings, activeQ);
  const thumbItem = app.querySelector(`.ppt-fs-thumb-item[data-slide-index="${activeIdx}"]`);
  if (!thumbItem) return;

  const scaler = thumbItem.querySelector(".ppt-fs-thumb-scaler");
  if (scaler) {
    scaler.innerHTML = renderThumbnailSlideHtml(activeQ, settings, activeIdx);
  }
}




export function attachImageToActiveSlide(dataUrl, app, state, recordUndo, saveState, render) {
  ensurePptState(state);
  const activeQ = state.ppt.questions[state.ppt.activeQuestionIndex];
  if (!activeQ) return;

  const img = new Image();
  img.onload = () => {
    recordUndo();
    if (!Array.isArray(activeQ.images)) {
      activeQ.images = activeQ.image ? [
        typeof activeQ.image === "object" ? activeQ.image : { id: "img_1", dataUrl: activeQ.image, posX: 0, posY: 0, width: 360, height: 202 }
      ] : [];
      delete activeQ.image;
    }

    const newImgIndex = activeQ.images.length + 1;
    const offset = (activeQ.images.length * 20);

    let initialW = 380;
    let initialH = 214;
    if (img.naturalWidth && img.naturalHeight) {
      const aspect = img.naturalWidth / img.naturalHeight;
      initialW = Math.min(520, Math.max(180, Math.round(280 * aspect)));
      initialH = Math.round(initialW / aspect);
    }

    activeQ.images.push({
      id: `img_${Date.now()}_${newImgIndex}`,
      dataUrl: dataUrl,
      posX: offset,
      posY: offset,
      width: initialW,
      height: initialH
    });

    saveState(state);
    render();
  };
  img.onerror = () => {
    recordUndo();
    if (!Array.isArray(activeQ.images)) {
      activeQ.images = [];
      delete activeQ.image;
    }
    activeQ.images.push({
      id: `img_${Date.now()}_1`,
      dataUrl: dataUrl,
      posX: 20,
      posY: 20,
      width: 360,
      height: 202
    });
    saveState(state);
    render();
  };
  img.src = dataUrl;
}


export function pastePptImageFromClipboard(app, state, recordUndo, saveState, render) {
  if (!navigator.clipboard || !navigator.clipboard.read) {
    const diagInput = app.querySelector("[data-ppt-diagram-file-input]");
    if (diagInput) diagInput.click();
    return;
  }

  navigator.clipboard.read().then((items) => {
    for (const item of items) {
      const imgType = item.types.find((type) => type.startsWith("image/"));
      if (imgType) {
        item.getType(imgType).then((blob) => {
          const reader = new FileReader();
          reader.onload = (loadEvt) => {
            attachImageToActiveSlide(loadEvt.target.result, app, state, recordUndo, saveState, render);
          };
          reader.readAsDataURL(blob);
        });
        return;
      }
    }
    alert("No image found in clipboard. Please copy an image first or use Browse.");
  }).catch(() => {
    const diagInput = app.querySelector("[data-ppt-diagram-file-input]");
    if (diagInput) diagInput.click();
  });
}

export function initSlideImageDragAndDrop(app, state, recordUndo, saveState, render) {
  const canvasContainers = app.querySelectorAll(".ppt-fs-center-pane, .ppt-fs-stage-container, .ppt-slide-canvas-wrapper, .ppt-preview-stage-container");

  canvasContainers.forEach((container) => {
    container.addEventListener("dragenter", (e) => {
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
        e.preventDefault();
        container.classList.add("ppt-image-dragover");
      }
    });

    container.addEventListener("dragover", (e) => {
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        container.classList.add("ppt-image-dragover");
      }
    });

    container.addEventListener("dragleave", (e) => {
      if (!container.contains(e.relatedTarget)) {
        container.classList.remove("ppt-image-dragover");
      }
    });

    container.addEventListener("drop", async (e) => {
      const files = Array.from(e.dataTransfer?.files || []);
      if (!files.length) return;

      const imageFiles = files.filter((f) => f.type.startsWith("image/") || /\.(png|jpe?g|webp|svg|gif|bmp)$/i.test(f.name));
      const docxFiles = files.filter((f) => /\.(docx|txt)$/i.test(f.name));

      if (imageFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        container.classList.remove("ppt-image-dragover");

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const reader = new FileReader();
          reader.onload = (loadEvt) => {
            attachImageToActiveSlide(loadEvt.target.result, app, state, recordUndo, saveState, render);
          };
          reader.readAsDataURL(file);
        }
        return;
      }

      if (docxFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        container.classList.remove("ppt-image-dragover");
        await processUploadedPptFile(docxFiles[0], app, state, recordUndo, render);
        return;
      }
    });
  });

  // Global window drop handler to prevent browser navigating away when dragging image from download shelf
  window.addEventListener("dragover", (e) => {
    if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      e.preventDefault();
    }
  }, false);

  window.addEventListener("drop", (e) => {
    if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      const isOverCanvas = e.target.closest(".ppt-fs-center-pane, .ppt-fs-stage-container, .ppt-slide-canvas-wrapper, .ppt-preview-stage-container");
      if (!isOverCanvas && state.mode === "ppt-builder") {
        const files = Array.from(e.dataTransfer?.files || []);
        const imageFiles = files.filter((f) => f.type.startsWith("image/") || /\.(png|jpe?g|webp|svg|gif|bmp)$/i.test(f.name));
        if (imageFiles.length > 0) {
          e.preventDefault();
          for (const file of imageFiles) {
            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              attachImageToActiveSlide(loadEvt.target.result, app, state, recordUndo, saveState, render);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
  }, false);
}

export function handlePptSlideNavKeydown(event, state, recordUndo, render, saveState) {
  if (state.mode !== "ppt-builder") return;
  const ppt = state.ppt;
  if (!ppt) return;

  const isEditingText = typeof document !== "undefined" && document.activeElement && (
    document.activeElement.tagName === "INPUT" ||
    document.activeElement.tagName === "TEXTAREA" ||
    document.activeElement.isContentEditable
  );


  const isCtrlOrCmd = event.ctrlKey || event.metaKey;
  const isShift = event.shiftKey;
  const isAlt = event.altKey;
  const key = event.key;
  const lowerKey = key.toLowerCase();

  // 1. Presentation & Fullscreen Shortcuts (F5, Shift+F5, Esc)
  if (key === "F5") {
    event.preventDefault();
    if (isShift) {
      // Shift+F5: Start Presentation from Current Slide
      ppt.isFullscreenOpen = true;
    } else {
      // F5: Start Presentation from First Slide (Slide 1)
      ppt.isFullscreenOpen = true;
      ppt.activeQuestionIndex = 0;
    }
    if (saveState) saveState(state);
    if (render) render();
    return;
  }

  if (key === "Escape") {
    if (ppt.isExportModalOpen) {
      event.preventDefault();
      ppt.isExportModalOpen = false;
      if (saveState) saveState(state);
      if (render) render();
      return;
    }
    if (ppt.isFullscreenOpen || ppt.showPasteBox) {
      event.preventDefault();
      ppt.isFullscreenOpen = false;
      ppt.showPasteBox = false;
      if (saveState) saveState(state);
      if (render) render();
      return;
    }
  }

  // 2. Alt Ribbon Access Keys (Alt+H, Alt+D, Alt+E, Alt+I, Alt+X, Alt+V)
  if (isAlt && !isCtrlOrCmd) {
    if (lowerKey === "h" && !isShift) {
      event.preventDefault();
      ppt.fsActiveTab = "home";
      if (saveState) saveState(state);
      if (render) render();
      return;
    } else if (lowerKey === "x" || lowerKey === "p") {
      event.preventDefault();
      ppt.fsActiveTab = "export";
      if (saveState) saveState(state);
      if (render) render();
      return;
    } else if (key === "2" || lowerKey === "g" || lowerKey === "d") {
      event.preventDefault();
      ppt.fsActiveTab = "design";
      if (saveState) saveState(state);
      if (render) render();
      return;
    } else if (lowerKey === "e") {
      event.preventDefault();
      ppt.fsActiveTab = "editor";
      if (saveState) saveState(state);
      if (render) render();
      return;
    } else if (lowerKey === "n" || lowerKey === "i") {
      event.preventDefault();
      ppt.fsActiveTab = "insert";
      if (saveState) saveState(state);
      if (render) render();
      return;
    } else if (lowerKey === "w" || lowerKey === "v") {
      event.preventDefault();
      ppt.fsActiveTab = "view";
      if (saveState) saveState(state);
      if (render) render();
      return;
    }
  }

  // 3. Zoom Shortcuts (Ctrl + +, Ctrl + -, Ctrl + 0)
  if (isCtrlOrCmd && !isAlt) {
    if (key === "=" || key === "+" || key === "Add") {
      event.preventDefault();
      ppt.fsZoom = Math.min(200, (ppt.fsZoom || 100) + 10);
      if (saveState) saveState(state);
      if (render) render();
      return;
    } else if (key === "-" || key === "_" || key === "Subtract") {
      event.preventDefault();
      ppt.fsZoom = Math.max(50, (ppt.fsZoom || 100) - 10);
      if (saveState) saveState(state);
      if (render) render();
      return;
    } else if (key === "0") {
      event.preventDefault();
      ppt.fsZoom = 100;
      if (saveState) saveState(state);
      if (render) render();
      return;
    }
  }

  // 4. Save Presentation (Ctrl + S)
  if (isCtrlOrCmd && lowerKey === "s" && !isAlt && !isShift) {
    event.preventDefault();
    if (saveState) saveState(state);
    if (typeof document !== "undefined") {
      const existingToast = document.querySelector(".ppt-toast-notification");
      if (existingToast) existingToast.remove();
      const toast = document.createElement("div");
      toast.className = "ppt-toast-notification";
      toast.textContent = "💾 Presentation Saved!";
      toast.style.cssText = "position:fixed; bottom:24px; right:24px; background:#238636; color:#ffffff; padding:8px 16px; border-radius:6px; font-weight:700; font-size:13px; z-index:999999; box-shadow:0 4px 12px rgba(0,0,0,0.5); pointer-events:none; transition:opacity 0.3s;";
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 1500);
    }
    return;
  }

  // 5. Print / Export PDF (Ctrl + P)
  if (isCtrlOrCmd && lowerKey === "p" && !isAlt && !isShift) {
    event.preventDefault();
    exportQuestionsToPdf(ppt.questions, ppt.settings);
    return;
  }

  // 6. Slide Creation & Duplication (Ctrl + M, Ctrl + D)
  if (isCtrlOrCmd && !isAlt && !isEditingText) {
    if (lowerKey === "m" || (lowerKey === "n" && !isShift)) {
      event.preventDefault();
      if (recordUndo) recordUndo();
      const newSlide = {
        number: `Q.${ppt.questions.length + 1}`,
        exam: ppt.settings?.defaultExam || "SSC GD 2026",
        topic: ppt.settings?.topic || "MATHEMATICS",
        english: "New Question English Statement...",
        hindi: "नया प्रश्न हिंदी विवरण...",
        options: [
          { key: "A", text: "Option A" },
          { key: "B", text: "Option B" },
          { key: "C", text: "Option C" },
          { key: "D", text: "Option D" }
        ]
      };
      const insertAt = (ppt.activeQuestionIndex !== undefined && ppt.activeQuestionIndex >= 0) ? ppt.activeQuestionIndex + 1 : ppt.questions.length;
      ppt.questions.splice(insertAt, 0, newSlide);
      ppt.activeQuestionIndex = insertAt;
      if (saveState) saveState(state);
      if (render) render();
      return;
    } else if (lowerKey === "d") {
      event.preventDefault();
      if (recordUndo) recordUndo();
      const currentQ = ppt.questions[ppt.activeQuestionIndex];
      if (currentQ) {
        const cloned = JSON.parse(JSON.stringify(currentQ));
        if (cloned.number && cloned.number.startsWith("Q.")) {
          cloned.number = `Q.${ppt.questions.length + 1}`;
        }
        ppt.questions.splice(ppt.activeQuestionIndex + 1, 0, cloned);
        ppt.activeQuestionIndex += 1;
        if (saveState) saveState(state);
        if (render) render();
      }
      return;
    }
  }

  // 7. Slide Reordering (Ctrl + Up, Ctrl + Down, Ctrl + Shift + Up, Ctrl + Shift + Down)
  if (isCtrlOrCmd && !isAlt && !isEditingText) {
    if (key === "ArrowUp") {
      event.preventDefault();
      const idx = ppt.activeQuestionIndex;
      if (idx > 0) {
        if (recordUndo) recordUndo();
        const targetIdx = isShift ? 0 : idx - 1;
        const [moved] = ppt.questions.splice(idx, 1);
        ppt.questions.splice(targetIdx, 0, moved);
        ppt.activeQuestionIndex = targetIdx;
        if (saveState) saveState(state);
        if (render) render();
      }
      return;
    } else if (key === "ArrowDown") {
      event.preventDefault();
      const idx = ppt.activeQuestionIndex;
      if (idx < ppt.questions.length - 1) {
        if (recordUndo) recordUndo();
        const targetIdx = isShift ? ppt.questions.length - 1 : idx + 1;
        const [moved] = ppt.questions.splice(idx, 1);
        ppt.questions.splice(targetIdx, 0, moved);
        ppt.activeQuestionIndex = targetIdx;
        if (saveState) saveState(state);
        if (render) render();
      }
      return;
    }
  }

  // 8. Text Formatting within ContentEditable / Text elements (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+E, Ctrl+L, Ctrl+R, Ctrl+J, Font Size)
  if (isCtrlOrCmd && !isAlt) {
    if (lowerKey === "b") {
      event.preventDefault();
      if (typeof document !== "undefined") document.execCommand("bold", false, null);
      return;
    } else if (lowerKey === "i") {
      event.preventDefault();
      if (typeof document !== "undefined") document.execCommand("italic", false, null);
      return;
    } else if (lowerKey === "u") {
      event.preventDefault();
      if (typeof document !== "undefined") document.execCommand("underline", false, null);
      return;
    } else if (lowerKey === "e") {
      event.preventDefault();
      if (isEditingText && typeof document !== "undefined") {
        document.execCommand("justifyCenter", false, null);
      } else {
        if (recordUndo) recordUndo();
        ppt.settings.textAlign = "center";
        if (saveState) saveState(state);
        if (render) render();
      }
      return;
    } else if (lowerKey === "l") {
      event.preventDefault();
      if (isEditingText && typeof document !== "undefined") {
        document.execCommand("justifyLeft", false, null);
      } else {
        if (recordUndo) recordUndo();
        ppt.settings.textAlign = "left";
        if (saveState) saveState(state);
        if (render) render();
      }
      return;
    } else if (lowerKey === "r") {
      event.preventDefault();
      if (isEditingText && typeof document !== "undefined") {
        document.execCommand("justifyRight", false, null);
      } else {
        if (recordUndo) recordUndo();
        ppt.settings.textAlign = "right";
        if (saveState) saveState(state);
        if (render) render();
      }
      return;
    } else if (lowerKey === "j") {
      event.preventDefault();
      if (isEditingText && typeof document !== "undefined") {
        document.execCommand("justifyFull", false, null);
      } else {
        if (recordUndo) recordUndo();
        ppt.settings.textAlign = "justify";
        if (saveState) saveState(state);
        if (render) render();
      }
      return;
    } else if (key === ">" || (isShift && key === ".") || key === "]") {
      event.preventDefault();
      if (recordUndo) recordUndo();
      const currentSz = ppt.settings.engFontSize || 20;
      ppt.settings.engFontSize = Math.min(48, currentSz + 1);
      ppt.settings.hindiFontSize = Math.min(48, (ppt.settings.hindiFontSize || 18) + 1);
      if (saveState) saveState(state);
      if (render) render();
      return;
    } else if (key === "<" || (isShift && key === ",") || key === "[") {
      event.preventDefault();
      if (recordUndo) recordUndo();
      const currentSz = ppt.settings.engFontSize || 20;
      ppt.settings.engFontSize = Math.max(10, currentSz - 1);
      ppt.settings.hindiFontSize = Math.max(10, (ppt.settings.hindiFontSize || 18) - 1);
      if (saveState) saveState(state);
      if (render) render();
      return;
    }
  }

  // 9. Slide Navigation (PageDown, PageUp, ArrowRight, ArrowLeft, ArrowDown, ArrowUp, Home, End, Space)
  if (!isEditingText) {
    if (key === "PageDown" || (isAlt && key === "ArrowRight") || key === "ArrowRight" || key === "ArrowDown" || (key === " " && !isShift)) {
      if (ppt.activeQuestionIndex < ppt.questions.length - 1) {
        event.preventDefault();
        if (recordUndo) recordUndo();
        ppt.activeQuestionIndex += 1;
        if (saveState) saveState(state);
        if (render) render();
      }
    } else if (key === "PageUp" || (isAlt && key === "ArrowLeft") || key === "ArrowLeft" || key === "ArrowUp" || (key === " " && isShift)) {
      if (ppt.activeQuestionIndex > 0) {
        event.preventDefault();
        if (recordUndo) recordUndo();
        ppt.activeQuestionIndex -= 1;
        if (saveState) saveState(state);
        if (render) render();
      }
    } else if (key === "Home" && !isCtrlOrCmd) {
      if (ppt.activeQuestionIndex > 0) {
        event.preventDefault();
        if (recordUndo) recordUndo();
        ppt.activeQuestionIndex = 0;
        if (saveState) saveState(state);
        if (render) render();
      }
    } else if (key === "End" && !isCtrlOrCmd) {
      if (ppt.activeQuestionIndex < ppt.questions.length - 1) {
        event.preventDefault();
        if (recordUndo) recordUndo();
        ppt.activeQuestionIndex = ppt.questions.length - 1;
        if (saveState) saveState(state);
        if (render) render();
      }
    } else if (key === "Delete" || key === "Backspace") {
      const selectedImgBox = typeof document !== "undefined" ? document.querySelector(".slide-image-container.is-selected") : null;
      if (selectedImgBox) {
        event.preventDefault();
        const imgId = selectedImgBox.dataset.imageId;
        const activeQ = ppt.questions[ppt.activeQuestionIndex];
        if (activeQ && Array.isArray(activeQ.images)) {
          if (recordUndo) recordUndo();
          activeQ.images = activeQ.images.filter((im) => (im.id || im) !== imgId);
          if (saveState) saveState(state);
          if (render) render();
        }
      } else if (ppt.questions.length > 1) {
        event.preventDefault();
        if (recordUndo) recordUndo();
        ppt.questions.splice(ppt.activeQuestionIndex, 1);
        if (ppt.activeQuestionIndex >= ppt.questions.length) {
          ppt.activeQuestionIndex = ppt.questions.length - 1;
        }
        if (saveState) saveState(state);
        if (render) render();
      }
    }
  }
}



export function handlePptCanvasPaste(event, app, state, recordUndo, saveState, render) {
  if (state.mode !== "ppt-builder") return;
  const items = event.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const blob = items[i].getAsFile();
      if (blob) {
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          attachImageToActiveSlide(loadEvt.target.result, app, state, recordUndo, saveState, render);
        };
        reader.readAsDataURL(blob);
        return;
      }
    }
  }
}

export async function handlePptExportPptx(app, state) {
  ensurePptState(state);
  const btn = app.querySelector('[data-action="ppt-export-pptx"]');
  const originalText = btn ? btn.textContent : "";
  if (btn) btn.textContent = "⏳ Generating .PPTX...";

  try {
    await exportQuestionsToPptx(state.ppt.questions, state.ppt.settings);
    if (btn) btn.textContent = "✅ Downloaded!";
    setTimeout(() => { if (btn) btn.textContent = originalText; }, 2500);
  } catch (err) {
    console.error(err);
    alert("Error exporting PPTX: " + err.message);
    if (btn) btn.textContent = originalText;
  }
}

export async function handlePptExportPdf(qualityMode, app, state) {
  ensurePptState(state);
  const btn = app.querySelector(`[data-action="ppt-export-pdf-${qualityMode}"]`);
  const originalText = btn ? btn.textContent : "";
  if (btn) btn.textContent = "⏳ Rendering PDF...";

  try {
    await exportQuestionsToPdf(state.ppt.questions, state.ppt.settings, qualityMode);
    if (btn) btn.textContent = "✅ PDF Ready!";
    setTimeout(() => { if (btn) btn.textContent = originalText; }, 2500);
  } catch (err) {
    console.error(err);
    alert("Error exporting PDF: " + err.message);
    if (btn) btn.textContent = originalText;
  }
}

export async function handlePptRunConfiguredExport(app, state) {
  ensurePptState(state);
  const ppt = state.ppt;
  const exp = ppt.exportSettings || {};
  const totalSlides = (ppt.questions || []).length;
  if (!totalSlides) {
    alert("No slides to export.");
    return;
  }

  if (exp.scope === "sets") {
    ppt.isExportModalOpen = true;
    const overlay = app.querySelector(".ppt-fullscreen-app-overlay");
    if (overlay && state._render) {
      state._render();
    }
    return;
  }

  let selectedIndices = null;
  if (exp.scope === "current") {
    selectedIndices = [ppt.activeQuestionIndex || 0];
  } else if (exp.scope === "range") {
    selectedIndices = parseRangeToIndices(exp.customRange, totalSlides);
    if (!selectedIndices.length) {
      alert("Please enter a valid page range (e.g. 1, 2, 5-20).");
      return;
    }
  }

  const topicName = (ppt.questions[ppt.activeQuestionIndex || 0] || {}).topic || ppt.settings?.topic || "Maths_Questions";
  const customFileName = formatFileName(exp.fileNamePattern, {
    topic: topicName,
    set: 1,
    start: selectedIndices ? selectedIndices[0] + 1 : 1,
    end: selectedIndices ? selectedIndices[selectedIndices.length - 1] + 1 : totalSlides,
    quality: exp.quality
  });

  const btn = app.querySelector('[data-action="ppt-run-configured-export"]');
  const originalText = btn ? btn.innerHTML : "";
  if (btn) btn.innerHTML = "⏳ Exporting...";

  try {
    if (exp.format === "pptx") {
      await exportQuestionsToPptx(ppt.questions, ppt.settings, { selectedIndices, customFileName });
    } else {
      await exportQuestionsToPdf(ppt.questions, ppt.settings, exp.quality || "medium", (p) => {
        if (btn) btn.innerHTML = `⏳ ${p.current}/${p.total}...`;
      }, { selectedIndices, customFileName });
    }
    if (btn) btn.innerHTML = "✅ Downloaded!";
    setTimeout(() => { if (btn) btn.innerHTML = originalText; }, 2500);
  } catch (err) {
    console.error(err);
    alert("Export error: " + err.message);
    if (btn) btn.innerHTML = originalText;
  }
}

export async function handlePptExportSingleSetPdf(setNum, app, state) {
  ensurePptState(state);
  const ppt = state.ppt;
  const exp = ppt.exportSettings || {};
  const prefixInp = app.querySelector('[data-ppt-export-field="mandatoryPrefix"]');
  const suffixInp = app.querySelector('[data-ppt-export-field="mandatorySuffix"]');
  const chunkInp = app.querySelector('[data-ppt-export-field="chunkSize"]');
  const nameInp = app.querySelector('[data-ppt-export-field="fileNamePattern"]');
  if (prefixInp) exp.mandatoryPrefix = prefixInp.value;
  if (suffixInp) exp.mandatorySuffix = suffixInp.value;
  if (chunkInp) exp.chunkSize = Number(chunkInp.value) || 25;
  if (nameInp) exp.fileNamePattern = nameInp.value;

  const questions = ppt.questions || [];
  const sets = calculateBatchSets(questions.length, exp.chunkSize, exp.mandatoryPrefix, exp.mandatorySuffix);
  const setObj = sets.find((s) => s.setNumber === setNum);
  if (!setObj) {
    alert(`Set ${setNum} not found.`);
    return;
  }

  const topicName = (ppt.settings && ppt.settings.topic && ppt.settings.topic !== "TOPIC")
    ? ppt.settings.topic
    : ((questions[0] && questions[0].topic && questions[0].topic !== "TOPIC") ? questions[0].topic : (ppt.settings?.topic || "Maths_Questions"));

  const customFileName = formatFileName(exp.fileNamePattern, {
    topic: topicName,
    set: setObj.setNumber,
    start: setObj.startQNum,
    end: setObj.endQNum,
    quality: exp.quality
  });

  const btn = app.querySelector(`[data-action="ppt-export-single-set-pdf"][data-set-num="${setNum}"]`);
  const originalText = btn ? btn.textContent : "";
  if (btn) btn.textContent = "⏳ Rendering...";

  try {
    await exportQuestionsToPdf(questions, ppt.settings, exp.quality || "medium", (p) => {
      if (btn) btn.textContent = `⏳ ${p.current}/${p.total}`;
    }, { selectedIndices: setObj.slideIndices, customFileName });

    if (btn) btn.textContent = "✅ Saved!";
    setTimeout(() => { if (btn) btn.textContent = originalText; }, 2500);
  } catch (err) {
    console.error(err);
    alert(`Error exporting Set ${setNum}: ` + err.message);
    if (btn) btn.textContent = originalText;
  }
}

export async function handlePptExportSingleSetPptx(setNum, app, state) {
  ensurePptState(state);
  const ppt = state.ppt;
  const exp = ppt.exportSettings || {};
  const prefixInp = app.querySelector('[data-ppt-export-field="mandatoryPrefix"]');
  const suffixInp = app.querySelector('[data-ppt-export-field="mandatorySuffix"]');
  const chunkInp = app.querySelector('[data-ppt-export-field="chunkSize"]');
  const nameInp = app.querySelector('[data-ppt-export-field="fileNamePattern"]');
  if (prefixInp) exp.mandatoryPrefix = prefixInp.value;
  if (suffixInp) exp.mandatorySuffix = suffixInp.value;
  if (chunkInp) exp.chunkSize = Number(chunkInp.value) || 25;
  if (nameInp) exp.fileNamePattern = nameInp.value;

  const questions = ppt.questions || [];
  const sets = calculateBatchSets(questions.length, exp.chunkSize, exp.mandatoryPrefix, exp.mandatorySuffix);
  const setObj = sets.find((s) => s.setNumber === setNum);
  if (!setObj) return;

  const topicName = (ppt.settings && ppt.settings.topic && ppt.settings.topic !== "TOPIC")
    ? ppt.settings.topic
    : ((questions[0] && questions[0].topic && questions[0].topic !== "TOPIC") ? questions[0].topic : (ppt.settings?.topic || "Maths_Questions"));

  const customFileName = formatFileName(exp.fileNamePattern, {
    topic: topicName,
    set: setObj.setNumber,
    start: setObj.startQNum,
    end: setObj.endQNum,
    quality: exp.quality
  });

  const btn = app.querySelector(`[data-action="ppt-export-single-set-pptx"][data-set-num="${setNum}"]`);
  const originalText = btn ? btn.textContent : "";
  if (btn) btn.textContent = "⏳ Building...";

  try {
    await exportQuestionsToPptx(questions, ppt.settings, { selectedIndices: setObj.slideIndices, customFileName });
    if (btn) btn.textContent = "✅ Saved!";
    setTimeout(() => { if (btn) btn.textContent = originalText; }, 2500);
  } catch (err) {
    console.error(err);
    alert(`Error exporting PPTX Set ${setNum}: ` + err.message);
    if (btn) btn.textContent = originalText;
  }
}

export async function handlePptBatchExportAllSets(app, state) {
  ensurePptState(state);
  const ppt = state.ppt;
  const exp = ppt.exportSettings || {};
  const prefixInp = app.querySelector('[data-ppt-export-field="mandatoryPrefix"]');
  const suffixInp = app.querySelector('[data-ppt-export-field="mandatorySuffix"]');
  const chunkInp = app.querySelector('[data-ppt-export-field="chunkSize"]');
  const nameInp = app.querySelector('[data-ppt-export-field="fileNamePattern"]');
  if (prefixInp) exp.mandatoryPrefix = prefixInp.value;
  if (suffixInp) exp.mandatorySuffix = suffixInp.value;
  if (chunkInp) exp.chunkSize = Number(chunkInp.value) || 25;
  if (nameInp) exp.fileNamePattern = nameInp.value;

  const questions = ppt.questions || [];
  const sets = calculateBatchSets(questions.length, exp.chunkSize, exp.mandatoryPrefix, exp.mandatorySuffix);
  if (!sets.length) {
    alert("No sets calculated to export.");
    return;
  }

  const progressBox = app.querySelector(".ppt-export-progress-container");
  const progressLabel = app.querySelector(".ppt-export-progress-label");
  const progressPercent = app.querySelector(".ppt-export-progress-percent");
  const progressBar = app.querySelector(".ppt-export-progress-bar-fill");
  const batchBtn = app.querySelector('[data-action="ppt-batch-export-all-sets"]');

  if (progressBox) progressBox.style.display = "block";
  if (batchBtn) batchBtn.disabled = true;

  const topicName = (ppt.settings && ppt.settings.topic && ppt.settings.topic !== "TOPIC")
    ? ppt.settings.topic
    : ((questions[0] && questions[0].topic && questions[0].topic !== "TOPIC") ? questions[0].topic : (ppt.settings?.topic || "Maths_Questions"));

  try {
    for (let i = 0; i < sets.length; i++) {
      const setObj = sets[i];
      const percent = Math.round(((i) / sets.length) * 100);
      if (progressLabel) progressLabel.textContent = `Generating Set ${setObj.setNumber} of ${sets.length} (Qs ${setObj.startQNum}-${setObj.endQNum})...`;
      if (progressPercent) progressPercent.textContent = `${percent}%`;
      if (progressBar) progressBar.style.width = `${percent}%`;

      const customFileName = formatFileName(exp.fileNamePattern, {
        topic: topicName,
        set: setObj.setNumber,
        start: setObj.startQNum,
        end: setObj.endQNum,
        quality: exp.quality
      });

      await exportQuestionsToPdf(questions, ppt.settings, exp.quality || "medium", (p) => {
        if (progressLabel) progressLabel.textContent = `Set ${setObj.setNumber}/${sets.length}: Slide ${p.current}/${p.total}...`;
      }, { selectedIndices: setObj.slideIndices, customFileName });

      // Safe pause between sequential browser downloads
      if (i < sets.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    if (progressLabel) progressLabel.textContent = `✅ Successfully exported all ${sets.length} Sets!`;
    if (progressPercent) progressPercent.textContent = "100%";
    if (progressBar) progressBar.style.width = "100%";
    setTimeout(() => {
      if (progressBox) progressBox.style.display = "none";
      if (batchBtn) batchBtn.disabled = false;
    }, 4000);
  } catch (err) {
    console.error(err);
    alert("Batch export failed: " + err.message);
    if (progressBox) progressBox.style.display = "none";
    if (batchBtn) batchBtn.disabled = false;
  }
}

export async function handlePptRunModalSinglePdf(app, state) {
  ensurePptState(state);
  const ppt = state.ppt;
  const exp = ppt.exportSettings || {};
  const totalSlides = (ppt.questions || []).length;
  let selectedIndices = null;

  if (exp.scope === "range") {
    selectedIndices = parseRangeToIndices(exp.customRange, totalSlides);
    if (!selectedIndices.length) {
      alert("Please enter valid slide numbers.");
      return;
    }
  }

  const topicName = (ppt.questions[0] || {}).topic || ppt.settings?.topic || "Maths_Questions";
  const customFileName = formatFileName(exp.fileNamePattern, {
    topic: topicName,
    set: 1,
    start: selectedIndices ? selectedIndices[0] + 1 : 1,
    end: selectedIndices ? selectedIndices[selectedIndices.length - 1] + 1 : totalSlides,
    quality: exp.quality
  });

  const btn = app.querySelector('[data-action="ppt-run-modal-single-pdf"]');
  const originalText = btn ? btn.textContent : "";
  if (btn) btn.textContent = "⏳ Generating PDF...";

  try {
    await exportQuestionsToPdf(ppt.questions, ppt.settings, exp.quality || "medium", (p) => {
      if (btn) btn.textContent = `⏳ Slide ${p.current}/${p.total}`;
    }, { selectedIndices, customFileName });

    if (btn) btn.textContent = "✅ Download Complete!";
    setTimeout(() => { if (btn) btn.textContent = originalText; }, 2500);
  } catch (err) {
    console.error(err);
    alert("Error downloading PDF: " + err.message);
    if (btn) btn.textContent = originalText;
  }
}

export async function handlePptRunModalSinglePptx(app, state) {
  ensurePptState(state);
  const ppt = state.ppt;
  const exp = ppt.exportSettings || {};
  const totalSlides = (ppt.questions || []).length;
  let selectedIndices = null;

  if (exp.scope === "range") {
    selectedIndices = parseRangeToIndices(exp.customRange, totalSlides);
    if (!selectedIndices.length) {
      alert("Please enter valid slide numbers.");
      return;
    }
  }

  const topicName = (ppt.questions[0] || {}).topic || ppt.settings?.topic || "Maths_Questions";
  const customFileName = formatFileName(exp.fileNamePattern, {
    topic: topicName,
    set: 1,
    start: selectedIndices ? selectedIndices[0] + 1 : 1,
    end: selectedIndices ? selectedIndices[selectedIndices.length - 1] + 1 : totalSlides,
    quality: exp.quality
  });

  const btn = app.querySelector('[data-action="ppt-run-modal-single-pptx"]');
  const originalText = btn ? btn.textContent : "";
  if (btn) btn.textContent = "⏳ Building PPTX...";

  try {
    await exportQuestionsToPptx(ppt.questions, ppt.settings, { selectedIndices, customFileName });
    if (btn) btn.textContent = "✅ Download Complete!";
    setTimeout(() => { if (btn) btn.textContent = originalText; }, 2500);
  } catch (err) {
    console.error(err);
    alert("Error downloading PPTX: " + err.message);
    if (btn) btn.textContent = originalText;
  }
}
