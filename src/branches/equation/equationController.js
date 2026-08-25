// Equation Editor & Visual MathML Controller
import { branches } from "../index.js";
import { renderMathMl } from "../../core/mathml.js?v=gemini-paste-clean-20260705";
import { getEquationDiagnostics } from "../../core/normalizer.js?v=gemini-paste-clean-20260705";


function handleEquationInputKeydown(event) {
  if (event.key !== "Enter") return;

  const input = event.currentTarget;
  const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
  const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
  const nextValue = `${input.value.slice(0, start)}\n${input.value.slice(end)}`;
  const nextCursor = start + 1;

  event.preventDefault();
  recordUndo();
  input.value = nextValue;
  input.setSelectionRange(nextCursor, nextCursor);

  state.input = nextValue;
  state.visualOverride = "";
  state.activeFigureTool = "";
  clearDrawingState();
  updateInputOutputInline();
  saveState(state);
}


function handleEquationPaste(event) {
  const pasted = event.clipboardData?.getData("text/plain");
  if (!pasted) return;

  event.preventDefault();
  recordUndo();
  insertIntoEquationInput(smartCleanMathInput(pasted), { source: "paste" });
}


function insertIntoEquationInput(rawText, options = {}) {
  const textarea = app.querySelector(".equation-input[data-bind='input']");
  const current = state.input || "";
  const start = Number.isInteger(textarea?.selectionStart) ? textarea.selectionStart : current.length;
  const end = Number.isInteger(textarea?.selectionEnd) ? textarea.selectionEnd : start;
  const markerIndex = rawText.indexOf("|");
  const insertText = rawText.replace("|", "");
  const insertion = buildEquationInsertion(current, start, end, insertText, markerIndex, options);
  const nextValue = insertion.value;
  const nextCursor = insertion.cursor;

  state.input = nextValue;
  state.visualOverride = "";
  state.activeFigureTool = "";
  clearDrawingState();

  if (textarea) {
    textarea.value = nextValue;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(nextCursor, nextCursor);
  }

  updateInputOutputInline();
  saveState(state);
}


function buildEquationInsertion(current, start, end, insertText, markerIndex, options = {}) {
  const cursorOffset = markerIndex >= 0 ? markerIndex : insertText.length;
  const isPaste = options.source === "paste";
  const isCollapsedSelection = start === end;
  const shouldCreateBlock = isPaste && markerIndex < 0 && isCollapsedSelection && current.trim() && looksLikeCompleteEquation(insertText);

  if (!shouldCreateBlock) {
    return {
      value: `${current.slice(0, start)}${insertText}${current.slice(end)}`,
      cursor: start + cursorOffset,
    };
  }

  const trimmedInsert = insertText.trim();
  const before = current.slice(0, start).replace(/[ \t\r\n]+$/g, "");
  const after = current.slice(end).replace(/^[ \t\r\n]+/g, "");
  const prefix = before ? "\n\n" : "";
  const suffix = after ? "\n\n" : "";
  const value = `${before}${prefix}${trimmedInsert}${suffix}${after}`;

  return {
    value,
    cursor: `${before}${prefix}${trimmedInsert}`.length,
  };
}


function looksLikeCompleteEquation(value = "") {
  const text = String(value).trim();
  return text.length >= 18 && /\\(?:left|frac|sqrt|begin)|=|\?/.test(text);
}


function smartCleanEditorInput() {
  const cleaned = smartCleanMathInput(state.input);
  if (cleaned === state.input) return;

  recordUndo();
  applyEquationInputValue(cleaned);
}


function fixEditorBrackets() {
  const diagnostics = getEquationDiagnostics(state.input);
  if (!diagnostics.canFix) return;

  const fixed = autoFixEquationInput(state.input);
  if (fixed === state.input) return;

  recordUndo();
  applyEquationInputValue(fixed);
}


function applyEquationInputValue(value) {
  const textarea = app.querySelector(".equation-input[data-bind='input']");
  state.input = value;
  state.visualOverride = "";
  state.activeFigureTool = "";
  clearDrawingState();

  if (textarea) {
    textarea.value = value;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(value.length, value.length);
  }

  updateInputOutputInline();
  saveState(state);
}


function updateInputOutputInline() {
  const rendered = renderMathMl(state.input);
  const diagnostics = getEquationDiagnostics(state.input);
  const badge = app.querySelector(".editor-panel .badge");
  const cleanOutput = app.querySelector(".clean-output");
  const canvas = app.querySelector(".equation-canvas");
  const preview = app.querySelector(".equation-render");

  if (badge) badge.textContent = `${rendered.normalized.length} chars`;
  if (cleanOutput) cleanOutput.value = rendered.normalized;
  updateEquationStatusInline(diagnostics);
  if (canvas) canvas.classList.remove("has-drawing-surface");
  if (preview) {
    preview.innerHTML = rendered.mathMl;
    preview.dataset.baseFontSize = String(state.fontSize);
  }

  requestAnimationFrame(fitEquationPreview);
}


