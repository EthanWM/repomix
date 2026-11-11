import type { Node, Tree } from 'web-tree-sitter';
import { compactText, signatureText } from './callGraphText.js';
import type { CallGraphSpec, Declaration } from './callGraphTypes.js';

/** Separates a signature from the calls made in its body. */
export const CALLS_MARKER = '→';

const INDENT = '  ';

/**
 * Renders a parsed file as a call-graph outline: the declaration structure,
 * one line per declaration, with each callable followed by the calls its body
 * makes and every other implementation detail dropped.
 *
 *   namespace Acme.Orders
 *     public class OrderService : IOrderService
 *       private readonly IRepository _repo
 *       public async Task<Order> PlaceAsync(Cart cart) → Order.FromCart, _repo.SaveAsync, .ConfigureAwait
 *
 * Calls are listed in evaluation order (a call's arguments before the call)
 * and each callee appears once per callable. A receiver that is itself a call
 * is shown as a leading dot, so `a.B().C()` reads `a.B, .C`. Statements that
 * are not declarations (top-level script code, static blocks) contribute a
 * `→ calls` line of their own at the position they occur.
 */
export const renderCallGraph = (tree: Tree, source: string, spec: CallGraphSpec): string => {
  const renderer = new CallGraphRenderer(source, spec);
  renderer.renderMembers(tree.rootNode.namedChildren, 0);
  return renderer.finish();
};

class CallGraphRenderer {
  private readonly lines: string[] = [];
  // Calls of consecutive non-declaration statements, flushed as one line
  private pendingCalls: string[] = [];
  // Consecutive enum members, flushed as one comma-joined line
  private pendingEnumMembers: string[] = [];
  private pendingDepth = 0;
  // Index of the last line holding enum members, so a members-only enum can be inlined
  private lastEnumLine = -1;

  constructor(
    private readonly source: string,
    private readonly spec: CallGraphSpec,
  ) {}

  finish(): string {
    this.flush();
    return this.lines.join('\n');
  }

  renderMembers(members: ReadonlyArray<Node | null>, depth: number): void {
    for (const member of members) {
      if (!member || this.spec.commentTypes.has(member.type)) {
        continue;
      }
      const declaration = this.spec.classify(member);
      if (declaration) {
        this.renderDeclaration(declaration, depth);
      } else if (this.containsDeclaration(member)) {
        // A wrapper around declarations (`#if`, `if TYPE_CHECKING:`, a TS
        // `namespace` statement): keep its own call, render through it
        const ownCall = this.calleeOf(member);
        if (ownCall) {
          this.addPendingCalls([ownCall], depth);
        }
        this.renderMembers(member.namedChildren, depth);
      } else {
        this.addPendingCalls(this.collectCalls([member]), depth);
      }
    }
  }

  private renderDeclaration(declaration: Declaration, depth: number): void {
    const { kind, node, body } = declaration;
    if (kind === 'enum-member') {
      if (this.pendingEnumMembers.length === 0 || this.pendingDepth !== depth) {
        this.flush();
      }
      this.pendingDepth = depth;
      this.pendingEnumMembers.push(declaration.signature ?? this.text(node, node.endIndex, false));
      return;
    }
    this.flush();

    const indent = INDENT.repeat(depth);
    if (kind === 'container' && body) {
      const header =
        (declaration.prefix ?? '') + (declaration.signature ?? this.text(node, this.containerHeaderEnd(body), false));
      const headerLine = this.lines.push(indent + header) - 1;
      this.renderMembers(body.namedChildren, depth + 1);
      this.flush();
      // An enum with nothing but members reads best on one line: `enum Color { Red, Green }`
      if (this.lines.length === headerLine + 2 && this.lastEnumLine === headerLine + 1) {
        const members = this.lines.pop()?.trim();
        this.lines[headerLine] = `${indent}${header} { ${members} }`;
      }
      return;
    }

    let signature: string;
    let calls: string[] = [];
    if (kind === 'callable' && body) {
      signature = declaration.signature ?? this.text(node, body.startIndex, false);
      calls = this.collectCalls([body]);
    } else if (kind === 'field') {
      signature = declaration.signature ?? this.text(node, node.endIndex, true);
      calls = this.collectCalls([node]);
    } else {
      signature = declaration.signature ?? this.text(node, node.endIndex, false);
    }
    signature = (declaration.prefix ?? '') + signature + (declaration.suffix ? ` ${declaration.suffix}` : '');
    this.lines.push(indent + withCalls(signature, calls));
  }

