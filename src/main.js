import { branches } from "./branches/index.js";
import { renderMathMl } from "./core/mathml.js?v=gemini-paste-clean-20260705";
import { autoFixEquationInput, getEquationDiagnostics, smartCleanMathInput } from "./core/normalizer.js?v=gemini-paste-clean-20260705";
import { createDefaultState, loadState, normalizeColumnSizes, saveState } from "./core/store.js?v=full-paste-fix-20260629";
import { createImagePdfBlob } from "./core/imagePdf.js?v=clean-topbar-20260705";
import { renderApp } from "./ui/layout.js?v=image-select-fix-20260706";

const app = document.getElementById("app");
const HISTORY_LIMIT = 80;
const PNG_EXPORT_QUALITY_SCALE = 3;
const IMAGE_PDF_VIEW_MODES = ["extra-large", "large", "medium", "small", "list", "details", "tiles", "content"];
const IMAGE_PDF_DRAG_TYPE = "application/x-image-pdf-item-id";
const IMAGE_PDF_COMPRESSION_PRESETS = {
  high: { quality: 96, label: "High quality" },
  balanced: { quality: 92, label: "Balanced" },
  small: { quality: 72, label: "Small size" },
};
const IMAGE_PDF_SETTINGS_KEY = "math-original-form-builder:image-pdf-settings:v1";
const DEFAULT_IMAGE_PDF_PART_NAME_PATTERN = "{name} part {n}";
const IMAGE_PDF_CANCELLED_MESSAGE = "Operation cancelled.";
const IMAGE_RESIZE_SETTINGS_KEY = "math-original-form-builder:image-resize-settings:v1";
const IMAGE_RESIZE_MAX_DIMENSION = 12000;
const IMAGE_RESIZE_MAX_PIXELS = 100000000;
let state = loadState();
let resizeSession = null;
let drawSession = null;
let editSession = null;
let undoStack = [];
let redoStack = [];
let imagePdfItems = [];
let imagePdfViewMode = "large";
let imagePdfDraggingId = "";
let imagePdfPreviewUrl = "";
let imagePdfCancelRequested = false;
let imageResizeItems = [];
let imageResizeSelectedId = "";
let imageResizePreviewDrawToken = 0;

document.addEventListener("paste", handleImagePdfPaste);
document.addEventListener("keydown", handleImagePdfLightboxKeydown);

render();

function render() {
  state.mode = normalizeAppMode(state.mode);
  state.imageToolMode = normalizeImageToolMode(state.imageToolMode);
  if (state.mode === "math-figures") {
    state.visualOverride = renderDrawingSurface();
  } else if (String(state.visualOverride || "").includes("drawing-workspace")) {
    state.visualOverride = "";
  }
  app.innerHTML = renderApp(state);
  bindEvents();
  requestAnimationFrame(fitEquationPreview);
  saveState(state);
}

function normalizeAppMode(value) {
  if (value === "math-figures" || value === "image-tools") return value;
  return "equation";
}

function normalizeImageToolMode(value) {
  return value === "image-resize" ? "image-resize" : "image-to-pdf";
}

function isDrawingMode(value) {
  const mode = normalizeAppMode(value);
  return mode === "math-figures";
}

function preserveDrawingMode(defaultMode = "math-figures") {
  const mode = normalizeAppMode(state.mode);
  state.mode = isDrawingMode(mode) ? mode : defaultMode;
}

function bindEvents() {
  app.querySelectorAll("[data-action]").forEach((node) => {
    node.addEventListener("click", handleAction);
  });
  app.querySelectorAll("[data-bind]").forEach((node) => {
    node.addEventListener("input", handleBinding);
    node.addEventListener("change", handleBinding);
  });
  app.querySelectorAll(".equation-input[data-bind='input']").forEach((node) => {
    node.addEventListener("keydown", handleEquationInputKeydown);
    node.addEventListener("paste", handleEquationPaste);
  });
  app.querySelectorAll("[data-visual-edit]").forEach((node) => {
    node.addEventListener("input", handleVisualEdit);
    node.addEventListener("blur", handleVisualEdit);
    node.addEventListener("copy", handleCanvasCopy);
    node.addEventListener("cut", handleCanvasCut);
    node.addEventListener("paste", handleCanvasPaste);
  });
  app.querySelectorAll("[data-equation-edit-canvas]").forEach((node) => {
    node.addEventListener("click", handleEquationCanvasClick);
  });
  app.querySelectorAll("[data-equation-zoom-surface]").forEach((node) => {
    node.addEventListener("wheel", handleEquationCanvasWheel, { passive: false });
  });
  app.querySelectorAll("[data-editor-command]").forEach((node) => {
    node.addEventListener("mousedown", handleEditorCommand);
  });
  app.querySelectorAll("[data-editor-insert]").forEach((node) => {
    node.addEventListener("mousedown", handleEditorInsert);
  });
  app.querySelectorAll("[data-editor-template]").forEach((node) => {
    node.addEventListener("mousedown", handleEditorTemplate);
  });
  app.querySelectorAll("[data-toolbar-select]").forEach((node) => {
    node.addEventListener("change", handleToolbarSelect);
  });
  app.querySelectorAll("[data-toolbar-color]").forEach((node) => {
    node.addEventListener("input", handleToolbarColor);
    node.addEventListener("change", handleToolbarColor);
  });
  app.querySelectorAll("[data-drawing-prop]").forEach((node) => {
    node.addEventListener("input", handleDrawingPropertyInput);
    node.addEventListener("change", handleDrawingPropertyInput);
  });
  app.querySelectorAll("[data-drawing-action]").forEach((node) => {
    node.addEventListener("click", handleDrawingAction);
  });
  app.querySelectorAll("[data-manual-label]").forEach((node) => {
    node.addEventListener("input", handleManualLabelInput);
    node.addEventListener("change", handleManualLabelInput);
  });
  app.querySelectorAll("[data-tool-select]").forEach((node) => {
    node.addEventListener("change", handleToolSelect);
  });
  app.querySelectorAll("[data-drawing-surface]").forEach((node) => {
    node.addEventListener("pointerdown", startDrawing);
  });
  app.querySelectorAll("[data-column-resizer]").forEach((node) => {
    node.addEventListener("pointerdown", startColumnResize);
  });
  app.querySelectorAll("[data-tool-group]").forEach((node) => {
    node.addEventListener("toggle", handleToolGroupToggle);
  });
  bindImagePdfEvents();
  bindImageResizeEvents();
}

function bindImagePdfEvents() {
  const root = app.querySelector("[data-image-pdf-tool]");
  if (!root) return;

  const fileInput = root.querySelector("[data-image-pdf-file]");
  const dropzone = root.querySelector("[data-image-pdf-dropzone]");
  const addButtons = root.querySelectorAll("[data-image-pdf-add]");
  const pasteButtons = root.querySelectorAll("[data-image-pdf-paste]");
  const clearButtons = root.querySelectorAll("[data-image-pdf-clear]");
  const convertButton = root.querySelector("[data-image-pdf-convert]");
  const shuffleButton = root.querySelector("[data-image-pdf-shuffle]");
  const viewSelect = root.querySelector("[data-image-pdf-view]");
  const queue = root.querySelector("[data-image-pdf-list]");
  const splitList = root.querySelector("[data-image-pdf-split-list]");
  const splitDownloadAllButton = root.querySelector("[data-image-pdf-split-download-all]");
  const previewPanel = root.querySelector("[data-image-pdf-preview]");
  const cancelButton = root.querySelector("[data-image-pdf-cancel]");
  let dragDepth = 0;

  applySavedImagePdfSettings(root);

  if (viewSelect) {
    viewSelect.value = imagePdfViewMode;
    viewSelect.addEventListener("change", handleImagePdfViewChange);
  }

  fileInput?.addEventListener("change", (event) => {
    addImagePdfFiles(event.currentTarget.files);
    event.currentTarget.value = "";
  });

  addButtons.forEach((button) => button.addEventListener("click", () => {
    fileInput?.click();
  }));

  dropzone?.addEventListener("click", (event) => {
    if (event.target.closest("button, input")) return;
    fileInput?.click();
  });

  dropzone?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    fileInput?.click();
  });

  pasteButtons.forEach((button) => button.addEventListener("click", pasteImagePdfFromClipboard));

  clearButtons.forEach((button) => button.addEventListener("click", clearImagePdfItems));
  convertButton?.addEventListener("click", exportImagePdf);
  shuffleButton?.addEventListener("click", shuffleImagePdfQueue);

  root.addEventListener("dragenter", (event) => {
    if (!hasImagePdfDraggedFiles(event)) return;

    event.preventDefault();
    dragDepth += 1;
    setImagePdfDropActive(root, dropzone, true);
  });

  root.addEventListener("dragover", (event) => {
    if (!hasImagePdfDraggedFiles(event)) return;

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    setImagePdfDropActive(root, dropzone, true);
  });

  root.addEventListener("dragleave", (event) => {
    if (!hasImagePdfDraggedFiles(event)) return;

    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      setImagePdfDropActive(root, dropzone, false);
    }
  });

  root.addEventListener("drop", (event) => {
    if (!hasImagePdfDraggedFiles(event)) return;

    event.preventDefault();
    dragDepth = 0;
    setImagePdfDropActive(root, dropzone, false);
    addImagePdfFiles(event.dataTransfer?.files);
  });

  root.querySelectorAll("[data-image-pdf-option]").forEach((node) => {
    node.addEventListener("input", handleImagePdfOptionInput);
    node.addEventListener("change", handleImagePdfOptionInput);
  });

  splitList?.addEventListener("click", handleImagePdfPartDownload);
  splitList?.addEventListener("click", handleImagePdfPartPreview);
  splitDownloadAllButton?.addEventListener("click", exportAllImagePdfParts);
  previewPanel?.addEventListener("click", handleImagePdfPreviewAction);
  cancelButton?.addEventListener("click", cancelImagePdfJob);

  if (queue) {
    queue.addEventListener("click", handleImagePdfListAction);
    queue.addEventListener("dragstart", handleImagePdfQueueDragStart);
    queue.addEventListener("dragover", handleImagePdfQueueDragOver);
    queue.addEventListener("dragleave", handleImagePdfQueueDragLeave);
    queue.addEventListener("drop", handleImagePdfQueueDrop);
    queue.addEventListener("dragend", handleImagePdfQueueDragEnd);
  }
  renderImagePdfQueue();
  updateImagePdfQualityLabel();
}

function bindImageResizeEvents() {
  const root = app.querySelector("[data-image-resize-tool]");
  if (!root) return;

  const fileInput = root.querySelector("[data-image-resize-file]");
  const dropzone = root.querySelector("[data-image-resize-dropzone]");
  const addButtons = root.querySelectorAll("[data-image-resize-add]");
  const clearButtons = root.querySelectorAll("[data-image-resize-clear]");
  const list = root.querySelector("[data-image-resize-list]");
  let dragDepth = 0;

  applySavedImageResizeSettings(root);

  fileInput?.addEventListener("change", (event) => {
    addImageResizeFiles(event.currentTarget.files);
    event.currentTarget.value = "";
  });

  addButtons.forEach((button) => button.addEventListener("click", () => {
    fileInput?.click();
  }));

  dropzone?.addEventListener("click", (event) => {
    if (event.target.closest("button, input")) return;
    fileInput?.click();
  });

  dropzone?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    fileInput?.click();
  });

  clearButtons.forEach((button) => button.addEventListener("click", clearImageResizeItems));

  root.addEventListener("dragenter", (event) => {
    if (!hasImagePdfDraggedFiles(event)) return;

    event.preventDefault();
    dragDepth += 1;
    setImageResizeDropActive(root, dropzone, true);
  });

  root.addEventListener("dragover", (event) => {
    if (!hasImagePdfDraggedFiles(event)) return;

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    setImageResizeDropActive(root, dropzone, true);
  });

  root.addEventListener("dragleave", (event) => {
    if (!hasImagePdfDraggedFiles(event)) return;

    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      setImageResizeDropActive(root, dropzone, false);
    }
  });

  root.addEventListener("drop", (event) => {
    if (!hasImagePdfDraggedFiles(event)) return;

    event.preventDefault();
    dragDepth = 0;
    setImageResizeDropActive(root, dropzone, false);
    addImageResizeFiles(event.dataTransfer?.files);
  });

  root.querySelectorAll("[data-image-resize-option]").forEach((node) => {
    node.addEventListener("input", handleImageResizeOptionInput);
    node.addEventListener("change", handleImageResizeOptionInput);
  });

  root.querySelectorAll("[data-image-resize-download]").forEach((button) => {
    button.addEventListener("click", () => downloadImageResizeFormat(button.dataset.imageResizeDownload));
  });

  list?.addEventListener("click", handleImageResizeListAction);

  syncImageResizeLabels();
  renderImageResizeQueue();
  updateImageResizeWorkspace();
}

function hasImagePdfDraggedFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

function setImagePdfDropActive(root, dropzone, isActive) {
  root.classList.toggle("is-dragging", isActive);
  dropzone?.classList.toggle("is-dragging", isActive);
}

function setImageResizeDropActive(root, dropzone, isActive) {
  root.classList.toggle("is-dragging", isActive);
  dropzone?.classList.toggle("is-dragging", isActive);
}

function handleImagePdfPaste(event) {
  if (normalizeAppMode(state.mode) !== "image-tools") return;

  const files = extractImagePdfClipboardFiles(event.clipboardData);
  if (!files.length) return;

  event.preventDefault();
  addImagePdfFiles(files);
}

function extractImagePdfClipboardFiles(clipboardData) {
  const files = Array.from(clipboardData?.files || []).filter((file) => file.type.startsWith("image/"));
  if (files.length) return normalizeImagePdfFiles(files);

  const itemFiles = Array.from(clipboardData?.items || [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);

  return normalizeImagePdfFiles(itemFiles);
}

async function pasteImagePdfFromClipboard() {
  const root = app.querySelector("[data-image-pdf-tool]");
  root?.focus({ preventScroll: true });

  if (!navigator.clipboard?.read) {
    setImagePdfStatus("Copy an image, then press Ctrl+V here.");
    return;
  }

  try {
    const clipboardItems = await navigator.clipboard.read();
    const files = [];
    for (const item of clipboardItems) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      files.push(new File([blob], `pasted-image-${Date.now()}.${imagePdfExtensionFromType(imageType)}`, { type: imageType }));
    }

    if (!files.length) {
      setImagePdfStatus("Clipboard does not contain an image.");
      return;
    }

    addImagePdfFiles(files);
  } catch {
    setImagePdfStatus("Copy an image, click this panel, then press Ctrl+V.");
  }
}

async function addImagePdfFiles(fileList) {
  const files = normalizeImagePdfFiles(fileList);
  if (!files.length) {
    setImagePdfStatus("No image files selected.");
    return;
  }

  setImagePdfStatus("Adding images...");
  const knownSignatures = new Set(imagePdfItems.map((item) => item.signature).filter(Boolean));
  let addedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;
  let firstAddedId = "";

  for (const file of files) {
    const signature = await createImagePdfFileSignature(file);
    if (knownSignatures.has(signature)) {
      duplicateCount += 1;
      continue;
    }
    knownSignatures.add(signature);

    const item = {
      id: createImagePdfId(),
      file,
      name: file.name || "image",
      size: file.size || 0,
      type: file.type || "image",
      signature,
      url: URL.createObjectURL(file),
      rotation: 0,
      width: 0,
      height: 0,
    };

    try {
      const dimensions = await readImagePdfDimensions(item.url);
      item.width = dimensions.width;
      item.height = dimensions.height;
    } catch {
      URL.revokeObjectURL(item.url);
      failedCount += 1;
      continue;
    }

    imagePdfItems.push(item);
    addedCount += 1;
  }

  renderImagePdfQueue();
  const messages = [];
  if (addedCount) messages.push(`${addedCount} added`);
  if (duplicateCount) messages.push(`${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"} skipped`);
  if (failedCount) messages.push(`${failedCount} failed`);
  setImagePdfStatus(messages.length ? `${messages.join(". ")}. ${imagePdfItems.length} total.` : "No new images added.");
}

function normalizeImagePdfFiles(fileList) {
  return Array.from(fileList || [])
    .filter((file) => file?.type?.startsWith("image/"))
    .map((file, index) => {
      if (file.name) return file;
      const extension = imagePdfExtensionFromType(file.type);
      return new File([file], `pasted-image-${Date.now()}-${index + 1}.${extension}`, { type: file.type });
    });
}

function imagePdfExtensionFromType(type = "image/png") {
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "png";
}

function readImagePdfDimensions(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = url;
  });
}

async function createImagePdfFileSignature(file) {
  if (window.crypto?.subtle && file.arrayBuffer) {
    try {
      const buffer = await file.arrayBuffer();
      const digest = await window.crypto.subtle.digest("SHA-256", buffer);
      return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    } catch {
      // Fall through to a stable metadata signature.
    }
  }

  return [
    "meta",
    file.name || "",
    file.type || "",
    file.size || 0,
    file.lastModified || 0,
  ].join(":");
}

function normalizeImagePdfRotation(value) {
  return ((Math.round(Number(value || 0) / 90) * 90) % 360 + 360) % 360;
}

function handleImagePdfListAction(event) {
  const button = event.target.closest("[data-image-pdf-item-action]");
  if (!button) {
    const item = event.target.closest("[data-image-pdf-item]");
    if (item && event.target.closest(".image-pdf-thumb-frame")) {
      openImagePdfLightbox(item.dataset.imagePdfItemId);
    }
    return;
  }

  const id = button.dataset.imagePdfItemId;
  const action = button.dataset.imagePdfItemAction;
  const index = imagePdfItems.findIndex((item) => item.id === id);
  if (index < 0) return;

  if (action === "remove") {
    closeImagePdfLightbox();
    URL.revokeObjectURL(imagePdfItems[index].url);
    imagePdfItems.splice(index, 1);
  }

  if (action === "up" && index > 0) {
    [imagePdfItems[index - 1], imagePdfItems[index]] = [imagePdfItems[index], imagePdfItems[index - 1]];
  }

  if (action === "down" && index < imagePdfItems.length - 1) {
    [imagePdfItems[index + 1], imagePdfItems[index]] = [imagePdfItems[index], imagePdfItems[index + 1]];
  }

  if (action === "rotate-left") {
    imagePdfItems[index].rotation = normalizeImagePdfRotation((imagePdfItems[index].rotation || 0) - 90);
  }

  if (action === "rotate-right") {
    imagePdfItems[index].rotation = normalizeImagePdfRotation((imagePdfItems[index].rotation || 0) + 90);
  }

  renderImagePdfQueue();
  setImagePdfStatus(`${imagePdfItems.length} image${imagePdfItems.length === 1 ? "" : "s"} ready.`);
}

function openImagePdfLightbox(id) {
  const item = imagePdfItems.find((entry) => entry.id === id);
  if (!item) return;

  closeImagePdfLightbox();
  const rotation = normalizeImagePdfRotation(item.rotation || 0);
  const overlay = document.createElement("div");
  overlay.className = "image-pdf-lightbox";
  overlay.dataset.imagePdfLightbox = "";
  overlay.innerHTML = `
    <div class="image-pdf-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Image preview">
      <div class="image-pdf-lightbox-head">
        <div class="image-pdf-lightbox-title">
          <strong>${escapeHtml(item.name)}</strong>
          <span>Original image | ${item.width || "-"} x ${item.height || "-"} px | ${formatBytes(item.size)}</span>
        </div>
        <div class="image-pdf-lightbox-actions" role="group" aria-label="Image preview controls">
          <button class="image-pdf-lightbox-zoom is-active" data-image-pdf-lightbox-fit type="button">Fit</button>
          <button class="image-pdf-lightbox-zoom" data-image-pdf-lightbox-actual type="button">100%</button>
          <button class="image-pdf-lightbox-close" data-image-pdf-lightbox-close type="button">Close</button>
        </div>
      </div>
      <div class="image-pdf-lightbox-stage">
        <img class="image-pdf-lightbox-image" src="${escapeHtml(item.url)}" alt="${escapeHtml(item.name)}" style="--image-pdf-rotation: ${rotation}deg" />
      </div>
    </div>
  `;
  overlay.addEventListener("click", (event) => {
    const actualButton = event.target.closest("[data-image-pdf-lightbox-actual]");
    const fitButton = event.target.closest("[data-image-pdf-lightbox-fit]");
    if (actualButton || fitButton) {
      const showActualSize = Boolean(actualButton);
      overlay.classList.toggle("is-actual-size", showActualSize);
      overlay.querySelector("[data-image-pdf-lightbox-fit]")?.classList.toggle("is-active", !showActualSize);
      overlay.querySelector("[data-image-pdf-lightbox-actual]")?.classList.toggle("is-active", showActualSize);
      return;
    }

    if (event.target === overlay || event.target.closest("[data-image-pdf-lightbox-close]")) {
      closeImagePdfLightbox();
    }
  });
  document.body.appendChild(overlay);
  document.body.classList.add("is-image-pdf-lightbox-open");
}

function closeImagePdfLightbox() {
  document.querySelector("[data-image-pdf-lightbox]")?.remove();
  document.body.classList.remove("is-image-pdf-lightbox-open");
}

function handleImagePdfLightboxKeydown(event) {
  if (event.key === "Escape") {
    closeImagePdfLightbox();
  }
}

function handleImagePdfQueueDragStart(event) {
  if (event.target.closest("button, select, input")) {
    event.preventDefault();
    return;
  }

  const item = getImagePdfQueueItemFromEvent(event);
  const id = item?.dataset.imagePdfItemId;
  if (!id) return;

  imagePdfDraggingId = id;
  item.classList.add("is-dragging");
  item.setAttribute("aria-grabbed", "true");

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.dropEffect = "move";
    event.dataTransfer.setData(IMAGE_PDF_DRAG_TYPE, id);
    event.dataTransfer.setData("text/plain", id);
  }
}

function handleImagePdfQueueDragOver(event) {
  if (!isImagePdfQueueDrag(event)) return;

  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  const item = getImagePdfQueueItemFromEvent(event);
  setImagePdfQueueDropTarget(item, getImagePdfDropPosition(event, item));
}

function handleImagePdfQueueDragLeave(event) {
  if (!isImagePdfQueueDrag(event)) return;
  if (event.currentTarget.contains(event.relatedTarget)) return;

  clearImagePdfQueueDropTargets();
}

function handleImagePdfQueueDrop(event) {
  if (!isImagePdfQueueDrag(event)) return;

  event.preventDefault();
  event.stopPropagation();

  const draggedId = event.dataTransfer?.getData(IMAGE_PDF_DRAG_TYPE) || imagePdfDraggingId;
  const target = getImagePdfQueueItemFromEvent(event);
  const targetId = target?.dataset.imagePdfItemId || "";
  const position = getImagePdfDropPosition(event, target);
  const movedItem = moveImagePdfItem(draggedId, targetId, position);

  imagePdfDraggingId = "";
  clearImagePdfQueueDropTargets({ includeDragging: true });

  if (!movedItem) return;

  renderImagePdfQueue();
  const nextIndex = imagePdfItems.findIndex((item) => item.id === movedItem.id);
  setImagePdfStatus(`${movedItem.name} moved to position ${nextIndex + 1}.`);
}

function handleImagePdfQueueDragEnd() {
  imagePdfDraggingId = "";
  clearImagePdfQueueDropTargets({ includeDragging: true });
}

function getImagePdfQueueItemFromEvent(event) {
  const item = event.target.closest("[data-image-pdf-item]");
  return event.currentTarget.contains(item) ? item : null;
}

