// Fullscreen PowerPoint Editor Controller (Events & Actions)
import { ensurePptState, updateLiveCanvasSlide, syncCustomizerSliders } from "../pptController.js";

export function calculateAutoFitZoom(overlay) {
  let availW = 0;
  let availH = 0;

  if (overlay) {
    const viewport = overlay.querySelector(".ppt-fs-stage-viewport");
    if (viewport && viewport.clientWidth > 0 && viewport.clientHeight > 0) {
      availW = viewport.clientWidth - 40;
      availH = viewport.clientHeight - 40;
    }
  }

  if (availW <= 0 || availH <= 0) {
    const winW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const winH = typeof window !== "undefined" ? window.innerHeight : 700;
    availW = Math.max(240, winW - 220 - 40);
    availH = Math.max(160, winH - 156 - 32 - 40);
  }

  const scaleW = availW / 960;
  const scaleH = availH / 540;
  const fitScale = Math.min(scaleW, scaleH);

  return Math.max(25, Math.min(100, Math.floor(fitScale * 100)));
}

export function handleFullscreenAction(action, target, app, state, render, recordUndo, saveState) {
  ensurePptState(state);
  const ppt = state.ppt;

  switch (action) {
    case "ppt-open-fullscreen": {
      ppt.isFullscreenOpen = true;
      if (!ppt.fsActiveTab) ppt.fsActiveTab = "home";
      if (ppt.fsAutoFit !== false) {
        ppt.fsZoom = calculateAutoFitZoom(app.querySelector(".ppt-fullscreen-app-overlay"));
      }
      render();
      break;
    }

    case "ppt-close-fullscreen": {
      state.mode = "home";
      saveState(state);
      render();
      break;
    }
    case "ppt-fs-tab": {
      const tab = target.dataset.tab || "home";
      ppt.fsActiveTab = tab;
      render();
      break;
    }
    case "ppt-fs-zoom-inc": {
      ppt.fsAutoFit = false;
      ppt.fsZoom = Math.min(150, (ppt.fsZoom || 100) + 5);
      saveState(state);
      render();
      break;
    }
    case "ppt-fs-zoom-dec": {
      ppt.fsAutoFit = false;
      ppt.fsZoom = Math.max(25, (ppt.fsZoom || 100) - 5);
      saveState(state);
      render();
      break;
    }
    case "ppt-fs-zoom-reset": {
      ppt.fsAutoFit = true;
      const overlay = app.querySelector(".ppt-fullscreen-app-overlay");
      ppt.fsZoom = calculateAutoFitZoom(overlay);
      saveState(state);
      render();
      break;
    }
  }
}


