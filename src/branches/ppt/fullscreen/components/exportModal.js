// Interactive Fullscreen Export Hub Modal (Quality, Custom Range, Batch Sets Maker, Custom File Naming)
import { escapeHtml } from "../ribbon/ribbonCommon.js";

/**
 * Parses a comma-separated range string like "1, 2, 5-10, 15" into a sorted array of 0-based slide indices.
 */
export function parseRangeToIndices(rangeStr, maxSlides) {
  if (!rangeStr || !rangeStr.trim()) return [];
  const indices = new Set();
  const parts = rangeStr.split(",");

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const minVal = Math.max(1, Math.min(start, end));
        const maxVal = Math.min(maxSlides, Math.max(start, end));
        for (let i = minVal; i <= maxVal; i++) {
          indices.add(i - 1);
        }
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= maxSlides) {
        indices.add(num - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Calculates batch sets of questions with mandatory intro pages.
 */
export function calculateBatchSets(totalSlides, chunkSize = 25, mandatoryPrefixStr = "1, 2", mandatorySuffixStr = "") {
  const prefixIndices = parseRangeToIndices(mandatoryPrefixStr, totalSlides);
  const suffixIndices = parseRangeToIndices(mandatorySuffixStr, totalSlides);

  const reserved = new Set([...prefixIndices, ...suffixIndices]);
  const questionIndices = [];
  for (let i = 0; i < totalSlides; i++) {
    if (!reserved.has(i)) {
      questionIndices.push(i);
    }
  }

  const sets = [];
  const size = Math.max(1, chunkSize);

  for (let i = 0; i < questionIndices.length; i += size) {
    const chunk = questionIndices.slice(i, i + size);
    const setIndices = [...prefixIndices, ...chunk, ...suffixIndices];
    const setNum = sets.length + 1;
    const startQNum = i + 1;
    const endQNum = i + chunk.length;

    sets.push({
      setNumber: setNum,
      startQNum,
      endQNum,
      qCount: chunk.length,
      totalSlideCount: setIndices.length,
      slideIndices: setIndices,
      prefixCount: prefixIndices.length,
      suffixCount: suffixIndices.length
    });
  }

  // Handle case where all slides are reserved or no questions left
  if (!sets.length && totalSlides > 0) {
    sets.push({
      setNumber: 1,
      startQNum: 1,
      endQNum: totalSlides,
      qCount: totalSlides,
      totalSlideCount: totalSlides,
      slideIndices: Array.from({ length: totalSlides }, (_, i) => i),
      prefixCount: 0,
      suffixCount: 0
    });
  }

  return sets;
}

/**
 * Formats file name according to user template pattern.
 */
export function formatFileName(pattern, vars) {
  let name = pattern || "{topic}_Set_{set}";
  const cleanTopic = (vars.topic || "Question_Slides")
    .replace(/[\|\\\/:*?"<>]/g, " ")
    .replace(/\s+/g, "_");

  name = name
    .replace(/\{\s*topic\s*\}/gi, cleanTopic)
    .replace(/\{\s*set\s*\}/gi, vars.set !== undefined ? String(vars.set) : "1")
    .replace(/\{\s*start\s*\}/gi, vars.start !== undefined ? String(vars.start) : "1")
    .replace(/\{\s*end\s*\}/gi, vars.end !== undefined ? String(vars.end) : "")
    .replace(/\{\s*quality\s*\}/gi, (vars.quality || "HD").toUpperCase())
    .replace(/[^a-zA-Z0-9_\-\.]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return name;
}

/**
 * Renders the Right-Column Preview of Generated Sets & Single Export.
 */
export function renderExportModalPreviewHtml(state) {
  const ppt = state.ppt || {};
  const questions = ppt.questions || [];
  const totalSlides = questions.length;
  const activeQ = questions[ppt.activeQuestionIndex || 0] || {};
  const topicName = (ppt.settings && ppt.settings.topic && ppt.settings.topic !== "TOPIC")
    ? ppt.settings.topic
    : ((activeQ.topic && activeQ.topic !== "TOPIC") ? activeQ.topic : ((questions[0] && questions[0].topic && questions[0].topic !== "TOPIC") ? questions[0].topic : (ppt.settings?.topic || activeQ.topic || "Maths_Questions")));

  const exp = ppt.exportSettings || {
    format: "pdf",
    quality: "medium",
    scope: "sets",
    customRange: "",
    chunkSize: 25,
    mandatoryPrefix: "1, 2",
    mandatorySuffix: "",
    fileNamePattern: "{topic}_Set_{set}_Q{start}-Q{end}"
  };

  const calculatedSets = calculateBatchSets(totalSlides, exp.chunkSize, exp.mandatoryPrefix, exp.mandatorySuffix);

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <h3 style="margin:0; font-size:13px; font-weight:700; color:#0f172a;">
        ${exp.scope === 'sets' ? `Generated Sets (${calculatedSets.length} Sets Total)` : `Export Preview`}
      </h3>
      ${exp.scope === 'sets' ? `
        <button class="ppt-export-btn-primary" data-action="ppt-batch-export-all-sets" style="padding:4px 10px; font-size:11px;">
          📦 Download All ${calculatedSets.length} Sets (Batch)
        </button>
      ` : ''}
    </div>

    <!-- Sets List / Single Download Container -->
    <div class="ppt-export-sets-list">
      ${exp.scope === 'sets' ? calculatedSets.map((s) => {
        const targetFileName = formatFileName(exp.fileNamePattern, {
          topic: topicName,
          set: s.setNumber,
          start: s.startQNum,
          end: s.endQNum,
          quality: exp.quality
        });

        return `
          <div class="ppt-export-set-card">
            <div class="ppt-export-set-info">
              <div class="ppt-export-set-header">
                <span class="ppt-export-set-badge">Set ${s.setNumber}</span>
                <span class="ppt-export-set-range">Questions ${s.startQNum} – ${s.endQNum} (${s.qCount} Qs)</span>
                <span class="ppt-export-set-pages-badge">${s.totalSlideCount} Pages</span>
              </div>
              <div class="ppt-export-set-filename" title="${escapeHtml(targetFileName)}.pdf">
                📄 <b>${escapeHtml(targetFileName)}.pdf</b>
              </div>
              <div class="ppt-export-set-subdetail">
                Includes: ${s.prefixCount ? `Intro (${exp.mandatoryPrefix}) + ` : ''}Questions (${s.startQNum} to ${s.endQNum})${s.suffixCount ? ` + Exit (${exp.mandatorySuffix})` : ''}
              </div>
            </div>
            <div class="ppt-export-set-actions">
              <button class="ppt-export-set-btn-pdf" data-action="ppt-export-single-set-pdf" data-set-num="${s.setNumber}" title="Download Set ${s.setNumber} as PDF">
                📥 PDF
              </button>
              <button class="ppt-export-set-btn-pptx" data-action="ppt-export-single-set-pptx" data-set-num="${s.setNumber}" title="Download Set ${s.setNumber} as PowerPoint PPTX">
                📊 PPTX
              </button>
            </div>
          </div>
        `;
      }).join("") : `
        <div style="padding:20px; text-align:center; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0;">
          <div style="font-size:32px; margin-bottom:8px;">📄</div>
          <h4 style="margin:0 0 4px 0; color:#0f172a; font-size:14px; font-weight:700;">
            ${exp.scope === 'range' ? `Custom Range: ${escapeHtml(exp.customRange || 'All')}` : `All Slides (1 to ${totalSlides})`}
          </h4>
          <div style="font-size:11px; color:#475569; margin-bottom:12px;">
            Target File: <b>${escapeHtml(formatFileName(exp.fileNamePattern, { topic: topicName, set: 1, start: 1, end: totalSlides, quality: exp.quality }))}.pdf</b>
          </div>
          <div style="display:flex; justify-content:center; gap:8px;">
            <button class="ppt-export-btn-primary" data-action="ppt-run-modal-single-pdf" style="padding:6px 14px; font-size:12px;">
              📥 Download PDF (${(exp.quality || 'medium').toUpperCase()})
            </button>
            <button class="ppt-export-btn-secondary" data-action="ppt-run-modal-single-pptx" style="padding:6px 14px; font-size:12px;">
              📊 Download PPTX
            </button>
          </div>
        </div>
      `}
    </div>

    <!-- Progress Bar (shown dynamically during batch/export) -->
    <div class="ppt-export-progress-container" style="display:none; margin-top:8px;">
      <div style="display:flex; justify-content:space-between; font-size:11px; color:#c9d1d9; margin-bottom:3px;">
        <span class="ppt-export-progress-label">Exporting...</span>
        <span class="ppt-export-progress-percent">0%</span>
      </div>
      <div class="ppt-export-progress-bar-bg">
        <div class="ppt-export-progress-bar-fill" style="width:0%;"></div>
      </div>
    </div>
  `;
}

/**
 * Renders the Export Hub Modal HTML.
 */
export function renderExportModalHtml(state) {
  const ppt = state.ppt || {};
  const questions = ppt.questions || [];
  const totalSlides = questions.length;
  const activeQ = questions[ppt.activeQuestionIndex || 0] || {};
  const topicName = (ppt.settings && ppt.settings.topic && ppt.settings.topic !== "TOPIC")
    ? ppt.settings.topic
    : ((activeQ.topic && activeQ.topic !== "TOPIC") ? activeQ.topic : ((questions[0] && questions[0].topic && questions[0].topic !== "TOPIC") ? questions[0].topic : (ppt.settings?.topic || activeQ.topic || "Maths_Questions")));

  const exp = ppt.exportSettings || {
    format: "pdf",
    quality: "medium",
    scope: "sets",
    customRange: "",
    chunkSize: 25,
    mandatoryPrefix: "1, 2",
    mandatorySuffix: "",
    fileNamePattern: "{topic}_Set_{set}_Q{start}-Q{end}"
  };

  return `
    <div class="ppt-export-modal-backdrop" role="dialog" aria-modal="true" aria-label="Export Hub">
      <div class="ppt-export-modal-card">
        <!-- Modal Header -->
        <div class="ppt-export-modal-header">
          <div class="ppt-export-modal-title">
            <span style="font-size:18px;">📦</span>
            <div>
              <h2 style="margin:0; font-size:16px; font-weight:700; color:#0f172a;">Export Hub & Batch Sets Generator</h2>
              <span style="font-size:11px; color:#475569;">Total Slides: <b>${totalSlides}</b> | Topic: <b>${escapeHtml(topicName)}</b></span>
            </div>
          </div>
          <button class="ppt-export-modal-close" data-action="ppt-close-export-modal" title="Close (Esc)">✕</button>
        </div>

        <!-- Modal Body: 2 Columns (Config & Live Preview Table) -->
        <div class="ppt-export-modal-body">
          <!-- Left Column: Settings -->
          <div class="ppt-export-col-config">
            <!-- 1. Quality & Format -->
            <div class="ppt-export-section">
              <label class="ppt-export-label">1. Quality & Output Format</label>
              <div class="ppt-export-btn-group" style="grid-template-columns: repeat(4, 1fr);">
                <button class="ppt-export-choice-btn ${exp.quality === 'low' ? 'is-active' : ''}" data-action="ppt-set-modal-export-quality" data-quality="low">
                  <b>⚡ Low (720p)</b>
                  <span>Fast / WhatsApp</span>
                </button>
                <button class="ppt-export-choice-btn ${(exp.quality || 'medium') === 'medium' ? 'is-active' : ''}" data-action="ppt-set-modal-export-quality" data-quality="medium">
                  <b>⭐ Medium (1080p)</b>
                  <span>Crisp HD (Standard)</span>
                </button>
                <button class="ppt-export-choice-btn ${exp.quality === 'compact' ? 'is-active' : ''}" data-action="ppt-set-modal-export-quality" data-quality="compact" style="${exp.quality === 'compact' ? 'border-color:#16a34a; background:#f0fdf4;' : ''}">
                  <b style="color:#16a34a;">⚡ Medium Lite</b>
                  <span>Quality > Medium • Low Size</span>
                </button>
                <button class="ppt-export-choice-btn ${exp.quality === 'high' ? 'is-active' : ''}" data-action="ppt-set-modal-export-quality" data-quality="high">
                  <b>💎 Ultra (4K)</b>
                  <span>Studio Print</span>
                </button>
              </div>
            </div>

            <!-- 2. Export Mode / Scope -->
            <div class="ppt-export-section">
              <label class="ppt-export-label">2. Page Selection Mode</label>
              <div class="ppt-export-btn-group">
                <button class="ppt-export-choice-btn ${exp.scope === 'sets' ? 'is-active' : ''}" data-action="ppt-set-modal-export-scope" data-scope="sets">
                  <b>📦 Batch Sets Maker</b>
                  <span>Split into 25s + Intro</span>
                </button>
                <button class="ppt-export-choice-btn ${exp.scope === 'range' ? 'is-active' : ''}" data-action="ppt-set-modal-export-scope" data-scope="range">
                  <b>🎯 Custom Range</b>
                  <span>e.g. 1, 2, 51-75</span>
                </button>
                <button class="ppt-export-choice-btn ${exp.scope === 'all' ? 'is-active' : ''}" data-action="ppt-set-modal-export-scope" data-scope="all">
                  <b>🌐 All Slides</b>
                  <span>Full ${totalSlides} Slides</span>
                </button>
              </div>
            </div>

            <!-- 3. Mode Specific Inputs -->
            ${exp.scope === 'sets' ? `
              <div class="ppt-export-section" style="background:#f8fafc; padding:10px 12px; border-radius:8px; border:1px solid #cbd5e1;">
                <label class="ppt-export-label" style="color:#2563eb; display:flex; align-items:center; gap:6px;">⚙️ Batch Sets Settings</label>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-top:6px;">
                  <div>
                    <span style="font-size:11px; font-weight:600; color:#334155; display:block; margin-bottom:3px;">Questions / Set:</span>
                    <input type="number" class="ppt-fs-input-num" data-ppt-export-field="chunkSize" value="${exp.chunkSize || 25}" min="1" max="100" style="width:100%; box-sizing:border-box; padding:4px 6px;" />
                  </div>
                  <div>
                    <span style="font-size:11px; font-weight:600; color:#334155; display:block; margin-bottom:3px;">Intro Pages (Start):</span>
                    <input type="text" class="ppt-fs-input-text" data-ppt-export-field="mandatoryPrefix" value="${escapeHtml(exp.mandatoryPrefix || '')}" placeholder="e.g. 1, 2" style="width:100%; box-sizing:border-box; padding:4px 6px;" title="Slides to add at the START of every set (e.g. 1, 2)" />
                  </div>
                  <div>
                    <span style="font-size:11px; font-weight:600; color:#334155; display:block; margin-bottom:3px;">Exit Pages (End):</span>
                    <input type="text" class="ppt-fs-input-text" data-ppt-export-field="mandatorySuffix" value="${escapeHtml(exp.mandatorySuffix || '')}" placeholder="e.g. 2, 7" style="width:100%; box-sizing:border-box; padding:4px 6px;" title="Slides to add at the END of every set (e.g. Slide 2 or Slide 7)" />
                  </div>
                </div>
                <div style="font-size:10.5px; color:#64748b; margin-top:6px; line-height:1.4;">
                  💡 <i><b>Intro Slides</b> start me add honge, aur <b>Exit Slides</b> last me add honge. Intro wale slides ko exit me bhi add kar sakte hain.</i>
                </div>
              </div>
            ` : exp.scope === 'range' ? `
              <div class="ppt-export-section" style="background:#f8fafc; padding:10px 12px; border-radius:8px; border:1px solid #cbd5e1;">
                <label class="ppt-export-label" style="color:#2563eb;">🎯 Enter Specific Pages / Ranges</label>
                <input type="text" class="ppt-fs-input-text" data-ppt-export-field="customRange" value="${escapeHtml(exp.customRange || '1, 2, 51-75')}" placeholder="e.g. 1, 2, 51-75" style="width:100%; margin-top:4px; box-sizing:border-box; font-size:12px; padding:4px 6px;" />
                <div style="font-size:10px; color:#64748b; margin-top:4px;">
                  Supports individual slides & ranges (e.g. <code>1, 2, 5-20, 51-75</code>)
                </div>
              </div>
            ` : ''}

            <!-- 4. File Naming Pattern -->
            <div class="ppt-export-section">
              <label class="ppt-export-label">3. File Name Template</label>
              <input type="text" class="ppt-fs-input-text" data-ppt-export-field="fileNamePattern" value="${escapeHtml(exp.fileNamePattern || `${topicName}_Set_{set}_Q{start}-Q{end}`)}" style="width:100%; box-sizing:border-box; font-size:12px; padding:4px 6px;" />
              <div style="display:flex; gap:4px; margin-top:4px; font-size:10px; color:#64748b;">
                <span style="font-weight:600;">Click token:</span>
                <button class="ppt-export-token-chip" data-action="ppt-insert-token" data-token="{set}">{set}</button>
                <button class="ppt-export-token-chip" data-action="ppt-insert-token" data-token="{start}">{start}</button>
                <button class="ppt-export-token-chip" data-action="ppt-insert-token" data-token="{end}">{end}</button>
                <button class="ppt-export-token-chip" data-action="ppt-insert-token" data-token="{topic}">{topic}</button>
              </div>
            </div>
          </div>

          <!-- Right Column: Calculated Sets & Download Actions -->
          <div class="ppt-export-col-preview">
            ${renderExportModalPreviewHtml(state)}
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="ppt-export-modal-footer">
          <div style="font-size:11px; color:#8b949e;">
            WYSIWYG Export Engine • All live positioning, fonts, badges & custom templates preserved.
          </div>
          <button class="ppt-fs-ribbon-btn-sm" data-action="ppt-close-export-modal">Close</button>
        </div>
      </div>
    </div>
  `;
}
