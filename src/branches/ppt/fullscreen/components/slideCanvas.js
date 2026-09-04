// Fullscreen Center 16:9 Live Slide Canvas Stage
import { getSlideSettings } from "../../../pptBranch.js";
import { getQuestionImages } from "../../pptUI.js";
import { escapeHtml } from "../ribbon/ribbonCommon.js";
import { calculateAutoFitZoom } from "../fullscreenController.js";

function renderCanvasQBadge(settings, activeQ, activeIdx) {
  return `
    <div class="slide-standalone-q-badge-box canva-transform-box ppt-resizable-box" style="display:${(!settings.showHeader && settings.showQBadge) ? 'inline-flex' : 'none'}; align-items:center; margin-bottom:8px; transform:translate(${settings.qBadgePosX || 0}px, ${settings.qBadgePosY || 0}px);">
      <div class="canva-drag-bar">
        <span class="canva-drag-pill" data-ppt-resize-type="qbadge-position">✥ Q.No</span>
        <button type="button" class="canva-order-btn" data-action="ppt-move-layout-element" data-element="qbadge" data-dir="up" title="Move Up">▲</button>
        <button type="button" class="canva-order-btn" data-action="ppt-move-layout-element" data-element="qbadge" data-dir="down" title="Move Down">▼</button>
        <button type="button" class="canva-order-btn canva-remove-btn" data-action="ppt-remove-layout-element" data-element="qbadge" title="Remove Q.No">✕</button>
      </div>
      <div class="slide-q-badge" contenteditable="true" spellcheck="false" data-ppt-canvas-field="number" style="background:${settings.qBadgeBg || '#FFFFFF'}; color:${settings.qBadgeColor || (settings.theme === 'purple' ? '#4C1D95' : (settings.theme === 'navy' ? '#0A1931' : '#7A0000'))}; font-size:${settings.qBadgeSize || 18}px; padding:4px 14px; border-radius:14px; font-weight:800; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
        ${escapeHtml(activeQ.number || `Q.${activeIdx + 1}`)}
      </div>
      <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="qbadge-resize-nw" title="Scale"></div>
      <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="qbadge-resize-ne" title="Scale"></div>
      <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="qbadge-resize-se" title="Scale"></div>
      <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="qbadge-resize-sw" title="Scale"></div>
    </div>
  `;
}

function renderCanvasEnglish(settings, activeQ) {
  return `
    <div class="canva-transform-box slide-freeform-box slide-eng-section ppt-resizable-box" style="display:${settings.showEnglish ? 'flex' : 'none'}; flex-direction:column; justify-content:${settings.valign === 'middle' || settings.valign === 'center' ? 'center' : (settings.valign === 'bottom' ? 'flex-end' : 'flex-start')}; transform:translate(${settings.engPosX || 0}px, ${settings.engPosY || 0}px); width:${settings.engWidth ? `${settings.engWidth}%` : '100%'};">
      <div class="canva-drag-bar">
        <span class="canva-drag-pill" data-ppt-resize-type="eng-position">✥ English</span>
        <button type="button" class="canva-order-btn" data-action="ppt-move-layout-element" data-element="english" data-dir="up" title="Move Up">▲</button>
        <button type="button" class="canva-order-btn" data-action="ppt-move-layout-element" data-element="english" data-dir="down" title="Move Down">▼</button>
        <button type="button" class="canva-order-btn canva-remove-btn" data-action="ppt-remove-layout-element" data-element="english" title="Remove English">✕</button>
      </div>
      <div class="slide-eng-text" contenteditable="true" spellcheck="false" data-ppt-canvas-field="english" title="Click to edit English text directly on slide" style="color:${settings.engColor || '#111111'}; font-size:${settings.engFontSize || 18}px; font-family:${settings.engFontFamily || 'Segoe UI, Arial, sans-serif'}; text-align:${settings.textAlign || 'left'}; line-height:${settings.lineHeight || 1.34};">${activeQ.englishHtml || escapeHtml(activeQ.english || '')}</div>
      <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="eng-resize-nw" title="Resize Top-Left"></div>
      <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="eng-resize-ne" title="Resize Top-Right"></div>
      <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="eng-resize-se" title="Resize Bottom-Right"></div>
      <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="eng-resize-sw" title="Resize Bottom-Left"></div>
      <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="eng-resize-n" title="Resize Top Spacing"></div>
      <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="eng-resize-s" title="Resize Bottom Spacing"></div>
      <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="eng-resize-e" title="Stretch Width Right ↔"></div>
      <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="eng-resize-w" title="Stretch Width Left ↔"></div>
    </div>
  `;
}

function renderCanvasDivider(settings) {
  return `
    <div class="canva-transform-box slide-freeform-box slide-divider-wrapper ppt-resizable-box" style="display:${settings.showDivider ? 'block' : 'none'}; width:${settings.dividerWidth ? `${settings.dividerWidth}%` : '100%'}; transform:translate(${settings.dividerPosX || 0}px, ${settings.dividerPosY || 0}px); margin:${settings.dividerSpacing || 4}px 0;">
      <div class="canva-drag-bar">
        <span class="canva-drag-pill slide-divider-drag" data-ppt-resize-type="divider-position" title="Drag to move Divider Line">✥ Divider</span>
        <button type="button" class="canva-order-btn" data-action="ppt-move-layout-element" data-element="divider" data-dir="up" title="Move Up">▲</button>
        <button type="button" class="canva-order-btn" data-action="ppt-move-layout-element" data-element="divider" data-dir="down" title="Move Down">▼</button>
        <button type="button" class="canva-order-btn canva-remove-btn" data-action="ppt-remove-layout-element" data-element="divider" title="Remove Divider">✕</button>
      </div>
      <div class="slide-divider" style="border-top:${settings.dividerThickness || 2}px solid ${settings.dividerColor || '#A30000'}; width:100%;"></div>
      <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="divider-resize-e" title="Stretch Divider Right ↔"></div>
      <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="divider-resize-w" title="Stretch Divider Left ↔"></div>
    </div>
  `;
}

