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
              ⚡ Low (720p)
            </button>
            <button class="ppt-fs-ribbon-btn-sm ${(exportSettings.quality || 'medium') === 'medium' ? 'is-active' : ''}" data-action="ppt-set-export-quality" data-quality="medium" title="Crisp High Definition (1920x1080) - Standard">
              ⭐ Medium (1080p)
            </button>
            <button class="ppt-fs-ribbon-btn-sm ${exportSettings.quality === 'compact' ? 'is-active' : ''}" data-action="ppt-set-export-quality" data-quality="compact" title="Higher Resolution than Medium (2560x1440 2K) with Low Compressed File Size">
              ⚡ Medium Lite
            </button>
            <button class="ppt-fs-ribbon-btn-sm ${exportSettings.quality === 'high' ? 'is-active' : ''}" data-action="ppt-set-export-quality" data-quality="high" title="Ultra HD 4K Print Quality (3840x2160)">
              💎 Ultra (4K)
            </button>
          </div>
          <div style="display:flex; gap:3px; align-items:center;">
            <span style="font-size:10px; font-weight:600; color:#475569;">Format:</span>
            <button class="ppt-fs-ribbon-btn-sm ${(exportSettings.format || 'pdf') === 'pdf' ? 'is-active' : ''}" data-action="ppt-set-export-format" data-format="pdf" style="font-weight:700;">
              📄 PDF
            </button>
            <button class="ppt-fs-ribbon-btn-sm ${exportSettings.format === 'pptx' ? 'is-active' : ''}" data-action="ppt-set-export-format" data-format="pptx" style="font-weight:700;">
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
              <span style="font-size:10px; font-weight:600; color:#475569;">Pages:</span>
              <input type="text" class="ppt-fs-input-text" data-ppt-export-field="customRange" value="${escapeHtml(exportSettings.customRange || `1, 2, 5-20`)}" placeholder="e.g. 1, 2, 51-75" style="width:120px; font-size:10px;" title="Comma-separated pages and ranges (e.g. 1, 2, 51-75)" />
            ` : exportSettings.scope === 'sets' ? `
              <span style="font-size:10px; font-weight:600; color:#475569;">Q/Set:</span>
              <input type="number" class="ppt-fs-input-num" data-ppt-export-field="chunkSize" value="${exportSettings.chunkSize || 25}" min="1" max="100" style="width:34px; font-size:10px;" title="Number of questions in each set" />
              <span style="font-size:10px; font-weight:600; color:#475569; margin-left:2px;">Intro:</span>
              <input type="text" class="ppt-fs-input-text" data-ppt-export-field="mandatoryPrefix" value="${escapeHtml(exportSettings.mandatoryPrefix || '')}" placeholder="1, 2" style="width:42px; font-size:10px;" title="Slides to include at the start of EVERY set" />
              <span style="font-size:10px; font-weight:600; color:#475569; margin-left:2px;">Exit:</span>
              <input type="text" class="ppt-fs-input-text" data-ppt-export-field="mandatorySuffix" value="${escapeHtml(exportSettings.mandatorySuffix || '')}" placeholder="2, 7" style="width:42px; font-size:10px;" title="Slides to include at the end of EVERY set" />
            ` : `
              <span style="font-size:10px; font-weight:600; color:#475569;">Exporting:</span>
              <span style="font-size:10px; color:#2563eb; font-weight:700;">${exportSettings.scope === 'current' ? `Slide ${activeIdx + 1} of ${totalSlides}` : `All ${totalSlides} Slides`}</span>
            `}
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">2. Page Selection & Sets</div>
      </div>

      <!-- 3. Custom File Naming Template -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; align-items:center; gap:3px;">
            <span style="font-size:10px; font-weight:600; color:#475569;">Name:</span>
            <input type="text" class="ppt-fs-input-text" data-ppt-export-field="fileNamePattern" value="${escapeHtml(exportSettings.fileNamePattern || `${topicName}_Set_{set}`)}" placeholder="File name template..." style="width:145px; font-size:10px;" title="Available tokens: {topic}, {set}, {start}, {end}, {quality}" />
          </div>
          <div style="font-size:9px; color:#64748b; display:flex; gap:3px;">
            <span style="font-weight:600;">Tokens:</span>
            <span style="color:#2563eb; font-weight:600;">{set}</span>
            <span style="color:#2563eb; font-weight:600;">{start}</span>
            <span style="color:#2563eb; font-weight:600;">{end}</span>
            <span style="color:#2563eb; font-weight:600;">{topic}</span>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">3. Custom File Name</div>
      </div>

      <!-- 4. Quick Export Actions & Detailed Modal -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; align-items:center; gap:4px;">
          <button class="ppt-fs-ribbon-btn-lg" data-action="ppt-run-configured-export" title="Run Export with Selected Quality and Ranges">
            <span class="ppt-fs-icon">📥</span>
            <span>Export Now</span>
          </button>
          <button class="ppt-fs-ribbon-btn-lg" data-action="ppt-open-export-modal" title="Open Full Interactive Export Hub with Sets Breakdown Table">
            <span class="ppt-fs-icon">⚙️</span>
            <span>Export Hub</span>
          </button>
        </div>
        <div class="ppt-fs-ribbon-group-title">4. Action</div>
      </div>
    </div>
  `;
}
