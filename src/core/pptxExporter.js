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

export async function exportQuestionsToPptx(questions, rawSettings) {
  if (!questions || !questions.length) {
    throw new Error("No questions to export.");
  }

  if (typeof window.PptxGenJS === "undefined") {
    await loadPptxGenScript();
  }

  const pptx = new window.PptxGenJS();
  pptx.layout = "LAYOUT_16x9"; // 10 x 5.625 or 13.33 x 7.5 standard widescreen
  pptx.title = rawSettings.topic || "Question Presentation";

  questions.forEach((q, qIndex) => {
    const settings = getSlideSettings(rawSettings, q);
    const slide = pptx.addSlide();
    slide.background = { color: cleanHex(settings.slideBg || "#FFFFFF") };

    // Slide Dimensions in PptxGenJS 16:9 widescreen layout (13.33 x 7.5 inches)
    const SLIDE_W = 13.333;
    const SLIDE_H = 7.5;

    // 1. Header Bar
    const headerH = (settings.headerHeight || 64) / 72; // convert px to inches approx ~0.9in
    slide.addShape(pptx.shapes.RECTANGLE, {
      x: 0,
      y: 0,
      w: SLIDE_W,
      h: headerH,
      fill: { color: cleanHex(settings.headerBg || "#7A0000") },
      line: { type: "none" }
    });

    // 1a. Q. Badge (White Pill / Rounded)
    const badgeW = 0.95;
    const badgeH = headerH * 0.72;
    const badgeY = (headerH - badgeH) / 2;
    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.35,
      y: badgeY,
      w: badgeW,
      h: badgeH,
      rectRadius: 0.35,
      fill: { color: cleanHex(settings.qBadgeBg || "#FFFFFF") },
      line: { type: "none" }
    });

    slide.addText(q.number || `Q.${qIndex + 1}`, {
      x: 0.35,
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

    // 1b. Exam Tag (Left-center text in Header if examTagPosition === 'header')
    const examText = q.exam || settings.defaultExam || "(SSC GD 22 Feb., 2024 Shift III)";
    if (settings.examTagPosition === "header") {
      slide.addText(examText, {
        x: 1.45,
        y: 0,
        w: 6.2,
        h: headerH,
        fontSize: settings.examFontSize || 19,
        fontFace: "Segoe UI",
        bold: true,
        color: cleanHex(settings.examColor || "#FFFFFF"),
        align: "left",
        valign: "middle"
      });
    }

    // 1c. Topic Tag (Right text with individual Topic Pos X & Y)
    const topicText = (q.topic || settings.topic || "TOPIC").toUpperCase();
    const topicX = 7.2 + ((settings.topicPosX || 0) / 72);
    const topicY = ((settings.topicPosY || 0) / 72);
    slide.addText(topicText, {
      x: topicX,
      y: topicY,
      w: 5.75,
      h: headerH,
      fontSize: settings.topicFontSize || 20,
      fontFace: "Segoe UI",
      bold: true,
      color: cleanHex(settings.topicColor || "#FFD700"),
      align: "right",
      valign: "middle"
    });

    // 2. English Question Body with Split Layout & individual Eng Pos X & Y
    const posXPercent = settings.boxPosX !== undefined ? settings.boxPosX : (settings.layoutPreset === "right-split" ? 42 : 0);
    const widthPercent = settings.questionBoxWidth || (settings.layoutPreset === "right-split" || settings.layoutPreset === "left-split" ? 56 : 100);

    const contentX = 0.42 + (SLIDE_W * posXPercent / 100);
    const contentW = Math.max(4.5, SLIDE_W * (widthPercent / 100) - 0.84);
    let currentY = headerH + ((settings.questionPadding || 16) / 72);

    const engText = q.english || "";
    const engLinesEst = Math.max(1, Math.ceil(engText.length / 105));
    const engH = Math.min(2.0, engLinesEst * 0.38 + 0.15);

    const textAlign = settings.textAlign || "left";
    const engFontFace = cleanFontFace(settings.engFontFamily, "Segoe UI");
    const hindiFontFace = cleanFontFace(settings.hindiFontFamily, "Mangal");
    const optFontFace = cleanFontFace(settings.optionFontFamily || settings.engFontFamily, "Segoe UI");
    const optAlign = settings.optionAlign || "left";

    // 2. English Question Body with individual Eng Pos X & Y and Width
    const engX = contentX + ((settings.engPosX || 0) / 72);
    const engY = currentY + ((settings.engPosY || 0) / 72);
    const engW = contentW * ((settings.engWidth || 100) / 100);

    slide.addText(engText, {
      x: engX,
      y: engY,
      w: engW,
      h: engH,
      fontSize: settings.engFontSize || 19,
      fontFace: engFontFace,
      bold: true,
      color: cleanHex(settings.engColor || "#111111"),
      align: textAlign,
      valign: "top",
      paraSpaceAfter: 4
    });

    currentY = Math.max(currentY + engH, engY + engH) + 0.12;

    // 3. Divider Line with Width & Pos X & Y
    if (settings.showDivider !== false) {
      const divW = contentW * ((settings.dividerWidth || 100) / 100);
      const divX = contentX + ((settings.dividerPosX || 0) / 72);
      const divY = currentY + ((settings.dividerPosY || 0) / 72);
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
      currentY = Math.max(currentY + 0.16, divY + 0.16);
    }

    // 4. Hindi Question Body with individual Hindi Pos X & Y and Width
    const hindiText = q.hindi || "";
    const hindiLinesEst = Math.max(1, Math.ceil(hindiText.length / 95));
    const hindiH = Math.min(2.0, hindiLinesEst * 0.38 + 0.15);

    const hindiX = contentX + ((settings.hindiPosX || 0) / 72);
    const hindiY = currentY + ((settings.hindiPosY || 0) / 72);
    const hindiW = contentW * ((settings.hindiWidth || 100) / 100);

    slide.addText(hindiText, {
      x: hindiX,
      y: hindiY,
      w: hindiW,
      h: hindiH,
      fontSize: settings.hindiFontSize || 18,
      fontFace: hindiFontFace,
      bold: true,
      color: cleanHex(settings.hindiColor || "#7A0000"),
      align: textAlign,
      valign: "top",
      paraSpaceAfter: 4
    });

    currentY = Math.max(currentY + hindiH, hindiY + hindiH);

    // 4b. Standalone Exam Tag Badge (Below Hindi Question - SSC GD / YouTube Lecture Style)
    if (settings.examTagPosition === "below-question" || settings.examTagPosition === "above-options") {
      currentY += 0.12;
      const examBadgeX = contentX + ((settings.examTagPosX || 0) / 72);
      const examBadgeY = currentY + ((settings.examTagPosY || 0) / 72);
      const tagW = Math.min(contentW, Math.max(2.8, examText.length * 0.13 + 0.5));
      const tagH = 0.38;

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
      currentY += tagH + 0.12;
    } else {
      currentY += 0.14;
    }

    // 4b. Slide Diagrams / Graphs / Images Floating Layer (Support Multiple Images)
    const images = getQuestionImages(q);
    for (const img of images) {
      const imgDataUrl = typeof img === "string" ? img : img?.dataUrl;
      if (imgDataUrl) {
        try {
          const imgWInches = (img.width || 260) / 72;
          const imgHInches = (img.height || 200) / 72;
          const imgXInches = (24 + (img.posX || 0)) / 72;
          const imgYInches = headerH + (12 + (img.posY || 0)) / 72;

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
    const options = q.options && q.options.length ? q.options : [
      { key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" }
    ];

    const layout = settings.optionsLayout || "2-col";
    const maxOptLength = Math.max(...options.map((o) => (o.text || "").length), 6);
    const totalCardsW = contentW * ((settings.optionWidthPercent || 96) / 100);
    const startX = contentX + (contentW - totalCardsW) / 2 + ((settings.optionsPosX || 0) / 72);
    const cardGapX = 0.32;
    const cardGapY = 0.16;

    let cardW, cardH, totalRows;
    if (layout === "1-col") {
      totalRows = 4;
      cardW = totalCardsW;
      cardH = 0.54;
    } else if (layout === "4-col") {
      totalRows = 1;
      cardW = (totalCardsW - 3 * cardGapX) / 4;
      cardH = 0.72;
    } else {
      totalRows = 2;
      cardW = (totalCardsW - cardGapX) / 2;
      const optLinesEst = Math.max(1, Math.ceil(maxOptLength / 38));
      cardH = Math.min(1.4, Math.max(0.72, optLinesEst * 0.34 + 0.38));
    }

    const optStartY = Math.max(currentY, SLIDE_H - (cardH * totalRows + cardGapY * (totalRows - 1) + (settings.showFooter ? 0.6 : 0.25))) + ((settings.optionsPosY || 0) / 72);

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
        const optBadgeSize = Math.min(0.52, cardH * 0.68);
        const optBadgeY = cY + (cardH - optBadgeSize) / 2;
        const optBadgeX = cX + 0.14;

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
          fontSize: 16,
          fontFace: "Segoe UI",
          bold: true,
          color: cleanHex(settings.optionBadgeColor || "#FFFFFF"),
          align: "center",
          valign: "middle"
        });

        // Option Text
        slide.addText(opt.text || "", {
          x: optBadgeX + optBadgeSize + 0.14,
          y: cY,
          w: cardW - (optBadgeSize + 0.38),
          h: cardH,
          fontSize: settings.optionFontSize || 18,
          fontFace: optFontFace,
          bold: true,
          color: cleanHex(settings.optionTextColor || "#111111"),
          align: optAlign,
          valign: "middle"
        });
      } else {
        // Clean Minimalist Option (a) Text
        const keyText = `(${(opt.key || String.fromCharCode(65 + optIdx)).toLowerCase()}) `;
        slide.addText(keyText + (opt.text || ""), {
          x: cX + 0.08,
          y: cY,
          w: cardW - 0.16,
          h: cardH,
          fontSize: settings.optionFontSize || 18,
          fontFace: optFontFace,
          bold: true,
          color: cleanHex(settings.optionTextColor || settings.hindiColor || "#FBBF24"),
          align: optAlign,
          valign: "middle"
        });
      }
    });

    // 6. Optional Footer Bar
    if (settings.showFooter) {
      const footerH = (settings.footerHeight || 28) / 72;
      const footerY = SLIDE_H - footerH;

      slide.addShape(pptx.shapes.RECTANGLE, {
        x: 0,
        y: footerY,
        w: SLIDE_W,
        h: footerH,
        fill: { color: cleanHex(settings.footerBg || "#7A0000") },
        line: { type: "none" }
      });

      slide.addText(settings.footerText || "", {
        x: 0.5,
        y: footerY,
        w: SLIDE_W - 1.0,
        h: footerH,
        fontSize: settings.footerFontSize || 13,
        fontFace: "Segoe UI",
        bold: true,
        color: cleanHex(settings.footerColor || "#FFFFFF"),
        align: "center",
        valign: "middle"
      });
    }
  });

  const fileName = `${(settings.topic || "Question_Slides").replace(/[^a-z0-9_\-]/gi, "_")}.pptx`;
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