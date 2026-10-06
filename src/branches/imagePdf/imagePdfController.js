// Image to PDF Branch Controller
import { createImagePdfBlob } from "../../core/imagePdf.js?v=gemini-paste-clean-20260705";


const IMAGE_PDF_VIEW_MODES = ["extra-large", "large", "medium", "small", "list", "details", "tiles", "content"];
const IMAGE_PDF_DRAG_TYPE = "application/x-image-pdf-item-id";
const IMAGE_PDF_COMPRESSION_PRESETS = {
  high: { quality: 96, label: "High quality" },
  balanced: { quality: 92, label: "Balanced" },
  small: { quality: 72, label: "Small size" },
};
const IMAGE_PDF_SETTINGS_KEY = "math-original-form-builder:image-pdf-settings:v2";
const DEFAULT_IMAGE_PDF_PART_NAME_PATTERN = "{name} part {n}";
const IMAGE_PDF_CANCELLED_MESSAGE = "Operation cancelled.";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      const base64 = typeof res === "string" ? res.split(",")[1] : "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function saveBlobDirectly(blob, targetPath) {
  const res = await fetch("/api/save_file", {
    method: "POST",
    headers: {
      "X-Target-Path": encodeURIComponent(targetPath),
    },
    body: blob,
  });
  if (!res.ok) {
    throw new Error(`Failed to save file: ${res.statusText}`);
  }
  return await res.json();
}

