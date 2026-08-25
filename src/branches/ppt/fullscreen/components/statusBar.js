// Fullscreen Bottom Status Bar
export function renderStatusBar(state) {
  const ppt = state.ppt || {};
  const questions = ppt.questions && ppt.questions.length ? ppt.questions : [];
  const activeIdx = Math.max(0, Math.min(ppt.activeQuestionIndex || 0, Math.max(0, questions.length - 1)));
  const zoomLevel = ppt.fsZoom || 100;

  return `
    <footer class="ppt-fs-statusbar">
      <div class="ppt-fs-status-left">
        <span class="ppt-fs-status-item">Slide ${activeIdx + 1} of ${Math.max(1, questions.length)}</span>
        <span class="ppt-fs-status-item">English / Hindi (Maths)</span>
      </div>

      <div class="ppt-fs-status-right">
        <!-- Quick Nav -->
        <button class="ppt-fs-status-btn" data-action="ppt-prev-slide" title="Previous Slide (PageUp)" ${activeIdx <= 0 ? 'disabled' : ''}>◀ Prev</button>
        <button class="ppt-fs-status-btn" data-action="ppt-next-slide" title="Next Slide (PageDown)" ${activeIdx >= questions.length - 1 ? 'disabled' : ''}>Next ▶</button>

        <!-- Zoom Slider -->
        <div class="ppt-fs-zoom-controls">
          <button class="ppt-fs-status-btn" data-action="ppt-fs-zoom-dec" title="Zoom Out (−)">−</button>
          <input type="range" min="50" max="150" step="5" value="${zoomLevel}" data-ppt-fs-zoom class="ppt-fs-zoom-slider" title="Slide Zoom (${zoomLevel}%)" />
          <span class="ppt-fs-zoom-label">${zoomLevel}%</span>
          <button class="ppt-fs-status-btn" data-action="ppt-fs-zoom-inc" title="Zoom In (+)">+</button>
          <button class="ppt-fs-status-btn" data-action="ppt-fs-zoom-reset" title="Fit to Window">Fit</button>
        </div>

        <!-- Exit Full Screen -->
        <button class="ppt-fs-exit-btn" data-action="ppt-close-fullscreen" title="Exit Full Screen Mode (Esc)">
          ✕ Exit Full Screen
        </button>
      </div>
    </footer>
  `;
}
