// Home Workspace UI Template
// Provides a modern, responsive dashboard with 4 large interactive cards for all tools

export function renderHomeWorkbench(state = {}) {
  return `
    <main class="workbench is-home-mode" aria-label="Home Dashboard">
      <div class="home-scroll-container">
        <div class="home-container">
          
          <!-- 4 Big Interactive Blocks (Cards) -->
          <div class="home-grid" role="list" aria-label="Available Tools">
            
            <!-- Card 1: Equation Editor -->
            <article class="home-card card-equation" data-action="switch-mode" data-mode="equation" role="listitem" tabindex="0" title="Click to open Equation Editor">
              <div class="home-card-top">
                <div class="home-card-icon-box">
                  <span class="home-card-icon">∑</span>
                </div>
                <span class="home-card-tag">LaTeX & AI Math</span>
              </div>
              <div class="home-card-body">
                <h2 class="home-card-title">Equation Editor</h2>
                <p class="home-card-desc">
                  Paste ChatGPT, Gemini, or raw LaTeX formulas. Auto-fixes broken syntax, cleans delimiters, renders textbook-quality MathML, and exports to high-res PNG.
                </p>
                <ul class="home-card-features">
                  <li><span class="check-icon">✓</span> Smart Clean & Delimiter Fix</li>
                  <li><span class="check-icon">✓</span> Live WYSIWYG Editable MathML</li>
                  <li><span class="check-icon">✓</span> One-Click Copy LaTeX & MathML</li>
                  <li><span class="check-icon">✓</span> Crisp Transparent PNG Download</li>
                </ul>
              </div>
              <div class="home-card-footer">
                <button class="home-card-btn" data-action="switch-mode" data-mode="equation" type="button">
                  <span>Open Equation Editor</span>
                  <span class="btn-arrow">→</span>
                </button>
              </div>
            </article>

            <!-- Card 2: Math Figures -->
            <article class="home-card card-figures" data-action="switch-mode" data-mode="math-figures" role="listitem" tabindex="0" title="Click to open Math Figures">
              <div class="home-card-top">
                <div class="home-card-icon-box">
                  <span class="home-card-icon">📐</span>
                </div>
                <span class="home-card-tag">Geometry & Diagrams</span>
              </div>
              <div class="home-card-body">
                <h2 class="home-card-title">Math Figures</h2>
                <p class="home-card-desc">
                  Draw accurate geometric figures, triangles, polygons, coordinate grids, circles, and angles. Annotate with labels and export as vector SVG or PNG.
                </p>
                <ul class="home-card-features">
                  <li><span class="check-icon">✓</span> Triangles, Circles, Polygons & Arcs</li>
                  <li><span class="check-icon">✓</span> Snapping Grid & Coordinate Canvas</li>
                  <li><span class="check-icon">✓</span> Custom Angles, Labels & Colors</li>
                  <li><span class="check-icon">✓</span> Vector SVG & Transparent PNG Export</li>
                </ul>
              </div>
              <div class="home-card-footer">
                <button class="home-card-btn" data-action="switch-mode" data-mode="math-figures" type="button">
                  <span>Open Math Figures</span>
                  <span class="btn-arrow">→</span>
                </button>
              </div>
            </article>

            <!-- Card 3: Image Tools -->
            <article class="home-card card-images" data-action="switch-mode" data-mode="image-tools" role="listitem" tabindex="0" title="Click to open Image Tools">
              <div class="home-card-top">
                <div class="home-card-icon-box">
                  <span class="home-card-icon">🖼️</span>
                </div>
                <span class="home-card-tag">PDF Converter & Resizer</span>
              </div>
              <div class="home-card-body">
                <h2 class="home-card-title">Image Tools</h2>
                <p class="home-card-desc">
                  Combine multiple JPG, PNG, and WebP images into clean multi-page PDFs with custom page sizes and margins, or resize photos with pixel-perfect aspect ratios.
                </p>
                <ul class="home-card-features">
                  <li><span class="check-icon">✓</span> Multi-Image to PDF (A4 / Letter / Fit)</li>
                  <li><span class="check-icon">✓</span> Drag-and-Drop Image Reordering</li>
                  <li><span class="check-icon">✓</span> High-Precision Image Resizer & Scaler</li>
                  <li><span class="check-icon">✓</span> 100% Client-Side & Private</li>
                </ul>
              </div>
              <div class="home-card-footer">
                <button class="home-card-btn" data-action="switch-mode" data-mode="image-tools" type="button">
                  <span>Open Image Tools</span>
                  <span class="btn-arrow">→</span>
                </button>
              </div>
            </article>

            <!-- Card 4: PPT Builder -->
            <article class="home-card card-ppt" data-action="switch-mode" data-mode="ppt-builder" role="listitem" tabindex="0" title="Click to open PPT Builder">
              <div class="home-card-top">
                <div class="home-card-icon-box">
                  <span class="home-card-icon">📊</span>
                </div>
                <span class="home-card-tag">Bilingual Slide Studio</span>
              </div>
              <div class="home-card-body">
                <h2 class="home-card-title">PPT Builder</h2>
                <p class="home-card-desc">
                  Design bilingual (Hindi + English) question slides for teaching, MCQs, YouTube lectures, exam badges, in-place image crop, and 1-click export to PDF & PPTX.
                </p>
                <ul class="home-card-features">
                  <li><span class="check-icon">✓</span> Dual-Language Hindi + English MCQs</li>
                  <li><span class="check-icon">✓</span> Custom Themes, Badges & Header/Footer</li>
                  <li><span class="check-icon">✓</span> Canva-Style In-Place Image Selection & Crop</li>
                  <li><span class="check-icon">✓</span> 1-Click Export to 1080p / 4K PDF & PPTX</li>
                </ul>
              </div>
              <div class="home-card-footer">
                <button class="home-card-btn" data-action="switch-mode" data-mode="ppt-builder" type="button">
                  <span>Open PPT Builder</span>
                  <span class="btn-arrow">→</span>
                </button>
              </div>
            </article>

          </div>

          <!-- Bottom Privacy & Info Footer -->
          <footer class="home-footer-info">
            <div class="home-footer-pill">
              <span class="lock-icon">🔒</span>
              <span>Runs 100% locally in your browser. Fast, secure, and completely private with zero server uploads.</span>
            </div>
          </footer>

        </div>
      </div>
    </main>
  `;
}
