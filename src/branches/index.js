import { appBranch } from "./appBranch.js";
import { toolBranch } from "./toolBranch.js";
import { sampleBranch } from "./sampleBranch.js";
import { editorBranch } from "./editorBranch.js";
import { previewBranch } from "./previewBranch.js";
import { defaultPptSettings, pptThemes, sampleQuestions } from "./pptBranch.js";
import { homeBranch } from "./home/homeBranch.js";

export const branches = {
  home: homeBranch,
  app: appBranch,
  tools: toolBranch,
  samples: sampleBranch,
  editor: editorBranch,
  preview: previewBranch,
  ppt: {
    settings: defaultPptSettings,
    themes: pptThemes,
    samples: sampleQuestions,
  },
};