import { branches } from "../branches/index.js";
import { renderMathMl } from "../core/mathml.js?v=gemini-paste-clean-20260705";
import { getEquationDiagnostics } from "../core/normalizer.js?v=gemini-paste-clean-20260705";

export function renderApp(state) {
  const rendered = renderMathMl(state.input);
  const diagnostics = getEquationDiagnostics(state.input);
  const mode = normalizeAppMode(state.mode);
  return `
    <div class="app-shell">
      ${renderTopbar(state)}
      ${renderWorkbench(state, rendered, diagnostics)}
      <footer class="statusbar">
        ${mode === "equation" || mode === "math-figures" || mode === "image-tools" ? "" : "<span>Paste input and edit visible output directly</span><span>Website only | Branch-based files | Local autosave</span>"}
      </footer>
    </div>
  `;
}

function renderTopbar(state) {
  const mode = normalizeAppMode(state.mode);
  return `
    <header class="topbar">
      <div class="mode-switch" role="tablist" aria-label="Workspace mode">
        <button class="mode-button${mode === "equation" ? " is-active" : ""}" data-action="switch-mode" data-mode="equation" type="button">Equation Editor</button>
        <button class="mode-button${mode === "math-figures" ? " is-active" : ""}" data-action="switch-mode" data-mode="math-figures" type="button">Math Figures</button>
        <button class="mode-button${mode === "image-tools" ? " is-active" : ""}" data-action="switch-mode" data-mode="image-tools" type="button">Image Tools</button>
      </div>
    </header>
  `;
}

function renderWorkbench(state, rendered, diagnostics) {
  const mode = normalizeAppMode(state.mode);
  if (mode === "image-tools") {
    return renderImageToolsWorkbench(state);
  }

  if (isDrawingMode(mode)) {
    return `
      <main class="workbench is-figures-mode is-empty-figures-mode" aria-label="Math Figures"></main>
    `;
  }

  return `
    ${renderEquationEditorWorkbench(state, rendered, diagnostics)}
  `;
}

