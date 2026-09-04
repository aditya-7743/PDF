// Fullscreen Home Ribbon Tab (Clear Data, Background/Themes, Slide Elements Checkboxes, Layouts, and Docx/Paste at the end)
import { escapeHtml } from "./ribbonCommon.js";

export function renderRibbonHome(state, settings, activeQ, activeIdx, totalSlides, applyScope) {
  const currentOptionsLayout = settings.optionsLayout || "2-col";
  const isSideSplit = settings.layoutPreset === "right-split" || (activeQ.layout === "right-split");
  const currentTheme = settings.theme || "maroon";
  const optionStyle = settings.optionStyle || "card";
  const engFontSize = settings.engFontSize || 19;
  const hindiFontSize = settings.hindiFontSize || 18;
  const optionFontSize = settings.optionFontSize || 18;

  return `
    <div class="ppt-fs-ribbon-panel" role="toolbar" aria-label="Home Setup Ribbon">
      <!-- 0. Reset & Clear Group (First) -->
      <div class="ppt-fs-ribbon-group" style="border-right: 1.5px solid #ef4444;">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px; justify-content:center;">
          <button type="button" class="ppt-fs-ribbon-btn-sm ppt-btn-danger" data-action="ppt-open-clear-modal" title="Clear all slides and local storage with double confirmation pop-up" style="background:#dc2626; color:#ffffff; font-weight:700; border-radius:4px; padding:3px 8px; border:none; cursor:pointer;">
            <span>🗑️ Clear All Data</span>
          </button>
          <div style="display:flex; gap:3px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-undo" title="Undo (Ctrl+Z)" style="flex:1;">
              <span>↶ Undo</span>
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-redo" title="Redo (Ctrl+Y)" style="flex:1;">
              <span>↷ Redo</span>
            </button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title" style="color:#f87171; font-weight:700;">Reset & History</div>
      </div>

      <!-- 1. Background & Themes (Predefined & Custom Upload) -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <!-- Pre-defined Theme Quick Pills -->
          <div style="display:flex; gap:3px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentTheme === 'dark' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="dark" title="Dark YouTube Board (#0B0F17)">
              ⬛ Dark
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentTheme === 'maroon' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="maroon" title="Classic SSC Maroon (#7A0000)">
              🟥 Maroon
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentTheme === 'navy' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="navy" title="Royal Navy Blue (#0A1931)">
              🟦 Navy
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentTheme === 'emerald' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="emerald" title="Emerald Green (#064E3B)">
              🟩 Emerald
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentTheme === 'purple' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="purple" title="Cyber Purple (#4C1D95)">
              🟪 Purple
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentTheme === 'slate' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="slate" title="Minimal Slate (#1E293B)">
              ⬛ Slate
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentTheme === 'light' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="light" title="Pure Clean White (#FFFFFF)">
              ⬜ White
            </button>
          </div>

          <!-- Custom BG Upload & Clear Buttons -->
          <div style="display:flex; align-items:center; gap:3px;">
            <input type="file" accept="image/*" class="ppt-fs-bg-hidden-input" data-action="ppt-upload-bg-image" style="display:none;" />
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-trigger-bg-upload" title="Upload Custom Slide Wallpaper / Background Image">
              🖼️ Upload BG
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-clear-bg-image" title="Remove Background Image" style="color:#ef4444;">
              🗑️ Clear BG
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-apply-text-only-template" title="Make Background Spotless Clean Text-Only (Hide Banner)">
              ✨ Text Only
            </button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">1. Background & Themes</div>
      </div>

      <!-- 2. Topic & Header Settings -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px; justify-content:center;">
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:10px; font-weight:700; color:#475569; width:44px;">Topic:</span>
            <input type="text" 
                   class="ppt-fs-topic-ribbon-input" 
                   data-ppt-ribbon-topic
                   value="${escapeHtml(activeQ.topic || settings.topic || '')}" 
                   placeholder="PROFIT & LOSS / लाभ और हानि" 
                   title="Type Topic Name here" 
                   style="padding:3px 6px; font-size:11px; font-weight:700; border:1.5px solid #94a3b8; border-radius:4px; width:170px; background:#ffffff; color:#0f172a; outline:none; text-transform:uppercase;" />
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:10px; font-weight:700; color:#475569; width:44px;">Teacher:</span>
            <input type="text" 
                   data-ppt-setting="subtitleText"
                   value="${escapeHtml(settings.subtitleText || '')}" 
                   placeholder="e.g. BY ADITYA SIR" 
                   title="Teacher Name / Subtitle badge in Header" 
                   style="padding:3px 6px; font-size:11px; font-weight:700; border:1px solid #94a3b8; border-radius:4px; width:170px; background:#ffffff; color:#0f172a; outline:none;" />
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">2. Topic & Teacher</div>
      </div>

      <!-- 3. Add Slide Elements (Dynamic Stack Layout) -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px; justify-content:center;">
          <div style="display:flex; gap:3px; align-items:center;">
            <button type="button" class="ppt-fs-ribbon-btn-sm ${settings.showHeader ? 'is-active' : ''}" data-action="ppt-add-layout-element" data-element="header" title="Add / Toggle Header Bar">
              <span>${settings.showHeader ? '✓' : '+'} Header</span>
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${settings.showQBadge ? 'is-active' : ''}" data-action="ppt-add-layout-element" data-element="qbadge" title="Add / Toggle Question Number (Q.1)">
              <span>${settings.showQBadge ? '✓' : '+'} Q.No</span>
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${settings.showEnglish ? 'is-active' : ''}" data-action="ppt-add-layout-element" data-element="english" title="Add English Question Box below">
              <span>${settings.showEnglish ? '✓' : '+'} English</span>
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${settings.showHindi ? 'is-active' : ''}" data-action="ppt-add-layout-element" data-element="hindi" title="Add Hindi Question Box below">
              <span>${settings.showHindi ? '✓' : '+'} Hindi</span>
            </button>
          </div>

          <div style="display:flex; gap:3px; align-items:center;">
            <button type="button" class="ppt-fs-ribbon-btn-sm ${settings.showDivider ? 'is-active' : ''}" data-action="ppt-add-layout-element" data-element="divider" title="Add Divider Line below">
              <span>${settings.showDivider ? '✓' : '+'} Divider</span>
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${settings.showExamTag ? 'is-active' : ''}" data-action="ppt-add-layout-element" data-element="exam" title="Add Exam Shift Tag below">
              <span>${settings.showExamTag ? '✓' : '+'} Exam Tag</span>
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${settings.showOptions ? 'is-active' : ''}" data-action="ppt-add-layout-element" data-element="options" title="Add Options Grid (A, B, C, D) below">
              <span>${settings.showOptions ? '✓' : '+'} Options</span>
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${settings.showFooter ? 'is-active' : ''}" data-action="ppt-add-layout-element" data-element="footer" title="Add / Toggle Footer Bar">
              <span>${settings.showFooter ? '✓' : '+'} Footer</span>
            </button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title" style="color:#2563eb; font-weight:700;">3. + Add Elements</div>
      </div>

      <!-- 4. Text & Font Sizes Group (Dedicated between Add Elements and Options Layout) -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px; justify-content:center;">
          <!-- Top Row: English & Hindi Sizes -->
          <div style="display:flex; align-items:center; gap:5px;">
            <label style="display:flex; align-items:center; gap:2px; font-size:10px; font-weight:700; color:#334155; cursor:pointer;" title="English Question Font Size">
              <span>Eng:</span>
              <input type="number" class="ppt-fs-input-num" data-ppt-setting="engFontSize" value="${engFontSize}" min="12" max="42" style="width:36px; text-align:center; padding:1px 2px;" />
            </label>
            <label style="display:flex; align-items:center; gap:2px; font-size:10px; font-weight:700; color:#334155; cursor:pointer;" title="Hindi Question Font Size">
              <span>हिंदी:</span>
              <input type="number" class="ppt-fs-input-num" data-ppt-setting="hindiFontSize" value="${hindiFontSize}" min="12" max="42" style="width:36px; text-align:center; padding:1px 2px;" />
            </label>
          </div>
          <!-- Bottom Row: Option & Exam Sizes -->
          <div style="display:flex; align-items:center; gap:5px;">
            <label style="display:flex; align-items:center; gap:2px; font-size:10px; font-weight:700; color:#334155; cursor:pointer;" title="Option Text Font Size">
              <span>Opt:</span>
              <input type="number" class="ppt-fs-input-num" data-ppt-setting="optionFontSize" value="${optionFontSize}" min="12" max="42" style="width:36px; text-align:center; padding:1px 2px;" />
            </label>
            <label style="display:flex; align-items:center; gap:2px; font-size:10px; font-weight:700; color:#334155; cursor:pointer;" title="Exam Tag Font Size">
              <span>Exam:</span>
              <input type="number" class="ppt-fs-input-num" data-ppt-setting="examFontSize" value="${settings.examFontSize || 15}" min="10" max="32" style="width:36px; text-align:center; padding:1px 2px;" />
            </label>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">4. Font Sizes</div>
      </div>

      <!-- 5. Question & Options Layout (Layout Selector) -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <!-- Layout Presets Row -->
          <div style="display:flex; gap:2px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm ${isSideSplit ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="right-split" title="Side-by-Side: Question Left, Options/Diagram Right">
              <span>◫ Side-Split</span>
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${(!isSideSplit && currentOptionsLayout === '2-col') ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="standard" title="Top-Bottom: Question on Top, 2x2 Options below">
              <span>⊞ 2x2 Grid</span>
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${(!isSideSplit && currentOptionsLayout === '1-col') ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="stacked" title="1-Column: Vertical Stack A-B-C-D">
              <span>☰ 1-Column</span>
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${(!isSideSplit && currentOptionsLayout === '4-col') ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="4-col" title="4-In-Line: Single Horizontal Line (A, B, C, D in 1 Row)">
              <span>⋯ 4-In-Line</span>
            </button>
          </div>

          <!-- Option Style Row -->
          <div style="display:flex; align-items:center; gap:4px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm ${optionStyle === 'clean' ? 'is-active' : ''}" data-action="ppt-set-option-style" data-style="clean" title="Clean (a)(b)(c)(d) Text">
              (a) Clean
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${optionStyle === 'card' ? 'is-active' : ''}" data-action="ppt-set-option-style" data-style="card" title="Card Boxes [A][B][C][D]">
              [A] Cards
            </button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">5. Question & Options Layout</div>
      </div>

      <!-- 6. Document Upload (.docx / .txt) & Paste Text (LAST ME) -->
      <div class="ppt-fs-ribbon-group" style="background:#f8fafc; border-left:1.5px solid #3b82f6;">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; align-items:center; gap:4px;">
          <input type="file" accept=".docx,.doc,.txt" class="ppt-fs-docx-hidden-input" data-action="ppt-upload-docx" style="display:none;" />
          <button type="button" class="ppt-fs-ribbon-btn-lg" data-action="ppt-trigger-docx-upload" title="Upload Word Document (.docx) to extract questions automatically">
            <span class="ppt-fs-icon">📂</span>
            <span>Upload .DOCX</span>
          </button>
          <button type="button" class="ppt-fs-ribbon-btn-lg" data-action="ppt-open-paste-modal" title="Paste Raw Question Text to generate slides directly">
            <span class="ppt-fs-icon">📋</span>
            <span>Paste Text</span>
          </button>
          <div style="display:flex; flex-direction:column; gap:2px; margin-left:2px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-add-blank-slide" title="Add New Empty Slide">
              <span>+ New Slide</span>
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-remove-question" data-index="${activeIdx}" title="Delete Current Slide" style="color:#ef4444;">
              <span>🗑️ Delete</span>
            </button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title" style="color:#2563eb; font-weight:700;">6. Docx & Paste</div>
      </div>
    </div>
  `;
}