function isImagePdfQueueDrag(event) {
  if (imagePdfDraggingId) return true;
  return Array.from(event.dataTransfer?.types || []).includes(IMAGE_PDF_DRAG_TYPE);
}

function getImagePdfDropPosition(event, item) {
  if (!item) return "after";

  const rect = item.getBoundingClientRect();
  const list = item.closest("[data-image-pdf-list]");
  const view = list?.dataset.imagePdfView || imagePdfViewMode;

  if (["list", "details", "content"].includes(view)) {
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  }

  return event.clientX < rect.left + rect.width / 2 ? "before" : "after";
}

function setImagePdfQueueDropTarget(item, position) {
  clearImagePdfQueueDropTargets();
  if (!item || item.dataset.imagePdfItemId === imagePdfDraggingId) return;

  item.classList.add(position === "before" ? "is-drop-before" : "is-drop-after");
}

function clearImagePdfQueueDropTargets({ includeDragging = false } = {}) {
  const selector = includeDragging
    ? ".image-pdf-item.is-drop-before, .image-pdf-item.is-drop-after, .image-pdf-item.is-dragging"
    : ".image-pdf-item.is-drop-before, .image-pdf-item.is-drop-after";

  app.querySelectorAll(selector).forEach((node) => {
    node.classList.remove("is-drop-before", "is-drop-after");
    if (includeDragging) {
      node.classList.remove("is-dragging");
      node.removeAttribute("aria-grabbed");
    }
  });
}

function moveImagePdfItem(draggedId, targetId, position) {
  const fromIndex = imagePdfItems.findIndex((item) => item.id === draggedId);
  if (fromIndex < 0) return null;

  const [item] = imagePdfItems.splice(fromIndex, 1);
  let toIndex = imagePdfItems.length;
  const targetIndex = imagePdfItems.findIndex((entry) => entry.id === targetId);

  if (targetIndex >= 0) {
    toIndex = targetIndex + (position === "after" ? 1 : 0);
  }

  toIndex = clamp(toIndex, 0, imagePdfItems.length);
  imagePdfItems.splice(toIndex, 0, item);

  return toIndex === fromIndex ? null : item;
}

function shuffleImagePdfQueue() {
  if (imagePdfItems.length < 2) {
    setImagePdfStatus("Add at least 2 images to shuffle.");
    return;
  }

  const originalOrder = getImagePdfOrderSignature();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    shuffleImagePdfItemsOnce();
    if (getImagePdfOrderSignature() !== originalOrder) break;
  }

  if (getImagePdfOrderSignature() === originalOrder) {
    swapTwoRandomImagePdfItems();
  }

  renderImagePdfQueue();
  setImagePdfStatus(`${imagePdfItems.length} images shuffled.`);
}

function shuffleImagePdfItemsOnce() {
  for (let index = imagePdfItems.length - 1; index > 0; index -= 1) {
    const randomIndex = randomImagePdfIndex(index + 1);
    [imagePdfItems[index], imagePdfItems[randomIndex]] = [imagePdfItems[randomIndex], imagePdfItems[index]];
  }
}

function swapTwoRandomImagePdfItems() {
  const firstIndex = randomImagePdfIndex(imagePdfItems.length);
  let secondIndex = randomImagePdfIndex(imagePdfItems.length - 1);
  if (secondIndex >= firstIndex) {
    secondIndex += 1;
  }

  [imagePdfItems[firstIndex], imagePdfItems[secondIndex]] = [imagePdfItems[secondIndex], imagePdfItems[firstIndex]];
}

