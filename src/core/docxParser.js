export async function parseDocxFile(file) {
  if (!file) throw new Error("No file provided.");
  if (typeof window.mammoth === "undefined") {
    await loadMammothScript();
  }
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  const rawText = result.value || "";
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

  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let globalTopic = defaultTopic;

  const topLines = text.split("\n").slice(0, 5);
  for (let i = 0; i < topLines.length; i++) {
    const line = topLines[i];
    const tMatch = line.match(/^\s*\[?(?:TOPIC|CHAPTER)\]?\s*:\s*(.+)$/i);
    if (tMatch) {
      globalTopic = tMatch[1].trim();
      break;
    }
  }

  // Strictly match Question boundaries at beginning of lines
  const qRegex = /(?:^|\n)\s*(?:Q(?:uestion|ue)?\.?\s*(?:No\.?|Number)?\s*[:\.\-]?\s*(\d+)|प्रश्न\s*(?:संख्या)?\s*[:\.\-]?\s*(\d+)|(\d+)[\.\)\:\-])(?=[\s\.\:\-\)\]]|$)/gi;
  const qMatches = [];
  let match;

  while ((match = qRegex.exec(text)) !== null) {
    const qNum = match[1] || match[2] || match[3];
    qMatches.push({
      index: match.index,
      qNum: parseInt(qNum, 10)
    });
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
  const topicMatch = text.match(/\[?(?:TOPIC|CHAPTER)\]?\s*:\s*([^\n]+)/i);
  if (topicMatch) {
    topic = topicMatch[1].trim();
    text = text.replace(topicMatch[0], "").trim();
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

  // 4. Extract Options ([A], (A), [A]., (A)., or A. at start of line - avoids matching ratios like A: B = 7:5)
  const optRegex = /(?:^|\n|\s)(?:\[([A-Ea-e])\]|\(([A-Ea-e])\)|(?:\n|^)\s*([A-Ea-e])[\.\)\:\-]|(?:\s{2,}|\t)([A-Ea-e])[\.\)\-])\s*/g;
  const optMatches = [];
  let oMatch;

  while ((oMatch = optRegex.exec(text)) !== null) {
    const key = (oMatch[1] || oMatch[2] || oMatch[3] || oMatch[4]).toUpperCase();
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

      // Check if Answer is appended to Option (e.g. Option D has "36π-72 Answer : A")
      const optAnsMatch = optVal.match(/(?:Ans|Answer|Correct(?:\s*Option|\s*Ans)?)\s*[\:\.\-]?\s*\[?\(?([A-Ea-e])[\)\]]?/i);
      if (optAnsMatch) {
        if (!answerKey) answerKey = optAnsMatch[1].toUpperCase();
        optVal = optVal.replace(optAnsMatch[0], "").trim();
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
    exam: examTag || "SSC CGL (Shift 1)",
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
