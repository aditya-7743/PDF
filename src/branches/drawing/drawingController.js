// Math Figures & Geometric Drawing Controller
import { branches } from "../index.js";


function handleDrawingPropertyInput(event) {
  const shape = findDrawing(state.selectedDrawingId);
  if (!shape) return;

  const input = event.currentTarget;
  const key = input.dataset.drawingProp;
  const value = input.type === "checkbox" ? input.checked : input.value;

  recordUndo();
  applyDrawingProperty(shape, key, value);
  commitDrawingSurface();
}


function handleDrawingAction(event) {
  const action = event.currentTarget.dataset.drawingAction;
  const shape = findDrawing(state.selectedDrawingId);

  if (action === "clear-canvas") {
    recordUndo();
    clearCanvas();
    return;
  }

  if (action === "delete" && shape) {
    recordUndo();
    state.drawings = (state.drawings || []).filter((item) => item.id !== shape.id);
    state.selectedDrawingId = "";
    state.cropMode = false;
    commitDrawingSurface({ rerender: true });
    return;
  }

  if (action === "duplicate" && shape) {
    recordUndo();
    const duplicate = cloneDrawing(shape);
    state.drawings = [...(state.drawings || []), duplicate];
    state.selectedDrawingId = duplicate.id;
    state.cropMode = false;
    commitDrawingSurface({ rerender: true });
    return;
  }

  if ((action === "front" || action === "back") && shape) {
    recordUndo();
    const drawings = (state.drawings || []).filter((item) => item.id !== shape.id);
    state.drawings = action === "front" ? [...drawings, shape] : [shape, ...drawings];
    commitDrawingSurface({ rerender: true });
    return;
  }

  if (action === "crop-toggle" && shape) {
    recordUndo();
    state.cropMode = !state.cropMode;
    commitDrawingSurface({ rerender: true });
    return;
  }

  if (action === "reset-crop" && shape) {
    recordUndo();
    shape.crop = createDefaultCrop();
    state.cropMode = false;
    commitDrawingSurface({ rerender: true });
    return;
  }
}


function handleManualLabelInput(event) {
  state.manualLabel = event.currentTarget.value;

  const selectedShape = findDrawing(state.selectedDrawingId);
  if (selectedShape && supportsDrawingText(selectedShape.type)) {
    selectedShape.text = state.manualLabel;
    commitDrawingSurface();
    saveState(state);
    return;
  }

  if (state.activeDrawTool && !app.querySelector("[data-drawing-surface]")) {
    state.visualOverride = renderManualFigure(state.activeDrawTool);
    const renderTarget = app.querySelector(".equation-render");
    if (renderTarget) {
      renderTarget.innerHTML = state.visualOverride;
      requestAnimationFrame(fitEquationPreview);
    }
  }
  saveState(state);
}


function handleToolSelect(event) {
  const toolId = event.currentTarget.value;
  if (!toolId) return;
  insertTool(toolId);
  render();
}


function handleToolGroupToggle(event) {
  const currentGroup = event.currentTarget;
  const groupId = currentGroup.dataset.toolGroup || "";

  if (currentGroup.open) {
    state.openToolGroup = groupId;
    app.querySelectorAll("[data-tool-group]").forEach((group) => {
      if (group !== currentGroup) group.open = false;
    });
  } else if (state.openToolGroup === groupId) {
    state.openToolGroup = "";
  }

  saveState(state);
}


function insertTool(toolId) {
  const toolRecord = findTool(toolId);
  if (!toolRecord) return;

  state.input = toolRecord.tool.latex || "";
  state.visualOverride = toolRecord.tool.figure ? renderToolFigure(toolRecord.tool) : "";
  clearDrawingState();
  state.openToolGroup = toolRecord.groupId;
  state.activeToolId = toolRecord.tool.id;
}


function selectFigureTool(toolId) {
  const toolRecord = findTool(toolId);
  if (!toolRecord || !toolRecord.tool.figure) return;

  state.mode = "math-figures";
  state.input = "";
  state.visualOverride = renderDrawingSurface();
  state.openToolGroup = toolRecord.groupId;
  state.activeToolId = toolRecord.tool.id;
  state.activeFigureTool = toolRecord.tool.id;
  state.activeDrawTool = "";
}


function clearDrawingState() {
  state.drawings = [];
  state.selectedDrawingId = "";
  state.activeFigureTool = "";
  state.cropMode = false;
}


function drawManualTool(toolId) {
  const tool = (branches.tools.authoring?.drawTools || []).find((item) => item.id === toolId);
  if (!tool) return;

  preserveDrawingMode("math-figures");
  state.input = "";
  state.visualOverride = renderDrawingSurface();
  state.activeFigureTool = tool.id;
  state.activeDrawTool = tool.id;
  state.activeToolId = "";
}


function insertPlainLabelText() {
  const text = String(state.manualLabel || "").trim();
  if (!text) return;

  const id = `plain-text-${Date.now()}`;
  preserveDrawingMode("math-figures");
  state.input = "";
  state.drawings = [
    ...(state.drawings || []),
    {
      id,
      type: "plain-text",
      x1: 430,
      y1: 270,
      x2: 570,
      y2: 320,
      rotation: 0,
      crop: createDefaultCrop(),
      text,
      fontFamily: state.fontFamily,
      fontSize: state.fontSize,
      textColor: state.textColor,
      bold: false,
      italic: false,
      underline: false,
      ...createDefaultDrawingStyle("plain-text"),
    },
  ];
  state.selectedDrawingId = id;
  state.cropMode = false;
  state.activeFigureTool = "plain-text";
  state.activeDrawTool = "";
  state.activeToolId = "";
  state.visualOverride = renderDrawingSurface();
}


function syncManualLabelFromSelectedDrawing() {
  const shape = findDrawing(state.selectedDrawingId);
  if (shape && supportsDrawingText(shape.type)) {
    state.manualLabel = shape.text || state.manualLabel || "";
  }
}


function findSelectedPlainTextDrawing() {
  const shape = findDrawing(state.selectedDrawingId);
  return shape?.type === "plain-text" ? shape : null;
}


function clearCanvas() {
  preserveDrawingMode("math-figures");
  state.input = "";
  state.drawings = [];
  state.selectedDrawingId = "";
  state.cropMode = false;
  state.activeFigureTool = "blank-canvas";
  state.activeDrawTool = "";
  state.activeToolId = "";
  commitDrawingSurface({ rerender: true });
}


function startDrawing(event) {
  const surface = event.currentTarget;
  if (event.button !== 0) return;

  const cropToggle = event.target.closest("[data-crop-toggle]");
  if (cropToggle && state.selectedDrawingId) {
    event.preventDefault();
    state.cropMode = !state.cropMode;
    commitDrawingSurface({ rerender: true });
    return;
  }

  const rotateHandle = event.target.closest("[data-rotate-handle]");
  if (rotateHandle && state.selectedDrawingId) {
    event.preventDefault();
    startEditSession("rotate", surface, event);
    return;
  }

  const editHandle = event.target.closest("[data-edit-handle]");
  if (editHandle && state.selectedDrawingId) {
    event.preventDefault();
    startEditSession(state.cropMode ? "crop" : "resize", surface, event, editHandle.dataset.editHandle);
    return;
  }

  const shapeNode = event.target.closest("[data-shape-id]");
  if (shapeNode) {
    event.preventDefault();
    state.selectedDrawingId = shapeNode.dataset.shapeId;
    syncManualLabelFromSelectedDrawing();
    state.cropMode = false;
    startEditSession("move", surface, event);
    updateDrawingSurface();
    saveState(state);
    return;
  }

  if (state.selectedDrawingId) {
    event.preventDefault();
    state.selectedDrawingId = "";
    state.cropMode = false;
    commitDrawingSurface({ rerender: true });
    return;
  }

  if (!state.activeFigureTool || state.activeFigureTool === "blank-canvas") return;

  const start = readSurfacePoint(surface, event);
  drawSession = {
    surface,
    type: state.activeFigureTool,
    start,
    current: start,
  };

  surface.setPointerCapture?.(event.pointerId);
  event.preventDefault();
  window.addEventListener("pointermove", handleDrawingMove);
  window.addEventListener("pointerup", finishDrawing);
  window.addEventListener("pointercancel", cancelDrawing);
  updateDrawingSurface(drawSession);
}


