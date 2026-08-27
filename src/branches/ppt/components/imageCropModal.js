// Image Crop Modal Engine for PowerPoint Slides
import { escapeHtml } from "../fullscreen/ribbon/ribbonCommon.js";
import { getQuestionImages } from "../pptUI.js";

export function openImageCropMode(imgId, app, state, render) {
  const activeQ = state.ppt?.questions?.[state.ppt.activeQuestionIndex];
  if (!activeQ) return;
  const imgList = getQuestionImages(activeQ);
  const targetImg = imgList.find((im) => (im.id || im) === imgId) || imgList[0];
  if (!targetImg) return;

  const dataUrl = typeof targetImg === "string" ? targetImg : targetImg.dataUrl;
  if (!dataUrl) return;

  state.ppt.activeCrop = {
    imgId: targetImg.id || imgId,
    dataUrl: dataUrl,
    aspectRatio: "free" // "free", "1:1", "16:9", "4:3"
  };

  render();
}

export function renderImageCropModalHtml(state) {
  const activeCrop = state.ppt?.activeCrop;
  if (!activeCrop) return "";

  const ratio = activeCrop.aspectRatio || "free";

  return `
    <div class="ppt-crop-modal-overlay" role="dialog" aria-modal="true" aria-label="Image Crop Mode">
      <!-- Dark backdrop dimming everything except the image -->
      <div class="ppt-crop-backdrop" data-action="ppt-crop-cancel"></div>

      <div class="ppt-crop-container">
        <!-- Floating Top Action Bar -->
        <header class="ppt-crop-action-bar">
          <div class="ppt-crop-bar-left">
            <span class="ppt-crop-badge">✂️ Crop Image</span>
            <div class="ppt-crop-ratio-group">
              <button type="button" class="ppt-crop-ratio-btn ${ratio === 'free' ? 'is-active' : ''}" data-crop-ratio="free">Free</button>
              <button type="button" class="ppt-crop-ratio-btn ${ratio === '16:9' ? 'is-active' : ''}" data-crop-ratio="16:9">16:9</button>
              <button type="button" class="ppt-crop-ratio-btn ${ratio === '4:3' ? 'is-active' : ''}" data-crop-ratio="4:3">4:3</button>
              <button type="button" class="ppt-crop-ratio-btn ${ratio === '1:1' ? 'is-active' : ''}" data-crop-ratio="1:1">1:1</button>
            </div>
          </div>

          <div class="ppt-crop-bar-right">
            <button type="button" class="ppt-crop-btn-reset" data-action="ppt-crop-reset" title="Reset crop box to full image">
              ↺ Reset
            </button>
            <button type="button" class="ppt-crop-btn-cancel" data-action="ppt-crop-cancel" title="Cancel Crop (Esc)">
              ✕ Cancel
            </button>
            <button type="button" class="ppt-crop-btn-apply" data-action="ppt-crop-apply" title="Apply Crop (Enter)">
              ✓ Done (Apply)
            </button>
          </div>
        </header>

        <!-- Crop Viewport & Stage -->
        <div class="ppt-crop-stage">
          <div class="ppt-crop-viewport" id="ppt-crop-viewport">
            <img src="${activeCrop.dataUrl}" class="ppt-crop-image" id="ppt-crop-target-img" alt="Cropping Target" />
            
            <!-- Interactive Resizable Crop Frame -->
            <div class="ppt-crop-box" id="ppt-crop-box">
              <!-- 3x3 Grid Lines -->
              <div class="ppt-crop-grid">
                <div class="ppt-crop-grid-h"></div>
                <div class="ppt-crop-grid-h"></div>
                <div class="ppt-crop-grid-v"></div>
                <div class="ppt-crop-grid-v"></div>
              </div>

              <!-- 4 Corner Crop Brackets (Photoshop / Canva style) -->
              <div class="ppt-crop-handle ppt-crop-corner ppt-crop-nw" data-crop-handle="nw"></div>
              <div class="ppt-crop-handle ppt-crop-corner ppt-crop-ne" data-crop-handle="ne"></div>
              <div class="ppt-crop-handle ppt-crop-corner ppt-crop-se" data-crop-handle="se"></div>
              <div class="ppt-crop-handle ppt-crop-corner ppt-crop-sw" data-crop-handle="sw"></div>

              <!-- 4 Side Edge Handles -->
              <div class="ppt-crop-handle ppt-crop-edge ppt-crop-n" data-crop-handle="n"></div>
              <div class="ppt-crop-handle ppt-crop-edge ppt-crop-s" data-crop-handle="s"></div>
              <div class="ppt-crop-handle ppt-crop-edge ppt-crop-e" data-crop-handle="e"></div>
              <div class="ppt-crop-handle ppt-crop-edge ppt-crop-w" data-crop-handle="w"></div>
            </div>
          </div>
        </div>

        <!-- Helpful Hint -->
        <footer class="ppt-crop-footer-hint">
          Drag handles or box to crop • Press <b>Enter</b> or click <b>✓ Done</b> to finalize • Press <b>Esc</b> to cancel
        </footer>
      </div>
    </div>
  `;
}

