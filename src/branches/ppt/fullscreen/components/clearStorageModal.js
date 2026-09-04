// Double Confirmation Pop-up Modal for Clearing All Data & Local Storage
export function renderClearStorageModalHtml(state) {
  const ppt = state.ppt || {};
  if (!ppt.showClearStorageModal) return "";

  const slideCount = ppt.questions?.length || 0;

  return `
    <div class="ppt-modal-backdrop ppt-clear-modal-backdrop" role="dialog" aria-modal="true" aria-label="Clear All Data Confirmation">
      <div class="ppt-wizard-modal ppt-clear-confirm-modal" style="max-width: 480px; border: 1.5px solid #ef4444; box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 25px rgba(239, 68, 68, 0.25);">
        <!-- Modal Header -->
        <header class="ppt-wizard-header" style="background: #1c1117; border-bottom: 1px solid #7f1d1d; padding: 14px 18px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:24px;">⚠️</span>
            <div>
              <h3 style="margin:0; font-size:16px; font-weight:700; color:#f87171;">Clear All Data & Local Storage?</h3>
              <span style="font-size:11px; color:#fca5a5;">Permanent reset to fresh blank template</span>
            </div>
          </div>
          <button class="ppt-btn" data-action="ppt-close-clear-modal" style="padding:4px 10px; font-weight:700; background:transparent; color:#9ca3af; border:none; cursor:pointer;" title="Cancel (Esc)">✕</button>
        </header>

        <!-- Modal Body -->
        <div style="padding: 20px 22px; display:flex; flex-direction:column; gap:14px; background:#0d1117; color:#e6edf3;">
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 12px 14px; font-size: 12.5px; line-height: 1.5;">
            <p style="margin: 0 0 6px 0; font-weight: 700; color: #f87171;">
              Are you sure you want to delete everything?
            </p>
            <p style="margin: 0; color: #cbd5e1; font-size: 12px;">
              This will permanently delete <b>${slideCount} slide${slideCount === 1 ? '' : 's'}</b>, all inserted diagram images, custom background templates, and stored settings from your browser's local storage.
            </p>
          </div>

          <div style="font-size: 11.5px; color: #8b949e; display: flex; align-items: center; gap: 6px;">
            <span>💡</span>
            <span>A fresh, clean SSC slide template will be created after reset.</span>
          </div>

          <!-- Action Buttons -->
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px; padding-top: 12px; border-top: 1px solid #21262d;">
            <button type="button" class="ppt-btn" data-action="ppt-close-clear-modal" style="padding:8px 16px; font-size:13px; font-weight:600; background:#21262d; color:#c9d1d9; border:1px solid #30363d; border-radius:6px; cursor:pointer;">
              Cancel
            </button>
            <button type="button" class="ppt-btn ppt-btn-danger" data-action="ppt-confirm-clear-storage" style="padding:8px 18px; font-size:13px; font-weight:700; background:#dc2626; color:#ffffff; border:none; border-radius:6px; cursor:pointer; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);" title="Confirm permanent reset">
              ⚠️ Yes, Clear Everything
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