function startEditSession(mode, surface, event, handle = "") {
  const shape = findDrawing(state.selectedDrawingId);
  if (!shape) return;

  editSession = {
    mode,
    handle,
    surface,
    start: readSurfacePoint(surface, event),
    original: structuredClone(shape),
  };

  surface.setPointerCapture?.(event.pointerId);
  window.addEventListener("pointermove", handleEditMove);
  window.addEventListener("pointerup", finishEdit);
  window.addEventListener("pointercancel", cancelEdit);
}


function handleDrawingMove(event) {
  if (!drawSession) return;

  drawSession.current = readSurfacePoint(drawSession.surface, event);
  updateDrawingSurface(drawSession);
}


function handleEditMove(event) {
  if (!editSession) return;

  const point = readSurfacePoint(editSession.surface, event);
  const shape = findDrawing(editSession.original.id);
  if (!shape) return;

  if (editSession.mode === "move") {
    applyMoveEdit(shape, point);
  }

  if (editSession.mode === "resize") {
    applyResizeEdit(shape, point);
  }

  if (editSession.mode === "rotate") {
    applyRotateEdit(shape, point);
  }

  if (editSession.mode === "crop") {
    applyCropEdit(shape, point);
  }

  updateDrawingSurface();
}


function finishDrawing(event) {
  if (!drawSession) return;

  drawSession.current = readSurfacePoint(drawSession.surface, event);
  const nextShape = createDrawnShape(drawSession.type, drawSession.start, drawSession.current);
  if (nextShape) {
    state.drawings = [...(state.drawings || []), nextShape];
    state.selectedDrawingId = nextShape.id;
    state.cropMode = false;
  }

  cleanupDrawingSession();
  commitDrawingSurface({ rerender: true });
}


function finishEdit() {
  if (!editSession) return;

  cleanupEditSession();
  commitDrawingSurface({ rerender: true });
}


function cancelEdit() {
  if (!editSession) return;

  const index = findDrawingIndex(editSession.original.id);
  if (index >= 0) {
    state.drawings[index] = editSession.original;
  }
  cleanupEditSession();
  commitDrawingSurface({ rerender: true });
}


function cancelDrawing() {
  cleanupDrawingSession();
  updateDrawingSurface();
}


function cleanupDrawingSession() {
  drawSession = null;
  window.removeEventListener("pointermove", handleDrawingMove);
  window.removeEventListener("pointerup", finishDrawing);
  window.removeEventListener("pointercancel", cancelDrawing);
}


function cleanupEditSession() {
  editSession = null;
  window.removeEventListener("pointermove", handleEditMove);
  window.removeEventListener("pointerup", finishEdit);
  window.removeEventListener("pointercancel", cancelEdit);
}


function applyMoveEdit(shape, point) {
  const dx = point.x - editSession.start.x;
  const dy = point.y - editSession.start.y;

  shape.x1 = editSession.original.x1 + dx;
  shape.y1 = editSession.original.y1 + dy;
  shape.x2 = editSession.original.x2 + dx;
  shape.y2 = editSession.original.y2 + dy;
}


function applyResizeEdit(shape, point) {
  const bounds = getShapeBounds(editSession.original);
  let next = { ...bounds };
  const handle = editSession.handle;

  if (handle.includes("w")) next.left = point.x;
  if (handle.includes("e")) next.right = point.x;
  if (handle.includes("n")) next.top = point.y;
  if (handle.includes("s")) next.bottom = point.y;

  next = normalizeBounds(next, 14);
  shape.x1 = next.left;
  shape.y1 = next.top;
  shape.x2 = next.right;
  shape.y2 = next.bottom;
}


function applyRotateEdit(shape, point) {
  const bounds = getShapeBounds(editSession.original);
  const center = getBoundsCenter(bounds);
  const startAngle = Math.atan2(editSession.start.y - center.y, editSession.start.x - center.x);
  const currentAngle = Math.atan2(point.y - center.y, point.x - center.x);
  const delta = ((currentAngle - startAngle) * 180) / Math.PI;

  shape.rotation = Math.round(((editSession.original.rotation || 0) + delta) * 10) / 10;
}


function applyCropEdit(shape, point) {
  const bounds = getShapeBounds(editSession.original);
  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const originalCrop = normalizeCrop(editSession.original.crop);
  const crop = { ...originalCrop };
  const handle = editSession.handle;
  const xRatio = clamp((point.x - bounds.left) / width, 0, 1);
  const yRatio = clamp((point.y - bounds.top) / height, 0, 1);
  const minimum = 0.08;

  if (handle.includes("w")) crop.left = Math.min(xRatio, crop.right - minimum);
  if (handle.includes("e")) crop.right = Math.max(xRatio, crop.left + minimum);
  if (handle.includes("n")) crop.top = Math.min(yRatio, crop.bottom - minimum);
  if (handle.includes("s")) crop.bottom = Math.max(yRatio, crop.top + minimum);

  shape.crop = crop;
}


function readSurfacePoint(surface, event) {
  const rect = surface.getBoundingClientRect();
  const x = rect.width > 0 ? ((event.clientX - rect.left) / rect.width) * 1000 : 0;
  const y = rect.height > 0 ? ((event.clientY - rect.top) / rect.height) * 600 : 0;

  return {
    x: clamp(Math.round(x), 0, 1000),
    y: clamp(Math.round(y), 0, 600),
  };
}


function createDrawnShape(type, start, end) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const isPoint = type === "point";
  const clickSize = getClickSizeForDrawingTool(type);
  const useClickSize = !isPoint && distance < 8 && clickSize;

  if (!isPoint && distance < 8 && !clickSize) return null;

  const x2 = useClickSize ? clamp(start.x + clickSize.width, 0, 1000) : end.x;
  const y2 = useClickSize ? clamp(start.y + clickSize.height, 0, 600) : end.y;

  return {
    id: `${type}-${Date.now()}-${Math.round(start.x)}-${Math.round(start.y)}`,
    type,
    x1: start.x,
    y1: start.y,
    x2,
    y2,
    rotation: 0,
    crop: createDefaultCrop(),
    text: supportsDrawingText(type) ? getDefaultDrawingText(type) : "",
    ...createDefaultDrawingStyle(type),
  };
}


function getClickSizeForDrawingTool(type) {
  return (
    {
      label: { width: 160, height: 62 },
      callout: { width: 220, height: 120 },
      crosshair: { width: 90, height: 90 },
      "level-line": { width: 260, height: 52 },
      ruler: { width: 260, height: 58 },
      protractor: { width: 230, height: 125 },
      axis: { width: 180, height: 140 },
      highlight: { width: 180, height: 86 },
    }[type] || null
  );
}


function supportsDrawingText(type) {
  return ["plain-text", "label", "callout", "double-arrow", "angle", "level-line", "ruler", "protractor"].includes(type);
}


function getDefaultDrawingText(type) {
  const manualText = String(state.manualLabel || "").trim();
  if (manualText) return manualText;

  return (
    {
      label: "Label",
      callout: "Callout",
      "double-arrow": "Length",
      angle: "Angle",
      "level-line": "Level",
      ruler: "Scale",
      protractor: "Angle",
    }[type] || ""
  );
}


function createDefaultCrop() {
  return {
    left: 0,
    top: 0,
    right: 1,
    bottom: 1,
  };
}


function createDefaultDrawingStyle(type = "") {
  const style = {
    strokeColor: branches.preview.defaultDrawingStroke,
    fillColor: branches.preview.defaultDrawingFill,
    strokeWidth: branches.preview.defaultDrawingStrokeWidth,
    fillOpacity: branches.preview.defaultDrawingFillOpacity,
    opacity: branches.preview.defaultDrawingOpacity,
    lineStyle: branches.preview.defaultDrawingLineStyle,
    lineCap: branches.preview.defaultDrawingLineCap,
    lineJoin: branches.preview.defaultDrawingLineJoin,
    fillEnabled: true,
  };

  if (["plain-text", "line", "arrow", "double-arrow", "angle", "level-line", "crosshair", "axis", "rectangle", "circle", "ellipse", "triangle"].includes(type)) {
    style.fillEnabled = false;
  }

  if (["label", "callout"].includes(type)) {
    style.fillColor = "#ffffff";
    style.fillOpacity = 0.94;
  }

  if (["ruler", "protractor"].includes(type)) {
    style.fillColor = "#ffffff";
    style.fillOpacity = 0.9;
  }

  if (type === "highlight") {
    style.strokeColor = "#c79700";
    style.fillColor = "#ffe36e";
    style.fillOpacity = 0.38;
    style.opacity = 0.92;
  }

  return style;
}


