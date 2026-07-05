const POINTS_PER_INCH = 72;
const MM_TO_POINTS = POINTS_PER_INCH / 25.4;
const OUTPUT_DPI_BY_COMPRESSION = {
  high: 168,
  balanced: 144,
  small: 108,
};

const STANDARD_PAGES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  square: { width: 720, height: 720 },
};

export async function createImagePdfBlob(items, options = {}, onProgress = () => {}) {
  if (!items.length) {
    throw new Error("Add at least one image.");
  }

  const pages = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    onProgress({ index, total: items.length, label: item.name || `Image ${index + 1}` });
    const image = await loadImage(item.url);
    const rotation = normalizeRotation(item.rotation || 0);
    const page = resolvePageSize(image, options, rotation);
    const canvas = renderImagePage(image, page, options, rotation);
    const bytes = await canvasToJpegBytes(canvas, normalizeQuality(options.quality));
    pages.push({
      width: page.width,
      height: page.height,
      imageWidth: canvas.width,
      imageHeight: canvas.height,
      bytes,
    });
  }

  return buildPdf(pages);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = url;
  });
}

function resolvePageSize(image, options, rotation = 0) {
  const pageSize = options.pageSize || "a4";
  const imageSize = getRotatedImageSize(image, rotation);
  if (pageSize === "image") {
    const ratio = imageSize.width / Math.max(1, imageSize.height);
    const longEdge = 841.89;
    if (ratio >= 1) {
      return { width: longEdge, height: longEdge / ratio };
    }
    return { width: longEdge * ratio, height: longEdge };
  }

  const base = STANDARD_PAGES[pageSize] || STANDARD_PAGES.a4;
  const imageIsLandscape = imageSize.width > imageSize.height;
  const forcedOrientation = options.orientation || "auto";
  const isLandscape = forcedOrientation === "landscape" || (forcedOrientation === "auto" && imageIsLandscape);
  const shortEdge = Math.min(base.width, base.height);
  const longEdge = Math.max(base.width, base.height);

  return isLandscape ? { width: longEdge, height: shortEdge } : { width: shortEdge, height: longEdge };
}

function renderImagePage(image, page, options, rotation = 0) {
  const scale = resolveOutputDpi(options.compressionMode) / POINTS_PER_INCH;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(page.width * scale));
  canvas.height = Math.max(1, Math.round(page.height * scale));

  const context = canvas.getContext("2d", { alpha: false });
  const background = sanitizeHexColor(options.background, "#ffffff");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const marginPoints = Math.max(0, Number(options.marginMm || 0)) * MM_TO_POINTS;
  const margin = Math.min(Math.round(marginPoints * scale), Math.floor(Math.min(canvas.width, canvas.height) * 0.42));
  const box = {
    x: margin,
    y: margin,
    width: Math.max(1, canvas.width - margin * 2),
    height: Math.max(1, canvas.height - margin * 2),
  };

  const fit = options.fit || "contain";
  if (fit === "stretch") {
    drawRotatedImage(context, image, box.x, box.y, box.width, box.height, rotation);
    return canvas;
  }

  const imageSize = getRotatedImageSize(image, rotation);
  const imageRatio = imageSize.width / Math.max(1, imageSize.height);
  const boxRatio = box.width / Math.max(1, box.height);
  const shouldFill = fit === "cover";
  const useWidth = shouldFill ? imageRatio < boxRatio : imageRatio > boxRatio;
  const drawWidth = useWidth ? box.width : box.height * imageRatio;
  const drawHeight = useWidth ? box.width / imageRatio : box.height;
  const x = box.x + (box.width - drawWidth) / 2;
  const y = box.y + (box.height - drawHeight) / 2;

  context.save();
  context.beginPath();
  context.rect(box.x, box.y, box.width, box.height);
  context.clip();
  drawRotatedImage(context, image, x, y, drawWidth, drawHeight, rotation);
  context.restore();
  return canvas;
}