function randomImagePdfIndex(maxExclusive) {
  if (maxExclusive <= 1) return 0;

  if (window.crypto?.getRandomValues) {
    const range = 0x100000000;
    const limit = range - (range % maxExclusive);
    const bucket = new Uint32Array(1);
    let value = 0;

    do {
      window.crypto.getRandomValues(bucket);
      value = bucket[0];
    } while (value >= limit);

    return value % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

function getImagePdfOrderSignature() {
  return imagePdfItems.map((item) => item.id).join("|");
}

function handleImagePdfViewChange(event) {
  const nextMode = event.currentTarget.value;
  imagePdfViewMode = IMAGE_PDF_VIEW_MODES.includes(nextMode) ? nextMode : "large";
  renderImagePdfQueue();
}

function clearImagePdfItems() {
  imagePdfItems.forEach((item) => URL.revokeObjectURL(item.url));
  imagePdfItems = [];
  closeImagePdfLightbox();
  closeImagePdfPreview();
  renderImagePdfQueue();
  setImagePdfStatus("");
}

function handleImagePdfOptionInput(event) {
  if (event.currentTarget.dataset.imagePdfOption === "compressionMode") {
    applyImagePdfCompressionPreset(event.currentTarget.value);
  }

  if (event.currentTarget.dataset.imagePdfOption === "quality") {
    updateImagePdfQualityLabel();
  }

  saveImagePdfSettings();
  closeImagePdfPreview();
  renderImagePdfParts();
}

function applyImagePdfCompressionPreset(mode) {
  const preset = IMAGE_PDF_COMPRESSION_PRESETS[mode] || IMAGE_PDF_COMPRESSION_PRESETS.balanced;
  const qualityInput = app.querySelector('[data-image-pdf-option="quality"]');
  if (qualityInput) {
    qualityInput.value = String(preset.quality);
  }
  updateImagePdfQualityLabel();
}

function applySavedImagePdfSettings(root) {
  const settings = loadImagePdfSettings();
  root.querySelectorAll("[data-image-pdf-option]").forEach((node) => {
    const key = node.dataset.imagePdfOption;
    if (!key) return;
    if (key === "rangeText") {
      node.value = "";
      return;
    }
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      node.value = settings[key];
    } else if (key === "partNamePattern") {
      node.value = DEFAULT_IMAGE_PDF_PART_NAME_PATTERN;
    }
  });
}

function saveImagePdfSettings() {
  const root = app.querySelector("[data-image-pdf-tool]");
  if (!root) return;

  const settings = {};
  root.querySelectorAll("[data-image-pdf-option]").forEach((node) => {
    const key = node.dataset.imagePdfOption;
    if (key === "rangeText") return;
    if (key) settings[key] = node.value;
  });

  try {
    localStorage.setItem(IMAGE_PDF_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Local persistence is helpful, but not required for PDF creation.
  }
}

function loadImagePdfSettings() {
  try {
    return JSON.parse(localStorage.getItem(IMAGE_PDF_SETTINGS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

async function exportImagePdf() {
  if (!imagePdfItems.length) {
    setImagePdfStatus("Add images first.");
    return;
  }

  const options = readImagePdfOptions();
  beginImagePdfJob("Preparing PDF...");
  setImagePdfBusy(true);
  try {
    const pdfBlob = await createImagePdfBlob(imagePdfItems, options, ({ index, total, label }) => {
      assertImagePdfNotCancelled();
      setImagePdfProgress(index + 1, total, `Preparing ${index + 1}/${total}: ${label}`);
    });
    assertImagePdfNotCancelled();
    clearImagePdfProgress();
    downloadBlob(pdfBlob, `${sanitizePdfFilename(options.filename)}.pdf`);
    setImagePdfStatus(`PDF created: ${imagePdfItems.length} page${imagePdfItems.length === 1 ? "" : "s"}.`);
  } catch (error) {
    clearImagePdfProgress();
    setImagePdfStatus(isImagePdfCancelError(error) ? "Cancelled." : error?.message || "PDF could not be created.");
  } finally {
    setImagePdfBusy(false);
  }
}

async function handleImagePdfPartDownload(event) {
  const button = event.target.closest("[data-image-pdf-part-download]");
  if (!button) return;

  const partIndex = Number(button.dataset.imagePdfPartDownload);
  const parts = getImagePdfParts();
  const part = parts[partIndex];
  if (!part) return;

  await exportImagePdfPart(part);
}

async function handleImagePdfPartPreview(event) {
  const button = event.target.closest("[data-image-pdf-part-preview]");
  if (!button) return;

  const partIndex = Number(button.dataset.imagePdfPartPreview);
  const parts = getImagePdfParts();
  const part = parts[partIndex];
  if (!part) return;

  const options = readImagePdfOptions();
  beginImagePdfJob(`Preparing preview: ${part.name}.pdf`);
  setImagePdfBusy(true);
  try {
    const pdfBlob = await createImagePdfBlob(part.items, options, ({ index, total, label }) => {
      assertImagePdfNotCancelled();
      setImagePdfProgress(index + 1, total, `Preview part ${part.number}: ${index + 1}/${total}: ${label}`);
    });
    assertImagePdfNotCancelled();
    clearImagePdfProgress();
    showImagePdfPreview(part, pdfBlob);
    setImagePdfStatus(`Preview ready: ${part.name}.pdf`);
  } catch (error) {
    clearImagePdfProgress();
    setImagePdfStatus(isImagePdfCancelError(error) ? "Cancelled." : error?.message || `Preview for part ${part.number} could not be created.`);
  } finally {
    setImagePdfBusy(false);
  }
}

async function exportImagePdfPart(part) {
  const options = readImagePdfOptions();
  beginImagePdfJob(`Preparing ${part.name}.pdf`);
  setImagePdfBusy(true);
  try {
    const pdfBlob = await createImagePdfBlob(part.items, options, ({ index, total, label }) => {
      assertImagePdfNotCancelled();
      setImagePdfStatus(`Preparing ${index + 1}/${total}: ${label}`);
      setImagePdfProgress(index + 1, total, `Preparing part ${part.number}: ${index + 1}/${total}: ${label}`);
    });
    assertImagePdfNotCancelled();
    clearImagePdfProgress();
    downloadBlob(pdfBlob, `${sanitizePdfFilename(part.name)}.pdf`);
    setImagePdfStatus(`Part ${part.number} created: pages ${part.startPage}-${part.endPage}.`);
  } catch (error) {
    clearImagePdfProgress();
    setImagePdfStatus(isImagePdfCancelError(error) ? "Cancelled." : error?.message || `Part ${part.number} could not be created.`);
  } finally {
    setImagePdfBusy(false);
  }
}

async function exportAllImagePdfParts() {
  if (!imagePdfItems.length) {
    setImagePdfStatus("Add images first.");
    return;
  }

  const parts = getImagePdfParts();
  if (!parts.length) {
    setImagePdfStatus("Enter pages per PDF first.");
    return;
  }

  const options = readImagePdfOptions();
  const totalPages = parts.reduce((sum, part) => sum + part.items.length, 0);
  let completedPages = 0;
  beginImagePdfJob(`Preparing ${parts.length} PDFs...`);
  setImagePdfBusy(true);
  try {
    for (const part of parts) {
      const pdfBlob = await createImagePdfBlob(part.items, options, ({ index, total, label }) => {
        assertImagePdfNotCancelled();
        setImagePdfProgress(completedPages + index + 1, totalPages, `Part ${part.number}/${parts.length}: ${index + 1}/${total}: ${label}`);
      });
      assertImagePdfNotCancelled();
      downloadBlob(pdfBlob, `${sanitizePdfFilename(part.name)}.pdf`);
      completedPages += part.items.length;
      await waitForImagePdfDownloadQueue();
    }
    clearImagePdfProgress();
    setImagePdfStatus(`${parts.length} PDFs created.`);
  } catch (error) {
    clearImagePdfProgress();
    setImagePdfStatus(isImagePdfCancelError(error) ? "Cancelled." : error?.message || "Split PDFs could not be created.");
  } finally {
    setImagePdfBusy(false);
  }
}

function readImagePdfOptions() {
  const root = app.querySelector("[data-image-pdf-tool]");
  const read = (key, fallback = "") => root?.querySelector(`[data-image-pdf-option="${key}"]`)?.value || fallback;
  return {
    pageSize: read("pageSize", "a4"),
    orientation: read("orientation", "auto"),
    fit: read("fit", "contain"),
    marginMm: clamp(Number(read("marginMm", 8)), 0, 40),
    compressionMode: read("compressionMode", "balanced"),
    quality: clamp(Number(read("quality", 92)), 60, 100),
    background: read("background", "#ffffff"),
    filename: read("filename", "image-to-pdf"),
    splitSize: Math.max(0, Math.floor(Number(read("splitSize", 0)) || 0)),
    partNamePattern: read("partNamePattern", DEFAULT_IMAGE_PDF_PART_NAME_PATTERN),
    rangeText: read("rangeText", ""),
  };
}

function renderImagePdfQueue() {
  const list = app.querySelector("[data-image-pdf-list]");
  const count = app.querySelector("[data-image-pdf-count]");
  if (!list) return;

  list.dataset.imagePdfView = imagePdfViewMode;

  if (count) {
    count.textContent = `${imagePdfItems.length} image${imagePdfItems.length === 1 ? "" : "s"}`;
  }

  if (!imagePdfItems.length) {
    list.innerHTML = '<div class="image-pdf-empty">No images selected</div>';
    renderImagePdfParts();
    return;
  }

  list.innerHTML = imagePdfItems
    .map((item, index) => {
      const meta = `${item.width || "-"} x ${item.height || "-"} px | ${formatBytes(item.size)}`;
      const rotation = normalizeImagePdfRotation(item.rotation || 0);
      return `
        <article class="image-pdf-item" data-image-pdf-item data-image-pdf-item-id="${escapeHtml(item.id)}" draggable="true" aria-label="${escapeHtml(item.name)}">
          <div class="image-pdf-thumb-frame">
            <span class="image-pdf-drag-handle" title="Drag to reorder" aria-hidden="true"></span>
            <span class="image-pdf-order">${index + 1}</span>
            <img class="image-pdf-thumb" src="${escapeHtml(item.url)}" alt="" draggable="false" style="--image-pdf-rotation: ${rotation}deg" />
            ${rotation ? `<span class="image-pdf-rotation-badge">${rotation}&deg;</span>` : ""}
          </div>
          <div class="image-pdf-item-main">
            <div class="image-pdf-item-name">${escapeHtml(item.name)}</div>
            <div class="image-pdf-item-meta">${escapeHtml(meta)}</div>
          </div>
          <div class="image-pdf-item-actions">
            <button class="image-pdf-icon-button" data-image-pdf-item-action="rotate-left" data-image-pdf-item-id="${escapeHtml(item.id)}" title="Rotate left" aria-label="Rotate left"><span class="image-pdf-rotate-glyph" aria-hidden="true">&#8634;</span></button>
            <button class="image-pdf-icon-button" data-image-pdf-item-action="rotate-right" data-image-pdf-item-id="${escapeHtml(item.id)}" title="Rotate right" aria-label="Rotate right"><span class="image-pdf-rotate-glyph" aria-hidden="true">&#8635;</span></button>
            <button class="image-pdf-icon-button" data-image-pdf-item-action="up" data-image-pdf-item-id="${escapeHtml(item.id)}" title="Move up"${index === 0 ? " disabled" : ""}>^</button>
            <button class="image-pdf-icon-button" data-image-pdf-item-action="down" data-image-pdf-item-id="${escapeHtml(item.id)}" title="Move down"${index === imagePdfItems.length - 1 ? " disabled" : ""}>v</button>
            <button class="image-pdf-icon-button is-danger" data-image-pdf-item-action="remove" data-image-pdf-item-id="${escapeHtml(item.id)}" title="Remove">x</button>
          </div>
        </article>
      `;
    })
    .join("");
  renderImagePdfParts();
}

function renderImagePdfParts() {
  const list = app.querySelector("[data-image-pdf-split-list]");
  if (!list) return;

  const result = resolveImagePdfParts();
  const parts = result.parts;
  updateImagePdfSplitDownloadAll(parts);
  renderImagePdfSplitEstimate(result);

  if (result.error) {
    list.hidden = false;
    list.innerHTML = `<div class="image-pdf-part-note is-error">${escapeHtml(result.error)}</div>`;
    return;
  }

  list.hidden = !parts.length;
  list.innerHTML = parts
    .map((part, index) => `
      <div class="image-pdf-part-row">
        <div class="image-pdf-part-copy">
          <strong>${escapeHtml(part.name)}.pdf</strong>
          <span>Pages ${part.startPage}-${part.endPage} | ${part.items.length} page${part.items.length === 1 ? "" : "s"} | approx ${formatBytes(part.estimatedBytes)}</span>
        </div>
        <div class="image-pdf-part-actions">
          <button class="image-pdf-part-preview" data-image-pdf-part-preview="${index}" type="button">Preview</button>
          <button class="image-pdf-part-download" data-image-pdf-part-download="${index}" type="button">Download</button>
        </div>
      </div>
    `)
    .join("");
}

function getImagePdfParts() {
  return resolveImagePdfParts().parts;
}

function resolveImagePdfParts() {
  const options = readImagePdfOptions();
  const rangeText = options.rangeText.trim();
  if (!imagePdfItems.length) return { parts: [], error: "", totalEstimatedBytes: 0, mode: "" };

  if (rangeText) {
    return resolveImagePdfRangeParts(options, rangeText);
  }

  const size = options.splitSize;
  if (size < 1) return { parts: [], error: "", totalEstimatedBytes: 0, mode: "" };

  const parts = [];
  for (let start = 0; start < imagePdfItems.length; start += size) {
    const end = Math.min(start + size, imagePdfItems.length);
    parts.push(createImagePdfPart(start + 1, end));
  }
  return finalizeImagePdfParts(parts, options, "split");
}

function resolveImagePdfRangeParts(options, rangeText) {
  const tokens = rangeText.split(",").map((token) => token.trim()).filter(Boolean);
  if (!tokens.length) {
    return { parts: [], error: "Use ranges like 1-5, 6-12.", totalEstimatedBytes: 0, mode: "ranges" };
  }

  const parts = [];
  const splitSize = options.splitSize;
  for (const token of tokens) {
    const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) {
      return { parts: [], error: `Range "${token}" is invalid. Use 1-5 or 7.`, totalEstimatedBytes: 0, mode: "ranges" };
    }

    const startPage = Number(match[1]);
    const endPage = Number(match[2] || match[1]);
    if (startPage < 1 || endPage < startPage) {
      return { parts: [], error: `Range "${token}" is invalid.`, totalEstimatedBytes: 0, mode: "ranges" };
    }
    if (endPage > imagePdfItems.length) {
      return { parts: [], error: `Range "${token}" exceeds ${imagePdfItems.length} images.`, totalEstimatedBytes: 0, mode: "ranges" };
    }

    if (splitSize > 0) {
      for (let start = startPage; start <= endPage; start += splitSize) {
        parts.push(createImagePdfPart(start, Math.min(start + splitSize - 1, endPage)));
      }
    } else {
      parts.push(createImagePdfPart(startPage, endPage));
    }
  }

  return finalizeImagePdfParts(parts, options, splitSize > 0 ? "range-split" : "ranges");
}

function createImagePdfPart(startPage, endPage) {
  return {
    startPage,
    endPage,
    items: imagePdfItems.slice(startPage - 1, endPage),
  };
}

function finalizeImagePdfParts(parts, options, mode) {
  const totalParts = parts.length;
  const finalized = parts.map((part, index) => {
    const number = index + 1;
    const estimatedBytes = estimateImagePdfPartSize(part.items, options);
    return {
      ...part,
      number,
      totalParts,
      estimatedBytes,
      name: formatImagePdfPartName(options.partNamePattern, options.filename, {
        ...part,
        number,
        totalParts,
      }),
    };
  });

  return {
    parts: finalized,
    error: "",
    totalEstimatedBytes: finalized.reduce((sum, part) => sum + part.estimatedBytes, 0),
    mode,
  };
}

function formatImagePdfPartName(pattern, baseName, part) {
  const fallbackName = String(baseName || "image-to-pdf").trim() || "image-to-pdf";
  const template = String(pattern || DEFAULT_IMAGE_PDF_PART_NAME_PATTERN).trim() || DEFAULT_IMAGE_PDF_PART_NAME_PATTERN;
  const values = {
    name: fallbackName,
    n: part.number,
    part: part.number,
    start: part.startPage,
    end: part.endPage,
    total: part.totalParts,
    count: part.items.length,
    pages: part.items.length,
  };
  const formatted = template.replace(/\{(name|n|part|start|end|total|count|pages)\}/g, (_, key) => values[key]);
  return formatted.trim() || `${fallbackName} part ${part.number}`;
}

function estimateImagePdfPartSize(items, options) {
  const rawBytes = items.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
  const compressionFactor = {
    high: 0.95,
    balanced: 0.72,
    small: 0.48,
  }[options.compressionMode] || 0.72;
  const qualityFactor = clamp(Number(options.quality || 92), 60, 100) / 92;
  const minimumRasterEstimate = items.length * 24000;
  const pdfOverhead = 1800 + items.length * 1400;
  return Math.max(minimumRasterEstimate, Math.round(rawBytes * compressionFactor * qualityFactor)) + pdfOverhead;
}

function renderImagePdfSplitEstimate(result = resolveImagePdfParts()) {
  const estimate = app.querySelector("[data-image-pdf-split-estimate]");
  if (!estimate) return;

  if (!result.parts.length || result.error) {
    estimate.hidden = true;
    estimate.textContent = "";
    return;
  }

  const modeLabel = result.mode === "ranges" ? "Manual ranges" : result.mode === "range-split" ? "Range split" : "Auto split";
  estimate.hidden = false;
  estimate.textContent = `${modeLabel}: ${result.parts.length} PDF${result.parts.length === 1 ? "" : "s"} | approx ${formatBytes(result.totalEstimatedBytes)}`;
}

function updateImagePdfSplitDownloadAll(parts = getImagePdfParts()) {
  const button = app.querySelector("[data-image-pdf-split-download-all]");
  if (!button) return;
  button.disabled = !parts.length;
}

function waitForImagePdfDownloadQueue() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 120);
  });
}

function showImagePdfPreview(part, pdfBlob) {
  const preview = app.querySelector("[data-image-pdf-preview]");
  if (!preview) return;

  closeImagePdfPreview();
  imagePdfPreviewUrl = URL.createObjectURL(pdfBlob);
  preview.hidden = false;
  preview.innerHTML = `
    <div class="image-pdf-preview-head">
      <div class="image-pdf-preview-title">
        <strong>${escapeHtml(part.name)}.pdf</strong>
        <span>${part.items.length} page${part.items.length === 1 ? "" : "s"} | ${formatBytes(pdfBlob.size)}</span>
      </div>
      <button class="image-pdf-preview-close" data-image-pdf-preview-close type="button">Close</button>
    </div>
    <iframe class="image-pdf-preview-frame" src="${escapeHtml(imagePdfPreviewUrl)}" title="${escapeHtml(part.name)} preview"></iframe>
  `;
}

function handleImagePdfPreviewAction(event) {
  if (event.target.closest("[data-image-pdf-preview-close]")) {
    closeImagePdfPreview();
  }
}

function closeImagePdfPreview() {
  if (imagePdfPreviewUrl) {
    URL.revokeObjectURL(imagePdfPreviewUrl);
    imagePdfPreviewUrl = "";
  }

  const preview = app.querySelector("[data-image-pdf-preview]");
  if (!preview) return;
  preview.hidden = true;
  preview.innerHTML = "";
}

function beginImagePdfJob(message) {
  imagePdfCancelRequested = false;
  setImagePdfProgress(0, 1, message, true);
}

function cancelImagePdfJob() {
  imagePdfCancelRequested = true;
  const button = app.querySelector("[data-image-pdf-cancel]");
  if (button) button.disabled = true;
  setImagePdfStatus("Cancelling...");
}

function assertImagePdfNotCancelled() {
  if (imagePdfCancelRequested) {
    throw new Error(IMAGE_PDF_CANCELLED_MESSAGE);
  }
}

function isImagePdfCancelError(error) {
  return error?.message === IMAGE_PDF_CANCELLED_MESSAGE;
}

function setImagePdfProgress(current, total, label, canCancel = true) {
  const progress = app.querySelector("[data-image-pdf-progress]");
  const progressBar = app.querySelector("[data-image-pdf-progress-bar]");
  const cancelButton = app.querySelector("[data-image-pdf-cancel]");
  const safeTotal = Math.max(1, Number(total) || 1);
  const safeCurrent = clamp(Number(current) || 0, 0, safeTotal);
  const percent = Math.round((safeCurrent / safeTotal) * 100);

  if (progress) progress.hidden = false;
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (cancelButton) {
    cancelButton.hidden = !canCancel;
    cancelButton.disabled = !canCancel;
  }
  setImagePdfStatus(label || `${percent}%`);
}

function clearImagePdfProgress() {
  const progress = app.querySelector("[data-image-pdf-progress]");
  const progressBar = app.querySelector("[data-image-pdf-progress-bar]");
  const cancelButton = app.querySelector("[data-image-pdf-cancel]");
  if (progress) progress.hidden = true;
  if (progressBar) progressBar.style.width = "0%";
  if (cancelButton) {
    cancelButton.hidden = true;
    cancelButton.disabled = false;
  }
  imagePdfCancelRequested = false;
}

function updateImagePdfQualityLabel() {
  const quality = app.querySelector('[data-image-pdf-option="quality"]')?.value || "92";
  const label = app.querySelector("[data-image-pdf-quality-value]");
  if (label) label.textContent = `${quality}%`;
}

function setImagePdfStatus(message) {
  const status = app.querySelector("[data-image-pdf-status]");
  if (!status) return;
  const summary = status.closest(".image-pdf-summary");
  const progress = app.querySelector("[data-image-pdf-progress]");
  const text = String(message || "").trim();
  const isIdle = !text || text === "Ready";
  status.textContent = isIdle ? "" : text;
  if (summary) summary.hidden = isIdle && (!progress || progress.hidden);
}

function setImagePdfBusy(isBusy) {
  const root = app.querySelector("[data-image-pdf-tool]");
  root?.querySelectorAll("button, input, select").forEach((node) => {
    if (node.matches("[data-image-pdf-file]")) return;
    if (node.matches("[data-image-pdf-cancel]")) return;
    node.disabled = isBusy;
  });
  if (!isBusy) updateImagePdfSplitDownloadAll();
}

function applySavedImageResizeSettings(root) {
  const settings = loadImageResizeSettings();
  root.querySelectorAll("[data-image-resize-option]").forEach((node) => {
    const key = node.dataset.imageResizeOption;
    if (!key || key === "scaleSlider") return;
    if (!Object.prototype.hasOwnProperty.call(settings, key)) return;
    if (node.type === "checkbox") {
      node.checked = Boolean(settings[key]);
    } else {
      node.value = settings[key];
    }
  });

  const scale = root.querySelector('[data-image-resize-option="scale"]')?.value || "100";
  const scaleSlider = root.querySelector('[data-image-resize-option="scaleSlider"]');
  if (scaleSlider) scaleSlider.value = scale;
}

function saveImageResizeSettings() {
  const root = app.querySelector("[data-image-resize-tool]");
  if (!root) return;

  const settings = {};
  root.querySelectorAll("[data-image-resize-option]").forEach((node) => {
    const key = node.dataset.imageResizeOption;
    if (!key || key === "scaleSlider") return;
    settings[key] = node.type === "checkbox" ? node.checked : node.value;
  });

  try {
    localStorage.setItem(IMAGE_RESIZE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Resize preferences are optional.
  }
}

function loadImageResizeSettings() {
  try {
    return JSON.parse(localStorage.getItem(IMAGE_RESIZE_SETTINGS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

async function addImageResizeFiles(fileList) {
  const files = normalizeImagePdfFiles(fileList);
  if (!files.length) {
    setImageResizeStatus("No image files selected.");
    return;
  }

  setImageResizeStatus("Adding images...");
  const knownSignatures = new Set(imageResizeItems.map((item) => item.signature).filter(Boolean));
  let addedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  for (const file of files) {
    const signature = await createImagePdfFileSignature(file);
    if (knownSignatures.has(signature)) {
      duplicateCount += 1;
      continue;
    }
    knownSignatures.add(signature);

    const item = {
      id: createImagePdfId(),
      file,
      name: file.name || "image",
      size: file.size || 0,
      type: file.type || "image",
      signature,
      url: URL.createObjectURL(file),
      width: 0,
      height: 0,
    };

    try {
      const dimensions = await readImagePdfDimensions(item.url);
      item.width = dimensions.width;
      item.height = dimensions.height;
    } catch {
      URL.revokeObjectURL(item.url);
      failedCount += 1;
      continue;
    }

    imageResizeItems.push(item);
    firstAddedId = firstAddedId || item.id;
    addedCount += 1;
  }

  if (firstAddedId && !imageResizeSelectedId) {
    imageResizeSelectedId = firstAddedId;
  }
  ensureImageResizeSelection();

  if (addedCount && imageResizeItems.length === addedCount) {
    applyImageResizeScaleToDimensions();
  }

  renderImageResizeQueue();
  updateImageResizeWorkspace();
  const messages = [];
  if (addedCount) messages.push(`${addedCount} added`);
  if (duplicateCount) messages.push(`${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"} skipped`);
  if (failedCount) messages.push(`${failedCount} failed`);
  setImageResizeStatus(messages.length ? `${messages.join(". ")}. ${imageResizeItems.length} total.` : "No new images added.");
}

function clearImageResizeItems() {
  imageResizeItems.forEach((item) => URL.revokeObjectURL(item.url));
  imageResizeItems = [];
  imageResizeSelectedId = "";
  renderImageResizeQueue();
  updateImageResizeWorkspace();
  setImageResizeStatus("");
}

function handleImageResizeListAction(event) {
  const button = event.target.closest("[data-image-resize-item-action]");
  const itemNode = event.target.closest("[data-image-resize-item]");

  if (!button && itemNode) {
    imageResizeSelectedId = itemNode.dataset.imageResizeItemId || "";
    applyImageResizeScaleToDimensions();
    renderImageResizeQueue();
    updateImageResizeWorkspace();
    return;
  }

  if (!button) return;

  const index = imageResizeItems.findIndex((item) => item.id === button.dataset.imageResizeItemId);
  if (index < 0) return;

  if (button.dataset.imageResizeItemAction === "remove") {
    const removedId = imageResizeItems[index].id;
    URL.revokeObjectURL(imageResizeItems[index].url);
    imageResizeItems.splice(index, 1);
    if (imageResizeSelectedId === removedId) {
      imageResizeSelectedId = imageResizeItems[Math.min(index, imageResizeItems.length - 1)]?.id || "";
      applyImageResizeScaleToDimensions();
    }
    ensureImageResizeSelection();
    renderImageResizeQueue();
    updateImageResizeWorkspace();
    setImageResizeStatus(`${imageResizeItems.length} image${imageResizeItems.length === 1 ? "" : "s"} ready.`);
  }
}

function handleImageResizeOptionInput(event) {
  const option = event.currentTarget.dataset.imageResizeOption;
  if (option === "scale" || option === "scaleSlider") {
    syncImageResizeScale(option);
    applyImageResizeScaleToDimensions();
  } else if (option === "width" || option === "height") {
    syncImageResizeLockedDimension(option);
  } else if (option === "unit" || option === "dpi") {
    applyImageResizeScaleToDimensions();
  } else if (option === "lockRatio") {
    syncImageResizeLockedDimension("width");
  }

  syncImageResizeLabels();
  saveImageResizeSettings();
  renderImageResizeQueue();
  updateImageResizeWorkspace();
}

function syncImageResizeScale(source) {
  const root = app.querySelector("[data-image-resize-tool]");
  if (!root) return;

  const scale = root.querySelector('[data-image-resize-option="scale"]');
  const slider = root.querySelector('[data-image-resize-option="scaleSlider"]');
  const sourceNode = source === "scaleSlider" ? slider : scale;
  const value = clamp(Math.round(Number(sourceNode?.value || 100)), 1, 500);

  if (scale) scale.value = String(value);
  if (slider) slider.value = String(value);
}

function applyImageResizeScaleToDimensions() {
  const first = getSelectedImageResizeItem();
  const root = app.querySelector("[data-image-resize-tool]");
  if (!first || !root) return;

  const options = readImageResizeOptions();
  const widthInput = root.querySelector('[data-image-resize-option="width"]');
  const heightInput = root.querySelector('[data-image-resize-option="height"]');
  const scale = clamp(Number(options.scale) || 100, 1, 500) / 100;

  if (widthInput) widthInput.value = formatImageResizeUnitValue(pixelsToImageResizeUnit(first.width * scale, options.unit, options.dpi), options.unit);
  if (heightInput) heightInput.value = formatImageResizeUnitValue(pixelsToImageResizeUnit(first.height * scale, options.unit, options.dpi), options.unit);
}

function syncImageResizeLockedDimension(changedOption) {
  const first = getSelectedImageResizeItem();
  const root = app.querySelector("[data-image-resize-tool]");
  if (!first || !root) return;

  const lock = root.querySelector('[data-image-resize-option="lockRatio"]')?.checked ?? true;
  if (!lock) return;

  const options = readImageResizeOptions();
  const widthInput = root.querySelector('[data-image-resize-option="width"]');
  const heightInput = root.querySelector('[data-image-resize-option="height"]');
  const ratio = first.width > 0 && first.height > 0 ? first.width / first.height : 1;
  const width = Number(widthInput?.value || 0);
  const height = Number(heightInput?.value || 0);

  if (changedOption === "height" && height > 0 && widthInput) {
    widthInput.value = formatImageResizeUnitValue(height * ratio, options.unit);
  } else if (width > 0 && heightInput) {
    heightInput.value = formatImageResizeUnitValue(width / ratio, options.unit);
  }
}

function syncImageResizeLabels() {
  const root = app.querySelector("[data-image-resize-tool]");
  if (!root) return;

  const scale = clamp(Math.round(Number(root.querySelector('[data-image-resize-option="scale"]')?.value || 100)), 1, 500);
  const quality = clamp(Math.round(Number(root.querySelector('[data-image-resize-option="quality"]')?.value || 92)), 20, 100);
  const scaleLabel = root.querySelector("[data-image-resize-scale-value]");
  const qualityLabel = root.querySelector("[data-image-resize-quality-value]");
  if (scaleLabel) scaleLabel.textContent = `${scale}%`;
  if (qualityLabel) qualityLabel.textContent = `${quality}%`;
}

function readImageResizeOptions() {
  const root = app.querySelector("[data-image-resize-tool]");
  const read = (key, fallback = "") => root?.querySelector(`[data-image-resize-option="${key}"]`)?.value || fallback;
  return {
    unit: normalizeImageResizeUnit(read("unit", "px")),
    dpi: clamp(Number(read("dpi", 300)) || 300, 1, 1200),
    width: Math.max(0, Number(read("width", 0)) || 0),
    height: Math.max(0, Number(read("height", 0)) || 0),
    lockRatio: root?.querySelector('[data-image-resize-option="lockRatio"]')?.checked ?? true,
    scale: clamp(Number(read("scale", 100)) || 100, 1, 500),
    targetSize: Math.max(0, Number(read("targetSize", 0)) || 0),
    targetUnit: read("targetUnit", "kb") === "mb" ? "mb" : "kb",
    quality: clamp(Number(read("quality", 92)) || 92, 20, 100),
    suffix: read("suffix", "resized"),
  };
}

function getSelectedImageResizeItem() {
  return imageResizeItems.find((item) => item.id === imageResizeSelectedId) || imageResizeItems[0] || null;
}

function ensureImageResizeSelection() {
  if (!imageResizeItems.length) {
    imageResizeSelectedId = "";
    return null;
  }

  const selected = imageResizeItems.find((item) => item.id === imageResizeSelectedId) || imageResizeItems[0];
  imageResizeSelectedId = selected.id;
  return selected;
}

function updateImageResizeWorkspace() {
  ensureImageResizeSelection();
  updateImageResizeLiveSize();
  drawImageResizePreview();
}

function updateImageResizeLiveSize() {
  const item = getSelectedImageResizeItem();
  const original = app.querySelector("[data-image-resize-live-original]");
  const output = app.querySelector("[data-image-resize-live-output]");
  const size = app.querySelector("[data-image-resize-live-size]");
  const title = app.querySelector("[data-image-resize-selected-name]");
  const meta = app.querySelector("[data-image-resize-selected-meta]");

  if (!item) {
    if (original) original.textContent = "-";
    if (output) output.textContent = "-";
    if (size) size.textContent = "-";
    if (title) title.textContent = "No image selected";
    if (meta) meta.textContent = "";
    return;
  }

  const options = readImageResizeOptions();
  const dimensions = getImageResizeOutputPixels(item, options, false);
  const outputText = dimensions.error ? dimensions.error : `${dimensions.width} x ${dimensions.height} px`;
  const estimate = dimensions.error ? "-" : estimateImageResizeOutputSize(item, dimensions, options);
  if (original) original.textContent = `${item.width || "-"} x ${item.height || "-"} px | ${formatBytes(item.size)}`;
  if (output) output.textContent = outputText;
  if (size) size.textContent = estimate;
  if (title) title.textContent = item.name || "image";
  if (meta) meta.textContent = `${outputText} | ${options.unit.toUpperCase()} | ${options.dpi} DPI`;
}

function estimateImageResizeOutputSize(item, dimensions, options) {
  const targetBytes = getImageResizeTargetBytes(options);
  if (targetBytes > 0) return `Target ${formatBytes(targetBytes)}`;

  const originalPixels = Math.max(1, (item.width || 1) * (item.height || 1));
  const outputPixels = Math.max(1, dimensions.width * dimensions.height);
  const pixelRatio = outputPixels / originalPixels;
  const qualityRatio = clamp(Number(options.quality || 92), 20, 100) / 92;
  const estimated = Math.max(1024, Math.round((Number(item.size) || 0) * pixelRatio * qualityRatio));
  return `~${formatBytes(estimated)}`;
}

async function drawImageResizePreview() {
  const canvas = app.querySelector("[data-image-resize-canvas]");
  const empty = app.querySelector("[data-image-resize-canvas-empty]");
  const item = getSelectedImageResizeItem();
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const token = imageResizePreviewDrawToken + 1;
  imageResizePreviewDrawToken = token;

  if (!item || !context) {
    canvas.hidden = true;
    if (empty) empty.hidden = false;
    canvas.width = 1;
    canvas.height = 1;
    context?.clearRect(0, 0, 1, 1);
    return;
  }

  const options = readImageResizeOptions();
  const dimensions = getImageResizeOutputPixels(item, options, false);
  if (dimensions.error) {
    canvas.hidden = true;
    if (empty) {
      empty.hidden = false;
      empty.textContent = dimensions.error;
    }
    return;
  }

  if (empty) empty.hidden = true;
  canvas.hidden = false;

  try {
    const image = await loadImageElement(item.url);
    if (token !== imageResizePreviewDrawToken) return;

    const scale = getImageResizePreviewScale(dimensions.width, dimensions.height);
    const previewWidth = Math.max(1, Math.round(dimensions.width * scale));
    const previewHeight = Math.max(1, Math.round(dimensions.height * scale));
    canvas.width = previewWidth;
    canvas.height = previewHeight;
    canvas.style.aspectRatio = `${previewWidth} / ${previewHeight}`;
    context.clearRect(0, 0, previewWidth, previewHeight);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, previewWidth, previewHeight);
  } catch {
    if (empty) {
      empty.hidden = false;
      empty.textContent = "Preview failed";
    }
    canvas.hidden = true;
  }
}

function getImageResizePreviewScale(width, height) {
  const maxDimension = 2400;
  const maxPixels = 4000000;
  const dimensionScale = Math.min(maxDimension / Math.max(1, width), maxDimension / Math.max(1, height), 1);
  const pixelScale = Math.min(Math.sqrt(maxPixels / Math.max(1, width * height)), 1);
  return Math.max(0.02, Math.min(dimensionScale, pixelScale));
}

function renderImageResizeQueue() {
  const list = app.querySelector("[data-image-resize-list]");
  const count = app.querySelector("[data-image-resize-count]");
  if (!list) return;

  if (count) {
    count.textContent = `${imageResizeItems.length} image${imageResizeItems.length === 1 ? "" : "s"}`;
  }

  if (!imageResizeItems.length) {
    list.innerHTML = '<div class="image-pdf-empty">No images selected</div>';
    return;
  }

  const options = readImageResizeOptions();
  list.innerHTML = imageResizeItems
    .map((item) => {
      const output = getImageResizeOutputPixels(item, options, false);
      const outputMeta = output.error ? output.error : `${output.width} x ${output.height} px`;
      const meta = `${item.width || "-"} x ${item.height || "-"} px | ${formatBytes(item.size)} -> ${outputMeta}`;
      const activeClass = item.id === imageResizeSelectedId ? " is-active" : "";
      return `
        <article class="image-resize-item${activeClass}" data-image-resize-item data-image-resize-item-id="${escapeHtml(item.id)}">
          <div class="image-resize-thumb-frame">
            <img class="image-resize-thumb" src="${escapeHtml(item.url)}" alt="" draggable="false" />
          </div>
          <div class="image-resize-item-main">
            <div class="image-resize-item-name">${escapeHtml(item.name)}</div>
            <div class="image-resize-item-meta">${escapeHtml(meta)}</div>
          </div>
          <button class="image-pdf-icon-button is-danger" data-image-resize-item-action="remove" data-image-resize-item-id="${escapeHtml(item.id)}" type="button" title="Remove">x</button>
        </article>
      `;
    })
    .join("");
}

function getImageResizeOutputPixels(item, options, shouldThrow = true) {
  const ratio = item.width > 0 && item.height > 0 ? item.width / item.height : 1;
  const scale = clamp(Number(options.scale) || 100, 1, 500) / 100;
  const hasWidth = options.width > 0;
  const hasHeight = options.height > 0;
  let width = hasWidth ? imageResizeUnitToPixels(options.width, options.unit, options.dpi) : item.width * scale;
  let height = hasHeight ? imageResizeUnitToPixels(options.height, options.unit, options.dpi) : item.height * scale;

  if (options.lockRatio) {
    if (hasWidth && !hasHeight) {
      height = width / ratio;
    } else if (!hasWidth && hasHeight) {
      width = height * ratio;
    }
  }

  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));

  const error = validateImageResizePixels(width, height);
  if (error && shouldThrow) throw new Error(error);
  return { width, height, error };
}

function validateImageResizePixels(width, height) {
  if (width > IMAGE_RESIZE_MAX_DIMENSION || height > IMAGE_RESIZE_MAX_DIMENSION || width * height > IMAGE_RESIZE_MAX_PIXELS) {
    return "Output size too large";
  }
  return "";
}

function normalizeImageResizeUnit(value) {
  if (value === "cm" || value === "m") return value;
  return "px";
}

function imageResizeUnitToPixels(value, unit, dpi) {
  if (unit === "cm") return (value / 2.54) * dpi;
  if (unit === "m") return ((value * 100) / 2.54) * dpi;
  return value;
}

function pixelsToImageResizeUnit(pixels, unit, dpi) {
  if (unit === "cm") return (pixels / dpi) * 2.54;
  if (unit === "m") return ((pixels / dpi) * 2.54) / 100;
  return pixels;
}

function formatImageResizeUnitValue(value, unit) {
  if (unit === "px") return String(Math.max(1, Math.round(value)));
  const precision = unit === "m" ? 4 : 2;
  return String(Math.round(value * 10 ** precision) / 10 ** precision);
}

async function downloadImageResizeFormat(format) {
  const safeFormat = normalizeImageResizeFormat(format);
  if (!imageResizeItems.length) {
    setImageResizeStatus("Add images first.");
    return;
  }

  const options = readImageResizeOptions();
  const targetBytes = getImageResizeTargetBytes(options);
  setImageResizeBusy(true);
  try {
    for (let index = 0; index < imageResizeItems.length; index += 1) {
      const item = imageResizeItems[index];
      setImageResizeStatus(`Preparing ${index + 1}/${imageResizeItems.length}: ${item.name}`);
      const result = await createImageResizeBlob(item, safeFormat, options, targetBytes);
      downloadBlob(result.blob, formatImageResizeFileName(item.name, options.suffix, safeFormat));
      await waitForImagePdfDownloadQueue();
    }

    const targetNote = safeFormat === "png" && targetBytes ? " PNG keeps browser lossless output." : "";
    setImageResizeStatus(`${imageResizeItems.length} ${safeFormat.toUpperCase()} file${imageResizeItems.length === 1 ? "" : "s"} downloaded.${targetNote}`);
  } catch (error) {
    setImageResizeStatus(error?.message || "Images could not be resized.");
  } finally {
    setImageResizeBusy(false);
  }
}

async function createImageResizeBlob(item, format, options, targetBytes = 0) {
  const image = await loadImageElement(item.url);
  const dimensions = getImageResizeOutputPixels(item, options);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d", { alpha: format !== "jpg" });
  if (!context) throw new Error("Canvas is not available.");

  if (format === "jpg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, dimensions.width, dimensions.height);
  } else {
    context.clearRect(0, 0, dimensions.width, dimensions.height);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

  const mimeType = imageResizeFormatMime(format);
  if (targetBytes > 0 && format !== "png") {
    return createTargetedImageResizeBlob(canvas, mimeType, options.quality / 100, targetBytes, dimensions);
  }

  const blob = await canvasToImageBlob(canvas, mimeType, format === "png" ? undefined : options.quality / 100);
  return { blob, ...dimensions, quality: format === "png" ? 100 : options.quality };
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function canvasToImageBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Image export failed."));
      }
    }, mimeType, quality);
  });
}

