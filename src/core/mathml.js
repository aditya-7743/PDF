import { normalizeMathInput } from "./normalizer.js";

export function renderMathMl(input = "") {
  const normalizedLines = normalizeMathInputLines(input);
  const normalized = normalizedLines.join("\n");
  if (normalizedLines.length > 1) {
    return {
      normalized,
      mathMl: renderSolutionLayout(normalizedLines),
    };
  }

  if (isTextRichLine(normalized)) {
    return {
      normalized,
      mathMl: renderSolutionLayout(normalizedLines),
    };
  }

  return {
    normalized,
    mathMl: renderMathBlock(normalized),
  };
}

function normalizeMathInputLines(input = "") {
  const rawLines = String(input).replace(/\r/g, "").split("\n");
  if (rawLines.length <= 1) return [normalizeMathInput(input)];

  const normalized = rawLines
    .map((line) => normalizeMathInput(line))
    .filter((line) => !isDisplayDelimiterLine(line));
  return normalized.length ? normalized : [""];
}

function findTopLevelEquals(line = "") {
  let braceDepth = 0;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\\" && line[index + 1]) {
      index += 1;
      continue;
    }
    if (char === "{") braceDepth += 1;
    if (char === "}") braceDepth = Math.max(0, braceDepth - 1);
    if (char === "=" && braceDepth === 0) return index;
  }
  return -1;
}

function renderSolutionLayout(lines) {
  const blocks = [];
  let equationSet = [];

  const flushEquationSet = () => {
    if (!equationSet.length) return;
    blocks.push(renderEquationSet(equationSet));
    equationSet = [];
  };

  lines.forEach((line) => {
    if (!line.trim()) {
      flushEquationSet();
      if (!blocks.length || !blocks[blocks.length - 1].includes("solution-spacer")) {
        blocks.push('<div class="solution-spacer" aria-hidden="true"></div>');
      }
      return;
    }

    if (isAlignableEquationLine(line)) {
      equationSet.push(line);
      return;
    }

    flushEquationSet();
    if (isTextRichLine(line)) {
      blocks.push(`<div class="solution-line solution-text">${renderInlineMixedHtml(line)}</div>`);
      return;
    }

    blocks.push(`<div class="solution-line solution-equation">${renderMathBlock(line)}</div>`);
  });

  flushEquationSet();
  return `<div class="solution-layout">${blocks.join("")}</div>`;
}

function renderEquationSet(lines) {
  const rows = lines.map((line) => {
    const index = findTopLevelEquals(line);
    const left = line.slice(0, index).trim();
    const right = line.slice(index + 1).trim();
    const leftHtml = left ? renderMathBlock(left, "eq-side") : '<span class="eq-placeholder" aria-hidden="true"></span>';
    return `
      <span class="eq-left">${leftHtml}</span>
      <span class="eq-sign">=</span>
      <span class="eq-right">${renderMathBlock(right, "eq-side")}</span>
    `;
  });

  return `<div class="solution-line solution-equation-set">${rows.join("")}</div>`;
}

function renderMathBlock(line = "", className = "") {
  const classAttribute = className ? ` class="${className}"` : "";
  return `<math${classAttribute} xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><mstyle displaystyle="true" scriptlevel="0"><mrow>${renderLine(line)}</mrow></mstyle></math>`;
}

function renderLine(line = "") {
  if (!line) return '<mspace width="0.1em"></mspace>';
  if (isTextRichLine(line)) return renderMixedTextLine(line);
  if (isPlainTextLine(line)) return `<mtext class="plain-text-line">${escapeHtml(line)}</mtext>`;
  return new MathParser(line).parse() || '<mspace width="0.1em"></mspace>';
}

function isPlainTextLine(line = "") {
  return !/[\\^_{}[\]()+\-*/=<>|0-9]/.test(line);
}

function isDisplayDelimiterLine(line = "") {
  return /^(?:\[|\]|\\\[|\\\]|\\begin\{equation\*?\}|\\end\{equation\*?\})$/.test(String(line).trim());
}

function isAlignableEquationLine(line = "") {
  return findTopLevelEquals(line) >= 0 && !isTextRichLine(line);
}

