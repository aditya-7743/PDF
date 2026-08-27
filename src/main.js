import { branches } from "./branches/index.js";
import { renderApp, getQuestionImages } from "./ui/layout.js";
import { getEquationDiagnostics } from "./core/normalizer.js";
import {
  bindPptEvents,
  handlePptAction,
  handlePptSlideNavKeydown,
  handlePptCanvasPaste,
  ensurePptState
} from "./branches/ppt/pptController.js";
import {
  bindImagePdfEvents,
  handleImagePdfPaste,
  handleImagePdfLightboxKeydown
} from "./branches/imagePdf/imagePdfController.js";
import {
  bindImageResizeEvents
} from "./branches/imageResize/imageResizeController.js";
import {
  handleDrawingPropertyInput,
  handleDrawingAction,
  handleManualLabelInput,
  handleToolSelect,
  handleToolGroupToggle,
  selectFigureTool,
  drawManualTool,
  startDrawing,
  startColumnResize,
  renderDrawingSurface,
  createCanvasExportSvg,
  insertPlainLabelText,
  exportCanvasPng,
  copyText,
  downloadBlob
} from "./branches/drawing/drawingController.js";
import {
  handleEquationInputKeydown,
  handleEquationPaste,
  insertIntoEquationInput,
  applyEquationInputValue,
  updateEquationStatusInline,
  handleVisualEdit,
  handleCanvasCopy,
  handleCanvasCut,
  handleCanvasPaste,
  handleEditorCommand,
  handleEditorInsert,
  handleEditorTemplate,
  handleToolbarSelect,
  handleToolbarColor,
  focusPreviewEditor,
  handleEquationCanvasClick,
  handleEquationCanvasWheel,
  insertChapterStarter,
  insertEquationSnippet,
  fitEquationPreview,
  smartCleanEditorInput,
  fixEditorBrackets
} from "./branches/equation/equationController.js";


const STORAGE_KEY = "math-equation-authoring-state-v1";
const UNDO_STACK_LIMIT = 50;

const state = loadInitialState();
const undoStack = [];
const redoStack = [];
let isApplyingHistory = false;

const app = document.querySelector("#app");

export { getQuestionImages };

document.addEventListener("paste", handleGlobalPaste);
document.addEventListener("keydown", handleImagePdfLightboxKeydown);
document.addEventListener("keydown", handleGlobalUndoRedoKeydown);
document.addEventListener("keydown", (e) => handlePptSlideNavKeydown(e, state, recordUndo, render, saveState));


function normalizeAppMode(mode = "") {
  if (mode === "figures" || mode === "drawing" || mode === "math-figures") return "math-figures";
  if (mode === "ppt" || mode === "ppt-builder" || mode === "slides") return "ppt-builder";
  if (mode === "image-tools" || mode === "image-pdf" || mode === "images") return "image-tools";
  return "equation";
}

function normalizeImageToolMode(mode = "") {
  return mode === "resize" || mode === "image-resize" ? "image-resize" : "image-pdf";
}

function loadInitialState() {
  const blankState = {
    mode: "equation",
    imageToolMode: "image-pdf",
    input: branches.editor.initialInput,
    history: [],
    selectedToolId: "fraction",
    selectedFigureToolId: "triangle-right",
    drawing: {
      tool: "select",
      color: "#1f6feb",
      fillColor: "#58a6ff",
      textColor: "#f0f6fc",
      width: 2,
      opacity: 1,
      dash: "solid",
      roughness: "smooth",
      fontSize: 16,
      fontFamily: "Segoe UI",
      textAlign: "center",
      textWeight: "normal",
      textStyle: "normal",
      shapes: [],
      selectedId: null,
      selectedIds: [],
      clipboard: null,
      zoom: 1,
      panX: 0,
      panY: 0,
      grid: true,
      snapToGrid: false,
      gridSize: 20,
      angleSnap: 15,
      arrowStart: "none",
      arrowEnd: "triangle",
      activeChapter: "algebra",
      collapsedGroups: {},
      selectedGroup: "all",
      canvasWidth: 960,
      canvasHeight: 540,
    },
    ppt: {
      settings: { ...(branches.ppt?.settings || {}) },
      questions: JSON.parse(JSON.stringify(branches.ppt?.samples || [])),
      activeQuestionIndex: 0,
      showPasteBox: false,
      applyScope: "all"
    }
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankState;
    const parsed = JSON.parse(raw);
    let pptQuestions = parsed.ppt?.questions;
    if (Array.isArray(pptQuestions) && pptQuestions.length) {
      pptQuestions = pptQuestions.filter((q) => {
        const eng = (q.english || "").toLowerCase();
        const hin = (q.hindi || "").toLowerCase();
        if (eng.includes("sonu started a business") || hin.includes("सोनू ने") || eng.includes("marbles in a bag") || hin.includes("कंचों की संख्या")) {
          return false;
        }
        return true;
      });
    }
    if (!pptQuestions || !pptQuestions.length) {
      pptQuestions = JSON.parse(JSON.stringify(blankState.ppt.questions));
    }

    return {
      ...blankState,
      ...parsed,
      drawing: { ...blankState.drawing, ...(parsed.drawing || {}) },
      ppt: {
        ...blankState.ppt,
        ...(parsed.ppt || {}),
        settings: { ...blankState.ppt.settings, ...(parsed.ppt?.settings || {}) },
        questions: pptQuestions
      }
    };
  } catch (err) {
    console.warn("Could not load state from localStorage:", err);
    return blankState;
  }
}