function applyDrawingProperty(shape, key, value) {
  const bounds = getShapeBounds(shape);
  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);

  if (key === "x") {
    const left = clamp(Number(value), 0, 1000 - width);
    setShapeBounds(shape, { ...bounds, left, right: left + width });
    return;
  }

  if (key === "y") {
    const top = clamp(Number(value), 0, 600 - height);
    setShapeBounds(shape, { ...bounds, top, bottom: top + height });
    return;
  }

  if (key === "width") {
    const nextWidth = clamp(Number(value), 1, 1000 - bounds.left);
    setShapeBounds(shape, { ...bounds, right: bounds.left + nextWidth });
    return;
  }

  if (key === "height") {
    const nextHeight = clamp(Number(value), 1, 600 - bounds.top);
    setShapeBounds(shape, { ...bounds, bottom: bounds.top + nextHeight });
    return;
  }

  if (key === "rotation") {
    shape.rotation = Math.round(clamp(Number(value), -360, 360) * 10) / 10;
    return;
  }

  if (key === "strokeColor" || key === "fillColor") {
    shape[key] = sanitizeHexColor(value, key === "strokeColor" ? branches.preview.defaultDrawingStroke : branches.preview.defaultDrawingFill);
    return;
  }

  if (key === "strokeWidth") {
    shape.strokeWidth = clamp(Number(value), 1, 18);
    return;
  }

  if (key === "fillOpacity") {
    shape.fillOpacity = clamp(Number(value), 0, 1);
    return;
  }

  if (key === "opacity") {
    shape.opacity = clamp(Number(value), 0.1, 1);
    return;
  }

  if (key === "fillEnabled") {
    shape.fillEnabled = Boolean(value);
    return;
  }

  if (key === "lineStyle") {
    shape.lineStyle = ["solid", "dash", "dot"].includes(value) ? value : branches.preview.defaultDrawingLineStyle;
    return;
  }

  if (key === "lineCap") {
    shape.lineCap = ["round", "square", "butt"].includes(value) ? value : branches.preview.defaultDrawingLineCap;
    return;
  }

  if (key === "lineJoin") {
    shape.lineJoin = ["round", "miter", "bevel"].includes(value) ? value : branches.preview.defaultDrawingLineJoin;
  }
}


function setShapeBounds(shape, bounds) {
  const next = normalizeBounds(bounds, 1);
  shape.x1 = Math.round(next.left);
  shape.y1 = Math.round(next.top);
  shape.x2 = Math.round(next.right);
  shape.y2 = Math.round(next.bottom);
}


function cloneDrawing(shape) {
  const duplicate = structuredClone(shape);
  const bounds = getShapeBounds(shape);
  const offsetX = bounds.right + 34 <= 1000 ? 34 : -34;
  const offsetY = bounds.bottom + 34 <= 600 ? 34 : -34;
  duplicate.id = `${shape.type}-${Date.now()}-copy`;
  duplicate.x1 = clamp(Math.round(shape.x1 + offsetX), 0, 1000);
  duplicate.y1 = clamp(Math.round(shape.y1 + offsetY), 0, 600);
  duplicate.x2 = clamp(Math.round(shape.x2 + offsetX), 0, 1000);
  duplicate.y2 = clamp(Math.round(shape.y2 + offsetY), 0, 600);
  duplicate.crop = normalizeCrop(duplicate.crop);
  return duplicate;
}


function commitDrawingSurface(options = {}) {
  state.visualOverride = renderDrawingSurface();
  if (options.rerender) {
    render();
    return;
  }

  updateDrawingSurface();
  saveState(state);
  requestAnimationFrame(fitEquationPreview);
}


function updateDrawingSurface(draftSession = null) {
  const surface = app.querySelector("[data-drawing-surface]");
  if (!surface) return;

  const draft = draftSession ? createDrawnShape(draftSession.type, draftSession.start, draftSession.current) : null;
  surface.innerHTML = renderDrawingElements([...(state.drawings || []), ...(draft ? [draft] : [])], {
    showSelection: !draft,
  });
  if (!draft) {
    state.visualOverride = renderDrawingSurface();
  }
}


function startColumnResize(event) {
  if (event.button !== 0) return;
  const workbench = event.currentTarget.closest(".workbench");
  if (!workbench) return;

  event.preventDefault();
  resizeSession = {
    handle: event.currentTarget.dataset.columnResizer,
    startX: event.clientX,
    startColumns: normalizeColumnSizes(state.columns),
    width: Math.max(1, workbench.getBoundingClientRect().width),
  };

  document.body.classList.add("is-resizing-columns");
  window.addEventListener("pointermove", handleColumnResizeMove);
  window.addEventListener("pointerup", stopColumnResize);
  window.addEventListener("pointercancel", stopColumnResize);
}


function handleColumnResizeMove(event) {
  if (!resizeSession) return;

  const delta = ((event.clientX - resizeSession.startX) / resizeSession.width) * 100;
  const nextColumns =
    resizeSession.handle === "tools-editor"
      ? resizeColumnPair(resizeSession.startColumns, "tools", "editor", delta)
      : resizeSession.handle === "tools-preview"
        ? resizeColumnPair(resizeSession.startColumns, "tools", "preview", delta)
      : resizeColumnPair(resizeSession.startColumns, "editor", "preview", delta);

  state.columns = nextColumns;
  applyColumnStyles(nextColumns);
  requestAnimationFrame(fitEquationPreview);
}


function stopColumnResize() {
  if (!resizeSession) return;

  state.columns = normalizeColumnSizes(state.columns);
  resizeSession = null;
  document.body.classList.remove("is-resizing-columns");
  window.removeEventListener("pointermove", handleColumnResizeMove);
  window.removeEventListener("pointerup", stopColumnResize);
  window.removeEventListener("pointercancel", stopColumnResize);
  saveState(state);
  requestAnimationFrame(fitEquationPreview);
}


function resizeColumnPair(columns, leftKey, rightKey, delta) {
  const minimum = branches.app.minColumns;
  const pairTotal = columns[leftKey] + columns[rightKey];
  const maxLeft = Math.max(minimum[leftKey], pairTotal - minimum[rightKey]);
  const nextLeft = clamp(columns[leftKey] + delta, minimum[leftKey], maxLeft);

  return normalizeColumnSizes({
    ...columns,
    [leftKey]: Math.round(nextLeft * 10) / 10,
    [rightKey]: Math.round((pairTotal - nextLeft) * 10) / 10,
  });
}


function applyColumnStyles(columns) {
  const workbench = app.querySelector(".workbench");
  if (!workbench) return;

  workbench.style.setProperty("--tools-col", `${columns.tools}fr`);
  workbench.style.setProperty("--editor-col", `${columns.editor}fr`);
  workbench.style.setProperty("--preview-col", `${columns.preview}fr`);
}


function findTool(toolId) {
  for (const group of branches.tools.groups || []) {
    const match = group.items.find((item) => item.id === toolId);
    if (match) {
      return {
        groupId: group.id,
        tool: match,
      };
    }
  }
  return null;
}


function renderDrawingSurface() {
  return `
    <div class="drawing-workspace" contenteditable="false">
      <svg class="drawing-surface" data-drawing-surface="true" viewBox="0 0 1000 600" role="img" aria-label="Drawing canvas">
        ${renderDrawingElements(state.drawings || [])}
      </svg>
    </div>
  `;
}


function renderDrawingElements(shapes = [], options = {}) {
  const showSelection = options.showSelection !== false;
  const selected = showSelection ? findDrawing(state.selectedDrawingId) : null;
  return `
    <defs>
      <marker id="drawArrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 Z" fill="currentColor"></path>
      </marker>
      <marker id="drawArrowStart" markerWidth="10" markerHeight="10" refX="1" refY="5" orient="auto">
        <path d="M10,0 L0,5 L10,10 Z" fill="currentColor"></path>
      </marker>
    </defs>
    ${shapes.map(renderDrawnShape).join("")}
    ${selected ? renderSelectionControls(selected) : ""}
  `;
}


