export const sampleBranch = {
  id: "samples",
  samples: [
    {
      id: "radical-chain",
      label: "Radical Chain",
      latex:
        "$$ \\left( \\frac{1}{3 - \\sqrt{8}} \\right) - \\left( \\frac{1}{\\sqrt{8} - \\sqrt{7}} \\right) + \\left( \\frac{1}{\\sqrt{7} - \\sqrt{6}} \\right) - \\left( \\frac{1}{\\sqrt{6} - \\sqrt{5}} \\right) + \\left( \\frac{1}{\\sqrt{5} - 2} \\right) = ? $$",
    },
    {
      id: "quadratic",
      label: "Quadratic",
      latex: "\\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\]",
    },
    {
      id: "trig",
      label: "Trigo Identity",
      latex: "$$ \\sin^2 \\theta + \\cos^2 \\theta = 1, \\quad \\tan \\theta = \\frac{\\sin \\theta}{\\cos \\theta} $$",
    },
    {
      id: "mensuration",
      label: "Mensuration",
      latex: "$$ V = \\frac{1}{3}\\pi r^2 h, \\quad A = 2\\pi r(r+h) $$",
    },
    {
      id: "calculus",
      label: "Calculus",
      latex: "$$ \\lim_{x \\to 0} \\frac{\\sin x}{x} = 1, \\quad \\int_0^1 x^2\\,dx = \\frac{1}{3} $$",
    },
    {
      id: "matrix",
      label: "Matrix",
      latex: "$$ A = \\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}, \\quad \\det(A) = -2 $$",
    },
    {
      id: "aligned",
      label: "Aligned Steps",
      latex: "\\begin{aligned} (a+b)^2 &= (a+b)(a+b) \\\\ &= a^2 + 2ab + b^2 \\end{aligned}",
    },
  ],
  snippets: [
    { label: "Fraction", latex: "\\frac{a}{b}" },
    { label: "Root", latex: "\\sqrt{x}" },
    { label: "Power", latex: "x^2" },
    { label: "Limit", latex: "\\lim_{x \\to 0}" },
    { label: "Integral", latex: "\\int_0^1 x\\,dx" },
    { label: "Matrix", latex: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}" },
  ],
};
