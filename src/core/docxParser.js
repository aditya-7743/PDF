export async function parseDocxFile(file) {
  if (!file) throw new Error("No file provided.");
  if (typeof window.mammoth === "undefined") {
    await loadMammothScript();
  }
  const arrayBuffer = await file.arrayBuffer();
  let rawText = "";

  // 1. Convert to HTML first to preserve paragraph breaks, tables, and soft line breaks (<br>)
  try {
    const htmlResult = await window.mammoth.convertToHtml({ arrayBuffer });
    if (htmlResult && htmlResult.value) {
      let html = htmlResult.value;
      html = html.replace(/<br\s*[\/]?>/gi, "\n");
      html = html.replace(/<\/p>/gi, "\n\n");
      html = html.replace(/<\/li>/gi, "\n");
      html = html.replace(/<\/tr>/gi, "\n");
      html = html.replace(/<\/td>/gi, "\t");
      html = html.replace(/<\/h[1-6]>/gi, "\n\n");
      html = html.replace(/<[^>]+>/g, ""); // strip remaining HTML tags
      
      if (typeof document !== "undefined") {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        rawText = txt.value;
      } else {
        rawText = html.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
      }
    }
  } catch (e) {
    console.warn("mammoth convertToHtml fallback:", e);
  }

  // 2. Fallback to extractRawText if HTML was empty
  if (!rawText || !rawText.trim()) {
    const textResult = await window.mammoth.extractRawText({ arrayBuffer });
    rawText = textResult.value || "";
  }

  return parseQuestionsText(rawText);
}

function loadMammothScript() {
  return new Promise((resolve, reject) => {
    if (window.mammoth) return resolve();
    const script = document.createElement("script");
    script.src = "./src/vendor/mammoth.browser.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load DOCX parser library."));
    document.head.appendChild(script);
  });
}

export function parseQuestionsText(rawText, defaultTopic) {
  if (!defaultTopic) defaultTopic = "TOPIC";
  if (!rawText || !rawText.trim()) return [];

  let text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let globalTopic = defaultTopic;

  const topLines = text.split("\n").slice(0, 5);
  for (let i = 0; i < topLines.length; i++) {
    const line = topLines[i];
    const tMatch = line.match(/^\s*\[?(?:TOPIC|CHAPTER)\]?\s*:\s*([^\n\]]+)/i);
    if (tMatch) {
      globalTopic = tMatch[1].replace(/\]$/, "").trim();
      break;
    }
  }

  // Pre-process: Ensure explicit question markers start on a new line if merged with previous line
  text = text.replace(/([^\n])\s*(Q(?:uestion|ue)?\.?\s*(?:No\.?|Number)?\s*[:\.\-]?\s*\d+|प्रश्न\s*(?:संख्या|सं\.?)?\s*[:\.\-]?\s*\d+|प्र\.?\s*[:\.\-]?\s*\d+)/gi, "$1\n$2");

  // Pre-process: Ensure bracketed options have a newline before them if merged with previous text
  text = text.replace(/([^\n\s])\s*(\[[A-Ea-e][\]\.]|\([A-Ea-e][\)\.]|[【［][A-Ea-e][】］])/g, "$1\n$2");

  // Pre-process: If question number is immediately followed by text (e.g. Q.No. 19A sum of money...), add a space
  text = text.replace(/(Q(?:uestion|ue)?\.?\s*(?:No\.?|Number)?\s*[:\.\-]?\s*\d+)([A-Za-z])/gi, "$1 $2");

  // 1. First search for explicit Question markers (Q.1, Q 1, Question 1, Que 1, प्रश्न 1, प्र. 1)
  const explicitQRegex = /(?:^|\n)\s*(?:Q(?:uestion|ue)?\.?\s*(?:No\.?|Number)?\s*[:\.\-]?\s*(\d+)|प्रश्न\s*(?:संख्या|सं\.?)?\s*[:\.\-]?\s*(\d+)|प्र\.?\s*[:\.\-]?\s*(\d+))(?=[^\d]|$)/gi;
  let qMatches = [];
  let match;

  while ((match = explicitQRegex.exec(text)) !== null) {
    const qNum = match[1] || match[2] || match[3];
    qMatches.push({
      index: match.index,
      qNum: parseInt(qNum, 10)
    });
  }

  // 2. If no explicit Q markers found, fallback to sequential plain number markers (1. / 2. / 3.)
  if (qMatches.length === 0) {
    const plainNumRegex = /(?:^|\n)\s*(\d+)[\.\)\:\-](?=[\s\.\:\-\)\]]|$)/g;
    while ((match = plainNumRegex.exec(text)) !== null) {
      qMatches.push({
        index: match.index,
        qNum: parseInt(match[1], 10)
      });
    }
  }

  if (qMatches.length === 0) {
    const single = parseSingleQuestionChunk(text, 1, globalTopic);
    return single ? [single] : [];
  }

  const questions = [];
  for (let i = 0; i < qMatches.length; i++) {
    const current = qMatches[i];
    const startPos = current.index;
    const endPos = (i + 1 < qMatches.length) ? qMatches[i + 1].index : text.length;
    const chunk = text.slice(startPos, endPos).trim();

    if (chunk) {
      const qObj = parseSingleQuestionChunk(chunk, current.qNum || (i + 1), globalTopic);
      if (qObj) questions.push(qObj);
    }
  }

  return questions.length > 0 ? questions : [parseSingleQuestionChunk(text, 1, globalTopic)];
}

