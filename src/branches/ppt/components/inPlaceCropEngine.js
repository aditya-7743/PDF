// In-Place Canva/Photoshop Slide Image Crop Engine
import { getQuestionImages } from "../pptUI.js";

export function openInPlaceCrop(imgId, app, state, render) {
  const activeQ = state.ppt?.questions?.[state.ppt.activeQuestionIndex];
  if (!activeQ) return;
  const imgList = getQuestionImages(activeQ);
  const targetImg = imgList.find((im) => (im.id || im) === imgId) || imgList[0];
  if (!targetImg) return;

  const dataUrl = typeof targetImg === "string" ? targetImg : targetImg.dataUrl;
  if (!dataUrl) return;

  const boxEl = app?.querySelector?.(`.slide-image-container[data-image-id="${targetImg.id || imgId}"]`);
  const width = targetImg.width || (boxEl ? boxEl.offsetWidth : 360);
  const height = targetImg.height || (boxEl ? boxEl.offsetHeight : 202);

  state.ppt.activeCrop = {
    imgId: targetImg.id || imgId,
    dataUrl: dataUrl,
    origWidth: width,
    origHeight: height,
    cropLeft: 0,
    cropTop: 0,
    cropRight: 0,
    cropBottom: 0
  };

  render();
}

export function initInPlaceCrop(app, state, recordUndo, saveState, render) {
  const activeCrop = state.ppt?.activeCrop;
  if (!activeCrop) return;

  const croppingBox = app.querySelector(`.slide-image-container[data-image-id="${activeCrop.imgId}"]`);
  if (!croppingBox) return;

  const cropOverlay = croppingBox.querySelector(".slide-inplace-crop-overlay");
  if (!cropOverlay) return;

  const frame = cropOverlay.querySelector(".slide-crop-active-frame");
  const clippedImg = cropOverlay.querySelector(".slide-crop-clipped-inner img");

  let isDragging = false;
  let activeHandle = null;
  let startX = 0;
  let startY = 0;
  let initialCrop = { ...activeCrop };

  function updateInPlaceCropDisplay() {
    const W = activeCrop.origWidth;
    const H = activeCrop.origHeight;

    const left = activeCrop.cropLeft || 0;
    const top = activeCrop.cropTop || 0;
    const right = activeCrop.cropRight || 0;
    const bottom = activeCrop.cropBottom || 0;

    const visibleW = Math.max(20, W - left - right);
    const visibleH = Math.max(20, H - top - bottom);

    if (frame) {
      frame.style.left = `${left}px`;
      frame.style.top = `${top}px`;
      frame.style.width = `${visibleW}px`;
      frame.style.height = `${visibleH}px`;
    }

    if (clippedImg) {
      clippedImg.style.width = `${W}px`;
      clippedImg.style.height = `${H}px`;
      clippedImg.style.transform = `translate(${-left}px, ${-top}px)`;
    }
  }

  updateInPlaceCropDisplay();

  // Pointer event handler for moving the crop frame or dragging the handles
  function onPointerDown(e, handleType) {
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    activeHandle = handleType; // "move" or "nw", "ne", "se", "sw", "n", "s", "e", "w"
    startX = e.clientX;
    startY = e.clientY;
    initialCrop = {
      cropLeft: activeCrop.cropLeft || 0,
      cropTop: activeCrop.cropTop || 0,
      cropRight: activeCrop.cropRight || 0,
      cropBottom: activeCrop.cropBottom || 0
    };

    const stageScaler = app.querySelector(".ppt-fs-stage-scaler");
    const zoomScale = stageScaler ? ((state.ppt.fsZoom || 100) / 100) : 1;

    function onPointerMove(moveEvt) {
      if (!isDragging) return;
      moveEvt.preventDefault();

      const deltaX = (moveEvt.clientX - startX) / zoomScale;
      const deltaY = (moveEvt.clientY - startY) / zoomScale;

      const maxW = activeCrop.origWidth;
      const maxH = activeCrop.origHeight;
      const minSize = 25;

      if (activeHandle === "move") {
        // Move the entire crop window inside the image bounds
        const curW = maxW - initialCrop.cropLeft - initialCrop.cropRight;
        const curH = maxH - initialCrop.cropTop - initialCrop.cropBottom;

        const newLeft = Math.max(0, Math.min(maxW - curW, Math.round(initialCrop.cropLeft + deltaX)));
        const newTop = Math.max(0, Math.min(maxH - curH, Math.round(initialCrop.cropTop + deltaY)));

        activeCrop.cropLeft = newLeft;
        activeCrop.cropRight = maxW - newLeft - curW;
        activeCrop.cropTop = newTop;
        activeCrop.cropBottom = maxH - newTop - curH;
      } else {
        // West / Left
        if (activeHandle.includes("w")) {
          const maxLeft = maxW - initialCrop.cropRight - minSize;
          activeCrop.cropLeft = Math.max(0, Math.min(maxLeft, Math.round(initialCrop.cropLeft + deltaX)));
        }
        // East / Right
        if (activeHandle.includes("e")) {
          const maxRight = maxW - initialCrop.cropLeft - minSize;
          activeCrop.cropRight = Math.max(0, Math.min(maxRight, Math.round(initialCrop.cropRight - deltaX)));
        }
        // North / Top
        if (activeHandle.includes("n")) {
          const maxTop = maxH - initialCrop.cropBottom - minSize;
          activeCrop.cropTop = Math.max(0, Math.min(maxTop, Math.round(initialCrop.cropTop + deltaY)));
        }
        // South / Bottom
        if (activeHandle.includes("s")) {
          const maxBottom = maxH - initialCrop.cropTop - minSize;
          activeCrop.cropBottom = Math.max(0, Math.min(maxBottom, Math.round(initialCrop.cropBottom - deltaY)));
        }
      }

      updateInPlaceCropDisplay();
    }

    function onPointerUp() {
      isDragging = false;
      activeHandle = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  // Bind handles
  cropOverlay.querySelectorAll("[data-inplace-crop-handle]").forEach((handle) => {
    handle.addEventListener("pointerdown", (e) => {
      onPointerDown(e, handle.dataset.inplaceCropHandle);
    });
  });

  // Bind frame move
  if (frame) {
    frame.addEventListener("pointerdown", (e) => {
      if (e.target.dataset.inplaceCropHandle) return;
      onPointerDown(e, "move");
    });
  }

  // Action Buttons (Done, Cancel, Reset)
  const doneBtn = croppingBox.querySelector('[data-action="ppt-crop-apply"]');
  if (doneBtn) {
    doneBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      finalizeInPlaceCrop(app, state, recordUndo, saveState, render);
    });
  }

  const cancelBtn = croppingBox.querySelector('[data-action="ppt-crop-cancel"]');
  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.ppt.activeCrop = null;
      render();
    });
  }

  const resetBtn = croppingBox.querySelector('[data-action="ppt-crop-reset"]');
  if (resetBtn) {
    resetBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      activeCrop.cropLeft = 0;
      activeCrop.cropTop = 0;
      activeCrop.cropRight = 0;
      activeCrop.cropBottom = 0;
      updateInPlaceCropDisplay();
    });
  }

  // Keyboard Shortcuts (Enter = Done, Esc = Cancel)
  function onCropKeydown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.removeEventListener("keydown", onCropKeydown);
      finalizeInPlaceCrop(app, state, recordUndo, saveState, render);
    } else if (e.key === "Escape") {
      e.preventDefault();
      state.ppt.activeCrop = null;
      document.removeEventListener("keydown", onCropKeydown);
      render();
    }
  }
  document.addEventListener("keydown", onCropKeydown, { once: true });

  // Click outside image commits crop (Canva behavior)
  function onClickOutside(e) {
    if (!croppingBox.contains(e.target)) {
      document.removeEventListener("pointerdown", onClickOutside);
      document.removeEventListener("keydown", onCropKeydown);
      finalizeInPlaceCrop(app, state, recordUndo, saveState, render);
    }
  }
  setTimeout(() => {
    document.addEventListener("pointerdown", onClickOutside, { once: true });
  }, 150);
}

