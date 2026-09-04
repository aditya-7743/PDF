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

export function renderPptBuilderWorkbench(state) {
  return renderPptFullscreenOverlay(state);
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
