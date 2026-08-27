// Fullscreen Editor Ribbon Tab
import { escapeHtml } from "./ribbonCommon.js";

export function renderRibbonEditor(state, settings, activeQ, activeIdx, totalSlides, applyScope) {
  const currentFont = settings.engFontFamily || "Segoe UI, Arial, sans-serif";
  const fontSize = settings.engFontSize || 19;
  const textColor = settings.engColor || "#111111";
  const highlightColor = settings.highlightColor || "#ffeb3b";

  return `
    <div class="ppt-fs-ribbon-panel" role="toolbar" aria-label="Editor Ribbon">
      <!-- History Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-undo" title="Undo Last Change (Ctrl+Z)">
            <span>↶ Undo</span>
          </button>
          <button type="button" class="ppt-fs-ribbon-btn-sm" data-action="ppt-redo" title="Redo Next Change (Ctrl+Y)">
            <span>↷ Redo</span>
          </button>
        </div>
        <div class="ppt-fs-ribbon-group-title">History</div>
      </div>

      <!-- Clipboard Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:2px;">
          <button class="ppt-fs-ribbon-btn-lg" data-action="ppt-paste-image-clipboard" title="Paste Image or Text from Clipboard (Ctrl+V)">
            <span class="ppt-fs-icon">📋</span>
            <span>Paste</span>
          </button>
        </div>
        <div class="ppt-fs-ribbon-group-title">Clipboard</div>
      </div>

      <!-- Slides Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; gap:3px;">
            <button class="ppt-fs-ribbon-btn-sm" data-action="ppt-add-slide" title="Add Question Slide (+)">➕ New Slide</button>
            <button class="ppt-fs-ribbon-btn-sm" data-action="ppt-add-blank-slide" title="Add 100% Pure White Blank Slide">📄 Blank Slide</button>
          </div>
          <div style="display:flex; gap:3px;">
            <button class="ppt-fs-ribbon-btn-sm" data-action="ppt-duplicate-slide" title="Duplicate Active Slide">📑 Duplicate</button>
            <button class="ppt-fs-ribbon-btn-sm" data-action="ppt-delete-slide" title="Delete Active Slide">🗑️ Delete</button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">Slides</div>
      </div>

      <!-- Font Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <!-- Font Family & Font Size -->
          <div style="display:flex; align-items:center; gap:3px;">
            <select class="ppt-fs-select" data-ppt-tb-action="fontFamily" title="Font Family" style="width:115px;">
              <option value="Segoe UI, Arial, sans-serif"${currentFont.includes("Segoe") ? " selected" : ""}>Segoe UI</option>
              <option value="'Mangal', 'Noto Sans Devanagari', sans-serif"${currentFont.includes("Mangal") ? " selected" : ""}>Mangal (Hindi)</option>
              <option value="'Times New Roman', serif"${currentFont.includes("Times") ? " selected" : ""}>Times New Roman</option>
              <option value="'Cambria Math', Cambria, serif"${currentFont.includes("Cambria") ? " selected" : ""}>Cambria Math</option>
              <option value="Arial, sans-serif"${currentFont === "Arial, sans-serif" ? " selected" : ""}>Arial</option>
              <option value="'Courier New', monospace"${currentFont.includes("Courier") ? " selected" : ""}>Courier New</option>
            </select>

            <button class="ppt-fs-btn-icon" data-ppt-tb-action="font-size-dec" title="Decrease Font Size (−)">−</button>
            <span class="ppt-fs-size-display" data-ppt-tb-size-display>${fontSize}px</span>
            <button class="ppt-fs-btn-icon" data-ppt-tb-action="font-size-inc" title="Increase Font Size (+)">+</button>
          </div>

          <!-- Bold, Italic, Underline, Colors -->
          <div style="display:flex; align-items:center; gap:3px;">
            <button class="ppt-fs-btn-icon" data-ppt-tb-format="bold" title="Bold (Ctrl+B)"><b>B</b></button>
            <button class="ppt-fs-btn-icon" data-ppt-tb-format="italic" title="Italic (Ctrl+I)"><i>I</i></button>
            <button class="ppt-fs-btn-icon" data-ppt-tb-format="underline" title="Underline (Ctrl+U)"><u>U</u></button>
            <label class="ppt-fs-color-picker" title="Text Color">
              <span style="border-bottom:2.5px solid #000000; line-height:1; font-weight:900;">A</span>
              <input type="color" data-ppt-tb-color="textColor" value="${escapeHtml(textColor)}" />
            </label>
            <label class="ppt-fs-color-picker" title="Highlight Color">
              <span style="background:#000000; color:#ffffff; padding:0 2px; border-radius:2px; font-size:9px; font-weight:900;">H</span>
              <input type="color" data-ppt-tb-color="highlightColor" value="${escapeHtml(highlightColor)}" />
            </label>
            <button class="ppt-fs-btn-icon" data-ppt-tb-action="clear-format" title="Clear Formatting (Tx)">Tx</button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">Font</div>
      </div>

      <!-- Paragraph & Alignment Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:flex; flex-direction:column; gap:3px;">
          <!-- Row 1: Horizontal & Vertical Alignments -->
          <div style="display:flex; align-items:center; gap:2px;">
            <!-- Horizontal Alignment -->
            <button class="ppt-fs-btn-icon ${(settings.textAlign || 'left') === 'left' ? 'is-active' : ''}" data-ppt-tb-action="align-left" title="Align Left">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 5h12v2H3V9zm0 5h18v2H3v-2zm0 5h12v2H3v-2z"/></svg>
            </button>
            <button class="ppt-fs-btn-icon ${settings.textAlign === 'center' ? 'is-active' : ''}" data-ppt-tb-action="align-center" title="Align Center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm3 5h12v2H6V9zm-3 5h18v2H3v-2zm3 5h12v2H6v-2z"/></svg>
            </button>
            <button class="ppt-fs-btn-icon ${settings.textAlign === 'right' ? 'is-active' : ''}" data-ppt-tb-action="align-right" title="Align Right">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm6 5h12v2H9V9zm-6 5h18v2H3v-2zm6 5h12v2H9v-2z"/></svg>
            </button>
            <button class="ppt-fs-btn-icon ${settings.textAlign === 'justify' ? 'is-active' : ''}" data-ppt-tb-action="align-justify" title="Justify">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 5h18v2H3V9zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/></svg>
            </button>

            <span style="display:inline-block; width:1px; height:18px; background:#000000; margin:0 3px;"></span>

            <!-- Vertical Alignment -->
            <button class="ppt-fs-btn-icon ${(settings.valign || 'top') === 'top' ? 'is-active' : ''}" data-ppt-tb-action="valign-top" title="Top Align">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h16v2H4V3zm8 5l5 5h-4v8h-2v-8H7l5-5z"/></svg>
            </button>
            <button class="ppt-fs-btn-icon ${settings.valign === 'middle' || settings.valign === 'center' ? 'is-active' : ''}" data-ppt-tb-action="valign-middle" title="Middle Align">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 11h16v2H4v-2zm8-8l4 4h-3v3h-2V7H8l4-4zm0 18l-4-4h3v-3h2v3h3l-4 4z"/></svg>
            </button>
            <button class="ppt-fs-btn-icon ${settings.valign === 'bottom' ? 'is-active' : ''}" data-ppt-tb-action="valign-bottom" title="Bottom Align">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 19h16v2H4v-2zm8-5l-5-5h4V1h2v8h4l-5 5z"/></svg>
            </button>
          </div>

          <!-- Row 2: Line Spacing, Lists, Indents, Clean Math -->
          <div style="display:flex; align-items:center; gap:2px;">
            <!-- Line Height Dropdown -->
            <select class="ppt-fs-select" data-ppt-tb-action="lineHeight" title="Line & Paragraph Spacing" style="width:68px; font-size:10px; padding:1px 3px;">
              <option value="1.0"${String(settings.lineHeight) === "1" ? " selected" : ""}>↕ 1.0</option>
              <option value="1.15"${String(settings.lineHeight) === "1.15" ? " selected" : ""}>↕ 1.15</option>
              <option value="1.25"${String(settings.lineHeight) === "1.25" ? " selected" : ""}>↕ 1.25</option>
              <option value="1.34"${!settings.lineHeight || String(settings.lineHeight) === "1.34" || String(settings.lineHeight) === "1.36" ? " selected" : ""}>↕ 1.34</option>
              <option value="1.5"${String(settings.lineHeight) === "1.5" ? " selected" : ""}>↕ 1.5</option>
              <option value="1.8"${String(settings.lineHeight) === "1.8" ? " selected" : ""}>↕ 1.8</option>
              <option value="2.0"${String(settings.lineHeight) === "2" ? " selected" : ""}>↕ 2.0</option>
            </select>

            <span style="display:inline-block; width:1px; height:18px; background:#000000; margin:0 2px;"></span>

            <!-- Bulleted List -->
            <button class="ppt-fs-btn-icon" data-ppt-tb-action="bullet-list" title="Bulleted List">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm5-15h12v2H9V5zm0 7h12v2H9v-2zm0 7h12v2H9v-2z"/></svg>
            </button>

            <!-- Numbered List -->
            <button class="ppt-fs-btn-icon" data-ppt-tb-action="number-list" title="Numbered List">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h2v6H4V6H3V4zm-1 9h3v1H3v1h2v1H2v1h4v-5H2v1zm1 6h2v1H3v1h1v1H3v1h3v-5H3v1zm6-15h12v2H9V5zm0 7h12v2H9v-2zm0 7h12v2H9v-2z"/></svg>
            </button>

            <!-- Indent & Outdent -->
            <button class="ppt-fs-btn-icon" data-ppt-tb-action="outdent" title="Decrease Indent (Outdent)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11 4h10v2H11V4zm0 5h10v2H11V9zm0 5h10v2H11v-2zm0 5h10v2H11v-2zM7 8v8l-4-4 4-4z"/></svg>
            </button>
            <button class="ppt-fs-btn-icon" data-ppt-tb-action="indent" title="Increase Indent">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11 4h10v2H11V4zm0 5h10v2H11V9zm0 5h10v2H11v-2zm0 5h10v2H11v-2zM3 8l4 4-4 4V8z"/></svg>
            </button>

            <span style="display:inline-block; width:1px; height:18px; background:#000000; margin:0 2px;"></span>

            <!-- Clean Math Spacing -->
            <button class="ppt-fs-btn-icon" data-ppt-tb-action="clean-math" title="Auto Fix Formula & Math Operators Spacing (+, −, ×, ÷, =)">
              ✨
            </button>
          </div>
        </div>
        <div class="ppt-fs-ribbon-group-title">Paragraph & Alignment</div>
      </div>

      <!-- Math Formulas & Symbols Palette Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:grid; grid-template-columns:repeat(10, 24px); gap:2px;">
          <button class="ppt-fs-math-btn" data-ppt-latex="²" title="Superscript 2: ²">x²</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="³" title="Superscript 3: ³">x³</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="₁" title="Subscript 1: ₁">x₁</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="₂" title="Subscript 2: ₂">x₂</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="√" title="Square Root: √">√</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="∛" title="Cube Root: ∛">∛</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="±" title="Plus-Minus: ±">±</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="×" title="Multiply: ×">×</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="÷" title="Divide: ÷">÷</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="°" title="Degree: °">°</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="π" title="Pi: π">π</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="θ" title="Theta: θ">θ</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="≈" title="Approximately: ≈">≈</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="≤" title="Less than equal: ≤">≤</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="≥" title="Greater than equal: ≥">≥</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="≠" title="Not equal: ≠">≠</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="Δ" title="Delta: Δ">Δ</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="∑" title="Summation: ∑">∑</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="∞" title="Infinity: ∞">∞</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="∠" title="Angle: ∠">∠</button>
        </div>
        <div class="ppt-fs-ribbon-group-title">Symbols & Math Formulas</div>
      </div>

    </div>
  `;
}
