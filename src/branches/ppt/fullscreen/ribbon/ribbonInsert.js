// Fullscreen Insert Ribbon Tab
export function renderRibbonInsert(state, settings) {
  return `
    <div class="ppt-fs-ribbon-panel" role="toolbar" aria-label="Insert Ribbon">
      <!-- Media Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; align-items:center; gap:4px;">
          <button class="ppt-fs-ribbon-btn-lg" data-action="ppt-trigger-image-upload" title="Upload Question Diagram / Graph Image">
            <span class="ppt-fs-icon">🖼️</span>
            <span>Upload Image</span>
          </button>
          <button class="ppt-fs-ribbon-btn-lg" data-action="ppt-paste-image-clipboard" title="Paste Screenshot / Image from Clipboard">
            <span class="ppt-fs-icon">📋</span>
            <span>Paste Image</span>
          </button>
        </div>
        <div class="ppt-fs-ribbon-group-title">Media & Diagrams</div>
      </div>
    </div>
  `;
}
