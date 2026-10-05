// A restricted arithmetic expression evaluator for the LLM's formula
// strings (e.g. "sqrt(width * height) / 2"). The spec deliberately asks the
// model for a formula STRING, not executable code — evaluating that with
// `eval`/`new Function` would still run arbitrary JS if anything ever
// smuggled some in (e.g. via a prompt-injected brief). This only ever
// recognizes numbers, named variables, +-*/^, parentheses, and a fixed
// whitelist of math functions — nothing else can execute.

type Token =
  | { type: "num"; value: number }
  | { type: "ident"; value: string }
  | { type: "op"; value: string }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "comma" };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      const value = Number(expr.slice(i, j));
      if (Number.isNaN(value)) throw new Error(`Invalid number in formula: "${expr.slice(i, j)}"`);
      tokens.push({ type: "num", value });
      i = j;
    } else if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < expr.length && /[a-zA-Z0-9_]/.test(expr[j])) j++;
      tokens.push({ type: "ident", value: expr.slice(i, j) });
      i = j;
    } else if ("+-*/^".includes(c)) {
      tokens.push({ type: "op", value: c });
      i++;
    } else if (c === "(") {
      tokens.push({ type: "lparen" });
      i++;
    } else if (c === ")") {
      tokens.push({ type: "rparen" });
      i++;
    } else if (c === ",") {
      tokens.push({ type: "comma" });
      i++;
    } else {
      throw new Error(`Unexpected character in formula: "${c}"`);
    }
  }
  return tokens;
}

type Node =
  | { type: "num"; value: number }
  | { type: "var"; name: string }
  | { type: "binary"; op: string; left: Node; right: Node }
  | { type: "unary"; op: string; arg: Node }
  | { type: "call"; name: string; args: Node[] };

const ALLOWED_FUNCTIONS = new Set(["min", "max", "sqrt", "abs", "pow", "log", "exp"]);

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private expectOp(value: string): boolean {
    const t = this.peek();
    if (t?.type === "op" && t.value === value) {
      this.pos++;
      return true;
    }
    return false;
  }

  parseExpression(): Node {
    let node = this.parseTerm();
    for (;;) {
      if (this.expectOp("+")) node = { type: "binary", op: "+", left: node, right: this.parseTerm() };
      else if (this.expectOp("-")) node = { type: "binary", op: "-", left: node, right: this.parseTerm() };
      else break;
    }
    return node;
  }

  private parseTerm(): Node {
    let node = this.parsePower();
    for (;;) {
      if (this.expectOp("*")) node = { type: "binary", op: "*", left: node, right: this.parsePower() };
      else if (this.expectOp("/")) node = { type: "binary", op: "/", left: node, right: this.parsePower() };
      else break;
    }
    return node;
  }

  private parsePower(): Node {
    const node = this.parseUnary();
    if (this.expectOp("^")) {
      // Right-associative.
      return { type: "binary", op: "^", left: node, right: this.parsePower() };
    }
    return node;
  }

  private parseUnary(): Node {
    if (this.expectOp("-")) return { type: "unary", op: "-", arg: this.parseUnary() };
    if (this.expectOp("+")) return this.parseUnary();
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const t = this.peek();
    if (!t) throw new Error("Unexpected end of formula.");

    if (t.type === "num") {
      this.pos++;
      return { type: "num", value: t.value };
    }
    if (t.type === "lparen") {
      this.pos++;
      const inner = this.parseExpression();
      if (this.peek()?.type !== "rparen") throw new Error("Missing closing parenthesis.");
      this.pos++;
      return inner;
    }
    if (t.type === "ident") {
      this.pos++;
      if (this.peek()?.type === "lparen") {
        if (!ALLOWED_FUNCTIONS.has(t.value)) {
          throw new Error(`Function "${t.value}" is not allowed in formulas.`);
        }
        this.pos++; // consume (
        const args: Node[] = [];
        if (this.peek()?.type !== "rparen") {
          args.push(this.parseExpression());
          while (this.peek()?.type === "comma") {
            this.pos++;
            args.push(this.parseExpression());
          }
        }
        if (this.peek()?.type !== "rparen") throw new Error("Missing closing parenthesis in call.");
        this.pos++;
        return { type: "call", name: t.value, args };
      }
      return { type: "var", name: t.value };
    }
    throw new Error("Unexpected token in formula.");
  }

  atEnd(): boolean {
    return this.pos >= this.tokens.length;
  }
}

function evalNode(node: Node, vars: Record<string, number>): number {
  switch (node.type) {
    case "num":
      return node.value;
    case "var":
      if (!(node.name in vars)) throw new Error(`Unknown variable "${node.name}" in formula.`);
      return vars[node.name];
    case "unary":
      return -evalNode(node.arg, vars);
    case "binary": {
      const l = evalNode(node.left, vars);
      const r = evalNode(node.right, vars);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return l / r;
        case "^":
          return Math.pow(l, r);
        default:
          throw new Error(`Unknown operator "${node.op}".`);
      }
    }
    case "call": {
      const args = node.args.map((a) => evalNode(a, vars));
      switch (node.name) {
        case "min":
          return Math.min(...args);
        case "max":
          return Math.max(...args);
        case "sqrt":
          return Math.sqrt(args[0]);
        case "abs":
          return Math.abs(args[0]);
        case "pow":
          return Math.pow(args[0], args[1]);
        case "log":
          return Math.log(args[0]);
        case "exp":
          return Math.exp(args[0]);
        default:
          throw new Error(`Function "${node.name}" is not allowed in formulas.`);
      }
    }
  }
}

export function evaluateFormula(expression: string, vars: Record<string, number>): number {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens);
  const ast = parser.parseExpression();
  if (!parser.atEnd()) throw new Error("Unexpected trailing content in formula.");
  return evalNode(ast, vars);
}
