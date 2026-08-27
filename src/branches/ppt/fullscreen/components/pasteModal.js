// Fullscreen Paste Text Modal (Direct Questions Import)
import { escapeHtml } from "../ribbon/ribbonCommon.js";

export function renderPasteModalHtml(state) {
  const ppt = state.ppt || {};
  const currentTopic = ppt.settings?.topic || "TOPIC";

  return `
    <div class="ppt-modal-backdrop ppt-paste-modal-backdrop" role="dialog" aria-modal="true" aria-label="Paste Questions Text">
      <div class="ppt-wizard-modal" style="max-width: 820px;">
        <!-- Modal Header -->
        <header class="ppt-wizard-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:22px;">📋</span>
            <div>
              <h3 style="margin:0; font-size:16px; font-weight:700; color:#f0f6fc;">Paste Questions Text (Direct Import)</h3>
              <span style="font-size:11px; color:#8b949e;">Paste Hindi & English questions from Word, PDF, or Web to create slides automatically</span>
            </div>
          </div>
          <button class="ppt-btn" data-action="ppt-close-paste-modal" style="padding:4px 10px; font-weight:700;">✕ Close</button>
        </header>

        <!-- Modal Body -->
        <div style="padding: 16px 20px; display:flex; flex-direction:column; gap:12px; background:#0d1117;">
          <!-- Quick Toolbar -->
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <button class="ppt-btn" data-action="ppt-paste-from-clipboard-btn" style="padding:5px 12px; font-size:12px; font-weight:700; background:#238636; color:#ffffff; border:none; border-radius:6px; cursor:pointer;" title="Paste directly from your computer clipboard">
                📋 Paste from Clipboard
              </button>
              <button class="ppt-btn" data-action="ppt-load-sample-paste" style="padding:5px 12px; font-size:12px; font-weight:600; background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:6px; cursor:pointer;">
                💡 Insert Sample Question
              </button>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:12px; font-weight:700; color:#8b949e;">Default Topic:</span>
              <input type="text" 
                     class="ppt-paste-topic-input" 
                     data-ppt-paste-topic 
                     value="${escapeHtml(currentTopic)}" 
                     placeholder="e.g. PERCENTAGE" 
                     style="padding:4px 8px; font-size:12px; font-weight:700; background:#161b22; color:#f0f6fc; border:1px solid #30363d; border-radius:6px; width:140px;" />
            </div>
          </div>

          <!-- Textarea Area -->
          <textarea class="ppt-textarea ppt-paste-textarea" 
                    data-ppt-paste-input 
                    placeholder="Paste your questions here... Example format:

Q.1 If x + y = 10 and x - y = 4, find the value of x.
यदि x + y = 10 और x - y = 4 है, तो x का मान ज्ञात कीजिए।
(A) 7
(B) 6
(C) 5
(D) 3
[TOPIC: ALGEBRA]
Ans: A (SSC CGL 2024)" 
                    style="width:100%; height:260px; padding:12px; font-family:'Segoe UI', Arial, sans-serif; font-size:13px; line-height:1.5; background:#161b22; color:#f0f6fc; border:1.5px solid #30363d; border-radius:8px; resize:vertical; box-sizing:border-box; outline:none;">${escapeHtml(ppt.pasteText || "")}</textarea>

          <!-- Format Hint Footer -->
          <div style="display:flex; align-items:center; justify-content:space-between; font-size:11px; color:#8b949e; background:#161b22; padding:8px 12px; border-radius:6px; border:1px solid #30363d;">
            <span>💡 <b>Supported:</b> English & Hindi bilingual, Option tags (A)/(B)/(C)/(D), Exam tags, [TOPIC: ...]</span>
            <span>⚡ Automatically splits multiple questions</span>
          </div>
        </div>

        <!-- Modal Footer -->
        <footer class="ppt-wizard-footer" style="padding:12px 20px; background:#161b22; border-top:1px solid #30363d; display:flex; justify-content:flex-end; gap:10px;">
          <button class="ppt-btn" data-action="ppt-close-paste-modal" style="padding:8px 16px; font-size:13px; background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:6px; cursor:pointer;">
            Cancel
          </button>
          <button class="ppt-btn ppt-btn-primary" data-action="ppt-process-paste" style="padding:8px 24px; font-size:13px; font-weight:700; background:#2563eb; color:#ffffff; border:none; border-radius:6px; cursor:pointer;">
            🚀 Convert to Slides
          </button>
        </footer>
      </div>
    </div>
  `;
}