function renderDrawnShape(shape) {
  const bounds = getShapeBounds(shape);
  const center = getBoundsCenter(bounds);
  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const clipId = `clip-${escapeHtml(shape.id)}`;
  const cropRect = getCropRect(shape, bounds);
  const cropClipRect = getCropClipRect(shape, bounds, cropRect);
  const shouldClip = !isDefaultCrop(shape.crop);
  const rotation = Number(shape.rotation || 0);
  const geometry = renderShapeGeometry(shape, bounds, center, width, height);
  const style = renderDrawingStyle(shape);
  const clipMarkup = shouldClip
    ? `<clipPath id="${clipId}">
        <rect x="${cropClipRect.left}" y="${cropClipRect.top}" width="${cropClipRect.right - cropClipRect.left}" height="${cropClipRect.bottom - cropClipRect.top}"></rect>
      </clipPath>`
    : "";
  const clipAttribute = shouldClip ? ` clip-path="url(#${clipId})"` : "";

  return `
    ${clipMarkup}
    <g class="draw-shape" data-shape-id="${escapeHtml(shape.id)}" style="${style}" transform="rotate(${rotation} ${center.x} ${center.y})"${clipAttribute}>
      ${geometry}
    </g>
  `;
}


function renderDrawingStyle(shape) {
  const strokeColor = sanitizeHexColor(shape.strokeColor, branches.preview.defaultDrawingStroke);
  const fillColor = shape.fillEnabled === false ? "none" : sanitizeHexColor(shape.fillColor, branches.preview.defaultDrawingFill);
  const strokeWidth = clamp(Number(shape.strokeWidth ?? branches.preview.defaultDrawingStrokeWidth), 1, 18);
  const thinWidth = Math.max(1, Math.round(strokeWidth * 0.62 * 10) / 10);
  const fillOpacity = clamp(Number(shape.fillOpacity ?? branches.preview.defaultDrawingFillOpacity), 0, 1);
  const opacity = clamp(Number(shape.opacity ?? branches.preview.defaultDrawingOpacity), 0.1, 1);
  const lineCap = ["round", "square", "butt"].includes(shape.lineCap) ? shape.lineCap : branches.preview.defaultDrawingLineCap;
  const lineJoin = ["round", "miter", "bevel"].includes(shape.lineJoin) ? shape.lineJoin : branches.preview.defaultDrawingLineJoin;
  const dashArray = {
    dash: "16 10",
    dot: "2 10",
    solid: "none",
  }[shape.lineStyle] || "none";

  return [
    `color:${strokeColor}`,
    `--draw-stroke:${strokeColor}`,
    `--draw-fill:${fillColor}`,
    `--draw-stroke-width:${strokeWidth}`,
    `--draw-thin-width:${thinWidth}`,
    `--draw-fill-opacity:${fillOpacity}`,
    `--draw-opacity:${opacity}`,
    `--draw-dasharray:${dashArray}`,
    `--draw-linecap:${lineCap}`,
    `--draw-linejoin:${lineJoin}`,
  ].join(";");
}


function renderShapeGeometry(shape, bounds, center, width, height) {
  if (shape.type === "point") {
    return `<circle class="draw-point" cx="${shape.x1}" cy="${shape.y1}" r="7"></circle>`;
  }

  if (shape.type === "plain-text") {
    return renderPlainTextShape(shape, center, width, height);
  }

  if (shape.type === "label") {
    return renderLabelShape(shape, bounds, center, width, height);
  }

  if (shape.type === "callout") {
    return renderCalloutShape(shape, bounds, width, height);
  }

  if (shape.type === "line" || shape.type === "line-segment") {
    return `<line class="draw-line" x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}"></line>`;
  }

  if (shape.type === "arrow" || shape.type === "ray") {
    return `<line class="draw-line" marker-end="url(#drawArrow)" x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}"></line>`;
  }

  if (shape.type === "double-arrow") {
    return renderDoubleArrowShape(shape, center);
  }

  if (shape.type === "angle") {
    return renderAngleShape(shape, bounds, center, width, height);
  }

  if (shape.type === "crosshair") {
    return `
      <line class="draw-line" x1="${bounds.left}" y1="${center.y}" x2="${bounds.right}" y2="${center.y}"></line>
      <line class="draw-line" x1="${center.x}" y1="${bounds.top}" x2="${center.x}" y2="${bounds.bottom}"></line>
      <ellipse class="draw-thin no-fill" cx="${center.x}" cy="${center.y}" rx="${width / 4}" ry="${height / 4}"></ellipse>
    `;
  }

  if (shape.type === "axis") {
    return `
      <line class="draw-line" marker-end="url(#drawArrow)" x1="${bounds.left}" y1="${bounds.bottom}" x2="${bounds.right}" y2="${bounds.bottom}"></line>
      <line class="draw-line" marker-end="url(#drawArrow)" x1="${bounds.left}" y1="${bounds.bottom}" x2="${bounds.left}" y2="${bounds.top}"></line>
      <text class="draw-label-text" x="${bounds.right - 18}" y="${bounds.bottom - 18}" text-anchor="middle" dominant-baseline="middle" style="font-size:22px">X</text>
      <text class="draw-label-text" x="${bounds.left + 22}" y="${bounds.top + 22}" text-anchor="middle" dominant-baseline="middle" style="font-size:22px">Y</text>
    `;
  }

  if (shape.type === "level-line") {
    return renderLevelLineShape(shape, bounds, center, width);
  }

  if (shape.type === "ruler") {
    return renderRulerShape(shape, bounds, width, height);
  }

  if (shape.type === "protractor") {
    return renderProtractorShape(shape, bounds, center, width, height);
  }

  if (shape.type === "highlight") {
    return `<rect class="draw-highlight" x="${bounds.left}" y="${bounds.top}" width="${width}" height="${height}" rx="10"></rect>`;
  }

  if (["triangle", "right-triangle", "equilateral-triangle"].includes(shape.type)) {
    if (shape.type === "right-triangle") {
      return `<polygon class="draw-fill" points="${bounds.left},${bounds.bottom} ${bounds.left},${bounds.top} ${bounds.right},${bounds.bottom}"></polygon>`;
    }
    return `<polygon class="draw-fill" points="${center.x},${bounds.top} ${bounds.left},${bounds.bottom} ${bounds.right},${bounds.bottom}"></polygon>`;
  }

  if (shape.type === "square") {
    const size = Math.min(width, height);
    return `<rect class="draw-fill" x="${bounds.left}" y="${bounds.top}" width="${size}" height="${size}"></rect>`;
  }

  if (shape.type === "rectangle") {
    return `<rect class="draw-fill" x="${bounds.left}" y="${bounds.top}" width="${width}" height="${height}"></rect>`;
  }

  if (shape.type === "parallelogram") {
    const shift = width * 0.18;
    return `<polygon class="draw-fill" points="${bounds.left + shift},${bounds.top} ${bounds.right},${bounds.top} ${bounds.right - shift},${bounds.bottom} ${bounds.left},${bounds.bottom}"></polygon>`;
  }

  if (shape.type === "rhombus") {
    return `<polygon class="draw-fill" points="${center.x},${bounds.top} ${bounds.right},${center.y} ${center.x},${bounds.bottom} ${bounds.left},${center.y}"></polygon>`;
  }

  if (shape.type === "trapezium") {
    const inset = width * 0.22;
    return `<polygon class="draw-fill" points="${bounds.left + inset},${bounds.top} ${bounds.right - inset},${bounds.top} ${bounds.right},${bounds.bottom} ${bounds.left},${bounds.bottom}"></polygon>`;
  }

  if (shape.type === "circle") {
    const radius = Math.min(width, height) / 2;
    return `<circle class="draw-fill" cx="${center.x}" cy="${center.y}" r="${radius}"></circle>`;
  }

  if (shape.type === "semicircle") {
    return `<path class="draw-fill" d="M${bounds.left} ${bounds.bottom} A${width / 2} ${height} 0 0 1 ${bounds.right} ${bounds.bottom} Z"></path>`;
  }

  if (shape.type === "sector") {
    return `<path class="draw-fill" d="M${center.x} ${bounds.bottom} L${center.x} ${bounds.top} A${width / 2} ${height / 2} 0 0 1 ${bounds.right} ${center.y} Z"></path>`;
  }

  if (shape.type === "ellipse") {
    return `<ellipse class="draw-fill" cx="${center.x}" cy="${center.y}" rx="${width / 2}" ry="${height / 2}"></ellipse>`;
  }

  if (shape.type === "regular-polygon") {
    return renderRegularPolygon(center.x, center.y, Math.min(width, height) / 2, 6);
  }

  if (shape.type === "cube" || shape.type === "cuboid") {
    return renderBoxShape(bounds, shape.type === "cube");
  }

  if (shape.type === "cylinder") {
    return renderCylinderShape(bounds);
  }

  if (shape.type === "cone") {
    return renderConeShape(bounds);
  }

  if (shape.type === "sphere") {
    const radius = Math.min(width, height) / 2;
    return `<circle class="draw-fill" cx="${center.x}" cy="${center.y}" r="${radius}"></circle><ellipse class="draw-dash no-fill" cx="${center.x}" cy="${center.y}" rx="${radius}" ry="${radius * 0.28}"></ellipse>`;
  }

  if (shape.type === "hemisphere") {
    return `<path class="draw-fill" d="M${bounds.left} ${center.y} A${width / 2} ${height / 2} 0 0 1 ${bounds.right} ${center.y} A${width / 2} ${height / 7} 0 0 1 ${bounds.left} ${center.y} Z"></path>`;
  }

  if (shape.type === "pyramid") {
    return `<polygon class="draw-fill" points="${center.x},${bounds.top} ${bounds.left},${bounds.bottom - height * 0.15} ${bounds.right - width * 0.25},${bounds.bottom} ${bounds.right},${bounds.bottom - height * 0.45}"></polygon>`;
  }

  if (shape.type === "frustum") {
    return renderFrustumShape(bounds);
  }

  return `<rect class="draw-fill" x="${bounds.left}" y="${bounds.top}" width="${width}" height="${height}"></rect>`;
}


