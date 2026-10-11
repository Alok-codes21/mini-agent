// latex.js - AI kabhi kabhi LaTeX likh deta hai; Telegram usse render nahi karta.
// Yeh LaTeX ko Unicode plain text mein badal deta hai.

const SUB = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','=':'₌','(':'₍',')':'₎','a':'ₐ','e':'ₑ','i':'ᵢ','j':'ⱼ','k':'ₖ','n':'ₙ','m':'ₘ','o':'ₒ','p':'ₚ','r':'ᵣ','s':'ₛ','t':'ₜ','x':'ₓ' };
const SUP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾','n':'ⁿ','i':'ⁱ' };

const SYMBOLS = {
  alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',varepsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',vartheta:'θ',iota:'ι',kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',phi:'φ',varphi:'φ',chi:'χ',psi:'ψ',omega:'ω',
  Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',Phi:'Φ',Psi:'Ψ',Omega:'Ω',
  times:'×',cdot:'·',div:'÷',pm:'±',mp:'∓',leq:'≤',le:'≤',geq:'≥',ge:'≥',neq:'≠',ne:'≠',approx:'≈',equiv:'≡',propto:'∝',sim:'∼',
  infty:'∞',partial:'∂',nabla:'∇',degree:'°',circ:'°',rightarrow:'→',to:'→',leftarrow:'←',Rightarrow:'⇒',Leftrightarrow:'⇔',leftrightarrow:'↔',
  int:'∫',sum:'∑',prod:'∏',hbar:'ħ',ell:'ℓ',angle:'∠',perp:'⊥',parallel:'∥',in:'∈',cup:'∪',cap:'∩',ldots:'…',dots:'…',cdots:'⋯',
  sin:'sin',cos:'cos',tan:'tan',log:'log',ln:'ln',exp:'exp',lim:'lim',max:'max',min:'min',
};

function mapChars(s, table) {
  const out = [...s].map((c) => table[c]);
  return out.every(Boolean) ? out.join('') : null;
}

function braced(s, i) { // s[i] == '{' -> returns [inner, indexAfter]
  let d = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '{') d++;
    else if (s[j] === '}' && --d === 0) return [s.slice(i + 1, j), j + 1];
  }
  return null;
}

// \cmd{a}{b} jaise 2-arg commands ko fn se replace karo (nested bhi chalega)
function replaceCmd(s, cmd, nargs, fn) {
  const re = new RegExp('\\\\' + cmd + '(?![a-zA-Z])\\s*');
  for (let guard = 0; guard < 200; guard++) {
    const m = re.exec(s);
    if (!m) break;
    let pos = m.index + m[0].length;
    const args = [];
    for (let k = 0; k < nargs; k++) {
      while (s[pos] === ' ') pos++;
      if (s[pos] === '{') {
        const b = braced(s, pos);
        if (!b) break;
        args.push(b[0]); pos = b[1];
      } else if (pos < s.length) { args.push(s[pos]); pos++; }
    }
    if (args.length < nargs) { s = s.slice(0, m.index) + s.slice(m.index + m[0].length); continue; }
    s = s.slice(0, m.index) + fn(...args) + s.slice(pos);
  }
  return s;
}

const wrap = (x) => (/^[\w.·₀-₉⁰-⁹]+$/u.test(x) ? x : `(${x})`);

function convertMath(m) {
  let s = m;
  s = replaceCmd(s, 'frac', 2, (a, b) => `${wrap(convertMath(a))}/${wrap(convertMath(b))}`);
  s = replaceCmd(s, 'dfrac', 2, (a, b) => `${wrap(convertMath(a))}/${wrap(convertMath(b))}`);
  s = replaceCmd(s, 'tfrac', 2, (a, b) => `${wrap(convertMath(a))}/${wrap(convertMath(b))}`);
  s = replaceCmd(s, 'sqrt', 1, (a) => { a = convertMath(a); return `√${/^[\w.]+$/.test(a) ? a : `(${a})`}`; });
  s = replaceCmd(s, 'vec', 1, (a) => `${a}⃗`);
  s = replaceCmd(s, 'hat', 1, (a) => `${a}̂`);
  s = replaceCmd(s, 'bar', 1, (a) => `${a}̄`);
  for (const c of ['text', 'mathrm', 'mathbf', 'mathit', 'textbf', 'textit', 'operatorname', 'boldsymbol', 'mathcal'])
    s = replaceCmd(s, c, 1, (a) => a);
  s = replaceCmd(s, 'left', 0, () => '');
  s = s.replace(/\\(left|right)(?![a-zA-Z])\s*/g, '');
  s = s.replace(/\\(,|;|:|!|quad|qquad)/g, ' ').replace(/\\ /g, ' ');
  s = s.replace(/\\([a-zA-Z]+)/g, (all, name) => (name in SYMBOLS ? SYMBOLS[name] : all));
  // subscripts / superscripts
  s = s.replace(/([_^])\{([^{}]*)\}|([_^])([A-Za-z0-9+\-])/g, (all, a, g1, b, g2) => {
    const op = a || b, body = g1 !== undefined ? g1 : g2;
    const mapped = mapChars(body, op === '_' ? SUB : SUP);
    if (mapped) return mapped;
    if (op === '^') return body.length === 1 ? `^${body}` : `^(${body})`;
    return body.length === 1 ? `_${body}` : `_(${body})`;
  });
  s = s.replace(/\\\\/g, ' ').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  return s;
}

export function latexToUnicode(text) {
  if (!text) return text;
  let s = text;
  // math delimiters: $$..$$, \[..\], \(..\), $..$ (sirf jab andar LaTeX jaisa kuch ho)
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => convertMath(m));
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => convertMath(m));
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => convertMath(m));
  s = s.replace(/\$([^$\n]*[\\^_{][^$\n]*)\$/g, (_, m) => convertMath(m));
  // delimiter ke bina bacha hua LaTeX (jaise seedha \frac{..}{..})
  if (/\\[a-zA-Z]+/.test(s)) s = convertMath(s).replace(/\n/g, '\n');
  return s;
}
