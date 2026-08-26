// Multi-Quality Pixel-Perfect PDF Exporter for Question Slides
import { getSlideSettings } from "../branches/pptBranch.js";
import { renderSlideCleanExportHtml } from "../branches/ppt/fullscreen/components/slideCanvas.js";

function getQuestionImages(q) {
  if (!q) return [];
  if (Array.isArray(q.images) && q.images.length > 0) return q.images;
  if (q.image) {
    const imgObj = typeof q.image === "object" ? q.image : { id: "img_legacy", dataUrl: q.image, posX: 0, posY: 0, width: 260, height: 200 };
    if (!imgObj.id) imgObj.id = "img_legacy";
    return [imgObj];
  }
  return [];
}

export async function exportQuestionsToPdf(questions, rawSettings, qualityMode = "medium", onProgress = () => {}, options = {}) {
  if (!questions || !questions.length) {
    throw new Error("No questions to export.");
  }

  const qualityConfig = {
    low: { scale: 1.333, width: 1280, height: 720, jpegQuality: 0.65 },
    medium: { scale: 2.0, width: 1920, height: 1080, jpegQuality: 0.90 },
    compact: { scale: 2.666, width: 2560, height: 1440, jpegQuality: 0.70 },
    high: { scale: 4.0, width: 3840, height: 2160, jpegQuality: 0.96 }
  }[qualityMode] || { scale: 2.666, width: 2560, height: 1440, jpegQuality: 0.70 };

  // Determine slides to render (support selectedIndices or all questions)
  const itemsToRender = Array.isArray(options.selectedIndices) && options.selectedIndices.length > 0
    ? options.selectedIndices.filter((idx) => idx >= 0 && idx < questions.length).map((idx) => ({ q: questions[idx], originalIndex: idx }))
    : questions.map((q, idx) => ({ q, originalIndex: idx }));

  if (!itemsToRender.length) {
    throw new Error("No valid slides selected to export.");
  }

  // Create an offscreen isolated sandbox for rendering 100% exact DOM slides
  const sandbox = document.createElement("div");
  sandbox.id = "ppt-pdf-export-sandbox";
  sandbox.style.position = "fixed";
  sandbox.style.left = "-9999px";
  sandbox.style.top = "0";
  sandbox.style.width = "960px";
  sandbox.style.height = "540px";
  sandbox.style.zIndex = "-9999";
  sandbox.style.overflow = "hidden";
  sandbox.style.pointerEvents = "none";
  sandbox.style.background = "#000000";
  document.body.appendChild(sandbox);

  if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_) {}
  }

  const pages = [];

  try {
    for (let i = 0; i < itemsToRender.length; i += 1) {
      const item = itemsToRender[i];
      onProgress({ current: i + 1, total: itemsToRender.length, label: `Rendering Slide ${i + 1}/${itemsToRender.length}` });

      sandbox.innerHTML = renderSlideCleanExportHtml(item.q, item.originalIndex, rawSettings);
      const slideNode = sandbox.querySelector(".ppt-slide-canvas-wrapper") || sandbox.firstElementChild;

      // Ensure images in this slide are fully loaded
      const imgs = Array.from(sandbox.querySelectorAll("img"));
      if (imgs.length > 0) {
        await Promise.all(imgs.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }));
      }
      await new Promise((resolve) => setTimeout(resolve, 50));

      let canvas;
      if (typeof window !== "undefined" && typeof window.html2canvas === "function") {
        canvas = await window.html2canvas(slideNode, {
          scale: qualityConfig.scale,
          useCORS: true,
          allowTaint: false,
          logging: false,
          width: 960,
          height: 540,
          windowWidth: 960,
          windowHeight: 540,
          backgroundColor: null
        });
      } else {
        // Fallback to direct canvas rendering
        canvas = document.createElement("canvas");
        canvas.width = qualityConfig.width;
        canvas.height = qualityConfig.height;
        const ctx = canvas.getContext("2d");
        await renderSlideToCanvasFallback(ctx, item.q, item.originalIndex, rawSettings, qualityConfig.width, qualityConfig.height);
      }

      const jpegBytes = await canvasToJpegBytes(canvas, qualityConfig.jpegQuality);

      // Standard 16:9 PDF page size in points (e.g., 960 x 540 pt)
      pages.push({
        width: 960,
        height: 540,
        imageWidth: qualityConfig.width,
        imageHeight: qualityConfig.height,
        bytes: jpegBytes
      });
    }
  } finally {
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }

  const pdfBlob = buildPdf(pages);
  const defaultFileName = `${(rawSettings.topic || "Question_Slides").replace(/[^a-z0-9_\-]/gi, "_")}_${qualityMode.toUpperCase()}.pdf`;
  const fileName = options.customFileName ? (options.customFileName.endsWith(".pdf") ? options.customFileName : `${options.customFileName}.pdf`) : defaultFileName;
  
  if (options.returnBlob) {
    return { blob: pdfBlob, fileName, pagesCount: pages.length };
  }

  downloadBlob(pdfBlob, fileName);
  return fileName;
}

