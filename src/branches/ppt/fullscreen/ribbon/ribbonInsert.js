// Fullscreen Insert Ribbon Tab (Media, Interactive Crop, Remove BG, Adjustments & Recolor Filters)
import { escapeHtml } from "./ribbonCommon.js";
import { getActiveSelectedImage } from "../../components/imageTools.js";
import { getQuestionImages } from "../../pptUI.js";

export function renderRibbonInsert(state, settings) {
  const activeQ = state.ppt?.questions?.[state.ppt.activeQuestionIndex];
  const imgList = activeQ ? getQuestionImages(activeQ) : [];
  const selectedImg = getActiveSelectedImage(state);

  const opacity = selectedImg && selectedImg.opacity !== undefined ? selectedImg.opacity : 100;
  const brightness = selectedImg && selectedImg.brightness !== undefined ? selectedImg.brightness : 0;
  const contrast = selectedImg && selectedImg.contrast !== undefined ? selectedImg.contrast : 0;
  const currentFilter = selectedImg && selectedImg.filter ? selectedImg.filter : "none";

  const hasImage = imgList.length > 0;

  return `
    <div class="ppt-fs-ribbon-panel" role="toolbar" aria-label="Insert Ribbon">
      <!-- 1. Media & Diagrams Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; align-items:center; gap:4px;">
          <input type="file" accept="image/*" class="ppt-fs-image-hidden-input" data-action="ppt-upload-slide-image" style="display:none;" />
          <button type="button" class="ppt-fs-ribbon-btn-lg" data-action="ppt-trigger-image-upload" title="Upload Question Diagram / Graph Image">
            <span class="ppt-fs-icon">🖼️</span>
            <span>Upload Image</span>
          </button>
          <button type="button" class="ppt-fs-ribbon-btn-lg" data-action="ppt-paste-image-clipboard" title="Paste Screenshot / Image from Clipboard">
            <span class="ppt-fs-icon">📋</span>
            <span>Paste Image</span>
          </button>
          ${hasImage ? `
            <button type="button" class="ppt-fs-ribbon-btn-lg" data-action="ppt-trigger-crop-mode" data-image-id="${selectedImg ? (selectedImg.id || '') : ''}" title="Double-click image on canvas or click here to enter Crop Mode" style="color:#38bdf8;">
              <span class="ppt-fs-icon">✂️</span>
              <span>Crop Image</span>
            </button>
          ` : ''}
        </div>
        <div class="ppt-fs-ribbon-group-title">1. Media & Diagrams</div>
      </div>

      <!-- 2. Remove Background Group -->
      <div class="ppt-fs-ribbon-group" style="${!hasImage ? 'opacity:0.4; pointer-events:none;' : ''}">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px; justify-content:center;">
          <div style="display:flex; gap:3px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-remove-image-bg" data-image-id="${selectedImg ? (selectedImg.id || '') : ''}" title="Automatically remove white background to make diagram transparent" style="font-weight:700; color:#10b981;">
              🪄 Remove White BG
            </button>
          </div>
          <div style="display:flex; gap:3px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-make-transparent-math" data-image-id="${selectedImg ? (selectedImg.id || '') : ''}" title="High-contrast transparent math formula extraction">
              ✨ Clean Formula BG
            </button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">2. Remove BG</div>
      </div>

      <!-- 3. Adjustments (Opacity, Brightness, Contrast) -->
      <div class="ppt-fs-ribbon-group" style="${!hasImage ? 'opacity:0.4; pointer-events:none;' : ''}">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; gap:8px; align-items:center;">
          <div style="display:flex; flex-direction:column; gap:2px; min-width:110px;">
            <!-- Opacity -->
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; font-weight:700;">
              <span>Opacity</span>
              <span data-ppt-img-val="opacity">${opacity}%</span>
            </div>
            <input type="range" class="ppt-fs-slider-sm" data-ppt-img-adj="opacity" min="0" max="100" value="${opacity}" style="width:100px;" />

            <!-- Brightness -->
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; font-weight:700;">
              <span>Brightness</span>
              <span data-ppt-img-val="brightness">${brightness}%</span>
            </div>
            <input type="range" class="ppt-fs-slider-sm" data-ppt-img-adj="brightness" min="-100" max="100" value="${brightness}" style="width:100px;" />
          </div>

          <div style="display:flex; flex-direction:column; gap:2px; min-width:110px;">
            <!-- Contrast -->
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; font-weight:700;">
              <span>Contrast</span>
              <span data-ppt-img-val="contrast">${contrast}%</span>
            </div>
            <input type="range" class="ppt-fs-slider-sm" data-ppt-img-adj="contrast" min="-100" max="100" value="${contrast}" style="width:100px;" />

            <!-- Reset Button -->
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-reset-image-adjustments" style="margin-top:2px; justify-content:center; font-size:10px;">
              ↺ Reset
            </button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">3. Adjustments</div>
      </div>

      <!-- 4. Recolor & Filters Group -->
      <div class="ppt-fs-ribbon-group" style="${!hasImage ? 'opacity:0.4; pointer-events:none;' : ''}">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px; justify-content:center;">
          <div style="display:flex; gap:3px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentFilter === 'none' ? 'is-active' : ''}" data-action="ppt-set-image-filter" data-filter="none" title="Original Colors">
              Normal
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentFilter === 'grayscale' ? 'is-active' : ''}" data-action="ppt-set-image-filter" data-filter="grayscale" title="B&W Print Style">
              Grayscale
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentFilter === 'invert' ? 'is-active' : ''}" data-action="ppt-set-image-filter" data-filter="invert" title="Invert Colors (Dark Mode)">
              Invert
            </button>
          </div>
          <div style="display:flex; gap:3px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentFilter === 'high-contrast' ? 'is-active' : ''}" data-action="ppt-set-image-filter" data-filter="high-contrast" title="Crisp High Contrast">
              Hi-Contrast
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentFilter === 'gold' ? 'is-active' : ''}" data-action="ppt-set-image-filter" data-filter="gold" title="Warm Gold Tint">
              Gold
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm ${currentFilter === 'blue' ? 'is-active' : ''}" data-action="ppt-set-image-filter" data-filter="blue" title="Cool Blue Tint">
              Blue
            </button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">4. Recolor</div>
      </div>

      <!-- 5. Transform & Arrange -->
      <div class="ppt-fs-ribbon-group" style="${!hasImage ? 'opacity:0.4; pointer-events:none;' : ''}">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px; justify-content:center;">
          <div style="display:flex; gap:3px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-rotate-image" data-deg="90" title="Rotate 90° Clockwise">
              🔄 Rotate
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-flip-image-h" title="Flip Horizontally">
              ⇋ Flip H
            </button>
          </div>
          <div style="display:flex; gap:3px;">
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-flip-image-v" title="Flip Vertically">
              ⇅ Flip V
            </button>
            <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-remove-image" data-image-id="${selectedImg ? (selectedImg.id || '') : ''}" title="Delete Selected Image" style="color:#ef4444;">
              🗑️ Delete
            </button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">5. Arrange</div>
      </div>
    </div>
  `;
}