function saveState(s = state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (err) {
    console.warn("Could not persist state:", err);
  }
}

function recordUndo() {
  if (isApplyingHistory) return;
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > UNDO_STACK_LIMIT) undoStack.shift();
  redoStack.length = 0;
}

function applySnapshot(snapshotJson) {
  if (!snapshotJson) return;
  const parsed = JSON.parse(snapshotJson);
  for (const key of Object.keys(state)) {
    if (!(key in parsed)) {
      delete state[key];
    }
  }
  Object.assign(state, parsed);
}

function undoState() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(state));
  const prev = undoStack.pop();
  isApplyingHistory = true;
  try {
    applySnapshot(prev);
    saveState(state);
    render();
  } finally {
    isApplyingHistory = false;
  }
}

function redoState() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(state));
  const next = redoStack.pop();
  isApplyingHistory = true;
  try {
    applySnapshot(next);
    saveState(state);
    render();
  } finally {
    isApplyingHistory = false;
  }
}

function handleGlobalUndoRedoKeydown(event) {
  const isCtrlOrCmd = event.ctrlKey || event.metaKey;
  if (!isCtrlOrCmd) return;

  const key = event.key ? event.key.toLowerCase() : "";
  if (key === "z" && !event.shiftKey) {
    event.preventDefault();
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    undoState();
  } else if ((key === "y" && !event.shiftKey) || (key === "z" && event.shiftKey)) {
    event.preventDefault();
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    redoState();
  }
}

function handleGlobalPaste(event) {
  const mode = normalizeAppMode(state.mode);
  if (mode === "image-tools") {
    handleImagePdfPaste(event);
    return;
  }
  if (mode === "ppt-builder") {
    handlePptCanvasPaste(event, app, state, recordUndo, saveState, render);
    return;
  }
  if (mode === "equation") {
    handleEquationPaste(event);
    return;
  }
}

function render() {
  if (!app) return;

  // Preserve scroll positions of key UI elements before rebuilding HTML
  const fsSidebar = app.querySelector(".ppt-fs-thumbnails-sidebar");
  const fsSidebarScrollTop = fsSidebar ? fsSidebar.scrollTop : null;

  const embeddedSidebar = app.querySelector(".ppt-slide-sidebar") || app.querySelector(".ppt-slides-strip");
  const embeddedSidebarScrollTop = embeddedSidebar ? (embeddedSidebar.scrollTop || embeddedSidebar.scrollLeft) : null;

  state.mode = normalizeAppMode(state.mode);
  app.innerHTML = renderApp(state);
  bindEvents();

  if (fsSidebarScrollTop !== null) {
    const newFsSidebar = app.querySelector(".ppt-fs-thumbnails-sidebar");
    if (newFsSidebar) {
      newFsSidebar.scrollTop = fsSidebarScrollTop;
    }
  }

  if (embeddedSidebarScrollTop !== null) {
    const newEmbeddedSidebar = app.querySelector(".ppt-slide-sidebar") || app.querySelector(".ppt-slides-strip");
    if (newEmbeddedSidebar) {
      if (newEmbeddedSidebar.scrollTop !== undefined) newEmbeddedSidebar.scrollTop = embeddedSidebarScrollTop;
      if (newEmbeddedSidebar.scrollLeft !== undefined) newEmbeddedSidebar.scrollLeft = embeddedSidebarScrollTop;
    }
  }
}

function bindEvents() {
  // Topbar Mode Switching
  app.querySelectorAll("[data-set-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetMode = normalizeAppMode(btn.dataset.setMode);
      if (state.mode !== targetMode) {
        recordUndo();
        state.mode = targetMode;
        saveState(state);
        render();
      }
    });
  });

  // Global Actions (Buttons and inputs with data-action)
  app.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (el.tagName === "INPUT" && el.type === "file") return;
      handleAction(e);
    });
    if (el.tagName === "INPUT" || el.tagName === "SELECT") {
      el.addEventListener("change", (e) => {
        handleAction(e);
      });
    }
  });


  // Mode Specific Controller Bindings
  const currentMode = normalizeAppMode(state.mode);

  if (currentMode === "ppt-builder") {
    bindPptEvents(app, state, render, recordUndo, saveState, undoState, redoState);
  } else if (currentMode === "image-tools") {
    bindImagePdfEvents();
    bindImageResizeEvents();
  } else if (currentMode === "math-figures") {
    bindMathFiguresEvents();
  } else {
    bindEquationEditorEvents();
  }
}

