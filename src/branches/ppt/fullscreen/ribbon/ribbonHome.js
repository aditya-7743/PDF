// Fullscreen Home Ribbon Tab (Setup, Layout, Themes & Custom Background, Visibility)
import { escapeHtml } from "./ribbonCommon.js";

export function renderRibbonHome(state, settings, activeQ, activeIdx, totalSlides, applyScope) {
  return `
    <div class="ppt-fs-ribbon-panel" role="toolbar" aria-label="Home Setup Ribbon">
      <!-- 1. Document Upload (.docx file) -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; align-items:center; gap:4px;">
          <input type="file" accept=".docx,.doc" class="ppt-fs-docx-hidden-input" data-action="ppt-upload-docx" style="display:none;" />
          <button class="ppt-fs-ribbon-btn-lg" data-action="ppt-trigger-docx-upload" title="Upload Word Document (.docx) to extract questions" style="color:#58a6ff; font-weight:700;">
            <span class="ppt-fs-icon">📂</span>
            <span>Upload .DOCX</span>
          </button>
        </div>
        <div class="ppt-fs-ribbon-group-title">1. Document</div>
      </div>

      <!-- 2. Alignment & Layout Presets (kis alignment me chahiye) -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; gap:2px;">
            <button class="ppt-fs-ribbon-btn-sm ${(settings.layoutPreset || 'standard') === 'standard' ? 'is-active' : ''}" data-action="ppt-set-preset" data-preset="standard" title="Full Width Standard">Standard</button>
            <button class="ppt-fs-ribbon-btn-sm ${settings.layoutPreset === 'right-split' ? 'is-active' : ''}" data-action="ppt-set-preset" data-preset="right-split" title="Text Left, Diagram Right">Right Split</button>
            <button class="ppt-fs-ribbon-btn-sm ${settings.layoutPreset === 'left-split' ? 'is-active' : ''}" data-action="ppt-set-preset" data-preset="left-split" title="Text Right, Diagram Left">Left Split</button>
          </div>
          <div style="display:flex; gap:2px; align-items:center;">
            <span style="font-size:10px; color:#8b949e; margin-right:2px;">Align:</span>
            <button class="ppt-fs-btn-icon ${(settings.textAlign || 'left') === 'left' ? 'is-active' : ''}" data-ppt-tb-action="align-left" title="Align Left">⫷</button>
            <button class="ppt-fs-btn-icon ${settings.textAlign === 'center' ? 'is-active' : ''}" data-ppt-tb-action="align-center" title="Align Center">≡</button>
            <button class="ppt-fs-btn-icon ${settings.textAlign === 'right' ? 'is-active' : ''}" data-ppt-tb-action="align-right" title="Align Right">⫸</button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">2. Alignment</div>
      </div>

      <!-- 2b. Exam Badge -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; gap:2px;">
            <button class="ppt-fs-ribbon-btn-sm ${(settings.examTagPosition || 'below-question') === 'below-question' ? 'is-active' : ''}" data-action="ppt-set-exam-position" data-position="below-question">🎯 Below Question</button>
            <button class="ppt-fs-ribbon-btn-sm ${settings.examTagPosition === 'header' ? 'is-active' : ''}" data-action="ppt-set-exam-position" data-position="header">📌 In Header</button>
          </div>
          <div style="display:flex; gap:2px;">
            <button class="ppt-fs-ribbon-btn-sm ${(settings.examTagStyle || 'pill') === 'pill' ? 'is-active' : ''}" data-action="ppt-set-exam-style" data-style="pill">🔴 Red Pill</button>
            <button class="ppt-fs-ribbon-btn-sm ${settings.examTagStyle === 'highlight' ? 'is-active' : ''}" data-action="ppt-set-exam-style" data-style="highlight">🟡 Yellow Box</button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">Exam Badge</div>
      </div>

      <!-- 2c. Options Layout -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; gap:2px;">
            <button class="ppt-fs-ribbon-btn-sm ${(settings.optionStyle || 'card') === 'card' ? 'is-active' : ''}" data-action="ppt-set-option-style" data-style="card">🔲 Card Boxes</button>
            <button class="ppt-fs-ribbon-btn-sm ${settings.optionStyle === 'clean' ? 'is-active' : ''}" data-action="ppt-set-option-style" data-style="clean">📝 Clean (a)(b)</button>
          </div>
          <div style="display:flex; gap:2px;">
            <button class="ppt-fs-ribbon-btn-sm ${(settings.optionsLayout || '2-col') === '2-col' ? 'is-active' : ''}" data-action="ppt-set-option-layout" data-layout="2-col">2 × 2 Grid</button>
            <button class="ppt-fs-ribbon-btn-sm ${settings.optionsLayout === '1-col' ? 'is-active' : ''}" data-action="ppt-set-option-layout" data-layout="1-col">1 Column</button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">Options Layout</div>
      </div>

      <!-- 3. Predefined Themes & Custom Background Image Template -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; gap:6px; align-items:center;">
          <!-- Predefined Themes Palette -->
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:2px 3px;">
            <button class="ppt-fs-theme-pill ${settings.theme === 'maroon' && !settings.bgImage ? 'is-active' : ''}" data-action="ppt-apply-theme" data-theme-key="maroon" title="Classic SSC Maroon">
              <span class="ppt-fs-swatch" style="background:#7A0000; border:1px solid #FFD700;"></span>
              <span>Maroon</span>
            </button>
            <button class="ppt-fs-theme-pill ${settings.theme === 'navy' && !settings.bgImage ? 'is-active' : ''}" data-action="ppt-apply-theme" data-theme-key="navy" title="Royal Navy Blue">
              <span class="ppt-fs-swatch" style="background:#0A1931; border:1px solid #00E5FF;"></span>
              <span>Navy</span>
            </button>
            <button class="ppt-fs-theme-pill ${settings.theme === 'emerald' && !settings.bgImage ? 'is-active' : ''}" data-action="ppt-apply-theme" data-theme-key="emerald" title="Emerald Green">
              <span class="ppt-fs-swatch" style="background:#064E3B; border:1px solid #FDE047;"></span>
              <span>Emerald</span>
            </button>
            <button class="ppt-fs-theme-pill ${settings.theme === 'purple' && !settings.bgImage ? 'is-active' : ''}" data-action="ppt-apply-theme" data-theme-key="purple" title="Cyber Purple">
              <span class="ppt-fs-swatch" style="background:#4C1D95; border:1px solid #FDE047;"></span>
              <span>Purple</span>
            </button>
            <button class="ppt-fs-theme-pill ${settings.theme === 'dark' && !settings.bgImage ? 'is-active' : ''}" data-action="ppt-apply-theme" data-theme-key="dark" title="Dark Studio YouTube Board">
              <span class="ppt-fs-swatch" style="background:#0B0F17; border:1px solid #10B981;"></span>
              <span>Dark</span>
            </button>
            <button class="ppt-fs-theme-pill ${settings.theme === 'slate' && !settings.bgImage ? 'is-active' : ''}" data-action="ppt-apply-theme" data-theme-key="slate" title="Minimal Slate">
              <span class="ppt-fs-swatch" style="background:#1E293B; border:1px solid #38BDF8;"></span>
              <span>Slate</span>
            </button>
          </div>

          <!-- Custom Background Image Upload & Clear -->
          <div style="display:flex; flex-direction:column; gap:3px; border-left:1px dashed #30363d; padding-left:6px;">
            <button class="ppt-fs-ribbon-btn-sm ${settings.isCustomTemplateMode || (!settings.showHeader && !settings.showFooter) ? 'is-active' : ''}" data-action="ppt-unselect-theme" title="Uncheck Predefined Theme (Hides header, footer, divider so only Q.No, Question, Exam, Options remain for Custom BG)" style="color:#e3b341; font-weight:600; font-size:10px; white-space:nowrap;">
              ✨ Unselect Theme (Only Text)
            </button>
            <input type="file" accept="image/*" class="ppt-fs-bg-image-hidden-input" data-action="ppt-upload-bg-image" style="display:none;" />
            <button class="ppt-fs-ribbon-btn-sm ${settings.bgImage ? 'is-active' : ''}" data-action="ppt-trigger-bg-image-upload" title="Upload Custom 16:9 Slide Background Image (Coaching template/Watermark)" style="color:#58a6ff; font-weight:700; white-space:nowrap;">
              🖼️ Upload Custom BG
            </button>
            ${settings.bgImage ? `
              <button class="ppt-fs-ribbon-btn-sm" data-action="ppt-clear-bg-image" title="Remove Custom Background and revert to theme color" style="color:#f85149; font-size:10px;">
                🗑️ Clear BG
              </button>
            ` : `
              <span style="font-size:9px; color:#8b949e; text-align:center;">16:9 Template</span>
            `}
          </div>

          <!-- BG Alignment / Fit & Apply Scope Controls -->
          <div style="display:flex; flex-direction:column; gap:3px; border-left:1px dashed #30363d; padding-left:6px;">
            <div style="display:flex; gap:2px; align-items:center;">
              <span style="font-size:10px; color:#8b949e;">Fit:</span>
              <button class="ppt-fs-ribbon-btn-sm ${(settings.bgFit || 'stretch') === 'stretch' ? 'is-active' : ''}" data-action="ppt-set-bg-fit" data-fit="stretch" title="16:9 Full Stretch Fit (100% 100%)">16:9</button>
              <button class="ppt-fs-ribbon-btn-sm ${settings.bgFit === 'cover' ? 'is-active' : ''}" data-action="ppt-set-bg-fit" data-fit="cover" title="Cover (Maintain Aspect Ratio)">Cover</button>
              <button class="ppt-fs-ribbon-btn-sm ${settings.bgFit === 'contain' ? 'is-active' : ''}" data-action="ppt-set-bg-fit" data-fit="contain" title="Contain (Fit inside)">Contain</button>
            </div>
            <div style="display:flex; gap:2px; align-items:center;">
              <button class="ppt-fs-ribbon-btn-sm ${applyScope === 'all' ? 'is-active' : ''}" data-action="ppt-set-apply-scope" data-scope="all" title="Apply Background & Adjustments to All Slides">🌐 All</button>
              <button class="ppt-fs-ribbon-btn-sm ${applyScope === 'current' ? 'is-active' : ''}" data-action="ppt-set-apply-scope" data-scope="current" title="Apply Adjustments to Current Slide Only">📄 Current</button>
              <button class="ppt-fs-ribbon-btn-sm" data-action="ppt-apply-all" title="Apply Current Slide Background, Design & Alignments to ALL Slides" style="color:#58a6ff; font-weight:700;">⚡ Apply All</button>
            </div>

          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">3. Themes & Custom BG</div>


      </div>

      <!-- 4. Element Visibility Toggles (select kya kya chahiye - Checkboxes) -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:grid; grid-template-columns: repeat(4, auto); gap:2px 8px; font-size:11px;">
          <label class="ppt-fs-check-item" title="Toggle Top Header Bar (Uncheck if your background already has header)">
            <input type="checkbox" data-ppt-setting="showHeader" ${settings.showHeader !== false ? 'checked' : ''} />
            <span>Header</span>
          </label>
          <label class="ppt-fs-check-item" title="Toggle Q. Badge">
            <input type="checkbox" data-ppt-setting="showQBadge" ${settings.showQBadge !== false ? 'checked' : ''} />
            <span>Q.No</span>
          </label>
          <label class="ppt-fs-check-item" title="Toggle English Text">
            <input type="checkbox" data-ppt-setting="showEnglish" ${settings.showEnglish !== false ? 'checked' : ''} />
            <span>English</span>
          </label>
          <label class="ppt-fs-check-item" title="Toggle Hindi Text">
            <input type="checkbox" data-ppt-setting="showHindi" ${settings.showHindi !== false ? 'checked' : ''} />
            <span>Hindi</span>
          </label>
          <label class="ppt-fs-check-item" title="Toggle Divider Line">
            <input type="checkbox" data-ppt-setting="showDivider" ${settings.showDivider !== false ? 'checked' : ''} />
            <span>Divider</span>
          </label>
          <label class="ppt-fs-check-item" title="Toggle Exam Tag">
            <input type="checkbox" data-ppt-setting="showExamTag" ${settings.showExamTag !== false ? 'checked' : ''} />
            <span>Exam Tag</span>
          </label>
          <label class="ppt-fs-check-item" title="Toggle Options Grid">
            <input type="checkbox" data-ppt-setting="showOptions" ${settings.showOptions !== false ? 'checked' : ''} />
            <span>Options</span>
          </label>
          <label class="ppt-fs-check-item" title="Toggle Footer Bar (Uncheck if your background already has footer)">
            <input type="checkbox" data-ppt-setting="showFooter" ${settings.showFooter !== false ? 'checked' : ''} />
            <span>Footer</span>
          </label>
        </div>
        <div class="ppt-fs-ribbon-group-title">4. Visibility (Select All)</div>
      </div>
    </div>
  `;
}