function updateEquationStatusInline(diagnostics) {
  const status = app.querySelector("[data-equation-status]");
  if (!status) return;

  const title = status.querySelector("[data-equation-status-title]");
  const message = status.querySelector("[data-equation-status-message]");
  const fixButton = status.querySelector("[data-equation-status-fix]");
  status.className = `equation-status is-${diagnostics.level}`;
  if (title) title.textContent = diagnostics.title;
  if (message) message.textContent = diagnostics.message;
  if (fixButton) {
    fixButton.classList.toggle("is-hidden", !diagnostics.canFix);
    fixButton.disabled = !diagnostics.canFix;
  }
  app.querySelectorAll("[data-action='fix-brackets']").forEach((button) => {
    button.classList.toggle("is-disabled", !diagnostics.canFix);
    button.disabled = !diagnostics.canFix;
  });
}


function handleVisualEdit(event) {
  recordUndo();
  state.visualOverride = event.currentTarget.innerHTML;
  saveState(state);
}


function handleCanvasCopy(event) {
  const editor = event.currentTarget;
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.isCollapsed || !isSelectionInsideNode(selection, editor)) return;

  event.preventDefault();
  writeCanvasSelectionToClipboard(event.clipboardData, selection);
}


function handleCanvasCut(event) {
  const editor = event.currentTarget;
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.isCollapsed || !isSelectionInsideNode(selection, editor)) return;

  event.preventDefault();
  recordUndo();
  writeCanvasSelectionToClipboard(event.clipboardData, selection);
  selection.deleteFromDocument();
  state.visualOverride = editor.innerHTML;
  saveState(state);
  requestAnimationFrame(fitEquationPreview);
}


function handleCanvasPaste(event) {
  const editor = event.currentTarget;
  const text = event.clipboardData?.getData("text/plain") || "";
  const html = event.clipboardData?.getData("text/html") || "";
  if (!text && !html) return;

  event.preventDefault();
  recordUndo();
  ensureCanvasSelection(editor);

  if (isCanvasCopyHtml(html)) {
    insertHtmlAtCanvasSelection(sanitizeCanvasPasteHtml(html), editor);
  } else if (shouldRenderCanvasLatex(text)) {
    const cleaned = smartCleanMathInput(text);
    insertHtmlAtCanvasSelection(renderMathMl(cleaned).mathMl, editor);
  } else {
    insertTextAtCanvasSelection(text, editor);
  }

  state.visualOverride = editor.innerHTML;
  saveState(state);
  requestAnimationFrame(fitEquationPreview);
}


function writeCanvasSelectionToClipboard(clipboardData, selection) {
  if (!clipboardData || !selection.rangeCount) return;

  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-equation-canvas-copy", "true");
  wrapper.append(selection.getRangeAt(0).cloneContents());
  const html = sanitizeCanvasPasteHtml(wrapper.outerHTML);
  clipboardData.setData("text/html", html);
  clipboardData.setData("text/plain", selection.toString());
}


function isCanvasCopyHtml(html = "") {
  return /data-equation-canvas-copy|<math[\s>]|class=["'][^"']*(?:solution-layout|equation-render)/i.test(String(html));
}


function shouldRenderCanvasLatex(text = "") {
  const cleaned = smartCleanMathInput(text);
  if (!cleaned || cleaned.length < 2) return false;
  return /\\(?:frac|sqrt|left|right|begin|sum|int|lim|sin|cos|tan|sec|csc|cot)|\$\$|\\\[|[_^{}]/.test(cleaned);
}


function sanitizeCanvasPasteHtml(html = "") {
  const template = document.createElement("template");
  template.innerHTML = String(html);
  template.content.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value || "";
      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        name === "contenteditable" ||
        name === "data-visual-edit" ||
        name === "data-equation-edit-canvas" ||
        (name === "href" && /^\s*javascript:/i.test(value))
      ) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  const copied = template.content.querySelector("[data-equation-canvas-copy]");
  return copied ? copied.innerHTML : template.innerHTML;
}


function ensureCanvasSelection(editor) {
  const selection = window.getSelection();
  if (selection?.rangeCount && isSelectionInsideNode(selection, editor)) return;

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
  editor.focus({ preventScroll: true });
}


function insertHtmlAtCanvasSelection(html, editor) {
  ensureCanvasSelection(editor);
  if (document.queryCommandSupported?.("insertHTML")) {
    document.execCommand("insertHTML", false, html);
    return;
  }

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const template = document.createElement("template");
  template.innerHTML = html;
  const fragment = template.content;
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);
  if (lastNode) placeCaretAfterNode(lastNode, editor);
}


