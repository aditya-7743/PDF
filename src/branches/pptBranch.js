export const pptThemes = {
  maroon: {
    id: "maroon",
    name: "Classic SSC (Maroon & Gold)",
    slideBg: "#FFFFFF",
    headerBg: "#7A0000",
    qBadgeBg: "#FFFFFF",
    qBadgeColor: "#7A0000",
    examColor: "#FFFFFF",
    topicColor: "#FFD700",
    engColor: "#111111",
    dividerColor: "#A30000",
    hindiColor: "#7A0000",
    optionCardBg: "#FFFFFF",
    optionBorderColor: "#CBD5E1",
    optionBadgeBg: "#7A0000",
    optionBadgeColor: "#FFFFFF",
    optionTextColor: "#111111",
    footerBg: "#7A0000",
    footerColor: "#FFFFFF",
  },
  navy: {
    id: "navy",
    name: "Royal Navy & Cyan (EdTech)",
    slideBg: "#FFFFFF",
    headerBg: "#0A1931",
    qBadgeBg: "#FFFFFF",
    qBadgeColor: "#0A1931",
    examColor: "#FFFFFF",
    topicColor: "#00E5FF",
    engColor: "#0F172A",
    dividerColor: "#1E3A8A",
    hindiColor: "#1E3A8A",
    optionCardBg: "#FFFFFF",
    optionBorderColor: "#CBD5E1",
    optionBadgeBg: "#0A1931",
    optionBadgeColor: "#FFFFFF",
    optionTextColor: "#0F172A",
    footerBg: "#0A1931",
    footerColor: "#FFFFFF",
  },
  emerald: {
    id: "emerald",
    name: "Emerald Green (Exam Pro)",
    slideBg: "#FFFFFF",
    headerBg: "#064E3B",
    qBadgeBg: "#FFFFFF",
    qBadgeColor: "#064E3B",
    examColor: "#FFFFFF",
    topicColor: "#FDE047",
    engColor: "#111827",
    dividerColor: "#047857",
    hindiColor: "#065F46",
    optionCardBg: "#FFFFFF",
    optionBorderColor: "#D1D5DB",
    optionBadgeBg: "#064E3B",
    optionBadgeColor: "#FFFFFF",
    optionTextColor: "#111827",
    footerBg: "#064E3B",
    footerColor: "#FFFFFF",
  },
  dark: {
    id: "dark",
    name: "Dark Mode (Digital Board / YouTube)",
    slideBg: "#0B0F17",
    headerBg: "#111827",
    qBadgeBg: "#2563EB",
    qBadgeColor: "#FFFFFF",
    examColor: "#F3F4F6",
    topicColor: "#10B981",
    engColor: "#FFFFFF",
    dividerColor: "#1F2937",
    hindiColor: "#FBBF24",
    optionCardBg: "#1F2937",
    optionBorderColor: "#374151",
    optionBadgeBg: "#E11D48",
    optionBadgeColor: "#FFFFFF",
    optionTextColor: "#FFFFFF",
    footerBg: "#111827",
    footerColor: "#9CA3AF",
    examTagBg: "#DC2626",
    examTagColor: "#FFFFFF",
    examTagPosition: "below-question",
    examTagStyle: "pill",
    optionStyle: "clean",
  },
  purple: {
    id: "purple",
    name: "Cyber Purple (Tech/Board)",
    slideBg: "#FFFFFF",
    headerBg: "#4C1D95",
    qBadgeBg: "#FFFFFF",
    qBadgeColor: "#4C1D95",
    examColor: "#FFFFFF",
    topicColor: "#FDE047",
    engColor: "#0F172A",
    dividerColor: "#6D28D9",
    hindiColor: "#5B21B6",
    optionCardBg: "#FFFFFF",
    optionBorderColor: "#DDD6FE",
    optionBadgeBg: "#5B21B6",
    optionBadgeColor: "#FFFFFF",
    optionTextColor: "#0F172A",
    footerBg: "#4C1D95",
    footerColor: "#FFFFFF",
  },
  slate: {
    id: "slate",
    name: "Minimal Slate (Clean Paper)",
    slideBg: "#F8FAFC",
    headerBg: "#1E293B",
    qBadgeBg: "#38BDF8",
    qBadgeColor: "#0F172A",
    examColor: "#94A3B8",
    topicColor: "#38BDF8",
    engColor: "#0F172A",
    dividerColor: "#94A3B8",
    hindiColor: "#334155",
    optionCardBg: "#FFFFFF",
    optionBorderColor: "#E2E8F0",
    optionBadgeBg: "#1E293B",
    optionBadgeColor: "#FFFFFF",
    optionTextColor: "#0F172A",
    footerBg: "#1E293B",
    footerColor: "#94A3B8",
  }
};