async function createTargetedImageResizeBlob(canvas, mimeType, maxQuality, targetBytes, dimensions) {
  let low = 0.1;
  let high = clamp(maxQuality, 0.2, 1);
  let best = null;
  let bestQuality = low;
  let smallest = null;
  let smallestQuality = low;

  for (let index = 0; index < 8; index += 1) {
    const quality = (low + high) / 2;
    const blob = await canvasToImageBlob(canvas, mimeType, quality);
    if (!smallest || blob.size < smallest.size) {
      smallest = blob;
      smallestQuality = quality;
    }
    if (blob.size <= targetBytes) {
      best = blob;
      bestQuality = quality;
      low = quality;
    } else {
      high = quality;
    }
  }

  return {
    blob: best || smallest,
    ...dimensions,
    quality: Math.round((best ? bestQuality : smallestQuality) * 100),
  };
}

function normalizeImageResizeFormat(format) {
  if (format === "png" || format === "webp") return format;
  return "jpg";
}

function imageResizeFormatMime(format) {
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return "image/jpeg";
}

function getImageResizeTargetBytes(options) {
  if (!options.targetSize) return 0;
  const multiplier = options.targetUnit === "mb" ? 1024 * 1024 : 1024;
  return Math.max(0, Math.round(options.targetSize * multiplier));
}

