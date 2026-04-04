type ParsePos = { i: number }

const SAFE_FUNCS: Record<string, (x: number) => number> = {
  abs: Math.abs,
  sqrt: Math.sqrt,
  log: Math.log,
  log2: Math.log2,
  log10: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  min: Math.min,
  max: Math.max,
}

function tokenize(formula: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < formula.length) {
    const ch = formula[i]
    if (/\s/.test(ch)) { i++; continue }

    if ('+-*/^()'.includes(ch)) {
      tokens.push(ch)
      i++
      continue
    }

    if (/[0-9.]/.test(ch)) {
      let num = ''
      while (i < formula.length && /[0-9.eE]/.test(formula[i])) {
        num += formula[i++]
        if ((formula[i - 1] === 'e' || formula[i - 1] === 'E') && (formula[i] === '+' || formula[i] === '-')) {
          num += formula[i++]
        }
      }
      tokens.push(num)
      continue
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let name = ''
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
        name += formula[i++]
      }
      tokens.push(name)
      continue
    }

    i++
  }
  return tokens
}

function parseAtom(tokens: string[], pos: ParsePos, vars: Record<string, number>): number {
  const token = tokens[pos.i]
  if (token === undefined) return 0

  if (token === '(') {
    pos.i++
    const val = parseExpression(tokens, pos, vars)
    if (tokens[pos.i] === ')') pos.i++
    return val
  }

  if (/^[0-9.]/.test(token)) {
    pos.i++
    return parseFloat(token)
  }

  if (/^[a-zA-Z_]/.test(token)) {
    pos.i++
    const fn = SAFE_FUNCS[token]
    if (fn && pos.i < tokens.length && tokens[pos.i] === '(') {
      pos.i++
      const arg = parseExpression(tokens, pos, vars)
      if (tokens[pos.i] === ')') pos.i++
      return fn(arg)
    }
    if (token in vars) return vars[token]
    return 0
  }

  pos.i++
  return 0
}

function parseUnary(tokens: string[], pos: ParsePos, vars: Record<string, number>): number {
  if (pos.i < tokens.length && tokens[pos.i] === '-') {
    pos.i++
    return -parseAtom(tokens, pos, vars)
  }
  if (pos.i < tokens.length && tokens[pos.i] === '+') {
    pos.i++
  }
  return parseAtom(tokens, pos, vars)
}

function parsePower(tokens: string[], pos: ParsePos, vars: Record<string, number>): number {
  let base = parseUnary(tokens, pos, vars)
  while (pos.i < tokens.length && tokens[pos.i] === '^') {
    pos.i++
    base = Math.pow(base, parseUnary(tokens, pos, vars))
  }
  return base
}

function parseTerm(tokens: string[], pos: ParsePos, vars: Record<string, number>): number {
  let left = parsePower(tokens, pos, vars)
  while (pos.i < tokens.length && (tokens[pos.i] === '*' || tokens[pos.i] === '/')) {
    const op = tokens[pos.i++]
    const right = parsePower(tokens, pos, vars)
    left = op === '*' ? left * right : left / right
  }
  return left
}

function parseExpression(tokens: string[], pos: ParsePos, vars: Record<string, number>): number {
  let left = parseTerm(tokens, pos, vars)
  while (pos.i < tokens.length && (tokens[pos.i] === '+' || tokens[pos.i] === '-')) {
    const op = tokens[pos.i++]
    const right = parseTerm(tokens, pos, vars)
    left = op === '+' ? left + right : left - right
  }
  return left
}

export function evaluateFormula(formula: string, vars: Record<string, number>): number {
  const tokens = tokenize(formula)
  return parseExpression(tokens, { i: 0 }, vars)
}