function renderCanvasHindi(settings, activeQ) {
  return `
    <div class="canva-transform-box slide-freeform-box slide-hindi-section ppt-resizable-box" style="display:${settings.showHindi ? 'flex' : 'none'}; flex-direction:column; justify-content:${settings.valign === 'middle' || settings.valign === 'center' ? 'center' : (settings.valign === 'bottom' ? 'flex-end' : 'flex-start')}; transform:translate(${settings.hindiPosX || 0}px, ${settings.hindiPosY || 0}px); width:${settings.hindiWidth ? `${settings.hindiWidth}%` : '100%'};">
      <div class="canva-drag-bar">
        <span class="canva-drag-pill" data-ppt-resize-type="hindi-position">✥ Hindi</span>
        <button type="button" class="canva-order-btn" data-action="ppt-move-layout-element" data-element="hindi" data-dir="up" title="Move Up">▲</button>
        <button type="button" class="canva-order-btn" data-action="ppt-move-layout-element" data-element="hindi" data-dir="down" title="Move Down">▼</button>
        <button type="button" class="canva-order-btn canva-remove-btn" data-action="ppt-remove-layout-element" data-element="hindi" title="Remove Hindi">✕</button>
      </div>
      <div class="slide-hindi-text" contenteditable="true" spellcheck="false" data-ppt-canvas-field="hindi" title="Click to edit Hindi text directly on slide" style="color:${settings.hindiColor || '#7A0000'}; font-size:${settings.hindiFontSize || 17}px; font-family:${settings.hindiFontFamily || 'Mangal, Noto Sans Devanagari, Arial, sans-serif'}; text-align:${settings.textAlign || 'left'}; line-height:${settings.lineHeight || 1.34};">${activeQ.hindiHtml || escapeHtml(activeQ.hindi || '')}</div>
      <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="hindi-resize-nw" title="Resize Top-Left"></div>
      <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="hindi-resize-ne" title="Resize Top-Right"></div>
      <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="hindi-resize-se" title="Resize Bottom-Right"></div>
      <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="hindi-resize-sw" title="Resize Bottom-Left"></div>
      <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="hindi-resize-n" title="Resize Top Spacing"></div>
      <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="hindi-resize-s" title="Resize Bottom Spacing"></div>
      <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="hindi-resize-e" title="Stretch Width Right ↔"></div>
      <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="hindi-resize-w" title="Stretch Width Left ↔"></div>
    </div>
  `;
}

function renderCanvasExamTag(settings, activeQ, examTagPos, examTagStyle) {
  return `
    <div class="canva-transform-box slide-exam-section ppt-resizable-box" style="display:${(settings.showExamTag && (examTagPos === 'below-question' || examTagPos === 'above-options')) ? 'inline-flex' : 'none'}; transform:translate(${settings.examTagPosX || 0}px, ${settings.examTagPosY || 0}px);">
      <div class="canva-drag-bar">
        <span class="canva-drag-pill" data-ppt-resize-type="exam-position">✥ Exam Tag</span>
        <button type="button" class="canva-order-btn" data-action="ppt-move-layout-element" data-element="exam" data-dir="up" title="Move Up">▲</button>
        <button type="button" class="canva-order-btn" data-action="ppt-move-layout-element" data-element="exam" data-dir="down" title="Move Down">▼</button>
        <button type="button" class="canva-order-btn canva-remove-btn" data-action="ppt-remove-layout-element" data-element="exam" title="Remove Exam Tag">✕</button>
      </div>
      <div class="slide-standalone-exam-tag" data-style="${examTagStyle}" contenteditable="true" spellcheck="false" data-ppt-canvas-field="exam" style="
        background:${examTagStyle === 'pill' ? (settings.examTagBg || '#DC2626') : (examTagStyle === 'highlight' ? '#FEF08A' : 'transparent')};
        color:${examTagStyle === 'pill' ? (settings.examTagColor || '#FFFFFF') : (examTagStyle === 'highlight' ? '#854D0E' : (settings.examColor || '#FFFFFF'))};
        font-size:${settings.examFontSize || 15}px;
        border-radius:${settings.examTagRadius !== undefined ? `${settings.examTagRadius}px` : (examTagStyle === 'pill' ? '18px' : '4px')};
        padding:${settings.examTagPaddingY !== undefined ? settings.examTagPaddingY : 4}px ${settings.examTagPaddingX !== undefined ? settings.examTagPaddingX : (examTagStyle === 'pill' ? 14 : 6)}px;
        font-weight:800;
        box-shadow:${examTagStyle === 'pill' ? '0 2px 6px rgba(0,0,0,0.35)' : 'none'};
      ">
        ${activeQ.examHtml || escapeHtml(activeQ.exam || settings.defaultExam || '(Exam Name)')}
      </div>
      <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="exam-resize-nw" title="Scale"></div>
      <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="exam-resize-ne" title="Scale"></div>
      <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="exam-resize-se" title="Scale"></div>
      <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="exam-resize-sw" title="Scale"></div>
    </div>
  `;
}

