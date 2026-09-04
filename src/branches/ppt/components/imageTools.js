// Client-Side Image Tools & Background Removal Engine
import { getQuestionImages } from "../pptUI.js";

/**
 * Removes white or solid background from a slide image using Canvas pixel analysis.
 * Safely protects all text, formulas, diagrams, and colored header banners.
 *
 * @param {string} dataUrl - Image data URL
 * @param {number|object} options - Tolerance number or options object { mode, tolerance }
 * @returns {Promise<string>} Transparent PNG data URL
 */
export function removeImageBackground(dataUrl, options = 35) {
  const opts = typeof options === "number" ? { tolerance: options, mode: "white" } : (options || { tolerance: 35, mode: "white" });
  const tolerance = opts.tolerance !== undefined ? Number(opts.tolerance) : 35;
  const mode = opts.mode || "white";

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      const w = canvas.width;
      const h = canvas.height;

      if (mode === "flood") {
        floodFillRemoveBorderBg(d, w, h, tolerance);
      } else if (mode === "math") {
        cleanMathBackground(d, w, h, tolerance);
      } else if (mode === "auto") {
        autoDetectAndRemoveBg(d, w, h, tolerance);
      } else {
        // Default: Smart White / Light background removal
        removeWhiteBackground(d, w, h, tolerance);
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

/**
 * Smart White & Light Background Removal.
 * Identifies pixels where R, G, and B are all high (white/off-white background)
 * while preserving black text, colored text, math formulas, and dark banners.
 */
function removeWhiteBackground(d, w, h, tolerance = 35) {
  // tolerance 35 -> threshold ~202 (removes 202-255 white/gray, leaves text untouched)
  const threshold = Math.max(150, Math.min(250, 255 - Math.round(tolerance * 1.5)));
  const featherRange = 16;

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 10) continue; // already transparent

    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const minChan = Math.min(r, g, b);

    if (minChan >= threshold) {
      if (minChan >= threshold + featherRange) {
        d[i + 3] = 0; // Pure transparent
      } else {
        // Smooth feathering to avoid jagged edges
        const factor = (threshold + featherRange - minChan) / featherRange;
        d[i + 3] = Math.round(a * factor);
      }
    }
  }
}

/**
 * High-Contrast Math Formula & Question Text Extractor.
 * Removes white background and boosts text/formula darkness for ultra-crisp legibility.
 */
function cleanMathBackground(d, w, h, tolerance = 40) {
  const threshold = Math.max(150, Math.min(245, 255 - Math.round(tolerance * 1.6)));

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 10) continue;

    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const minChan = Math.min(r, g, b);

    if (minChan >= threshold) {
      d[i + 3] = 0; // Remove white background
    } else {
      // Enhance stroke contrast: sharpen ink towards rich deep dark
      d[i] = Math.round(r * 0.3);
      d[i + 1] = Math.round(g * 0.3);
      d[i + 2] = Math.round(b * 0.3);
      d[i + 3] = 255;
    }
  }
}

/**
 * Flood-Fill Outer Background Removal from image perimeter inwards.
 */
function floodFillRemoveBorderBg(d, w, h, tolerance = 35) {
  // Sample perimeter colors to determine background
  let bgR = 255, bgG = 255, bgB = 255;
  const samples = [];
  for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 10))) {
    const idxTop = x * 4;
    const idxBot = ((h - 1) * w + x) * 4;
    if (d[idxTop + 3] > 10) samples.push([d[idxTop], d[idxTop + 1], d[idxTop + 2]]);
    if (d[idxBot + 3] > 10) samples.push([d[idxBot], d[idxBot + 1], d[idxBot + 2]]);
  }
  for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 10))) {
    const idxL = (y * w) * 4;
    const idxR = (y * w + (w - 1)) * 4;
    if (d[idxL + 3] > 10) samples.push([d[idxL], d[idxL + 1], d[idxL + 2]]);
    if (d[idxR + 3] > 10) samples.push([d[idxR], d[idxR + 1], d[idxR + 2]]);
  }

  if (samples.length > 0) {
    const sum = samples.reduce((acc, s) => [acc[0] + s[0], acc[1] + s[1], acc[2] + s[2]], [0, 0, 0]);
    bgR = Math.round(sum[0] / samples.length);
    bgG = Math.round(sum[1] / samples.length);
    bgB = Math.round(sum[2] / samples.length);
  }

  const visited = new Uint8Array(w * h);
  const queue = [];

  function checkAndEnqueue(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const pIdx = y * w + x;
    if (visited[pIdx]) return;
    visited[pIdx] = 1;

    const bIdx = pIdx * 4;
    if (d[bIdx + 3] < 10) {
      queue.push(x, y);
      return;
    }

    const r = d[bIdx];
    const g = d[bIdx + 1];
    const b = d[bIdx + 2];
    const diff = Math.hypot(r - bgR, g - bgG, b - bgB);

    if (diff < tolerance + 15 || (bgR > 200 && r > 210 && g > 210 && b > 210)) {
      d[bIdx + 3] = 0; // Make transparent
      queue.push(x, y);
    }
  }

  // Seed with all 4 borders
  for (let x = 0; x < w; x++) {
    checkAndEnqueue(x, 0);
    checkAndEnqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    checkAndEnqueue(0, y);
    checkAndEnqueue(w - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const qx = queue[head++];
    const qy = queue[head++];

    checkAndEnqueue(qx + 1, qy);
    checkAndEnqueue(qx - 1, qy);
    checkAndEnqueue(qx, qy + 1);
    checkAndEnqueue(qx, qy - 1);
  }
}

/**
 * Auto-detects dominant border background color and removes it safely.
 */
function autoDetectAndRemoveBg(d, w, h, tolerance = 35) {
  const corners = [
    [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
    [Math.floor(w / 2), 0], [Math.floor(w / 2), h - 1],
    [0, Math.floor(h / 2)], [w - 1, Math.floor(h / 2)]
  ];

  const validSamples = [];
  for (const [cx, cy] of corners) {
    const idx = (cy * w + cx) * 4;
    if (d[idx + 3] > 20) {
      validSamples.push([d[idx], d[idx + 1], d[idx + 2]]);
    }
  }

  if (!validSamples.length || validSamples.every(s => s[0] > 200 && s[1] > 200 && s[2] > 200)) {
    removeWhiteBackground(d, w, h, tolerance);
    return;
  }

  const [bgR, bgG, bgB] = validSamples[0];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 10) continue;
    const diff = Math.hypot(d[i] - bgR, d[i + 1] - bgG, d[i + 2] - bgB);
    if (diff < tolerance) {
      d[i + 3] = 0;
    }
  }
}

/**
 * Gets the currently selected image object or the first image of the active question
 */
export function getActiveSelectedImage(state) {
  const activeQ = state.ppt?.questions?.[state.ppt.activeQuestionIndex];
  if (!activeQ) return null;
  const imgList = getQuestionImages(activeQ);
  if (!imgList.length) return null;
  const selectedId = state.ppt.selectedImageId;
  return imgList.find((im) => (im.id || im) === selectedId) || imgList[0];
}