function formatImageResizeFileName(name, suffix, format) {
  const base = stripImageResizeExtension(name) || "image";
  const cleanSuffix = sanitizePdfFilename(suffix || "resized");
  const cleanBase = sanitizePdfFilename(base);
  const extension = format === "jpg" ? "jpg" : format;
  return `${cleanBase}${cleanSuffix ? `-${cleanSuffix}` : ""}.${extension}`;
}

function stripImageResizeExtension(name) {
  return String(name || "").replace(/\.[a-z0-9]+$/i, "");
}

function setImageResizeBusy(isBusy) {
  const root = app.querySelector("[data-image-resize-tool]");
  root?.querySelectorAll("button, input, select").forEach((node) => {
    if (node.matches("[data-image-resize-file]")) return;
    node.disabled = isBusy;
  });
}

function setImageResizeStatus(message) {
  const status = app.querySelector("[data-image-resize-status]");
  if (!status) return;
  const summary = status.closest(".image-resize-summary");
  const text = String(message || "").trim();
  status.textContent = text;
  if (summary) summary.hidden = !text;
}

function createImagePdfId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `image-pdf-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function sanitizePdfFilename(value) {
  const cleaned = String(value || "image-to-pdf")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "image-to-pdf";
}

function formatBytes(bytes) {
  const number = Number(bytes) || 0;
  if (number < 1024) return `${number} B`;
  if (number < 1024 * 1024) return `${Math.round(number / 102.4) / 10} KB`;
  return `${Math.round(number / 1024 / 102.4) / 10} MB`;
}

function handleAction(event) {
  const node = event.target.closest("[data-action]");
  if (!node) return;
  const action = node.dataset.action;
  if (action === "switch-mode") {
    recordUndo();
    state.mode = normalizeAppMode(node.dataset.mode);
    if (state.mode === "math-figures") {
      state.input = "";
      state.activeFigureTool = state.activeFigureTool || "blank-canvas";
      state.visualOverride = renderDrawingSurface();
    } else if (state.mode === "image-tools") {
      state.input = "";
      state.visualOverride = "";
      state.activeFigureTool = "";
      state.activeDrawTool = "";
      state.selectedDrawingId = "";
      state.cropMode = false;
    } else {
      state.visualOverride = "";
      state.activeFigureTool = "";
      state.activeDrawTool = "";
      state.selectedDrawingId = "";
      state.cropMode = false;
    }
    render();
    return;
  }
  if (action === "select-image-tool") {
    state.imageToolMode = normalizeImageToolMode(node.dataset.imageTool);
    render();
    return;
  }
  if (action === "smart-clean") {
    smartCleanEditorInput();
    return;
  }
  if (action === "fix-brackets") {
    fixEditorBrackets();
    return;
  }
  if (action === "undo-state") {
    undoState();
    return;
  }
  if (action === "redo-state") {
    redoState();
    return;
  }
  if (action === "copy-svg") {
    copyText(createCanvasExportSvg());
    return;
  }
  if (action === "copy-png") {
    exportCanvasPng({ copy: true });
    return;
  }
  if (action === "download-png") {
    exportCanvasPng({ copy: false });
    return;
  }
  if (action === "print-pdf") {
    window.print();
    return;
  }
  if (action === "load-sample") {
    recordUndo();
    const sample = branches.samples.samples.find((item) => item.id === node.dataset.sampleId);
    if (sample) state.input = sample.latex;
    state.visualOverride = "";
    clearDrawingState();
  }
  if (action === "insert-tool") {
    recordUndo();
    insertTool(node.dataset.toolId);
  }
  if (action === "draw-figure") {
    recordUndo();
    selectFigureTool(node.dataset.toolId);
  }
  if (action === "author-chapter") {
    recordUndo();
    insertChapterStarter(node.dataset.chapterId);
  }
  if (action === "insert-snippet") {
    recordUndo();
    insertEquationSnippet(node.dataset.snippetId);
  }
  if (action === "draw-manual") {
    recordUndo();
    drawManualTool(node.dataset.drawTool);
  }
  if (action === "insert-label-text") {
    recordUndo();
    insertPlainLabelText();
  }
  if (action === "copy-latex") {
    copyText(renderMathMl(state.input).normalized);
    return;
  }
  if (action === "copy-mathml") {
    copyText(state.visualOverride || renderMathMl(state.input).mathMl);
    return;
  }
  if (action === "reset") {
    recordUndo();
    state = createDefaultState();
  }
  if (action === "rebuild-preview") {
    recordUndo();
    state.visualOverride = "";
    clearDrawingState();
  }
  if (action === "print") {
    window.print();
    return;
  }
  render();
}

function handleBinding(event) {
  const input = event.target;
  const key = input.dataset.bind;
  if (!key) return;

  const selectedText = findSelectedPlainTextDrawing();
  if (selectedText && key === "fontSize") {
    recordUndo();
    selectedText.fontSize = clamp(Number(input.value), branches.preview.minFontSize, branches.preview.maxFontSize);
    state.fontSize = selectedText.fontSize;
    commitDrawingSurface({ rerender: true });
    return;
  }

  recordUndo();
  if (input.type === "range" || input.type === "number") {
    state[key] = normalizeNumericBinding(key, Number(input.value));
  } else {
    state[key] = input.value;
  }
  if (key === "input") {
    state.visualOverride = "";
    state.activeFigureTool = "";
    clearDrawingState();
    updateInputOutputInline();
    saveState(state);
    return;
  }
  if (["labelPosition", "manualAlignment"].includes(key) && state.activeDrawTool) {
    state.visualOverride = renderManualFigure(state.activeDrawTool);
  }
  render();
}

function handleEquationInputKeydown(event) {
  if (event.key !== "Enter") return;

  const input = event.currentTarget;
  const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
  const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
  const nextValue = `${input.value.slice(0, start)}\n${input.value.slice(end)}`;
  const nextCursor = start + 1;

  event.preventDefault();
  recordUndo();
  input.value = nextValue;
  input.setSelectionRange(nextCursor, nextCursor);

  state.input = nextValue;
  state.visualOverride = "";
  state.activeFigureTool = "";
  clearDrawingState();
  updateInputOutputInline();
  saveState(state);
}

function handleEquationPaste(event) {
  const pasted = event.clipboardData?.getData("text/plain");
  if (!pasted) return;

  event.preventDefault();
  recordUndo();
  insertIntoEquationInput(smartCleanMathInput(pasted), { source: "paste" });
}

function insertIntoEquationInput(rawText, options = {}) {
  const textarea = app.querySelector(".equation-input[data-bind='input']");
  const current = state.input || "";
  const start = Number.isInteger(textarea?.selectionStart) ? textarea.selectionStart : current.length;
  const end = Number.isInteger(textarea?.selectionEnd) ? textarea.selectionEnd : start;
  const markerIndex = rawText.indexOf("|");
  const insertText = rawText.replace("|", "");
  const insertion = buildEquationInsertion(current, start, end, insertText, markerIndex, options);
  const nextValue = insertion.value;
  const nextCursor = insertion.cursor;

  state.input = nextValue;
  state.visualOverride = "";
  state.activeFigureTool = "";
  clearDrawingState();

  if (textarea) {
    textarea.value = nextValue;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(nextCursor, nextCursor);
  }

  updateInputOutputInline();
  saveState(state);
}

function buildEquationInsertion(current, start, end, insertText, markerIndex, options = {}) {
  const cursorOffset = markerIndex >= 0 ? markerIndex : insertText.length;
  const isPaste = options.source === "paste";
  const isCollapsedSelection = start === end;
  const shouldCreateBlock = isPaste && markerIndex < 0 && isCollapsedSelection && current.trim() && looksLikeCompleteEquation(insertText);

  if (!shouldCreateBlock) {
    return {
      value: `${current.slice(0, start)}${insertText}${current.slice(end)}`,
      cursor: start + cursorOffset,
    };
  }

  const trimmedInsert = insertText.trim();
  const before = current.slice(0, start).replace(/[ \t\r\n]+$/g, "");
  const after = current.slice(end).replace(/^[ \t\r\n]+/g, "");
  const prefix = before ? "\n\n" : "";
  const suffix = after ? "\n\n" : "";
  const value = `${before}${prefix}${trimmedInsert}${suffix}${after}`;

  return {
    value,
    cursor: `${before}${prefix}${trimmedInsert}`.length,
  };
}

function looksLikeCompleteEquation(value = "") {
  const text = String(value).trim();
  return text.length >= 18 && /\\(?:left|frac|sqrt|begin)|=|\?/.test(text);
}

function smartCleanEditorInput() {
  const cleaned = smartCleanMathInput(state.input);
  if (cleaned === state.input) return;

  recordUndo();
  applyEquationInputValue(cleaned);
}

function fixEditorBrackets() {
  const diagnostics = getEquationDiagnostics(state.input);
  if (!diagnostics.canFix) return;

  const fixed = autoFixEquationInput(state.input);
  if (fixed === state.input) return;

  recordUndo();
  applyEquationInputValue(fixed);
}

function applyEquationInputValue(value) {
  const textarea = app.querySelector(".equation-input[data-bind='input']");
  state.input = value;
  state.visualOverride = "";
  state.activeFigureTool = "";
  clearDrawingState();

  if (textarea) {
    textarea.value = value;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(value.length, value.length);
  }

  updateInputOutputInline();
  saveState(state);
}

function updateInputOutputInline() {
  const rendered = renderMathMl(state.input);
  const diagnostics = getEquationDiagnostics(state.input);
  const badge = app.querySelector(".editor-panel .badge");
  const cleanOutput = app.querySelector(".clean-output");
  const canvas = app.querySelector(".equation-canvas");
  const preview = app.querySelector(".equation-render");

  if (badge) badge.textContent = `${rendered.normalized.length} chars`;
  if (cleanOutput) cleanOutput.value = rendered.normalized;
  updateEquationStatusInline(diagnostics);
  if (canvas) canvas.classList.remove("has-drawing-surface");
  if (preview) {
    preview.innerHTML = rendered.mathMl;
    preview.dataset.baseFontSize = String(state.fontSize);
  }

  requestAnimationFrame(fitEquationPreview);
}

function updateEquationStatusInline(diagnostics) {
  const status = app.querySelector("[data-equation-status]");
  if (!status) return;

  const title = status.querySelector("[data-equation-status-title]");
  const message = status.querySelector("[data-equation-status-message]");
  const fixButton = status.querySelector("[data-equation-status-fix]");
  status.className = `equation-status is-${diagnostics.level}`;
  if (title) title.textContent = diagnostics.title;
  if (message) message.textContent = diagnostics.message;
  if (fixButton) {
    fixButton.classList.toggle("is-hidden", !diagnostics.canFix);
    fixButton.disabled = !diagnostics.canFix;
  }
  app.querySelectorAll("[data-action='fix-brackets']").forEach((button) => {
    button.classList.toggle("is-disabled", !diagnostics.canFix);
    button.disabled = !diagnostics.canFix;
  });
}

function handleVisualEdit(event) {
  recordUndo();
  state.visualOverride = event.currentTarget.innerHTML;
  saveState(state);
}

function handleCanvasCopy(event) {
  const editor = event.currentTarget;
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.isCollapsed || !isSelectionInsideNode(selection, editor)) return;

  event.preventDefault();
  writeCanvasSelectionToClipboard(event.clipboardData, selection);
}

function handleCanvasCut(event) {
  const editor = event.currentTarget;
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.isCollapsed || !isSelectionInsideNode(selection, editor)) return;

  event.preventDefault();
  recordUndo();
  writeCanvasSelectionToClipboard(event.clipboardData, selection);
  selection.deleteFromDocument();
  state.visualOverride = editor.innerHTML;
  saveState(state);
  requestAnimationFrame(fitEquationPreview);
}

function handleCanvasPaste(event) {
  const editor = event.currentTarget;
  const text = event.clipboardData?.getData("text/plain") || "";
  const html = event.clipboardData?.getData("text/html") || "";
  if (!text && !html) return;

  event.preventDefault();
  recordUndo();
  ensureCanvasSelection(editor);

  if (isCanvasCopyHtml(html)) {
    insertHtmlAtCanvasSelection(sanitizeCanvasPasteHtml(html), editor);
  } else if (shouldRenderCanvasLatex(text)) {
    const cleaned = smartCleanMathInput(text);
    insertHtmlAtCanvasSelection(renderMathMl(cleaned).mathMl, editor);
  } else {
    insertTextAtCanvasSelection(text, editor);
  }

  state.visualOverride = editor.innerHTML;
  saveState(state);
  requestAnimationFrame(fitEquationPreview);
}

function writeCanvasSelectionToClipboard(clipboardData, selection) {
  if (!clipboardData || !selection.rangeCount) return;

  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-equation-canvas-copy", "true");
  wrapper.append(selection.getRangeAt(0).cloneContents());
  const html = sanitizeCanvasPasteHtml(wrapper.outerHTML);
  clipboardData.setData("text/html", html);
  clipboardData.setData("text/plain", selection.toString());
}

function isCanvasCopyHtml(html = "") {
  return /data-equation-canvas-copy|<math[\s>]|class=["'][^"']*(?:solution-layout|equation-render)/i.test(String(html));
}

function shouldRenderCanvasLatex(text = "") {
  const cleaned = smartCleanMathInput(text);
  if (!cleaned || cleaned.length < 2) return false;
  return /\\(?:frac|sqrt|left|right|begin|sum|int|lim|sin|cos|tan|sec|csc|cot)|\$\$|\\\[|[_^{}]/.test(cleaned);
}

function sanitizeCanvasPasteHtml(html = "") {
  const template = document.createElement("template");
  template.innerHTML = String(html);
  template.content.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value || "";
      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        name === "contenteditable" ||
        name === "data-visual-edit" ||
        name === "data-equation-edit-canvas" ||
        (name === "href" && /^\s*javascript:/i.test(value))
      ) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  const copied = template.content.querySelector("[data-equation-canvas-copy]");
  return copied ? copied.innerHTML : template.innerHTML;
}

function ensureCanvasSelection(editor) {
  const selection = window.getSelection();
  if (selection?.rangeCount && isSelectionInsideNode(selection, editor)) return;

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
  editor.focus({ preventScroll: true });
}

function insertHtmlAtCanvasSelection(html, editor) {
  ensureCanvasSelection(editor);
  if (document.queryCommandSupported?.("insertHTML")) {
    document.execCommand("insertHTML", false, html);
    return;
  }

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const template = document.createElement("template");
  template.innerHTML = html;
  const fragment = template.content;
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);
  if (lastNode) placeCaretAfterNode(lastNode, editor);
}

function insertTextAtCanvasSelection(text, editor) {
  ensureCanvasSelection(editor);
  if (document.queryCommandSupported?.("insertText")) {
    document.execCommand("insertText", false, text);
    return;
  }

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  placeCaretAfterNode(node, editor);
}

function placeCaretAfterNode(node, editor) {
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  editor.focus({ preventScroll: true });
}

function isSelectionInsideNode(selection, node) {
  if (!selection || !selection.rangeCount || !node) return false;
  const range = selection.getRangeAt(0);
  return node.contains(range.commonAncestorContainer);
}

function handleEditorCommand(event) {
  event.preventDefault();
  const command = event.currentTarget.dataset.editorCommand;
  const selectedText = findSelectedPlainTextDrawing();

  if (command === "font-size-decrease" || command === "font-size-increase") {
    const direction = command === "font-size-increase" ? 1 : -1;
    recordUndo();
    if (selectedText) {
      selectedText.fontSize = clamp(Number(selectedText.fontSize || state.fontSize) + direction, branches.preview.minFontSize, branches.preview.maxFontSize);
      state.fontSize = selectedText.fontSize;
      commitDrawingSurface({ rerender: true });
      return;
    }
    state.fontSize = clamp(state.fontSize + direction, branches.preview.minFontSize, branches.preview.maxFontSize);
    render();
    return;
  }

  if (selectedText && ["bold", "italic", "underline", "removeFormat"].includes(command)) {
    recordUndo();
    if (command === "bold") selectedText.bold = !selectedText.bold;
    if (command === "italic") selectedText.italic = !selectedText.italic;
    if (command === "underline") selectedText.underline = !selectedText.underline;
    if (command === "removeFormat") {
      selectedText.fontFamily = branches.preview.defaultFontFamily;
      selectedText.fontSize = branches.preview.defaultFontSize;
      selectedText.textColor = branches.preview.defaultTextColor;
      selectedText.bold = false;
      selectedText.italic = false;
      selectedText.underline = false;
      state.fontFamily = selectedText.fontFamily;
      state.fontSize = selectedText.fontSize;
      state.textColor = selectedText.textColor;
    }
    commitDrawingSurface({ rerender: true });
    return;
  }

  focusPreviewEditor();
  recordUndo();

  if (command === "create-link") {
    const url = window.prompt("Link URL");
    if (url) document.execCommand("createLink", false, url);
    persistVisualEdit();
    return;
  }

  if (command === "insert-image") {
    const url = window.prompt("Image URL");
    if (url) document.execCommand("insertImage", false, url);
    persistVisualEdit();
    return;
  }

  if (command === "insert-comment") {
    document.execCommand("backColor", false, state.highlightColor || branches.preview.defaultHighlightColor);
    persistVisualEdit();
    return;
  }

  document.execCommand(command, false, null);
  persistVisualEdit();
}

function handleEditorInsert(event) {
  event.preventDefault();
  const text = event.currentTarget.dataset.editorInsert || "";
  if (!text) return;

  recordUndo();
  insertIntoEquationInput(text);
}

function handleEditorTemplate(event) {
  event.preventDefault();
  const text = event.currentTarget.dataset.editorTemplate || "";
  if (!text) return;

  recordUndo();
  insertIntoEquationInput(text);
}

function handleToolbarSelect(event) {
  const key = event.currentTarget.dataset.toolbarSelect;
  const value = event.currentTarget.value;
  const selectedText = findSelectedPlainTextDrawing();

  if (key === "fontFamily") {
    recordUndo();
    if (selectedText) {
      selectedText.fontFamily = value;
      state.fontFamily = value;
      commitDrawingSurface({ rerender: true });
      return;
    }
    state.fontFamily = value;
    focusPreviewEditor();
    document.execCommand("fontName", false, value);
    persistVisualEdit();
    render();
    return;
  }

  if (key === "alignment") {
    recordUndo();
    state.alignment = "left";
    render();
    return;
  }

  if (key === "lineHeight") {
    recordUndo();
    state.lineHeight = Number(value);
    render();
    return;
  }

  if (key === "pagePreset") {
    recordUndo();
    state.pagePreset = ["auto", "a4", "wide", "square"].includes(value) ? value : "auto";
    render();
  }
}

function handleToolbarColor(event) {
  const key = event.currentTarget.dataset.toolbarColor;
  const value = event.currentTarget.value;
  const selectedText = findSelectedPlainTextDrawing();

  recordUndo();
  if (selectedText && key === "textColor") {
    selectedText.textColor = sanitizeHexColor(value, branches.preview.defaultTextColor);
    state.textColor = selectedText.textColor;
    commitDrawingSurface({ rerender: true });
    return;
  }

  state[key] = value;

  focusPreviewEditor();
  if (key === "textColor") {
    document.execCommand("foreColor", false, value);
  }
  if (key === "highlightColor") {
    document.execCommand("backColor", false, value);
  }
  persistVisualEdit();
}

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

function focusPreviewEditor() {
  const editor = app.querySelector(".equation-render");
  if (!editor) return null;
  editor.focus({ preventScroll: true });
  return editor;
}

function handleEquationCanvasClick(event) {
  if (event.target.closest("[data-visual-edit]")) return;
  focusPreviewEditor();
}

function handleEquationCanvasWheel(event) {
  if (!event.ctrlKey) return;

  event.preventDefault();
  event.stopPropagation();

  const direction = event.deltaY > 0 ? -1 : 1;
  const step = event.shiftKey ? 2 : 6;
  const currentZoom = Number.isFinite(Number(state.pageZoom)) ? Number(state.pageZoom) : 100;
  const nextZoom = clamp(currentZoom + direction * step, 40, 220);
  if (nextZoom === currentZoom) return;

  state.pageZoom = nextZoom;
  app.querySelectorAll(".equation-canvas").forEach((canvas) => {
    canvas.style.setProperty("--page-zoom", String(nextZoom / 100));
  });
  saveState(state);
}

function persistVisualEdit() {
  const editor = app.querySelector(".equation-render");
  if (!editor) return;
  state.visualOverride = editor.innerHTML;
  saveState(state);
  requestAnimationFrame(fitEquationPreview);
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

function insertChapterStarter(chapterId) {
  const chapter = (branches.tools.authoring?.chapters || []).find((item) => item.id === chapterId);
  if (!chapter) return;

  state.input = chapter.latex || "";
  state.visualOverride = "";
  clearDrawingState();
  state.activeChapterId = chapter.id;
  state.activeDrawTool = "";
}

function insertEquationSnippet(snippetId) {
  const snippet = (branches.tools.authoring?.equationSnippets || []).find((item) => item.id === snippetId);
  if (!snippet) return;

  const textarea = app.querySelector("[data-bind='input']");
  const current = state.input || "";
  const start = Number.isInteger(textarea?.selectionStart) ? textarea.selectionStart : current.length;
  const end = Number.isInteger(textarea?.selectionEnd) ? textarea.selectionEnd : start;
  const needsSpaceBefore = start > 0 && current[start - 1] && !/\s/.test(current[start - 1]);
  const insertText = `${needsSpaceBefore ? " " : ""}${snippet.latex}`;

  state.input = `${current.slice(0, start)}${insertText}${current.slice(end)}`;
  state.visualOverride = "";
  clearDrawingState();
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

function recordUndo() {
  const snapshot = snapshotState();
  const previous = undoStack[undoStack.length - 1];
  if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) return;

  undoStack.push(snapshot);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
}

function undoState() {
  const previous = undoStack.pop();
  if (!previous) return;

  redoStack.push(snapshotState());
  state = hydrateSnapshot(previous);
  render();
}

function redoState() {
  const next = redoStack.pop();
  if (!next) return;

  undoStack.push(snapshotState());
  state = hydrateSnapshot(next);
  render();
}

function snapshotState() {
  return structuredClone(state);
}

function hydrateSnapshot(snapshot) {
  return {
    ...createDefaultState(),
    ...structuredClone(snapshot),
    columns: normalizeColumnSizes(snapshot.columns),
  };
}

function normalizeNumericBinding(key, value) {
  if (key === "pageMargin") return clamp(value, 8, 96);
  if (key === "pageZoom") return clamp(value, 50, 160);
  if (key === "fontSize") return clamp(value, branches.preview.minFontSize, branches.preview.maxFontSize);
  return value;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sanitizeHexColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
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

function fitEquationPreview() {
  const canvas = app.querySelector(".equation-canvas");
  const render = app.querySelector(".equation-render");
  const math = app.querySelector(".equation-render math");
  const content = math || render?.firstElementChild;
  if (!canvas || !render || !content) return;

  const baseSize = Number(render.dataset.baseFontSize || state.fontSize || 38);
  render.style.fontSize = `${baseSize}px`;

  const canvasBox = canvas.getBoundingClientRect();
  const contentBoxes = [content, ...render.querySelectorAll("math")]
    .map((node) => node.getBoundingClientRect())
    .filter((box) => box.width > 0 || box.height > 0);
  const contentWidth = Math.max(render.scrollWidth, ...contentBoxes.map((box) => box.width));
  const contentHeight = Math.max(render.scrollHeight, ...contentBoxes.map((box) => box.height));
  const availableWidth = Math.max(120, canvasBox.width - 58);
  const availableHeight = Math.max(80, canvasBox.height - 46);
  const widthScale = contentWidth > 0 ? availableWidth / contentWidth : 1;
  const heightScale = contentHeight > 0 ? availableHeight / contentHeight : 1;
  const scale = Math.min(1, widthScale, heightScale);

  if (scale < 1) {
    render.style.fontSize = `${Math.max(16, Math.floor(baseSize * scale))}px`;
  }
}