function insertTextAtCanvasSelection(text, editor) {
  ensureCanvasSelection(editor);
  if (document.queryCommandSupported?.("insertText")) {
    document.execCommand("insertText", false, text);
    return;
  }

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  placeCaretAfterNode(node, editor);
}


function placeCaretAfterNode(node, editor) {
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  editor.focus({ preventScroll: true });
}


function isSelectionInsideNode(selection, node) {
  if (!selection || !selection.rangeCount || !node) return false;
  const range = selection.getRangeAt(0);
  return node.contains(range.commonAncestorContainer);
}


function handleEditorCommand(event) {
  event.preventDefault();
  const command = event.currentTarget.dataset.editorCommand;
  const selectedText = findSelectedPlainTextDrawing();

  if (command === "font-size-decrease" || command === "font-size-increase") {
    const direction = command === "font-size-increase" ? 1 : -1;
    recordUndo();
    if (selectedText) {
      selectedText.fontSize = clamp(Number(selectedText.fontSize || state.fontSize) + direction, branches.preview.minFontSize, branches.preview.maxFontSize);
      state.fontSize = selectedText.fontSize;
      commitDrawingSurface({ rerender: true });
      return;
    }
    state.fontSize = clamp(state.fontSize + direction, branches.preview.minFontSize, branches.preview.maxFontSize);
    render();
    return;
  }

  if (selectedText && ["bold", "italic", "underline", "removeFormat"].includes(command)) {
    recordUndo();
    if (command === "bold") selectedText.bold = !selectedText.bold;
    if (command === "italic") selectedText.italic = !selectedText.italic;
    if (command === "underline") selectedText.underline = !selectedText.underline;
    if (command === "removeFormat") {
      selectedText.fontFamily = branches.preview.defaultFontFamily;
      selectedText.fontSize = branches.preview.defaultFontSize;
      selectedText.textColor = branches.preview.defaultTextColor;
      selectedText.bold = false;
      selectedText.italic = false;
      selectedText.underline = false;
      state.fontFamily = selectedText.fontFamily;
      state.fontSize = selectedText.fontSize;
      state.textColor = selectedText.textColor;
    }
    commitDrawingSurface({ rerender: true });
    return;
  }

  focusPreviewEditor();
  recordUndo();

  if (command === "create-link") {
    const url = window.prompt("Link URL");
    if (url) document.execCommand("createLink", false, url);
    persistVisualEdit();
    return;
  }

  if (command === "insert-image") {
    const url = window.prompt("Image URL");
    if (url) document.execCommand("insertImage", false, url);
    persistVisualEdit();
    return;
  }

  if (command === "insert-comment") {
    document.execCommand("backColor", false, state.highlightColor || branches.preview.defaultHighlightColor);
    persistVisualEdit();
    return;
  }

  document.execCommand(command, false, null);
  persistVisualEdit();
}


function handleEditorInsert(event) {
  event.preventDefault();
  const text = event.currentTarget.dataset.editorInsert || "";
  if (!text) return;

  recordUndo();
  insertIntoEquationInput(text);
}


function handleEditorTemplate(event) {
  event.preventDefault();
  const text = event.currentTarget.dataset.editorTemplate || "";
  if (!text) return;

  recordUndo();
  insertIntoEquationInput(text);
}


function handleToolbarSelect(event) {
  const key = event.currentTarget.dataset.toolbarSelect;
  const value = event.currentTarget.value;
  const selectedText = findSelectedPlainTextDrawing();

  if (key === "fontFamily") {
    recordUndo();
    if (selectedText) {
      selectedText.fontFamily = value;
      state.fontFamily = value;
      commitDrawingSurface({ rerender: true });
      return;
    }
    state.fontFamily = value;
    focusPreviewEditor();
    document.execCommand("fontName", false, value);
    persistVisualEdit();
    render();
    return;
  }

  if (key === "alignment") {
    recordUndo();
    state.alignment = "left";
    render();
    return;
  }

  if (key === "lineHeight") {
    recordUndo();
    state.lineHeight = Number(value);
    render();
    return;
  }

  if (key === "pagePreset") {
    recordUndo();
    state.pagePreset = ["auto", "a4", "wide", "square"].includes(value) ? value : "auto";
    render();
  }
}