function renderSelectionControls(shape) {
  const bounds = state.cropMode ? getCropRect(shape, getShapeBounds(shape)) : getShapeBounds(shape);
  const center = getBoundsCenter(getShapeBounds(shape));
  const rotation = Number(shape.rotation || 0);
  const handles = renderSelectionHandles(bounds);
  const cropClass = state.cropMode ? " is-crop-mode" : "";
  const toolbarX = bounds.right + 12;
  const toolbarY = Math.max(18, bounds.top - 34);

  return `
    <g class="selection-layer${cropClass}" transform="rotate(${rotation} ${center.x} ${center.y})">
      <rect class="selection-rect" x="${bounds.left}" y="${bounds.top}" width="${bounds.right - bounds.left}" height="${bounds.bottom - bounds.top}"></rect>
      <line class="rotate-stem" x1="${(bounds.left + bounds.right) / 2}" y1="${bounds.top}" x2="${(bounds.left + bounds.right) / 2}" y2="${bounds.top - 30}"></line>
      <circle class="rotate-handle" data-rotate-handle="true" cx="${(bounds.left + bounds.right) / 2}" cy="${bounds.top - 40}" r="11"></circle>
      ${handles}
      <g class="crop-toggle${state.cropMode ? " is-active" : ""}" data-crop-toggle="true" transform="translate(${toolbarX} ${toolbarY})">
        <rect x="0" y="0" width="48" height="22" rx="5"></rect>
        <path d="M13 6 V15 H22 M17 6 H26 V15" />
      </g>
    </g>
  `;
}


function renderSelectionHandles(bounds) {
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  const handles = [
    ["nw", bounds.left, bounds.top],
    ["n", centerX, bounds.top],
    ["ne", bounds.right, bounds.top],
    ["e", bounds.right, centerY],
    ["se", bounds.right, bounds.bottom],
    ["s", centerX, bounds.bottom],
    ["sw", bounds.left, bounds.bottom],
    ["w", bounds.left, centerY],
  ];

  return handles
    .map(([id, x, y]) => `<rect class="selection-handle handle-${id}" data-edit-handle="${id}" x="${x - 7}" y="${y - 7}" width="14" height="14" rx="3"></rect>`)
    .join("");
}


function findDrawing(id) {
  return (state.drawings || []).find((shape) => shape.id === id) || null;
}


function findDrawingIndex(id) {
  return (state.drawings || []).findIndex((shape) => shape.id === id);
}


function getShapeBounds(shape) {
  const left = Math.min(shape.x1, shape.x2);
  const right = Math.max(shape.x1, shape.x2);
  const top = Math.min(shape.y1, shape.y2);
  const bottom = Math.max(shape.y1, shape.y2);

  return { left, right, top, bottom };
}


function getBoundsCenter(bounds) {
  return {
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2,
  };
}


function normalizeBounds(bounds, minSize = 1) {
  let left = Math.min(bounds.left, bounds.right);
  let right = Math.max(bounds.left, bounds.right);
  let top = Math.min(bounds.top, bounds.bottom);
  let bottom = Math.max(bounds.top, bounds.bottom);

  if (right - left < minSize) {
    const center = (left + right) / 2;
    left = center - minSize / 2;
    right = center + minSize / 2;
  }

  if (bottom - top < minSize) {
    const center = (top + bottom) / 2;
    top = center - minSize / 2;
    bottom = center + minSize / 2;
  }

  return {
    left: clamp(left, 0, 1000),
    right: clamp(right, 0, 1000),
    top: clamp(top, 0, 600),
    bottom: clamp(bottom, 0, 600),
  };
}


function normalizeCrop(crop = {}) {
  const left = clamp(Number(crop.left ?? 0), 0, 0.92);
  const top = clamp(Number(crop.top ?? 0), 0, 0.92);
  const right = clamp(Number(crop.right ?? 1), 0.08, 1);
  const bottom = clamp(Number(crop.bottom ?? 1), 0.08, 1);

  return {
    left: Math.min(left, right - 0.08),
    top: Math.min(top, bottom - 0.08),
    right: Math.max(right, left + 0.08),
    bottom: Math.max(bottom, top + 0.08),
  };
}


function isDefaultCrop(crop = {}) {
  const normalized = normalizeCrop(crop);
  return normalized.left <= 0.001 && normalized.top <= 0.001 && normalized.right >= 0.999 && normalized.bottom >= 0.999;
}


function getCropRect(shape, bounds = getShapeBounds(shape)) {
  const crop = normalizeCrop(shape.crop);
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;

  return {
    left: bounds.left + width * crop.left,
    top: bounds.top + height * crop.top,
    right: bounds.left + width * crop.right,
    bottom: bounds.top + height * crop.bottom,
  };
}


function getCropClipRect(shape, bounds = getShapeBounds(shape), cropRect = getCropRect(shape, bounds)) {
  const crop = normalizeCrop(shape.crop);
  const strokeWidth = clamp(Number(shape.strokeWidth ?? branches.preview.defaultDrawingStrokeWidth), 1, 18);
  const outerPad = Math.max(10, strokeWidth * 2);
  const seamPad = Math.max(1.5, strokeWidth * 0.35);

  return {
    left: cropRect.left - (crop.left <= 0.001 ? outerPad : seamPad),
    top: cropRect.top - (crop.top <= 0.001 ? outerPad : seamPad),
    right: cropRect.right + (crop.right >= 0.999 ? outerPad : seamPad),
    bottom: cropRect.bottom + (crop.bottom >= 0.999 ? outerPad : seamPad),
  };
}


function renderPlainTextShape(shape, center, width, height) {
  const label = getDrawingText(shape, "A");
  const fontSize = clamp(Number(shape.fontSize || getSvgTextSize(label, width, height, 30)), branches.preview.minFontSize, branches.preview.maxFontSize);
  const fontFamily = escapeHtml(shape.fontFamily || branches.preview.defaultFontFamily || "Arial");
  const textColor = sanitizeHexColor(shape.textColor || shape.strokeColor, branches.preview.defaultTextColor || branches.preview.defaultDrawingStroke);
  const fontWeight = shape.bold ? 850 : 500;
  const fontStyle = shape.italic ? "italic" : "normal";
  const textDecoration = shape.underline ? "underline" : "none";
  return `
    <rect class="draw-hitbox" x="${center.x - width / 2}" y="${center.y - height / 2}" width="${width}" height="${height}"></rect>
    <text class="draw-plain-text" x="${center.x}" y="${center.y}" text-anchor="middle" dominant-baseline="middle" style="font-size:${fontSize}px; font-family:${fontFamily}; fill:${textColor}; font-weight:${fontWeight}; font-style:${fontStyle}; text-decoration:${textDecoration}">${escapeHtml(label)}</text>
  `;
}