function drawRotatedImage(context, image, x, y, width, height, rotation = 0) {
  const normalizedRotation = normalizeRotation(rotation);
  context.save();
  context.translate(x + width / 2, y + height / 2);
  context.rotate((normalizedRotation * Math.PI) / 180);

  if (normalizedRotation === 90 || normalizedRotation === 270) {
    context.drawImage(image, -height / 2, -width / 2, height, width);
  } else {
    context.drawImage(image, -width / 2, -height / 2, width, height);
  }

  context.restore();
}

function getRotatedImageSize(image, rotation = 0) {
  const normalizedRotation = normalizeRotation(rotation);
  if (normalizedRotation === 90 || normalizedRotation === 270) {
    return { width: image.naturalHeight, height: image.naturalWidth };
  }
  return { width: image.naturalWidth, height: image.naturalHeight };
}

function canvasToJpegBytes(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not prepare image page."));
        return;
      }
      blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer))).catch(reject);
    }, "image/jpeg", quality);
  });
}

function buildPdf(pages) {
  const objects = [null];
  const pageRefs = [];

  const pagesRef = reserveObject(objects);
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const imageName = `Im${index + 1}`;
    const imageRef = addObject(objects, {
      header: `<< /Type /XObject /Subtype /Image /Width ${page.imageWidth} /Height ${page.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>`,
      stream: page.bytes,
    });
    const content = asciiBytes(`q\n${formatPdfNumber(page.width)} 0 0 ${formatPdfNumber(page.height)} 0 0 cm\n/${imageName} Do\nQ`);
    const contentRef = addObject(objects, {
      header: `<< /Length ${content.length} >>`,
      stream: content,
    });
    const pageRef = addObject(
      objects,
      `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${formatPdfNumber(page.width)} ${formatPdfNumber(page.height)}] /Resources << /XObject << /${imageName} ${imageRef} 0 R >> >> /Contents ${contentRef} 0 R >>`,
    );
    pageRefs.push(pageRef);
  }

  objects[pagesRef] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;
  const catalogRef = addObject(objects, `<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

  return writePdf(objects, catalogRef);
}

function reserveObject(objects) {
  objects.push(null);
  return objects.length - 1;
}

function addObject(objects, value) {
  objects.push(value);
  return objects.length - 1;
}

function writePdf(objects, rootRef) {
  const chunks = [];
  const offsets = [0];
  let offset = 0;

  const append = (bytes) => {
    chunks.push(bytes);
    offset += bytes.length;
  };
  const appendAscii = (value) => append(asciiBytes(value));

  appendAscii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = offset;
    appendAscii(`${id} 0 obj\n`);
    const object = objects[id];
    if (typeof object === "string") {
      appendAscii(`${object}\n`);
    } else {
      appendAscii(`${object.header}\nstream\n`);
      append(object.stream);
      appendAscii("\nendstream\n");
    }
    appendAscii("endobj\n");
  }

  const xrefOffset = offset;
  appendAscii(`xref\n0 ${objects.length}\n`);
  appendAscii("0000000000 65535 f \n");
  for (let id = 1; id < objects.length; id += 1) {
    appendAscii(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  appendAscii(`trailer\n<< /Size ${objects.length} /Root ${rootRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return new Blob(chunks, { type: "application/pdf" });
}

function asciiBytes(value) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function formatPdfNumber(value) {
  return Number(value).toFixed(3).replace(/\.?0+$/, "");
}

function normalizeQuality(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.92;
  return Math.min(Math.max(number, 60), 100) / 100;
}

function normalizeRotation(value) {
  return ((Math.round(Number(value || 0) / 90) * 90) % 360 + 360) % 360;
}

function resolveOutputDpi(compressionMode) {
  return OUTPUT_DPI_BY_COMPRESSION[compressionMode] || OUTPUT_DPI_BY_COMPRESSION.balanced;
}

function sanitizeHexColor(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? value : fallback;
}
