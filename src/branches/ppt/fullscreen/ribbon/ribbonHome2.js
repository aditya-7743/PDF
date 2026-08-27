// Fullscreen Home 2 Ribbon Tab (Colors, Exam Tag, Questions, Options, Footer)
import { escapeHtml } from "./ribbonCommon.js";

export function renderRibbonHome2(state, settings, activeQ, activeIdx, totalSlides, applyScope) {
  const engFontSize = settings.engFontSize || 19;
  const hindiFontSize = settings.hindiFontSize || 18;
  const optionFontSize = settings.optionFontSize || 18;
  const boxWidth = settings.questionBoxWidth || 100;
  const isAllScope = (applyScope !== "current");

  return `
    <div class="ppt-fs-ribbon-panel" role="toolbar" aria-label="Home 2 Customizer Ribbon">
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

      <!-- 1. Colours for Everything (Color Pickers) -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:grid; grid-template-columns: repeat(5, auto); gap:3px 6px; font-size:11px; align-items:center;">
          <!-- Row 1 -->
          <label class="ppt-fs-color-cell" title="Slide Canvas Background Color">
            <span>Slide Bg:</span>
            <input type="color" data-ppt-setting="slideBg" value="${escapeHtml(settings.slideBg || '#FFFFFF')}" />
          </label>
          <label class="ppt-fs-color-cell" title="English Question Text Color">
            <span>Eng Text:</span>
            <input type="color" data-ppt-setting="engColor" value="${escapeHtml(settings.engColor || '#111111')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Hindi Question Text Color">
            <span>Hindi:</span>
            <input type="color" data-ppt-setting="hindiColor" value="${escapeHtml(settings.hindiColor || '#7A0000')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Exam Tag Background Color">
            <span>Exam Bg:</span>
            <input type="color" data-ppt-setting="examTagBg" value="${escapeHtml(settings.examTagBg || '#DC2626')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Exam Tag Text Color">
            <span>Exam Text:</span>
            <input type="color" data-ppt-setting="examTagColor" value="${escapeHtml(settings.examTagColor || '#FFFFFF')}" />
          </label>

          <!-- Row 2 -->
          <label class="ppt-fs-color-cell" title="Option Text Color (Answers text)">
            <span>Opt Text:</span>
            <input type="color" data-ppt-setting="optionTextColor" value="${escapeHtml(settings.optionTextColor || '#111111')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Option Box / Card Background Color">
            <span>Opt Box:</span>
            <input type="color" data-ppt-setting="optionCardBg" value="${escapeHtml(settings.optionCardBg || '#FFFFFF')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Option Box Border Color">
            <span>Opt Border:</span>
            <input type="color" data-ppt-setting="optionCardBorder" value="${escapeHtml(settings.optionCardBorder || '#CBD5E1')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Option Badge (A, B, C, D) Circle Color">
            <span>Opt Badge:</span>
            <input type="color" data-ppt-setting="optionBadgeBg" value="${escapeHtml(settings.optionBadgeBg || '#7A0000')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Divider Line Color">
            <span>Divider:</span>
            <input type="color" data-ppt-setting="dividerColor" value="${escapeHtml(settings.dividerColor || '#A30000')}" />
          </label>
        </div>
        <div class="ppt-fs-ribbon-group-title">1. Colors for Everything</div>
      </div>


      <!-- 2. Exam Badge Group -->
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

      <!-- 3. Question Settings Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; align-items:center; gap:3px;">
            <span style="font-size:10px; font-weight:600; color:#475569;">Eng Size:</span>
            <input type="number" class="ppt-fs-input-num" data-ppt-setting="engFontSize" value="${engFontSize}" min="12" max="36" style="width:42px;" />
            <span style="font-size:10px; font-weight:600; color:#475569; margin-left:3px;">Hindi:</span>
            <input type="number" class="ppt-fs-input-num" data-ppt-setting="hindiFontSize" value="${hindiFontSize}" min="12" max="36" style="width:42px;" />
          </div>
          <div style="display:flex; align-items:center; gap:3px;">
            <span style="font-size:10px; font-weight:600; color:#475569;">Box Width:</span>
            <input type="range" data-ppt-setting="questionBoxWidth" min="40" max="100" value="${boxWidth}" style="width:75px; accent-color:#2563eb;" />
            <span style="font-size:10px; font-weight:700; color:#0f172a;">${boxWidth}%</span>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">Question Settings</div>
      </div>

      <!-- 4. Options Layout Group -->
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

      <!-- 5. Options Size & Gap Controls -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; align-items:center; gap:3px;">
            <span style="font-size:10px; font-weight:600; color:#475569;" title="Card Gap between options">Gap:</span>
            <input type="number" class="ppt-fs-input-num" data-ppt-setting="optionGap" value="${settings.optionGap !== undefined ? settings.optionGap : 10}" min="0" max="40" step="1" style="width:38px; text-align:center;" title="Option Gap (px)" />
            <span style="font-size:10px; font-weight:600; color:#475569; margin-left:3px;" title="Box Height / Vertical Padding">Size:</span>
            <input type="number" class="ppt-fs-input-num" data-ppt-setting="optionCardPadding" value="${settings.optionCardPadding !== undefined ? settings.optionCardPadding : 8}" min="2" max="30" step="1" style="width:38px; text-align:center;" title="Box Size / Padding (px)" />
          </div>
          <div style="display:flex; align-items:center; gap:3px;">
            <span style="font-size:10px; font-weight:600; color:#475569;" title="Corner Radius / Roundness">Radius:</span>
            <input type="number" class="ppt-fs-input-num" data-ppt-setting="optionCardRadius" value="${settings.optionCardRadius !== undefined ? settings.optionCardRadius : 8}" min="0" max="30" step="1" style="width:38px; text-align:center;" title="Corner Radius (px)" />
            <span style="font-size:10px; font-weight:600; color:#475569; margin-left:3px;" title="Overall Width %">Width:</span>
            <input type="range" data-ppt-setting="optionWidthPercent" min="50" max="100" value="${settings.optionWidthPercent || 96}" style="width:52px; accent-color:#2563eb;" title="Width (%)" />
            <span style="font-size:10px; font-weight:700; color:#0f172a;">${settings.optionWidthPercent || 96}%</span>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">Options Size & Gap</div>
      </div>

      <!-- 6. Footer Bar Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; align-items:center; gap:3px;">
            <input type="text" class="ppt-fs-input-text" data-ppt-setting="footerText" value="${escapeHtml(settings.footerText || 'Maths by Aditya | Telegram: @YourChannel')}" placeholder="Footer text..." style="width:160px; font-size:11px;" />
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <label class="ppt-fs-color-cell" title="Footer Background Color">
              <span>Bg:</span>
              <input type="color" data-ppt-setting="footerBg" value="${escapeHtml(settings.footerBg || '#7A0000')}" />
            </label>
            <label class="ppt-fs-color-cell" title="Footer Text Color">
              <span>Text:</span>
              <input type="color" data-ppt-setting="footerColor" value="${escapeHtml(settings.footerColor || '#FFFFFF')}" />
            </label>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">6. Footer Bar</div>
      </div>
    </div>
  `;
}