function renderLabelShape(shape, bounds, center, width, height) {
  const label = getDrawingText(shape, "Label");
  const fontSize = getSvgTextSize(label, width, height, 34);
  return `
    <rect class="draw-label-box" x="${bounds.left}" y="${bounds.top}" width="${width}" height="${height}" rx="${Math.min(16, height / 4)}"></rect>
    <text class="draw-label-text" x="${center.x}" y="${center.y}" text-anchor="middle" dominant-baseline="middle" style="font-size:${fontSize}px">${escapeHtml(label)}</text>
  `;
}


function renderCalloutShape(shape, bounds, width, height) {
  const label = getDrawingText(shape, "Callout");
  const boxWidth = Math.max(36, width * 0.62);
  const boxHeight = Math.max(28, height * 0.36);
  const boxLeft = bounds.left;
  const boxTop = bounds.top;
  const textX = boxLeft + boxWidth / 2;
  const textY = boxTop + boxHeight / 2;
  const fontSize = getSvgTextSize(label, boxWidth, boxHeight, 26);

  return `
    <rect class="draw-label-box" x="${boxLeft}" y="${boxTop}" width="${boxWidth}" height="${boxHeight}" rx="${Math.min(14, boxHeight / 4)}"></rect>
    <text class="draw-label-text" x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" style="font-size:${fontSize}px">${escapeHtml(label)}</text>
    <line class="draw-line" marker-end="url(#drawArrow)" x1="${boxLeft + boxWidth}" y1="${textY}" x2="${bounds.right}" y2="${bounds.bottom}"></line>
    <circle class="draw-point" cx="${bounds.right}" cy="${bounds.bottom}" r="5"></circle>
  `;
}


function renderDoubleArrowShape(shape, center) {
  const label = getDrawingText(shape, "Length");
  const length = Math.max(1, Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1));
  const fontSize = getSvgTextSize(label, length, 52, 24);

  return `
    <line class="draw-line" marker-start="url(#drawArrowStart)" marker-end="url(#drawArrow)" x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}"></line>
    <text class="draw-label-text" x="${center.x}" y="${center.y - 18}" text-anchor="middle" dominant-baseline="middle" style="font-size:${fontSize}px">${escapeHtml(label)}</text>
  `;
}


function renderAngleShape(shape, bounds, center, width, height) {
  const label = getDrawingText(shape, "Angle");
  const radius = Math.max(18, Math.min(width, height) * 0.28);
  const fontSize = getSvgTextSize(label, width * 0.5, height * 0.35, 24);

  return `
    <path class="draw-line" d="M${bounds.left} ${bounds.bottom} L${center.x} ${bounds.top} L${bounds.right} ${bounds.top}"></path>
    <path class="draw-thin" d="M${center.x - radius * 0.56} ${bounds.top + radius * 0.88} A${radius} ${radius} 0 0 0 ${center.x + radius} ${bounds.top + radius * 0.18}"></path>
    <text class="draw-label-text" x="${center.x + radius * 0.4}" y="${bounds.top + radius * 0.78}" text-anchor="middle" dominant-baseline="middle" style="font-size:${fontSize}px">${escapeHtml(label)}</text>
  `;
}


function renderLevelLineShape(shape, bounds, center, width) {
  const label = getDrawingText(shape, "Level");
  const bubbleWidth = Math.max(72, Math.min(160, width * 0.36));
  const bubbleHeight = 32;
  const bubbleLeft = center.x - bubbleWidth / 2;
  const bubbleTop = center.y - bubbleHeight / 2;

  return `
    <line class="draw-line" x1="${bounds.left}" y1="${center.y}" x2="${bounds.right}" y2="${center.y}"></line>
    <rect class="draw-label-box" x="${bubbleLeft}" y="${bubbleTop}" width="${bubbleWidth}" height="${bubbleHeight}" rx="${bubbleHeight / 2}"></rect>
    <line class="draw-thin" x1="${center.x - bubbleWidth * 0.24}" y1="${bubbleTop + 7}" x2="${center.x - bubbleWidth * 0.24}" y2="${bubbleTop + bubbleHeight - 7}"></line>
    <line class="draw-thin" x1="${center.x + bubbleWidth * 0.24}" y1="${bubbleTop + 7}" x2="${center.x + bubbleWidth * 0.24}" y2="${bubbleTop + bubbleHeight - 7}"></line>
    <circle class="draw-point" cx="${center.x}" cy="${center.y}" r="7"></circle>
    <text class="draw-label-text" x="${center.x}" y="${bubbleTop - 18}" text-anchor="middle" dominant-baseline="middle" style="font-size:20px">${escapeHtml(label)}</text>
  `;
}


function renderRulerShape(shape, bounds, width, height) {
  const label = getDrawingText(shape, "Scale");
  const tickCount = 10;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const x = bounds.left + (width * index) / tickCount;
    const tickHeight = index % 5 === 0 ? height * 0.58 : index % 2 === 0 ? height * 0.45 : height * 0.32;
    return `<line class="draw-thin" x1="${x}" y1="${bounds.bottom}" x2="${x}" y2="${bounds.bottom - tickHeight}"></line>`;
  }).join("");
  const fontSize = getSvgTextSize(label, width, height, 22);

  return `
    <rect class="draw-label-box" x="${bounds.left}" y="${bounds.top}" width="${width}" height="${height}" rx="8"></rect>
    ${ticks}
    <text class="draw-label-text" x="${bounds.left + width / 2}" y="${bounds.top + height * 0.38}" text-anchor="middle" dominant-baseline="middle" style="font-size:${fontSize}px">${escapeHtml(label)}</text>
  `;
}


function renderProtractorShape(shape, bounds, center, width, height) {
  const label = getDrawingText(shape, "Angle");
  const cx = center.x;
  const cy = bounds.bottom;
  const rx = width / 2;
  const ry = Math.max(24, height * 0.9);
  const ticks = Array.from({ length: 13 }, (_, index) => {
    const angle = index * 15;
    const radians = Math.PI - (angle * Math.PI) / 180;
    const innerRatio = angle % 45 === 0 ? 0.74 : 0.84;
    const x1 = cx + Math.cos(radians) * rx;
    const y1 = cy - Math.sin(radians) * ry;
    const x2 = cx + Math.cos(radians) * rx * innerRatio;
    const y2 = cy - Math.sin(radians) * ry * innerRatio;
    return `<line class="draw-thin" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"></line>`;
  }).join("");
  const fontSize = getSvgTextSize(label, width * 0.44, height * 0.25, 22);

  return `
    <path class="draw-label-box" d="M${bounds.left} ${cy} A${rx} ${ry} 0 0 1 ${bounds.right} ${cy} L${cx} ${cy} Z"></path>
    <path class="draw-thin" d="M${bounds.left} ${cy} A${rx} ${ry} 0 0 1 ${bounds.right} ${cy}"></path>
    <line class="draw-thin" x1="${bounds.left}" y1="${cy}" x2="${bounds.right}" y2="${cy}"></line>
    ${ticks}
    <circle class="draw-point" cx="${cx}" cy="${cy}" r="5"></circle>
    <text class="draw-label-text" x="${cx}" y="${cy - height * 0.38}" text-anchor="middle" dominant-baseline="middle" style="font-size:${fontSize}px">${escapeHtml(label)}</text>
  `;
}


function getDrawingText(shape, fallback) {
  const value = String(shape.text || "").trim();
  return value || fallback;
}


function getSvgTextSize(text, width, height, maxSize = 30) {
  const length = Math.max(2, String(text || "").trim().length);
  const byWidth = (Math.max(1, width) * 1.45) / length;
  const byHeight = Math.max(1, height) * 0.48;
  return Math.round(clamp(Math.min(maxSize, byWidth, byHeight), 11, maxSize));
}


function renderRegularPolygon(cx, cy, radius, sides) {
  const points = Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / sides;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(" ");

  return `<polygon class="draw-fill" points="${points}"></polygon>`;
}


function renderBoxShape(bounds, isCube) {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const depth = Math.min(width, height) * (isCube ? 0.24 : 0.18);
  const frontLeft = bounds.left;
  const frontTop = bounds.top + depth;
  const frontRight = bounds.right - depth;
  const frontBottom = bounds.bottom;

  return `
    <polygon class="draw-fill-soft" points="${frontLeft},${frontTop} ${frontRight},${frontTop} ${bounds.right},${bounds.top} ${bounds.left + depth},${bounds.top}"></polygon>
    <polygon class="draw-fill-soft" points="${frontRight},${frontTop} ${bounds.right},${bounds.top} ${bounds.right},${frontBottom - depth} ${frontRight},${frontBottom}"></polygon>
    <rect class="draw-fill" x="${frontLeft}" y="${frontTop}" width="${frontRight - frontLeft}" height="${frontBottom - frontTop}"></rect>
  `;
}


