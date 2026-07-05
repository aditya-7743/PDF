export function normalizeMathInput(input = "") {
  return cleanMathLine(input)
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(^|[^\\A-Za-z])(sin|cos|tan|cot|sec|csc|log|ln|lim|max|min|det)(?=\s|\(|\{|\^|_|[A-Za-z0-9])/g, "$1\\$2")
    .trim();
}

export function smartCleanMathInput(input = "") {
  return String(input)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => cleanPastedLine(line))
    .filter((line) => line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getEquationDiagnostics(input = "") {
  const source = String(input || "");
  if (!source.trim()) {
    return {
      level: "empty",
      title: "Ready",
      message: "Paste or type equation.",
      issues: [],
      canFix: false,
    };
  }

  const issues = [...findLeftRightIssues(source), ...findPlainBracketIssues(source)];
  if (!issues.length) {
    return {
      level: "ok",
      title: "Bracket OK",
      message: "No bracket mismatch found.",
      issues,
      canFix: false,
    };
  }

  return {
    level: "warn",
    title: "Bracket Check",
    message: issues[0],
    issues,
    canFix: true,
  };
}

export function autoFixEquationInput(input = "") {
  return balancePlainBrackets(autoFixLeftRightPairs(smartCleanMathInput(input)));
}

function cleanMathLine(input = "") {
  return normalizeUnicodeMath(String(input))
    .replace(/```(?:latex|tex|math)?/gi, "")
    .replace(/```/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s*/g, "")
    .replace(/^\s*(?:latex|tex|math)\s*[:\uFF1A]\s*/i, "")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\dfrac/g, "\\frac")
    .replace(/\\tfrac/g, "\\frac")
    .replace(/\\cfrac/g, "\\frac")
    .replace(/\\displaystyle/g, "")
    .replace(/\\textstyle/g, "")
    .replace(/\\scriptstyle/g, "")
    .replace(/\\scriptscriptstyle/g, "")
    .replace(/\\,/g, " ")
    .replace(/\\;/g, " ")
    .replace(/\\:/g, " ")
    .replace(/\\sqrt\s*([A-Za-z0-9.]+)/g, "\\sqrt{$1}")
    .replace(/\b([0-9A-Za-z])\s*\/\s*([0-9A-Za-z])\b/g, "\\frac{$1}{$2}")
    .replace(/\r/g, "")
    .trim();
}

function cleanPastedLine(line = "") {
  const cleaned = normalizeMathInput(line);
  if (/^(?:\[|\]|\\\[|\\\]|\\begin\{equation\*?\}|\\end\{equation\*?\})$/.test(cleaned.trim())) {
    return null;
  }
  return cleaned;
}

function normalizeUnicodeMath(source) {
  const replacements = {
    "\u2212": "-",
    "\u2013": "-",
    "\u2014": "-",
    "\u00D7": "\\times ",
    "\u00F7": "\\div ",
    "\u00B7": "\\cdot ",
    "\u221A": "\\sqrt",
    "\u2264": "\\le ",
    "\u2265": "\\ge ",
    "\u2260": "\\neq ",
    "\u2248": "\\approx ",
    "\u221E": "\\infty ",
    "\u03C0": "\\pi ",
    "\u03B8": "\\theta ",
    "\u03B1": "\\alpha ",
    "\u03B2": "\\beta ",
    "\u03B3": "\\gamma ",
    "\u03B4": "\\delta ",
    "\u0394": "\\Delta ",
    "\u03BB": "\\lambda ",
    "\u03BC": "\\mu ",
    "\u03C3": "\\sigma ",
    "\u03A3": "\\Sigma ",
    "\u03A9": "\\Omega ",
    "\u2192": "\\to ",
    "\u2190": "\\leftarrow ",
    "\u2194": "\\leftrightarrow ",
    "\u21D2": "\\Rightarrow ",
    "\u21D4": "\\Leftrightarrow ",
    "\u00B0": "^\\circ ",
    "âˆ’": "-",
    "â€“": "-",
    "â€”": "-",
    "Ã—": "\\times ",
    "Ã·": "\\div ",
    "Â·": "\\cdot ",
    "âˆš": "\\sqrt",
    "â‰¤": "\\le ",
    "â‰¥": "\\ge ",
    "â‰ ": "\\neq ",
    "â‰ˆ": "\\approx ",
    "âˆž": "\\infty ",
    "Ï€": "\\pi ",
    "Î¸": "\\theta ",
    "Î±": "\\alpha ",
    "Î²": "\\beta ",
    "Î³": "\\gamma ",
    "Î´": "\\delta ",
    "Î”": "\\Delta ",
    "Î»": "\\lambda ",
    "Î¼": "\\mu ",
    "Ïƒ": "\\sigma ",
    "Î£": "\\Sigma ",
    "Î©": "\\Omega ",
    "â†’": "\\to ",
    "â†": "\\leftarrow ",
    "â†”": "\\leftrightarrow ",
    "â‡’": "\\Rightarrow ",
    "â‡”": "\\Leftrightarrow ",
    "Â°": "^\\circ ",
  };
  let output = source;
  Object.entries(replacements).forEach(([from, to]) => {
    output = output.split(from).join(to);
  });
  return output;
}

function findLeftRightIssues(source) {
  const issues = [];
  const stack = [];
  for (const token of readFenceTokens(source)) {
    if (token.kind === "left") {
      if (token.delimiter !== ".") stack.push(token);
      continue;
    }

    if (!stack.length) {
      issues.push("Extra \\right found without matching \\left.");
      continue;
    }

    const left = stack.pop();
    const expected = matchingDelimiter(left.delimiter);
    if (expected && token.delimiter !== "." && token.delimiter !== expected) {
      issues.push(`Expected \\right${latexDelimiter(expected)} but found \\right${latexDelimiter(token.delimiter)}.`);
    }
  }

  if (stack.length) {
    const left = stack[stack.length - 1];
    issues.push(`Missing \\right${latexDelimiter(matchingDelimiter(left.delimiter) || ".")} for \\left${latexDelimiter(left.delimiter)}.`);
  }

  return issues;
}

function findPlainBracketIssues(source) {
  const stripped = source.replace(/\\(?:left|right)\s*(?:\\[A-Za-z]+|\\[{}]|\.|[()[\]{}|])/g, "");
  const stack = [];
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const closes = new Set(Object.values(pairs));
  const issues = [];

  for (let index = 0; index < stripped.length; index += 1) {
    const char = stripped[index];
    if (stripped[index - 1] === "\\") continue;
    if (pairs[char]) {
      stack.push(char);
      continue;
    }
    if (!closes.has(char)) continue;
    const left = stack.pop();
    if (!left || pairs[left] !== char) {
      issues.push(`Plain bracket mismatch near "${char}".`);
      break;
    }
  }

  if (stack.length) {
    issues.push(`Missing closing "${pairs[stack[stack.length - 1]]}" bracket.`);
  }

  return issues;
}

function autoFixLeftRightPairs(source) {
  const tokens = readFenceTokens(source);
  if (!tokens.length) return source;

  let output = "";
  let cursor = 0;
  const stack = [];

  tokens.forEach((token) => {
    output += source.slice(cursor, token.start);
    cursor = token.end;

    if (token.kind === "left") {
      output += token.raw;
      if (token.delimiter !== ".") stack.push(token);
      return;
    }

    if (!stack.length) {
      output += token.delimiter === "." ? "" : latexDelimiter(token.delimiter);
      return;
    }

    const left = stack.pop();
    const expected = matchingDelimiter(left.delimiter) || token.delimiter || ".";
    output += `\\right${latexDelimiter(expected)}`;
  });

  output += source.slice(cursor);
  while (stack.length) {
    const left = stack.pop();
    output += ` \\right${latexDelimiter(matchingDelimiter(left.delimiter) || ".")}`;
  }

  return output;
}

function balancePlainBrackets(source) {
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const closes = new Set(Object.values(pairs));
  const stack = [];
  let output = "";

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    output += char;
    if (source[index - 1] === "\\") continue;
    if (pairs[char]) {
      stack.push(char);
      continue;
    }
    if (!closes.has(char)) continue;
    const left = stack[stack.length - 1];
    if (left && pairs[left] === char) {
      stack.pop();
    }
  }

  while (stack.length) {
    output += pairs[stack.pop()];
  }

  return output;
}

