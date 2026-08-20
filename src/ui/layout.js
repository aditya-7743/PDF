import { branches } from "../branches/index.js";
import { getSlideSettings } from "../branches/pptBranch.js";
import { renderMathMl } from "../core/mathml.js?v=gemini-paste-clean-20260705";
import { getEquationDiagnostics } from "../core/normalizer.js?v=gemini-paste-clean-20260705";

export function getQuestionImages(q) {
  if (!q) return [];
  if (Array.isArray(q.images) && q.images.length > 0) return q.images;
  if (q.image) {
    const imgObj = typeof q.image === "object" ? q.image : { id: "img_legacy", dataUrl: q.image, posX: 0, posY: 0, width: 260, height: 200 };
    if (!imgObj.id) imgObj.id = "img_legacy";
    return [imgObj];
  }
  return [];
}

export function renderApp(state) {
  const rendered = renderMathMl(state.input);
  const diagnostics = getEquationDiagnostics(state.input);
  return `
    <div class="app-shell">
      ${renderTopbar(state)}
      ${renderWorkbench(state, rendered, diagnostics)}
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
        <button class="mode-button${mode === "ppt-builder" ? " is-active" : ""}" data-action="switch-mode" data-mode="ppt-builder" type="button">PPT Builder</button>
      </div>
    </header>
  `;
}

