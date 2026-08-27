// Fullscreen Home Ribbon Tab (Setup, Layout, Themes & Custom Background, Visibility)
import { escapeHtml } from "./ribbonCommon.js";

export function renderRibbonHome(state, settings, activeQ, activeIdx, totalSlides, applyScope) {
  return `
    <div class="ppt-fs-ribbon-panel" role="toolbar" aria-label="Home Setup Ribbon">
      <!-- 0. Undo / Redo History Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-undo" title="Undo (Ctrl+Z)">
            <span>↶ Undo</span>
          </button>
          <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-redo" title="Redo (Ctrl+Y)">
            <span>↷ Redo</span>
          </button>
        </div>
        <div class="ppt-fs-ribbon-group-title">History</div>
      </div>

      <!-- 1. Document Upload (.docx file) & Quick Paste -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; align-items:center; gap:6px;">
          <input type="file" accept=".docx,.doc,.txt" class="ppt-fs-docx-hidden-input" data-action="ppt-upload-docx" style="display:none;" />
          <button class="ppt-fs-ribbon-btn-lg" data-action="ppt-trigger-docx-upload" title="Upload Word Document (.docx) to extract questions">
            <span class="ppt-fs-icon">📂</span>
            <span>Upload .DOCX</span>
          </button>
          <button class="ppt-fs-ribbon-btn-lg" data-action="ppt-open-paste-modal" title="Paste Raw Question Text to generate slides directly">
            <span class="ppt-fs-icon">📋</span>
            <span>Paste Text</span>
          </button>
        </div>
        <div class="ppt-fs-ribbon-group-title">1. Document & Paste</div>
      </div>



      <!-- 2. Topic Name Section -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:4px; justify-content:center; height:100%;">
          <div style="display:flex; gap:3px; align-items:center;">
            <input type="text" 
                   class="ppt-fs-topic-ribbon-input" 
                   data-ppt-ribbon-topic
                   value="${escapeHtml(activeQ.topic || settings.topic || '')}" 
                   placeholder="Enter Topic Name..." 
                   title="Type Topic Name here" 
                   style="padding:5px 8px; font-size:12px; font-weight:700; border:1.5px solid #94a3b8; border-radius:6px; width:220px; background:#ffffff; color:#0f172a; outline:none; text-transform:uppercase;" />
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">2. Topic Name</div>
      </div>

      <!-- 3. Predefined Themes & Custom Background Image Template -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; gap:6px; align-items:center;">
          <!-- Predefined Themes Palette -->
          <div style="display:grid; grid-template-columns: repeat(3, auto); gap:2px 3px;">
            <button class="ppt-fs-theme-pill ${settings.theme === 'maroon' && !settings.bgImage ? 'is-active' : ''}" data-action="ppt-apply-theme" data-theme-key="maroon" title="Classic SSC Maroon">
              <span class="ppt-fs-swatch" style="background:#7A0000;"></span>
              <span>Maroon</span>
            </button>
            <button class="ppt-fs-theme-pill ${settings.theme === 'navy' && !settings.bgImage ? 'is-active' : ''}" data-action="ppt-apply-theme" data-theme-key="navy" title="Royal Navy Blue">
              <span class="ppt-fs-swatch" style="background:#0A1931;"></span>
              <span>Navy</span>
            </button>
            <button class="ppt-fs-theme-pill ${settings.theme === 'emerald' && !settings.bgImage ? 'is-active' : ''}" data-action="ppt-apply-theme" data-theme-key="emerald" title="Emerald Green">
              <span class="ppt-fs-swatch" style="background:#064E3B;"></span>
              <span>Emerald</span>
            </button>
            <button class="ppt-fs-theme-pill ${settings.theme === 'purple' && !settings.bgImage ? 'is-active' : ''}" data-action="ppt-apply-theme" data-theme-key="purple" title="Cyber Purple">
              <span class="ppt-fs-swatch" style="background:#4C1D95;"></span>
              <span>Purple</span>
            </button>
            <button class="ppt-fs-theme-pill ${settings.theme === 'dark' && !settings.bgImage ? 'is-active' : ''}" data-action="ppt-apply-theme" data-theme-key="dark" title="Dark Studio YouTube Board">
              <span class="ppt-fs-swatch" style="background:#0B0F17;"></span>
              <span>Dark</span>
            </button>
            <button class="ppt-fs-theme-pill ${settings.theme === 'slate' && !settings.bgImage ? 'is-active' : ''}" data-action="ppt-apply-theme" data-theme-key="slate" title="Minimal Slate">
              <span class="ppt-fs-swatch" style="background:#1E293B;"></span>
              <span>Slate</span>
            </button>
          </div>

          <!-- Custom Background Image Upload & Clear -->
          <div style="display:flex; flex-direction:column; gap:3px; border-left:1.5px solid #000000; padding-left:6px;">
            <button class="ppt-fs-ribbon-btn-sm ${settings.isCustomTemplateMode || (!settings.showHeader && !settings.showFooter) ? 'is-active' : ''}" data-action="ppt-unselect-theme" title="Uncheck Predefined Theme (Hides header, footer, divider for Custom BG)">
              ✨ Text Only
            </button>
            <div style="display:flex; gap:2px;">
              <input type="file" accept="image/*" class="ppt-fs-bg-image-hidden-input" data-action="ppt-upload-bg-image" style="display:none;" />
              <button class="ppt-fs-ribbon-btn-sm ${settings.bgImage ? 'is-active' : ''}" data-action="ppt-trigger-bg-image-upload" title="Upload Custom BG">
                🖼️ Upload BG
              </button>
              ${settings.bgImage ? `
                <button class="ppt-fs-ribbon-btn-sm" data-action="ppt-clear-bg-image" title="Clear BG">
                  🗑️
                </button>
              ` : ''}
            </div>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">3. Themes & Custom BG</div>
      </div>

      <!-- 4. Element Visibility Toggles (Checkboxes) -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:grid; grid-template-columns: repeat(4, auto); gap:2px 8px; font-size:11px;">
          <label class="ppt-fs-check-item" title="Toggle Top Header Bar">
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
          <label class="ppt-fs-check-item" title="Toggle Footer Bar">
            <input type="checkbox" data-ppt-setting="showFooter" ${settings.showFooter !== false ? 'checked' : ''} />
            <span>Footer</span>
          </label>
        </div>
        <div class="ppt-fs-ribbon-group-title">4. Visibility</div>
      </div>
    </div>
  `;
}