function handleToolbarColor(event) {
  const key = event.currentTarget.dataset.toolbarColor;
  const value = event.currentTarget.value;
  const selectedText = findSelectedPlainTextDrawing();

  recordUndo();
  if (selectedText && key === "textColor") {
    selectedText.textColor = sanitizeHexColor(value, branches.preview.defaultTextColor);
    state.textColor = selectedText.textColor;
    commitDrawingSurface({ rerender: true });
    return;
  }

  state[key] = value;

  focusPreviewEditor();
  if (key === "textColor") {
    document.execCommand("foreColor", false, value);
  }
  if (key === "highlightColor") {
    document.execCommand("backColor", false, value);
  }
  persistVisualEdit();
}


function focusPreviewEditor() {
  const editor = app.querySelector(".equation-render");
  if (!editor) return null;
  editor.focus({ preventScroll: true });
  return editor;
}


function handleEquationCanvasClick(event) {
  if (event.target.closest("[data-visual-edit]")) return;
  focusPreviewEditor();
}


function handleEquationCanvasWheel(event) {
  if (!event.ctrlKey) return;

  event.preventDefault();
  event.stopPropagation();

  const direction = event.deltaY > 0 ? -1 : 1;
  const step = event.shiftKey ? 2 : 6;
  const currentZoom = Number.isFinite(Number(state.pageZoom)) ? Number(state.pageZoom) : 100;
  const nextZoom = clamp(currentZoom + direction * step, 40, 220);
  if (nextZoom === currentZoom) return;

  state.pageZoom = nextZoom;
  app.querySelectorAll(".equation-canvas").forEach((canvas) => {
    canvas.style.setProperty("--page-zoom", String(nextZoom / 100));
  });
  saveState(state);
}


function persistVisualEdit() {
  const editor = app.querySelector(".equation-render");
  if (!editor) return;
  state.visualOverride = editor.innerHTML;
  saveState(state);
  requestAnimationFrame(fitEquationPreview);
}


function insertChapterStarter(chapterId) {
  const chapter = (branches.tools.authoring?.chapters || []).find((item) => item.id === chapterId);
  if (!chapter) return;

  state.input = chapter.latex || "";
  state.visualOverride = "";
  clearDrawingState();
  state.activeChapterId = chapter.id;
  state.activeDrawTool = "";
}


function insertEquationSnippet(snippetId) {
  const snippet = (branches.tools.authoring?.equationSnippets || []).find((item) => item.id === snippetId);
  if (!snippet) return;

  const textarea = app.querySelector("[data-bind='input']");
  const current = state.input || "";
  const start = Number.isInteger(textarea?.selectionStart) ? textarea.selectionStart : current.length;
  const end = Number.isInteger(textarea?.selectionEnd) ? textarea.selectionEnd : start;
  const needsSpaceBefore = start > 0 && current[start - 1] && !/\s/.test(current[start - 1]);
  const insertText = `${needsSpaceBefore ? " " : ""}${snippet.latex}`;

  state.input = `${current.slice(0, start)}${insertText}${current.slice(end)}`;
  state.visualOverride = "";
  clearDrawingState();
  state.activeDrawTool = "";
}


function fitEquationPreview() {
  const canvas = app.querySelector(".equation-canvas");
  const render = app.querySelector(".equation-render");
  const math = app.querySelector(".equation-render math");
  const content = math || render?.firstElementChild;
  if (!canvas || !render || !content) return;

  const baseSize = Number(render.dataset.baseFontSize || state.fontSize || 38);
  render.style.fontSize = `${baseSize}px`;

  const canvasBox = canvas.getBoundingClientRect();
  const contentBoxes = [content, ...render.querySelectorAll("math")]
    .map((node) => node.getBoundingClientRect())
    .filter((box) => box.width > 0 || box.height > 0);
  const contentWidth = Math.max(render.scrollWidth, ...contentBoxes.map((box) => box.width));
  const contentHeight = Math.max(render.scrollHeight, ...contentBoxes.map((box) => box.height));
  const availableWidth = Math.max(120, canvasBox.width - 58);
  const availableHeight = Math.max(80, canvasBox.height - 46);
  const widthScale = contentWidth > 0 ? availableWidth / contentWidth : 1;
  const heightScale = contentHeight > 0 ? availableHeight / contentHeight : 1;
  const scale = Math.min(1, widthScale, heightScale);

  if (scale < 1) {
    render.style.fontSize = `${Math.max(16, Math.floor(baseSize * scale))}px`;
  }
}


/* ==================== PPT BUILDER LOGIC ==================== */


export {
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
};