function renderCylinderShape(bounds) {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const rx = width / 2;
  const ry = Math.max(8, Math.min(34, height * 0.13));
  const cx = bounds.left + rx;

  return `
    <ellipse class="draw-fill" cx="${cx}" cy="${bounds.top + ry}" rx="${rx}" ry="${ry}"></ellipse>
    <path class="draw-fill-soft" d="M${bounds.left} ${bounds.top + ry} V${bounds.bottom - ry} A${rx} ${ry} 0 0 0 ${bounds.right} ${bounds.bottom - ry} V${bounds.top + ry}"></path>
    <ellipse class="draw-thin no-fill" cx="${cx}" cy="${bounds.bottom - ry}" rx="${rx}" ry="${ry}"></ellipse>
  `;
}


function renderConeShape(bounds) {
  const width = bounds.right - bounds.left;
  const rx = width / 2;
  const ry = Math.max(8, Math.min(34, (bounds.bottom - bounds.top) * 0.13));
  const cx = bounds.left + rx;

  return `
    <path class="draw-fill" d="M${cx} ${bounds.top} L${bounds.left} ${bounds.bottom - ry} A${rx} ${ry} 0 0 0 ${bounds.right} ${bounds.bottom - ry} Z"></path>
    <ellipse class="draw-thin no-fill" cx="${cx}" cy="${bounds.bottom - ry}" rx="${rx}" ry="${ry}"></ellipse>
  `;
}


function renderFrustumShape(bounds) {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const cx = (bounds.left + bounds.right) / 2;
  const topRx = width * 0.25;
  const bottomRx = width * 0.5;
  const topRy = Math.max(6, height * 0.07);
  const bottomRy = Math.max(8, height * 0.1);

  return `
    <ellipse class="draw-fill" cx="${cx}" cy="${bounds.top + topRy}" rx="${topRx}" ry="${topRy}"></ellipse>
    <path class="draw-fill-soft" d="M${cx - topRx} ${bounds.top + topRy} L${bounds.left} ${bounds.bottom - bottomRy} A${bottomRx} ${bottomRy} 0 0 0 ${bounds.right} ${bounds.bottom - bottomRy} L${cx + topRx} ${bounds.top + topRy}"></path>
    <ellipse class="draw-thin no-fill" cx="${cx}" cy="${bounds.bottom - bottomRy}" rx="${bottomRx}" ry="${bottomRy}"></ellipse>
  `;
}


function renderToolFigure(tool) {
  const figure = tool.figure;
  const title = figure.title || tool.title;
  const formula = figure.formula || tool.latex || "";
  const viewBox = figure.viewBox || "0 0 220 150";

  return `
    <div class="tool-figure" data-tool-figure="${escapeHtml(tool.id)}" contenteditable="false">
      <div class="tool-figure-title">${escapeHtml(title)}</div>
      <svg class="tool-figure-svg" viewBox="${escapeHtml(viewBox)}" role="img" aria-label="${escapeHtml(title)}">
        ${figure.svg}
      </svg>
      <div class="tool-figure-formula">${escapeHtml(formula)}</div>
    </div>
  `;
}


function renderFigureOnly(tool) {
  const figure = tool.figure;
  const title = figure.title || tool.title;
  const viewBox = figure.viewBox || "0 0 220 150";

  return `
    <div class="tool-figure figure-only" data-tool-figure="${escapeHtml(tool.id)}" contenteditable="false">
      <svg class="tool-figure-svg" viewBox="${escapeHtml(viewBox)}" role="img" aria-label="${escapeHtml(title)}">
        ${stripSvgText(figure.svg)}
      </svg>
    </div>
  `;
}


function renderManualFigure(toolId) {
  const drawTool = (branches.tools.authoring?.drawTools || []).find((item) => item.id === toolId);
  const title = drawTool?.label || "Figure";

  return `
    <div class="tool-figure manual-figure" data-manual-figure="${escapeHtml(toolId)}" contenteditable="false">
      <svg class="tool-figure-svg" viewBox="0 0 220 150" role="img" aria-label="${escapeHtml(title)}">
        ${renderManualShape(toolId)}
      </svg>
    </div>
  `;
}


function renderManualShape(toolId) {
  const shapes = {
    label: '<rect class="shape-fill" x="54" y="54" width="112" height="42" rx="10"></rect><text class="manual-label" x="110" y="81" text-anchor="middle">Label</text>',
    callout:
      '<defs><marker id="manualArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="currentColor"></path></marker></defs><rect class="shape-fill" x="42" y="38" width="92" height="38" rx="8"></rect><text class="manual-label" x="88" y="63" text-anchor="middle">A</text><line class="shape-line" marker-end="url(#manualArrow)" x1="134" y1="57" x2="178" y2="108"></line>',
    point: '<circle class="shape-point" cx="110" cy="75" r="6"></circle>',
    line: '<line class="shape-line" x1="42" y1="78" x2="178" y2="78"></line><circle class="shape-point" cx="42" cy="78" r="3"></circle><circle class="shape-point" cx="178" cy="78" r="3"></circle>',
    arrow:
      '<defs><marker id="manualArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="currentColor"></path></marker></defs><line class="shape-line" marker-end="url(#manualArrow)" x1="44" y1="78" x2="176" y2="78"></line>',
    "double-arrow":
      '<defs><marker id="manualArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="currentColor"></path></marker><marker id="manualArrowStart" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto"><path d="M8,0 L0,4 L8,8 Z" fill="currentColor"></path></marker></defs><line class="shape-line" marker-start="url(#manualArrowStart)" marker-end="url(#manualArrow)" x1="44" y1="78" x2="176" y2="78"></line><text class="manual-label" x="110" y="60" text-anchor="middle">d</text>',
    angle: '<path class="shape-line" d="M58 112 L98 72 L174 72"></path><path class="shape-arc" d="M82 88 A26 26 0 0 0 124 72"></path>',
    "level-line":
      '<line class="shape-line" x1="36" y1="76" x2="184" y2="76"></line><rect class="shape-fill" x="78" y="60" width="64" height="32" rx="16"></rect><circle class="shape-point" cx="110" cy="76" r="5"></circle>',
    ruler:
      '<rect class="shape-fill" x="34" y="56" width="152" height="42" rx="6"></rect><line class="shape-line-thin" x1="50" y1="98" x2="50" y2="70"></line><line class="shape-line-thin" x1="82" y1="98" x2="82" y2="78"></line><line class="shape-line-thin" x1="114" y1="98" x2="114" y2="70"></line><line class="shape-line-thin" x1="146" y1="98" x2="146" y2="78"></line><line class="shape-line-thin" x1="178" y1="98" x2="178" y2="70"></line>',
    protractor:
      '<path class="shape-fill" d="M50 112 A60 54 0 0 1 170 112 L110 112 Z"></path><path class="shape-line-thin" d="M50 112 A60 54 0 0 1 170 112"></path><line class="shape-line-thin" x1="110" y1="112" x2="110" y2="60"></line>',
    crosshair:
      '<line class="shape-line" x1="54" y1="75" x2="166" y2="75"></line><line class="shape-line" x1="110" y1="30" x2="110" y2="120"></line><circle class="shape-line-thin no-fill" cx="110" cy="75" r="24"></circle>',
    axis:
      '<defs><marker id="manualArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="currentColor"></path></marker></defs><line class="shape-line" marker-end="url(#manualArrow)" x1="58" y1="116" x2="174" y2="116"></line><line class="shape-line" marker-end="url(#manualArrow)" x1="58" y1="116" x2="58" y2="34"></line>',
    triangle: '<polygon class="shape-fill" points="42,118 178,118 108,30"></polygon>',
    rectangle: '<rect class="shape-fill" x="48" y="42" width="124" height="72"></rect>',
    circle: '<circle class="shape-fill" cx="110" cy="75" r="48"></circle>',
    ellipse: '<ellipse class="shape-fill" cx="110" cy="75" rx="62" ry="36"></ellipse>',
    highlight: '<rect class="shape-fill" x="45" y="54" width="130" height="42" rx="8"></rect>',
  };

  return shapes[toolId] || shapes.label;
}


function stripSvgText(svg = "") {
  return String(svg).replace(/<text\b[^>]*>[\s\S]*?<\/text>/g, "");
}


