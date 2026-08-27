// Client-Side Image Tools & Background Removal Engine
import { getQuestionImages } from "../pptUI.js";

/**
 * Removes white or solid background from a slide image using Canvas pixel analysis
 */
export function removeImageBackground(dataUrl, tolerance = 35) {
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

      // Sample the top-left background color
      const bgR = d[0];
      const bgG = d[1];
      const bgB = d[2];
      const isNearWhite = bgR > 215 && bgG > 215 && bgB > 215;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        const diff = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        if (diff < tolerance || (isNearWhite && r > 225 && g > 225 && b > 225)) {
          d[i + 3] = 0; // Transparent
        } else if (diff < tolerance + 15) {
          // Feather edges
          const alphaFactor = (diff - tolerance) / 15;
          d[i + 3] = Math.round(d[i + 3] * alphaFactor);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const res = canvas.toDataURL("image/png");
      resolve(res);
    };
    img.src = dataUrl;
  });
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