export const defaultPptSettings = {
  theme: "maroon",
  topic: "RATIO & PROPORTION",
  defaultExam: "(Exam Name)",
  layoutPreset: "standard",
  boxPosX: 0,
  boxPosY: 0,
  engPosX: 0,
  engPosY: 0,
  engWidth: 100,
  hindiPosX: 0,
  hindiPosY: 0,
  hindiWidth: 100,
  examTagPosX: 0,
  examTagPosY: 0,
  examTagPosition: "below-question",
  examTagStyle: "pill",
  examTagBg: "#DC2626",
  examTagColor: "#FFFFFF",
  optionsPosX: 0,
  optionsPosY: 0,
  optionStyle: "card",
  examBadgeStyle: "text",
  headerHeight: 56,
  qBadgeShape: "pill",
  qBadgeSize: 18,
  examFontSize: 18,
  topicFontSize: 19,
  topicPosX: 0,
  topicPosY: 0,
  engFontSize: 18,
  engFontFamily: "Segoe UI, Arial, sans-serif",
  hindiFontSize: 17,
  hindiFontFamily: "Mangal, Noto Sans Devanagari, Nirmala UI, Arial, sans-serif",
  dividerThickness: 2,
  dividerWidth: 100,
  dividerPosX: 0,
  showHeader: false,
  showQBadge: false,
  showEnglish: false,
  showHindi: false,
  showExamTag: false,
  showOptions: false,
  showDivider: false,
  showFooter: false,
  footerText: "Maths by Aditya | Telegram: @YourChannel",
  footerHeight: 24,
  footerFontSize: 12,
  aspectRatio: "16:9",
  applyScope: "all", // "all" = All Slides, "current" = Selected Slide Only
  ...pptThemes.maroon,
};

export function isSlideElementActive(globalSettings = {}, q = {}, elemKey) {
  if (!q) return false;
  const qSettings = q.settings || {};

  const flagMap = {
    header: "showHeader",
    qbadge: "showQBadge",
    english: "showEnglish",
    hindi: "showHindi",
    divider: "showDivider",
    exam: "showExamTag",
    options: "showOptions",
    footer: "showFooter"
  };

  const flagKey = flagMap[elemKey];
  if (!flagKey) return false;

  if (qSettings[flagKey] !== undefined) {
    return Boolean(qSettings[flagKey]);
  }
  if (globalSettings[flagKey] !== undefined) {
    return Boolean(globalSettings[flagKey]);
  }
  return false;
}

export function getSlideSettings(globalSettings = {}, q = {}) {
  const merged = { ...globalSettings };
  if (q && q.settings) {
    Object.assign(merged, q.settings);
  }
  if (q && q.bgImage) {
    merged.bgImage = q.bgImage;
  }

  merged.showHeader = isSlideElementActive(globalSettings, q, "header");
  merged.showQBadge = isSlideElementActive(globalSettings, q, "qbadge");
  merged.showEnglish = isSlideElementActive(globalSettings, q, "english");
  merged.showHindi = isSlideElementActive(globalSettings, q, "hindi");
  merged.showDivider = isSlideElementActive(globalSettings, q, "divider");
  merged.showExamTag = isSlideElementActive(globalSettings, q, "exam");
  merged.showOptions = isSlideElementActive(globalSettings, q, "options");
  merged.showFooter = isSlideElementActive(globalSettings, q, "footer");

  return merged;
}

export const sampleQuestions = [
  {
    id: "q_1",
    number: "Q.1",
    topic: "",
    exam: "",
    english: "",
    hindi: "",
    options: [],
    answer: "",
    settings: {
      showHeader: false,
      showQBadge: false,
      showEnglish: false,
      showHindi: false,
      showDivider: false,
      showExamTag: false,
      showOptions: false,
      showFooter: false
    }
  }
];

export * from "./ppt/pptUI.js";
export * from "./ppt/pptController.js";