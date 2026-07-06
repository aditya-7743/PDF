import { branches } from "../branches/index.js";

export function createDefaultState() {
  return {
    mode: "equation",
    input: branches.editor.defaultInput,
    fontSize: branches.preview.defaultFontSize,
    fontFamily: branches.preview.defaultFontFamily,
    textColor: branches.preview.defaultTextColor,
    highlightColor: branches.preview.defaultHighlightColor,
    lineHeight: branches.preview.defaultLineHeight,
    alignment: branches.preview.defaultAlignment,
    background: branches.preview.defaultBackground,
    pagePreset: "auto",
    pageMargin: 32,
    pageZoom: 100,
    visualOverride: "",
    openToolGroup: "",
    activeToolId: "",
    activeFigureTool: "",
    drawings: [],
    selectedDrawingId: "",
    cropMode: false,
    activeChapterId: "",
    activeDrawTool: "",
    imageToolMode: "image-to-pdf",
    manualLabel: "A",
    labelPosition: "top",
    manualAlignment: "center",
    columns: normalizeColumnSizes(branches.app.defaultColumns),
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(branches.app.autosaveKey);
    if (!raw) return createDefaultState();
    const saved = JSON.parse(raw);
    return {
      ...createDefaultState(),
      ...saved,
      columns: normalizeColumnSizes(saved.columns),
    };
  } catch {
    return createDefaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(branches.app.autosaveKey, JSON.stringify(state));
}

export function normalizeColumnSizes(columns = {}) {
  const keys = ["tools", "editor", "preview"];
  const values = keys.reduce((next, key) => {
    const value = Number(columns[key] ?? branches.app.defaultColumns[key]);
    next[key] = Number.isFinite(value) && value > 0 ? value : branches.app.defaultColumns[key];
    return next;
  }, {});
  const total = keys.reduce((sum, key) => sum + values[key], 0);

  if (!Number.isFinite(total) || total <= 0) {
    return { ...branches.app.defaultColumns };
  }

  return keys.reduce((next, key) => {
    next[key] = Math.round((values[key] / total) * 1000) / 10;
    return next;
  }, {});
}
