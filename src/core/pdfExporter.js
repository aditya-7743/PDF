// Multi-Quality PDF Exporter for Question Slides
import { getSlideSettings } from "../branches/pptBranch.js";

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

export async function exportQuestionsToPdf(questions, rawSettings, qualityMode = "medium", onProgress = () => {}) {
  if (!questions || !questions.length) {
    throw new Error("No questions to export.");
  }

  const qualityConfig = {
    low: { width: 1280, height: 720, jpegQuality: 0.65 },
    medium: { width: 1920, height: 1080, jpegQuality: 0.85 },
    high: { width: 3840, height: 2160, jpegQuality: 0.95 }
  }[qualityMode] || { width: 1920, height: 1080, jpegQuality: 0.85 };

  const canvas = document.createElement("canvas");
  canvas.width = qualityConfig.width;
  canvas.height = qualityConfig.height;
  const ctx = canvas.getContext("2d");

  const pages = [];

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    onProgress({ current: i + 1, total: questions.length, label: `Rendering Slide ${i + 1}/${questions.length}` });

    await renderSlideToCanvas(ctx, q, i, rawSettings, qualityConfig.width, qualityConfig.height);
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

  const pdfBlob = buildPdf(pages);
  const fileName = `${(rawSettings.topic || "Question_Slides").replace(/[^a-z0-9_\-]/gi, "_")}_${qualityMode.toUpperCase()}.pdf`;
  
  downloadBlob(pdfBlob, fileName);
  return fileName;
}

