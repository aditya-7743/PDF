// Image Resize Branch Controller
let imageResizeItems = [];

let imageResizeSelectedId = "";
let imageResizePreviewDrawToken = 0;


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


function setImageResizeDropActive(root, dropzone, isActive) {
  root.classList.toggle("is-dragging", isActive);
  dropzone?.classList.toggle("is-dragging", isActive);
}


function applySavedImageResizeSettings(root) {
  const settings = loadImageResizeSettings();
  root.querySelectorAll("[data-image-resize-option]").forEach((node) => {
    const key = node.dataset.imageResizeOption;
    if (!key) return;
    if (!Object.prototype.hasOwnProperty.call(settings, key)) return;
    if (node.type === "checkbox") {
      node.checked = Boolean(settings[key]);
    } else {
      node.value = settings[key];
    }
  });
}


function saveImageResizeSettings() {
  const root = app.querySelector("[data-image-resize-tool]");
  if (!root) return;

  const settings = {};
  root.querySelectorAll("[data-image-resize-option]").forEach((node) => {
    const key = node.dataset.imageResizeOption;
    if (!key) return;
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
    applyImageResizeOriginalDimensions();
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
    applyImageResizeOriginalDimensions();
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
      applyImageResizeOriginalDimensions();
    }
    ensureImageResizeSelection();
    renderImageResizeQueue();
    updateImageResizeWorkspace();
    setImageResizeStatus(`${imageResizeItems.length} image${imageResizeItems.length === 1 ? "" : "s"} ready.`);
  }
}


function handleImageResizeOptionInput(event) {
  const option = event.currentTarget.dataset.imageResizeOption;
  if (option === "width" || option === "height") {
    syncImageResizeLockedDimension(option);
  } else if (option === "unit" || option === "dpi") {
    applyImageResizeOriginalDimensions();
  } else if (option === "lockRatio") {
    syncImageResizeLockedDimension("width");
  }

  syncImageResizeLabels();
  saveImageResizeSettings();
  renderImageResizeQueue();
  updateImageResizeWorkspace();
}


function applyImageResizeOriginalDimensions() {
  const first = getSelectedImageResizeItem();
  const root = app.querySelector("[data-image-resize-tool]");
  if (!first || !root) return;

  const options = readImageResizeOptions();
  const widthInput = root.querySelector('[data-image-resize-option="width"]');
  const heightInput = root.querySelector('[data-image-resize-option="height"]');

  if (widthInput) widthInput.value = formatImageResizeUnitValue(pixelsToImageResizeUnit(first.width, options.unit, options.dpi), options.unit);
  if (heightInput) heightInput.value = formatImageResizeUnitValue(pixelsToImageResizeUnit(first.height, options.unit, options.dpi), options.unit);
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

  const quality = clamp(Math.round(Number(root.querySelector('[data-image-resize-option="quality"]')?.value || 92)), 20, 100);
  const qualityLabel = root.querySelector("[data-image-resize-quality-value]");
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
  const hasWidth = options.width > 0;
  const hasHeight = options.height > 0;
  let width = hasWidth ? imageResizeUnitToPixels(options.width, options.unit, options.dpi) : item.width;
  let height = hasHeight ? imageResizeUnitToPixels(options.height, options.unit, options.dpi) : item.height;

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
  bindImageResizeEvents,
  imageResizeItems
};
