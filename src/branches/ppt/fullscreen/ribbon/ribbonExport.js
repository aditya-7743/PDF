// Fullscreen Export Ribbon Tab (PDF Quality, Custom Range, Batch Sets Maker, Custom Naming)
import { escapeHtml } from "./ribbonCommon.js";

export function renderRibbonExport(state, settings, activeQ, activeIdx, totalSlides) {
  const exportSettings = state.ppt.exportSettings || {
    format: "pdf",
    quality: "medium",
    scope: "all",
    customRange: "",
    chunkSize: 25,
    mandatoryPrefix: "1, 2",
    fileNamePattern: "{topic}_Q{start}-Q{end}"
  };

  const topicName = activeQ.topic || settings.topic || "Question_Slides";

  return `
    <div class="ppt-fs-ribbon-panel" role="toolbar" aria-label="Export Ribbon">
      <!-- 1. Quality Presets Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; gap:2px;">
            <button class="ppt-fs-ribbon-btn-sm ${exportSettings.quality === 'low' ? 'is-active' : ''}" data-action="ppt-set-export-quality" data-quality="low" title="Fast render, smaller file size (1280x720) - Ideal for WhatsApp">
              ⚡ Low (Fast)
            </button>
            <button class="ppt-fs-ribbon-btn-sm ${(exportSettings.quality || 'medium') === 'medium' ? 'is-active' : ''}" data-action="ppt-set-export-quality" data-quality="medium" title="Crisp High Definition (1920x1080) - Recommended">
              ⭐ Medium (HD)
            </button>
            <button class="ppt-fs-ribbon-btn-sm ${exportSettings.quality === 'high' ? 'is-active' : ''}" data-action="ppt-set-export-quality" data-quality="high" title="Ultra HD 4K Print Quality (3840x2160)">
              💎 Ultra (4K)
            </button>
          </div>
          <div style="display:flex; gap:3px; align-items:center;">
            <span style="font-size:10px; color:#8b949e;">Format:</span>
            <button class="ppt-fs-ribbon-btn-sm ${(exportSettings.format || 'pdf') === 'pdf' ? 'is-active' : ''}" data-action="ppt-set-export-format" data-format="pdf" style="font-weight:700; color:#7ee787;">
              📄 PDF
            </button>
            <button class="ppt-fs-ribbon-btn-sm ${exportSettings.format === 'pptx' ? 'is-active' : ''}" data-action="ppt-set-export-format" data-format="pptx" style="font-weight:700; color:#58a6ff;">
              📊 PPTX
            </button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">1. Format & Quality</div>
      </div>

      <!-- 2. Range & Custom Page Selection -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; gap:2px; align-items:center;">
            <button class="ppt-fs-ribbon-btn-sm ${(exportSettings.scope || 'all') === 'all' ? 'is-active' : ''}" data-action="ppt-set-export-scope" data-scope="all" title="Export all ${totalSlides} slides">
              🌐 All (${totalSlides})
            </button>
            <button class="ppt-fs-ribbon-btn-sm ${exportSettings.scope === 'current' ? 'is-active' : ''}" data-action="ppt-set-export-scope" data-scope="current" title="Export Slide ${activeIdx + 1} only">
              📄 Slide ${activeIdx + 1}
            </button>
            <button class="ppt-fs-ribbon-btn-sm ${exportSettings.scope === 'range' ? 'is-active' : ''}" data-action="ppt-set-export-scope" data-scope="range" title="Select specific page numbers or ranges">
              🎯 Custom Range
            </button>
            <button class="ppt-fs-ribbon-btn-sm ${exportSettings.scope === 'sets' ? 'is-active' : ''}" data-action="ppt-set-export-scope" data-scope="sets" title="Split all questions into sets of 25 with mandatory intro slides">
              📦 Sets Maker
            </button>
          </div>

          <div style="display:flex; gap:3px; align-items:center;">
            ${exportSettings.scope === 'range' ? `
              <span style="font-size:10px; color:#8b949e;">Pages:</span>
              <input type="text" class="ppt-fs-input-text" data-ppt-export-field="customRange" value="${escapeHtml(exportSettings.customRange || `1, 2, 5-20`)}" placeholder="e.g. 1, 2, 51-75" style="width:130px; font-size:10px;" title="Comma-separated pages and ranges (e.g. 1, 2, 51-75)" />
            ` : exportSettings.scope === 'sets' ? `
              <span style="font-size:10px; color:#8b949e;">Q/Set:</span>
              <input type="number" class="ppt-fs-input-num" data-ppt-export-field="chunkSize" value="${exportSettings.chunkSize || 25}" min="1" max="100" style="width:36px; font-size:10px;" title="Number of questions in each set" />
              <span style="font-size:10px; color:#8b949e; margin-left:2px;">Intro:</span>
              <input type="text" class="ppt-fs-input-text" data-ppt-export-field="mandatoryPrefix" value="${escapeHtml(exportSettings.mandatoryPrefix || '1, 2')}" placeholder="1, 2" style="width:50px; font-size:10px;" title="Slides to include at the start of EVERY set (e.g. 1, 2 for Thumbnail & WhatsApp QR)" />
            ` : `
              <span style="font-size:10px; color:#8b949e;">Exporting:</span>
              <span style="font-size:10px; color:#58a6ff; font-weight:bold;">${exportSettings.scope === 'current' ? `Slide ${activeIdx + 1} of ${totalSlides}` : `All ${totalSlides} Slides`}</span>
            `}
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">2. Page Selection & Sets</div>
      </div>

      <!-- 3. Custom File Naming Template -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; align-items:center; gap:3px;">
            <span style="font-size:10px; color:#8b949e;">Name:</span>
            <input type="text" class="ppt-fs-input-text" data-ppt-export-field="fileNamePattern" value="${escapeHtml(exportSettings.fileNamePattern || `${topicName}_Set_{set}`)}" placeholder="File name template..." style="width:145px; font-size:10px;" title="Available tokens: {topic}, {set}, {start}, {end}, {quality}" />
          </div>
          <div style="font-size:9px; color:#8b949e; display:flex; gap:2px;">
            <span>Tokens:</span>
            <span style="color:#58a6ff;">{set}</span>
            <span style="color:#58a6ff;">{start}</span>
            <span style="color:#58a6ff;">{end}</span>
            <span style="color:#58a6ff;">{topic}</span>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">3. Custom File Name</div>
      </div>

      <!-- 4. Quick Export Actions & Detailed Modal -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; align-items:center; gap:4px;">
          <button class="ppt-fs-ribbon-btn-lg" data-action="ppt-run-configured-export" style="color:#7ee787; font-weight:700;" title="Run Export with Selected Quality and Ranges">
            <span class="ppt-fs-icon">📥</span>
            <span>Export Now</span>
          </button>
          <button class="ppt-fs-ribbon-btn-lg" data-action="ppt-open-export-modal" style="color:#58a6ff;" title="Open Full Interactive Export Hub with Sets Breakdown Table">
            <span class="ppt-fs-icon">⚙️</span>
            <span>Export Hub</span>
          </button>
        </div>
        <div class="ppt-fs-ribbon-group-title">4. Action</div>
      </div>
    </div>
  `;
}
