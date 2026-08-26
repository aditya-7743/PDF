// Fullscreen Left Sidebar Slide Thumbnails Strip (100% True 1:1 Live Slide WYSIWYG Mirror)
import { getSlideSettings } from "../../../pptBranch.js";
import { getQuestionImages } from "../../pptUI.js";
import { escapeHtml } from "../ribbon/ribbonCommon.js";

export function renderThumbnailSlideHtml(q, settings, idx) {
  const isBlank = (q.layout === "blank");
  const imgList = getQuestionImages(q);
  let bgSize = "100% 100%";
  if (settings.bgFit === "cover") bgSize = "cover";
  else if (settings.bgFit === "contain") bgSize = "contain";

  const bgStyle = isBlank
    ? ((q.settings && q.settings.bgImage)
        ? `background: #000000 url('${q.settings.bgImage}') center / ${bgSize} no-repeat;`
        : `background: ${(q.settings && q.settings.slideBg) || '#FFFFFF'};`)
    : (settings.bgImage
        ? `background: #000000 url('${settings.bgImage}') center / ${bgSize} no-repeat;`
        : `background: ${settings.slideBg || '#FFFFFF'};`);


  const examTagPos = settings.examTagPosition || "below-question";
  const examTagStyle = settings.examTagStyle || "pill";

  const posXPercent = settings.boxPosX && Number(settings.boxPosX) !== 0
    ? Number(settings.boxPosX)
    : (settings.layoutPreset === "right-split" ? 42 : 0);
  const widthPercent = settings.questionBoxWidth && Number(settings.questionBoxWidth) !== 100
    ? Number(settings.questionBoxWidth)
    : (settings.layoutPreset === "right-split" || settings.layoutPreset === "left-split" ? 56 : 100);

  if (isBlank) {
    return `
      <div class="ppt-slide-canvas-wrapper" style="${bgStyle} position:relative; width:960px; height:540px; overflow:hidden;">
        ${q.english ? `
          <div style="position:absolute; top:20px; left:20px; right:20px; bottom:20px; color:#111111; font-family:${settings.engFontFamily || 'Segoe UI, Arial, sans-serif'}; font-size:${settings.engFontSize || 20}px; z-index:10;">
            ${escapeHtml(q.english)}
          </div>
        ` : ''}
        ${imgList.map((img) => {
          const imgSrc = typeof img === 'string' ? img : (img.dataUrl || img.src || '');
          return `
            <div style="position:absolute; transform:translate(${img.posX || 0}px, ${img.posY || 0}px); width:${img.width || 360}px; height:${img.height || 202}px; z-index:30;">
              <img src="${imgSrc}" style="width:100%; height:100%; object-fit:contain;" />
            </div>
          `;
        }).join("")}
        ${!imgList.length && !q.english ? `
          <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:26px; font-style:italic;">
            📄 Blank Slide
          </div>
        ` : ''}
      </div>
    `;
  }


  return `
    <div class="ppt-slide-canvas-wrapper" style="${bgStyle} position:relative; width:960px; height:540px; overflow:hidden; display:flex; flex-direction:column;">
      <!-- Header -->
      <div class="slide-header-bar" style="display:${settings.showHeader !== false ? 'flex' : 'none'}; background:${settings.headerBg || '#7A0000'}; height:${settings.headerHeight || 64}px;">
        <div style="transform:translate(${settings.qBadgePosX || 0}px, ${settings.qBadgePosY || 0}px); display:${settings.showQBadge !== false ? 'inline-flex' : 'none'}; align-items:center;">
          <div class="slide-q-badge" style="background:${settings.qBadgeBg || '#FFFFFF'}; color:${settings.qBadgeColor || '#7A0000'}; font-size:${settings.qBadgeSize || 18}px;">
            ${escapeHtml(q.number || `Q.${idx + 1}`)}
          </div>
        </div>
        <div class="slide-exam-title" style="transform:translate(${settings.examTagPosX || 0}px, ${settings.examTagPosY || 0}px); color:${settings.examColor || '#FFFFFF'}; font-size:${settings.examFontSize || 19}px; display:${settings.showExamTag !== false && examTagPos === 'header' ? 'inline-block' : 'none'};">
          ${escapeHtml(q.exam || settings.defaultExam || 'SSC CGL (Shift 1)')}
        </div>
        <div class="slide-topic-title" style="transform:translate(${settings.topicPosX || 0}px, ${settings.topicPosY || 0}px); color:${settings.topicColor || '#FFD700'}; font-size:${settings.topicFontSize || 20}px; font-weight:bold;">
          ${escapeHtml((q.topic || settings.topic || 'TOPIC').toUpperCase())}
        </div>
      </div>

      <!-- Body Content -->
      <div class="slide-body-content" style="padding:${settings.questionPadding || 16}px 24px; transform:translate(${posXPercent}%, ${settings.boxPosY || 0}px); width:${widthPercent}%; flex:1; display:flex; flex-direction:column;">
        <!-- Standalone Q Badge when Header is Hidden -->
        <div style="display:${settings.showHeader === false && settings.showQBadge !== false ? 'inline-flex' : 'none'}; align-items:center; margin-bottom:8px; transform:translate(${settings.qBadgePosX || 0}px, ${settings.qBadgePosY || 0}px);">
          <div class="slide-q-badge" style="background:${settings.qBadgeBg || '#FFFFFF'}; color:${settings.qBadgeColor || (settings.theme === 'purple' ? '#4C1D95' : (settings.theme === 'navy' ? '#0A1931' : '#7A0000'))}; font-size:${settings.qBadgeSize || 16}px; padding:4px 14px; border-radius:14px; font-weight:700;">
            ${escapeHtml(q.number || `Q.${idx + 1}`)}
          </div>
        </div>


        <!-- English -->
        <div style="display:${settings.showEnglish !== false ? 'block' : 'none'}; transform:translate(${settings.engPosX || 0}px, ${settings.engPosY || 0}px); width:${settings.engWidth ? `${settings.engWidth}%` : '100%'};">
          <div style="color:${settings.engColor || '#FFFFFF'}; font-size:${settings.engFontSize || 20}px; font-family:${settings.engFontFamily || 'Segoe UI, Arial, sans-serif'}; font-weight:700; text-align:${settings.textAlign || 'left'}; line-height:${settings.lineHeight || 1.36};">
            ${escapeHtml(q.english || '')}
          </div>
        </div>

        <!-- Divider -->
        <div style="display:${settings.showDivider !== false ? 'block' : 'none'}; width:${settings.dividerWidth ? `${settings.dividerWidth}%` : '100%'}; transform:translate(${settings.dividerPosX || 0}px, ${settings.dividerPosY || 0}px); margin:${settings.dividerSpacing || 6}px 0;">
          <div style="border-top:${settings.dividerThickness || 2}px solid ${settings.dividerColor || '#A30000'};"></div>
        </div>

        <!-- Hindi -->
        <div style="display:${settings.showHindi !== false ? 'block' : 'none'}; transform:translate(${settings.hindiPosX || 0}px, ${settings.hindiPosY || 0}px); width:${settings.hindiWidth ? `${settings.hindiWidth}%` : '100%'};">
          <div style="color:${settings.hindiColor || '#7A0000'}; font-size:${settings.hindiFontSize || 18}px; font-family:${settings.hindiFontFamily || 'Mangal, Noto Sans Devanagari, Arial, sans-serif'}; font-weight:700; text-align:${settings.textAlign || 'left'}; line-height:${settings.lineHeight || 1.38};">
            ${escapeHtml(q.hindi || '')}
          </div>
        </div>

        <!-- Standalone Exam Tag -->
        <div style="display:${settings.showExamTag !== false && (examTagPos === 'below-question' || examTagPos === 'above-options') ? 'inline-flex' : 'none'}; transform:translate(${settings.examTagPosX || 0}px, ${settings.examTagPosY || 0}px); margin:6px 0 8px 0;">
          <div class="slide-standalone-exam-tag" data-style="${examTagStyle}" style="
            background:${examTagStyle === 'pill' ? (settings.examTagBg || '#DC2626') : (examTagStyle === 'highlight' ? '#FEF08A' : 'transparent')};
            color:${examTagStyle === 'pill' ? (settings.examTagColor || '#FFFFFF') : (examTagStyle === 'highlight' ? '#854D0E' : (settings.examColor || '#FFFFFF'))};
            font-size:${settings.examFontSize || 15}px;
            padding:${settings.examTagPaddingY !== undefined ? settings.examTagPaddingY : 4}px ${settings.examTagPaddingX !== undefined ? settings.examTagPaddingX : (examTagStyle === 'pill' ? 14 : 6)}px;
            border-radius:${settings.examTagRadius !== undefined ? `${settings.examTagRadius}px` : (examTagStyle === 'pill' ? '18px' : '4px')};
            font-weight:800;

          ">
            ${escapeHtml(q.exam || settings.defaultExam || '(SSC GD 22 Feb., 2024 Shift III)')}
          </div>
        </div>

        <!-- Options Container -->
        <div class="slide-options-container" data-layout="${settings.optionsLayout || '2-col'}" data-option-style="${settings.optionStyle || 'card'}" style="display:${settings.showOptions !== false && q.options && q.options.length > 0 ? 'grid' : 'none'}; width:${settings.optionWidthPercent || 96}%; gap:${settings.optionGap || 10}px; transform:translate(${settings.optionsPosX || 0}px, ${settings.optionsPosY || 0}px); margin-top:auto;">
          ${(q.options || []).map((opt) => `
            <div class="slide-option-item" style="
              background:${settings.optionStyle === 'clean' ? 'transparent' : (settings.optionCardBg || '#f8fafc')};
              border:${settings.optionStyle === 'clean' ? 'none' : `1.5px solid ${settings.optionCardBorder || '#e2e8f0'}`};
              border-radius:${settings.optionRadius || 8}px;
              padding:${settings.optionPadding || 8}px 12px;
              display:flex;
              align-items:center;
              gap:10px;
            ">
              <span class="slide-option-badge" style="background:${settings.optionBadgeBg || '#7A0000'}; color:${settings.optionBadgeColor || '#FFFFFF'}; font-size:${settings.optionBadgeSize || 15}px; width:${(settings.optionBadgeSize || 15) + 12}px; height:${(settings.optionBadgeSize || 15) + 12}px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-weight:bold; flex-shrink:0;">
                ${opt.key}
              </span>
              <span class="slide-option-text" style="color:${settings.optionTextColor || '#1e293b'}; font-size:${settings.optionFontSize || 17}px; font-weight:700;">
                ${escapeHtml(opt.text || '')}
              </span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Diagrams / Images -->
      ${imgList.map((img) => {
        const imgSrc = typeof img === 'string' ? img : (img.dataUrl || img.src || '');
        return `
          <div style="position:absolute; transform:translate(${img.posX || 0}px, ${img.posY || 0}px); width:${img.width || 360}px; height:${img.height || 202}px; z-index:30;">
            <img src="${imgSrc}" style="width:100%; height:100%; object-fit:contain;" />
          </div>
        `;
      }).join("")}


      <!-- Footer Bar -->
      <div class="slide-footer-bar" style="display:${settings.showFooter && !isBlank ? 'flex' : 'none'}; background:${settings.footerBg || '#7A0000'}; color:${settings.footerColor || '#FFFFFF'}; height:${settings.footerHeight || 28}px; font-size:${settings.footerFontSize || 13}px; align-items:center; justify-content:center; flex-shrink:0; margin-top:auto;">
        ${escapeHtml(settings.footerText || '')}
      </div>
    </div>
  `;
}

export function renderSlideThumbnails(state) {
  const ppt = state.ppt || {};
  const questions = ppt.questions && ppt.questions.length ? ppt.questions : [];
  const activeIdx = Math.max(0, Math.min(ppt.activeQuestionIndex || 0, Math.max(0, questions.length - 1)));
  const globalSettings = ppt.settings || {};

  return `
    <aside class="ppt-fs-thumbnails-sidebar" aria-label="Slide Thumbnails">
      <div class="ppt-fs-thumbnails-header">
        <span>SLIDES (${questions.length})</span>
        <div style="display:flex; gap:3px; align-items:center;">
          <button class="ppt-fs-btn-icon" data-action="ppt-add-blank-slide" title="Add Pure White Blank Slide (Poster / Promo / End Slide)" style="font-size:10px; padding:0 5px; width:auto; height:22px; gap:2px; font-weight:700; color:#1e293b;">
            📄+ Blank
          </button>
          <button class="ppt-fs-btn-icon" data-action="ppt-add-slide" title="Add Question Slide (+)" style="font-size:11px; width:22px; height:22px; font-weight:800; color:#2563eb;">
            ➕
          </button>
        </div>
      </div>

      <div class="ppt-fs-thumbnails-list">
        ${questions.map((q, idx) => {
          const settings = getSlideSettings(globalSettings, q);
          const isSelected = idx === activeIdx;

          return `
            <div class="ppt-fs-thumb-item ${isSelected ? 'is-selected' : ''}" data-slide-index="${idx}" title="Click to select, or Drag & Drop to reorder slide ${idx + 1}">
              <span class="ppt-fs-thumb-num">${idx + 1}</span>
              <div class="ppt-fs-thumb-card">
                <div class="ppt-fs-thumb-scaler">
                  ${renderThumbnailSlideHtml(q, settings, idx)}
                </div>
              </div>
              <div class="ppt-fs-thumb-actions">
                <button type="button" class="ppt-fs-thumb-action-btn" data-action="ppt-move-slide-up" data-slide-index="${idx}" title="Move Slide Up (▲)" ${idx === 0 ? 'disabled' : ''}>▲</button>
                <button type="button" class="ppt-fs-thumb-action-btn" data-action="ppt-move-slide-down" data-slide-index="${idx}" title="Move Slide Down (▼)" ${idx === questions.length - 1 ? 'disabled' : ''}>▼</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </aside>
  `;
}