export function bindFullscreenEvents(app, state, render, recordUndo, saveState) {
  const overlay = app.querySelector(".ppt-fullscreen-app-overlay");
  if (!overlay) return;

  // Auto-scroll the active selected slide thumbnail into view so Page Manager always shows the current slide
  const activeThumb = overlay.querySelector(".ppt-fs-thumb-item.is-selected");
  if (activeThumb) {
    activeThumb.scrollIntoView({ block: "nearest", behavior: "auto" });
  }

  const zoomSlider = overlay.querySelector("[data-ppt-fs-zoom]");
  if (zoomSlider) {
    zoomSlider.addEventListener("input", (e) => {
      state.ppt.fsAutoFit = false;
      state.ppt.fsZoom = Number(e.target.value);
      const scale = state.ppt.fsZoom / 100;
      const stageScaler = overlay.querySelector(".ppt-fs-stage-scaler");
      if (stageScaler) stageScaler.style.transform = `scale(${scale})`;
      const stageBox = overlay.querySelector(".ppt-fs-stage-scaler-box");
      if (stageBox) {
        stageBox.style.width = `${Math.round(960 * scale)}px`;
        stageBox.style.height = `${Math.round(540 * scale)}px`;
      }
      const label = overlay.querySelector(".ppt-fs-zoom-label");
      if (label) label.textContent = `${state.ppt.fsZoom}%`;
      saveState(state);
    });
  }

  // Window resize auto-fit updater
  if (window._pptFsResizeHandler) {
    window.removeEventListener("resize", window._pptFsResizeHandler);
  }
  window._pptFsResizeHandler = () => {
    if (state.ppt && state.ppt.fsAutoFit !== false) {
      const fitZoom = calculateAutoFitZoom(overlay);
      if (fitZoom && fitZoom !== state.ppt.fsZoom) {
        state.ppt.fsZoom = fitZoom;
        const scale = fitZoom / 100;
        const stageScaler = overlay.querySelector(".ppt-fs-stage-scaler");
        if (stageScaler) stageScaler.style.transform = `scale(${scale})`;
        const stageBox = overlay.querySelector(".ppt-fs-stage-scaler-box");
        if (stageBox) {
          stageBox.style.width = `${Math.round(960 * scale)}px`;
          stageBox.style.height = `${Math.round(540 * scale)}px`;
        }
        const label = overlay.querySelector(".ppt-fs-zoom-label");
        if (label) label.textContent = `${fitZoom}%`;
        const slider = overlay.querySelector("[data-ppt-fs-zoom]");
        if (slider) slider.value = fitZoom;
      }
    }
  };
  window.addEventListener("resize", window._pptFsResizeHandler);

  // Slide Thumbnails Pointer-Capture Drag and Drop Engine
  const thumbList = overlay.querySelector(".ppt-fs-thumbnails-list");
  if (thumbList) {
    function clearAllDropIndicators() {
      thumbList.querySelectorAll(".ppt-fs-thumb-item").forEach((el) => {
        el.classList.remove("is-dragging", "drag-over-top", "drag-over-bottom");
      });
    }

    function reorderSlide(srcIdx, destIdx) {
      if (srcIdx === destIdx || isNaN(srcIdx) || isNaN(destIdx)) return;
      if (srcIdx < 0 || srcIdx >= state.ppt.questions.length) return;
      if (destIdx < 0 || destIdx >= state.ppt.questions.length) return;

      recordUndo();
      const [movedSlide] = state.ppt.questions.splice(srcIdx, 1);
      state.ppt.questions.splice(destIdx, 0, movedSlide);
      state.ppt.activeQuestionIndex = destIdx;
      saveState(state);
      render();
    }

    const items = Array.from(thumbList.querySelectorAll(".ppt-fs-thumb-item"));

    items.forEach((item) => {
      item.addEventListener("pointerdown", (e) => {
        if (e.target.closest(".ppt-fs-thumb-actions") || e.target.closest("button")) return;
        if (e.button !== 0) return;

        const srcIdx = Number(item.dataset.slideIndex);
        if (isNaN(srcIdx)) return;

        const startX = e.clientX;
        const startY = e.clientY;
        let isDragging = false;
        let targetDropIdx = null;
        let dropIsBottom = false;

        try {
          item.setPointerCapture(e.pointerId);
        } catch (err) {}

        function onPointerMove(moveEvt) {
          const delta = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY);
          if (!isDragging && delta > 4) {
            isDragging = true;
            item.classList.add("is-dragging");
            document.body.style.cursor = "grabbing";
          }

          if (isDragging) {
            targetDropIdx = null;
            items.forEach((other) => {
              other.classList.remove("drag-over-top", "drag-over-bottom");
              const rect = other.getBoundingClientRect();
              if (moveEvt.clientY >= rect.top && moveEvt.clientY <= rect.bottom) {
                const isBottom = (moveEvt.clientY - rect.top) > (rect.height / 2);
                other.classList.toggle("drag-over-top", !isBottom);
                other.classList.toggle("drag-over-bottom", isBottom);
                targetDropIdx = Number(other.dataset.slideIndex);
                dropIsBottom = isBottom;
              }
            });
          }
        }

        function onPointerUp(upEvt) {
          item.removeEventListener("pointermove", onPointerMove);
          item.removeEventListener("pointerup", onPointerUp);
          item.removeEventListener("pointercancel", onPointerUp);
          try {
            item.releasePointerCapture(upEvt.pointerId);
          } catch (err) {}

          document.body.style.cursor = "";
          clearAllDropIndicators();

          if (isDragging) {
            if (targetDropIdx !== null && !isNaN(targetDropIdx)) {
              let destIdx = dropIsBottom ? targetDropIdx + 1 : targetDropIdx;
              if (srcIdx < destIdx) {
                destIdx -= 1;
              }
              reorderSlide(srcIdx, destIdx);
            }
          } else {
            // Normal click selection
            state.ppt.activeQuestionIndex = srcIdx;
            saveState(state);
            render();
          }
        }

        item.addEventListener("pointermove", onPointerMove);
        item.addEventListener("pointerup", onPointerUp);
        item.addEventListener("pointercancel", onPointerUp);
      });
    });
  }

  // Keyboard shortcut: Ctrl+A / Cmd+A to select all boxes on the active slide canvas
  overlay.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.isContentEditable ||
        activeEl.getAttribute("contenteditable") === "true"
      );
      if (!isTyping) {
        e.preventDefault();
        const boxes = overlay.querySelectorAll(".canva-transform-box");
        boxes.forEach((b) => b.classList.add("is-selected"));
      }
    }
  });
}