function handleAction(event) {
  const node = event.target.closest("[data-action]");
  if (!node) return;
  const action = node.dataset.action;

  if (action === "undo" || action === "undo-state" || action === "ppt-undo") {
    undoState();
    return;
  }

  if (action === "redo" || action === "redo-state" || action === "ppt-redo") {
    redoState();
    return;
  }

  if (action && action.startsWith("ppt-")) {
    handlePptAction(action, node, app, state, render, recordUndo, saveState, undoState, redoState);
    return;
  }

  if (action === "export-canvas-png" || action === "download-png") {
    exportCanvasPng({ copy: false });
    return;
  }

  if (action === "copy-png") {
    exportCanvasPng({ copy: true });
    return;
  }

  if (action === "copy-svg") {
    copyText(createCanvasExportSvg());
    return;
  }

  if (action === "smart-clean") {
    smartCleanEditorInput();
    return;
  }

  if (action === "fix-brackets") {
    fixEditorBrackets();
    return;
  }

  if (action === "insert-label-text") {
    recordUndo();
    insertPlainLabelText();
    return;
  }


  if (action === "copy-latex" || action === "copy-math-latex") {
    copyText(node.dataset.text || state.input);
    return;
  }

  if (action === "copy-mathml" || action === "copy-math-mathml") {
    copyText(node.dataset.text || state.input);
    return;
  }

  if (action === "copy-ascii" || action === "copy-math-ascii") {
    copyText(node.dataset.text || state.input);
    return;
  }

  if (action === "print-pdf") {
    window.print();
    return;
  }

  if (action === "draw-figure") {
    recordUndo();
    selectFigureTool(node.dataset.toolId);
    return;
  }

  if (action === "author-chapter") {
    recordUndo();
    insertChapterStarter(node.dataset.chapterId);
    return;
  }

  if (action === "insert-snippet") {
    recordUndo();
    insertEquationSnippet(node.dataset.snippetId);
    return;
  }

  if (action === "draw-manual") {
    recordUndo();
    drawManualTool(node.dataset.drawTool);
    return;
  }
}

function bindEquationEditorEvents() {
  const input = app.querySelector("[data-equation-input]");
  if (input) {
    input.addEventListener("keydown", handleEquationInputKeydown);
    input.addEventListener("input", (e) => {
      applyEquationInputValue(e.target.value);
    });
  }

  app.querySelectorAll("[data-editor-command]").forEach((b) => b.addEventListener("click", handleEditorCommand));
  app.querySelectorAll("[data-editor-insert]").forEach((b) => b.addEventListener("click", handleEditorInsert));
  app.querySelectorAll("[data-editor-template]").forEach((b) => b.addEventListener("click", handleEditorTemplate));
  app.querySelectorAll("[data-toolbar-select]").forEach((b) => b.addEventListener("change", handleToolbarSelect));
  app.querySelectorAll("[data-toolbar-color]").forEach((b) => b.addEventListener("input", handleToolbarColor));
  app.querySelectorAll("[data-chapter-starter]").forEach((b) => b.addEventListener("click", () => insertChapterStarter(b.dataset.chapterStarter)));
  app.querySelectorAll("[data-equation-snippet]").forEach((b) => b.addEventListener("click", () => insertEquationSnippet(b.dataset.equationSnippet)));
}

function bindMathFiguresEvents() {
  app.querySelectorAll("[data-drawing-prop]").forEach((inp) => {
    inp.addEventListener("input", handleDrawingPropertyInput);
    inp.addEventListener("change", handleDrawingPropertyInput);
  });
  app.querySelectorAll("[data-drawing-action]").forEach((b) => b.addEventListener("click", handleDrawingAction));
  app.querySelectorAll("[data-manual-label]").forEach((b) => b.addEventListener("input", handleManualLabelInput));
  app.querySelectorAll("[data-tool-select]").forEach((b) => b.addEventListener("change", handleToolSelect));
  app.querySelectorAll("[data-tool-group]").forEach((b) => b.addEventListener("toggle", handleToolGroupToggle));
  app.querySelectorAll("[data-figure-tool]").forEach((b) => b.addEventListener("click", () => selectFigureTool(b.dataset.figureTool)));
  app.querySelectorAll("[data-manual-tool]").forEach((b) => b.addEventListener("click", () => drawManualTool(b.dataset.manualTool)));
  app.querySelectorAll("[data-drawing-surface]").forEach((s) => s.addEventListener("pointerdown", startDrawing));
  app.querySelectorAll("[data-column-resizer]").forEach((r) => r.addEventListener("pointerdown", startColumnResize));

  renderDrawingSurface();
}

// Initial Boot
render();