function renderEquationEditorWorkbench(state, rendered, diagnostics) {
  const alignment = normalizePreviewAlignment(state.alignment);
  const canvasAlign = previewAlignmentToCanvas(alignment);
  const textAlign = previewAlignmentToText(alignment);
  const pageMargin = clampNumber(state.pageMargin, 8, 96, 32);
  const pageZoom = clampNumber(state.pageZoom, 40, 220, 100) / 100;
  const previewHtml = state.visualOverride || rendered.mathMl;

  return `
    <main class="workbench is-equation-mode is-equation-editor-mode" aria-label="Equation Editor">
      <section class="panel equation-paste-panel">
        <div class="panel-header equation-panel-header">
          <div>
            <div class="panel-title">Paste Equation</div>
            <div class="hint">Gemini / ChatGPT LaTeX</div>
          </div>
          <span class="badge">${rendered.normalized.length} chars</span>
        </div>
        ${renderEquationStatus(diagnostics)}
        <textarea class="equation-input equation-latex-input" data-bind="input" spellcheck="false" placeholder="${branches.editor.placeholder}">${escapeHtml(state.input)}</textarea>
        <div class="equation-paste-actions">
          <button class="equation-action-button" data-action="smart-clean" type="button">Clean</button>
          <button class="equation-action-button${diagnostics?.canFix ? "" : " is-disabled"}" data-action="fix-brackets" type="button"${diagnostics?.canFix ? "" : " disabled"}>Fix</button>
          <button class="equation-action-button" data-action="copy-latex" type="button">Copy LaTeX</button>
        </div>
      </section>

      <section class="panel equation-preview-panel">
        <div class="panel-header equation-panel-header">
          <div>
            <div class="panel-title">Rendered Equation</div>
            <div class="hint">Editable preview</div>
          </div>
          <div class="equation-preview-actions">
            <button class="equation-action-button" data-action="copy-png" type="button">Copy PNG</button>
            <button class="equation-action-button primary" data-action="download-png" type="button">Download PNG</button>
          </div>
        </div>
        <div class="equation-preview-stage" data-equation-zoom-surface>
          <div class="equation-canvas equation-output-canvas is-editable page-auto" data-equation-edit-canvas data-preview-alignment="${alignment}" style="background:${escapeHtml(state.background)}; --preview-align:${canvasAlign}; --page-margin:${pageMargin}px; --page-zoom:${pageZoom};">
            <div class="equation-render" contenteditable="true" spellcheck="false" data-visual-edit="true" data-base-font-size="${state.fontSize}" style="font-size:${state.fontSize}px; font-family:${escapeHtml(state.fontFamily)}; color:${escapeHtml(state.textColor)}; line-height:${state.lineHeight}; text-align:${textAlign};">
              ${previewHtml}
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderImageToolsWorkbench(state) {
  const imageTool = normalizeImageToolMode(state.imageToolMode);
  return `
    <main class="workbench is-image-tools-mode" aria-label="Image Tools">
      <aside class="panel image-tool-picker">
        <div class="panel-header">
          <div>
            <div class="panel-title">Image Tools</div>
          </div>
        </div>
        <div class="panel-body image-tool-picker-body">
          <button class="image-tool-button${imageTool === "image-to-pdf" ? " is-active" : ""}" data-action="select-image-tool" data-image-tool="image-to-pdf" type="button">Image to PDF</button>
          <button class="image-tool-button${imageTool === "image-resize" ? " is-active" : ""}" data-action="select-image-tool" data-image-tool="image-resize" type="button">Image resize</button>
        </div>
      </aside>

      ${imageTool === "image-resize" ? renderImageResizePanel() : renderImagePdfPanel()}
    </main>
  `;
}

function renderImagePdfPanel() {
  return `
      <section class="panel image-pdf-panel" data-image-pdf-tool tabindex="0">
        <div class="panel-header image-pdf-header">
          <div>
            <div class="panel-title">Image to PDF</div>
            <div class="hint">JPG, PNG, WebP</div>
          </div>
          <div class="image-pdf-actions">
            <button class="image-pdf-secondary" data-image-pdf-clear type="button">Clear</button>
            <button class="image-pdf-primary" data-image-pdf-convert type="button">Download PDF</button>
          </div>
        </div>

        <div class="image-pdf-workspace">
          <section class="image-pdf-main">
            <div class="image-pdf-dropzone" data-image-pdf-dropzone tabindex="0">
              <input class="is-hidden" data-image-pdf-file type="file" accept="image/*" multiple />
              <div class="image-pdf-drop-copy">
                <span class="image-pdf-drop-title">Add Images</span>
              </div>
              <div class="image-pdf-drop-actions">
                <button class="image-pdf-drop-button" data-image-pdf-add type="button">Browse</button>
              </div>
            </div>

            <div class="image-pdf-queue-head">
              <span data-image-pdf-count>0 images</span>
              <div class="image-pdf-queue-actions">
                <button class="image-pdf-shuffle-button" data-image-pdf-shuffle type="button" title="Randomly shuffle images">Shuffle</button>
                <button class="image-pdf-remove-all-button" data-image-pdf-clear type="button" title="Remove all images">Remove All</button>
                <label class="image-pdf-view-control">
                  <span>View</span>
                  <select data-image-pdf-view>
                    <option value="extra-large">Extra large icons</option>
                    <option value="large" selected>Large icons</option>
                    <option value="medium">Medium icons</option>
                    <option value="small">Small icons</option>
                    <option value="list">List</option>
                    <option value="details">Details</option>
                    <option value="tiles">Tiles</option>
                    <option value="content">Content</option>
                  </select>
                </label>
                <button class="image-pdf-add-inline" data-image-pdf-add type="button">Add More</button>
              </div>
            </div>
            <div class="image-pdf-queue" data-image-pdf-list></div>
          </section>

          <aside class="image-pdf-options">
            <div class="image-pdf-option-grid">
              <label class="image-pdf-field">
                <span>Page</span>
                <select data-image-pdf-option="pageSize">
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                  <option value="image">Image Size</option>
                  <option value="square">Square</option>
                </select>
              </label>
              <label class="image-pdf-field">
                <span>Orient</span>
                <select data-image-pdf-option="orientation">
                  <option value="auto">Auto</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
              <label class="image-pdf-field">
                <span>Fit</span>
                <select data-image-pdf-option="fit">
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                  <option value="stretch">Stretch</option>
                </select>
              </label>
              <label class="image-pdf-field">
                <span>Margin</span>
                <input data-image-pdf-option="marginMm" type="number" min="0" max="40" step="1" value="8" />
              </label>
              <label class="image-pdf-field">
                <span>Paper</span>
                <input data-image-pdf-option="background" type="color" value="#ffffff" />
              </label>
              <label class="image-pdf-field">
                <span>Compress</span>
                <select data-image-pdf-option="compressionMode">
                  <option value="high">High quality</option>
                  <option value="balanced" selected>Balanced</option>
                  <option value="small">Small size</option>
                </select>
              </label>
              <label class="image-pdf-field image-pdf-quality-field">
                <span>Quality <b data-image-pdf-quality-value>92%</b></span>
                <input data-image-pdf-option="quality" type="range" min="60" max="100" step="1" value="92" />
              </label>
            </div>

            <label class="image-pdf-field image-pdf-filename">
              <span>Name</span>
              <input data-image-pdf-option="filename" type="text" value="image-to-pdf" spellcheck="false" />
            </label>

            <div class="image-pdf-split-controls">
              <label class="image-pdf-field image-pdf-split-size">
                <span>Pages per PDF</span>
                <input data-image-pdf-option="splitSize" type="number" min="1" step="1" inputmode="numeric" placeholder="All" />
              </label>
              <button class="image-pdf-split-download-all" data-image-pdf-split-download-all type="button" disabled>Download All</button>
            </div>

            <div class="image-pdf-name-range-row">
              <label class="image-pdf-field image-pdf-part-pattern">
                <span>Part Name</span>
                <input data-image-pdf-option="partNamePattern" type="text" value="{name} part {n}" spellcheck="false" />
              </label>

              <label class="image-pdf-field image-pdf-range-field">
                <span>Ranges</span>
                <input data-image-pdf-option="rangeText" type="text" placeholder="1-5, 6-12" spellcheck="false" />
              </label>
            </div>

            <div class="image-pdf-split-estimate" data-image-pdf-split-estimate hidden></div>

            <div class="image-pdf-part-list" data-image-pdf-split-list hidden></div>

            <div class="image-pdf-preview" data-image-pdf-preview hidden></div>

            <div class="image-pdf-summary" hidden>
              <div class="image-pdf-status-row">
                <span data-image-pdf-status></span>
                <button class="image-pdf-cancel-button" data-image-pdf-cancel type="button" hidden>Cancel</button>
              </div>
              <div class="image-pdf-progress" data-image-pdf-progress hidden>
                <span data-image-pdf-progress-bar></span>
              </div>
            </div>
          </aside>
        </div>
      </section>
  `;
}

function renderImageResizePanel() {
  return `
      <section class="panel image-resize-panel" data-image-resize-tool tabindex="0">
        <div class="panel-header image-resize-header">
          <div>
            <div class="panel-title">Image resize</div>
            <div class="hint">PX, CM, M</div>
          </div>
          <div class="image-resize-actions">
            <button class="image-pdf-secondary" data-image-resize-clear type="button">Clear</button>
          </div>
        </div>

        <div class="image-resize-workspace">
          <section class="image-resize-main">
            <div class="image-pdf-dropzone image-resize-dropzone" data-image-resize-dropzone tabindex="0">
              <input class="is-hidden" data-image-resize-file type="file" accept="image/*" multiple />
              <div class="image-pdf-drop-copy">
                <span class="image-pdf-drop-title">Add Images</span>
              </div>
              <div class="image-pdf-drop-actions">
                <button class="image-pdf-drop-button" data-image-resize-add type="button">Browse</button>
              </div>
            </div>

            <div class="image-resize-canvas-shell">
              <div class="image-resize-canvas-head">
                <strong data-image-resize-selected-name>No image selected</strong>
                <span data-image-resize-selected-meta></span>
              </div>
              <div class="image-resize-canvas-stage">
                <canvas class="image-resize-canvas" data-image-resize-canvas></canvas>
                <div class="image-resize-canvas-empty" data-image-resize-canvas-empty>No image selected</div>
              </div>
            </div>

            <div class="image-resize-queue-head">
              <span data-image-resize-count>0 images</span>
              <div class="image-resize-queue-actions">
                <button class="image-pdf-remove-all-button" data-image-resize-clear type="button">Remove All</button>
                <button class="image-pdf-add-inline" data-image-resize-add type="button">Add More</button>
              </div>
            </div>
            <div class="image-resize-list" data-image-resize-list></div>
          </section>

          <aside class="image-pdf-options image-resize-options">
            <div class="image-pdf-option-grid image-resize-option-grid">
              <label class="image-pdf-field">
                <span>Unit</span>
                <select data-image-resize-option="unit">
                  <option value="px">Pixels</option>
                  <option value="cm">CM</option>
                  <option value="m">Meter</option>
                </select>
              </label>
              <label class="image-pdf-field">
                <span>DPI</span>
                <input data-image-resize-option="dpi" type="number" min="1" max="1200" step="1" value="300" />
              </label>
              <label class="image-pdf-field">
                <span>Width</span>
                <input data-image-resize-option="width" type="number" min="0" step="0.01" placeholder="Auto" />
              </label>
              <label class="image-pdf-field">
                <span>Height</span>
                <input data-image-resize-option="height" type="number" min="0" step="0.01" placeholder="Auto" />
              </label>
            </div>

            <label class="image-resize-check">
              <input data-image-resize-option="lockRatio" type="checkbox" checked />
              <span>Lock ratio</span>
            </label>

            <div class="image-resize-live-box" data-image-resize-live>
              <div>
                <span>Original</span>
                <strong data-image-resize-live-original>-</strong>
              </div>
              <div>
                <span>Output</span>
                <strong data-image-resize-live-output>-</strong>
              </div>
              <div>
                <span>Approx size</span>
                <strong data-image-resize-live-size>-</strong>
              </div>
            </div>

            <div class="image-resize-scale-row">
              <label class="image-pdf-field">
                <span>Percent <b data-image-resize-scale-value>100%</b></span>
                <input data-image-resize-option="scale" type="number" min="1" max="500" step="1" value="100" />
              </label>
              <label class="image-pdf-field image-resize-slider-field">
                <span>Slider</span>
                <input data-image-resize-option="scaleSlider" type="range" min="1" max="500" step="1" value="100" />
              </label>
            </div>

            <div class="image-resize-target-row">
              <label class="image-pdf-field">
                <span>Size</span>
                <input data-image-resize-option="targetSize" type="number" min="0" step="1" placeholder="Any" />
              </label>
              <label class="image-pdf-field">
                <span>Unit</span>
                <select data-image-resize-option="targetUnit">
                  <option value="kb">KB</option>
                  <option value="mb">MB</option>
                </select>
              </label>
            </div>

            <label class="image-pdf-field image-resize-quality-field">
              <span>Quality <b data-image-resize-quality-value>92%</b></span>
              <input data-image-resize-option="quality" type="range" min="20" max="100" step="1" value="92" />
            </label>

            <label class="image-pdf-field">
              <span>Name suffix</span>
              <input data-image-resize-option="suffix" type="text" value="resized" spellcheck="false" />
            </label>

            <div class="image-resize-format-grid">
              <button class="image-resize-format-button" data-image-resize-download="jpg" type="button">JPG</button>
              <button class="image-resize-format-button" data-image-resize-download="png" type="button">PNG</button>
              <button class="image-resize-format-button" data-image-resize-download="webp" type="button">WebP</button>
            </div>

            <div class="image-resize-summary" hidden>
              <span data-image-resize-status></span>
            </div>
          </aside>
        </div>
      </section>
  `;
}

function normalizeImageToolMode(value) {
  return value === "image-resize" ? "image-resize" : "image-to-pdf";
}

function normalizeAppMode(value) {
  if (value === "math-figures" || value === "image-tools") return value;
  return "equation";
}

function isDrawingMode(value) {
  return value === "math-figures";
}

function renderColumnStyle(columns = {}) {
  const defaults = branches.app.defaultColumns;
  const tools = readColumnValue(columns.tools, defaults.tools);
  const editor = readColumnValue(columns.editor, defaults.editor);
  const preview = readColumnValue(columns.preview, defaults.preview);

  return `--tools-col:${tools}fr; --editor-col:${editor}fr; --preview-col:${preview}fr;`;
}

function readColumnValue(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function renderToolsPanel(state) {
  const groups = (branches.tools.groups || []).filter((group) => ["geometry-shapes", "mensuration"].includes(group.id));
  return `
    <aside class="panel tools-panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">${escapeHtml(branches.tools.title || "Tools")}</div>
          <div class="hint">${escapeHtml(branches.tools.subtitle || "Insert templates")}</div>
        </div>
      </div>
      <div class="tools-scroll">
        <div class="panel-body tools-body">
          ${groups.length ? groups.map((group) => renderFigureIconSection(group, state)).join("") : '<div class="hint">No figures configured.</div>'}
        </div>
        ${renderManualAuthoring(state)}
      </div>
    </aside>
  `;
}

function renderFigureIconSection(group, state) {
  const figureItems = group.items.filter((item) => item.figure);
  return `
    <section class="figure-icon-section" title="${escapeHtml(group.subtitle || group.title)}">
      <div class="figure-icon-title">${escapeHtml(group.title)}</div>
      <div class="figure-icon-grid">
        ${figureItems.map((item) => renderFigureIconButton(item, state)).join("")}
      </div>
    </section>
  `;
}

function renderFigureIconButton(item, state) {
  const activeClass = state.activeToolId === item.id ? " is-active" : "";
  return `
    <button class="figure-icon-button${activeClass}" data-action="draw-figure" data-tool-id="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}">
      <svg class="figure-icon-svg" viewBox="0 0 48 48" aria-hidden="true">
        ${renderFigureIconGlyph(item.id)}
      </svg>
    </button>
  `;
}

function renderFigureIconGlyph(id) {
  const icons = {
    point: '<circle class="icon-point" cx="24" cy="24" r="4"></circle>',
    "line-segment": '<line class="icon-line" x1="8" y1="25" x2="40" y2="25"></line><circle class="icon-point" cx="8" cy="25" r="2.4"></circle><circle class="icon-point" cx="40" cy="25" r="2.4"></circle>',
    ray: '<defs><marker id="iconArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="currentColor"></path></marker></defs><line class="icon-line" marker-end="url(#iconArrow)" x1="9" y1="25" x2="39" y2="25"></line><circle class="icon-point" cx="9" cy="25" r="2.4"></circle>',
    angle: '<path class="icon-line" d="M10 38 L22 24 L39 24"></path><path class="icon-accent" d="M18 29 A8 8 0 0 0 28 24"></path>',
    triangle: '<polygon class="icon-fill" points="24,8 7,39 41,39"></polygon>',
    "right-triangle": '<polygon class="icon-fill" points="10,39 10,10 40,39"></polygon><path class="icon-thin" d="M10 31 H18 V39"></path>',
    "equilateral-triangle": '<polygon class="icon-fill" points="24,7 7,40 41,40"></polygon>',
    square: '<rect class="icon-fill" x="11" y="11" width="26" height="26"></rect>',
    rectangle: '<rect class="icon-fill" x="7" y="14" width="34" height="21"></rect>',
    parallelogram: '<polygon class="icon-fill" points="14,12 42,12 34,36 6,36"></polygon>',
    rhombus: '<polygon class="icon-fill" points="24,6 42,24 24,42 6,24"></polygon><line class="icon-dash" x1="6" y1="24" x2="42" y2="24"></line><line class="icon-dash" x1="24" y1="6" x2="24" y2="42"></line>',
    trapezium: '<polygon class="icon-fill" points="16,12 32,12 40,37 8,37"></polygon>',
    circle: '<circle class="icon-fill" cx="24" cy="24" r="16"></circle>',
    semicircle: '<path class="icon-fill" d="M8 33 A16 16 0 0 1 40 33 Z"></path>',
    sector: '<path class="icon-fill" d="M24 39 L24 9 A30 30 0 0 1 41 23 Z"></path><path class="icon-accent" d="M29 33 A10 10 0 0 0 34 24"></path>',
    ellipse: '<ellipse class="icon-fill" cx="24" cy="24" rx="18" ry="11"></ellipse>',
    "regular-polygon": '<polygon class="icon-fill" points="24,7 39,16 39,33 24,41 9,33 9,16"></polygon>',
    cube: '<polygon class="icon-fill" points="12,18 28,18 36,11 20,11"></polygon><polygon class="icon-fill" points="28,18 36,11 36,29 28,37"></polygon><rect class="icon-fill" x="12" y="18" width="16" height="19"></rect>',
    cuboid: '<polygon class="icon-fill" points="8,19 31,19 40,13 17,13"></polygon><polygon class="icon-fill" points="31,19 40,13 40,31 31,38"></polygon><rect class="icon-fill" x="8" y="19" width="23" height="19"></rect>',
    cylinder: '<ellipse class="icon-fill" cx="24" cy="12" rx="14" ry="5"></ellipse><path class="icon-fill-soft" d="M10 12 V34 A14 5 0 0 0 38 34 V12"></path><ellipse class="icon-thin no-fill" cx="24" cy="34" rx="14" ry="5"></ellipse>',
    cone: '<path class="icon-fill" d="M24 7 L9 36 A15 5 0 0 0 39 36 Z"></path><ellipse class="icon-thin no-fill" cx="24" cy="36" rx="15" ry="5"></ellipse>',
    sphere: '<circle class="icon-fill" cx="24" cy="24" r="16"></circle><ellipse class="icon-dash no-fill" cx="24" cy="24" rx="16" ry="5"></ellipse>',
    hemisphere: '<path class="icon-fill" d="M8 27 A16 16 0 0 1 40 27 A16 5 0 0 1 8 27 Z"></path><ellipse class="icon-thin no-fill" cx="24" cy="27" rx="16" ry="5"></ellipse>',
    pyramid: '<polygon class="icon-fill" points="24,7 8,35 32,40 40,24"></polygon><line class="icon-thin" x1="24" y1="7" x2="32" y2="40"></line><line class="icon-thin" x1="24" y1="7" x2="40" y2="24"></line>',
    frustum: '<ellipse class="icon-fill" cx="24" cy="12" rx="10" ry="4"></ellipse><path class="icon-fill-soft" d="M14 12 L8 35 A16 5 0 0 0 40 35 L34 12"></path><ellipse class="icon-thin no-fill" cx="24" cy="35" rx="16" ry="5"></ellipse>',
  };

  return icons[id] || '<rect class="icon-fill" x="10" y="10" width="28" height="28"></rect>';
}

function renderManualAuthoring(state) {
  const authoring = branches.tools.authoring || {};
  const toolGroups = authoring.drawToolGroups || [
    {
      id: "markup",
      title: "Image Markup",
      tools: (authoring.drawTools || []).map((tool) => tool.id),
    },
  ];

  return `
    <div class="manual-tools">
      <section class="manual-section">
        <div class="manual-title">Label Text</div>
        <div class="manual-label-row">
          <input class="manual-input" data-manual-label="true" value="${escapeHtml(state.manualLabel || "")}" spellcheck="false" aria-label="Label text" />
          <button class="manual-insert-button" data-action="insert-label-text" type="button">Insert</button>
        </div>
      </section>
      ${toolGroups.map((group) => renderDrawToolGroup(group, authoring, state)).join("")}
    </div>
  `;
}

function renderDrawToolGroup(group, authoring, state) {
  const tools = (group.tools || []).map((toolId) => findDrawTool(toolId, authoring)).filter(Boolean);
  if (!tools.length) return "";

  return `
    <section class="manual-section">
      <div class="manual-title">${escapeHtml(group.title)}</div>
      <div class="draw-grid">
        ${tools.map((tool) => renderDrawButton(tool, state)).join("")}
      </div>
    </section>
  `;
}

function findDrawTool(toolId, authoring) {
  return (authoring.drawTools || []).find((tool) => tool.id === toolId) || null;
}

function renderChapterIcon(chapter, state) {
  const activeClass = state.activeChapterId === chapter.id ? " is-active" : "";
  return `
    <button class="chapter-icon${activeClass}" data-action="author-chapter" data-chapter-id="${escapeHtml(chapter.id)}" title="${escapeHtml(chapter.title)}">
      <span>${escapeHtml(chapter.icon)}</span>
    </button>
  `;
}

function renderSnippetButton(snippet) {
  return `
    <button class="snippet-button" data-action="insert-snippet" data-snippet-id="${escapeHtml(snippet.id)}" title="${escapeHtml(snippet.latex)}">${escapeHtml(snippet.label)}</button>
  `;
}

function renderDrawButton(tool, state) {
  const activeClass = state.activeDrawTool === tool.id ? " is-active" : "";
  return `
    <button class="draw-button${activeClass}" data-action="draw-manual" data-draw-tool="${escapeHtml(tool.id)}" title="${escapeHtml(tool.title || tool.label)}">${escapeHtml(tool.label)}</button>
  `;
}

function renderEditorPanel(state, rendered, diagnostics) {
  return `
    <section class="panel editor-panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">Paste Input</div>
          <div class="hint">ChatGPT/Gemini copied equation</div>
        </div>
        <span class="badge">${rendered.normalized.length} chars</span>
      </div>
      ${renderEquationStatus(diagnostics)}
      <textarea class="equation-input" data-bind="input" spellcheck="false" placeholder="${branches.editor.placeholder}">${escapeHtml(state.input)}</textarea>
      <div class="editor-controls">
        <div class="field">
          <label>Font Size</label>
          <input data-bind="fontSize" type="range" min="${branches.preview.minFontSize}" max="${branches.preview.maxFontSize}" step="1" value="${state.fontSize}" />
        </div>
        <div class="field">
          <label>Canvas</label>
          <input data-bind="background" type="color" value="${state.background}" />
        </div>
      </div>
      <div class="panel-body">
        <div class="field">
          <label>Clean LaTeX</label>
          <textarea class="clean-output" readonly>${escapeHtml(rendered.normalized)}</textarea>
        </div>
      </div>
    </section>
  `;
}

function renderEquationStatus(diagnostics) {
  const level = diagnostics?.level || "empty";
  return `
    <div class="equation-status is-${escapeHtml(level)}" data-equation-status>
      <div>
        <strong data-equation-status-title>${escapeHtml(diagnostics?.title || "Ready")}</strong>
        <span data-equation-status-message>${escapeHtml(diagnostics?.message || "")}</span>
      </div>
      <button class="status-action${diagnostics?.canFix ? "" : " is-hidden"}" data-action="fix-brackets" data-equation-status-fix type="button">Fix Brackets</button>
    </div>
  `;
}

function renderPreviewPanel(state, rendered, diagnostics) {
  const isToolMode = isDrawingMode(normalizeAppMode(state.mode));
  const previewHtml = isToolMode ? state.visualOverride || rendered.mathMl : rendered.mathMl;
  const drawingClass = isToolMode && (state.activeFigureTool || (state.drawings || []).length) ? " has-drawing-surface" : "";
  const alignment = normalizePreviewAlignment(state.alignment);
  const canvasAlign = previewAlignmentToCanvas(alignment);
  const textAlign = previewAlignmentToText(alignment);
  const pageClass = isToolMode ? "" : ` page-${escapeHtml(normalizePagePreset(state.pagePreset))}`;
  const pageMargin = clampNumber(state.pageMargin, 8, 96, 32);
  const pageZoom = clampNumber(state.pageZoom, 50, 160, 100) / 100;
  return `
    <section class="panel preview-panel">
      ${renderPreviewToolbar(state, diagnostics)}
      <div class="canvas-shell">
        <div class="equation-canvas is-editable${drawingClass}${pageClass}" data-preview-alignment="${alignment}" style="background:${state.background}; --preview-align:${canvasAlign}; --page-margin:${pageMargin}px; --page-zoom:${pageZoom};">
          <div class="equation-render" contenteditable="true" spellcheck="false" data-visual-edit="true" data-base-font-size="${state.fontSize}" style="font-size:${state.fontSize}px; font-family:${escapeHtml(state.fontFamily)}; color:${escapeHtml(state.textColor)}; line-height:${state.lineHeight}; text-align:${textAlign};">
            ${previewHtml}
          </div>
        </div>
      </div>
      ${isToolMode ? renderFigureCustomizer(state) : ""}
    </section>
  `;
}

function renderPreviewToolbar(state, diagnostics) {
  const alignment = normalizePreviewAlignment(state.alignment);
  const toolbarState = getPreviewToolbarState(state);
  const isToolMode = isDrawingMode(normalizeAppMode(state.mode));
  return `
    <div class="preview-toolbar" role="toolbar" aria-label="Canvas editing toolbar">
      <div class="toolbar-group">
        <select class="toolbar-select toolbar-font" data-toolbar-select="fontFamily" title="Font family" aria-label="Font family">
          ${renderToolbarOption("Arial", toolbarState.fontFamily)}
          ${renderToolbarOption("Cambria Math", toolbarState.fontFamily)}
          ${renderToolbarOption("Times New Roman", toolbarState.fontFamily)}
          ${renderToolbarOption("Georgia", toolbarState.fontFamily)}
          ${renderToolbarOption("Courier New", toolbarState.fontFamily)}
        </select>
        <button class="toolbar-button" data-editor-command="font-size-decrease" title="Decrease font size">&minus;</button>
        <input class="toolbar-size-input" data-bind="fontSize" type="number" min="${branches.preview.minFontSize}" max="${branches.preview.maxFontSize}" step="1" value="${toolbarState.fontSize}" title="Font size" aria-label="Font size" />
        <button class="toolbar-button" data-editor-command="font-size-increase" title="Increase font size">+</button>
      </div>
      <div class="toolbar-group">
        <button class="toolbar-button toolbar-strong${toolbarState.bold ? " is-active" : ""}" data-editor-command="bold" title="Bold">B</button>
        <button class="toolbar-button toolbar-italic${toolbarState.italic ? " is-active" : ""}" data-editor-command="italic" title="Italic">I</button>
        <button class="toolbar-button toolbar-underline${toolbarState.underline ? " is-active" : ""}" data-editor-command="underline" title="Underline">U</button>
        <label class="toolbar-color" title="Text color">
          <span>A</span>
          <input data-toolbar-color="textColor" type="color" value="${escapeHtml(toolbarState.textColor)}" aria-label="Text color" />
        </label>
        <label class="toolbar-color" title="Highlight color">
          <span>H</span>
          <input data-toolbar-color="highlightColor" type="color" value="${escapeHtml(state.highlightColor)}" aria-label="Highlight color" />
        </label>
        <button class="toolbar-button toolbar-small-text" data-editor-command="removeFormat" title="Clear formatting">Tx</button>
      </div>
      ${isToolMode ? "" : renderEquationToolbarGroups(state, diagnostics, alignment)}
    </div>
  `;
}

function renderEquationToolbarGroups(state, diagnostics, alignment) {
  return `
    <div class="toolbar-group toolbar-template-group">
      ${equationTemplates.map(renderTemplateButton).join("")}
    </div>
    <div class="toolbar-group">
      <button class="toolbar-button toolbar-small-text" data-action="smart-clean" title="Clean pasted equation">Clean</button>
      <button class="toolbar-button toolbar-small-text${diagnostics?.canFix ? "" : " is-disabled"}" data-action="fix-brackets" title="Fix bracket mismatch"${diagnostics?.canFix ? "" : " disabled"}>Fix</button>
      <button class="toolbar-button toolbar-small-text" data-action="undo-state" title="Undo">Undo</button>
      <button class="toolbar-button toolbar-small-text" data-action="redo-state" title="Redo">Redo</button>
    </div>
    <div class="toolbar-group">
      <select class="toolbar-select toolbar-align" data-toolbar-select="alignment" title="Alignment" aria-label="Alignment">
        ${renderToolbarOption("left", alignment, "Left")}
      </select>
      <select class="toolbar-select toolbar-line" data-toolbar-select="lineHeight" title="Line height" aria-label="Line height">
        ${renderToolbarOption("1", state.lineHeight)}
        ${renderToolbarOption("1.2", state.lineHeight)}
        ${renderToolbarOption("1.5", state.lineHeight)}
        ${renderToolbarOption("2", state.lineHeight)}
      </select>
      <select class="toolbar-select toolbar-page" data-toolbar-select="pagePreset" title="Page size" aria-label="Page size">
        ${renderToolbarOption("auto", state.pagePreset, "Auto")}
        ${renderToolbarOption("a4", state.pagePreset, "A4")}
        ${renderToolbarOption("wide", state.pagePreset, "Wide")}
        ${renderToolbarOption("square", state.pagePreset, "Square")}
      </select>
      <input class="toolbar-size-input toolbar-margin-input" data-bind="pageMargin" type="number" min="8" max="96" step="2" value="${clampNumber(state.pageMargin, 8, 96, 32)}" title="Page margin" aria-label="Page margin" />
      <input class="toolbar-size-input toolbar-zoom-input" data-bind="pageZoom" type="number" min="50" max="160" step="5" value="${clampNumber(state.pageZoom, 50, 160, 100)}" title="Page zoom" aria-label="Page zoom" />
    </div>
    <div class="toolbar-group">
      <button class="toolbar-button toolbar-small-text" data-action="copy-svg" title="Copy SVG">SVG</button>
      <button class="toolbar-button toolbar-small-text" data-action="copy-png" title="Copy PNG">PNG</button>
      <button class="toolbar-button toolbar-small-text" data-action="download-png" title="Download PNG">DL</button>
      <button class="toolbar-button toolbar-small-text" data-action="print-pdf" title="Print or save PDF">PDF</button>
    </div>
  `;
}

function renderTemplateButton(template) {
  return `<button class="toolbar-button toolbar-small-text" data-editor-template="${escapeHtml(template.value)}" title="${escapeHtml(template.title)}">${escapeHtml(template.label)}</button>`;
}

const equationTemplates = [
  { label: "a/b", title: "Fraction", value: "\\frac{|}{}" },
  { label: "root", title: "Square root", value: "\\sqrt{|}" },
  { label: "x^n", title: "Power", value: "^{|}" },
  { label: "x_n", title: "Subscript", value: "_{|}" },
  { label: "( )", title: "Auto-sized bracket", value: "\\left( | \\right)" },
  { label: "sum", title: "Summation", value: "\\sum_{|}^{}" },
  { label: "int", title: "Integration", value: "\\int_{|}^{}" },
  { label: "lim", title: "Limit", value: "\\lim_{|\\to }" },
  { label: "matrix", title: "Matrix", value: "\\begin{pmatrix}| & \\\\ & \\end{pmatrix}" },
  { label: "cases", title: "Cases", value: "\\begin{cases}|, & \\\\ , & \\end{cases}" },
  { label: "pi", title: "Pi", value: "\\pi" },
  { label: "theta", title: "Theta", value: "\\theta" },
];

function renderToolbarOption(value, selectedValue, label = value) {
  const selected = String(value) === String(selectedValue) ? " selected" : "";
  return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
}

function getPreviewToolbarState(state) {
  const shape = findSelectedDrawing(state);
  if (shape?.type === "plain-text") {
    return {
      fontFamily: shape.fontFamily || state.fontFamily,
      fontSize: shape.fontSize || state.fontSize,
      textColor: shape.textColor || state.textColor,
      bold: Boolean(shape.bold),
      italic: Boolean(shape.italic),
      underline: Boolean(shape.underline),
    };
  }

  return {
    fontFamily: state.fontFamily,
    fontSize: state.fontSize,
    textColor: state.textColor,
    bold: false,
    italic: false,
    underline: false,
  };
}

function normalizePreviewAlignment(value) {
  return "left";
}

function normalizePagePreset(value) {
  return ["auto", "a4", "wide", "square"].includes(value) ? value : "auto";
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function previewAlignmentToCanvas(value) {
  if (value === "left") return "start";
  if (value === "right") return "end";
  if (value === "justify") return "stretch";
  return "center";
}

function previewAlignmentToText(value) {
  if (value === "left" || value === "right" || value === "justify") return value;
  return "center";
}

function renderFigureCustomizer(state) {
  const shape = findSelectedDrawing(state);
  if (!shape) {
    return `
      <div class="figure-customizer is-empty">
        <span class="customizer-chip">Figure controls</span>
        <span class="customizer-empty-text">Select a drawn figure</span>
        <button class="customizer-button danger clear-canvas-button" data-drawing-action="clear-canvas" title="Clear canvas">Clear Canvas</button>
      </div>
    `;
  }

  const strokeColor = shape.strokeColor || branches.preview.defaultDrawingStroke || "#176b87";
  const fillColor = shape.fillColor || branches.preview.defaultDrawingFill || "#e9f6f8";
  const strokeWidth = Number(shape.strokeWidth ?? branches.preview.defaultDrawingStrokeWidth ?? 5);
  const fillOpacity = Number(shape.fillOpacity ?? branches.preview.defaultDrawingFillOpacity ?? 0.85);
  const opacity = Number(shape.opacity ?? branches.preview.defaultDrawingOpacity ?? 1);
  const lineStyle = shape.lineStyle || branches.preview.defaultDrawingLineStyle || "solid";
  const fillEnabled = shape.fillEnabled !== false;

  return `
    <div class="figure-customizer">
      <div class="customizer-group customizer-actions">
        <span class="customizer-chip">${escapeHtml(formatShapeName(shape.type))}</span>
        <button class="customizer-button" data-drawing-action="duplicate" title="Duplicate selected figure">Copy</button>
        <button class="customizer-button" data-drawing-action="front" title="Bring to front">Front</button>
        <button class="customizer-button" data-drawing-action="back" title="Send to back">Back</button>
        <button class="customizer-button${state.cropMode ? " is-active" : ""}" data-drawing-action="crop-toggle" title="Crop handles">Crop</button>
        <button class="customizer-button" data-drawing-action="reset-crop" title="Reset crop">Crop 0</button>
        <button class="customizer-button danger" data-drawing-action="delete" title="Delete selected figure">Delete</button>
      </div>
      <div class="customizer-group">
        ${renderColorControl("Stroke", "strokeColor", strokeColor)}
        ${renderColorControl("Fill", "fillColor", fillColor)}
        <label class="customizer-toggle" title="Fill on or off">
          <input data-drawing-prop="fillEnabled" type="checkbox"${fillEnabled ? " checked" : ""} />
          <span>Fill</span>
        </label>
        ${renderNumberControl("Line", "strokeWidth", strokeWidth, 1, 18, 1)}
        <label class="customizer-field customizer-select-field">
          <span>Style</span>
          <select data-drawing-prop="lineStyle">
            ${renderToolbarOption("solid", lineStyle, "Solid")}
            ${renderToolbarOption("dash", lineStyle, "Dash")}
            ${renderToolbarOption("dot", lineStyle, "Dot")}
          </select>
        </label>
      </div>
      <div class="customizer-group">
        ${renderRangeControl("Fill %", "fillOpacity", fillOpacity, 0, 1, 0.05)}
        ${renderRangeControl("Obj %", "opacity", opacity, 0.1, 1, 0.05)}
      </div>
      <button class="customizer-button danger clear-canvas-button" data-drawing-action="clear-canvas" title="Clear canvas">Clear Canvas</button>
    </div>
  `;
}

function renderNumberControl(label, property, value, min, max, step) {
  return `
    <label class="customizer-field">
      <span>${escapeHtml(label)}</span>
      <input data-drawing-prop="${escapeHtml(property)}" type="number" min="${min}" max="${max}" step="${step}" value="${escapeHtml(value)}" />
    </label>
  `;
}

function renderRangeControl(label, property, value, min, max, step) {
  return `
    <label class="customizer-field customizer-range-field">
      <span>${escapeHtml(label)}</span>
      <input data-drawing-prop="${escapeHtml(property)}" type="range" min="${min}" max="${max}" step="${step}" value="${escapeHtml(value)}" />
    </label>
  `;
}

function renderColorControl(label, property, value) {
  return `
    <label class="customizer-color" title="${escapeHtml(label)}">
      <span>${escapeHtml(label)}</span>
      <input data-drawing-prop="${escapeHtml(property)}" type="color" value="${escapeHtml(value)}" />
    </label>
  `;
}

function findSelectedDrawing(state) {
  return (state.drawings || []).find((shape) => shape.id === state.selectedDrawingId) || null;
}

function formatShapeName(type = "Figure") {
  return String(type)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
