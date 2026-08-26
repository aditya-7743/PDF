// Fullscreen PowerPoint Editor Controller (Events & Actions)
import { ensurePptState, updateLiveCanvasSlide, syncCustomizerSliders } from "../pptController.js";

function calculateAutoFitZoom(app) {
  return 100;
}

export function handleFullscreenAction(action, target, app, state, render, recordUndo, saveState) {
  ensurePptState(state);
  const ppt = state.ppt;

  switch (action) {
    case "ppt-open-fullscreen": {
      ppt.isFullscreenOpen = true;
      if (!ppt.fsActiveTab) ppt.fsActiveTab = "home";
      if (!ppt.fsZoom) ppt.fsZoom = 100;
      render();
      break;
    }

    case "ppt-close-fullscreen": {
      ppt.isFullscreenOpen = false;
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
      ppt.fsZoom = Math.min(150, (ppt.fsZoom || 100) + 10);
      render();
      break;
    }
    case "ppt-fs-zoom-dec": {
      ppt.fsZoom = Math.max(50, (ppt.fsZoom || 100) - 10);
      render();
      break;
    }
    case "ppt-fs-zoom-reset": {
      ppt.fsZoom = 100;
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
      state.ppt.fsZoom = Number(e.target.value);
      const stageScaler = overlay.querySelector(".ppt-fs-stage-scaler");
      if (stageScaler) stageScaler.style.transform = `scale(${state.ppt.fsZoom / 100})`;
      const label = overlay.querySelector(".ppt-fs-zoom-label");
      if (label) label.textContent = `${state.ppt.fsZoom}%`;
      saveState(state);
    });
  }

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