export function finalizeInPlaceCrop(app, state, recordUndo, saveState, render) {
  const activeCrop = state.ppt?.activeCrop;
  if (!activeCrop) return;

  const activeQ = state.ppt?.questions?.[state.ppt.activeQuestionIndex];
  if (!activeQ) return;
  const imgList = getQuestionImages(activeQ);
  const targetImg = imgList.find((im) => (im.id || im) === activeCrop.imgId) || imgList[0];
  if (!targetImg) return;

  const origDataUrl = activeCrop.dataUrl;
  const left = activeCrop.cropLeft || 0;
  const top = activeCrop.cropTop || 0;
  const right = activeCrop.cropRight || 0;
  const bottom = activeCrop.cropBottom || 0;

  const origW = activeCrop.origWidth;
  const origH = activeCrop.origHeight;
  const croppedDisplayW = Math.max(20, origW - left - right);
  const croppedDisplayH = Math.max(20, origH - top - bottom);

  // If no crop change made, simply exit crop mode
  if (left === 0 && top === 0 && right === 0 && bottom === 0) {
    state.ppt.activeCrop = null;
    render();
    return;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    const scaleX = naturalW / origW;
    const scaleY = naturalH / origH;

    const sourceX = Math.round(left * scaleX);
    const sourceY = Math.round(top * scaleY);
    const sourceW = Math.round(croppedDisplayW * scaleX);
    const sourceH = Math.round(croppedDisplayH * scaleY);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, sourceW);
    canvas.height = Math.max(1, sourceH);
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);
      const newCroppedUrl = canvas.toDataURL("image/png");

      recordUndo();

      if (typeof targetImg === "object") {
        targetImg.dataUrl = newCroppedUrl;
        targetImg.posX = (targetImg.posX || 0) + left;
        targetImg.posY = (targetImg.posY || 0) + top;
        targetImg.width = croppedDisplayW;
        targetImg.height = croppedDisplayH;
      } else {
        activeQ.image = newCroppedUrl;
      }

      state.ppt.activeCrop = null;
      saveState(state);
      render();
    }
  };
  img.src = origDataUrl;
}
