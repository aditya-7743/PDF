// Fullscreen PPT Slide Workbench UI
import { getSlideSettings } from "../../pptBranch.js?v=v93-drag-drop-perfect";
import { escapeHtml } from "./ribbon/ribbonCommon.js?v=v93-drag-drop-perfect";
import { renderRibbonHome } from "./ribbon/ribbonHome.js?v=v93-drag-drop-perfect";
import { renderRibbonHome2 } from "./ribbon/ribbonHome2.js?v=v93-drag-drop-perfect";
import { renderRibbonEditor } from "./ribbon/ribbonEditor.js?v=v93-drag-drop-perfect";
import { renderRibbonInsert } from "./ribbon/ribbonInsert.js?v=v93-drag-drop-perfect";
import { renderRibbonDesign } from "./ribbon/ribbonDesign.js?v=v93-drag-drop-perfect";
import { renderRibbonExport } from "./ribbon/ribbonExport.js?v=v93-drag-drop-perfect";
import { renderRibbonView } from "./ribbon/ribbonView.js?v=v93-drag-drop-perfect";
import { renderSlideThumbnails } from "./components/slideThumbnails.js?v=v93-drag-drop-perfect";
import { renderSlideCanvas } from "./components/slideCanvas.js?v=v93-drag-drop-perfect";
import { renderStatusBar } from "./components/statusBar.js?v=v93-drag-drop-perfect";
import { renderExportModalHtml } from "./components/exportModal.js?v=v93-drag-drop-perfect";
import { renderPasteModalHtml } from "./components/pasteModal.js?v=v93-drag-drop-perfect";
import { renderPptImportWizardModal } from "../pptUI.js?v=v93-drag-drop-perfect";

export function renderPptFullscreenOverlay(state) {
  const ppt = state.ppt || {};
  if (!ppt.isFullscreenOpen) return "";

  const activeTab = ppt.fsActiveTab || "home";
  const globalSettings = ppt.settings || {};
  const questions = ppt.questions && ppt.questions.length ? ppt.questions : [];
  const activeIdx = Math.max(0, Math.min(ppt.activeQuestionIndex || 0, Math.max(0, questions.length - 1)));
  const activeQ = questions[activeIdx] || {};
  const settings = getSlideSettings(globalSettings, activeQ);
  const applyScope = ppt.applyScope || "all";

  let ribbonContent = "";
  if (activeTab === "home") {
    ribbonContent = renderRibbonHome(state, settings, activeQ, activeIdx, questions.length, applyScope);
  } else if (activeTab === "design" || activeTab === "home2") {
    ribbonContent = renderRibbonHome2(state, settings, activeQ, activeIdx, questions.length, applyScope);
  } else if (activeTab === "editor") {
    ribbonContent = renderRibbonEditor(state, settings, activeQ, activeIdx, questions.length, applyScope);
  } else if (activeTab === "insert") {
    ribbonContent = renderRibbonInsert(state, settings);
  } else if (activeTab === "export") {
    ribbonContent = renderRibbonExport(state, settings, activeQ, activeIdx, questions.length);
  } else if (activeTab === "view") {
    ribbonContent = renderRibbonView(state, settings, applyScope, activeIdx);
  } else {
    ribbonContent = renderRibbonHome(state, settings, activeQ, activeIdx, questions.length, applyScope);
  }

  return `
    <div class="ppt-fullscreen-app-overlay" role="dialog" aria-modal="true" aria-label="PowerPoint Slide Editor Fullscreen">
      <!-- 1. Top Window Title Bar -->
      <header class="ppt-fs-titlebar">
        <div class="ppt-fs-title-left">
          <span class="ppt-fs-app-logo">📊</span>
          <span class="ppt-fs-app-name"><b>PowerPoint Slide Editor</b> — ${activeQ.topic || 'Maths Presentation'}</span>
        </div>
        <div class="ppt-fs-title-center">
          <span class="ppt-fs-doc-badge">${questions.length} Slides</span>
        </div>
        <div class="ppt-fs-title-right">
          <button class="ppt-fs-window-btn" data-action="ppt-close-fullscreen" title="Exit Full Screen (Esc)">✕</button>
        </div>
      </header>

      <!-- 2. Ribbon Tabs Bar -->
      <nav class="ppt-fs-ribbon-tabs">
        <button class="ppt-fs-tab-btn ${activeTab === 'home' ? 'is-active' : ''}" data-action="ppt-fs-tab" data-tab="home">Home</button>
        <button class="ppt-fs-tab-btn ${activeTab === 'design' || activeTab === 'home2' ? 'is-active' : ''}" data-action="ppt-fs-tab" data-tab="design">Design</button>
        <button class="ppt-fs-tab-btn ${activeTab === 'editor' ? 'is-active' : ''}" data-action="ppt-fs-tab" data-tab="editor">Editor</button>
        <button class="ppt-fs-tab-btn ${activeTab === 'insert' ? 'is-active' : ''}" data-action="ppt-fs-tab" data-tab="insert">Insert</button>
        <button class="ppt-fs-tab-btn ${activeTab === 'export' ? 'is-active' : ''}" data-action="ppt-fs-tab" data-tab="export">Export</button>
        <button class="ppt-fs-tab-btn ${activeTab === 'view' ? 'is-active' : ''}" data-action="ppt-fs-tab" data-tab="view">View</button>

        <!-- Highlighted Scope Checkbox: Apply ONLY to Current Slide across ALL Tabs -->
        <label class="ppt-fs-scope-toggle-highlight ${applyScope === 'current' ? 'is-current-active' : ''}" title="Check to edit ONLY Current Slide (${activeIdx + 1}). Uncheck to edit All Slides globally.">
          <input type="checkbox" data-action="ppt-toggle-global-current-scope" ${applyScope === 'current' ? 'checked' : ''} />
          <span>
            ${applyScope === 'current' ? `📌 <b>Current Slide Only (${activeIdx + 1})</b>` : `🌐 All Slides (Global)`}
          </span>
        </label>
      </nav>

      <!-- 3. Ribbon Content Toolbar -->
      <div class="ppt-fs-ribbon-container">
        ${ribbonContent}
      </div>

      <!-- 4. Main Workspace (Thumbnails Sidebar + 16:9 Slide Canvas) -->
      <div class="ppt-fs-main-workspace">
        ${renderSlideThumbnails(state)}
        ${renderSlideCanvas(state)}
      </div>

      <!-- 5. Bottom Status Bar -->
      ${renderStatusBar(state)}

      <!-- 6. Modals (Import Wizard, Paste Modal, Export Hub) -->
      ${ppt.showImportWizard ? renderPptImportWizardModal(state) : ""}
      ${ppt.isPasteModalOpen ? renderPasteModalHtml(state) : ""}
      ${ppt.isExportModalOpen ? renderExportModalHtml(state) : ""}
    </div>
  `;
}