function parseSingleQuestionChunk(chunk, fallbackIndex, globalTopic) {
  let text = chunk.trim();
  let qNumber = "Q." + fallbackIndex;
  let examTag = "";
  let topic = globalTopic || "TOPIC";
  let answerKey = "";
  const optionMap = new Map();

  // Strip leading Q.X / Q.No: X prefix
  text = text.replace(/^\s*(?:Q(?:uestion|ue)?\.?\s*(?:No\.?|Number)?\s*[:\.\-]?\s*\d+|प्रश्न\s*(?:संख्या)?\s*[:\.\-]?\s*\d+|\d+[\.\)\:\-])[\s\.\:\-\)\]]*/i, "").trim();

  // 1. Topic
  const topicMatch = text.match(/\[?(?:TOPIC|CHAPTER)\]?\s*:\s*([^\n\]]+)/i);
  if (topicMatch) {
    topic = topicMatch[1].replace(/\]$/, "").trim();
    text = text.replace(/\[?(?:TOPIC|CHAPTER)\]?\s*:\s*[^\n]+/i, "").trim();
  }

  // 2. Extract Answer Key if present in chunk
  const ansMatch = text.match(/(?:Ans|Answer|Correct(?:\s*Option|\s*Ans)?)\s*[\:\.\-]?\s*\[?\(?([A-Ea-e])[\)\]]?/i);
  if (ansMatch) {
    answerKey = ansMatch[1].toUpperCase();
    text = text.replace(ansMatch[0], "").trim();
  }

  // 3. Extract Exam & Shift Tag
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const remainingLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isExamTagLine(line) && !examTag) {
      examTag = cleanExamTag(line);
    } else {
      remainingLines.push(line);
    }
  }

  text = remainingLines.join("\n");

  // 4. Extract Options ([A], (A), [A]., (A)., [A.], (A.), 【A】, ［A］, or A. at start of line)
  const optRegex = /(?:\[([A-Ea-e])[\.\]\)]|\(([A-Ea-e])[\.\)]|[【［]([A-Ea-e])[】］]|(?:^|\n|\s)\s*([A-Ea-e])[\.\)\:\-]|(?:\s{2,}|\t)([A-Ea-e])[\.\)\-])\s*/g;
  const optMatches = [];
  let oMatch;

  while ((oMatch = optRegex.exec(text)) !== null) {
    const key = (oMatch[1] || oMatch[2] || oMatch[3] || oMatch[4] || oMatch[5]).toUpperCase();
    optMatches.push({
      key: key,
      start: oMatch.index,
      matchLen: oMatch[0].length
    });
  }

  let questionBodyText = text;

  if (optMatches.length >= 2) {
    questionBodyText = text.slice(0, optMatches[0].start).trim();

    for (let i = 0; i < optMatches.length; i++) {
      const curOpt = optMatches[i];
      const nextOptStart = (i + 1 < optMatches.length) ? optMatches[i + 1].start : text.length;
      let optVal = text.slice(curOpt.start + curOpt.matchLen, nextOptStart).trim();

      // Check if Answer is appended to Option (e.g. Option D has "15 years Answer : A")
      const optAnsMatch = optVal.match(/(?:Ans|Answer|Correct(?:\s*Option|\s*Ans)?)\s*[\:\.\-]?\s*\[?\(?([A-Ea-e])[\)\]]?/i);
      if (optAnsMatch) {
        if (!answerKey) answerKey = optAnsMatch[1].toUpperCase();
        optVal = optVal.slice(0, optAnsMatch.index).trim();
      }

      // Clean leading dots, dashes, colons from option value
      optVal = optVal.replace(/^[\.\:\-\s\]\)]+/, "").trim();
      optionMap.set(curOpt.key, optVal);
    }
  }

  const parts = separateEnglishAndHindi(questionBodyText);
  const keys = ["A", "B", "C", "D"];
  if (optionMap.has("E")) keys.push("E");

  const options = keys.map(k => ({
    key: k,
    text: optionMap.get(k) || ""
  }));

  optionMap.forEach((v, k) => {
    if (!keys.includes(k)) options.push({ key: k, text: v });
  });

  return {
    id: "q_" + fallbackIndex + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    number: qNumber,
    topic: topic || globalTopic || "TOPIC",
    exam: examTag || "",
    english: parts.english.trim(),
    hindi: parts.hindi.trim(),
    options: options,
    answer: answerKey
  };
}