async function previewPdfDirectly(blob, filename = "document.pdf") {
  try {
    const res = await fetch("/api/preview_pdf", {
      method: "POST",
      headers: {
        "X-Filename": encodeURIComponent(filename),
      },
      body: blob,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Direct preview_pdf failed:", e);
  }
  return null;
}

async function downloadBlob(blob, filename) {
  // Check if running in desktop app
  if (window.pywebview?.api?.choose_save_path) {
    try {
      const chooseRes = await window.pywebview.api.choose_save_path(filename);
      if (chooseRes && chooseRes.cancelled) {
        setImagePdfStatus("Save cancelled.");
        return { cancelled: true };
      }
      if (chooseRes && chooseRes.path) {
        setImagePdfStatus(`Saving ${filename}...`);
        const saveRes = await saveBlobDirectly(blob, chooseRes.path);
        if (saveRes && saveRes.success) {
          setImagePdfStatus(`Saved: ${chooseRes.filename || filename}`);
          return { success: true, path: chooseRes.path };
        }
      }
    } catch (err) {
      console.warn("Desktop native save failed, falling back to browser download:", err);
    }
  } else if (window.pywebview?.api?.save_file) {
    try {
      const base64Data = await blobToBase64(blob);
      const res = await window.pywebview.api.save_file(filename, base64Data);
      if (res && res.success) {
        setImagePdfStatus(`Saved: ${res.filename || filename}`);
        return res;
      }
      if (res && res.cancelled) {
        setImagePdfStatus("Save cancelled.");
        return res;
      }
    } catch (err) {
      console.warn("Desktop save_file failed, falling back to browser download:", err);
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let imagePdfItems = [];
let imagePdfViewMode = "large";
let imagePdfDraggingId = "";
let imagePdfPreviewUrl = "";
let imagePdfCancelRequested = false;


function bindImagePdfEvents() {
  const root = app.querySelector("[data-image-pdf-tool]");
  if (!root) return;

  const fileInput = root.querySelector("[data-image-pdf-file]");
  const dropzone = root.querySelector("[data-image-pdf-dropzone]");
  const addButtons = root.querySelectorAll("[data-image-pdf-add]");
  const pasteButtons = root.querySelectorAll("[data-image-pdf-paste]");
  const clearButtons = root.querySelectorAll("[data-image-pdf-clear]");
  const convertButton = root.querySelector("[data-image-pdf-convert]");
  const reverseButton = root.querySelector("[data-image-pdf-reverse]");
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

  addButtons.forEach((button) => button.addEventListener("click", (e) => {
    e.stopPropagation();
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
  const previewAllButton = root.querySelector("[data-image-pdf-preview-all]");
  previewAllButton?.addEventListener("click", previewFullImagePdf);
  reverseButton?.addEventListener("click", reverseImagePdfQueue);
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


function hasImagePdfDraggedFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}


function setImagePdfDropActive(root, dropzone, isActive) {
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

  setImagePdfStatus(`Adding ${files.length} images...`);
  const knownSignatures = new Set(imagePdfItems.map((item) => item.signature).filter(Boolean));
  let addedCount = 0;
  let duplicateCount = 0;

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const signature = createImagePdfFileSignature(file);
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

    imagePdfItems.push(item);
    addedCount += 1;
  }

  renderImagePdfQueue();
  const messages = [];
  if (addedCount) messages.push(`${addedCount} added`);
  if (duplicateCount) messages.push(`${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"} skipped`);
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


function createImagePdfFileSignature(file) {
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
    if (item && !event.target.closest("button, select, input")) {
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
  const lbImg = overlay.querySelector(".image-pdf-lightbox-image");
  if (lbImg) {
    lbImg.onload = () => {
      item.width = lbImg.naturalWidth;
      item.height = lbImg.naturalHeight;
      const subtitle = overlay.querySelector(".image-pdf-lightbox-title span");
      if (subtitle) {
        subtitle.textContent = `Original image | ${item.width} x ${item.height} px | ${formatBytes(item.size)}`;
      }
    };
  }
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


function reverseImagePdfQueue() {
  if (imagePdfItems.length < 2) {
    setImagePdfStatus("Add at least 2 images to reverse order.");
    return;
  }

  imagePdfItems.reverse();
  renderImagePdfQueue();
  setImagePdfStatus(`${imagePdfItems.length} images reversed.`);
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
    } else if (key === "pageSize") {
      node.value = "dynamic";
    } else if (key === "marginMm") {
      node.value = "0";
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
  const defaultFilename = `${sanitizePdfFilename(options.filename)}.pdf`;
  let targetSavePath = "";

  // In desktop app, immediately open native Windows Save As dialog
  if (window.pywebview?.api?.choose_save_path) {
    const chooseRes = await window.pywebview.api.choose_save_path(defaultFilename);
    if (!chooseRes || chooseRes.cancelled || !chooseRes.path) {
      setImagePdfStatus("Save cancelled.");
      return;
    }
    targetSavePath = chooseRes.path;
  }

  beginImagePdfJob("Preparing PDF...");
  setImagePdfBusy(true);
  try {
    const pdfBlob = await createImagePdfBlob(imagePdfItems, options, ({ index, total, label }) => {
      assertImagePdfNotCancelled();
      setImagePdfProgress(index + 1, total, `Preparing ${index + 1}/${total}: ${label}`);
    });
    assertImagePdfNotCancelled();
    clearImagePdfProgress();

    if (targetSavePath) {
      setImagePdfStatus(`Saving PDF...`);
      await saveBlobDirectly(pdfBlob, targetSavePath);
      setImagePdfStatus(`PDF saved: ${imagePdfItems.length} page${imagePdfItems.length === 1 ? "" : "s"}.`);
    } else {
      await downloadBlob(pdfBlob, defaultFilename);
      setImagePdfStatus(`PDF created: ${imagePdfItems.length} page${imagePdfItems.length === 1 ? "" : "s"}.`);
    }
  } catch (error) {
    clearImagePdfProgress();
    setImagePdfStatus(isImagePdfCancelError(error) ? "Cancelled." : error?.message || "PDF could not be created.");
  } finally {
    setImagePdfBusy(false);
  }
}

async function previewFullImagePdf() {
  if (!imagePdfItems.length) {
    setImagePdfStatus("Add images first.");
    return;
  }

  const options = readImagePdfOptions();
  beginImagePdfJob("Preparing preview...");
  setImagePdfBusy(true);
  try {
    const pdfBlob = await createImagePdfBlob(imagePdfItems, options, ({ index, total, label }) => {
      assertImagePdfNotCancelled();
      setImagePdfProgress(index + 1, total, `Preparing preview: ${index + 1}/${total}: ${label}`);
    });
    assertImagePdfNotCancelled();
    clearImagePdfProgress();
    await showImagePdfPreviewModal({ name: options.filename || "image-to-pdf", items: imagePdfItems }, pdfBlob);
    setImagePdfStatus(`Preview ready: ${options.filename || "image-to-pdf"}.pdf`);
  } catch (error) {
    clearImagePdfProgress();
    setImagePdfStatus(isImagePdfCancelError(error) ? "Cancelled." : error?.message || "Preview could not be created.");
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
    await showImagePdfPreviewModal(part, pdfBlob);
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
  const defaultFilename = `${sanitizePdfFilename(part.name)}.pdf`;
  let targetSavePath = "";

  if (window.pywebview?.api?.choose_save_path) {
    const chooseRes = await window.pywebview.api.choose_save_path(defaultFilename);
    if (!chooseRes || chooseRes.cancelled || !chooseRes.path) {
      setImagePdfStatus("Save cancelled.");
      return;
    }
    targetSavePath = chooseRes.path;
  }

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

    if (targetSavePath) {
      setImagePdfStatus(`Saving ${part.name}.pdf...`);
      await saveBlobDirectly(pdfBlob, targetSavePath);
      setImagePdfStatus(`Part ${part.number} saved: pages ${part.startPage}-${part.endPage}.`);
    } else {
      await downloadBlob(pdfBlob, defaultFilename);
      setImagePdfStatus(`Part ${part.number} created: pages ${part.startPage}-${part.endPage}.`);
    }
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
  let destinationFolder = "";

  // In desktop app, immediately open native Windows Folder Picker with 0ms delay!
  if (window.pywebview?.api?.choose_folder && parts.length > 1) {
    const folderRes = await window.pywebview.api.choose_folder("Select folder to save split PDFs");
    if (!folderRes || folderRes.cancelled || !folderRes.folder) {
      setImagePdfStatus("Save cancelled.");
      return;
    }
    destinationFolder = folderRes.folder;
  }

  const totalPages = parts.reduce((sum, part) => sum + part.items.length, 0);
  let completedPages = 0;
  beginImagePdfJob(`Preparing ${parts.length} PDFs...`);
  setImagePdfBusy(true);
  try {
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const pdfBlob = await createImagePdfBlob(part.items, options, ({ index, total, label }) => {
        assertImagePdfNotCancelled();
        setImagePdfProgress(completedPages + index + 1, totalPages, `Part ${part.number}/${parts.length}: ${index + 1}/${total}: ${label}`);
      });
      assertImagePdfNotCancelled();

      const partFilename = `${sanitizePdfFilename(part.name)}.pdf`;
      if (destinationFolder) {
        const fullPath = `${destinationFolder}\\${partFilename}`;
        setImagePdfStatus(`Saving part ${part.number}/${parts.length}...`);
        await saveBlobDirectly(pdfBlob, fullPath);
      } else {
        await downloadBlob(pdfBlob, partFilename);
        await waitForImagePdfDownloadQueue();
      }

      completedPages += part.items.length;
    }

    clearImagePdfProgress();
    if (destinationFolder) {
      try {
        await window.pywebview?.api?.open_path?.(destinationFolder);
      } catch {
        // ignore
      }
      setImagePdfStatus(`Saved all ${parts.length} PDFs to: ${destinationFolder}`);
    } else {
      setImagePdfStatus(`${parts.length} PDFs created.`);
    }
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
    pageSize: read("pageSize", "dynamic"),
    orientation: read("orientation", "auto"),
    fit: read("fit", "contain"),
    marginMm: clamp(Number(read("marginMm", 0)), 0, 40),
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
            <img class="image-pdf-thumb" loading="lazy" decoding="async" src="${escapeHtml(item.url)}" alt="" draggable="false" style="--image-pdf-rotation: ${rotation}deg" onload="window.onImagePdfThumbLoad?.(this, '${escapeHtml(item.id)}')" />
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

window.onImagePdfThumbLoad = function(img, id) {
  const item = imagePdfItems.find((entry) => entry.id === id);
  if (item && img.naturalWidth) {
    item.width = img.naturalWidth;
    item.height = img.naturalHeight;
    const metaEl = img.closest(".image-pdf-item")?.querySelector(".image-pdf-item-meta");
    if (metaEl) {
      metaEl.textContent = `${item.width} x ${item.height} px | ${formatBytes(item.size)}`;
    }
  }
};

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


async function showImagePdfPreviewModal(docInfo, pdfBlob) {
  closeImagePdfPreview();

  const isDesktop = Boolean(window.pywebview);

  // If running in desktop app, launch in Windows native PDF viewer immediately!
  if (isDesktop) {
    try {
      await previewPdfDirectly(pdfBlob, `${sanitizePdfFilename(docInfo.name)}.pdf`);
    } catch (e) {
      console.warn("Desktop preview_pdf failed:", e);
    }
  }

  // Display the rich in-app page-by-page preview modal
  const overlay = document.createElement("div");
  overlay.className = "image-pdf-preview-modal-overlay";
  overlay.dataset.imagePdfPreviewModal = "";
  overlay.innerHTML = `
    <div class="image-pdf-preview-dialog" role="dialog" aria-modal="true" aria-label="PDF Preview">
      <div class="image-pdf-preview-modal-head">
        <div class="image-pdf-preview-modal-title">
          <strong>${escapeHtml(docInfo.name)}.pdf</strong>
          <span>${docInfo.items.length} page${docInfo.items.length === 1 ? "" : "s"} | ${formatBytes(pdfBlob.size)}</span>
        </div>
        <div class="image-pdf-preview-modal-actions">
          ${isDesktop ? `<button class="image-pdf-btn-open-system" type="button" title="Open in Windows Default PDF Reader">Open in PDF Reader</button>` : `<button class="image-pdf-btn-open-tab" type="button" title="Open in new browser tab">Open in New Tab</button>`}
          <button class="image-pdf-btn-modal-save" type="button">Save PDF</button>
          <button class="image-pdf-preview-modal-close" type="button">Close</button>
        </div>
      </div>
      <div class="image-pdf-preview-modal-body">
        <div class="image-pdf-preview-pages">
          ${docInfo.items.map((item, idx) => `
            <div class="image-pdf-preview-page-card">
              <div class="image-pdf-preview-page-badge">Page ${idx + 1} of ${docInfo.items.length}</div>
              <div class="image-pdf-preview-page-frame">
                <img src="${escapeHtml(item.url)}" alt="Page ${idx + 1}" style="transform: rotate(${normalizeImagePdfRotation(item.rotation || 0)}deg);" />
              </div>
              <div class="image-pdf-preview-page-caption">${escapeHtml(item.name)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  overlay.querySelector(".image-pdf-btn-open-system")?.addEventListener("click", async () => {
    await previewPdfDirectly(pdfBlob, `${sanitizePdfFilename(docInfo.name)}.pdf`);
  });

  overlay.querySelector(".image-pdf-btn-open-tab")?.addEventListener("click", () => {
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });

  overlay.querySelector(".image-pdf-btn-modal-save")?.addEventListener("click", async () => {
    await downloadBlob(pdfBlob, `${sanitizePdfFilename(docInfo.name)}.pdf`);
  });

  overlay.querySelector(".image-pdf-preview-modal-close")?.addEventListener("click", () => {
    closeImagePdfPreview();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeImagePdfPreview();
    }
  });

  document.body.appendChild(overlay);
  document.body.classList.add("is-image-pdf-preview-open");
}

function closeImagePdfPreview() {
  document.querySelector("[data-image-pdf-preview-modal]")?.remove();
  document.body.classList.remove("is-image-pdf-preview-open");
  if (imagePdfPreviewUrl) {
    URL.revokeObjectURL(imagePdfPreviewUrl);
    imagePdfPreviewUrl = "";
  }
}

function handleImagePdfPreviewAction(event) {
  if (event.target.closest("[data-image-pdf-preview-close]")) {
    closeImagePdfPreview();
  }
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


function formatBytes(bytes) {
  const number = Number(bytes) || 0;
  if (number < 1024) return `${number} B`;
  if (number < 1024 * 1024) return `${Math.round(number / 102.4) / 10} KB`;
  return `${Math.round(number / 1024 / 102.4) / 10} MB`;
}


export {
  bindImagePdfEvents,
  handleImagePdfPaste,
  handleImagePdfLightboxKeydown,
  extractImagePdfClipboardFiles,
  imagePdfItems,
  hasImagePdfDraggedFiles,
  normalizeImagePdfFiles,
  createImagePdfFileSignature,
  createImagePdfId,
  readImagePdfDimensions,
  waitForImagePdfDownloadQueue,
  sanitizePdfFilename,
  formatBytes,
  clamp,
  escapeHtml,
  downloadBlob,
  blobToBase64,
  saveBlobDirectly,
  previewPdfDirectly
};
