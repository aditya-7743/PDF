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

      <!-- Math Formulas & LaTeX Palette Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:grid; grid-template-columns:repeat(10, auto); gap:2px;">
          <button class="ppt-fs-math-btn" data-ppt-latex="\\frac{a}{b}" title="Fraction: \\frac{a}{b}">a/b</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\sqrt{x}" title="Square Root: \\sqrt{x}">√x</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="^{2}" title="Power: x²">x²</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="_{1}" title="Subscript: x₁">x₁</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\left( | \\right)" title="Auto Bracket: ( )">( )</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\pm" title="Plus-Minus: \\pm">±</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\times" title="Multiply: \\times">×</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\div" title="Divide: \\div">÷</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\pi" title="Pi: \\pi">π</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\theta" title="Theta: \\theta">θ</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\approx" title="Approximately: \\approx">≈</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\le" title="Less than equal: \\le">≤</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\ge" title="Greater than equal: \\ge">≥</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\neq" title="Not equal: \\neq">≠</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="^\\circ" title="Degree: ^\\circ">°</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\Delta" title="Delta: \\Delta">Δ</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\sum" title="Summation: \\sum">∑</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\int" title="Integral: \\int">∫</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\infty" title="Infinity: \\infty">∞</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="\\angle" title="Angle: \\angle">∠</button>
        </div>
        <div class="ppt-fs-ribbon-group-title">Symbols & Math Formulas</div>
      </div>
    </div>
  `;
}
