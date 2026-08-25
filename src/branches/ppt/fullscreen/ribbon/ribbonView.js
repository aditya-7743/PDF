// Fullscreen View Ribbon Tab
export function renderRibbonView(state, settings, applyScope, activeIdx) {
  return `
    <div class="ppt-fs-ribbon-panel" role="toolbar" aria-label="View Ribbon">
      <!-- Layout Preset Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; gap:4px;">
          <button class="ppt-fs-ribbon-btn-lg ${(settings.layoutPreset || 'full-width') === 'right-split' ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="right-split" title="Teacher on Left 40%, Question on Right">
            <span class="ppt-fs-icon">👨‍🏫</span>
            <span>Right Split</span>
          </button>
          <button class="ppt-fs-ribbon-btn-lg ${(settings.layoutPreset || 'full-width') === 'full-width' ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="full-width" title="Full Widescreen 100%">
            <span class="ppt-fs-icon">🖥️</span>
            <span>Full Width</span>
          </button>
          <button class="ppt-fs-ribbon-btn-lg ${settings.layoutPreset === 'left-split' ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="left-split" title="Question on Left, Teacher on Right">
            <span class="ppt-fs-icon">👩‍🏫</span>
            <span>Left Split</span>
          </button>
        </div>
        <div class="ppt-fs-ribbon-group-title">Screen Layout</div>
      </div>

      <!-- Scope Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <button class="ppt-fs-ribbon-btn-sm ${applyScope === 'all' ? 'is-active' : ''}" data-action="ppt-set-scope" data-scope="all">🌐 Master (All Slides)</button>
          <button class="ppt-fs-ribbon-btn-sm ${applyScope === 'current' ? 'is-active' : ''}" data-action="ppt-set-scope" data-scope="current">🎯 Slide ${activeIdx + 1} Only</button>
        </div>
        <div class="ppt-fs-ribbon-group-title">Apply Scope</div>
      </div>

      <!-- Reset Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; align-items:center;">
          <button class="ppt-fs-ribbon-btn-lg" data-action="ppt-reset-positions" title="Reset all dragged boxes to default 0,0">
            <span class="ppt-fs-icon">🔄</span>
            <span>Reset Layout</span>
          </button>
        </div>
        <div class="ppt-fs-ribbon-group-title">Reset</div>
      </div>
    </div>
  `;
}
