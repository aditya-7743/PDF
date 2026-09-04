// Native Client-side PPTX Generator using PptxGenJS
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

function cleanFontFace(fontFamilyStr, fallback = "Segoe UI") {
  if (!fontFamilyStr) return fallback;
  const first = fontFamilyStr.split(",")[0].replace(/['"]/g, "").trim();
  return first || fallback;
}

export async function exportQuestionsToPptx(questions, rawSettings, options = {}) {
  if (!questions || !questions.length) {
    throw new Error("No questions to export.");
  }

  if (typeof window.PptxGenJS === "undefined") {
    await loadPptxGenScript();
  }

  const pptx = new window.PptxGenJS();
  pptx.layout = "LAYOUT_16x9"; // 10 x 5.625 or 13.33 x 7.5 standard widescreen
  pptx.title = rawSettings.topic || "Question Presentation";

  // Filter items to render based on selectedIndices if provided
  const itemsToRender = Array.isArray(options.selectedIndices) && options.selectedIndices.length > 0
    ? options.selectedIndices.filter((idx) => idx >= 0 && idx < questions.length).map((idx) => ({ q: questions[idx], originalIndex: idx }))
    : questions.map((q, idx) => ({ q, originalIndex: idx }));

  if (!itemsToRender.length) {
    throw new Error("No valid slides selected to export.");
  }

  itemsToRender.forEach(({ q, originalIndex }) => {
    const settings = getSlideSettings(rawSettings, q);
    const slide = pptx.addSlide();
    if (settings.bgImage) {
      slide.background = { data: settings.bgImage };
    } else {
      slide.background = { color: cleanHex(settings.slideBg || "#FFFFFF") };
    }


    // Slide Dimensions in PptxGenJS 16:9 widescreen layout (13.33 x 7.5 inches)
    const SLIDE_W = 13.333;
    const SLIDE_H = 7.5;

    // Pure White Blank Slide
    if (q.layout === "blank") {
      slide.background = { color: "FFFFFF" };
      if (q.english) {
        slide.addText(q.english, {
          x: 1.0,
          y: 2.0,
          w: 11.33,
          h: 1.8,
          fontSize: 42,
          fontFace: "Calibri",
          color: "1A1A1A",
          align: "center",
          valign: "middle"
        });
      }
      if (q.hindi) {
        slide.addText(q.hindi, {
          x: 1.0,
          y: 3.9,
          w: 11.33,
          h: 1.5,
          fontSize: 22,
          fontFace: "Calibri",
          color: "1A1A1A",
          align: "center",
          valign: "middle"
        });
      }
      const images = getQuestionImages(q);
      images.forEach((img) => {
        const imgData = typeof img === "string" ? img : img.dataUrl;
        if (!imgData) return;
        const imgW = (img.width || 260) / 72;
        const imgH = (img.height || 200) / 72;
        const imgX = (SLIDE_W - imgW) / 2 + ((img.posX || 0) / 72);
        const imgY = (SLIDE_H - imgH) / 2 + ((img.posY || 0) / 72);
        slide.addImage({ data: imgData, x: imgX, y: imgY, w: imgW, h: imgH });
      });
      return;
    }

    // 1. Header Bar (Only render when showHeader is true)
    const showHeader = settings.showHeader !== false;
    const headerH = showHeader ? ((settings.headerHeight || 56) / 72) : 0; // convert px to inches approx ~0.8in

    if (showHeader) {
      slide.addShape(pptx.shapes.RECTANGLE, {
        x: 0,
        y: 0,
        w: SLIDE_W,
        h: headerH,
        fill: { color: cleanHex(settings.headerBg || "#7A0000") },
        line: { type: "none" }
      });

      // 1a. Q. Badge in Header
      if (settings.showQBadge !== false) {
        const badgeW = 0.95;
        const badgeH = headerH * 0.72;
        const badgeY = ((headerH - badgeH) / 2) + ((settings.qBadgePosY || 0) / 72);
        const badgeX = 0.35 + ((settings.qBadgePosX || 0) / 72);
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
          x: badgeX,
          y: badgeY,
          w: badgeW,
          h: badgeH,
          rectRadius: 0.35,
          fill: { color: cleanHex(settings.qBadgeBg || "#FFFFFF") },
          line: { type: "none" }
        });

        slide.addText(q.number || `Q.${qIndex + 1}`, {
          x: badgeX,
          y: badgeY,
          w: badgeW,
          h: badgeH,
          fontSize: settings.qBadgeSize || 18,
          fontFace: "Segoe UI",
          bold: true,
          color: cleanHex(settings.qBadgeColor || "#7A0000"),
          align: "center",
          valign: "middle"
        });
      }

      // 1b. Exam Tag in Header
      const examText = q.exam || settings.defaultExam || "(Exam Name)";
      if (settings.showExamTag !== false && settings.examTagPosition === "header") {
        slide.addText(examText, {
          x: 1.45 + ((settings.examTagPosX || 0) / 72),
          y: ((settings.examTagPosY || 0) / 72),
          w: 6.2,
          h: headerH,
          fontSize: settings.examFontSize || 18,
          fontFace: "Segoe UI",
          bold: true,
          color: cleanHex(settings.examColor || "#FFFFFF"),
          align: "left",
          valign: "middle"
        });
      }

      // 1c. Topic Tag in Header
      if (settings.showTopic !== false) {
        const topicText = (q.topic || settings.topic || "TOPIC").toUpperCase();
        const topicX = 7.2 + ((settings.topicPosX || 0) / 72);
        const topicY = ((settings.topicPosY || 0) / 72);
        slide.addText(topicText, {
          x: topicX,
          y: topicY,
          w: 5.75,
          h: headerH,
          fontSize: settings.topicFontSize || 19,
          fontFace: "Segoe UI",
          bold: true,
          color: cleanHex(settings.topicColor || "#FFD700"),
          align: "right",
          valign: "middle"
        });
      }
    }

    // 2. English Question Body with Split Layout & individual Eng Pos X & Y
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

    const contentX = (SLIDE_W * (posXPercent / 100)) + (24 / 72);
    const contentW = Math.max(3.5, (SLIDE_W * (widthPercent / 100)) - (48 / 72));
    const boxPosYIn = ((settings.boxPosY || 0) / 72);
    let flowY = headerH + (((settings.questionPadding || 16) / 72) + boxPosYIn);

    const textAlign = settings.textAlign || "left";
    const engFontFace = cleanFontFace(settings.engFontFamily, "Segoe UI");
    const hindiFontFace = cleanFontFace(settings.hindiFontFamily, "Mangal");
    const optFontFace = cleanFontFace(settings.optionFontFamily || settings.engFontFamily, "Segoe UI");
    const optAlign = settings.optionAlign || "left";

    // 2a. Standalone Q Badge when Header is OFF
    if (!showHeader && settings.showQBadge !== false) {
      const badgeW = 0.95;
      const badgeH = 0.42;
      const bBaseX = posXPercent > 0 ? (24 / 72) : contentX;
      const bX = bBaseX + ((settings.qBadgePosX || 0) / 72);
      const bY = (posXPercent > 0 ? (headerH + ((settings.questionPadding || 16) / 72)) : flowY) + ((settings.qBadgePosY || 0) / 72);
      slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: bX,
        y: bY,
        w: badgeW,
        h: badgeH,
        rectRadius: 0.2,
        fill: { color: cleanHex(settings.qBadgeBg || "#FFFFFF") },
        line: { type: "none" }
      });
      slide.addText(q.number || `Q.${originalIndex + 1}`, {
        x: bX,
        y: bY,
        w: badgeW,
        h: badgeH,
        fontSize: settings.qBadgeSize || 18,
        fontFace: "Segoe UI",
        bold: true,
        color: cleanHex(settings.qBadgeColor || "#7A0000"),
        align: "center",
        valign: "middle"
      });
      if (posXPercent === 0 && (settings.qBadgePosX || 0) >= -50) {
        flowY += badgeH + 0.1;
      }
    }

    // 2b. English Question
    if (settings.showEnglish !== false && q.english) {
      const engText = q.english || "";
      const engLinesEst = Math.max(1, Math.ceil(engText.length / 90));
      const engH = engLinesEst * 0.34 + 0.08;
      const engX = contentX + ((settings.engPosX || 0) / 72);
      const engY = flowY + ((settings.engPosY || 0) / 72);
      const engW = contentW * ((settings.engWidth || 100) / 100);

      slide.addText(engText, {
        x: engX,
        y: engY,
        w: engW,
        h: engH,
        fontSize: settings.engFontSize || 18,
        fontFace: engFontFace,
        bold: true,
        color: cleanHex(settings.engColor || "#111111"),
        align: textAlign,
        valign: "top",
        paraSpaceAfter: 4
      });

      flowY += engH + 0.06;
    }

    // 3. Divider Line with Width & Pos X & Y
    if (settings.showDivider !== false) {
      const divW = contentW * ((settings.dividerWidth || 100) / 100);
      const divX = contentX + ((settings.dividerPosX || 0) / 72);
      const divSpacing = ((settings.dividerSpacing || 4) / 72);
      const divY = flowY + divSpacing + ((settings.dividerPosY || 0) / 72);
      slide.addShape(pptx.shapes.LINE, {
        x: divX,
        y: divY,
        w: divW,
        h: 0,
        line: {
          color: cleanHex(settings.dividerColor || "#A30000"),
          width: settings.dividerThickness || 2
        }
      });
      flowY += divSpacing * 2 + 0.04;
    }

    // 4. Hindi Question Body with individual Hindi Pos X & Y and Width
    if (settings.showHindi !== false && q.hindi) {
      const hindiText = q.hindi || "";
      const hindiLinesEst = Math.max(1, Math.ceil(hindiText.length / 85));
      const hindiH = hindiLinesEst * 0.32 + 0.08;

      const hindiX = contentX + ((settings.hindiPosX || 0) / 72);
      const hindiY = flowY + ((settings.hindiPosY || 0) / 72);
      const hindiW = contentW * ((settings.hindiWidth || 100) / 100);

      slide.addText(hindiText, {
        x: hindiX,
        y: hindiY,
        w: hindiW,
        h: hindiH,
        fontSize: settings.hindiFontSize || 17,
        fontFace: hindiFontFace,
        bold: true,
        color: cleanHex(settings.hindiColor || "#7A0000"),
        align: textAlign,
        valign: "top",
        paraSpaceAfter: 4
      });

      flowY += hindiH + 0.06;
    }

    // 4b. Standalone Exam Tag Badge (Below Hindi Question - SSC GD / YouTube Lecture Style)
    const examText = q.exam || settings.defaultExam || "(Exam Name)";
    const examTagPos = settings.examTagPosition || "below-question";
    if (settings.showExamTag !== false && (examTagPos === "below-question" || examTagPos === "above-options")) {
      const examBadgeX = contentX + ((settings.examTagPosX || 0) / 72);
      const examBadgeY = flowY + ((settings.examTagPosY || 0) / 72);
      const tagW = Math.min(contentW, Math.max(2.8, examText.length * 0.13 + 0.5));
      const tagH = 0.36;

      if (settings.examTagStyle === "pill") {
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
          x: examBadgeX,
          y: examBadgeY,
          w: tagW,
          h: tagH,
          rectRadius: 0.18,
          fill: { color: cleanHex(settings.examTagBg || "#DC2626") },
          line: { type: "none" }
        });
        slide.addText(examText, {
          x: examBadgeX,
          y: examBadgeY,
          w: tagW,
          h: tagH,
          fontSize: settings.examFontSize || 15,
          fontFace: "Segoe UI",
          bold: true,
          color: cleanHex(settings.examTagColor || "#FFFFFF"),
          align: "center",
          valign: "middle"
        });
      } else if (settings.examTagStyle === "highlight") {
        slide.addShape(pptx.shapes.RECTANGLE, {
          x: examBadgeX,
          y: examBadgeY,
          w: tagW,
          h: tagH,
          fill: { color: "FEF08A" },
          line: { type: "none" }
        });
        slide.addText(examText, {
          x: examBadgeX,
          y: examBadgeY,
          w: tagW,
          h: tagH,
          fontSize: settings.examFontSize || 15,
          fontFace: "Segoe UI",
          bold: true,
          color: "854D0E",
          align: "center",
          valign: "middle"
        });
      } else {
        slide.addText(examText, {
          x: examBadgeX,
          y: examBadgeY,
          w: tagW,
          h: tagH,
          fontSize: settings.examFontSize || 15,
          fontFace: "Segoe UI",
          bold: true,
          color: cleanHex(settings.examColor || "#FFFFFF"),
          align: "left",
          valign: "middle"
        });
      }
      flowY += tagH + 0.1;
    }

    // 4c. Slide Diagrams / Graphs / Images Floating Layer (Support Multiple Images)
    const images = getQuestionImages(q);
    for (const img of images) {
      const imgDataUrl = typeof img === "string" ? img : img?.dataUrl;
      if (imgDataUrl) {
        try {
          const imgWInches = (img.width || 360) / 72;
          const imgHInches = (img.height || 202) / 72;
          const imgXInches = ((img.posX || 0)) / 72;
          const imgYInches = ((img.posY || 0)) / 72;

          slide.addImage({
            data: imgDataUrl,
            x: imgXInches,
            y: imgYInches,
            w: imgWInches,
            h: imgHInches
          });
        } catch (_) {}
      }
    }

    // 5. Dynamic Uniform Option Cards (1-col, 2-col, 4-col) with individual Options Pos X & Y
    if (settings.showOptions !== false && q.options && q.options.length > 0) {
      const options = q.options;
      const layout = settings.optionsLayout || "2-col";
      const totalCardsW = contentW * ((settings.optionWidthPercent || 96) / 100);
      const startX = contentX + (contentW - totalCardsW) / 2 + ((settings.optionsPosX || 0) / 72);
      const cardGapX = 0.28;
      const cardGapY = 0.12;

      let cardW, cardH, totalRows;
      if (layout === "1-col") {
        totalRows = options.length;
        cardW = totalCardsW;
        cardH = 0.52;
      } else if (layout === "4-col") {
        totalRows = 1;
        cardW = (totalCardsW - 3 * cardGapX) / 4;
        cardH = 0.68;
      } else {
        totalRows = Math.ceil(options.length / 2);
        cardW = (totalCardsW - cardGapX) / 2;
        cardH = 0.58;
      }

      let optStartY = flowY + 0.16 + ((settings.optionsPosY || 0) / 72);
      const totalOptH = cardH * totalRows + cardGapY * (totalRows - 1);
      const footerHIn = (settings.showFooter !== false && showHeader ? ((settings.footerHeight || 24) / 72) : 0);
      if (optStartY + totalOptH > SLIDE_H - footerHIn - 0.1 && !settings.optionsPosY) {
        optStartY = Math.max(flowY + 0.08, SLIDE_H - footerHIn - totalOptH - 0.15);
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
        const cX = startX + col * (cardW + cardGapX);
        const cY = optStartY + row * (cardH + cardGapY);

        if (settings.optionStyle !== "clean") {
          // Card Background Box
          slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: cX,
            y: cY,
            w: cardW,
            h: cardH,
            rectRadius: 0.12,
            fill: { color: cleanHex(settings.optionCardBg || "#FFFFFF") },
            line: {
              color: cleanHex(settings.optionBorderColor || "#CBD5E1"),
              width: settings.optionCardBorderWidth || 1.5
            }
          });

          // Option Letter Badge (Circle / Pill)
          const optBadgeSize = Math.min(0.46, cardH * 0.68);
          const optBadgeY = cY + (cardH - optBadgeSize) / 2;
          const optBadgeX = cX + 0.12;

          slide.addShape(pptx.shapes.OVAL, {
            x: optBadgeX,
            y: optBadgeY,
            w: optBadgeSize,
            h: optBadgeSize,
            fill: { color: cleanHex(settings.optionBadgeBg || "#7A0000") },
            line: { type: "none" }
          });

          slide.addText(opt.key || String.fromCharCode(65 + optIdx), {
            x: optBadgeX,
            y: optBadgeY,
            w: optBadgeSize,
            h: optBadgeSize,
            fontSize: 15,
            fontFace: "Segoe UI",
            bold: true,
            color: cleanHex(settings.optionBadgeColor || "#FFFFFF"),
            align: "center",
            valign: "middle"
          });

          // Option Text
          slide.addText(opt.text || "", {
            x: optBadgeX + optBadgeSize + 0.12,
            y: cY,
            w: cardW - (optBadgeSize + 0.3),
            h: cardH,
            fontSize: settings.optionFontSize || 17,
            fontFace: optFontFace,
            bold: true,
            color: cleanHex(settings.optionTextColor || "#111111"),
            align: optAlign,
            valign: "middle"
          });
        } else {
          // Minimalist Clean Text Option: (a) Text
          const keyText = `(${(opt.key || String.fromCharCode(65 + optIdx)).toLowerCase()}) `;
          slide.addText(keyText + (opt.text || ""), {
            x: cX,
            y: cY,
            w: cardW,
            h: cardH,
            fontSize: settings.optionFontSize || 17,
            fontFace: optFontFace,
            bold: true,
            color: cleanHex(settings.optionTextColor || settings.hindiColor || "#FBBF24"),
            align: optAlign,
            valign: "middle"
          });
        }
      });
    }

    // 6. Footer Bar (Render whenever showFooter is true)
    if (settings.showFooter !== false) {
      const footerH = (settings.footerHeight || 28) / 72;
      const footY = SLIDE_H - footerH;
      slide.addShape(pptx.shapes.RECTANGLE, {
        x: 0,
        y: footY,
        w: SLIDE_W,
        h: footerH,
        fill: { color: cleanHex(settings.footerBg || "#FFFFFF") },
        line: { type: "none" }
      });

      slide.addText(settings.footerText || "Maths by Aditya | Telegram: @YourChannel", {
        x: 0,
        y: footY,
        w: SLIDE_W,
        h: footerH,
        fontSize: settings.footerFontSize || 13,
        fontFace: "Segoe UI",
        bold: true,
        color: cleanHex(settings.footerColor || "#111111"),
        align: "center",
        valign: "middle"
      });
    }
  });

  const defaultFileName = `${(rawSettings.topic || "Question_Slides").replace(/[^a-z0-9_\-]/gi, "_")}.pptx`;
  const fileName = options.customFileName ? (options.customFileName.endsWith(".pptx") ? options.customFileName : `${options.customFileName}.pptx`) : defaultFileName;
  await pptx.writeFile({ fileName });
  return fileName;
}

function cleanHex(hex) {
  if (!hex) return "000000";
  return hex.replace("#", "").trim();
}

function loadPptxGenScript() {
  return new Promise((resolve, reject) => {
    if (window.PptxGenJS) return resolve();
    const script = document.createElement("script");
    script.src = "./src/vendor/pptxgen.bundle.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load PowerPoint generator library."));
    document.head.appendChild(script);
  });
}