function renderWorkbench(state, rendered, diagnostics) {
  const mode = normalizeAppMode(state.mode);
  if (mode === "image-tools") {
    return renderImageToolsWorkbench(state);
  }
  if (mode === "ppt-builder") {
    return renderPptBuilderWorkbench(state);
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
  if (value === "math-figures" || value === "image-tools" || value === "ppt-builder") return value;
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


function renderPptEditorToolbar(settings = {}, activeQ = {}, applyScope = "all", activeIdx = 0, totalSlides = 1) {
  const currentFont = settings.engFontFamily || "Segoe UI, Arial, sans-serif";
  const fontSize = settings.engFontSize || 19;
  const textColor = settings.engColor || "#111111";
  const highlightColor = settings.highlightColor || "#ffeb3b";
  const hasOverrides = activeQ.settings && Object.keys(activeQ.settings).length > 0;

  return `
    <header class="ppt-panel-header ppt-editor-toolbar" role="toolbar" aria-label="PPT Formatting & LaTeX Toolbar">
      <!-- Target Scope: All Slides vs Current Slide Only -->
      <div class="ppt-tb-group ppt-tb-scope-group" style="display:flex; align-items:center; gap:2px;">
        <span style="font-size:10px; font-weight:800; color:#8b949e;">Apply:</span>
        <button class="ppt-tb-btn ppt-tb-scope-btn ${applyScope === 'all' ? 'is-active' : ''}" data-action="ppt-set-scope" data-scope="all" title="Changes (Position, Width, Layout, Font) apply to ALL slides (Global Master)">🌐 All Slides</button>
        <button class="ppt-tb-btn ppt-tb-scope-btn ${applyScope === 'current' ? 'is-active' : ''}" data-action="ppt-set-scope" data-scope="current" title="Changes apply ONLY to this slide (Q.${activeIdx + 1}) without affecting other slides">🎯 Slide ${activeIdx + 1} Only</button>
        <button class="ppt-tb-btn" data-action="ppt-apply-slide-to-all" title="Copy this slide's complete layout, positions, fonts, colors, and settings to ALL slides" style="color:#58a6ff; font-size:10px; font-weight:bold; cursor:pointer;">🚀 Apply to All</button>
        ${hasOverrides ? `
          <button class="ppt-tb-btn" data-action="ppt-reset-slide-override" title="Revert this slide back to global master defaults" style="color:#f85149; font-size:10px; cursor:pointer;">🔄 Reset</button>
        ` : ''}
      </div>

      <!-- Font Family & Font Size -->
      <div class="ppt-tb-group">
        <select class="ppt-tb-select ppt-tb-font" data-ppt-tb-action="fontFamily" title="Font Family">
          <option value="Segoe UI, Arial, sans-serif"${currentFont.includes("Segoe") ? " selected" : ""}>Segoe UI</option>
          <option value="'Mangal', 'Noto Sans Devanagari', sans-serif"${currentFont.includes("Mangal") ? " selected" : ""}>Mangal (Devanagari)</option>
          <option value="'Times New Roman', serif"${currentFont.includes("Times") ? " selected" : ""}>Times New Roman</option>
          <option value="'Cambria Math', Cambria, serif"${currentFont.includes("Cambria") ? " selected" : ""}>Cambria Math</option>
          <option value="Arial, sans-serif"${currentFont === "Arial, sans-serif" ? " selected" : ""}>Arial</option>
          <option value="'Courier New', monospace"${currentFont.includes("Courier") ? " selected" : ""}>Courier New</option>
        </select>
        <button class="ppt-tb-btn" data-ppt-tb-action="font-size-dec" title="Decrease Font Size (−)">−</button>
        <span class="ppt-tb-size-val" data-ppt-tb-size-display title="Font Size">${fontSize}px</span>
        <button class="ppt-tb-btn" data-ppt-tb-action="font-size-inc" title="Increase Font Size (+)">+</button>
      </div>

      <!-- Format: Bold, Italic, Underline, Colors -->
      <div class="ppt-tb-group">
        <button class="ppt-tb-btn" data-ppt-tb-format="bold" title="Bold (Ctrl+B)"><b>B</b></button>
        <button class="ppt-tb-btn" data-ppt-tb-format="italic" title="Italic (Ctrl+I)"><i>I</i></button>
        <button class="ppt-tb-btn" data-ppt-tb-format="underline" title="Underline (Ctrl+U)"><u>U</u></button>
        <label class="ppt-tb-color" title="Text Color">
          <span style="border-bottom:3px solid #58a6ff; line-height:1;">A</span>
          <input type="color" data-ppt-tb-color="textColor" value="${escapeHtml(textColor)}" />
        </label>
        <label class="ppt-tb-color" title="Highlight Color">
          <span style="background:#e3b341; color:#000; padding:1px 3px; border-radius:2px; font-size:10px;">H</span>
          <input type="color" data-ppt-tb-color="highlightColor" value="${escapeHtml(highlightColor)}" />
        </label>
        <button class="ppt-tb-btn" data-ppt-tb-action="clear-format" title="Clear Formatting (Tx)">Tx</button>
      </div>

      <!-- Alignment & Lists -->
      <div class="ppt-tb-group">
        <button class="ppt-tb-btn" data-ppt-tb-action="align-left" title="Align Left">⫷</button>
        <button class="ppt-tb-btn" data-ppt-tb-action="align-center" title="Align Center">≡</button>
        <button class="ppt-tb-btn" data-ppt-tb-action="align-right" title="Align Right">⫸</button>
        <button class="ppt-tb-btn" data-ppt-tb-action="bullet-list" title="Bullet List (•)">• List</button>
        <button class="ppt-tb-btn" data-ppt-tb-action="number-list" title="Numbered List (1, 2, 3)">1. List</button>
      </div>

      <!-- Quick LaTeX & Math Formula Palette -->
      <div class="ppt-tb-group ppt-tb-math-group">
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\frac{a}{b}" title="Fraction: \\frac{a}{b}">a/b</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\sqrt{x}" title="Square Root: \\sqrt{x}">√x</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="^{2}" title="Power: x²">x²</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="_{1}" title="Subscript: x₁">x₁</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\left( | \\right)" title="Auto Bracket: ( )">( )</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\pm" title="Plus-Minus: \\pm">±</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\times" title="Multiply: \\times">×</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\div" title="Divide: \\div">÷</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\pi" title="Pi: \\pi">π</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\theta" title="Theta: \\theta">θ</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\approx" title="Approximately: \\approx">≈</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\le" title="Less than equal: \\le">≤</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\ge" title="Greater than equal: \\ge">≥</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\neq" title="Not equal: \\neq">≠</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="^\\circ" title="Degree: ^\\circ">°</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\Delta" title="Delta: \\Delta">Δ</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\sum" title="Summation: \\sum">∑</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\int" title="Integral: \\int">∫</button>
        <button class="ppt-tb-btn ppt-tb-math-btn" data-ppt-latex="\\infty" title="Infinity: \\infty">∞</button>
      </div>

      <!-- Diagram / Image & Math Actions -->
      <div class="ppt-tb-group">
        <button class="ppt-tb-btn" data-action="ppt-trigger-image-upload" title="Paste or Upload Diagram / Graph to this slide" style="color:#58a6ff; font-weight:700;">🖼️ Add Image</button>
        <input type="file" accept="image/*" data-ppt-diagram-file-input style="display:none;" />
      </div>

      <!-- Quick Slide Navigation (Previous Slide / Next Slide Icons + New Slide) -->
      <div class="ppt-tb-group ppt-tb-nav-group" style="display:flex; align-items:center; gap:3px;">
        <button class="ppt-tb-btn ppt-tb-nav-btn" data-action="ppt-prev-slide" title="Go to Previous Slide (← / PageUp)" ${activeIdx <= 0 ? 'disabled style="opacity:0.35; cursor:not-allowed;"' : 'style="color:#58a6ff; font-weight:bold; cursor:pointer;"'}>
          ◀ Prev
        </button>
        <span class="ppt-tb-slide-counter" title="Current Slide / Total Slides" style="font-size:11px; font-weight:800; color:#c9d1d9; padding:0 6px; white-space:nowrap; background:#21262d; border-radius:4px; border:1px solid #30363d; line-height:18px;">
          ${activeIdx + 1} / ${Math.max(1, totalSlides)}
        </span>
        <button class="ppt-tb-btn ppt-tb-nav-btn" data-action="ppt-next-slide" title="Go to Next Slide (→ / PageDown)" ${activeIdx >= totalSlides - 1 ? 'disabled style="opacity:0.35; cursor:not-allowed;"' : 'style="color:#58a6ff; font-weight:bold; cursor:pointer;"'}>
          Next ▶
        </button>
        <button class="ppt-tb-btn" data-action="ppt-add-slide" title="Add New Slide (+)" style="color:#7ee787; font-weight:bold; font-size:11px; margin-left:4px; border:1px solid rgba(126,231,135,0.4); cursor:pointer;">
          + New Slide
        </button>
      </div>

      <!-- Undo / Redo & Clean Math -->
      <div class="ppt-tb-group">
        <button class="ppt-tb-btn" data-ppt-tb-action="undo" title="Undo (Ctrl+Z)">↶</button>
        <button class="ppt-tb-btn" data-ppt-tb-action="redo" title="Redo (Ctrl+Y / Ctrl+Shift+Z)">↷</button>
        <button class="ppt-tb-btn" data-ppt-tb-action="clean-math" title="Clean Math / Fix LaTeX Formats" style="color:#58a6ff;">✨ Clean</button>
      </div>
    </header>
  `;
}

function renderPptBuilderWorkbench(state) {
  const ppt = state.ppt || {};
  const globalSettings = ppt.settings || branches.ppt?.settings || {};
  const questions = ppt.questions && ppt.questions.length ? ppt.questions : (branches.ppt?.samples || []);
  const activeIdx = Math.max(0, Math.min(ppt.activeQuestionIndex || 0, questions.length - 1));
  const activeQ = questions[activeIdx] || {
    number: "Q.1",
    exam: globalSettings.defaultExam || "SSC CGL (Shift 1)",
    topic: globalSettings.topic || "TOPIC",
    english: "",
    hindi: "",
    options: [{ key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" }]
  };

  const applyScope = ppt.applyScope || "all";
  const settings = getSlideSettings(globalSettings, activeQ);
  const hasOverrides = activeQ.settings && Object.keys(activeQ.settings).length > 0;

  const wizardHtml = ppt.showImportWizard ? renderPptImportWizardModal(state) : "";
  const examTagPos = settings.examTagPosition || "below-question";
  const examTagStyle = settings.examTagStyle || "pill";

  return `
    ${wizardHtml}
    <main class="workbench is-ppt-mode" aria-label="PPT Builder">
      <!-- LEFT PANEL: TOOLS & CUSTOMIZER -->
      <section class="ppt-panel ppt-tools-panel">
        <header class="ppt-panel-header">
          <span>🎨 PPT Customizer & Import</span>
          <span style="font-size:11px; color:#8b949e;">${questions.length} Slides</span>
        </header>
        <div class="ppt-panel-body">
          <!-- Changes Target Scope Card -->
          <div class="ppt-section" style="background:#161b22; border:1.5px solid ${applyScope === 'current' ? '#8957e5' : '#238636'}; border-radius:8px; padding:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div style="font-size:12px; font-weight:800; color:#f0f6fc;">🛠️ Changes Target:</div>
              <span style="font-size:10px; font-weight:700; color:${applyScope === 'current' ? '#d2a8ff' : '#7ee787'};">${applyScope === 'current' ? `Slide ${activeIdx + 1} Only 🎯` : 'All Slides 🌐'}</span>
            </div>
            <div class="ppt-layout-btn-group" style="margin-bottom:6px;">
              <button class="ppt-layout-btn ${applyScope === 'all' ? 'is-active' : ''}" data-action="ppt-set-scope" data-scope="all" title="Changes apply as default to ALL slides">🌐 All Slides (Master)</button>
              <button class="ppt-layout-btn ${applyScope === 'current' ? 'is-active' : ''}" data-action="ppt-set-scope" data-scope="current" title="Changes apply ONLY to this slide (Q.${activeIdx + 1})">🎯 Slide ${activeIdx + 1} Only</button>
            </div>
            <div style="font-size:10px; color:#8b949e; line-height:1.3; margin-bottom:8px;">
              ${applyScope === 'current' ? `⚡ <b>Slide ${activeIdx + 1} Fine-Tuning:</b> Custom adjustments apply only here.` : '🌍 <b>Global Master Mode:</b> Adjustments apply to all slides.'}
            </div>
            <div style="display:flex; gap:4px;">
              <button class="ppt-btn" data-action="ppt-apply-slide-to-all" style="flex:1; font-size:11px; font-weight:bold; color:#58a6ff; background:rgba(88,166,255,0.1); border-color:#58a6ff; cursor:pointer;" title="Copy this slide's complete layout, positions, fonts, colors, and settings to ALL slides">🚀 Apply Style to All Slides</button>
              ${hasOverrides ? `
                <button class="ppt-btn" data-action="ppt-reset-slide-override" style="font-size:11px; color:#f85149; cursor:pointer;" title="Revert this slide back to global master defaults">🔄 Reset</button>
              ` : ''}
            </div>
          </div>

          <!-- DOCX Upload Dropzone -->
          <div class="ppt-dropzone" data-action="ppt-browse-file">
            <div class="ppt-dropzone-icon">📄</div>
            <div class="ppt-dropzone-title">Upload Word (.docx) File</div>
            <div class="ppt-dropzone-sub">Drag & drop or click to browse (or .txt)</div>
            <input type="file" accept=".docx,.txt" data-ppt-file-input style="display:none;" />
          </div>

          <div class="ppt-quick-actions">
            <button class="ppt-btn" data-action="ppt-open-paste-box" style="flex:1;">📋 Quick Paste</button>
            <button class="ppt-btn" data-action="ppt-load-samples" style="flex:1;">✨ Load Sample</button>
          </div>

          <!-- Quick Paste Area (Collapsible) -->
          <div class="ppt-section" id="ppt-paste-container" style="display:${ppt.showPasteBox ? 'flex' : 'none'};">
            <div class="ppt-section-title">Paste Questions Text</div>
            <textarea class="ppt-textarea" data-ppt-paste-input placeholder="Paste questions here... e.g.
Q.1
English Question...
Hindi Question...
SSC CGL (Shift 1)
[A]. 100
[B]. 120
[C]. 140
[D]. 160" rows="6"></textarea>
            <div style="display:flex; gap:6px;">
              <button class="ppt-btn ppt-btn-primary" data-action="ppt-process-paste" style="flex:1;">Parse & Build</button>
              <button class="ppt-btn" data-action="ppt-close-paste-box">Cancel</button>
            </div>
          </div>

          <!-- Teaching Split & Screen Layout -->
          <div class="ppt-section">
            <div class="ppt-section-title">Teaching Screen Layout</div>
            <div class="ppt-layout-btn-group" style="margin-bottom:8px;">
              <button class="ppt-layout-btn ${(settings.layoutPreset || 'full-width') === 'right-split' ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="right-split" title="Teacher on Left, Question on Right (YouTube Math Style)">
                👨‍🏫 Right Split
              </button>
              <button class="ppt-layout-btn ${(settings.layoutPreset || 'full-width') === 'full-width' ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="full-width" title="Full Width Standard Centered">
                🖥️ Full Width
              </button>
              <button class="ppt-layout-btn ${settings.layoutPreset === 'left-split' ? 'is-active' : ''}" data-action="ppt-set-layout-preset" data-preset="left-split" title="Question on Left, Teacher on Right">
                👩‍🏫 Left Split
              </button>
            </div>
            <div class="ppt-ctrl-row">
              <label>Whole Slide Body X (${settings.boxPosX || 0}%)</label>
              <input type="range" min="0" max="50" step="2" data-ppt-setting="boxPosX" value="${settings.boxPosX || 0}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Option Style</label>
              <div class="ppt-layout-btn-group">
                <button class="ppt-layout-btn ${(settings.optionStyle || 'card') === 'card' ? 'is-active' : ''}" data-action="ppt-set-option-style" data-style="card">🔲 Cards</button>
                <button class="ppt-layout-btn ${settings.optionStyle === 'clean' ? 'is-active' : ''}" data-action="ppt-set-option-style" data-style="clean">📝 Clean (a) (b)</button>
              </div>
            </div>
          </div>

          <!-- Individual Element Drag & Stretch Controls -->
          <div class="ppt-section">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="ppt-section-title">Free-Form Drag & Stretch</div>
              <button class="ppt-btn" data-action="ppt-reset-positions" style="font-size:10px; padding:2px 6px;" title="Reset all elements to default 0,0">🔄 Reset All</button>
            </div>
            <div class="ppt-ctrl-row">
              <label>English (X px / Y px / Width %)</label>
              <div style="display:flex; gap:3px; align-items:center;">
                <input type="number" data-ppt-setting="engPosX" value="${settings.engPosX || 0}" style="width:38px;" title="English X Offset px" />
                <input type="number" data-ppt-setting="engPosY" value="${settings.engPosY || 0}" style="width:38px;" title="English Y Offset px" />
                <input type="number" min="30" max="100" data-ppt-setting="engWidth" value="${settings.engWidth || 100}" style="width:40px;" title="English Width %" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Hindi (X px / Y px / Width %)</label>
              <div style="display:flex; gap:3px; align-items:center;">
                <input type="number" data-ppt-setting="hindiPosX" value="${settings.hindiPosX || 0}" style="width:38px;" title="Hindi X Offset px" />
                <input type="number" data-ppt-setting="hindiPosY" value="${settings.hindiPosY || 0}" style="width:38px;" title="Hindi Y Offset px" />
                <input type="number" min="30" max="100" data-ppt-setting="hindiWidth" value="${settings.hindiWidth || 100}" style="width:40px;" title="Hindi Width %" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Divider (Width % / X px)</label>
              <div style="display:flex; gap:3px; align-items:center;">
                <input type="number" min="10" max="100" data-ppt-setting="dividerWidth" value="${settings.dividerWidth || 100}" style="width:44px;" title="Divider Width %" />
                <input type="number" data-ppt-setting="dividerPosX" value="${settings.dividerPosX || 0}" style="width:38px;" title="Divider X Offset px" />
                <button class="ppt-btn" data-action="ppt-divider-match-eng" style="font-size:10px; padding:2px 5px;" title="Match English Width">Match Eng</button>
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Topic Position (X px / Y px)</label>
              <div style="display:flex; gap:3px; align-items:center;">
                <input type="number" data-ppt-setting="topicPosX" value="${settings.topicPosX || 0}" style="width:38px;" title="Topic X Offset px" />
                <input type="number" data-ppt-setting="topicPosY" value="${settings.topicPosY || 0}" style="width:38px;" title="Topic Y Offset px" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Exam Tag Pos (X px / Y px)</label>
              <div style="display:flex; gap:3px; align-items:center;">
                <input type="number" data-ppt-setting="examTagPosX" value="${settings.examTagPosX || 0}" style="width:38px;" title="Exam Tag X Offset px" />
                <input type="number" data-ppt-setting="examTagPosY" value="${settings.examTagPosY || 0}" style="width:38px;" title="Exam Tag Y Offset px" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Options (X px / Y px / Width %)</label>
              <div style="display:flex; gap:3px; align-items:center;">
                <input type="number" data-ppt-setting="optionsPosX" value="${settings.optionsPosX || 0}" style="width:38px;" title="Options X Offset px" />
                <input type="number" data-ppt-setting="optionsPosY" value="${settings.optionsPosY || 0}" style="width:38px;" title="Options Y Offset px" />
                <input type="number" min="40" max="100" data-ppt-setting="optionWidthPercent" value="${settings.optionWidthPercent || 96}" style="width:40px;" title="Options Width %" />
              </div>
            </div>
          </div>

          <!-- Exam Tag Placement & Style -->
          <div class="ppt-section">
            <div class="ppt-section-title">Exam Tag Placement & Style</div>
            <div class="ppt-ctrl-row">
              <label>Placement</label>
              <div class="ppt-layout-btn-group">
                <button class="ppt-layout-btn ${(settings.examTagPosition || 'below-question') === 'below-question' ? 'is-active' : ''}" data-action="ppt-set-exam-position" data-position="below-question" title="Below Hindi Question (SSC GD Style)">🎯 Below Q</button>
                <button class="ppt-layout-btn ${settings.examTagPosition === 'header' ? 'is-active' : ''}" data-action="ppt-set-exam-position" data-position="header" title="In Top Header">📌 Header</button>
                <button class="ppt-layout-btn ${settings.examTagPosition === 'none' ? 'is-active' : ''}" data-action="ppt-set-exam-position" data-position="none" title="Hide Exam Tag">❌ None</button>
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Badge Style</label>
              <div class="ppt-layout-btn-group">
                <button class="ppt-layout-btn ${(settings.examTagStyle || 'pill') === 'pill' ? 'is-active' : ''}" data-action="ppt-set-exam-style" data-style="pill">🔴 Pill</button>
                <button class="ppt-layout-btn ${settings.examTagStyle === 'highlight' ? 'is-active' : ''}" data-action="ppt-set-exam-style" data-style="highlight">🟡 Box</button>
                <button class="ppt-layout-btn ${settings.examTagStyle === 'text' ? 'is-active' : ''}" data-action="ppt-set-exam-style" data-style="text">📝 Plain</button>
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Tag Bg / Text Color</label>
              <div style="display:flex; gap:4px;">
                <input type="color" data-ppt-setting="examTagBg" value="${settings.examTagBg || '#DC2626'}" title="Tag Background" />
                <input type="color" data-ppt-setting="examTagColor" value="${settings.examTagColor || '#FFFFFF'}" title="Tag Text Color" />
              </div>
            </div>
          </div>

          <!-- Theme Presets -->
          <div class="ppt-section">
            <div class="ppt-section-title">Theme Presets</div>
            <div class="ppt-theme-grid">
              <button class="ppt-theme-card ${settings.theme === 'dark' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="dark">
                <span class="ppt-theme-badge" style="background:#0B0F17; border:1px solid #555;"></span>
                <span>Dark (YouTube)</span>
              </button>
              <button class="ppt-theme-card ${settings.theme === 'maroon' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="maroon">
                <span class="ppt-theme-badge" style="background:#7A0000;"></span>
                <span>SSC Maroon</span>
              </button>
              <button class="ppt-theme-card ${settings.theme === 'navy' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="navy">
                <span class="ppt-theme-badge" style="background:#0A1931;"></span>
                <span>Royal Navy</span>
              </button>
              <button class="ppt-theme-card ${settings.theme === 'emerald' ? 'is-active' : ''}" data-action="ppt-set-theme" data-theme="emerald">
                <span class="ppt-theme-badge" style="background:#064E3B;"></span>
                <span>Emerald Pro</span>
              </button>
            </div>
          </div>

          <!-- Top Header Bar Settings -->
          <div class="ppt-section">
            <div class="ppt-section-title">Top Header Bar</div>
            <div class="ppt-ctrl-row">
              <label>Header Color</label>
              <input type="color" data-ppt-setting="headerBg" value="${settings.headerBg || '#7A0000'}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Header Height (${settings.headerHeight || 64}px)</label>
              <input type="range" min="48" max="92" step="2" data-ppt-setting="headerHeight" value="${settings.headerHeight || 64}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Q. Badge Bg / Text</label>
              <div style="display:flex; gap:4px;">
                <input type="color" data-ppt-setting="qBadgeBg" value="${settings.qBadgeBg || '#FFFFFF'}" title="Badge Background" />
                <input type="color" data-ppt-setting="qBadgeColor" value="${settings.qBadgeColor || '#7A0000'}" title="Badge Text Color" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Exam Text Color</label>
              <input type="color" data-ppt-setting="examColor" value="${settings.examColor || '#FFFFFF'}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Topic Color</label>
              <input type="color" data-ppt-setting="topicColor" value="${settings.topicColor || '#FFD700'}" />
            </div>
          </div>

          <!-- Questions & Text Settings -->
          <div class="ppt-section">
            <div class="ppt-section-title">Question Boundaries & Typography</div>
            <div class="ppt-ctrl-row">
              <label>Box Width (${settings.questionBoxWidth || 100}%)</label>
              <input type="range" min="70" max="100" step="2" data-ppt-setting="questionBoxWidth" value="${settings.questionBoxWidth || 100}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Box Padding (${settings.questionPadding || 16}px)</label>
              <input type="range" min="8" max="36" step="2" data-ppt-setting="questionPadding" value="${settings.questionPadding || 16}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>English Color / Size (${settings.engFontSize || 19}px)</label>
              <div style="display:flex; align-items:center; gap:6px;">
                <input type="color" data-ppt-setting="engColor" value="${settings.engColor || '#111111'}" />
                <input type="range" min="14" max="28" step="1" data-ppt-setting="engFontSize" value="${settings.engFontSize || 19}" style="width:70px;" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Hindi Color / Size (${settings.hindiFontSize || 18}px)</label>
              <div style="display:flex; align-items:center; gap:6px;">
                <input type="color" data-ppt-setting="hindiColor" value="${settings.hindiColor || '#7A0000'}" />
                <input type="range" min="14" max="28" step="1" data-ppt-setting="hindiFontSize" value="${settings.hindiFontSize || 18}" style="width:70px;" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Divider & Spacing (${settings.dividerSpacing || 6}px)</label>
              <div style="display:flex; align-items:center; gap:6px;">
                <input type="checkbox" data-ppt-setting="showDivider" ${settings.showDivider !== false ? 'checked' : ''} />
                <input type="color" data-ppt-setting="dividerColor" value="${settings.dividerColor || '#A30000'}" />
                <input type="range" min="2" max="24" step="2" data-ppt-setting="dividerSpacing" value="${settings.dividerSpacing || 6}" style="width:50px;" />
              </div>
            </div>
          </div>

          <!-- Option Cards Customizer -->
          <div class="ppt-section">
            <div class="ppt-section-title">Option Cards & Layout</div>
            <div class="ppt-ctrl-row">
              <label>Layout Mode</label>
              <div class="ppt-layout-btn-group">
                <button class="ppt-layout-btn ${(settings.optionsLayout || '2-col') === '2-col' ? 'is-active' : ''}" data-action="ppt-set-option-layout" data-layout="2-col" title="2 Columns (2 × 2 Grid)">2 × 2</button>
                <button class="ppt-layout-btn ${settings.optionsLayout === '1-col' ? 'is-active' : ''}" data-action="ppt-set-option-layout" data-layout="1-col" title="1 Column (Stacked 4 Rows)">1 Col</button>
                <button class="ppt-layout-btn ${settings.optionsLayout === '4-col' ? 'is-active' : ''}" data-action="ppt-set-option-layout" data-layout="4-col" title="4 Columns (1 Row)">4 Col</button>
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Container Width (${settings.optionWidthPercent || 96}%)</label>
              <input type="range" min="50" max="100" step="2" data-ppt-setting="optionWidthPercent" value="${settings.optionWidthPercent || 96}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Card Padding (${settings.optionCardPadding || 8}px)</label>
              <input type="range" min="4" max="24" step="2" data-ppt-setting="optionCardPadding" value="${settings.optionCardPadding || 8}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Card Gap (${settings.optionGap || 12}px)</label>
              <input type="range" min="4" max="24" step="2" data-ppt-setting="optionGap" value="${settings.optionGap || 12}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Card Bg / Border</label>
              <div style="display:flex; gap:4px;">
                <input type="color" data-ppt-setting="optionCardBg" value="${settings.optionCardBg || '#FFFFFF'}" title="Card Background" />
                <input type="color" data-ppt-setting="optionBorderColor" value="${settings.optionBorderColor || '#CBD5E1'}" title="Border Color" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Badge Bg / Text</label>
              <div style="display:flex; gap:4px;">
                <input type="color" data-ppt-setting="optionBadgeBg" value="${settings.optionBadgeBg || '#7A0000'}" title="Option Badge Background" />
                <input type="color" data-ppt-setting="optionBadgeColor" value="${settings.optionBadgeColor || '#FFFFFF'}" title="Option Badge Text Color" />
              </div>
            </div>
            <div class="ppt-ctrl-row">
              <label>Option Font Size (${settings.optionFontSize || 18}px)</label>
              <input type="range" min="10" max="32" step="1" data-ppt-setting="optionFontSize" value="${settings.optionFontSize || 18}" />
            </div>
            <div class="ppt-ctrl-row">
              <label>Option Text Color</label>
              <input type="color" data-ppt-setting="optionTextColor" value="${settings.optionTextColor || '#111111'}" />
            </div>
          </div>
        </div>
      </section>

      <!-- MIDDLE PANEL: QUESTION EDITORS & SLIDES LIST -->
      <section class="ppt-panel ppt-editor-panel">
        <header class="ppt-panel-header">
          <span>📝 Slide Content Editor</span>
          <div style="display:flex; gap:4px;">
            <button class="ppt-btn" data-action="ppt-add-slide" title="Add New Slide">+ New</button>
            <button class="ppt-btn" data-action="ppt-delete-slide" title="Delete Active Slide" style="color:#f85149;">🗑️</button>
          </div>
        </header>

        <!-- Slide Selector Single-Line Horizontal Tabs Strip -->
        <div class="ppt-slide-tabs-bar ppt-q-nav-list">
          ${questions.map((q, idx) => `
            <button class="ppt-slide-tab ppt-q-nav-btn ${idx === activeIdx ? 'is-active' : ''}" data-action="ppt-select-slide" data-slide-index="${idx}">
              ${q.number || `Q.${idx + 1}`}
            </button>
          `).join("")}
        </div>

        <div class="ppt-editor-body">
          <!-- Question Meta Fields -->
          <div class="ppt-field-row">
            <div class="ppt-field-group" style="flex:1;">
              <label>Question Number</label>
              <input type="text" class="ppt-input" data-ppt-q-field="number" value="${escapeHtml(activeQ.number || `Q.${activeIdx + 1}`)}" placeholder="Q.1" />
            </div>
            <div class="ppt-field-group" style="flex:2;">
              <label>Topic Name</label>
              <input type="text" class="ppt-input" data-ppt-q-field="topic" value="${escapeHtml(activeQ.topic || settings.topic || 'TOPIC')}" placeholder="e.g. RATIO & PROPORTION" />
            </div>
          </div>

          <div class="ppt-field-group">
            <label>Exam Tag (e.g. SSC CGL 2025 Shift 1)</label>
            <input type="text" class="ppt-input" data-ppt-q-field="exam" value="${escapeHtml(activeQ.exam || settings.defaultExam || 'SSC CGL (Shift 1)')}" placeholder="e.g. SSC CGL 12/09/2025 (Shift 1)" />
          </div>

          <!-- English Question -->
          <div class="ppt-field-group">
            <label style="display:flex; justify-content:space-between;">
              <span>English Question</span>
              <span style="font-weight:normal; font-size:10px;">Latin font</span>
            </label>
            <textarea class="ppt-textarea" data-ppt-q-field="english" rows="4" placeholder="Type English question here...">${escapeHtml(activeQ.english || '')}</textarea>
          </div>

          <!-- Hindi Question -->
          <div class="ppt-field-group">
            <label style="display:flex; justify-content:space-between;">
              <span>Hindi Question</span>
              <span style="font-weight:normal; font-size:10px;">Devanagari Unicode</span>
            </label>
            <textarea class="ppt-textarea" data-ppt-q-field="hindi" rows="4" placeholder="हिंदी प्रश्न यहाँ लिखें...">${escapeHtml(activeQ.hindi || '')}</textarea>
          </div>

          <!-- Question Diagrams / Graphs Card (Supports 1, 2, 3+ Images) -->
          <div class="ppt-field-group ppt-diagram-card" style="background:#161b22; border:1px solid #30363d; border-radius:8px; padding:10px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="margin:0; font-size:11px; font-weight:700; color:#f0f6fc;">
                🖼️ Diagrams / Graphs (${getQuestionImages(activeQ).length})
              </label>
              <div style="display:flex; gap:4px;">
                <button class="ppt-btn" data-action="ppt-trigger-image-upload" style="font-size:10px; color:#58a6ff; padding:2px 6px;">+ Add Image</button>
                <button class="ppt-btn" data-action="ppt-paste-image-clipboard" style="font-size:10px; color:#7ee787; padding:2px 6px;">📋 Paste</button>
              </div>
            </div>
            ${getQuestionImages(activeQ).length > 0 ? `
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${getQuestionImages(activeQ).map((img, idx) => `
                  <div style="display:flex; gap:8px; align-items:center; background:#0d1117; border:1px solid #30363d; border-radius:6px; padding:4px 8px;">
                    <div style="width:48px; height:38px; border-radius:4px; overflow:hidden; background:#161b22; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                      <img src="${typeof img === 'string' ? img : img.dataUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" alt="Diagram ${idx + 1}" />
                    </div>
                    <div style="flex:1; font-size:11px; color:#c9d1d9;">
                      <b>Diagram ${idx + 1}</b> <span style="font-size:10px; color:#8b949e;">(${img.width || 260}px × ${img.height || 200}px)</span>
                    </div>
                    <button class="ppt-btn" data-action="ppt-remove-image" data-image-id="${img.id || `img_${idx}`}" style="font-size:10px; color:#f85149; padding:2px 6px;" title="Remove this diagram">🗑️</button>
                  </div>
                `).join("")}
                <div style="font-size:10px; color:#58a6ff; margin-top:2px;">
                  ✨ You can drag and resize each diagram independently on the slide canvas!
                </div>
              </div>
            ` : `
              <div style="display:flex; gap:6px;">
                <button class="ppt-btn" data-action="ppt-trigger-image-upload" style="flex:1; font-size:11px;">📁 Browse Diagram Image</button>
                <button class="ppt-btn" data-action="ppt-paste-image-clipboard" style="flex:1; font-size:11px;">📋 Paste Image</button>
              </div>
              <div style="font-size:10px; color:#8b949e; margin-top:4px;">
                💡 Tip: Copy any diagram/figure (or <b>Win + Shift + S</b>) and press <b>Ctrl + V</b> on this slide!
              </div>
            `}
          </div>

          <!-- Options Grid Inputs -->
          <div class="ppt-field-group">
            <label>Options (A, B, C, D)</label>
            <div class="ppt-options-grid-inputs">
              ${(activeQ.options || [{key:'A'},{key:'B'},{key:'C'},{key:'D'}]).slice(0, 4).map((opt, oIdx) => `
                <div class="ppt-option-input-box">
                  <span class="ppt-opt-badge-tag" style="background:${settings.optionBadgeBg || '#7A0000'}; color:${settings.optionBadgeColor || '#FFFFFF'};">${opt.key || String.fromCharCode(65 + oIdx)}</span>
                  <input type="text" class="ppt-opt-text-input" data-ppt-option-index="${oIdx}" value="${escapeHtml(opt.text || '')}" placeholder="Option ${opt.key || String.fromCharCode(65 + oIdx)}" />
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </section>

      <!-- RIGHT PANEL: LIVE 16:9 CANVAS PREVIEW & EXPORT -->
      <section class="ppt-panel ppt-preview-panel">
        ${renderPptEditorToolbar(settings, activeQ, applyScope, activeIdx, questions.length)}

        <div class="ppt-preview-stage">
          <!-- 16:9 SLIDE CANVAS CONTAINER -->
          <div class="ppt-slide-canvas-wrapper" style="background:${settings.slideBg || '#FFFFFF'};">
            <!-- Top Header Bar -->
            <div class="slide-header-bar ppt-resizable-box" style="background:${settings.headerBg || '#7A0000'}; height:${settings.headerHeight || 64}px;">
              <div class="slide-q-badge" contenteditable="true" spellcheck="false" data-ppt-canvas-field="number" style="background:${settings.qBadgeBg || '#FFFFFF'}; color:${settings.qBadgeColor || '#7A0000'}; font-size:${settings.qBadgeSize || 18}px;">
                ${escapeHtml(activeQ.number || `Q.${activeIdx + 1}`)}
              </div>
              <div class="slide-exam-title" contenteditable="true" spellcheck="false" data-ppt-canvas-field="exam" style="display:${examTagPos === 'header' ? 'block' : 'none'}; color:${settings.examColor || '#FFFFFF'}; font-size:${settings.examFontSize || 19}px;">
                ${escapeHtml(activeQ.exam || settings.defaultExam || 'SSC CGL (Shift 1)')}
              </div>
              <!-- Draggable Topic Title Box in Header -->
              <div class="slide-topic-box canva-transform-box ppt-resizable-box" style="transform:translate(${settings.topicPosX || 0}px, ${settings.topicPosY || 0}px);">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill" data-ppt-resize-type="topic-position">✥ Topic</span>
                </div>
                <div class="slide-topic-title" contenteditable="true" spellcheck="false" data-ppt-canvas-field="topic" style="color:${settings.topicColor || '#FFD700'}; font-size:${settings.topicFontSize || 20}px;">
                  ${escapeHtml((activeQ.topic || settings.topic || 'TOPIC').toUpperCase())}
                </div>
                <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="topic-resize-nw" title="Scale"></div>
                <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="topic-resize-ne" title="Scale"></div>
                <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="topic-resize-se" title="Scale"></div>
                <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="topic-resize-sw" title="Scale"></div>
              </div>
              <!-- Header Height Resize Handle -->
              <div class="ppt-resize-handle ppt-resize-handle-s" data-ppt-resize-type="header-height" title="Drag to adjust Header Height"></div>
            </div>

            <!-- Slide Body Area -->
            <div class="slide-body-content" style="padding:${settings.questionPadding || 16}px 24px; transform:translate(${settings.boxPosX || 0}%, ${settings.boxPosY || 0}px); width:${settings.questionBoxWidth || 100}%;">
              <!-- English Question with 8-Point Free-form Bounding Box -->
              <div class="canva-transform-box slide-freeform-box slide-eng-section ppt-resizable-box" style="transform:translate(${settings.engPosX || 0}px, ${settings.engPosY || 0}px); width:${settings.engWidth ? `${settings.engWidth}%` : '100%'};">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill" data-ppt-resize-type="eng-position">✥ English</span>
                </div>
                <div class="slide-eng-text" contenteditable="true" spellcheck="false" data-ppt-canvas-field="english" title="Click to edit English text directly on slide" style="color:${settings.engColor || '#111111'}; font-size:${settings.engFontSize || 19}px; font-family:${settings.engFontFamily || 'Segoe UI, Arial, sans-serif'}; text-align:${settings.textAlign || 'left'}; line-height:${settings.lineHeight || 1.36};">
                  ${escapeHtml(activeQ.english || 'English question will appear here...')}
                </div>
                <!-- 4 Corner Circle Handles -->
                <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="eng-resize-nw" title="Resize Top-Left"></div>
                <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="eng-resize-ne" title="Resize Top-Right"></div>
                <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="eng-resize-se" title="Resize Bottom-Right"></div>
                <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="eng-resize-sw" title="Resize Bottom-Left"></div>
                <!-- 4 Side Pill Handles -->
                <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="eng-resize-n" title="Resize Top Spacing"></div>
                <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="eng-resize-s" title="Resize Bottom Spacing"></div>
                <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="eng-resize-e" title="Stretch Width Right ↔"></div>
                <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="eng-resize-w" title="Stretch Width Left ↔"></div>
              </div>

              <!-- Divider Line with Move & Width Stretch Handles -->
              <div class="canva-transform-box slide-freeform-box slide-divider-wrapper ppt-resizable-box" style="display:${settings.showDivider !== false ? 'block' : 'none'}; width:${settings.dividerWidth ? `${settings.dividerWidth}%` : '100%'}; transform:translate(${settings.dividerPosX || 0}px, ${settings.dividerPosY || 0}px); margin:${settings.dividerSpacing || 6}px 0;">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill slide-divider-drag" data-ppt-resize-type="divider-position" title="Drag to move Divider Line">✥ Divider</span>
                </div>
                <div class="slide-divider" style="border-top:${settings.dividerThickness || 2}px solid ${settings.dividerColor || '#A30000'}; width:100%;"></div>
                <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="divider-resize-e" title="Stretch Divider Right ↔"></div>
                <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="divider-resize-w" title="Stretch Divider Left ↔"></div>
              </div>

              <!-- Hindi Question with 8-Point Free-form Bounding Box -->
              <div class="canva-transform-box slide-freeform-box slide-hindi-section ppt-resizable-box" style="transform:translate(${settings.hindiPosX || 0}px, ${settings.hindiPosY || 0}px); width:${settings.hindiWidth ? `${settings.hindiWidth}%` : '100%'};">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill" data-ppt-resize-type="hindi-position">✥ Hindi</span>
                </div>
                <div class="slide-hindi-text" contenteditable="true" spellcheck="false" data-ppt-canvas-field="hindi" title="Click to edit Hindi text directly on slide" style="color:${settings.hindiColor || '#7A0000'}; font-size:${settings.hindiFontSize || 18}px; font-family:${settings.hindiFontFamily || 'Mangal, Noto Sans Devanagari, Arial, sans-serif'}; text-align:${settings.textAlign || 'left'}; line-height:${settings.lineHeight || 1.38};">
                  ${escapeHtml(activeQ.hindi || 'हिंदी प्रश्न यहाँ दिखाई देगा...')}
                </div>
                <!-- 4 Corner Circle Handles -->
                <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="hindi-resize-nw" title="Resize Top-Left"></div>
                <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="hindi-resize-ne" title="Resize Top-Right"></div>
                <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="hindi-resize-se" title="Resize Bottom-Right"></div>
                <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="hindi-resize-sw" title="Resize Bottom-Left"></div>
                <!-- 4 Side Pill Handles -->
                <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="hindi-resize-n" title="Resize Top Spacing"></div>
                <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="hindi-resize-s" title="Resize Bottom Spacing"></div>
                <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="hindi-resize-e" title="Stretch Width Right ↔"></div>
                <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="hindi-resize-w" title="Stretch Width Left ↔"></div>
              </div>

              <!-- Standalone Exam Tag Section with Free-form Drag Handle -->
              <div class="canva-transform-box slide-freeform-box slide-exam-section ppt-resizable-box" style="display:${(examTagPos === 'below-question' || examTagPos === 'above-options') ? 'inline-block' : 'none'}; transform:translate(${settings.examTagPosX || 0}px, ${settings.examTagPosY || 0}px);">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill" data-ppt-resize-type="exam-position">✥ Exam Tag</span>
                </div>
                <div class="slide-standalone-exam-tag" data-style="${examTagStyle}" contenteditable="true" spellcheck="false" data-ppt-canvas-field="exam" style="
                  background:${examTagStyle === 'pill' ? (settings.examTagBg || '#DC2626') : (examTagStyle === 'highlight' ? '#FEF08A' : 'transparent')};
                  color:${examTagStyle === 'pill' ? (settings.examTagColor || '#FFFFFF') : (examTagStyle === 'highlight' ? '#854D0E' : (settings.examColor || '#FFFFFF'))};
                  font-size:${settings.examFontSize || 15}px;
                ">
                  ${escapeHtml(activeQ.exam || settings.defaultExam || '(SSC GD 22 Feb., 2024 Shift III)')}
                </div>
                <!-- Handles -->
                <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="exam-resize-nw" title="Scale"></div>
                <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="exam-resize-ne" title="Scale"></div>
                <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="exam-resize-se" title="Scale"></div>
                <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="exam-resize-sw" title="Scale"></div>
                <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="exam-resize-e" title="Scale"></div>
                <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="exam-resize-w" title="Scale"></div>
              </div>

              <!-- Dynamic Uniform Options Container with Canva 8-Point Free-form Bounding Box -->
              <div class="canva-transform-box slide-freeform-box slide-options-container ppt-resizable-box" data-layout="${settings.optionsLayout || '2-col'}" data-option-style="${settings.optionStyle || 'card'}" style="width:${settings.optionWidthPercent || 96}%; gap:${settings.optionGap || 10}px; transform:translate(${settings.optionsPosX || 0}px, ${settings.optionsPosY || 0}px);">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill" data-ppt-resize-type="options-position">✥ Options Grid</span>
                </div>
                <!-- 4 Corner Circle Handles -->
                <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="options-resize-nw" title="Resize Top-Left"></div>
                <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="options-resize-ne" title="Resize Top-Right"></div>
                <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="options-resize-se" title="Resize Bottom-Right"></div>
                <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="options-resize-sw" title="Resize Bottom-Left"></div>
                <!-- 4 Side Pill Handles -->
                <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="options-resize-n" title="Resize Top Padding"></div>
                <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="options-resize-s" title="Resize Bottom Padding"></div>
                <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="options-resize-e" title="Stretch Width Right ↔"></div>
                <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="options-resize-w" title="Stretch Width Left ↔"></div>

                ${(activeQ.options || [{key:'A'},{key:'B'},{key:'C'},{key:'D'}]).slice(0, 4).map((opt, oIdx) => `
                  <div class="slide-option-box" style="
                    background:${settings.optionStyle === 'clean' ? 'transparent' : (settings.optionCardBg || '#FFFFFF')};
                    border:${settings.optionStyle === 'clean' ? 'none' : `${settings.optionCardBorderWidth || 1.5}px solid ${settings.optionBorderColor || '#CBD5E1'}`};
                    border-radius:${settings.optionCardRadius || 8}px;
                    padding:${settings.optionCardPadding || 8}px 14px;
                  ">
                    <div class="slide-opt-circle" style="background:${settings.optionStyle === 'clean' ? 'transparent' : (settings.optionBadgeBg || '#7A0000')}; color:${settings.optionStyle === 'clean' ? (settings.optionTextColor || settings.hindiColor || '#FBBF24') : (settings.optionBadgeColor || '#FFFFFF')};">
                      ${settings.optionStyle === 'clean' ? `(${(opt.key || String.fromCharCode(65 + oIdx)).toLowerCase()})` : (opt.key || String.fromCharCode(65 + oIdx))}
                    </div>
                    <div class="slide-opt-text" contenteditable="true" spellcheck="false" data-ppt-canvas-field="option" data-ppt-canvas-opt-idx="${oIdx}" title="Click to edit Option ${opt.key || String.fromCharCode(65 + oIdx)} on slide" style="color:${settings.optionTextColor || (settings.optionStyle === 'clean' && settings.theme === 'dark' ? '#FFFFFF' : '#111111')}; font-size:${settings.optionFontSize || 18}px;">
                      ${escapeHtml(opt.text || '')}
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Slide Diagrams / Graphs / Images Floating Layer (Support Multiple Images) -->
            ${getQuestionImages(activeQ).map((img, imgIdx) => `
              <div class="canva-transform-box slide-freeform-box slide-image-container ppt-resizable-box ${imgIdx === 0 ? 'is-selected' : ''}" data-image-id="${img.id || `img_${imgIdx}`}" data-image-index="${imgIdx}" style="transform:translate(${(img.posX || 0)}px, ${(img.posY || 0)}px); width:${(img.width || 260)}px; height:${(img.height || 200)}px; z-index:${40 + imgIdx};">
                <div class="canva-drag-bar">
                  <span class="canva-drag-pill" data-ppt-resize-type="image-position" data-image-id="${img.id || `img_${imgIdx}`}">✥ Diagram ${imgIdx + 1}</span>
                  <button type="button" class="canva-pill-action" data-action="ppt-remove-image" data-image-id="${img.id || `img_${imgIdx}`}" title="Remove Diagram ${imgIdx + 1}" style="background:#dc2626; color:#fff; border:none; border-radius:10px; padding:2px 7px; font-size:11px; cursor:pointer; font-weight:bold; line-height:1;">✕</button>
                </div>
                <div class="slide-image-wrapper">
                  <img src="${typeof img === 'string' ? img : img.dataUrl}" style="width:100%; height:100%; object-fit:contain; display:block; pointer-events:none;" alt="Question Diagram ${imgIdx + 1}" />
                </div>
                <!-- 8 Free-Transform Handles -->
                <div class="canva-handle canva-corner canva-nw" data-ppt-resize-type="image-resize-nw" data-image-id="${img.id || `img_${imgIdx}`}" title="Scale"></div>
                <div class="canva-handle canva-corner canva-ne" data-ppt-resize-type="image-resize-ne" data-image-id="${img.id || `img_${imgIdx}`}" title="Scale"></div>
                <div class="canva-handle canva-corner canva-se" data-ppt-resize-type="image-resize-se" data-image-id="${img.id || `img_${imgIdx}`}" title="Scale"></div>
                <div class="canva-handle canva-corner canva-sw" data-ppt-resize-type="image-resize-sw" data-image-id="${img.id || `img_${imgIdx}`}" title="Scale"></div>
                <div class="canva-handle canva-edge canva-n" data-ppt-resize-type="image-resize-n" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Height"></div>
                <div class="canva-handle canva-edge canva-s" data-ppt-resize-type="image-resize-s" data-image-id="${img.id || `img_${imgIdx}`}" title="Resize Height"></div>
                <div class="canva-handle canva-edge canva-e" data-ppt-resize-type="image-resize-e" data-image-id="${img.id || `img_${imgIdx}`}" title="Stretch Width Right ↔"></div>
                <div class="canva-handle canva-edge canva-w" data-ppt-resize-type="image-resize-w" data-image-id="${img.id || `img_${imgIdx}`}" title="Stretch Width Left ↔"></div>
              </div>
            `).join("")}

            <!-- Footer Bar (If Enabled) with Height Handle -->
            <div class="slide-footer-bar ppt-resizable-box" contenteditable="true" spellcheck="false" data-ppt-canvas-field="footer" title="Click to edit Footer on slide" style="display:${settings.showFooter !== false ? 'flex' : 'none'}; background:${settings.footerBg || '#7A0000'}; color:${settings.footerColor || '#FFFFFF'}; height:${settings.footerHeight || 28}px; font-size:${settings.footerFontSize || 13}px;">
              <div class="ppt-resize-handle ppt-resize-handle-s" style="top:-5px; bottom:auto;" data-ppt-resize-type="footer-height" title="Drag to adjust Footer Height"></div>
              ${escapeHtml(settings.footerText || '')}
            </div>
          </div>
        </div>

        <!-- Export Actions Bar -->
        <footer class="ppt-export-bar">
          <button class="ppt-btn ppt-btn-export" data-action="ppt-export-pptx">
            📊 Export .PPTX (PowerPoint)
          </button>
          <div style="display:flex; gap:6px;">
            <button class="ppt-btn ppt-btn-pdf" data-action="ppt-export-pdf-high" title="Ultra HD 300 DPI (Best for Print & Digital Boards)">
              🖨️ PDF (Ultra HD)
            </button>
            <button class="ppt-btn" data-action="ppt-export-pdf-medium" title="Standard Full HD">
              💻 PDF (Full HD)
            </button>
            <button class="ppt-btn" data-action="ppt-export-pdf-low" title="Compressed (Best for WhatsApp / Telegram)">
              📱 PDF (Low Size)
            </button>
          </div>
        </footer>
      </section>
    </main>
  `;
}


function renderPptImportWizardModal(state) {
  const ppt = state.ppt || {};
  const settings = ppt.wizardSettings || ppt.settings || {};
  const questions = ppt.pendingImportQuestions || ppt.questions || [];
  const qCount = questions.length;
  const previewQ = questions[0] || {
    number: "Q.1",
    exam: "SSC CGL 12/09/2025 (Shift 1)",
    topic: "RATIO & PROPORTION",
    english: "In how many years will a certain sum of money become 3.5 times itself at 14% simple interest?",
    hindi: "एक निश्चित धनराशि साधारण ब्याज की 14% दर पर कितने वर्षों में स्वयं की 3.5 गुनी हो जाएगी?",
    options: [{ key: "A", text: "15 years" }, { key: "B", text: "18 years" }, { key: "C", text: "20 years" }, { key: "D", text: "25 years" }]
  };

  const preset = settings.layoutPreset || "right-split";
  const posX = preset === "right-split" ? 42 : 0;
  const boxWidth = preset === "full-width" ? 100 : 56;

  return `
    <div class="ppt-modal-backdrop">
      <div class="ppt-wizard-modal">
        <header class="ppt-wizard-header">
          <h3>🎨 Choose Live Teaching Layout (Setup before Create)</h3>
          <button class="ppt-btn" data-action="ppt-cancel-wizard" style="padding:4px 10px;">✕ Cancel</button>
        </header>

        <div class="ppt-wizard-body">
          <!-- Left Column: Layout Presets & Styles -->
          <div style="display:flex; flex-direction:column; gap:14px;">
            <div>
              <div class="ppt-wizard-section-title">1. Select Teaching Screen Layout</div>
              <div class="ppt-wizard-preset-grid">
                <!-- Right Split -->
                <div class="ppt-preset-card ${preset === 'right-split' ? 'is-active' : ''}" data-action="ppt-wizard-set-preset" data-preset="right-split">
                  <div class="ppt-preset-icon">👨‍🏫</div>
                  <div class="ppt-preset-info">
                    <strong>Right Split (Teacher on Left)</strong>
                    <span>Best for YouTube Live / Digital Board. Left 40% open for handwritten math solutions.</span>
                  </div>
                </div>

                <!-- Full Width -->
                <div class="ppt-preset-card ${preset === 'full-width' ? 'is-active' : ''}" data-action="ppt-wizard-set-preset" data-preset="full-width">
                  <div class="ppt-preset-icon">🖥️</div>
                  <div class="ppt-preset-info">
                    <strong>Full Width Standard</strong>
                    <span>Centered 100% widescreen layout for standard slide presentations.</span>
                  </div>
                </div>

                <!-- Left Split -->
                <div class="ppt-preset-card ${preset === 'left-split' ? 'is-active' : ''}" data-action="ppt-wizard-set-preset" data-preset="left-split">
                  <div class="ppt-preset-icon">👩‍🏫</div>
                  <div class="ppt-preset-info">
                    <strong>Left Split (Teacher on Right)</strong>
                    <span>Question on left 56%, right open for writing.</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Option Visual Style -->
            <div>
              <div class="ppt-wizard-section-title">2. Option Cards Style</div>
              <div class="ppt-layout-btn-group">
                <button class="ppt-layout-btn ${(settings.optionStyle || 'clean') === 'clean' ? 'is-active' : ''}" data-action="ppt-wizard-set-option-style" data-style="clean">
                  📝 Clean Minimalist (a) (b) (Digital Board)
                </button>
                <button class="ppt-layout-btn ${settings.optionStyle === 'card' ? 'is-active' : ''}" data-action="ppt-wizard-set-option-style" data-style="card">
                  🔲 Highlighted Card Boxes [A] [B]
                </button>
              </div>
            </div>

            <!-- Theme Presets -->
            <div>
              <div class="ppt-wizard-section-title">3. Theme Palette</div>
              <div class="ppt-theme-grid">
                <button class="ppt-theme-card ${(settings.theme || 'dark') === 'dark' ? 'is-active' : ''}" data-action="ppt-wizard-set-theme" data-theme="dark">
                  <span class="ppt-theme-badge" style="background:#0B0F17; border:1px solid #555;"></span>
                  <span>Dark Board</span>
                </button>
                <button class="ppt-theme-card ${settings.theme === 'maroon' ? 'is-active' : ''}" data-action="ppt-wizard-set-theme" data-theme="maroon">
                  <span class="ppt-theme-badge" style="background:#7A0000;"></span>
                  <span>SSC Maroon</span>
                </button>
                <button class="ppt-theme-card ${settings.theme === 'navy' ? 'is-active' : ''}" data-action="ppt-wizard-set-theme" data-theme="navy">
                  <span class="ppt-theme-badge" style="background:#0A1931;"></span>
                  <span>Royal Navy</span>
                </button>
                <button class="ppt-theme-card ${settings.theme === 'emerald' ? 'is-active' : ''}" data-action="ppt-wizard-set-theme" data-theme="emerald">
                  <span class="ppt-theme-badge" style="background:#064E3B;"></span>
                  <span>Emerald Pro</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column: Live Mini Preview -->
          <div class="ppt-wizard-preview-container">
            <div class="ppt-wizard-section-title" style="display:flex; justify-content:space-between;">
              <span>Live 16:9 Preview (${qCount} questions ready)</span>
              <span style="color:#58a6ff;">${preset.toUpperCase()}</span>
            </div>

            <div class="ppt-wizard-preview-box" style="background:${settings.slideBg || '#0B0F17'};">
              <!-- Header Bar -->
              <div style="background:${settings.headerBg || '#111827'}; height:38px; display:flex; align-items:center; justify-content:space-between; padding:0 10px; flex-shrink:0;">
                <span style="background:${settings.qBadgeBg || '#E11D48'}; color:${settings.qBadgeColor || '#FFFFFF'}; font-weight:800; font-size:11px; padding:2px 8px; border-radius:12px;">Q.1</span>
                <span style="color:${settings.examColor || '#FFFFFF'}; font-weight:700; font-size:11px;">${previewQ.exam || 'SSC CGL (Shift 1)'}</span>
                <span style="color:${settings.topicColor || '#FBBF24'}; font-weight:800; font-size:11px;">${(previewQ.topic || 'TOPIC').toUpperCase()}</span>
              </div>

              <!-- Body Area -->
              <div style="padding:10px 14px; margin-left:${posX}%; max-width:${boxWidth}%; display:flex; flex-direction:column; flex:1; overflow:hidden;">
                <div style="color:${settings.engColor || '#FFFFFF'}; font-size:11px; font-weight:700; line-height:1.3; margin-bottom:4px;">
                  ${escapeHtml(previewQ.english)}
                </div>
                <div style="border-top:1.5px solid ${settings.dividerColor || '#1F2937'}; margin:3px 0;"></div>
                <div style="color:${settings.hindiColor || '#FBBF24'}; font-size:11px; font-weight:700; line-height:1.3; margin-bottom:6px;">
                  ${escapeHtml(previewQ.hindi)}
                </div>

                <!-- Options -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:auto;">
                  ${previewQ.options.slice(0, 4).map((opt, i) => `
                    <div style="
                      background:${settings.optionStyle === 'card' ? (settings.optionCardBg || '#1F2937') : 'transparent'};
                      border:${settings.optionStyle === 'card' ? `1px solid ${settings.optionBorderColor || '#374151'}` : 'none'};
                      border-radius:4px; padding:3px 6px; display:flex; align-items:center; gap:4px;
                    ">
                      <span style="font-size:10px; font-weight:800; color:${settings.optionStyle === 'card' ? (settings.optionBadgeColor || '#FFFFFF') : (settings.optionTextColor || '#FBBF24')};">
                        ${settings.optionStyle === 'card' ? opt.key : `(${opt.key.toLowerCase()})`}
                      </span>
                      <span style="font-size:10px; font-weight:700; color:${settings.optionTextColor || '#FFFFFF'};">${opt.text}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>

            <div style="font-size:11px; color:#8b949e; line-height:1.4;">
              💡 <b>Tip:</b> Layout apply hone ke baad aap live canvas par bhi kisi bhi box ko freely mouse se drag/resize kar sakte hain.
            </div>
          </div>
        </div>

        <footer class="ppt-wizard-footer">
          <button class="ppt-btn" data-action="ppt-cancel-wizard">Cancel</button>
          <button class="ppt-btn ppt-btn-primary" data-action="ppt-confirm-wizard-generate" style="padding:8px 24px; font-size:13px; font-weight:700;">
            🚀 Apply & Generate ${qCount} Slides
          </button>
        </footer>
      </div>
    </div>
  `;
}