function readFenceTokens(source) {
  const tokens = [];
  const pattern = /\\(left|right)\s*(\\[A-Za-z]+|\\[{}]|\.|[()[\]{}|])/g;
  let match = pattern.exec(source);
  while (match) {
    tokens.push({
      kind: match[1],
      delimiter: normalizeDelimiter(match[2]),
      raw: match[0],
      start: match.index,
      end: pattern.lastIndex,
    });
    match = pattern.exec(source);
  }
  return tokens;
}

function normalizeDelimiter(value) {
  const delimiters = {
    "\\{": "{",
    "\\}": "}",
    "\\lbrace": "{",
    "\\rbrace": "}",
    "\\lbrack": "[",
    "\\rbrack": "]",
    "\\langle": "<",
    "\\rangle": ">",
    "\\vert": "|",
    "\\Vert": "||",
  };
  return delimiters[value] || value;
}

function matchingDelimiter(value) {
  return {
    "(": ")",
    "[": "]",
    "{": "}",
    "<": ">",
    "|": "|",
    "||": "||",
  }[value] || "";
}

function latexDelimiter(value) {
  return (
    {
      "{": "\\{",
      "}": "\\}",
      "<": "\\langle",
      ">": "\\rangle",
      "||": "\\Vert",
    }[value] || value || "."
  );
}
