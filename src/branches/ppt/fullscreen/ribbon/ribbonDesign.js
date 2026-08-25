// Fullscreen Design Ribbon Tab
export function renderRibbonDesign(state, settings) {
  return `
    <div class="ppt-fs-ribbon-panel" role="toolbar" aria-label="Design Ribbon">
      <!-- Theme Presets Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; gap:6px;">
          <button class="ppt-fs-theme-card ${settings.theme === 'dark' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="dark" title="Dark Board (Digital Board / YouTube)">
            <span class="ppt-fs-theme-swatch" style="background:#0B0F17; border:1px solid #555;"></span>
            <span>Dark Board</span>
          </button>
          <button class="ppt-fs-theme-card ${settings.theme === 'maroon' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="maroon" title="Classic SSC Maroon">
            <span class="ppt-fs-theme-swatch" style="background:#7A0000;"></span>
            <span>SSC Maroon</span>
          </button>
          <button class="ppt-fs-theme-card ${settings.theme === 'navy' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="navy" title="Royal Navy">
            <span class="ppt-fs-theme-swatch" style="background:#0A1931;"></span>
            <span>Royal Navy</span>
          </button>
          <button class="ppt-fs-theme-card ${settings.theme === 'emerald' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="emerald" title="Emerald Pro">
            <span class="ppt-fs-theme-swatch" style="background:#064E3B;"></span>
            <span>Emerald Pro</span>
          </button>
        </div>
        <div class="ppt-fs-ribbon-group-title">Themes Palette</div>
      </div>

      <!-- Color Customizer Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; align-items:center; gap:8px;">
          <label style="display:flex; flex-direction:column; align-items:center; font-size:10px; color:#8b949e; gap:2px;">
            <span>Header Bg</span>
            <input type="color" data-ppt-setting="headerBg" value="${settings.headerBg || '#7A0000'}" />
          </label>
          <label style="display:flex; flex-direction:column; align-items:center; font-size:10px; color:#8b949e; gap:2px;">
            <span>Slide Bg</span>
            <input type="color" data-ppt-setting="slideBg" value="${settings.slideBg || '#FFFFFF'}" />
          </label>
          <label style="display:flex; flex-direction:column; align-items:center; font-size:10px; color:#8b949e; gap:2px;">
            <span>Hindi Color</span>
            <input type="color" data-ppt-setting="hindiColor" value="${settings.hindiColor || '#7A0000'}" />
          </label>
          <label style="display:flex; flex-direction:column; align-items:center; font-size:10px; color:#8b949e; gap:2px;">
            <span>Divider</span>
            <input type="color" data-ppt-setting="dividerColor" value="${settings.dividerColor || '#A30000'}" />
          </label>
        </div>
        <div class="ppt-fs-ribbon-group-title">Colors & Background</div>
      </div>
    </div>
  `;
}
