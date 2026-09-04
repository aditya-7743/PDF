// Fullscreen PPT Slide Workbench UI
import { getSlideSettings } from "../../pptBranch.js";
import { escapeHtml } from "./ribbon/ribbonCommon.js";
import { renderRibbonHome } from "./ribbon/ribbonHome.js";
import { renderRibbonHome2 } from "./ribbon/ribbonHome2.js";
import { renderRibbonEditor } from "./ribbon/ribbonEditor.js";
import { renderRibbonInsert } from "./ribbon/ribbonInsert.js";
import { renderRibbonDesign } from "./ribbon/ribbonDesign.js";
import { renderRibbonExport } from "./ribbon/ribbonExport.js";
import { renderRibbonView } from "./ribbon/ribbonView.js";
import { renderSlideThumbnails } from "./components/slideThumbnails.js";
import { renderSlideCanvas } from "./components/slideCanvas.js";
import { renderStatusBar } from "./components/statusBar.js";
import { renderExportModalHtml } from "./components/exportModal.js";
import { renderPasteModalHtml } from "./components/pasteModal.js";
import { renderClearStorageModalHtml } from "./components/clearStorageModal.js";
import { renderPptImportWizardModal } from "../pptUI.js";

export function renderPptFullscreenOverlay(state) {
  const ppt = state.ppt || {};

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
    ribbonContent = renderRibbonDesign(state, settings, activeQ, activeIdx, questions.length, applyScope);
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
      <!-- 1. Top Window Title Bar with Quick Access Toolbar -->
      <header class="ppt-fs-titlebar">
        <div class="ppt-fs-title-left" style="display:flex; align-items:center; gap:8px;">
          <button type="button" class="ppt-fs-home-btn" data-action="switch-mode" data-mode="home" title="Back to Home Dashboard" style="display:inline-flex; align-items:center; gap:5px; padding:3px 10px; font-size:12px; font-weight:750; background:linear-gradient(135deg, #0f8fa7, #12b39b); color:#ffffff; border:none; border-radius:5px; cursor:pointer;">
            🏠 Home
          </button>
          <span class="ppt-fs-app-logo">📊</span>
          <span class="ppt-fs-app-name"><b>PowerPoint Slide Editor</b> — ${escapeHtml(activeQ.topic || 'Maths Presentation')}</span>
          <div class="ppt-fs-quick-access" style="display:inline-flex; align-items:center; gap:4px; margin-left:12px;">
            <button type="button" class="ppt-fs-status-btn" data-action="ppt-undo" title="Undo Last Action (Ctrl+Z)" style="padding:2px 8px; font-size:12px; font-weight:700; background:rgba(255,255,255,0.15); color:#ffffff; border:1px solid rgba(255,255,255,0.3); border-radius:4px; cursor:pointer;">
              ↶ Undo
            </button>
            <button type="button" class="ppt-fs-status-btn" data-action="ppt-redo" title="Redo Next Action (Ctrl+Y)" style="padding:2px 8px; font-size:12px; font-weight:700; background:rgba(255,255,255,0.15); color:#ffffff; border:1px solid rgba(255,255,255,0.3); border-radius:4px; cursor:pointer;">
              ↷ Redo
            </button>
          </div>
        </div>
        <div class="ppt-fs-title-center">
          <span class="ppt-fs-doc-badge">${questions.length} Slides</span>
        </div>
        <div class="ppt-fs-title-right">
          <button class="ppt-fs-window-btn" data-action="switch-mode" data-mode="home" title="Back to Home (Esc)">✕</button>
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

      <!-- 6. Modals (Import Wizard, Paste Modal, Clear Storage Confirm, Export Hub) -->
      ${ppt.showImportWizard ? renderPptImportWizardModal(state) : ""}
      ${ppt.isPasteModalOpen ? renderPasteModalHtml(state) : ""}
      ${ppt.showClearStorageModal ? renderClearStorageModalHtml(state) : ""}
      ${ppt.isExportModalOpen ? renderExportModalHtml(state) : ""}
    </div>
  `;
}