function separateEnglishAndHindi(text) {
  if (!text) return { english: "", hindi: "" };

  if (text.includes("---") || text.includes("===")) {
    const parts = text.split(/---+|===+/);
    return { english: parts[0].trim(), hindi: (parts[1] || "").trim() };
  }

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const hindiRegex = /[\u0900-\u097F]/;

  const engLines = [];
  const hindiLines = [];

  for (const line of lines) {
    if (hindiRegex.test(line)) {
      hindiLines.push(line);
    } else {
      engLines.push(line);
    }
  }

  if (hindiLines.length > 0 && engLines.length > 0) {
    return {
      english: engLines.join("\n").trim(),
      hindi: hindiLines.join("\n").trim()
    };
  }

  const hindiMatch = text.search(hindiRegex);
  if (hindiMatch === -1) {
    return { english: text.trim(), hindi: "" };
  }
  if (hindiMatch === 0) {
    return { english: "", hindi: text.trim() };
  }

  return {
    english: text.slice(0, hindiMatch).trim(),
    hindi: text.slice(hindiMatch).trim()
  };
}

function isExamTagLine(line) {
  if (!line || line.length > 85) return false;
  const trimmed = line.trim();

  // If line ends with ? or contains typical question words, it is a question body, NOT an exam tag
  if (trimmed.endsWith("?") || trimmed.endsWith("।") || /^(?:in\s+how\s+many|find|calculate|determine|what\s+is|if\s|simplify|which|how|when|eval|evaluate|let\s)/i.test(trimmed)) {
    return false;
  }

  // Explicit exam prefix: [EXAM], EXAM:, (EXAM)
  if (/^\[?EXAM\]?\s*:/i.test(trimmed)) return true;

  // Strict word boundaries for exam tags (avoids matching words like compound -> PO, technique -> TECH)
  const examPattern = /\b(SSC|CGL|CHSL|MTS|CPO|\bGD\b|RRB|NTPC|GROUP[\s\-_]*D|ALP|TECHNICIAN|UPSC|BPSC|UPPSC|MPPSC|HSSC|RAS|CDS|NDA|IBPS|SBI[\s\-_]*(?:PO|CLERK)|\bPO\b|\bCLERK\b|SHIFT[\s\-_]*\d+|TIER[\s\-_]*[I|V|X\d]+)\b/i;
  
  return examPattern.test(trimmed);
}

function cleanExamTag(line) {
  return line
    .replace(/^\[?EXAM\]?\s*:\s*/i, "")
    .trim();
}
