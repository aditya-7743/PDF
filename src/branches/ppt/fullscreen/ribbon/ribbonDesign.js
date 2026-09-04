// Fullscreen Design Ribbon Tab (Complete Colors for Everything, Exam Badge Design & Typography)
import { escapeHtml } from "./ribbonCommon.js";

export function renderRibbonDesign(state, settings, activeQ, activeIdx, totalSlides, applyScope) {
  const hindiFontFamily = settings.hindiFontFamily || "Mukta, Segoe UI, sans-serif";
  const engFontFamily = settings.engFontFamily || "Segoe UI, Arial, sans-serif";
  const footerText = settings.footerText !== undefined ? settings.footerText : "MAGADH EDUCATION | Telegram: @magadheducation";

  return `
    <div class="ppt-fs-ribbon-panel" role="toolbar" aria-label="Design Ribbon">
      <!-- 1. Complete Colours for Every Single Element (Har Cheez Ka Colour) -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:grid; grid-template-columns: repeat(7, auto); gap:2px 6px; font-size:10.5px; align-items:center;">
          <!-- Row 1: Canvas, Header, Questions, Divider -->
          <label class="ppt-fs-color-cell" title="Slide Canvas Background Color">
            <span>Slide Bg:</span>
            <input type="color" data-ppt-setting="slideBg" value="${escapeHtml(settings.slideBg || '#FFFFFF')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Top Header Bar Background Color">
            <span>Header Bg:</span>
            <input type="color" data-ppt-setting="headerBg" value="${escapeHtml(settings.headerBg || '#7A0000')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Header Topic & Teacher Text Color">
            <span>Topic Text:</span>
            <input type="color" data-ppt-setting="topicColor" value="${escapeHtml(settings.topicColor || '#FFD700')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Hindi Question Text Color">
            <span>Hindi Text:</span>
            <input type="color" data-ppt-setting="hindiColor" value="${escapeHtml(settings.hindiColor || '#7A0000')}" />
          </label>
          <label class="ppt-fs-color-cell" title="English Question Text Color">
            <span>Eng Text:</span>
            <input type="color" data-ppt-setting="engColor" value="${escapeHtml(settings.engColor || '#111111')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Exam / Shift Tag Background Color">
            <span>Exam Bg:</span>
            <input type="color" data-ppt-setting="examTagBg" value="${escapeHtml(settings.examTagBg || '#DC2626')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Exam / Shift Tag Text Color">
            <span>Exam Text:</span>
            <input type="color" data-ppt-setting="examTagColor" value="${escapeHtml(settings.examTagColor || '#FFFFFF')}" />
          </label>

          <!-- Row 2: Options, Divider, Footer -->
          <label class="ppt-fs-color-cell" title="Option Answers Text Color">
            <span>Opt Text:</span>
            <input type="color" data-ppt-setting="optionTextColor" value="${escapeHtml(settings.optionTextColor || '#111111')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Option Box / Card Background Color">
            <span>Opt Box:</span>
            <input type="color" data-ppt-setting="optionCardBg" value="${escapeHtml(settings.optionCardBg || '#FFFFFF')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Option Box Border Color">
            <span>Opt Border:</span>
            <input type="color" data-ppt-setting="optionBorderColor" value="${escapeHtml(settings.optionBorderColor || '#CBD5E1')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Option Badge Circle Background Color (A, B, C, D)">
            <span>Opt Badge:</span>
            <input type="color" data-ppt-setting="optionBadgeBg" value="${escapeHtml(settings.optionBadgeBg || '#7A0000')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Divider Line Color">
            <span>Divider:</span>
            <input type="color" data-ppt-setting="dividerColor" value="${escapeHtml(settings.dividerColor || '#A30000')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Footer Bar Background Color">
            <span>Footer Bg:</span>
            <input type="color" data-ppt-setting="footerBg" value="${escapeHtml(settings.footerBg || '#7A0000')}" />
          </label>
          <label class="ppt-fs-color-cell" title="Footer Text Color">
            <span>Footer Text:</span>
            <input type="color" data-ppt-setting="footerColor" value="${escapeHtml(settings.footerColor || '#FFFFFF')}" />
          </label>
        </div>
        <div class="ppt-fs-ribbon-group-title">1. Colours for Every Element</div>
      </div>

      <!-- 2. Exam Badge Design & Style -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; gap:2px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm ${(settings.examTagPosition || 'below-question') === 'below-question' ? 'is-active' : ''}" data-action="ppt-set-exam-position" data-position="below-question">
              🎯 Below Q
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${settings.examTagPosition === 'header' ? 'is-active' : ''}" data-action="ppt-set-exam-position" data-position="header">
              📌 In Header
            </button>
          </div>
          <div style="display:flex; gap:2px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm ${(settings.examTagStyle || 'pill') === 'pill' ? 'is-active' : ''}" data-action="ppt-set-exam-style" data-style="pill">
              🔴 Red Pill
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${settings.examTagStyle === 'highlight' ? 'is-active' : ''}" data-action="ppt-set-exam-style" data-style="highlight">
              🟡 Yellow Tag
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${settings.examTagStyle === 'blue' ? 'is-active' : ''}" data-action="ppt-set-exam-style" data-style="blue">
              🔵 Blue Tag
            </button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">2. Exam Badge</div>
      </div>

      <!-- 3. Typography & Fonts -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px; justify-content:center;">
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:10px; font-weight:700; color:#475569; width:44px;">Hindi:</span>
            <select class="ppt-fs-select-sm" data-ppt-setting="hindiFontFamily" style="width:130px; font-size:11px; padding:2px 4px;">
              <option value="Mukta, Segoe UI, sans-serif" ${hindiFontFamily.includes('Mukta') ? 'selected' : ''}>Mukta (Bold Crisp)</option>
              <option value="'Noto Sans Devanagari', sans-serif" ${hindiFontFamily.includes('Noto Sans') ? 'selected' : ''}>Noto Sans (Standard)</option>
              <option value="'Hind', sans-serif" ${hindiFontFamily.includes('Hind') ? 'selected' : ''}>Hind (Modern)</option>
              <option value="'Kalam', cursive" ${hindiFontFamily.includes('Kalam') ? 'selected' : ''}>Kalam (Handwriting)</option>
            </select>
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:10px; font-weight:700; color:#475569; width:44px;">English:</span>
            <select class="ppt-fs-select-sm" data-ppt-setting="engFontFamily" style="width:130px; font-size:11px; padding:2px 4px;">
              <option value="Segoe UI, Arial, sans-serif" ${engFontFamily.includes('Segoe UI') ? 'selected' : ''}>Segoe UI</option>
              <option value="'Roboto', sans-serif" ${engFontFamily.includes('Roboto') ? 'selected' : ''}>Roboto</option>
              <option value="'Montserrat', sans-serif" ${engFontFamily.includes('Montserrat') ? 'selected' : ''}>Montserrat</option>
              <option value="'Arial', sans-serif" ${engFontFamily.includes('Arial') ? 'selected' : ''}>Arial</option>
            </select>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">3. Typography</div>
      </div>

      <!-- 4. Footer Settings Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px; justify-content:center;">
          <div style="display:flex; align-items:center; gap:4px;">
            <input type="text" 
                   data-ppt-setting="footerText" 
                   value="${escapeHtml(footerText)}" 
                   placeholder="Channel Name | Telegram: @..." 
                   title="Slide Footer Channel & Socials Text" 
                   style="padding:3px 6px; font-size:11px; font-weight:600; border:1px solid #94a3b8; border-radius:4px; width:180px; background:#ffffff; color:#0f172a; outline:none;" />
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:10px; font-weight:700; color:#475569;">Height:</span>
            <input type="number" class="ppt-fs-input-num" data-ppt-setting="footerHeight" value="${settings.footerHeight || 28}" min="16" max="60" style="width:42px;" />
            <span style="font-size:10px; font-weight:700; color:#475569;">Font:</span>
            <input type="number" class="ppt-fs-input-num" data-ppt-setting="footerFontSize" value="${settings.footerFontSize || 13}" min="9" max="22" style="width:42px;" />
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">4. Footer</div>
      </div>
    </div>
  `;
}