function isTextRichLine(line = "") {
  const value = String(line).trim();
  if (!value) return false;
  if (/[\u0900-\u097F]/.test(value)) return true;

  const withoutLatex = value
    .replace(/\\[A-Za-z]+/g, " ")
    .replace(/[0-9+\-*/=^_{}()[\].,;:<>|'"`~]/g, " ");
  return withoutLatex.split(/\s+/).some((token) => /[A-Za-z]{2,}/.test(token));
}

function renderMixedTextLine(line = "") {
  const parts = splitMixedLine(line);
  return `<mrow class="mixed-line">${parts
    .map((part) => (part.type === "math" ? wrap(new MathParser(part.value).parse() || escapeHtml(part.value)) : `<mtext>${escapeHtml(part.value)}</mtext>`))
    .join("")}</mrow>`;
}

function renderInlineMixedHtml(line = "") {
  return splitMixedLine(line)
    .map((part) => {
      if (part.type !== "math") return `<span class="text-part">${escapeHtml(part.value)}</span>`;
      return `<math class="inline-math" xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><mstyle displaystyle="true" scriptlevel="0"><mrow>${new MathParser(part.value).parse() || escapeHtml(part.value)}</mrow></mstyle></math>`;
    })
    .join("");
}

function splitMixedLine(line = "") {
  const parts = [];
  let buffer = "";
  let index = 0;

  while (index < line.length) {
    if (isMathSegmentStart(line, index)) {
      if (buffer) {
        parts.push({ type: "text", value: buffer });
        buffer = "";
      }
      const segment = readInlineMathSegment(line, index);
      parts.push({ type: "math", value: trimMathPunctuation(segment.value) });
      if (segment.trailing) parts.push({ type: "text", value: segment.trailing });
      index = segment.end;
      continue;
    }

    buffer += line[index];
    index += 1;
  }

  if (buffer) parts.push({ type: "text", value: buffer });
  return parts.filter((part) => part.value);
}

function isMathSegmentStart(line, index) {
  const char = line[index];
  if (char === "\\") return true;
  if (/[0-9]/.test(char)) return true;
  if (char === "(") {
    const close = line.indexOf(")", index + 1);
    const inside = close >= 0 ? line.slice(index + 1, close) : "";
    return /[\\0-9=+\-*/^_]/.test(inside);
  }
  return false;
}

function readInlineMathSegment(line, start) {
  let index = start;
  let depth = 0;
  while (index < line.length) {
    const char = line[index];
    if (char === "\\") {
      index += 1;
      while (/[A-Za-z]/.test(line[index] || "")) index += 1;
      continue;
    }
    if (char === "{" || char === "(" || char === "[") depth += 1;
    if (char === "}" || char === ")" || char === "]") depth = Math.max(0, depth - 1);
    if (depth === 0 && /\s/.test(char)) break;
    if (depth === 0 && /[\u0900-\u097F]/.test(char)) break;
    if (!/[0-9A-Za-z\\{}()[\]^_+\-*/=<>.|,]/.test(char)) break;
    index += 1;
  }

  const raw = line.slice(start, index);
  const trailingMatch = raw.match(/([,.;:]+)$/);
  const trailing = trailingMatch ? trailingMatch[1] : "";
  const value = trailing ? raw.slice(0, -trailing.length) : raw;
  return { value, trailing, end: index };
}

function trimMathPunctuation(value = "") {
  return String(value).replace(/^[,.;:]+|[,.;:]+$/g, "");
}

class MathParser {
  constructor(source) {
    this.source = source;
    this.index = 0;
  }

  parse() {
    return this.parseUntil();
  }

  parseUntil(stopChar = "") {
    const parts = [];
    while (this.index < this.source.length) {
      this.skipSpaces();
      if (stopChar && this.peek() === stopChar) break;
      if (this.startsWith("\\right")) break;
      const atom = this.parseAtom();
      if (atom) parts.push(atom);
    }
    return parts.join("");
  }

  parseAtom() {
    this.skipSpaces();
    const base = this.parseBase();
    return this.withScripts(base);
  }

  parseBase() {
    const char = this.peek();
    if (!char) return "";
    if (char === "{") return this.parseGroup();
    if (char === "\\") return this.parseCommand();
    if (char === "&") {
      this.index += 1;
      return "";
    }
    if (isOperator(char)) {
      this.index += 1;
      return `<mo>${escapeHtml(char)}</mo>`;
    }
    if (isDelimiter(char)) {
      this.index += 1;
      return `<mo stretchy="false">${escapeHtml(char)}</mo>`;
    }
    if (/[0-9.]/.test(char)) return this.parseNumber();
    if (/[A-Za-z]/.test(char)) return this.parseIdentifier();
    this.index += 1;
    return `<mi>${escapeHtml(char)}</mi>`;
  }

  parseCommand() {
    this.index += 1;
    const name = this.readCommandName();
    if (name === "\\") return '<mspace linebreak="newline"></mspace>';
    if (["frac", "dfrac", "tfrac", "cfrac"].includes(name)) return this.parseFraction();
    if (name === "binom") return this.parseBinomial();
    if (name === "sqrt") return this.parseSqrt();
    if (name === "left") return this.parseLeftRightGroup();
    if (name === "right") return "";
    if (name === "begin") return this.parseEnvironment();
    if (["text", "mbox"].includes(name)) return `<mtext>${escapeHtml(this.readRawRequiredGroup())}</mtext>`;
    if (styleCommands[name]) return `<mstyle mathvariant="${styleCommands[name]}">${this.parseRequiredGroup()}</mstyle>`;
    if (accentCommands[name]) return `<mover accent="true">${wrap(this.parseRequiredGroup())}<mo>${accentCommands[name]}</mo></mover>`;
    if (name === "boxed") return `<menclose notation="box">${this.parseRequiredGroup()}</menclose>`;
    if (name === "cancel") return `<menclose notation="updiagonalstrike">${this.parseRequiredGroup()}</menclose>`;
    if (spacingCommands.has(name)) return '<mspace width="0.55em"></mspace>';
    if (delimiterCommands[name]) return `<mo stretchy="true">${escapeHtml(delimiterCommands[name])}</mo>`;
    if (bigOperators[name]) return `<mo movablelimits="true">${bigOperators[name]}</mo>`;
    if (functionNames.has(name)) return `<mi mathvariant="normal">${escapeHtml(name)}</mi>`;
    if (symbolCommands[name]) return symbolCommands[name];
    return `<mi>${escapeHtml(`\\${name}`)}</mi>`;
  }

  parseFraction() {
    const numerator = this.parseRequiredGroup();
    const denominator = this.parseRequiredGroup();
    return `<mfrac>${wrap(numerator)}${wrap(denominator)}</mfrac>`;
  }

  parseSqrt() {
    const rootIndex = this.peek() === "[" ? this.parseOptionalBracket() : "";
    const radicand = this.parseRequiredGroup();
    if (rootIndex) return `<mroot>${wrap(radicand)}${wrap(rootIndex)}</mroot>`;
    return `<msqrt>${radicand}</msqrt>`;
  }

  parseBinomial() {
    const top = this.parseRequiredGroup();
    const bottom = this.parseRequiredGroup();
    return `<mrow><mo stretchy="true">(</mo><mfrac linethickness="0">${wrap(top)}${wrap(bottom)}</mfrac><mo stretchy="true">)</mo></mrow>`;
  }

  parseLeftRightGroup() {
    this.skipSpaces();
    const left = this.readDelimiter();
    const content = this.parseUntil();
    if (this.startsWith("\\right")) {
      this.index += "\\right".length;
      this.skipSpaces();
    }
    const right = this.readDelimiter();
    const leftHtml = left === "." ? "" : renderStretchDelimiter(left, "left");
    const rightHtml = right === "." ? "" : renderStretchDelimiter(right, "right");
    return `<mrow class="stretch-group">${leftHtml}${content}${rightHtml}</mrow>`;
  }

  parseEnvironment() {
    const env = this.readRawRequiredGroup();
    if (env === "array") this.readRawRequiredGroup();
    const endToken = `\\end{${env}}`;
    const start = this.index;
    const end = this.source.indexOf(endToken, start);
    const inner = end >= 0 ? this.source.slice(start, end) : this.source.slice(start);
    this.index = end >= 0 ? end + endToken.length : this.source.length;
    if (matrixEnvironments[env]) return renderMatrix(env, inner);
    if (["aligned", "align", "align*", "gather", "gather*", "split"].includes(env)) return renderAligned(inner);
    if (env === "cases") return renderCases(inner);
    return new MathParser(inner).parse();
  }

  parseGroup() {
    if (this.peek() !== "{") return this.parseAtom();
    this.index += 1;
    const content = this.parseUntil("}");
    if (this.peek() === "}") this.index += 1;
    return `<mrow>${content}</mrow>`;
  }

  parseRequiredGroup() {
    this.skipSpaces();
    if (this.peek() === "{") return this.parseGroup();
    return this.parseAtom();
  }

  parseOptionalBracket() {
    if (this.peek() !== "[") return "";
    this.index += 1;
    const content = this.parseUntil("]");
    if (this.peek() === "]") this.index += 1;
    return content;
  }

  withScripts(base) {
    let sub = "";
    let sup = "";
    while (true) {
      const before = this.index;
      this.skipSpaces();
      const marker = this.peek();
      if (marker !== "^" && marker !== "_") {
        this.index = before;
        break;
      }
      this.index += 1;
      if (marker === "^") sup = this.parseRequiredGroup();
      if (marker === "_") sub = this.parseRequiredGroup();
    }
    if (sub && sup) return `<msubsup>${wrap(base)}${wrap(sub)}${wrap(sup)}</msubsup>`;
    if (sub) return `<msub>${wrap(base)}${wrap(sub)}</msub>`;
    if (sup) return `<msup>${wrap(base)}${wrap(sup)}</msup>`;
    return base;
  }

  parseNumber() {
    const start = this.index;
    while (/[0-9.]/.test(this.peek())) this.index += 1;
    return `<mn>${escapeHtml(this.source.slice(start, this.index))}</mn>`;
  }

  parseIdentifier() {
    const char = this.peek();
    this.index += 1;
    return `<mi>${escapeHtml(char)}</mi>`;
  }

  readCommandName() {
    const start = this.index;
    while (/[A-Za-z]/.test(this.peek())) this.index += 1;
    if (this.index === start && this.peek()) this.index += 1;
    return this.source.slice(start, this.index);
  }

  readDelimiter() {
    this.skipSpaces();
    if (!this.peek()) return "";
    if (this.peek() === "\\") {
      this.index += 1;
      const name = this.readCommandName();
      return delimiterCommands[name] || symbolPlainText[name] || name;
    }
    const char = this.peek();
    this.index += 1;
    return char;
  }

  readRawRequiredGroup() {
    this.skipSpaces();
    if (this.peek() !== "{") return "";
    this.index += 1;
    let depth = 1;
    const start = this.index;
    while (this.index < this.source.length && depth > 0) {
      const char = this.source[this.index];
      if (char === "\\") {
        this.index += 2;
        continue;
      }
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
      if (depth > 0) this.index += 1;
    }
    const raw = this.source.slice(start, this.index);
    if (this.peek() === "}") this.index += 1;
    return raw;
  }

  startsWith(value) {
    return this.source.startsWith(value, this.index);
  }

  peek() {
    return this.source[this.index] || "";
  }

  skipSpaces() {
    while (this.peek() === " ") this.index += 1;
  }
}

function renderMatrix(env, inner) {
  const [left, right] = matrixEnvironments[env];
  const rows = splitRows(inner).map((row) => splitCells(row).map((cell) => new MathParser(cell).parse()));
  return `<mrow>${left ? `<mo stretchy="true">${escapeHtml(left)}</mo>` : ""}<mtable>${rows.map((row) => `<mtr>${row.map((cell) => `<mtd>${wrap(cell)}</mtd>`).join("")}</mtr>`).join("")}</mtable>${right ? `<mo stretchy="true">${escapeHtml(right)}</mo>` : ""}</mrow>`;
}

function renderAligned(inner) {
  const rows = splitRows(inner).map((row) => splitCells(row).map((cell) => new MathParser(cell).parse()));
  return `<mtable columnalign="right left">${rows.map((row) => `<mtr>${row.map((cell) => `<mtd>${wrap(cell)}</mtd>`).join("")}</mtr>`).join("")}</mtable>`;
}

function renderCases(inner) {
  const rows = splitRows(inner).map((row) => splitCells(row).map((cell) => new MathParser(cell).parse()));
  return `<mrow><mo stretchy="true">{</mo><mtable>${rows.map((row) => `<mtr>${row.map((cell) => `<mtd>${wrap(cell)}</mtd>`).join("")}</mtr>`).join("")}</mtable></mrow>`;
}

function splitRows(value) {
  return value.split(/\\\\/).map((row) => row.trim()).filter(Boolean);
}

function splitCells(value) {
  return value.split("&").map((cell) => cell.trim());
}

function wrap(value) {
  return `<mrow>${value}</mrow>`;
}

function renderStretchDelimiter(value, side) {
  const escaped = escapeHtml(value);
  const fenceClass = `stretch-fence stretch-fence-${side}`;
  return `<mo stretchy="true" symmetric="true" fence="true" class="${fenceClass}">${escaped}</mo>`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isOperator(char) {
  return ["+", "-", "=", "?", ",", ":", ";", "<", ">"].includes(char);
}

function isDelimiter(char) {
  return ["(", ")", "[", "]", "|"].includes(char);
}

const functionNames = new Set(["sin", "cos", "tan", "cot", "sec", "csc", "log", "ln", "lim", "max", "min", "det"]);
const spacingCommands = new Set(["quad", "qquad", ",", ";", ":", "!", " ", "enspace", "thinspace", "medspace"]);

const styleCommands = {
  mathrm: "normal",
  mathbf: "bold",
  mathit: "italic",
  mathsf: "sans-serif",
  mathtt: "monospace",
  mathcal: "script",
  mathbb: "double-struck",
};

const accentCommands = {
  overline: "&#x00AF;",
  bar: "&#x00AF;",
  hat: "^",
  vec: "&#x2192;",
  tilde: "~",
  dot: ".",
  ddot: "..",
};

const bigOperators = {
  sum: "&#x2211;",
  prod: "&#x220F;",
  coprod: "&#x2210;",
  int: "&#x222B;",
  iint: "&#x222C;",
  iiint: "&#x222D;",
  oint: "&#x222E;",
};

const delimiterCommands = {
  "(": "(",
  ")": ")",
  "[": "[",
  "]": "]",
  "{": "{",
  "}": "}",
  lbrace: "{",
  rbrace: "}",
  lbrack: "[",
  rbrack: "]",
  langle: "\u27E8",
  rangle: "\u27E9",
  lceil: "\u2308",
  rceil: "\u2309",
  lfloor: "\u230A",
  rfloor: "\u230B",
  vert: "|",
  Vert: "||",
  "|": "|",
};

const symbolCommands = {
  theta: "<mi>&#x03B8;</mi>",
  alpha: "<mi>&#x03B1;</mi>",
  beta: "<mi>&#x03B2;</mi>",
  gamma: "<mi>&#x03B3;</mi>",
  delta: "<mi>&#x03B4;</mi>",
  Delta: "<mi>&#x0394;</mi>",
  lambda: "<mi>&#x03BB;</mi>",
  mu: "<mi>&#x03BC;</mi>",
  sigma: "<mi>&#x03C3;</mi>",
  Sigma: "<mi>&#x03A3;</mi>",
  Omega: "<mi>&#x03A9;</mi>",
  pi: "<mi>&#x03C0;</mi>",
  pm: "<mo>&#x00B1;</mo>",
  mp: "<mo>&#x2213;</mo>",
  times: "<mo>&#x00D7;</mo>",
  div: "<mo>&#x00F7;</mo>",
  cdot: "<mo>&#x00B7;</mo>",
  dots: "<mo>&#x2026;</mo>",
  ldots: "<mo>&#x2026;</mo>",
  cdots: "<mo>&#x22EF;</mo>",
  angle: "<mo>&#x2220;</mo>",
  le: "<mo>&#x2264;</mo>",
  leq: "<mo>&#x2264;</mo>",
  ge: "<mo>&#x2265;</mo>",
  geq: "<mo>&#x2265;</mo>",
  neq: "<mo>&#x2260;</mo>",
  approx: "<mo>&#x2248;</mo>",
  sim: "<mo>&#x223C;</mo>",
  propto: "<mo>&#x221D;</mo>",
  infty: "<mi>&#x221E;</mi>",
  partial: "<mo>&#x2202;</mo>",
  nabla: "<mo>&#x2207;</mo>",
  forall: "<mo>&#x2200;</mo>",
  exists: "<mo>&#x2203;</mo>",
  in: "<mo>&#x2208;</mo>",
  notin: "<mo>&#x2209;</mo>",
  subset: "<mo>&#x2282;</mo>",
  subseteq: "<mo>&#x2286;</mo>",
  cup: "<mo>&#x222A;</mo>",
  cap: "<mo>&#x2229;</mo>",
  to: "<mo>&#x2192;</mo>",
  rightarrow: "<mo>&#x2192;</mo>",
  leftarrow: "<mo>&#x2190;</mo>",
  leftrightarrow: "<mo>&#x2194;</mo>",
  Rightarrow: "<mo>&#x21D2;</mo>",
  Leftarrow: "<mo>&#x21D0;</mo>",
  Leftrightarrow: "<mo>&#x21D4;</mo>",
  therefore: "<mo>&#x2234;</mo>",
  because: "<mo>&#x2235;</mo>",
  circ: "<mo>&#x00B0;</mo>",
};

const symbolPlainText = {
  ...delimiterCommands,
  theta: "\u03B8",
  pi: "\u03C0",
};

const matrixEnvironments = {
  matrix: ["", ""],
  pmatrix: ["(", ")"],
  bmatrix: ["[", "]"],
  Bmatrix: ["{", "}"],
  vmatrix: ["|", "|"],
  Vmatrix: ["||", "||"],
  array: ["", ""],
};
