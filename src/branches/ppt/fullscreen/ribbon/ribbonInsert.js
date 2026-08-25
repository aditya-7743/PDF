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

      <!-- Math Formulas & Symbols Palette Group -->
      <div class="ppt-fs-ribbon-group">
        <div class="ppt-fs-ribbon-group-content" style="display:grid; grid-template-columns:repeat(10, auto); gap:2px;">
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
          <button class="ppt-fs-math-btn" data-ppt-latex="∞</button>
          <button class="ppt-fs-math-btn" data-ppt-latex="∠" title="Angle: ∠">∠</button>
        </div>
        <div class="ppt-fs-ribbon-group-title">Symbols & Math Formulas</div>
      </div>
    </div>
  `;
}