async function renderSlideToCanvas(ctx, q, index, rawSettings, W, H) {
  const settings = getSlideSettings(rawSettings, q);
  const scale = W / 960; // scale factor relative to 960x540 base
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = settings.slideBg || "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // 1. Header Bar
  const headerH = (settings.headerHeight || 64) * scale;
  ctx.fillStyle = settings.headerBg || "#7A0000";
  ctx.fillRect(0, 0, W, headerH);

  // 1a. Q. Badge (White Pill / Rounded Rectangle)
  const badgeW = 76 * scale;
  const badgeH = 46 * scale;
  const badgeX = 22 * scale;
  const badgeY = (headerH - badgeH) / 2;
  const badgeRadius = 23 * scale;

  ctx.fillStyle = settings.qBadgeBg || "#FFFFFF";
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeRadius);
  ctx.fill();

  ctx.fillStyle = settings.qBadgeColor || "#7A0000";
  ctx.font = `bold ${Math.round((settings.qBadgeSize || 18) * scale)}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(q.number || `Q.${index + 1}`, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1 * scale);

  // 1b. Exam Tag (In Header if examTagPosition === 'header')
  const examText = q.exam || settings.defaultExam || "(SSC GD 22 Feb., 2024 Shift III)";
  if (settings.examTagPosition === "header") {
    ctx.fillStyle = settings.examColor || "#FFFFFF";
    ctx.font = `bold ${Math.round((settings.examFontSize || 19) * scale)}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(examText, badgeX + badgeW + 24 * scale, headerH / 2);
  }

  // 1c. Topic Tag (Right text with individual Topic Pos X & Y)
  const topicText = (q.topic || settings.topic || "TOPIC").toUpperCase();
  const topicX = W - 28 * scale + Math.round((settings.topicPosX || 0) * scale);
  const topicY = (headerH / 2) + Math.round((settings.topicPosY || 0) * scale);
  ctx.fillStyle = settings.topicColor || "#FFD700";
  ctx.font = `bold ${Math.round((settings.topicFontSize || 20) * scale)}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(topicText, topicX, topicY);

  // Content Area with Split Layout & Position X support
  const posXPercent = settings.boxPosX !== undefined ? settings.boxPosX : (settings.layoutPreset === "right-split" ? 42 : 0);
  const widthPercent = settings.questionBoxWidth || (settings.layoutPreset === "right-split" || settings.layoutPreset === "left-split" ? 56 : 100);

  const marginX = Math.round((28 + (W / scale * posXPercent / 100)) * scale);
  const maxContentW = Math.round((W * (widthPercent / 100) - 56 * scale));
  let currentY = headerH + (settings.questionPadding || 16) * scale;

  const textAlign = settings.textAlign || "left";
  const engFontFamily = settings.engFontFamily || "Segoe UI, Arial, sans-serif";
  const hindiFontFamily = settings.hindiFontFamily || "Mangal, Noto Sans Devanagari, Nirmala UI, Arial, sans-serif";
  const optFontFamily = settings.optionFontFamily || engFontFamily;
  const optAlign = settings.optionAlign || "left";
  const lineHeightMult = settings.lineHeight || 1.36;

  // 2. English Question with individual Eng Pos X & Y and Width
  const engX = marginX + Math.round((settings.engPosX || 0) * scale);
  let engY = currentY + Math.round((settings.engPosY || 0) * scale);
  const engContentW = Math.round(maxContentW * ((settings.engWidth || 100) / 100));
  ctx.fillStyle = settings.engColor || "#111111";
  const engFontSize = Math.round((settings.engFontSize || 19) * scale);
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

  engLines.forEach((line) => {
    ctx.fillText(line, engDrawX, engY);
    engY += engLineHeight;
  });

  currentY = Math.max(currentY + engLines.length * engLineHeight, engY) + 10 * scale;

  // 3. Divider Line with Width & Pos X & Y
  if (settings.showDivider !== false) {
    const divW = Math.round(maxContentW * ((settings.dividerWidth || 100) / 100));
    const divX = marginX + Math.round((settings.dividerPosX || 0) * scale);
    const divY = currentY + Math.round((settings.dividerPosY || 0) * scale);
    ctx.strokeStyle = settings.dividerColor || "#A30000";
    ctx.lineWidth = (settings.dividerThickness || 2) * scale;
    ctx.beginPath();
    ctx.moveTo(divX, divY);
    ctx.lineTo(divX + divW, divY);
    ctx.stroke();
    currentY = Math.max(currentY + 14 * scale, divY + 14 * scale);
  }

  // 4. Hindi Question with individual Hindi Pos X & Y and Width
  const hindiX = marginX + Math.round((settings.hindiPosX || 0) * scale);
  let hindiY = currentY + Math.round((settings.hindiPosY || 0) * scale);
  const hindiContentW = Math.round(maxContentW * ((settings.hindiWidth || 100) / 100));
  ctx.fillStyle = settings.hindiColor || "#7A0000";
  const hindiFontSize = Math.round((settings.hindiFontSize || 18) * scale);
  ctx.font = `bold ${hindiFontSize}px ${hindiFontFamily}`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = "top";
  const hindiLineHeight = hindiFontSize * (lineHeightMult * 1.02);
  const hindiLines = wrapCanvasText(ctx, q.hindi || "", hindiContentW);

  let hindiDrawX = hindiX;
  if (textAlign === "center") {
    hindiDrawX = hindiX + hindiContentW / 2;
  } else if (textAlign === "right") {
    hindiDrawX = hindiX + hindiContentW;
  }

  hindiLines.forEach((line) => {
    ctx.fillText(line, hindiDrawX, hindiY);
    hindiY += hindiLineHeight;
  });

  currentY = Math.max(currentY + hindiLines.length * hindiLineHeight, hindiY);

  // 4b. Standalone Exam Tag Badge (Below Hindi Question - SSC GD / YouTube Lecture Style)
  if (settings.examTagPosition === "below-question" || settings.examTagPosition === "above-options") {
    currentY += 8 * scale;
    const examBadgeX = marginX + Math.round((settings.examTagPosX || 0) * scale);
    const examBadgeY = currentY + Math.round((settings.examTagPosY || 0) * scale);
    const tagFontSize = Math.round((settings.examFontSize || 15) * scale);
    ctx.font = `bold ${tagFontSize}px "Segoe UI", Arial, sans-serif`;
    const tagMetrics = ctx.measureText(examText);
    const tagW = tagMetrics.width + 24 * scale;
    const tagH = (tagFontSize + 12) * scale;

    if (settings.examTagStyle === "pill") {
      ctx.fillStyle = settings.examTagBg || "#DC2626";
      roundRect(ctx, examBadgeX, examBadgeY, tagW, tagH, tagH / 2);
      ctx.fill();
      ctx.fillStyle = settings.examTagColor || "#FFFFFF";
    } else if (settings.examTagStyle === "highlight") {
      ctx.fillStyle = "#FEF08A";
      roundRect(ctx, examBadgeX, examBadgeY, tagW, tagH, 4 * scale);
      ctx.fill();
      ctx.fillStyle = "#854D0E";
    } else {
      ctx.fillStyle = settings.examColor || "#FFFFFF";
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(examText, examBadgeX + 12 * scale, examBadgeY + tagH / 2);
    currentY += tagH + 8 * scale;
  } else {
    currentY += 10 * scale;
  }

  // 4b. Slide Diagrams / Graphs / Images (Independent Floating Layers - Multiple Images Support)
  const images = getQuestionImages(q);
  for (const img of images) {
    const imgDataUrl = typeof img === "string" ? img : img?.dataUrl;
    if (imgDataUrl) {
      try {
        const imgObj = await loadImageAsync(imgDataUrl);
        const imgW = (img.width || 260) * scale;
        const imgH = (img.height || Math.round(imgW / (imgObj.width / imgObj.height || 1.33))) * scale;
        const imgX = (24 + (img.posX || 0)) * scale;
        const imgY = headerH + (12 + (img.posY || 0)) * scale;
        ctx.drawImage(imgObj, imgX, imgY, imgW, imgH);
      } catch (_) {}
    }
  }

  // 5. Dynamic Uniform Option Cards (1-col, 2-col, 4-col) with individual Options Pos X & Y
  const options = q.options && q.options.length ? q.options : [
    { key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" }
  ];

  const layout = settings.optionsLayout || "2-col";
  const maxOptLength = Math.max(...options.map((o) => (o.text || "").length), 6);
  const cardGapX = (settings.optionGap || 12) * scale * 1.5;
  const cardGapY = (settings.optionGap || 12) * scale;
  const totalCardsW = maxContentW * ((settings.optionWidthPercent || 96) / 100);
  const startCardX = marginX + (maxContentW - totalCardsW) / 2 + Math.round((settings.optionsPosX || 0) * scale);

  let cardW, totalRows, cardH;
  if (layout === "1-col") {
    totalRows = 4;
    cardW = totalCardsW;
    cardH = Math.min(60 * scale, Math.max(42 * scale, (settings.optionCardPadding || 8) * 2 * scale + 24 * scale));
  } else if (layout === "4-col") {
    totalRows = 1;
    cardW = (totalCardsW - 3 * cardGapX) / 4;
    cardH = Math.min(90 * scale, Math.max(50 * scale, (settings.optionCardPadding || 8) * 2 * scale + 28 * scale));
  } else {
    totalRows = 2;
    cardW = (totalCardsW - cardGapX) / 2;
    const optLinesEst = Math.max(1, Math.ceil(maxOptLength / 36));
    cardH = Math.min(100 * scale, Math.max(54 * scale, (optLinesEst * 24 + (settings.optionCardPadding || 8) * 2 + 16) * scale));
  }

  const footerH = (settings.showFooter ? (settings.footerHeight || 28) : 0) * scale;
  const optStartY = Math.max(currentY + 14 * scale, H - (cardH * totalRows + cardGapY * (totalRows - 1) + footerH + 20 * scale)) + Math.round((settings.optionsPosY || 0) * scale);

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

      // Option Badge
      const badgeD = Math.min(38 * scale, cardH * 0.7);
      const bX = cX + 12 * scale;
      const bY = cY + (cardH - badgeD) / 2;

      ctx.fillStyle = settings.optionBadgeBg || "#7A0000";
      ctx.beginPath();
      ctx.arc(bX + badgeD / 2, bY + badgeD / 2, badgeD / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = settings.optionBadgeColor || "#FFFFFF";
      ctx.font = `bold ${Math.round(16 * scale)}px "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(opt.key || String.fromCharCode(65 + optIdx), bX + badgeD / 2, bY + badgeD / 2 + 1 * scale);

      // Option Text
      ctx.fillStyle = settings.optionTextColor || "#111111";
      const optFontSize = Math.round((settings.optionFontSize || 18) * scale);
      ctx.font = `bold ${optFontSize}px ${optFontFamily}`;
      ctx.textAlign = optAlign;
      ctx.textBaseline = "middle";

      let optTextX = bX + badgeD + 12 * scale;
      if (optAlign === "center") {
        optTextX = cX + cardW / 2 + (badgeD + 12 * scale) / 2;
      } else if (optAlign === "right") {
        optTextX = cX + cardW - 14 * scale;
      }

      ctx.fillText(opt.text || "", optTextX, cY + cardH / 2);
    } else {
      // Clean Digital Board Minimalist Option: (a) 52,200
      ctx.fillStyle = settings.optionTextColor || settings.hindiColor || "#FBBF24";
      const optFontSize = Math.round((settings.optionFontSize || 18) * scale);
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

  // 6. Footer Bar
  if (settings.showFooter && footerH > 0) {
    const footY = H - footerH;
    ctx.fillStyle = settings.footerBg || "#7A0000";
    ctx.fillRect(0, footY, W, footerH);

    ctx.fillStyle = settings.footerColor || "#FFFFFF";
    ctx.font = `bold ${Math.round((settings.footerFontSize || 13) * scale)}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(settings.footerText || "", W / 2, footY + footerH / 2);
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