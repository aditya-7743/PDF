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
    ppt: {
      settings: { ...(branches.ppt?.settings || {}) },
      questions: [...(branches.ppt?.samples || [])],
      activeQuestionIndex: 0,
      zoom: 100,
    },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(branches.app.autosaveKey);
    if (!raw) return createDefaultState();
    const saved = JSON.parse(raw);
    const state = {
      ...createDefaultState(),
      ...saved,
      columns: normalizeColumnSizes(saved.columns),
    };
    if (state.ppt) {
      if (state.ppt.fsAutoFit === undefined) {
        state.ppt.fsAutoFit = true;
      }
      if (!state.ppt._elementsCleanV5) {
        state.ppt._elementsCleanV5 = true;
        if (state.ppt.settings) {
          state.ppt.settings.showHeader = false;
          state.ppt.settings.showQBadge = false;
          state.ppt.settings.showEnglish = false;
          state.ppt.settings.showHindi = false;
          state.ppt.settings.showExamTag = false;
          state.ppt.settings.showOptions = false;
          state.ppt.settings.showDivider = false;
          state.ppt.settings.showFooter = false;
        }
        if (state.ppt.questions) {
          state.ppt.questions.forEach((q) => {
            if (!q.settings) q.settings = {};
            const isPlaceholderEnglish = !q.english || q.english === "English question will appear here...";
            const isPlaceholderHindi = !q.hindi || q.hindi === "हिंदी प्रश्न यहाँ दिखाई देगा...";
            const isDefaultExam = !q.exam || q.exam === "SSC CGL 12/09/2025 (Shift 1)" || q.exam === "(SSC CGL 2024)";
            const isDefaultOptions = !q.options || q.options.length === 0 || q.options.every(o => !o.text || !o.text.trim());

            if (isPlaceholderEnglish && isPlaceholderHindi && (isDefaultExam || isDefaultOptions)) {
              q.settings.showHeader = false;
              q.settings.showQBadge = false;
              q.settings.showEnglish = false;
              q.settings.showHindi = false;
              q.settings.showDivider = false;
              q.settings.showExamTag = false;
              q.settings.showOptions = false;
              q.settings.showFooter = false;
            }
          });
        }
      }
      if (!state.ppt._elementsCleanV6) {
        state.ppt._elementsCleanV6 = true;
        if (state.ppt.questions) {
          state.ppt.questions.forEach((q) => {
            const qSettings = q.settings || {};
            const hasActive = Boolean(
              qSettings.showHeader ||
              qSettings.showQBadge ||
              qSettings.showEnglish ||
              qSettings.showHindi ||
              qSettings.showDivider ||
              qSettings.showExamTag ||
              qSettings.showOptions ||
              qSettings.showFooter
            );
            if (hasActive || q.layout === "blank") {
              q.layout = "standard";
            }
          });
        }
        if (state.ppt.settings && state.ppt.settings.layoutPreset === "blank") {
          state.ppt.settings.layoutPreset = "standard";
        }
      }
      if (!state.ppt._elementsCleanV7) {
        state.ppt._elementsCleanV7 = true;
        if (state.ppt.settings) {
          state.ppt.settings.defaultExam = "(Exam Name)";
          state.ppt.settings.layoutPreset = "standard";
          state.ppt.settings.boxPosX = 0;
          state.ppt.settings.boxPosY = 0;
          state.ppt.settings.questionBoxWidth = 100;
          state.ppt.settings.textAlign = "left";
        }
        if (state.ppt.questions) {
          state.ppt.questions.forEach((q) => {
            if (!q.settings) q.settings = {};
            q.settings.boxPosX = 0;
            q.settings.boxPosY = 0;
            q.settings.questionBoxWidth = 100;
            q.settings.engPosX = 0;
            q.settings.engPosY = 0;
            q.settings.hindiPosX = 0;
            q.settings.hindiPosY = 0;
            q.settings.optionsPosX = 0;
            q.settings.optionsPosY = 0;
            q.settings.examTagPosX = 0;
            q.settings.examTagPosY = 0;
            q.settings.qBadgePosX = 0;
            q.settings.qBadgePosY = 0;
            q.settings.textAlign = "left";
            q.settings.elementOrder = ["qbadge", "english", "divider", "hindi", "exam", "options"];
            if (!q.exam || q.exam.includes("SSC CGL") || q.exam.includes("SSC GD")) {
              q.exam = "(Exam Name)";
            }
            if (q.settings.defaultExam) {
              q.settings.defaultExam = "(Exam Name)";
            }
          });
        }
      }
    }
    return state;
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