function renderCanvasOptions(settings, activeQ) {
  const optionsList = (activeQ.options && activeQ.options.length) ? activeQ.options : [
    { key: "A", text: "" },
    { key: "B", text: "" },
    { key: "C", text: "" },
    { key: "D", text: "" }
  ];
  return `
    <div class="canva-transform-box slide-freeform-box slide-options-container ppt-resizable-box" data-layout="${settings.optionsLayout || '2-col'}" data-option-style="${settings.optionStyle || 'card'}" style="display:${settings.showOptions ? 'grid' : 'none'}; width:${settings.optionWidthPercent || 96}%; gap:${settings.optionGap || 10}px; transform:translate(${settings.optionsPosX || 0}px, ${settings.optionsPosY || 0}px);">
      <div class="canva-drag-bar">
        <span class="canva-drag-pill" data-ppt-resize-type="options-position">✥ Options Grid</span>
        <button type="button" class="canva-order-btn" data-action="ppt-move-layout-element" data-element="options" data-dir="up" title="Move Up">▲</button>
        <button type="button" class="canva-order-btn" data-action="ppt-move-layout-element" data-element="options" data-dir="down" title="Move Down">▼</button>
        <button type="button" class="canva-order-btn canva-remove-btn" data-action="ppt-remove-layout-element" data-element="options" title="Remove Options">✕</button>
      </div>
      <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="options-resize-nw" title="Resize Top-Left"></div>
      <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="options-resize-ne" title="Resize Top-Right"></div>
      <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="options-resize-se" title="Resize Bottom-Right"></div>
      <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="options-resize-sw" title="Resize Bottom-Left"></div>
      <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="options-resize-n" title="Resize Top Padding"></div>
      <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="options-resize-s" title="Resize Bottom Padding"></div>
      <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="options-resize-e" title="Stretch Width Right ↔"></div>
      <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="options-resize-w" title="Stretch Width Left ↔"></div>

      ${optionsList.slice(0, 4).map((opt, oIdx) => `
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
  `;
}

export function renderSlideCanvas(state) {
  const ppt = state.ppt || {};
  const globalSettings = ppt.settings || {};
  const questions = ppt.questions && ppt.questions.length ? ppt.questions : [];
  const activeIdx = Math.max(0, Math.min(ppt.activeQuestionIndex || 0, Math.max(0, questions.length - 1)));
  const activeQ = questions[activeIdx] || {
    number: "Q.1",
    exam: globalSettings.defaultExam || "(Exam Name)",
    topic: globalSettings.topic || "TOPIC",
    english: "",
    hindi: "",
    options: [{ key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" }]
  };

  const settings = getSlideSettings(globalSettings, activeQ);
  let zoomLevel = ppt.fsZoom;
  const autoZoom = calculateAutoFitZoom(typeof document !== "undefined" ? document.querySelector(".ppt-fullscreen-app-overlay") : null);
  if (!zoomLevel || ppt.fsAutoFit !== false) {
    zoomLevel = autoZoom;
    ppt.fsZoom = autoZoom;
  } else if (zoomLevel === 100 && autoZoom < 94) {
    zoomLevel = autoZoom;
    ppt.fsZoom = autoZoom;
    ppt.fsAutoFit = true;
  }
  if (!zoomLevel) zoomLevel = 100;

  const hasAnyActiveElement = Boolean(
    settings.showHeader ||
    settings.showQBadge ||
    settings.showEnglish ||
    settings.showHindi ||
    settings.showDivider ||
    settings.showExamTag ||
    settings.showOptions ||
    settings.showFooter
  );
  const isBlankSlide = (activeQ.layout === "blank") && !hasAnyActiveElement;

  let bgSize = "100% 100%";
  if (settings.bgFit === "cover") bgSize = "cover";
  else if (settings.bgFit === "contain") bgSize = "contain";

  const bgImgUrl = activeQ.bgImage || (activeQ.settings && activeQ.settings.bgImage) || settings.bgImage;
  const slideBgColor = (activeQ.settings && activeQ.settings.slideBg) || settings.slideBg || '#FFFFFF';
  const bgStyle = bgImgUrl
    ? `background-image: url('${bgImgUrl}'); background-position: center; background-size: ${bgSize}; background-repeat: no-repeat; background-color: ${slideBgColor};`
    : `background-color: ${slideBgColor};`;

  // Pure White Blank Slide (Exact Microsoft PowerPoint Match)
  if (isBlankSlide) {
    return `
      <main class="ppt-fs-stage-viewport">
        <div class="ppt-fs-stage-scaler-box" style="width:${Math.round(960 * (zoomLevel / 100))}px; height:${Math.round(540 * (zoomLevel / 100))}px;">
          <div class="ppt-fs-stage-scaler" style="transform: scale(${zoomLevel / 100});">
            <!-- 16:9 BLANK SLIDE CANVAS -->
            <div class="ppt-slide-canvas-wrapper ppt-blank-slide-canvas" style="${bgStyle}">
            <!-- Spotless Clean Editable Text Area (No boxes, no dashed lines) -->
            <div class="ppt-pure-blank-canvas" contenteditable="true" spellcheck="false" data-ppt-canvas-field="english" style="width:100%; height:100%; color:${settings.engColor || '#111111'}; font-family:${settings.engFontFamily || 'Segoe UI, Arial, sans-serif'}; font-size:${settings.engFontSize || 20}px; padding:20px; box-sizing:border-box;">${escapeHtml(activeQ.english || '')}</div>

            ${(!activeQ.english && !activeQ.hindi && getQuestionImages(activeQ).length === 0 && !bgImgUrl) ? `
              <div class="ppt-blank-slide-placeholder" style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; pointer-events:none; z-index:10;">
                <div style="background:rgba(255,255,255,0.94); border:1px solid #cbd5e1; border-radius:12px; padding:18px 24px; box-shadow:0 8px 24px rgba(0,0,0,0.08); text-align:center; pointer-events:auto; max-width:480px;">
                  <div style="font-size:26px; margin-bottom:4px;">🎨</div>
                  <h3 style="margin:0 0 4px 0; font-size:17px; font-weight:800; color:#0f172a;">Fresh Blank Slide</h3>
                  <p style="margin:0 0 14px 0; font-size:12px; color:#64748b;">Choose a theme or upload a custom slide background to begin</p>

                  <!-- Predefined Theme Buttons -->
                  <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-bottom:12px;">
                    <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-set-theme" data-theme="dark" style="padding:5px 12px; font-size:11px; font-weight:700; background:#0B0F17; color:#FFFFFF; border-radius:6px; border:1px solid #334155; cursor:pointer;">
                      ⬛ Dark Board
                    </button>
                    <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-set-theme" data-theme="maroon" style="padding:5px 12px; font-size:11px; font-weight:700; background:#7A0000; color:#FFFFFF; border-radius:6px; border:none; cursor:pointer;">
                      🟥 Maroon
                    </button>
                    <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-set-theme" data-theme="navy" style="padding:5px 12px; font-size:11px; font-weight:700; background:#0A1931; color:#FFFFFF; border-radius:6px; border:none; cursor:pointer;">
                      🟦 Royal Navy
                    </button>
                    <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-set-theme" data-theme="emerald" style="padding:5px 12px; font-size:11px; font-weight:700; background:#064E3B; color:#FFFFFF; border-radius:6px; border:none; cursor:pointer;">
                      🟩 Emerald
                    </button>
                  </div>

                  <!-- Custom BG Action -->
                  <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-trigger-bg-upload" style="padding:7px 18px; font-size:12px; font-weight:700; background:#2563eb; color:#FFFFFF; border-radius:6px; border:none; cursor:pointer; box-shadow:0 2px 6px rgba(37,99,235,0.3);">
                    🖼️ Upload Custom BG
                  </button>
                </div>
              </div>
            ` : ''}



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
        </div>
      </div>
    </main>
    `;
  }

  const examTagPos = settings.examTagPosition || "below-question";
  const examTagStyle = settings.examTagStyle || "pill";

  const posXPercent = settings.boxPosX && Number(settings.boxPosX) !== 0
    ? Number(settings.boxPosX)
    : (settings.layoutPreset === "right-split" ? 42 : 0);
  const widthPercent = settings.questionBoxWidth && Number(settings.questionBoxWidth) !== 100
    ? Number(settings.questionBoxWidth)
    : (settings.layoutPreset === "right-split" || settings.layoutPreset === "left-split" ? 56 : 100);

  return `
    <main class="ppt-fs-stage-viewport">
      <div class="ppt-fs-stage-scaler-box" style="width:${Math.round(960 * (zoomLevel / 100))}px; height:${Math.round(540 * (zoomLevel / 100))}px;">
        <div class="ppt-fs-stage-scaler" style="transform: scale(${zoomLevel / 100});">
          <!-- 16:9 SLIDE CANVAS CONTAINER (EXACT Live Slide Render) -->
          <div class="ppt-slide-canvas-wrapper" style="${bgStyle}">
          <!-- Top Header Bar -->
          <div class="slide-header-bar ppt-resizable-box" style="display:${settings.showHeader ? 'flex' : 'none'}; background:${settings.headerBg || '#7A0000'}; height:${settings.headerHeight || 64}px;">
            <!-- Draggable Question Badge in Header -->
            <div class="slide-q-badge-box canva-transform-box ppt-resizable-box" style="transform:translate(${settings.qBadgePosX || 0}px, ${settings.qBadgePosY || 0}px); display:${settings.showQBadge ? 'inline-flex' : 'none'};">
              <div class="canva-drag-bar">
                <span class="canva-drag-pill" data-ppt-resize-type="qbadge-position">✥ Q.No</span>
              </div>
              <div class="slide-q-badge" contenteditable="true" spellcheck="false" data-ppt-canvas-field="number" style="background:${settings.qBadgeBg || '#FFFFFF'}; color:${settings.qBadgeColor || '#7A0000'}; font-size:${settings.qBadgeSize || 18}px;">
                ${escapeHtml(activeQ.number || `Q.${activeIdx + 1}`)}
              </div>
              <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="qbadge-resize-nw" title="Scale"></div>
              <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="qbadge-resize-ne" title="Scale"></div>
              <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="qbadge-resize-se" title="Scale"></div>
              <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="qbadge-resize-sw" title="Scale"></div>
            </div>

            <!-- Draggable Exam Title in Header -->
            <div class="slide-exam-header-box canva-transform-box ppt-resizable-box" style="transform:translate(${settings.examTagPosX || 0}px, ${settings.examTagPosY || 0}px); display:${settings.showExamTag && examTagPos === 'header' ? 'inline-flex' : 'none'};">
              <div class="canva-drag-bar">
                <span class="canva-drag-pill" data-ppt-resize-type="exam-position">✥ Exam</span>
              </div>
              <div class="slide-exam-title" contenteditable="true" spellcheck="false" data-ppt-canvas-field="exam" style="color:${settings.examColor || '#FFFFFF'}; font-size:${settings.examFontSize || 19}px;">
                ${escapeHtml(activeQ.exam || settings.defaultExam || '(Exam Name)')}
              </div>
              <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="exam-resize-nw" title="Scale"></div>
              <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="exam-resize-ne" title="Scale"></div>
              <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="exam-resize-se" title="Scale"></div>
              <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="exam-resize-sw" title="Scale"></div>
            </div>

            <!-- Draggable Topic Title Box in Header -->
            <div class="slide-topic-box canva-transform-box ppt-resizable-box" style="transform:translate(${settings.topicPosX || 0}px, ${settings.topicPosY || 0}px); display:inline-flex; align-items:center; gap:8px;">
              <div class="canva-drag-bar">
                <span class="canva-drag-pill" data-ppt-resize-type="topic-position">✥ Topic</span>
              </div>
              <div class="slide-topic-title" contenteditable="true" spellcheck="false" data-ppt-canvas-field="topic" style="color:${settings.topicColor || '#FFD700'}; font-size:${settings.topicFontSize || 20}px;">
                ${activeQ.topicHtml || settings.topicHtml || escapeHtml((activeQ.topic || settings.topic || 'TOPIC').toUpperCase())}
              </div>
              ${settings.subtitleText ? `
                <div class="slide-teacher-badge" contenteditable="true" spellcheck="false" data-ppt-canvas-field="subtitle" style="background:#FFFFFF; color:${settings.headerBg || '#7A0000'}; font-size:12px; font-weight:800; padding:2px 10px; border-radius:12px; box-shadow: 0 1px 4px rgba(0,0,0,0.25); white-space:nowrap;">
                  ${escapeHtml(settings.subtitleText)}
                </div>
              ` : ''}
              <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="topic-resize-nw" title="Scale"></div>
              <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="topic-resize-ne" title="Scale"></div>
              <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="topic-resize-se" title="Scale"></div>
              <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="topic-resize-sw" title="Scale"></div>
            </div>
            <!-- Header Height Resize Handle -->
            <div class="ppt-resize-handle ppt-resize-handle-s" data-ppt-resize-type="header-height" title="Drag to adjust Header Height"></div>
          </div>

          <!-- Slide Body Area (Dynamic Stacked Layout) -->
          <div class="slide-body-content" style="padding:${settings.questionPadding || 16}px 24px; transform:translate(${posXPercent}%, ${settings.boxPosY || 0}px); width:${widthPercent}%;">
            ${(settings.elementOrder || ["qbadge", "english", "divider", "hindi", "exam", "options"]).map((elemKey) => {
              switch (elemKey) {
                case "qbadge":
                  return renderCanvasQBadge(settings, activeQ, activeIdx);
                case "english":
                  return renderCanvasEnglish(settings, activeQ);
                case "divider":
                  return renderCanvasDivider(settings);
                case "hindi":
                  return renderCanvasHindi(settings, activeQ);
                case "exam":
                  return renderCanvasExamTag(settings, activeQ, examTagPos, examTagStyle);
                case "options":
                  return renderCanvasOptions(settings, activeQ);
                default:
                  return "";
              }
            }).join("")}
          </div>

          <!-- Slide Diagrams / Graphs / Images Floating Layer (Support Multiple Images) -->
          ${getQuestionImages(activeQ).map((img, imgIdx) => {
            const selectedImgId = ppt.selectedImageId;
            const isSelected = selectedImgId ? ((img.id || `img_${imgIdx}`) === selectedImgId) : (imgIdx === 0);
            const isCropping = !!(ppt.activeCrop && (ppt.activeCrop.imgId === (img.id || `img_${imgIdx}`) || ppt.activeCrop.imgId === img));
            const opacityVal = img.opacity !== undefined ? img.opacity : 100;
            const brightVal = img.brightness !== undefined ? img.brightness : 0;
            const contrastVal = img.contrast !== undefined ? img.contrast : 0;
            let filterCss = `opacity(${opacityVal}%) brightness(${100 + Number(brightVal)}%) contrast(${100 + Number(contrastVal)}%)`;
            if (img.filter === "grayscale") filterCss += " grayscale(100%)";
            else if (img.filter === "invert") filterCss += " invert(100%)";
            else if (img.filter === "high-contrast") filterCss += " contrast(180%) brightness(110%)";
            else if (img.filter === "gold") filterCss += " sepia(80%) saturate(200%) hue-rotate(5deg)";
            else if (img.filter === "blue") filterCss += " sepia(50%) saturate(200%) hue-rotate(180deg)";

            const rot = img.rotation || 0;
            const scX = img.flipH ? -1 : 1;
            const scY = img.flipV ? -1 : 1;
            const transformStyle = `translate(${(img.posX || 0)}px, ${(img.posY || 0)}px) rotate(${rot}deg) scale(${scX}, ${scY})`;

            return `
              <div class="canva-transform-box slide-image-container ppt-resizable-box ${isSelected ? 'is-selected' : ''} ${isCropping ? 'is-cropping' : ''}" data-image-id="${img.id || `img_${imgIdx}`}" data-image-index="${imgIdx}" style="transform:${transformStyle}; width:${(img.width || 360)}px; height:${(img.height || 202)}px; z-index:${40 + imgIdx};">
                <div class="slide-image-wrapper">
                  <img src="${typeof img === 'string' ? img : img.dataUrl}" alt="Question Diagram ${imgIdx + 1}" style="filter:${filterCss};" />
                </div>

                ${!isCropping ? `
                  <!-- Top Rotation Stem & Handle (Matches Pic 1) -->
                  <div class="canva-rotation-stem"></div>
                  <div class="canva-rotation-handle" data-ppt-resize-type="image-rotation" data-image-id="${img.id || `img_${imgIdx}`}" title="Rotate Image">🔄</div>

                  <!-- 8 Canva Node Handles (Matches Pic 1) -->
                  <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="image-resize-nw" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize"></div>
                  <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="image-resize-ne" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize"></div>
                  <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="image-resize-se" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize"></div>
                  <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="image-resize-sw" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize"></div>
                  <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="image-resize-n" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Height"></div>
                  <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="image-resize-s" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Height"></div>
                  <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="image-resize-e" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Width"></div>
                  <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="image-resize-w" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Width"></div>

                  <!-- Floating Quick Action Pill (Matches Pic 1) -->
                  ${isSelected ? `
                    <div class="slide-image-floating-toolbar" role="toolbar">
                      <button type="button" class="slide-img-tb-btn" data-action="ppt-fs-tab" data-tab="insert" title="Edit in Insert Ribbon">
                        ✏️ Edit image ✨
                      </button>
                      <span class="slide-img-tb-sep"></span>
                      <button type="button" class="slide-img-tb-btn" data-action="ppt-remove-image-bg" data-image-id="${img.id || `img_${imgIdx}`}" title="Remove White Background (Transparent)">
                        🪄 Remove BG
                      </button>
                      ${img.originalDataUrl && img.originalDataUrl !== (typeof img === 'string' ? img : img.dataUrl) ? `
                        <button type="button" class="slide-img-tb-btn" data-action="ppt-restore-image-bg" data-image-id="${img.id || `img_${imgIdx}`}" title="Restore Original Image Background">
                          ↺ Restore
                        </button>
                      ` : ''}
                      <button type="button" class="slide-img-tb-btn" data-action="ppt-trigger-crop-mode" data-image-id="${img.id || `img_${imgIdx}`}" title="Crop Image">
                        ✂️ Crop
                      </button>
                      <button type="button" class="slide-img-tb-btn is-delete" data-action="ppt-remove-image" data-image-id="${img.id || `img_${imgIdx}`}" title="Delete Image">
                        🗑️
                      </button>
                    </div>
                  ` : ''}
                ` : `
                  <!-- In-Place Crop Mode Frame & 8 Corner/Edge Brackets (Matches Pic 2) -->
                  <div class="slide-inplace-crop-overlay">
                    <!-- Faint outer boundary outline showing full uncropped image bounds -->
                    <div class="slide-crop-dimmed-bounds"></div>

                    <!-- Interactive Crop Window with bright clipped image inside -->
                    <div class="slide-crop-active-frame">
                      <div class="slide-crop-clipped-inner">
                        <img src="${typeof img === 'string' ? img : img.dataUrl}" style="filter:${filterCss};" />
                      </div>

                      <!-- 3x3 Grid -->
                      <div class="slide-crop-grid-line h-1"></div>
                      <div class="slide-crop-grid-line h-2"></div>
                      <div class="slide-crop-grid-line v-1"></div>
                      <div class="slide-crop-grid-line v-2"></div>

                      <!-- 4 Thick L-Shaped Corner Brackets (Pic 2) -->
                      <div class="slide-crop-corner-bracket nw" data-inplace-crop-handle="nw"></div>
                      <div class="slide-crop-corner-bracket ne" data-inplace-crop-handle="ne"></div>
                      <div class="slide-crop-corner-bracket se" data-inplace-crop-handle="se"></div>
                      <div class="slide-crop-corner-bracket sw" data-inplace-crop-handle="sw"></div>

                      <!-- 4 Side Edge Bars (Pic 2) -->
                      <div class="slide-crop-edge-bar n" data-inplace-crop-handle="n"></div>
                      <div class="slide-crop-edge-bar s" data-inplace-crop-handle="s"></div>
                      <div class="slide-crop-edge-bar e" data-inplace-crop-handle="e"></div>
                      <div class="slide-crop-edge-bar w" data-inplace-crop-handle="w"></div>
                    </div>

                    <!-- Floating Crop Action Pill (Matches Pic 2 & User Request) -->
                    <div class="slide-crop-action-bar">
                      <button type="button" class="slide-crop-btn-done" data-action="ppt-crop-apply" title="Finalize Crop (Enter)">
                        ✓ Done
                      </button>
                      <button type="button" class="slide-crop-btn-cancel" data-action="ppt-crop-cancel" title="Cancel Crop (Esc)">
                        ✕ Cancel
                      </button>
                      <button type="button" class="slide-crop-btn-reset" data-action="ppt-crop-reset" title="Reset Crop Frame">
                        ↺ Reset
                      </button>
                    </div>
                  </div>
                `}
              </div>
            `;
          }).join("")}


          <!-- Footer Bar (If Enabled) with Height Handle -->
          <div class="slide-footer-bar ppt-resizable-box" contenteditable="true" spellcheck="false" data-ppt-canvas-field="footer" title="Click to edit Footer on slide" style="display:${isBlankSlide || !settings.showFooter ? 'none' : 'flex'}; background:${settings.footerBg || '#7A0000'}; color:${settings.footerColor || '#FFFFFF'}; height:${settings.footerHeight || 28}px; font-size:${settings.footerFontSize || 13}px;">
            <div class="ppt-resize-handle ppt-resize-handle-s" style="top:-5px; bottom:auto;" data-ppt-resize-type="footer-height" title="Drag to adjust Footer Height"></div>
            ${settings.footerHtml || escapeHtml(settings.footerText || '')}
          </div>
        </div>
      </div>

        </div>
      </div>
    </main>
  `;
}

export function renderSlideCleanExportHtml(activeQ, activeIdx, globalSettings) {
  const settings = getSlideSettings(globalSettings, activeQ);
  const hasAnyActiveElement = Boolean(
    settings.showHeader ||
    settings.showQBadge ||
    settings.showEnglish ||
    settings.showHindi ||
    settings.showDivider ||
    settings.showExamTag ||
    settings.showOptions ||
    settings.showFooter
  );
  const isBlankSlide = (activeQ.layout === "blank") && !hasAnyActiveElement;

  let bgSize = "100% 100%";
  if (settings.bgFit === "cover") bgSize = "cover";
  else if (settings.bgFit === "contain") bgSize = "contain";

  const bgImgUrl = activeQ.bgImage || (activeQ.settings && activeQ.settings.bgImage) || settings.bgImage;
  const slideBgColor = (activeQ.settings && activeQ.settings.slideBg) || settings.slideBg || '#FFFFFF';
  const bgStyle = bgImgUrl
    ? `background-image: url('${bgImgUrl}'); background-position: center; background-size: ${bgSize}; background-repeat: no-repeat; background-color: ${slideBgColor};`
    : `background-color: ${slideBgColor};`;

  if (isBlankSlide) {
    return `
      <div class="ppt-slide-canvas-wrapper ppt-blank-slide-canvas" style="${bgStyle}">
        <div class="ppt-pure-blank-canvas" style="width:100%; height:100%; color:#111111; font-family:${settings.engFontFamily || 'Segoe UI, Arial, sans-serif'}; font-size:${settings.engFontSize || 20}px;">${activeQ.englishHtml || escapeHtml(activeQ.english || '')}</div>
        ${getQuestionImages(activeQ).map((img, imgIdx) => `
          <div class="slide-image-container" style="position:absolute; transform:translate(${(img.posX || 0)}px, ${(img.posY || 0)}px); width:${(img.width || 360)}px; height:${(img.height || 202)}px; z-index:${40 + imgIdx};">
            <div class="slide-image-wrapper">
              <img src="${typeof img === 'string' ? img : img.dataUrl}" alt="Diagram" />
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  const examTagPos = settings.examTagPosition || "below-question";
  const examTagStyle = settings.examTagStyle || "pill";

  const posXPercent = settings.boxPosX && Number(settings.boxPosX) !== 0
    ? Number(settings.boxPosX)
    : (settings.layoutPreset === "right-split" ? 42 : 0);
  const widthPercent = settings.questionBoxWidth && Number(settings.questionBoxWidth) !== 100
    ? Number(settings.questionBoxWidth)
    : (settings.layoutPreset === "right-split" || settings.layoutPreset === "left-split" ? 56 : 100);

  return `
    <div class="ppt-slide-canvas-wrapper" style="${bgStyle}">
      <!-- Top Header Bar -->
      <div class="slide-header-bar" style="display:${settings.showHeader ? 'flex' : 'none'}; background:${settings.headerBg || '#7A0000'}; height:${settings.headerHeight || 64}px;">
        <div class="slide-q-badge-box" style="transform:translate(${settings.qBadgePosX || 0}px, ${settings.qBadgePosY || 0}px); display:${settings.showQBadge ? 'inline-flex' : 'none'};">
          <div class="slide-q-badge" style="background:${settings.qBadgeBg || '#FFFFFF'}; color:${settings.qBadgeColor || '#7A0000'}; font-size:${settings.qBadgeSize || 18}px;">
            ${activeQ.numberHtml || escapeHtml(activeQ.number || `Q.${activeIdx + 1}`)}
          </div>
        </div>
        <div class="slide-exam-header-box" style="transform:translate(${settings.examTagPosX || 0}px, ${settings.examTagPosY || 0}px); display:${settings.showExamTag && examTagPos === 'header' ? 'inline-flex' : 'none'};">
          <div class="slide-exam-title" style="color:${settings.examColor || '#FFFFFF'}; font-size:${settings.examFontSize || 19}px;">
            ${activeQ.examHtml || escapeHtml(activeQ.exam || settings.defaultExam || '(Exam Name)')}
          </div>
        </div>
        <div class="slide-topic-box" style="transform:translate(${settings.topicPosX || 0}px, ${settings.topicPosY || 0}px);">
          <div class="slide-topic-title" style="color:${settings.topicColor || '#FFD700'}; font-size:${settings.topicFontSize || 20}px;">
            ${activeQ.topicHtml || settings.topicHtml || escapeHtml((activeQ.topic || settings.topic || 'TOPIC').toUpperCase())}
          </div>
        </div>
      </div>

      <!-- Slide Body Area -->
      <div class="slide-body-content" style="padding:${settings.questionPadding || 16}px 24px; transform:translate(${posXPercent}%, ${settings.boxPosY || 0}px); width:${widthPercent}%;">
        ${(settings.elementOrder || ["qbadge", "english", "divider", "hindi", "exam", "options"]).map((elemKey) => {
          switch (elemKey) {
            case "qbadge":
              return (!settings.showHeader && settings.showQBadge) ? `
                <div class="slide-standalone-q-badge-box" style="display:inline-flex; align-items:center; margin-bottom:8px; transform:translate(${settings.qBadgePosX || 0}px, ${settings.qBadgePosY || 0}px);">
                  <div class="slide-q-badge" style="background:${settings.qBadgeBg || '#FFFFFF'}; color:${settings.qBadgeColor || (settings.theme === 'purple' ? '#4C1D95' : (settings.theme === 'navy' ? '#0A1931' : '#7A0000'))}; font-size:${settings.qBadgeSize || 18}px; padding:4px 14px; border-radius:14px; font-weight:800; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
                    ${activeQ.numberHtml || escapeHtml(activeQ.number || `Q.${activeIdx + 1}`)}
                  </div>
                </div>
              ` : "";
            case "english":
              return settings.showEnglish ? `
                <div class="slide-freeform-box slide-eng-section" style="display:flex; flex-direction:column; justify-content:${settings.valign === 'middle' || settings.valign === 'center' ? 'center' : (settings.valign === 'bottom' ? 'flex-end' : 'flex-start')}; transform:translate(${settings.engPosX || 0}px, ${settings.engPosY || 0}px); width:${settings.engWidth ? `${settings.engWidth}%` : '100%'};">
                  <div class="slide-eng-text" style="color:${settings.engColor || '#111111'}; font-size:${settings.engFontSize || 18}px; font-family:${settings.engFontFamily || 'Segoe UI, Arial, sans-serif'}; text-align:${settings.textAlign || 'left'}; line-height:${settings.lineHeight || 1.34};">${activeQ.englishHtml || escapeHtml(activeQ.english || '')}</div>
                </div>
              ` : "";
            case "divider":
              return settings.showDivider ? `
                <div class="slide-freeform-box slide-divider-wrapper" style="display:block; width:${settings.dividerWidth ? `${settings.dividerWidth}%` : '100%'}; transform:translate(${settings.dividerPosX || 0}px, ${settings.dividerPosY || 0}px); margin:${settings.dividerSpacing || 4}px 0;">
                  <div class="slide-divider" style="border-top:${settings.dividerThickness || 2}px solid ${settings.dividerColor || '#A30000'}; width:100%;"></div>
                </div>
              ` : "";
            case "hindi":
              return settings.showHindi ? `
                <div class="slide-freeform-box slide-hindi-section" style="display:flex; flex-direction:column; justify-content:${settings.valign === 'middle' || settings.valign === 'center' ? 'center' : (settings.valign === 'bottom' ? 'flex-end' : 'flex-start')}; transform:translate(${settings.hindiPosX || 0}px, ${settings.hindiPosY || 0}px); width:${settings.hindiWidth ? `${settings.hindiWidth}%` : '100%'};">
                  <div class="slide-hindi-text" style="color:${settings.hindiColor || '#7A0000'}; font-size:${settings.hindiFontSize || 17}px; font-family:${settings.hindiFontFamily || 'Mangal, Noto Sans Devanagari, Arial, sans-serif'}; text-align:${settings.textAlign || 'left'}; line-height:${settings.lineHeight || 1.34};">${activeQ.hindiHtml || escapeHtml(activeQ.hindi || '')}</div>
                </div>
              ` : "";
            case "exam":
              return (settings.showExamTag && (examTagPos === 'below-question' || examTagPos === 'above-options')) ? `
                <div class="slide-exam-section" style="display:inline-flex; transform:translate(${settings.examTagPosX || 0}px, ${settings.examTagPosY || 0}px);">
                  <div class="slide-standalone-exam-tag" data-style="${examTagStyle}" style="
                    background:${examTagStyle === 'pill' ? (settings.examTagBg || '#DC2626') : (examTagStyle === 'highlight' ? '#FEF08A' : 'transparent')};
                    color:${examTagStyle === 'pill' ? (settings.examTagColor || '#FFFFFF') : (examTagStyle === 'highlight' ? '#854D0E' : (settings.examColor || '#FFFFFF'))};
                    font-size:${settings.examFontSize || 15}px;
                    border-radius:${settings.examTagRadius !== undefined ? `${settings.examTagRadius}px` : (examTagStyle === 'pill' ? '18px' : '4px')};
                    padding:${settings.examTagPaddingY !== undefined ? settings.examTagPaddingY : 4}px ${settings.examTagPaddingX !== undefined ? settings.examTagPaddingX : (examTagStyle === 'pill' ? 14 : 6)}px;
                    font-weight:800;
                    box-shadow:${examTagStyle === 'pill' ? '0 2px 6px rgba(0,0,0,0.35)' : 'none'};
                  ">
                    ${activeQ.examHtml || escapeHtml(activeQ.exam || settings.defaultExam || '(Exam Name)')}
                  </div>
                </div>
              ` : "";
            case "options":
              return (settings.showOptions && activeQ.options && activeQ.options.length > 0) ? `
                <div class="slide-freeform-box slide-options-container" data-layout="${settings.optionsLayout || '2-col'}" data-option-style="${settings.optionStyle || 'card'}" style="display:grid; width:${settings.optionWidthPercent || 96}%; gap:${settings.optionGap || 10}px; transform:translate(${settings.optionsPosX || 0}px, ${settings.optionsPosY || 0}px);">
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
                      <div class="slide-opt-text" style="color:${settings.optionTextColor || (settings.optionStyle === 'clean' && settings.theme === 'dark' ? '#FFFFFF' : '#111111')}; font-size:${settings.optionFontSize || 18}px; font-family:${settings.optionFontFamily || settings.engFontFamily || 'Segoe UI, Arial, sans-serif'}; text-align:${settings.optionAlign || 'left'};">
                        ${opt.textHtml || escapeHtml(opt.text || '')}
                      </div>
                    </div>
                  `).join("")}
                </div>
              ` : "";
            default:
              return "";
          }
        }).join("")}
      </div>

      <!-- Slide Floating Images Layer -->
      ${getQuestionImages(activeQ).map((img, imgIdx) => {
        const opacityVal = img.opacity !== undefined ? img.opacity : 100;
        const brightVal = img.brightness !== undefined ? img.brightness : 0;
        const contrastVal = img.contrast !== undefined ? img.contrast : 0;
        let filterCss = `opacity(${opacityVal}%) brightness(${100 + Number(brightVal)}%) contrast(${100 + Number(contrastVal)}%)`;
        if (img.filter === "grayscale") filterCss += " grayscale(100%)";
        else if (img.filter === "invert") filterCss += " invert(100%)";
        else if (img.filter === "high-contrast") filterCss += " contrast(180%) brightness(110%)";
        else if (img.filter === "gold") filterCss += " sepia(80%) saturate(200%) hue-rotate(5deg)";
        else if (img.filter === "blue") filterCss += " sepia(50%) saturate(200%) hue-rotate(180deg)";

        const rot = img.rotation || 0;
        const scX = img.flipH ? -1 : 1;
        const scY = img.flipV ? -1 : 1;
        const transformStyle = `translate(${(img.posX || 0)}px, ${(img.posY || 0)}px) rotate(${rot}deg) scale(${scX}, ${scY})`;

        return `
          <div class="slide-image-container" style="position:absolute; transform:${transformStyle}; width:${(img.width || 360)}px; height:${(img.height || 202)}px; z-index:${40 + imgIdx};">
            <div class="slide-image-wrapper">
              <img src="${typeof img === 'string' ? img : img.dataUrl}" alt="Question Diagram ${imgIdx + 1}" style="filter:${filterCss};" />
            </div>
          </div>
        `;
      }).join("")}

      <!-- Footer Bar -->
      <div class="slide-footer-bar" style="display:${isBlankSlide || !settings.showFooter ? 'none' : 'flex'}; background:${settings.footerBg || '#7A0000'}; color:${settings.footerColor || '#FFFFFF'}; height:${settings.footerHeight || 28}px; font-size:${settings.footerFontSize || 13}px;">
        ${settings.footerHtml || escapeHtml(settings.footerText || '')}
      </div>
          </div>
        </div>
      </div>
    </main>
  `;
}
