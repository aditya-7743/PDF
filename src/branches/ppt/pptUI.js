// PPT Slide Builder UI Templates
import { getSlideSettings, defaultPptSettings, pptThemes } from "../pptBranch.js";
import { renderPptFullscreenOverlay } from "./fullscreen/fullscreenUI.js";


export function getQuestionImages(q) {
  if (!q) return [];
  if (Array.isArray(q.images)) {
    q.images.forEach((img, idx) => {
      if (typeof img === "string") {
        q.images[idx] = { id: `img_${idx + 1}`, dataUrl: img, posX: 0, posY: 0, width: 360, height: 202 };
      } else if (!img.id) {
        img.id = `img_${idx + 1}`;
      }
      if (img.width === undefined) img.width = 360;
      if (img.height === undefined) img.height = 202;
      if (img.posX === undefined) img.posX = 0;
      if (img.posY === undefined) img.posY = 0;
    });
    return q.images;
  }
  if (q.image) {
    const imgObj = typeof q.image === "object"
      ? { ...q.image, id: q.image.id || "img_1", posX: q.image.posX || 0, posY: q.image.posY || 0, width: q.image.width || 360, height: q.image.height || 202 }
      : { id: "img_1", dataUrl: q.image, posX: 0, posY: 0, width: 360, height: 202 };
    q.images = [imgObj];
    delete q.image;
    return q.images;
  }
  return [];
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderPptEditorToolbar(settings = {}, activeQ = {}, applyScope = "all", activeIdx = 0, totalSlides = 1) {
  const currentFont = settings.engFontFamily || "Segoe UI, Arial, sans-serif";
  const fontSize = settings.engFontSize || 19;
  const textColor = settings.engColor || "#111111";
  const highlightColor = settings.highlightColor || "#ffeb3b";
  const hasOverrides = activeQ.settings && Object.keys(activeQ.settings).length > 0;

  return `
    <header class="ppt-panel-header ppt-editor-toolbar" role="toolbar" aria-label="PPT Formatting & LaTeX Toolbar">
      <!-- Target Scope: All Slides vs Current Slide Only -->
      <div class="ppt-tb-group ppt-tb-scope-group" style="display:flex; align-items:center; gap:2px;">
        <span style="font-size:10px; font-weight:800; color:#8b949e;">Apply:</span>
        <button class="ppt-tb-btn ppt-tb-scope-btn ${applyScope === 'all' ? 'is-active' : ''}" data-action="ppt-set-scope" data-scope="all" title="Changes (Position, Width, Layout, Font) apply to ALL slides (Global Master)">🌐 All Slides</button>
        <button class="ppt-tb-btn ppt-tb-scope-btn ${applyScope === 'current' ? 'is-active' : ''}" data-action="ppt-set-scope" data-scope="current" title="Changes apply ONLY to this slide (Q.${activeIdx + 1}) without affecting other slides">🎯 Slide ${activeIdx + 1} Only</button>
        <button class="ppt-tb-btn" data-action="ppt-apply-slide-to-all" title="Copy this slide's complete layout, positions, fonts, colors, and settings to ALL slides" style="color:#58a6ff; font-size:10px; font-weight:bold; cursor:pointer;">🚀 Apply to All</button>
        ${hasOverrides ? `
          <button class="ppt-tb-btn" data-action="ppt-reset-slide-override" title="Revert this slide back to global master defaults" style="color:#f85149; font-size:10px; cursor:pointer;">🔄 Reset</button>
        ` : ''}
      </div>

      <!-- Font Family & Font Size -->
      <div class="ppt-tb-group">
        <select class="ppt-tb-select ppt-tb-font" data-ppt-tb-action="fontFamily" title="Font Family">
          <option value="Segoe UI, Arial, sans-serif"${currentFont.includes("Segoe") ? " selected" : ""}>Segoe UI</option>
          <option value="'Mangal', 'Noto Sans Devanagari', sans-serif"${currentFont.includes("Mangal") ? " selected" : ""}>Mangal (Devanagari)</option>
          <option value="'Times New Roman', serif"${currentFont.includes("Times") ? " selected" : ""}>Times New Roman</option>
          <option value="'Cambria Math', Cambria, serif"${currentFont.includes("Cambria") ? " selected" : ""}>Cambria Math</option>
          <option value="Arial, sans-serif"${currentFont === "Arial, sans-serif" ? " selected" : ""}>Arial</option>
          <option value="'Courier New', monospace"${currentFont.includes("Courier") ? " selected" : ""}>Courier New</option>
        </select>
        <button class="ppt-tb-btn" data-ppt-tb-action="font-size-dec" title="Decrease Font Size (−)">−</button>
        <span class="ppt-tb-size-val" data-ppt-tb-size-display title="Font Size">${fontSize}px</span>
        <button class="ppt-tb-btn" data-ppt-tb-action="font-size-inc" title="Increase Font Size (+)">+</button>
      </div>

      <!-- Format: Bold, Italic, Underline, Colors -->
      <div class="ppt-tb-group">
        <button class="ppt-tb-btn" data-ppt-tb-format="bold" title="Bold (Ctrl+B)"><b>B</b></button>
        <button class="ppt-tb-btn" data-ppt-tb-format="italic" title="Italic (Ctrl+I)"><i>I</i></button>
        <button class="ppt-tb-btn" data-ppt-tb-format="underline" title="Underline (Ctrl+U)"><u>U</u></button>
        <label class="ppt-tb-color" title="Text Color">
          <span style="border-bottom:3px solid #58a6ff; line-height:1;">A</span>
          <input type="color" data-ppt-tb-color="textColor" value="${escapeHtml(textColor)}" />
        </label>
        <label class="ppt-tb-color" title="Highlight Color">
          <span style="background:#e3b341; color:#000; padding:1px 3px; border-radius:2px; font-size:10px;">H</span>
          <input type="color" data-ppt-tb-color="highlightColor" value="${escapeHtml(highlightColor)}" />
        </label>
        <button class="ppt-tb-btn" data-ppt-tb-action="clear-format" title="Clear Formatting (Tx)">Tx</button>
      </div>

      <!-- Alignment & Lists -->
      <div class="ppt-tb-group">
        <button class="ppt-tb-btn" data-ppt-tb-action="align-left" title="Align Left">⫷</button>
        <button class="ppt-tb-btn" data-ppt-tb-action="align-center" title="Align Center">≡</button>
        <button class="ppt-tb-btn" data-ppt-tb-action="align-right" title="Align Right">⫸</button>
        <button class="ppt-tb-btn" data-ppt-tb-action="bullet-list" title="Bullet List (•)">• List</button>
        <button class="ppt-tb-btn" data-ppt-tb-action="number-list" title="Numbered List (1, 2, 3)">1. List</button>
      </div>

      <!-- Quick Math & Typography Formula Palette -->
      <div class="ppt-tb-group ppt-tb-math-group">
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="²" title="Superscript 2: ²">x²</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="³" title="Superscript 3: ³">x³</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="₁" title="Subscript 1: ₁">x₁</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="₂" title="Subscript 2: ₂">x₂</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="√" title="Square Root: √">√</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="∛" title="Cube Root: ∛">∛</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="±" title="Plus-Minus: ±">±</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="×" title="Multiply: ×">×</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="÷" title="Divide: ÷">÷</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="°" title="Degree: °">°</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="π" title="Pi: π">π</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="θ" title="Theta: θ">θ</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="≈" title="Approximately: ≈">≈</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="≤" title="Less than equal: ≤">≤</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="≥" title="Greater than equal: ≥">≥</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="≠" title="Not equal: ≠">≠</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="Δ" title="Delta: Δ">Δ</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="∑" title="Summation: ∑">∑</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="∞" title="Infinity: ∞">∞</button>
      </div>

      <!-- Diagram / Image & Math Actions -->
      <div class="ppt-tb-group">
        <button class="ppt-tb-btn" data-action="ppt-trigger-image-upload" title="Paste or Upload Diagram / Graph to this slide" style="color:#58a6ff; font-weight:700;">🖼️ Add Image</button>
        <input type="file" accept="image/*" data-ppt-diagram-file-input style="display:none;" />
      </div>

      <!-- Quick Slide Navigation (Previous Slide / Next Slide Icons + New Slide) -->
      <div class="ppt-tb-group ppt-tb-nav-group" style="display:flex; align-items:center; gap:3px;">
        <button class="ppt-tb-btn ppt-tb-nav-btn" data-action="ppt-prev-slide" title="Go to Previous Slide (← / PageUp)" ${activeIdx <= 0 ? 'disabled style="opacity:0.35; cursor:not-allowed;"' : 'style="color:#58a6ff; font-weight:bold; cursor:pointer;"'}>
          ◀ Prev
        </button>
        <span class="ppt-tb-slide-counter" title="Current Slide / Total Slides" style="font-size:11px; font-weight:800; color:#c9d1d9; padding:0 6px; white-space:nowrap; background:#21262d; border-radius:4px; border:1px solid #30363d; line-height:18px;">
          ${activeIdx + 1} / ${Math.max(1, totalSlides)}
        </span>
        <button class="ppt-tb-btn ppt-tb-nav-btn" data-action="ppt-next-slide" title="Go to Next Slide (→ / PageDown)" ${activeIdx >= totalSlides - 1 ? 'disabled style="opacity:0.35; cursor:not-allowed;"' : 'style="color:#58a6ff; font-weight:bold; cursor:pointer;"'}>
          Next ▶
        </button>
        <button class="ppt-tb-btn" data-action="ppt-add-slide" title="Add New Slide (+)" style="color:#7ee787; font-weight:bold; font-size:11px; margin-left:4px; border:1px solid rgba(126,231,135,0.4); cursor:pointer;">
          + New Slide
        </button>
      </div>

      <!-- Undo / Redo & Clean Math -->
      <div class="ppt-tb-group">
        <button class="ppt-tb-btn" data-ppt-tb-action="undo" title="Undo (Ctrl+Z)">↶</button>
        <button class="ppt-tb-btn" data-ppt-tb-action="redo" title="Redo (Ctrl+Y / Ctrl+Shift+Z)">↷</button>
        <button class="ppt-tb-btn" data-ppt-tb-action="clean-math" title="Clean Math / Fix LaTeX Formats" style="color:#58a6ff;">✨ Clean</button>
      </div>
    </header>
  `;
}

export function renderPptBuilderWorkbench(state) {
  const ppt = state.ppt || {};
  const globalSettings = ppt.settings || defaultPptSettings;
  const questions = ppt.questions && ppt.questions.length ? ppt.questions : [];
  const activeIdx = Math.max(0, Math.min(ppt.activeQuestionIndex || 0, Math.max(0, questions.length - 1)));
  const activeQ = questions[activeIdx] || {
    number: "Q.1",
    exam: globalSettings.defaultExam || "SSC CGL (Shift 1)",
    topic: globalSettings.topic || "TOPIC",
    english: "",
    hindi: "",
    options: [{ key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" }]
  };

  const applyScope = ppt.applyScope || "all";
  const settings = getSlideSettings(globalSettings, activeQ);
  const hasOverrides = activeQ.settings && Object.keys(activeQ.settings).length > 0;

  const wizardHtml = ppt.showImportWizard ? renderPptImportWizardModal(state) : "";
  const examTagPos = settings.examTagPosition || "below-question";
  const examTagStyle = settings.examTagStyle || "pill";

  return `
    ${wizardHtml}
    <main class="workbench is-ppt-mode" aria-label="PPT Builder">
      <!-- LEFT PANEL: TOOLS & CUSTOMIZER -->
      <section class="ppt-panel ppt-tools-panel">
        <header class="ppt-panel-header">
          <span>🎨 PPT Customizer & Import</span>
          <span style="font-size:11px; color:#8b949e;">${questions.length} Slides</span>
        </header>
        <div class="ppt-panel-body">
          <!-- Changes Target Scope Card -->
          <div class="ppt-section" style="background:#161b22; border:1.5px solid ${applyScope === 'current' ? '#8957e5' : '#238636'}; border-radius:8px; padding:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div style="font-size:12px; font-weight:800; color:#f0f6fc;">🛠️ Changes Target:</div>
              <span style="font-size:10px; font-weight:700; color:${applyScope === 'current' ? '#d2a8ff' : '#7ee787'};">${applyScope === 'current' ? `Slide ${activeIdx + 1} Only 🎯` : 'All Slides 🌐'}</span>
            </div>
            <div class="ppt-layout-btn-group" style="margin-bottom:6px;">
              <button class="ppt-layout-btn ${applyScope === 'all' ? 'is-active' : ''}" data-action="ppt-set-scope" data-scope="all" title="Changes apply as default to ALL slides">🌐 All Slides (Master)</button>
              <button class="ppt-layout-btn ${applyScope === 'current' ? 'is-active' : ''}" data-action="ppt-set-scope" data-scope="current" title="Changes apply ONLY to this slide (Q.${activeIdx + 1})">🎯 Slide ${activeIdx + 1} Only</button>
            </div>
            <div style="font-size:10px; color:#8b949e; line-height:1.3; margin-bottom:8px;">
              ${applyScope === 'current' ? `⚡ <b>Slide ${activeIdx + 1} Fine-Tuning:</b> Custom adjustments apply only here.` : '🌍 <b>Global Master Mode:</b> Adjustments apply to all slides.'}
            </div>
            <div style="display:flex; gap:4px;">
              <button class="ppt-btn" data-action="ppt-apply-slide-to-all" style="flex:1; font-size:11px; font-weight:bold; color:#58a6ff; background:rgba(88,166,255,0.1); border-color:#58a6ff; cursor:pointer;" title="Copy this slide's complete layout, positions, fonts, colors, and settings to ALL slides">🚀 Apply Style to All Slides</button>
              ${hasOverrides ? `
                <button class="ppt-btn" data-action="ppt-reset-slide-override" style="font-size:11px; color:#f85149; cursor:pointer;" title="Revert this slide back to global master defaults">🔄 Reset</button>
              ` : ''}
            </div>
          </div>

          <!-- DOCX Upload Dropzone -->
          <div class="ppt-dropzone" data-action="ppt-browse-file">
            <div class="ppt-dropzone-icon">📄</div>
            <div class="ppt-dropzone-title">Upload Word (.docx) File</div>
            <div class="ppt-dropzone-sub">Drag & drop or click to browse (or .txt)</div>
            <input type="file" accept=".docx,.txt" data-ppt-file-input style="display:none;" />
          </div>

          <div class="ppt-quick-actions">
            <button class="ppt-btn" data-action="ppt-open-paste-box" style="flex:1;">📋 Quick Paste</button>
            <button class="ppt-btn" data-action="ppt-load-samples" style="flex:1;">✨ Load Sample</button>
          </div>

          <!-- Quick Paste Area (Collapsible) -->
          <div class="ppt-section" id="ppt-paste-container" style="display:${ppt.showPasteBox ? 'flex' : 'none'};">
            <div class="ppt-section-title">Paste Questions Text</div>
            <textarea class="ppt-textarea" data-ppt-paste-input placeholder="Paste questions here... e.g.
Q.1
English Question...
Hindi Question...
SSC CGL (Shift 1)
[A]. 100
[B]. 120
[C]. 140
[D]. 160" rows="6"></textarea>
            <div style="display:flex; gap:6px;">
              <button class="ppt-btn ppt-btn-primary" data-action="ppt-process-paste" style="flex:1;">Parse & Build</button>
              <button class="ppt-btn" data-action="ppt-close-paste-box">Cancel</button>
            </div>
          </div>

          <!-- Teaching Split & Screen Layout -->
          <div class="ppt-section">
            <div class="ppt-section-title">Teaching Screen Layout</div>
            <div class="ppt-layout-btn-group" style="margin-bottom:8px;">
              <button class="ppt-layout-btn ${(settings.layoutPreset || 'full-width') === 'right-split' ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="right-split" title="Teacher on Left, Question on Right (YouTube Math Style)">
                👨‍🏫 Right Split
              </button>
              <button class="ppt-layout-btn ${(settings.layoutPreset || 'full-width') === 'full-width' ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="full-width" title="Full Width Standard Centered">
                🖥️ Full Width
              </button>
              <button class="ppt-layout-btn ${settings.layoutPreset === 'left-split' ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="left-split" title="Question on Left, Teacher on Right">
                👩‍🏫 Left Split
              </button>
            </div>
            <div class="ppt-ctrl-row">
              <label>Whole Slide Body X (${settings.boxPosX || 0}%)</label>
              <input type="range" min="0" max="50" step="2" data-ppt-setting="boxPosX" value="${settings.boxPosX || 0}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Option Style</label>
              <div class="ppt-layout-btn-group">
                <button class="ppt-layout-btn ${(settings.optionStyle || 'card') === 'card' ? 'is-active' : ''}" data-action="ppt-set-option-style" data-style="card">🔲 Cards</button>
                <button class="ppt-layout-btn ${settings.optionStyle === 'clean' ? 'is-active' : ''}" data-action="ppt-set-option-style" data-style="clean">📝 Clean (a) (b)</button>
              </div>
            </div>
          </div>

          <!-- Individual Element Drag & Stretch Controls -->
          <div class="ppt-section">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="ppt-section-title">Free-Form Drag & Stretch</div>
              <button class="ppt-btn" data-action="ppt-reset-positions" style="font-size:10px; padding:2px 6px;" title="Reset all elements to default 0,0">🔄 Reset All</button>
            </div>
            <div class="ppt-ctrl-row">
              <label>English (X px / Y px / Width %)</label>
              <div style="display:flex; gap:3px; align-items:center;">
                <input type="number" data-ppt-setting="engPosX" value="${settings.engPosX || 0}" style="width:38px;" title="English X Offset px" />
                <input type="number" data-ppt-setting="engPosY" value="${settings.engPosY || 0}" style="width:38px;" title="English Y Offset px" />
                <input type="number" min="30" max="100" data-ppt-setting="engWidth" value="${settings.engWidth || 100}" style="width:40px;" title="English Width %" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Hindi (X px / Y px / Width %)</label>
              <div style="display:flex; gap:3px; align-items:center;">
                <input type="number" data-ppt-setting="hindiPosX" value="${settings.hindiPosX || 0}" style="width:38px;" title="Hindi X Offset px" />
                <input type="number" data-ppt-setting="hindiPosY" value="${settings.hindiPosY || 0}" style="width:38px;" title="Hindi Y Offset px" />
                <input type="number" min="30" max="100" data-ppt-setting="hindiWidth" value="${settings.hindiWidth || 100}" style="width:40px;" title="Hindi Width %" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Divider (Width % / X px)</label>
              <div style="display:flex; gap:3px; align-items:center;">
                <input type="number" min="10" max="100" data-ppt-setting="dividerWidth" value="${settings.dividerWidth || 100}" style="width:44px;" title="Divider Width %" />
                <input type="number" data-ppt-setting="dividerPosX" value="${settings.dividerPosX || 0}" style="width:38px;" title="Divider X Offset px" />
                <button class="ppt-btn" data-action="ppt-divider-match-eng" style="font-size:10px; padding:2px 5px;" title="Match English Width">Match Eng</button>
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Topic Position (X px / Y px)</label>
              <div style="display:flex; gap:3px; align-items:center;">
                <input type="number" data-ppt-setting="topicPosX" value="${settings.topicPosX || 0}" style="width:38px;" title="Topic X Offset px" />
                <input type="number" data-ppt-setting="topicPosY" value="${settings.topicPosY || 0}" style="width:38px;" title="Topic Y Offset px" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Exam Tag Pos (X px / Y px)</label>
              <div style="display:flex; gap:3px; align-items:center;">
                <input type="number" data-ppt-setting="examTagPosX" value="${settings.examTagPosX || 0}" style="width:38px;" title="Exam Tag X Offset px" />
                <input type="number" data-ppt-setting="examTagPosY" value="${settings.examTagPosY || 0}" style="width:38px;" title="Exam Tag Y Offset px" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Options (X px / Y px / Width %)</label>
              <div style="display:flex; gap:3px; align-items:center;">
                <input type="number" data-ppt-setting="optionsPosX" value="${settings.optionsPosX || 0}" style="width:38px;" title="Options X Offset px" />
                <input type="number" data-ppt-setting="optionsPosY" value="${settings.optionsPosY || 0}" style="width:38px;" title="Options Y Offset px" />
                <input type="number" min="40" max="100" data-ppt-setting="optionWidthPercent" value="${settings.optionWidthPercent || 96}" style="width:40px;" title="Options Width %" />
              </div>
            </div>
          </div>

          <!-- Exam Tag Placement & Style -->
          <div class="ppt-section">
            <div class="ppt-section-title">Exam Tag Placement & Style</div>
            <div class="ppt-ctrl-row">
              <label>Placement</label>
              <div class="ppt-layout-btn-group">
                <button class="ppt-layout-btn ${(settings.examTagPosition || 'below-question') === 'below-question' ? 'is-active' : ''}" data-action="ppt-set-exam-position" data-position="below-question" title="Below Hindi Question (SSC GD Style)">🎯 Below Q</button>
                <button class="ppt-layout-btn ${settings.examTagPosition === 'header' ? 'is-active' : ''}" data-action="ppt-set-exam-position" data-position="header" title="In Top Header">📌 Header</button>
                <button class="ppt-layout-btn ${settings.examTagPosition === 'none' ? 'is-active' : ''}" data-action="ppt-set-exam-position" data-position="none" title="Hide Exam Tag">❌ None</button>
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Badge Style</label>
              <div class="ppt-layout-btn-group">
                <button class="ppt-layout-btn ${(settings.examTagStyle || 'pill') === 'pill' ? 'is-active' : ''}" data-action="ppt-set-exam-style" data-style="pill">🔴 Pill</button>
                <button class="ppt-layout-btn ${settings.examTagStyle === 'highlight' ? 'is-active' : ''}" data-action="ppt-set-exam-style" data-style="highlight">🟡 Box</button>
                <button class="ppt-layout-btn ${settings.examTagStyle === 'text' ? 'is-active' : ''}" data-action="ppt-set-exam-style" data-style="text">📝 Plain</button>
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Tag Bg / Text Color</label>
              <div style="display:flex; gap:4px;">
                <input type="color" data-ppt-setting="examTagBg" value="${settings.examTagBg || '#DC2626'}" title="Tag Background" />
                <input type="color" data-ppt-setting="examTagColor" value="${settings.examTagColor || '#FFFFFF'}" title="Tag Text Color" />
              </div>
            </div>
          </div>

          <!-- Theme Presets -->
          <div class="ppt-section">
            <div class="ppt-section-title">Theme Presets</div>
            <div class="ppt-theme-grid">
              <button class="ppt-theme-card ${settings.theme === 'dark' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="dark">
                <span class="ppt-theme-badge" style="background:#0B0F17; border:1px solid #555;"></span>
                <span>Dark (YouTube)</span>
              </button>
              <button class="ppt-theme-card ${settings.theme === 'maroon' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="maroon">
                <span class="ppt-theme-badge" style="background:#7A0000;"></span>
                <span>SSC Maroon</span>
              </button>
              <button class="ppt-theme-card ${settings.theme === 'navy' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="navy">
                <span class="ppt-theme-badge" style="background:#0A1931;"></span>
                <span>Royal Navy</span>
              </button>
              <button class="ppt-theme-card ${settings.theme === 'emerald' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="emerald">
                <span class="ppt-theme-badge" style="background:#064E3B;"></span>
                <span>Emerald Pro</span>
              </button>
            </div>
          </div>

          <!-- Top Header Bar Settings -->
          <div class="ppt-section">
            <div class="ppt-section-title">Top Header Bar</div>
            <div class="ppt-ctrl-row">
              <label>Header Color</label>
              <input type="color" data-ppt-setting="headerBg" value="${settings.headerBg || '#7A0000'}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Header Height (${settings.headerHeight || 64}px)</label>
              <input type="range" min="48" max="92" step="2" data-ppt-setting="headerHeight" value="${settings.headerHeight || 64}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Q. Badge Bg / Text</label>
              <div style="display:flex; gap:4px;">
                <input type="color" data-ppt-setting="qBadgeBg" value="${settings.qBadgeBg || '#FFFFFF'}" title="Badge Background" />
                <input type="color" data-ppt-setting="qBadgeColor" value="${settings.qBadgeColor || '#7A0000'}" title="Badge Text Color" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Exam Text Color</label>
              <input type="color" data-ppt-setting="examColor" value="${settings.examColor || '#FFFFFF'}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Topic Color</label>
              <input type="color" data-ppt-setting="topicColor" value="${settings.topicColor || '#FFD700'}" />
            </div>
          </div>

          <!-- Questions & Text Settings -->
          <div class="ppt-section">
            <div class="ppt-section-title">Question Boundaries & Typography</div>
            <div class="ppt-ctrl-row">
              <label>Box Width (${settings.questionBoxWidth || 100}%)</label>
              <input type="range" min="70" max="100" step="2" data-ppt-setting="questionBoxWidth" value="${settings.questionBoxWidth || 100}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Box Padding (${settings.questionPadding || 16}px)</label>
              <input type="range" min="8" max="36" step="2" data-ppt-setting="questionPadding" value="${settings.questionPadding || 16}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>English Color / Size (${settings.engFontSize || 19}px)</label>
              <div style="display:flex; align-items:center; gap:6px;">
                <input type="color" data-ppt-setting="engColor" value="${settings.engColor || '#111111'}" />
                <input type="range" min="14" max="28" step="1" data-ppt-setting="engFontSize" value="${settings.engFontSize || 19}" style="width:70px;" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Hindi Color / Size (${settings.hindiFontSize || 18}px)</label>
              <div style="display:flex; align-items:center; gap:6px;">
                <input type="color" data-ppt-setting="hindiColor" value="${settings.hindiColor || '#7A0000'}" />
                <input type="range" min="14" max="28" step="1" data-ppt-setting="hindiFontSize" value="${settings.hindiFontSize || 18}" style="width:70px;" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Divider & Spacing (${settings.dividerSpacing || 6}px)</label>
              <div style="display:flex; align-items:center; gap:6px;">
                <input type="checkbox" data-ppt-setting="showDivider" ${settings.showDivider !== false ? 'checked' : ''} />
                <input type="color" data-ppt-setting="dividerColor" value="${settings.dividerColor || '#A30000'}" />
                <input type="range" min="2" max="24" step="2" data-ppt-setting="dividerSpacing" value="${settings.dividerSpacing || 6}" style="width:50px;" />
              </div>
            </div>
          </div>

          <!-- Option Cards Customizer -->
          <div class="ppt-section">
            <div class="ppt-section-title">Option Cards & Layout</div>
            <div class="ppt-ctrl-row">
              <label>Layout Mode</label>
              <div class="ppt-layout-btn-group">
                <button class="ppt-layout-btn ${(settings.optionsLayout || '2-col') === '2-col' ? 'is-active' : ''}" data-action="ppt-set-option-layout" data-layout="2-col" title="2 Columns (2 × 2 Grid)">2 × 2</button>
                <button class="ppt-layout-btn ${settings.optionsLayout === '1-col' ? 'is-active' : ''}" data-action="ppt-set-option-layout" data-layout="1-col" title="1 Column (Stacked 4 Rows)">1 Col</button>
                <button class="ppt-layout-btn ${settings.optionsLayout === '4-col' ? 'is-active' : ''}" data-action="ppt-set-option-layout" data-layout="4-col" title="4 Columns (1 Row)">4 Col</button>
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Container Width (${settings.optionWidthPercent || 96}%)</label>
              <input type="range" min="50" max="100" step="2" data-ppt-setting="optionWidthPercent" value="${settings.optionWidthPercent || 96}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Card Padding (${settings.optionCardPadding || 8}px)</label>
              <input type="range" min="4" max="24" step="2" data-ppt-setting="optionCardPadding" value="${settings.optionCardPadding || 8}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Card Gap (${settings.optionGap || 12}px)</label>
              <input type="range" min="4" max="24" step="2" data-ppt-setting="optionGap" value="${settings.optionGap || 12}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Card Bg / Border</label>
              <div style="display:flex; gap:4px;">
                <input type="color" data-ppt-setting="optionCardBg" value="${settings.optionCardBg || '#FFFFFF'}" title="Card Background" />
                <input type="color" data-ppt-setting="optionBorderColor" value="${settings.optionBorderColor || '#CBD5E1'}" title="Border Color" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Badge Bg / Text</label>
              <div style="display:flex; gap:4px;">
                <input type="color" data-ppt-setting="optionBadgeBg" value="${settings.optionBadgeBg || '#7A0000'}" title="Option Badge Background" />
                <input type="color" data-ppt-setting="optionBadgeColor" value="${settings.optionBadgeColor || '#FFFFFF'}" title="Option Badge Text Color" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Option Font Size (${settings.optionFontSize || 18}px)</label>
              <input type="range" min="10" max="32" step="1" data-ppt-setting="optionFontSize" value="${settings.optionFontSize || 18}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Option Text Color</label>
              <input type="color" data-ppt-setting="optionTextColor" value="${settings.optionTextColor || '#111111'}" />
            </div>
          </div>
        </div>
      </section>

      <!-- MIDDLE PANEL: QUESTION EDITORS & SLIDES LIST -->
      <section class="ppt-panel ppt-editor-panel">
        <header class="ppt-panel-header">
          <span>📝 Slide Content Editor</span>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="ppt-btn ppt-btn-fullscreen" data-action="ppt-open-fullscreen" title="Open Fullscreen PowerPoint Editor" style="background: linear-gradient(135deg, #1f6feb 0%, #238636 100%); border: 1.5px solid #58a6ff; color: #ffffff; font-weight: 700; box-shadow: 0 0 10px rgba(88, 166, 255, 0.45); display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; cursor: pointer;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
              <span>Full Screen</span>
            </button>
            <button class="ppt-btn" data-action="ppt-add-slide" title="Add Question Slide">+ New</button>
            <button class="ppt-btn" data-action="ppt-add-blank-slide" title="Add 100% Pure White Blank Slide" style="background:#ffffff; color:#111111; font-weight:700;">+ Blank</button>
            <button class="ppt-btn" data-action="ppt-delete-slide" title="Delete Active Slide" style="color:#f85149;">🗑️</button>
          </div>
        </header>


        <!-- Slide Selector Single-Line Horizontal Tabs Strip -->
        <div class="ppt-slide-tabs-bar ppt-q-nav-list">
          ${questions.map((q, idx) => `
            <button class="ppt-slide-tab ppt-q-nav-btn ${idx === activeIdx ? 'is-active' : ''}" data-action="ppt-select-slide" data-slide-index="${idx}">
              ${q.number || `Q.${idx + 1}`}
            </button>
          `).join("")}
        </div>

        <div class="ppt-editor-body">
          <!-- Question Meta Fields -->
          <div class="ppt-field-row">
            <div class="ppt-field-group" style="flex:1;">
              <label>Question Number</label>
              <input type="text" class="ppt-input" data-ppt-q-field="number" value="${escapeHtml(activeQ.number || `Q.${activeIdx + 1}`)}" placeholder="Q.1" />
            </div>
            <div class="ppt-field-group" style="flex:2;">
              <label>Topic Name</label>
              <input type="text" class="ppt-input" data-ppt-q-field="topic" value="${escapeHtml(activeQ.topic || settings.topic || 'TOPIC')}" placeholder="e.g. RATIO & PROPORTION" />
            </div>
          </div>

          <div class="ppt-field-group">
            <label>Exam Tag (e.g. SSC CGL 2025 Shift 1)</label>
            <input type="text" class="ppt-input" data-ppt-q-field="exam" value="${escapeHtml(activeQ.exam || settings.defaultExam || 'SSC CGL (Shift 1)')}" placeholder="e.g. SSC CGL 12/09/2025 (Shift 1)" />
          </div>

          <!-- English Question -->
          <div class="ppt-field-group">
            <label style="display:flex; justify-content:space-between;">
              <span>English Question</span>
              <span style="font-weight:normal; font-size:10px;">Latin font</span>
            </label>
            <textarea class="ppt-textarea" data-ppt-q-field="english" rows="4" placeholder="Type English question here...">${escapeHtml(activeQ.english || '')}</textarea>
          </div>

          <!-- Hindi Question -->
          <div class="ppt-field-group">
            <label style="display:flex; justify-content:space-between;">
              <span>Hindi Question</span>
              <span style="font-weight:normal; font-size:10px;">Devanagari Unicode</span>
            </label>
            <textarea class="ppt-textarea" data-ppt-q-field="hindi" rows="4" placeholder="हिंदी प्रश्न यहाँ लिखें...">${escapeHtml(activeQ.hindi || '')}</textarea>
          </div>

          <!-- Question Diagrams / Graphs Card (Supports 1, 2, 3+ Images) -->
          <div class="ppt-field-group ppt-diagram-card" style="background:#161b22; border:1px solid #30363d; border-radius:8px; padding:10px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="margin:0; font-size:11px; font-weight:700; color:#f0f6fc;">
                🖼️ Diagrams / Graphs (${getQuestionImages(activeQ).length})
              </label>
              <div style="display:flex; gap:4px;">
                <button class="ppt-btn" data-action="ppt-trigger-image-upload" style="font-size:10px; color:#58a6ff; padding:2px 6px;">+ Add Image</button>
                <button class="ppt-btn" data-action="ppt-paste-image-clipboard" style="font-size:10px; color:#7ee787; padding:2px 6px;">📋 Paste</button>
              </div>
            </div>
            ${getQuestionImages(activeQ).length > 0 ? `
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${getQuestionImages(activeQ).map((img, idx) => `
                  <div style="display:flex; gap:8px; align-items:center; background:#0d1117; border:1px solid #30363d; border-radius:6px; padding:4px 8px;">
                    <div style="width:48px; height:38px; border-radius:4px; overflow:hidden; background:#161b22; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                      <img src="${typeof img === 'string' ? img : img.dataUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" alt="Diagram ${idx + 1}" />
                    </div>
                    <div style="flex:1; font-size:11px; color:#c9d1d9;">
                      <b>Diagram ${idx + 1}</b> <span style="font-size:10px; color:#8b949e;">(${img.width || 260}px × ${img.height || 200}px)</span>
                    </div>
                    <button class="ppt-btn" data-action="ppt-remove-image" data-image-id="${img.id || `img_${idx}`}" style="font-size:10px; color:#f85149; padding:2px 6px;" title="Remove this diagram">🗑️</button>
                  </div>
                `).join("")}
                <div style="font-size:10px; color:#58a6ff; margin-top:2px;">
                  ✨ You can drag and resize each diagram independently on the slide canvas!
                </div>
              </div>
            ` : `
              <div style="display:flex; gap:6px;">
                <button class="ppt-btn" data-action="ppt-trigger-image-upload" style="flex:1; font-size:11px;">📁 Browse Diagram Image</button>
                <button class="ppt-btn" data-action="ppt-paste-image-clipboard" style="flex:1; font-size:11px;">📋 Paste Image</button>
              </div>
              <div style="font-size:10px; color:#8b949e; margin-top:4px;">
                💡 Tip: Copy any diagram/figure (or <b>Win + Shift + S</b>) and press <b>Ctrl + V</b> on this slide!
              </div>
            `}
          </div>

          <!-- Options Grid Inputs -->
          <div class="ppt-field-group">
            <label>Options (A, B, C, D)</label>
            <div class="ppt-options-grid-inputs">
              ${(activeQ.options || [{key:'A'},{key:'B'},{key:'C'},{key:'D'}]).slice(0, 4).map((opt, oIdx) => `
                <div class="ppt-option-input-box">
                  <span class="ppt-opt-badge-tag" style="background:${settings.optionBadgeBg || '#7A0000'}; color:${settings.optionBadgeColor || '#FFFFFF'};">${opt.key || String.fromCharCode(65 + oIdx)}</span>
                  <input type="text" class="ppt-opt-text-input" data-ppt-option-index="${oIdx}" value="${escapeHtml(opt.text || '')}" placeholder="Option ${opt.key || String.fromCharCode(65 + oIdx)}" />
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </section>

      <!-- RIGHT PANEL: LIVE 16:9 CANVAS PREVIEW & EXPORT -->
      <section class="ppt-panel ppt-preview-panel">
        ${renderPptEditorToolbar(settings, activeQ, applyScope, activeIdx, questions.length)}

        <div class="ppt-preview-stage">
          <!-- 16:9 SLIDE CANVAS CONTAINER -->
          ${activeQ.layout === "blank" ? `
            <div class="ppt-slide-canvas-wrapper ppt-blank-slide-canvas" style="background:#FFFFFF;">
              <!-- Spotless Clean Editable Text Area (No boxes, no dashed lines, pure white) -->
              <div class="ppt-pure-blank-canvas" contenteditable="true" spellcheck="false" data-ppt-canvas-field="english" style="width:100%; height:100%; color:#111111; font-family:${settings.engFontFamily || 'Segoe UI, Arial, sans-serif'}; font-size:${settings.engFontSize || 20}px;">${escapeHtml(activeQ.english || '')}</div>


              <!-- Slide Diagrams / Floating Images Layer if attached -->
              ${getQuestionImages(activeQ).map((img, imgIdx) => `
                <div class="canva-transform-box slide-image-container ppt-resizable-box ${imgIdx === 0 ? 'is-selected' : ''}" data-image-id="${img.id || `img_${imgIdx}`}" data-image-index="${imgIdx}" style="transform:translate(${(img.posX || 0)}px, ${(img.posY || 0)}px); width:${(img.width || 360)}px; height:${(img.height || 202)}px; z-index:${40 + imgIdx};">
                  <div class="slide-image-wrapper">
                    <img src="${typeof img === 'string' ? img : img.dataUrl}" alt="Diagram ${imgIdx + 1}" />
                  </div>
                  <button type="button" class="slide-image-delete-btn" data-action="ppt-remove-image" data-image-id="${img.id || `img_${imgIdx}`}" title="Delete Image">✕</button>
                  <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="image-resize-nw" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize"></div>
                  <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="image-resize-ne" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize"></div>
                  <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="image-resize-se" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize"></div>
                  <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="image-resize-sw" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize"></div>
                  <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="image-resize-n" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Height"></div>
                  <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="image-resize-s" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Height"></div>
                  <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="image-resize-e" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Width"></div>
                  <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="image-resize-w" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Width"></div>
                </div>
              `).join("")}
            </div>

          ` : `
          <div class="ppt-slide-canvas-wrapper" style="background:${settings.slideBg || '#FFFFFF'};">
            <!-- Top Header Bar -->
            <div class="slide-header-bar ppt-resizable-box" style="background:${settings.headerBg || '#7A0000'}; height:${settings.headerHeight || 64}px;">
              <div class="slide-q-badge" contenteditable="true" spellcheck="false" data-ppt-canvas-field="number" style="background:${settings.qBadgeBg || '#FFFFFF'}; color:${settings.qBadgeColor || '#7A0000'}; font-size:${settings.qBadgeSize || 18}px;">
                ${activeQ.numberHtml || escapeHtml(activeQ.number || `Q.${activeIdx + 1}`)}
              </div>
              <div class="slide-exam-title" contenteditable="true" spellcheck="false" data-ppt-canvas-field="exam" style="display:${examTagPos === 'header' ? 'block' : 'none'}; color:${settings.examColor || '#FFFFFF'}; font-size:${settings.examFontSize || 19}px;">
                ${activeQ.examHtml || escapeHtml(activeQ.exam || settings.defaultExam || 'SSC CGL (Shift 1)')}
              </div>
              <!-- Draggable Topic Title Box in Header -->
              <div class="slide-topic-box canva-transform-box ppt-resizable-box" style="transform:translate(${settings.topicPosX || 0}px, ${settings.topicPosY || 0}px);">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill" data-ppt-resize-type="topic-position">✥ Topic</span>
                </div>
                <div class="slide-topic-title" contenteditable="true" spellcheck="false" data-ppt-canvas-field="topic" style="color:${settings.topicColor || '#FFD700'}; font-size:${settings.topicFontSize || 20}px;">
                  ${activeQ.topicHtml || settings.topicHtml || escapeHtml((activeQ.topic || settings.topic || 'TOPIC').toUpperCase())}
                </div>
                <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="topic-resize-nw" title="Scale"></div>
                <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="topic-resize-ne" title="Scale"></div>
                <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="topic-resize-se" title="Scale"></div>
                <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="topic-resize-sw" title="Scale"></div>
              </div>
              <!-- Header Height Resize Handle -->
              <div class="ppt-resize-handle ppt-resize-handle-s" data-ppt-resize-type="header-height" title="Drag to adjust Header Height"></div>
            </div>



            <!-- Slide Body Area -->
            <div class="slide-body-content" style="padding:${settings.questionPadding || 16}px 24px; transform:translate(${settings.boxPosX || 0}%, ${settings.boxPosY || 0}px); width:${settings.questionBoxWidth || 100}%;">
              <!-- English Question with 8-Point Free-form Bounding Box -->
              <div class="canva-transform-box slide-freeform-box slide-eng-section ppt-resizable-box" style="transform:translate(${settings.engPosX || 0}px, ${settings.engPosY || 0}px); width:${settings.engWidth ? `${settings.engWidth}%` : '100%'};">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill" data-ppt-resize-type="eng-position">✥ English</span>
                </div>
                <div class="slide-eng-text" contenteditable="true" spellcheck="false" data-ppt-canvas-field="english" title="Click to edit English text directly on slide" style="color:${settings.engColor || '#111111'}; font-size:${settings.engFontSize || 19}px; font-family:${settings.engFontFamily || 'Segoe UI, Arial, sans-serif'}; text-align:${settings.textAlign || 'left'}; line-height:${settings.lineHeight || 1.36};">${activeQ.englishHtml || escapeHtml(activeQ.english || '')}</div>
                <!-- 4 Corner Circle Handles -->
                <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="eng-resize-nw" title="Resize Top-Left"></div>
                <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="eng-resize-ne" title="Resize Top-Right"></div>
                <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="eng-resize-se" title="Resize Bottom-Right"></div>
                <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="eng-resize-sw" title="Resize Bottom-Left"></div>
                <!-- 4 Side Pill Handles -->
                <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="eng-resize-n" title="Resize Top Spacing"></div>
                <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="eng-resize-s" title="Resize Bottom Spacing"></div>
                <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="eng-resize-e" title="Stretch Width Right ↔"></div>
                <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="eng-resize-w" title="Stretch Width Left ↔"></div>
              </div>

              <!-- Divider Line with Move & Width Stretch Handles -->
              <div class="canva-transform-box slide-freeform-box slide-divider-wrapper ppt-resizable-box" style="display:${settings.showDivider !== false ? 'block' : 'none'}; width:${settings.dividerWidth ? `${settings.dividerWidth}%` : '100%'}; transform:translate(${settings.dividerPosX || 0}px, ${settings.dividerPosY || 0}px); margin:${settings.dividerSpacing || 6}px 0;">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill slide-divider-drag" data-ppt-resize-type="divider-position" title="Drag to move Divider Line">✥ Divider</span>
                </div>
                <div class="slide-divider" style="border-top:${settings.dividerThickness || 2}px solid ${settings.dividerColor || '#A30000'}; width:100%;"></div>
                <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="divider-resize-e" title="Stretch Divider Right ↔"></div>
                <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="divider-resize-w" title="Stretch Divider Left ↔"></div>
              </div>

              <!-- Hindi Question with 8-Point Free-form Bounding Box -->
              <div class="canva-transform-box slide-freeform-box slide-hindi-section ppt-resizable-box" style="transform:translate(${settings.hindiPosX || 0}px, ${settings.hindiPosY || 0}px); width:${settings.hindiWidth ? `${settings.hindiWidth}%` : '100%'};">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill" data-ppt-resize-type="hindi-position">✥ Hindi</span>
                </div>
                <div class="slide-hindi-text" contenteditable="true" spellcheck="false" data-ppt-canvas-field="hindi" title="Click to edit Hindi text directly on slide" style="color:${settings.hindiColor || '#7A0000'}; font-size:${settings.hindiFontSize || 18}px; font-family:${settings.hindiFontFamily || 'Mangal, Noto Sans Devanagari, Arial, sans-serif'}; text-align:${settings.textAlign || 'left'}; line-height:${settings.lineHeight || 1.38};">${activeQ.hindiHtml || escapeHtml(activeQ.hindi || '')}</div>

                <!-- 4 Corner Circle Handles -->
                <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="hindi-resize-nw" title="Resize Top-Left"></div>
                <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="hindi-resize-ne" title="Resize Top-Right"></div>
                <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="hindi-resize-se" title="Resize Bottom-Right"></div>
                <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="hindi-resize-sw" title="Resize Bottom-Left"></div>
                <!-- 4 Side Pill Handles -->
                <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="hindi-resize-n" title="Resize Top Spacing"></div>
                <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="hindi-resize-s" title="Resize Bottom Spacing"></div>
                <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="hindi-resize-e" title="Stretch Width Right ↔"></div>
                <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="hindi-resize-w" title="Stretch Width Left ↔"></div>
              </div>

              <!-- Standalone Exam Tag Section with Free-form Drag Handle -->
              <div class="canva-transform-box slide-freeform-box slide-exam-section ppt-resizable-box" style="display:${(examTagPos === 'below-question' || examTagPos === 'above-options') ? 'inline-block' : 'none'}; transform:translate(${settings.examTagPosX || 0}px, ${settings.examTagPosY || 0}px);">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill" data-ppt-resize-type="exam-position">✥ Exam Tag</span>
                </div>
                <div class="slide-standalone-exam-tag" data-style="${examTagStyle}" contenteditable="true" spellcheck="false" data-ppt-canvas-field="exam" style="
                  background:${examTagStyle === 'pill' ? (settings.examTagBg || '#DC2626') : (examTagStyle === 'highlight' ? '#FEF08A' : 'transparent')};
                  color:${examTagStyle === 'pill' ? (settings.examTagColor || '#FFFFFF') : (examTagStyle === 'highlight' ? '#854D0E' : (settings.examColor || '#FFFFFF'))};
                  font-size:${settings.examFontSize || 15}px;
                ">
                  ${activeQ.examHtml || escapeHtml(activeQ.exam || settings.defaultExam || '(SSC GD 22 Feb., 2024 Shift III)')}
                </div>
                <!-- Handles -->
                <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="exam-resize-nw" title="Scale"></div>
                <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="exam-resize-ne" title="Scale"></div>
                <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="exam-resize-se" title="Scale"></div>
                <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="exam-resize-sw" title="Scale"></div>
                <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="exam-resize-e" title="Scale"></div>
                <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="exam-resize-w" title="Scale"></div>
              </div>

              <!-- Dynamic Uniform Options Container with Canva 8-Point Free-form Bounding Box -->
              <div class="canva-transform-box slide-freeform-box slide-options-container ppt-resizable-box" data-layout="${settings.optionsLayout || '2-col'}" data-option-style="${settings.optionStyle || 'card'}" style="width:${settings.optionWidthPercent || 96}%; gap:${settings.optionGap || 10}px; transform:translate(${settings.optionsPosX || 0}px, ${settings.optionsPosY || 0}px);">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill" data-ppt-resize-type="options-position">✥ Options Grid</span>
                </div>
                <!-- 4 Corner Circle Handles -->
                <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="options-resize-nw" title="Resize Top-Left"></div>
                <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="options-resize-ne" title="Resize Top-Right"></div>
                <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="options-resize-se" title="Resize Bottom-Right"></div>
                <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="options-resize-sw" title="Resize Bottom-Left"></div>
                <!-- 4 Side Pill Handles -->
                <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="options-resize-n" title="Resize Top Padding"></div>
                <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="options-resize-s" title="Resize Bottom Padding"></div>
                <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="options-resize-e" title="Stretch Width Right ↔"></div>
                <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="options-resize-w" title="Stretch Width Left ↔"></div>

                ${(activeQ.options || [{key:'A'},{key:'B'},{key:'C'},{key:'D'}]).slice(0, 4).map((opt, oIdx) => `
                  <div class="slide-option-box" style="
                    background:${settings.optionStyle === 'clean' ? 'transparent' : (settings.optionCardBg || '#FFFFFF')};
                    border:${settings.optionStyle === 'clean' ? 'none' : `${settings.optionCardBorderWidth || 1.5}px solid ${settings.optionBorderColor || '#CBD5E1'}`};
                    border-radius:${settings.optionCardRadius || 8}px;
                    padding:${settings.optionCardPadding || 8}px 14px;
                  ">
                    <div class="slide-opt-circle" style="background:${settings.optionStyle === 'clean' ? 'transparent' : (settings.optionBadgeBg || '#7A0000')}; color:${settings.optionStyle === 'clean' ? (settings.optionTextColor || settings.hindiColor || '#FBBF24') : (settings.optionBadgeColor || '#FFFFFF')};">
                      ${settings.optionStyle === 'clean' ? `(${(opt.key || String.fromCharCode(65 + oIdx)).toLowerCase()})` : (opt.key || String.fromCharCode(65 + oIdx))}
                    </div>
                    <div class="slide-opt-text" contenteditable="true" spellcheck="false" data-ppt-canvas-field="option" data-ppt-canvas-opt-idx="${oIdx}" title="Click to edit Option ${opt.key || String.fromCharCode(65 + oIdx)} on slide" style="color:${settings.optionTextColor || (settings.optionStyle === 'clean' && settings.theme === 'dark' ? '#FFFFFF' : '#111111')}; font-size:${settings.optionFontSize || 18}px; font-family:${settings.optionFontFamily || settings.engFontFamily || 'Segoe UI, Arial, sans-serif'}; text-align:${settings.optionAlign || 'left'};">
                      ${opt.textHtml || escapeHtml(opt.text || '')}
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Slide Diagrams / Graphs / Images Floating Layer (Support Multiple Images) -->
            ${getQuestionImages(activeQ).map((img, imgIdx) => `
              <div class="canva-transform-box slide-image-container ppt-resizable-box ${imgIdx === 0 ? 'is-selected' : ''}" data-image-id="${img.id || `img_${imgIdx}`}" data-image-index="${imgIdx}" style="transform:translate(${(img.posX || 0)}px, ${(img.posY || 0)}px); width:${(img.width || 360)}px; height:${(img.height || 202)}px; z-index:${40 + imgIdx};">
                <div class="slide-image-wrapper">
                  <img src="${typeof img === 'string' ? img : img.dataUrl}" alt="Question Diagram ${imgIdx + 1}" />
                </div>
                <button type="button" class="slide-image-delete-btn" data-action="ppt-remove-image" data-image-id="${img.id || `img_${imgIdx}`}" title="Delete Image">✕</button>
                <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="image-resize-nw" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize"></div>
                <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="image-resize-ne" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize"></div>
                <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="image-resize-se" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize"></div>
                <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="image-resize-sw" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize"></div>
                <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="image-resize-n" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Height"></div>
                <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="image-resize-s" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Height"></div>
                <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="image-resize-e" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Width"></div>
                <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="image-resize-w" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Width"></div>
              </div>
            `).join("")}


            <!-- Footer Bar (If Enabled) with Height Handle -->
            <div class="slide-footer-bar ppt-resizable-box" contenteditable="true" spellcheck="false" data-ppt-canvas-field="footer" title="Click to edit Footer on slide" style="display:${settings.showFooter !== false ? 'flex' : 'none'}; background:${settings.footerBg || '#7A0000'}; color:${settings.footerColor || '#FFFFFF'}; height:${settings.footerHeight || 28}px; font-size:${settings.footerFontSize || 13}px;">
              <div class="ppt-resize-handle ppt-resize-handle-s" style="top:-5px; bottom:auto;" data-ppt-resize-type="footer-height" title="Drag to adjust Footer Height"></div>
              ${settings.footerHtml || escapeHtml(settings.footerText || '')}
            </div>
          </div>
          `}
        </div>


        <!-- Export Actions Bar -->
        <footer class="ppt-export-bar">
          <button class="ppt-btn ppt-btn-export" data-action="ppt-export-pptx">
            📊 Export .PPTX (PowerPoint)
          </button>
          <div style="display:flex; gap:6px;">
            <button class="ppt-btn ppt-btn-pdf" data-action="ppt-export-pdf-high" title="Ultra HD 300 DPI (Best for Print & Digital Boards)">
              🖨️ PDF (Ultra HD)
            </button>
            <button class="ppt-btn" data-action="ppt-export-pdf-medium" title="Standard Full HD">
              💻 PDF (Full HD)
            </button>
            <button class="ppt-btn" data-action="ppt-export-pdf-low" title="Compressed (Best for WhatsApp / Telegram)">
              📱 PDF (Low Size)
            </button>
          </div>
        </footer>
      </section>
    </main>
    ${renderPptFullscreenOverlay(state)}
  `;
}


export function renderPptImportWizardModal(state) {
  const ppt = state.ppt || {};
  const settings = ppt.wizardSettings || ppt.settings || defaultPptSettings;
  const questions = ppt.pendingImportQuestions || ppt.questions || [];
  const qCount = questions.length;
  const previewQ = questions[0] || {
    number: "Q.1",
    exam: "SSC CGL 12/09/2025 (Shift 1)",
    topic: "RATIO & PROPORTION",
    english: "In how many years will a certain sum of money become 3.5 times itself at 14% simple interest?",
    hindi: "एक निश्चित धनराशि साधारण ब्याज की 14% दर पर कितने वर्षों में स्वयं की 3.5 गुनी हो जाएगी?",
    options: [{ key: "A", text: "15 years" }, { key: "B", text: "18 years" }, { key: "C", text: "20 years" }, { key: "D", text: "25 years" }]
  };

  const preset = settings.layoutPreset || "right-split";
  const posX = preset === "right-split" ? 42 : 0;
  const boxWidth = preset === "full-width" ? 100 : 56;

  return `
    <div class="ppt-modal-backdrop">
      <div class="ppt-wizard-modal">
        <header class="ppt-wizard-header">
          <h3>🎨 Choose Live Teaching Layout (Setup before Create)</h3>
          <button class="ppt-btn" data-action="ppt-cancel-wizard" style="padding:4px 10px;">✕ Cancel</button>
        </header>

        <div class="ppt-wizard-body">
          <!-- Left Column: Layout Presets & Styles -->
          <div style="display:flex; flex-direction:column; gap:14px;">
            <div>
              <div class="ppt-wizard-section-title">1. Select Teaching Screen Layout</div>
              <div class="ppt-wizard-preset-grid">
                <!-- Right Split -->
                <div class="ppt-preset-card ${preset === 'right-split' ? 'is-active' : ''}" data-action="ppt-wizard-set-preset" data-preset="right-split">
                  <div class="ppt-preset-icon">👨‍🏫</div>
                  <div class="ppt-preset-info">
                    <strong>Right Split (Teacher on Left)</strong>
                    <span>Best for YouTube Live / Digital Board. Left 40% open for handwritten math solutions.</span>
                  </div>
                </div>

                <!-- Full Width -->
                <div class="ppt-preset-card ${preset === 'full-width' ? 'is-active' : ''}" data-action="ppt-wizard-set-preset" data-preset="full-width">
                  <div class="ppt-preset-icon">🖥️</div>
                  <div class="ppt-preset-info">
                    <strong>Full Width Standard</strong>
                    <span>Centered 100% widescreen layout for standard slide presentations.</span>
                  </div>
                </div>

                <!-- Left Split -->
                <div class="ppt-preset-card ${preset === 'left-split' ? 'is-active' : ''}" data-action="ppt-wizard-set-preset" data-preset="left-split">
                  <div class="ppt-preset-icon">👩‍🏫</div>
                  <div class="ppt-preset-info">
                    <strong>Left Split (Teacher on Right)</strong>
                    <span>Question on left 56%, right open for writing.</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Option Visual Style -->
            <div>
              <div class="ppt-wizard-section-title">2. Option Cards Style</div>
              <div class="ppt-layout-btn-group">
                <button class="ppt-layout-btn ${(settings.optionStyle || 'clean') === 'clean' ? 'is-active' : ''}" data-action="ppt-wizard-set-option-style" data-style="clean">
                  📝 Clean Minimalist (a) (b) (Digital Board)
                </button>
                <button class="ppt-layout-btn ${settings.optionStyle === 'card' ? 'is-active' : ''}" data-action="ppt-wizard-set-option-style" data-style="card">
                  🔲 Highlighted Card Boxes [A] [B]
                </button>
              </div>
            </div>

            <!-- Theme Presets -->
            <div>
              <div class="ppt-wizard-section-title">3. Theme Palette</div>
              <div class="ppt-theme-grid">
                <button class="ppt-theme-card ${(settings.theme || 'dark') === 'dark' ? 'is-active' : ''}" data-action="ppt-wizard-set-theme" data-theme="dark">
                  <span class="ppt-theme-badge" style="background:#0B0F17; border:1px solid #555;"></span>
                  <span>Dark Board</span>
                </button>
                <button class="ppt-theme-card ${settings.theme === 'maroon' ? 'is-active' : ''}" data-action="ppt-wizard-set-theme" data-theme="maroon">
                  <span class="ppt-theme-badge" style="background:#7A0000;"></span>
                  <span>SSC Maroon</span>
                </button>
                <button class="ppt-theme-card ${settings.theme === 'navy' ? 'is-active' : ''}" data-action="ppt-wizard-set-theme" data-theme="navy">
                  <span class="ppt-theme-badge" style="background:#0A1931;"></span>
                  <span>Royal Navy</span>
                </button>
                <button class="ppt-theme-card ${settings.theme === 'emerald' ? 'is-active' : ''}" data-action="ppt-wizard-set-theme" data-theme="emerald">
                  <span class="ppt-theme-badge" style="background:#064E3B;"></span>
                  <span>Emerald Pro</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column: Live Mini Preview -->
          <div class="ppt-wizard-preview-container">
            <div class="ppt-wizard-section-title" style="display:flex; justify-content:space-between;">
              <span>Live 16:9 Preview (${qCount} questions ready)</span>
              <span style="color:#58a6ff;">${preset.toUpperCase()}</span>
            </div>

            <div class="ppt-wizard-preview-box" style="background:${settings.slideBg || '#0B0F17'};">
              <!-- Header Bar -->
              <div style="background:${settings.headerBg || '#111827'}; height:38px; display:flex; align-items:center; justify-content:space-between; padding:0 10px; flex-shrink:0;">
                <span style="background:${settings.qBadgeBg || '#E11D48'}; color:${settings.qBadgeColor || '#FFFFFF'}; font-weight:800; font-size:11px; padding:2px 8px; border-radius:12px;">Q.1</span>
                <span style="color:${settings.examColor || '#FFFFFF'}; font-weight:700; font-size:11px;">${previewQ.exam || 'SSC CGL (Shift 1)'}</span>
                <span style="color:${settings.topicColor || '#FBBF24'}; font-weight:800; font-size:11px;">${(previewQ.topic || 'TOPIC').toUpperCase()}</span>
              </div>

              <!-- Body Area -->
              <div style="padding:10px 14px; margin-left:${posX}%; max-width:${boxWidth}%; display:flex; flex-direction:column; flex:1; overflow:hidden;">
                <div style="color:${settings.engColor || '#FFFFFF'}; font-size:11px; font-weight:700; line-height:1.3; margin-bottom:4px;">
                  ${escapeHtml(previewQ.english)}
                </div>
                <div style="border-top:1.5px solid ${settings.dividerColor || '#1F2937'}; margin:3px 0;"></div>
                <div style="color:${settings.hindiColor || '#FBBF24'}; font-size:11px; font-weight:700; line-height:1.3; margin-bottom:6px;">
                  ${escapeHtml(previewQ.hindi)}
                </div>

                <!-- Options -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:auto;">
                  ${previewQ.options.slice(0, 4).map((opt, i) => `
                    <div style="
                      background:${settings.optionStyle === 'card' ? (settings.optionCardBg || '#1F2937') : 'transparent'};
                      border:${settings.optionStyle === 'card' ? `1px solid ${settings.optionBorderColor || '#374151'}` : 'none'};
                      border-radius:4px; padding:3px 6px; display:flex; align-items:center; gap:4px;
                    ">
                      <span style="font-size:10px; font-weight:800; color:${settings.optionStyle === 'card' ? (settings.optionBadgeColor || '#FFFFFF') : (settings.optionTextColor || '#FBBF24')};">
                        ${settings.optionStyle === 'card' ? opt.key : `(${opt.key.toLowerCase()})`}
                      </span>
                      <span style="font-size:10px; font-weight:700; color:${settings.optionTextColor || '#FFFFFF'};">${opt.text}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>

            <div style="font-size:11px; color:#8b949e; line-height:1.4;">
              💡 <b>Tip:</b> Layout apply hone ke baad aap live canvas par bhi kisi bhi box ko freely mouse se drag/resize kar sakte hain.
            </div>
          </div>
        </div>

        <footer class="ppt-wizard-footer">
          <button class="ppt-btn" data-action="ppt-cancel-wizard">Cancel</button>
          <button class="ppt-btn ppt-btn-primary" data-action="ppt-confirm-wizard-generate" style="padding:8px 24px; font-size:13px; font-weight:700;">
            🚀 Apply & Generate ${qCount} Slides
          </button>
        </footer>
      </div>
    </div>
  `;
}
