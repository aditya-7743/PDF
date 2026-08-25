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
}