export function initImageCropModal(app, state, recordUndo, saveState, render) {
  const overlay = app.querySelector(".ppt-crop-modal-overlay");
  if (!overlay || !state.ppt?.activeCrop) return;

  const targetImg = overlay.querySelector("#ppt-crop-target-img");
  const cropBox = overlay.querySelector("#ppt-crop-box");
  const viewport = overlay.querySelector("#ppt-crop-viewport");
  if (!targetImg || !cropBox || !viewport) return;

  let currentRatio = state.ppt.activeCrop.aspectRatio || "free";

  // Coordinates normalized relative to displayed image: { left, top, width, height } in px
  let cropState = {
    left: 0,
    top: 0,
    width: 0,
    height: 0
  };

  function updateBoxStyle() {
    cropBox.style.left = `${cropState.left}px`;
    cropBox.style.top = `${cropState.top}px`;
    cropBox.style.width = `${cropState.width}px`;
    cropBox.style.height = `${cropState.height}px`;
  }

  function initCropDimensions() {
    let imgDisplayWidth = targetImg.offsetWidth || targetImg.clientWidth || 0;
    let imgDisplayHeight = targetImg.offsetHeight || targetImg.clientHeight || 0;

    if (!imgDisplayWidth || !imgDisplayHeight) {
      const rect = targetImg.getBoundingClientRect();
      imgDisplayWidth = Math.round(rect.width);
      imgDisplayHeight = Math.round(rect.height);
    }

    if (!imgDisplayWidth || !imgDisplayHeight) {
      setTimeout(initCropDimensions, 50);
      return;
    }

    viewport.style.width = `${imgDisplayWidth}px`;
    viewport.style.height = `${imgDisplayHeight}px`;

    // Center an 85% crop box initially
    const initW = Math.max(30, Math.round(imgDisplayWidth * 0.85));
    let initH = Math.max(30, Math.round(imgDisplayHeight * 0.85));

    if (currentRatio === "1:1") {
      const minDim = Math.min(initW, initH);
      initH = minDim;
      cropState.width = minDim;
      cropState.height = minDim;
    } else if (currentRatio === "16:9") {
      cropState.width = initW;
      cropState.height = Math.round(initW * (9 / 16));
    } else if (currentRatio === "4:3") {
      cropState.width = initW;
      cropState.height = Math.round(initW * (3 / 4));
    } else {
      cropState.width = initW;
      cropState.height = initH;
    }

    cropState.left = Math.max(0, Math.round((imgDisplayWidth - cropState.width) / 2));
    cropState.top = Math.max(0, Math.round((imgDisplayHeight - cropState.height) / 2));

    updateBoxStyle();
  }

  if (targetImg.complete && targetImg.naturalWidth > 0) {
    initCropDimensions();
  } else {
    targetImg.onload = initCropDimensions;
  }
  setTimeout(initCropDimensions, 30);

  // Aspect Ratio Preset Toggles
  overlay.querySelectorAll("[data-crop-ratio]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentRatio = btn.dataset.cropRatio;
      state.ppt.activeCrop.aspectRatio = currentRatio;
      overlay.querySelectorAll("[data-crop-ratio]").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      const maxW = targetImg.offsetWidth || targetImg.clientWidth;
      const maxH = targetImg.offsetHeight || targetImg.clientHeight;

      if (currentRatio === "1:1") {
        const side = Math.min(cropState.width, cropState.height, maxW, maxH);
        cropState.width = side;
        cropState.height = side;
      } else if (currentRatio === "16:9") {
        cropState.height = Math.min(maxH, Math.round(cropState.width * (9 / 16)));
        cropState.width = Math.round(cropState.height * (16 / 9));
      } else if (currentRatio === "4:3") {
        cropState.height = Math.min(maxH, Math.round(cropState.width * (3 / 4)));
        cropState.width = Math.round(cropState.height * (4 / 3));
      }

      // Clamp inside image bounds
      cropState.left = Math.max(0, Math.min(maxW - cropState.width, cropState.left));
      cropState.top = Math.max(0, Math.min(maxH - cropState.height, cropState.top));

      updateBoxStyle();
    });
  });

  // Reset Button
  const resetBtn = overlay.querySelector('[data-action="ppt-crop-reset"]');
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      cropState.left = 0;
      cropState.top = 0;
      cropState.width = targetImg.offsetWidth || targetImg.clientWidth;
      cropState.height = targetImg.offsetHeight || targetImg.clientHeight;
      updateBoxStyle();
    });
  }

  // Cancel Button & Backdrop Click
  overlay.querySelectorAll('[data-action="ppt-crop-cancel"]').forEach((el) => {
    el.addEventListener("click", () => {
      state.ppt.activeCrop = null;
      render();
    });
  });

  // Apply Crop Button
  const applyBtn = overlay.querySelector('[data-action="ppt-crop-apply"]');
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      executeCrop();
    });
  }

  // Keyboard Shortcuts (Enter = Apply, Esc = Cancel)
  function onCropKeydown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      executeCrop();
    } else if (e.key === "Escape") {
      e.preventDefault();
      state.ppt.activeCrop = null;
      document.removeEventListener("keydown", onCropKeydown);
      render();
    }
  }
  document.addEventListener("keydown", onCropKeydown, { once: false });

  // Execute Canvas Sub-Rectangle Crop
  function executeCrop() {
    document.removeEventListener("keydown", onCropKeydown);
    const naturalW = targetImg.naturalWidth;
    const naturalH = targetImg.naturalHeight;
    const displayW = targetImg.offsetWidth || targetImg.clientWidth;
    const displayH = targetImg.offsetHeight || targetImg.clientHeight;

    if (!naturalW || !naturalH || !displayW || !displayH) {
      state.ppt.activeCrop = null;
      render();
      return;
    }

    const scaleX = naturalW / displayW;
    const scaleY = naturalH / displayH;

    const sourceX = Math.round(cropState.left * scaleX);
    const sourceY = Math.round(cropState.top * scaleY);
    const sourceW = Math.round(cropState.width * scaleX);
    const sourceH = Math.round(cropState.height * scaleY);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, sourceW);
    canvas.height = Math.max(1, sourceH);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      state.ppt.activeCrop = null;
      render();
      return;
    }

    ctx.drawImage(
      targetImg,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedDataUrl = canvas.toDataURL("image/png");

    recordUndo();

    const activeQ = state.ppt?.questions?.[state.ppt.activeQuestionIndex];
    if (activeQ) {
      const imgList = getQuestionImages(activeQ);
      const cropImgId = state.ppt.activeCrop.imgId;
      const targetImgObj = imgList.find((im) => (im.id || im) === cropImgId) || imgList[0];

      if (targetImgObj) {
        if (typeof targetImgObj === "object") {
          targetImgObj.dataUrl = croppedDataUrl;
          if (targetImgObj.width) {
            targetImgObj.height = Math.round(targetImgObj.width * (canvas.height / canvas.width));
          }
        } else {
          activeQ.image = croppedDataUrl;
        }
      }
    }

    state.ppt.activeCrop = null;
    saveState(state);
    render();
  }

  // Interactive Pointer Drag & Resize of the Crop Box
  let isDragging = false;
  let activeHandle = null;
  let startMouseX = 0;
  let startMouseY = 0;
  let initialCrop = { ...cropState };

  cropBox.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const handle = e.target.dataset.cropHandle;
    isDragging = true;
    activeHandle = handle || "move";
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    initialCrop = { ...cropState };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });

  function onPointerMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    const deltaX = e.clientX - startMouseX;
    const deltaY = e.clientY - startMouseY;

    const maxW = targetImg.offsetWidth || targetImg.clientWidth;
    const maxH = targetImg.offsetHeight || targetImg.clientHeight;
    const minSize = 30;

    if (activeHandle === "move") {
      cropState.left = Math.max(0, Math.min(maxW - initialCrop.width, initialCrop.left + deltaX));
      cropState.top = Math.max(0, Math.min(maxH - initialCrop.height, initialCrop.top + deltaY));
    } else {
      let newLeft = initialCrop.left;
      let newTop = initialCrop.top;
      let newWidth = initialCrop.width;
      let newHeight = initialCrop.height;

      // Handle East / West (Width)
      if (activeHandle.includes("e")) {
        newWidth = Math.max(minSize, Math.min(maxW - initialCrop.left, initialCrop.width + deltaX));
      } else if (activeHandle.includes("w")) {
        const potentialW = initialCrop.width - deltaX;
        if (potentialW >= minSize) {
          const shift = initialCrop.width - potentialW;
          newLeft = Math.max(0, initialCrop.left + shift);
          newWidth = initialCrop.width + (initialCrop.left - newLeft);
        }
      }

      // Handle North / South (Height)
      if (activeHandle.includes("s")) {
        newHeight = Math.max(minSize, Math.min(maxH - initialCrop.top, initialCrop.height + deltaY));
      } else if (activeHandle.includes("n")) {
        const potentialH = initialCrop.height - deltaY;
        if (potentialH >= minSize) {
          const shift = initialCrop.height - potentialH;
          newTop = Math.max(0, initialCrop.top + shift);
          newHeight = initialCrop.height + (initialCrop.top - newTop);
        }
      }

      // Aspect Ratio Lock (if not free)
      if (currentRatio === "1:1") {
        const side = Math.min(newWidth, newHeight);
        newWidth = side;
        newHeight = side;
      } else if (currentRatio === "16:9") {
        newHeight = Math.round(newWidth * (9 / 16));
      } else if (currentRatio === "4:3") {
        newHeight = Math.round(newWidth * (3 / 4));
      }

      // Clamp inside image
      if (newLeft + newWidth <= maxW && newTop + newHeight <= maxH) {
        cropState.left = newLeft;
        cropState.top = newTop;
        cropState.width = newWidth;
        cropState.height = newHeight;
      }
    }

    updateBoxStyle();
  }

  function onPointerUp() {
    isDragging = false;
    activeHandle = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }
}