  /** A container header ends at the `{` of its member list, or where the list starts. */
  private containerHeaderEnd(body: Node): number {
    const brace = body.children.find((child) => child?.type === '{');
    return brace?.startIndex ?? body.startIndex;
  }

  private text(node: Node, end: number, removeInitializers: boolean): string {
    return signatureText(this.source, node, node.startIndex, end, this.spec, removeInitializers);
  }

  private addPendingCalls(calls: string[], depth: number): void {
    if (calls.length === 0) {
      return;
    }
    if (this.pendingEnumMembers.length > 0 || this.pendingDepth !== depth) {
      this.flush();
    }
    this.pendingDepth = depth;
    for (const call of calls) {
      if (!this.pendingCalls.includes(call)) {
        this.pendingCalls.push(call);
      }
    }
  }

  private flush(): void {
    const indent = INDENT.repeat(this.pendingDepth);
    if (this.pendingEnumMembers.length > 0) {
      this.lastEnumLine = this.lines.push(indent + this.pendingEnumMembers.join(', ')) - 1;
      this.pendingEnumMembers = [];
    }
    if (this.pendingCalls.length > 0) {
      this.lines.push(`${indent}${CALLS_MARKER} ${this.pendingCalls.join(', ')}`);
      this.pendingCalls = [];
    }
  }

  /**
   * Unique callees within the given subtrees, in evaluation order: sorting by
   * end position puts arguments (`g` in `f(g())`) and chained receivers
   * (`a.B` in `a.B().C()`) before the call that consumes them.
   */
  private collectCalls(roots: Node[]): string[] {
    const found: Array<{ end: number; name: string }> = [];
    const stack = [...roots];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) {
        continue;
      }
      const name = this.calleeOf(node);
      if (name) {
        found.push({ end: node.endIndex, name });
      }
      for (const child of node.namedChildren) {
        if (child) {
          stack.push(child);
        }
      }
    }
    found.sort((a, b) => a.end - b.end);
    return [...new Set(found.map((call) => call.name))];
  }

  private calleeOf(node: Node): string | null {
    if (!this.spec.callTypes.has(node.type)) {
      return null;
    }
    return this.spec.callee(node, this.renderCallee) || null;
  }

  /**
   * Callee expression without arguments: `repo.SaveAsync`, `Placed?.Invoke`.
   * A receiver that is a call renders as empty, leaving `.Method`.
   */
  private readonly renderCallee = (expression: Node): string => {
    // A call on a call's result is chained; an anonymous function invoked in
    // place (`(() => …)()`, `go func() {…}()`) has no name to list, and the
    // calls inside it are collected anyway
    if (this.spec.callTypes.has(expression.type) || this.spec.opaqueTypes.has(unwrapParentheses(expression).type)) {
      return '';
    }
    return this.spec.renderMember(expression, this.renderCallee) ?? compactText(expression);
  };

  /** Whether a declaration sits under this node, outside any anonymous function. */
  private containsDeclaration(root: Node): boolean {
    const stack: Node[] = [...root.namedChildren].filter((child): child is Node => child !== null);
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || this.spec.opaqueTypes.has(node.type)) {
        continue;
      }
      if (this.spec.classify(node)) {
        return true;
      }
      for (const child of node.namedChildren) {
        if (child) {
          stack.push(child);
        }
      }
    }
    return false;
  }
}

/** `(() => …)` → the arrow function; every supported grammar names this node the same. */
const unwrapParentheses = (expression: Node): Node => {
  let node = expression;
  while (node.type === 'parenthesized_expression' && node.namedChildren.length === 1 && node.namedChildren[0]) {
    node = node.namedChildren[0];
  }
  return node;
};

const withCalls = (signature: string, calls: string[]): string =>
  calls.length > 0 ? `${signature} ${CALLS_MARKER} ${calls.join(', ')}` : signature;