function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function createCanvasExportSvg() {
  const canvas = app.querySelector(".equation-canvas");
  if (!canvas) return "";

  const exportClone = createFullCanvasExportClone(canvas);
  if (!exportClone) return "";

  const { clone, width, height, cleanup } = exportClone;
  const css = createCanvasExportCss(width, height);
  const background = escapeHtml(state.background || "#ffffff");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:visible;background:${background};"><style>${css}</style>${clone.outerHTML}</div></foreignObject></svg>`;
  cleanup();
  return svg;
}


function createFullCanvasExportClone(canvas) {
  const canvasStyle = window.getComputedStyle(canvas);
  const exportGutter = 18;
  const clone = canvas.cloneNode(true);
  const baseWidth = Math.max(canvas.offsetWidth || 0, canvas.clientWidth || 0, canvas.scrollWidth || 0, 900);
  const host = document.createElement("div");

  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.width = "max-content";
  host.style.height = "auto";
  host.style.opacity = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";

  clone.style.transform = "none";
  clone.style.zoom = "1";
  clone.style.width = `${baseWidth}px`;
  clone.style.height = "auto";
  clone.style.minHeight = "0";
  clone.style.maxWidth = "none";
  clone.style.maxHeight = "none";
  clone.style.display = "block";
  clone.style.overflow = "visible";
  clone.style.margin = "0";
  clone.style.alignItems = "start";
  clone.style.justifyItems = "start";
  clone.style.padding = `${readPixelValue(canvasStyle.paddingTop) + exportGutter}px ${readPixelValue(canvasStyle.paddingRight) + exportGutter}px ${readPixelValue(canvasStyle.paddingBottom) + exportGutter}px ${readPixelValue(canvasStyle.paddingLeft) + exportGutter}px`;
  clone.querySelectorAll("[contenteditable]").forEach((node) => {
    node.removeAttribute("contenteditable");
    node.removeAttribute("data-visual-edit");
  });
  const cloneRender = clone.querySelector(".equation-render");
  if (cloneRender) {
    cloneRender.style.display = "block";
    cloneRender.style.width = "max-content";
    cloneRender.style.minWidth = "0";
    cloneRender.style.maxWidth = "none";
    cloneRender.style.height = "auto";
    cloneRender.style.minHeight = "0";
    cloneRender.style.maxHeight = "none";
    cloneRender.style.overflow = "visible";
  }
  clone.querySelectorAll("*").forEach((node) => {
    node.scrollTop = 0;
    node.scrollLeft = 0;
  });

  host.appendChild(clone);
  document.body.appendChild(host);

  const firstBounds = measureCloneExportBounds(clone);
  clone.style.width = `${Math.max(baseWidth, Math.ceil(firstBounds.width))}px`;

  const finalBounds = measureCloneExportBounds(clone);
  const measuredWidth = Math.max(clone.scrollWidth, clone.offsetWidth, Math.ceil(finalBounds.width));
  const measuredHeight = Math.max(clone.scrollHeight, clone.offsetHeight, Math.ceil(finalBounds.height));
  const width = Math.max(1, Math.ceil(measuredWidth));
  const height = Math.max(1, Math.ceil(measuredHeight));

  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.minHeight = `${height}px`;

  return {
    clone,
    width,
    height,
    cleanup: () => host.remove(),
  };
}


function measureCloneExportBounds(clone) {
  const cloneBox = clone.getBoundingClientRect();
  let maxRight = cloneBox.right;
  let maxBottom = cloneBox.bottom;

  clone.querySelectorAll("*").forEach((node) => {
    const box = node.getBoundingClientRect();
    if (!box.width && !box.height && !node.scrollWidth && !node.scrollHeight) return;
    const scrollRight = box.left + Math.max(node.scrollWidth || 0, node.offsetWidth || 0, box.width || 0);
    const scrollBottom = box.top + Math.max(node.scrollHeight || 0, node.offsetHeight || 0, box.height || 0);
    maxRight = Math.max(maxRight, box.right, scrollRight);
    maxBottom = Math.max(maxBottom, box.bottom, scrollBottom);
  });

  return {
    width: Math.max(0, maxRight - cloneBox.left),
    height: Math.max(0, maxBottom - cloneBox.top),
  };
}


function createCanvasExportCss(width, height) {
  return `
    .equation-canvas{box-sizing:border-box;width:${width}px;height:${height}px;min-height:${height}px;max-height:none;display:block;align-items:flex-start;justify-items:flex-start;padding:var(--page-margin,32px);background:#fff;border:1px solid #cfd8e1;color:#050505;font-family:Arial, sans-serif;overflow:visible;}
    .equation-render{display:block;width:max-content;min-width:0;max-width:none;height:auto;min-height:0;overflow:visible;white-space:normal;line-height:1.2;color:inherit;font-weight:500;}
    math{font-family:inherit;}
    .solution-layout{display:grid;align-content:start;justify-items:start;gap:.42em;width:max-content;max-width:none;font-size:1em;line-height:1.32;}
    .solution-line{width:max-content;max-width:none;}
    .solution-text{font:inherit;line-height:1.32;}
    .solution-equation{display:flex;align-items:center;min-height:1.45em;line-height:1.15;}
    .solution-equation-set{display:grid;grid-template-columns:max-content max-content minmax(max-content,1fr);align-items:center;column-gap:.34em;row-gap:.34em;width:max-content;max-width:none;line-height:1.15;}
    .eq-left{display:inline-flex;justify-content:flex-end;align-items:center;min-width:2.35em;text-align:right;}
    .eq-sign{display:inline-flex;align-items:center;justify-content:center;min-width:.75em;font-family:"Cambria Math","Times New Roman",serif;}
    .eq-right{display:inline-flex;align-items:center;min-width:0;}
    .eq-placeholder{display:inline-block;width:2.35em;}
    .inline-math{margin:0 .08em;vertical-align:-.12em;}
    .text-part{white-space:pre-wrap;}
    .solution-spacer{height:.2em;}
    mtd{padding:0.08em 0.12em;}
    svg{max-width:100%;height:auto;}
  `;
}


function readPixelValue(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}


function exportCanvasPng(options = {}) {
  const svg = createCanvasExportSvg();
  if (!svg) return;

  const url = createSvgImageDataUrl(svg);
  const image = new Image();
  image.onload = () => {
    const scale = getCanvasExportScale(image.width, image.height, PNG_EXPORT_QUALITY_SCALE);
    const output = document.createElement("canvas");
    output.width = Math.round(image.width * scale);
    output.height = Math.round(image.height * scale);
    const context = output.getContext("2d");
    context.fillStyle = state.background || "#ffffff";
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(image, 0, 0, output.width, output.height);

    try {
      output.toBlob(async (pngBlob) => {
        if (!pngBlob) {
          downloadCanvasSvgFallback(svg);
          return;
        }
        if (options.copy && navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
            return;
          } catch {
            downloadBlob(pngBlob, "equation.png");
            return;
          }
        }
        downloadBlob(pngBlob, "equation.png");
      }, "image/png");
    } catch {
      downloadCanvasSvgFallback(svg);
    }
  };
  image.onerror = () => {
    downloadCanvasSvgFallback(svg);
  };
  image.src = url;
}


function createSvgImageDataUrl(svg) {
  const bytes = new TextEncoder().encode(svg);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return `data:image/svg+xml;base64,${btoa(binary)}`;
}


function downloadCanvasSvgFallback(svg) {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(svgBlob, "equation.svg");
}


function getCanvasExportScale(width, height, preferredScale = 2) {
  const preferred = Math.max(preferredScale, window.devicePixelRatio || 1);
  const maxDimension = 16384;
  const maxPixels = 90000000;
  const dimensionScale = Math.min(maxDimension / Math.max(1, width), maxDimension / Math.max(1, height));
  const pixelScale = Math.sqrt(maxPixels / Math.max(1, width * height));
  return Math.max(1, Math.min(preferred, dimensionScale, pixelScale));
}


function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}


function copyText(value) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(value);
  }
}


function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}


function sanitizeHexColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}


export {
  handleDrawingPropertyInput,
  handleDrawingAction,
  handleManualLabelInput,
  handleToolSelect,
  handleToolGroupToggle,
  selectFigureTool,
  drawManualTool,
  startDrawing,
  startColumnResize,
  renderDrawingSurface,
  createCanvasExportSvg,
  insertPlainLabelText,
  exportCanvasPng,
  copyText,
  downloadBlob
};