async function renderSlideToCanvasFallback(ctx, q, index, rawSettings, W, H) {
  const settings = getSlideSettings(rawSettings, q);
  const scale = W / 960;
  ctx.clearRect(0, 0, W, H);

  // Pure White Blank Slide
  if (q.layout === "blank") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);

    if (q.english) {
      ctx.fillStyle = "#1a1a1a";
      ctx.font = `bold ${Math.round(42 * scale)}px "Calibri", "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(q.english, W / 2, H * 0.4);
    }
    if (q.hindi) {
      ctx.fillStyle = "#1a1a1a";
      ctx.font = `bold ${Math.round(22 * scale)}px "Calibri", "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(q.hindi, W / 2, H * 0.6);
    }

    const images = getQuestionImages(q);
    for (const img of images) {
      const imgData = typeof img === "string" ? img : img.dataUrl;
      if (!imgData) continue;
      const imgW = (img.width || 360) * scale;
      const imgH = (img.height || 202) * scale;
      const imgX = (img.posX || 0) * scale;
      const imgY = (img.posY || 0) * scale;
      try {
        const imgObj = await loadImageAsync(imgData);
        ctx.drawImage(imgObj, imgX, imgY, imgW, imgH);
      } catch (err) {
        console.warn("Could not draw image in blank PDF slide:", err);
      }
    }
    return;
  }

  // Background
  if (settings.bgImage && typeof Image !== "undefined") {
    try {
      const bgImg = await loadImageAsync(settings.bgImage);
      ctx.drawImage(bgImg, 0, 0, W, H);
    } catch (e) {
      ctx.fillStyle = settings.slideBg || "#FFFFFF";
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    ctx.fillStyle = settings.slideBg || "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
  }

  // 1. Header Bar (Only render when showHeader is true)
  const showHeader = settings.showHeader !== false;
  const headerH = showHeader ? Math.round((settings.headerHeight || 64) * scale) : 0;
  if (showHeader) {
    ctx.fillStyle = settings.headerBg || "#7A0000";
    ctx.fillRect(0, 0, W, headerH);

    // 1a. Q. Badge in Header
    const showQBadge = settings.showQBadge !== false;
    if (showQBadge) {
      const badgeW = 76 * scale;
      const badgeH = 44 * scale;
      const badgeX = 24 * scale + Math.round((settings.qBadgePosX || 0) * scale);
      const badgeY = ((headerH - badgeH) / 2) + Math.round((settings.qBadgePosY || 0) * scale);
      const badgeRadius = 22 * scale;

      ctx.fillStyle = settings.qBadgeBg || "#FFFFFF";
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeRadius);
      ctx.fill();

      ctx.fillStyle = settings.qBadgeColor || "#7A0000";
      ctx.font = `bold ${Math.round((settings.qBadgeSize || 18) * scale)}px "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(q.number || `Q.${index + 1}`, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1 * scale);
    }

    // 1b. Exam Tag in Header
    const examText = q.exam || settings.defaultExam || "SSC CGL (Shift 1)";
    if (settings.showExamTag !== false && settings.examTagPosition === "header") {
      const examX = 110 * scale + Math.round((settings.examTagPosX || 0) * scale);
      const examY = (headerH / 2) + Math.round((settings.examTagPosY || 0) * scale);
      ctx.fillStyle = settings.examColor || "#FFFFFF";
      ctx.font = `bold ${Math.round((settings.examFontSize || 18) * scale)}px "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(examText, examX, examY);
    }

    // 1c. Topic Tag in Header
    if (settings.showTopic !== false) {
      const topicText = (q.topic || settings.topic || "TOPIC").toUpperCase();
      const topicX = W - 24 * scale + Math.round((settings.topicPosX || 0) * scale);
      const topicY = (headerH / 2) + Math.round((settings.topicPosY || 0) * scale);
      ctx.fillStyle = settings.topicColor || "#FFD700";
      ctx.font = `bold ${Math.round((settings.topicFontSize || 19) * scale)}px "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(topicText, topicX, topicY);
    }
  }

  // 2. Slide Body Content Area with Transform (Split Layout / Right-Split / Full-Width)
  const isRightSplit = settings.layoutPreset === "right-split" || Number(settings.boxPosX) > 10;
  let posXPercent = 0;
  if (settings.boxPosX && Number(settings.boxPosX) !== 0) {
    posXPercent = Number(settings.boxPosX);
  } else if (settings.layoutPreset === "right-split") {
    posXPercent = 42;
  }

  let widthPercent = 100;
  if (settings.questionBoxWidth && Number(settings.questionBoxWidth) !== 100) {
    widthPercent = Number(settings.questionBoxWidth);
  } else if (settings.layoutPreset === "right-split" || settings.layoutPreset === "left-split") {
    widthPercent = 56;
  }

  const marginX = Math.round(((960 * (posXPercent / 100)) + 24) * scale);
  const maxContentW = Math.round(((960 * (widthPercent / 100)) - 48) * scale);
  const boxPosY = Math.round((settings.boxPosY || 0) * scale);
  let flowY = headerH + Math.round((settings.questionPadding || 16) * scale) + boxPosY;

  const textAlign = settings.textAlign || "left";
  const engFontFamily = settings.engFontFamily || "Segoe UI, Arial, sans-serif";
  const hindiFontFamily = settings.hindiFontFamily || "Mangal, Noto Sans Devanagari, Nirmala UI, Arial, sans-serif";
  const optFontFamily = settings.optionFontFamily || engFontFamily;
  const optAlign = settings.optionAlign || "left";
  const lineHeightMult = settings.lineHeight || 1.34;

  // 2a. Standalone Q. Badge when Header is Hidden (Custom Template Mode)
  if (!showHeader && settings.showQBadge !== false) {
    const qBadgeFontSize = Math.round((settings.qBadgeSize || 18) * scale);
    ctx.font = `bold ${qBadgeFontSize}px "Segoe UI", Arial, sans-serif`;
    const badgeText = q.number || `Q.${index + 1}`;
    const padX = 14 * scale;
    const padY = 4 * scale;
    const bW = ctx.measureText(badgeText).width + padX * 2;
    const bH = qBadgeFontSize + padY * 2 + 4 * scale;
    
    // When in right-split mode, position badge on the left margin (X=24px); in full-width mode, place at marginX
    const bBaseX = posXPercent > 0 ? (24 * scale) : marginX;
    const bX = bBaseX + Math.round((settings.qBadgePosX || 0) * scale);
    const bY = (posXPercent > 0 ? (headerH + Math.round((settings.questionPadding || 16) * scale)) : flowY) + Math.round((settings.qBadgePosY || 0) * scale);

    ctx.fillStyle = settings.qBadgeBg || "#FFFFFF";
    roundRect(ctx, bX, bY, bW, bH, 14 * scale);
    ctx.fill();

    ctx.fillStyle = settings.qBadgeColor || "#7A0000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, bX + bW / 2, bY + bH / 2 + 1 * scale);

    // In full-width mode, standalone Q-badge sits on its own row above question text
    if (posXPercent === 0) {
      flowY += bH + Math.round(8 * scale);
    }
  }

  // 2b. English Question with individual Eng Pos X & Y and Width
  if (settings.showEnglish !== false && q.english) {
    const engX = marginX + Math.round((settings.engPosX || 0) * scale);
    const engY = flowY + Math.round((settings.engPosY || 0) * scale);
    const engContentW = Math.round(maxContentW * ((settings.engWidth || 100) / 100));
    ctx.fillStyle = settings.engColor || "#111111";
    const engFontSize = Math.round((settings.engFontSize || 18) * scale);
    ctx.font = `bold ${engFontSize}px ${engFontFamily}`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = "top";
    const engLineHeight = engFontSize * lineHeightMult;
    const engLines = wrapCanvasText(ctx, q.english || "", engContentW);

    let engDrawX = engX;
    if (textAlign === "center") {
      engDrawX = engX + engContentW / 2;
    } else if (textAlign === "right") {
      engDrawX = engX + engContentW;
    }

    let lineY = engY;
    engLines.forEach((line) => {
      ctx.fillText(line, engDrawX, lineY);
      lineY += engLineHeight;
    });

    flowY = lineY + Math.round(4 * scale);
  }

  // 2c. Divider Line with Width & Pos X & Y
  if (settings.showDivider !== false) {
    const divW = Math.round(maxContentW * ((settings.dividerWidth || 100) / 100));
    const divX = marginX + Math.round((settings.dividerPosX || 0) * scale);
    const divSpacing = (settings.dividerSpacing || 4) * scale;
    const divThickness = (settings.dividerThickness || 2) * scale;
    const divY = flowY + divSpacing + Math.round((settings.dividerPosY || 0) * scale);
    ctx.strokeStyle = settings.dividerColor || "#A30000";
    ctx.lineWidth = divThickness;
    ctx.beginPath();
    ctx.moveTo(divX, divY);
    ctx.lineTo(divX + divW, divY);
    ctx.stroke();

    flowY = divY + divThickness + divSpacing;
  }

  // 2d. Hindi Question with Pos X & Y and Width
  if (settings.showHindi !== false && q.hindi) {
    const hindiX = marginX + Math.round((settings.hindiPosX || 0) * scale);
    const hindiY = flowY + Math.round((settings.hindiPosY || 0) * scale);
    const hindiContentW = Math.round(maxContentW * ((settings.hindiWidth || 100) / 100));
    ctx.fillStyle = settings.hindiColor || "#7A0000";
    const hindiFontSize = Math.round((settings.hindiFontSize || 17) * scale);
    ctx.font = `bold ${hindiFontSize}px ${hindiFontFamily}`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = "top";
    const hindiLineHeight = hindiFontSize * lineHeightMult;
    const hindiLines = wrapCanvasText(ctx, q.hindi || "", hindiContentW);

    let hindiDrawX = hindiX;
    if (textAlign === "center") {
      hindiDrawX = hindiX + hindiContentW / 2;
    } else if (textAlign === "right") {
      hindiDrawX = hindiX + hindiContentW;
    }

    let lineY = hindiY;
    hindiLines.forEach((line) => {
      ctx.fillText(line, hindiDrawX, lineY);
      lineY += hindiLineHeight;
    });

    flowY = lineY + Math.round(4 * scale);
  }

  // 2e. Standalone Exam Tag Badge (Below Question / Above Options)
  const examText = q.exam || settings.defaultExam || "(SSC GD 22 Feb., 2024 Shift III)";
  const examTagPos = settings.examTagPosition || "below-question";
  if (settings.showExamTag !== false && (examTagPos === "below-question" || examTagPos === "above-options")) {
    const tagFontSize = Math.round((settings.examFontSize || 15) * scale);
    ctx.font = `bold ${tagFontSize}px "Segoe UI", Arial, sans-serif`;
    const tagMetrics = ctx.measureText(examText);
    const padX = (settings.examTagPaddingX !== undefined ? settings.examTagPaddingX : (settings.examTagStyle === "pill" ? 14 : 6)) * scale;
    const padY = (settings.examTagPaddingY !== undefined ? settings.examTagPaddingY : 4) * scale;
    const tagW = tagMetrics.width + (padX * 2);
    const tagH = tagFontSize + (padY * 2) + 4 * scale;
    const radius = settings.examTagRadius !== undefined ? (settings.examTagRadius * scale) : (settings.examTagStyle === "pill" ? (tagH / 2) : (4 * scale));

    const examBadgeBaseX = (posXPercent > 0 ? (marginX + maxContentW - tagW) : marginX);
    const examBadgeX = examBadgeBaseX + Math.round((settings.examTagPosX || 0) * scale);
    const examBadgeY = flowY + Math.round((settings.examTagPosY || 0) * scale);

    if (settings.examTagStyle === "pill") {
      ctx.fillStyle = settings.examTagBg || "#DC2626";
      roundRect(ctx, examBadgeX, examBadgeY, tagW, tagH, radius);
      ctx.fill();
      ctx.fillStyle = settings.examTagColor || "#FFFFFF";
    } else if (settings.examTagStyle === "highlight") {
      ctx.fillStyle = "#FEF08A";
      roundRect(ctx, examBadgeX, examBadgeY, tagW, tagH, radius);
      ctx.fill();
      ctx.fillStyle = "#854D0E";
    } else {
      ctx.fillStyle = settings.examColor || "#FFFFFF";
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(examText, examBadgeX + padX, examBadgeY + tagH / 2);
    flowY = examBadgeY + tagH + Math.round(8 * scale);
  }

  // 3. Slide Diagrams / Graphs / Images Floating Layer (Support Multiple Images)
  const images = getQuestionImages(q);
  for (const img of images) {
    const imgDataUrl = typeof img === "string" ? img : img?.dataUrl;
    if (imgDataUrl) {
      try {
        const imgObj = await loadImageAsync(imgDataUrl);
        const imgW = (img.width || 360) * scale;
        const imgH = (img.height || Math.round(imgW / (imgObj.width / imgObj.height || 1.33))) * scale;
        const imgX = (img.posX || 0) * scale;
        const imgY = (img.posY || 0) * scale;
        ctx.drawImage(imgObj, imgX, imgY, imgW, imgH);
      } catch (_) {}
    }
  }

  // 4. Dynamic Uniform Option Cards (1-col, 2-col, 4-col) with individual Options Pos X & Y
  if (settings.showOptions !== false && q.options && q.options.length > 0) {
    const options = q.options;
    const layout = settings.optionsLayout || "2-col";
    const cardGapX = (settings.optionGap !== undefined ? settings.optionGap : 10) * scale;
    const cardGapY = (settings.optionGap !== undefined ? settings.optionGap : 10) * scale;
    const totalCardsW = maxContentW * ((settings.optionWidthPercent || 96) / 100);
    const startCardX = marginX + (maxContentW - totalCardsW) / 2 + Math.round((settings.optionsPosX || 0) * scale);

    const cardPaddingY = (settings.optionCardPadding !== undefined ? settings.optionCardPadding : 8) * scale;
    const circleD = 28 * scale;
    const optFontSize = Math.round((settings.optionFontSize || 18) * scale);
    const cardH = Math.round(Math.max(38 * scale, circleD + cardPaddingY * 2, optFontSize * 1.25 + cardPaddingY * 2));

    let totalRows = 2;
    let cardW = (totalCardsW - cardGapX) / 2;
    if (layout === "1-col") {
      totalRows = options.length;
      cardW = totalCardsW;
    } else if (layout === "4-col") {
      totalRows = 1;
      cardW = (totalCardsW - 3 * cardGapX) / 4;
    }

    const footerH = (settings.showFooter !== false ? (settings.footerHeight || 28) : 0) * scale;
    // In DOM, options container has margin-top: 14px and flows below question
    let optStartY = flowY + 14 * scale + Math.round((settings.optionsPosY || 0) * scale);
    const totalOptH = cardH * totalRows + cardGapY * (totalRows - 1);

    // Safeguard: If options exceed bottom bounds, fit them neatly within the slide
    if (optStartY + totalOptH > H - footerH - 6 * scale && !settings.optionsPosY) {
      optStartY = Math.max(flowY + 6 * scale, H - footerH - totalOptH - 12 * scale);
    }

    options.slice(0, 4).forEach((opt, optIdx) => {
      let row, col;
      if (layout === "1-col") {
        row = optIdx;
        col = 0;
      } else if (layout === "4-col") {
        row = 0;
        col = optIdx;
      } else {
        row = Math.floor(optIdx / 2);
        col = optIdx % 2;
      }
      const cX = startCardX + col * (cardW + cardGapX);
      const cY = optStartY + row * (cardH + cardGapY);

      if (settings.optionStyle !== "clean") {
        // Card Box
        ctx.fillStyle = settings.optionCardBg || "#FFFFFF";
        roundRect(ctx, cX, cY, cardW, cardH, (settings.optionCardRadius || 8) * scale);
        ctx.fill();

        ctx.strokeStyle = settings.optionBorderColor || "#CBD5E1";
        ctx.lineWidth = (settings.optionCardBorderWidth || 1.5) * scale;
        ctx.stroke();

        // Option Circle Badge
        const badgeD = Math.min(28 * scale, cardH * 0.72);
        const bX = cX + 12 * scale;
        const bY = cY + (cardH - badgeD) / 2;

        ctx.fillStyle = settings.optionBadgeBg || "#7A0000";
        ctx.beginPath();
        ctx.arc(bX + badgeD / 2, bY + badgeD / 2, badgeD / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = settings.optionBadgeColor || "#FFFFFF";
        ctx.font = `bold ${Math.round(14 * scale)}px "Segoe UI", Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(opt.key || String.fromCharCode(65 + optIdx), bX + badgeD / 2, bY + badgeD / 2 + 1 * scale);

        // Option Text
        ctx.fillStyle = settings.optionTextColor || (settings.optionStyle === "clean" && settings.theme === "dark" ? "#FFFFFF" : "#111111");
        ctx.font = `bold ${optFontSize}px ${optFontFamily}`;
        ctx.textAlign = optAlign;
        ctx.textBaseline = "middle";

        let optTextX = bX + badgeD + 10 * scale;
        if (optAlign === "center") {
          optTextX = cX + cardW / 2 + (badgeD + 10 * scale) / 2;
        } else if (optAlign === "right") {
          optTextX = cX + cardW - 12 * scale;
        }

        ctx.fillText(opt.text || "", optTextX, cY + cardH / 2);
      } else {
        // Clean Minimalist Option: (a) 52,200
        ctx.fillStyle = settings.optionTextColor || settings.hindiColor || "#FBBF24";
        ctx.font = `bold ${optFontSize}px ${optFontFamily}`;
        ctx.textAlign = optAlign;
        ctx.textBaseline = "middle";
        const keyText = `(${(opt.key || String.fromCharCode(65 + optIdx)).toLowerCase()}) `;

        let optTextX = cX + 6 * scale;
        if (optAlign === "center") {
          optTextX = cX + cardW / 2;
        } else if (optAlign === "right") {
          optTextX = cX + cardW - 6 * scale;
        }

        ctx.fillText(keyText + (opt.text || ""), optTextX, cY + cardH / 2);
      }
    });
  }

  // 5. Footer Bar (Render whenever showFooter is true)
  if (settings.showFooter !== false) {
    const footerH = (settings.footerHeight || 28) * scale;
    const footY = H - footerH;
    ctx.fillStyle = settings.footerBg || "#FFFFFF";
    ctx.fillRect(0, footY, W, footerH);

    ctx.fillStyle = settings.footerColor || "#111111";
    ctx.font = `bold ${Math.round((settings.footerFontSize || 13) * scale)}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(settings.footerText || "Maths by Aditya | Telegram: @YourChannel", W / 2, footY + footerH / 2);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapCanvasText(ctx, text, maxWidth) {
  if (!text) return [];
  const paragraphs = String(text).split("\n");
  const allLines = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      allLines.push("");
      continue;
    }
    const words = para.split(" ");
    let currentLine = "";

    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxWidth && currentLine) {
        allLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) allLines.push(currentLine);
  }
  return allLines;
}

function canvasToJpegBytes(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new Error("Failed to capture slide canvas."));
        const buffer = await blob.arrayBuffer();
        resolve(new Uint8Array(buffer));
      },
      "image/jpeg",
      quality
    );
  });
}

function buildPdf(pages) {
  const chunks = [];
  const offsets = [];

  function push(str) {
    chunks.push(typeof str === "string" ? new TextEncoder().encode(str) : str);
  }

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const pageCount = pages.length;
  const pageObjIds = [];

  for (let i = 0; i < pageCount; i += 1) {
    const pageObjId = 3 + i * 3;
    const contentObjId = pageObjId + 1;
    const imageObjId = pageObjId + 2;
    pageObjIds.push({ pageObjId, contentObjId, imageObjId });
  }

  // 1 0 obj Catalog
  offsets.push(getByteLength(chunks));
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // 2 0 obj Pages
  offsets.push(getByteLength(chunks));
  const kidsStr = pageObjIds.map((p) => `${p.pageObjId} 0 R`).join(" ");
  push(`2 0 obj\n<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${pageCount} >>\nendobj\n`);

  // Render Pages
  for (let i = 0; i < pageCount; i += 1) {
    const page = pages[i];
    const { pageObjId, contentObjId, imageObjId } = pageObjIds[i];

    // Page object
    offsets.push(getByteLength(chunks));
    push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /XObject << /Im${i + 1} ${imageObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );

    // Content Stream
    const streamContent = `q\n${page.width} 0 0 ${page.height} 0 0 cm\n/Im${i + 1} Do\nQ\n`;
    offsets.push(getByteLength(chunks));
    push(
      `${contentObjId} 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`
    );

    // Image XObject
    offsets.push(getByteLength(chunks));
    const header = `${imageObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.imageWidth} /Height ${page.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`;
    push(header);
    push(page.bytes);
    push("\nendstream\nendobj\n");
  }

  // XRef Table
  const startXref = getByteLength(chunks);
  const totalObjs = 3 + pageCount * 3;
  push(`xref\n0 ${totalObjs}\n0000000000 65535 f \n`);

  offsets.forEach((offset) => {
    push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });

  push(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
}

function getByteLength(chunks) {
  return chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadImageAsync(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}