import type { Node } from 'web-tree-sitter';

/**
 * How a declaration is rendered in the call-graph outline.
 *
 * - `container`: a header line, then its members indented one level
 *   (namespaces, classes, interfaces, impl blocks, enums)
 * - `callable`: its signature followed by the calls made in its body
 *   (functions, methods, constructors, accessors)
 * - `field`: its declaration without initializer values, followed by the
 *   calls made in those initializers
 * - `verbatim`: kept whole on one line (imports, type aliases, body-less
 *   members such as interface methods)
 * - `enum-member`: joined with adjacent enum members on a single line
 */
export type DeclarationKind = 'container' | 'callable' | 'field' | 'verbatim' | 'enum-member';

export interface Declaration {
  kind: DeclarationKind;
  /** The full declaration; its signature starts here (decorators and `export` included). */
  node: Node;
  /**
   * For containers, the node whose named children are the members. For
   * callables, the body the calls are collected from. In both cases the
   * signature ends where it starts. Absent for body-less declarations.
   */
  body?: Node | null;
  /** Replaces the signature computed from the source text. */
  signature?: string;
  /** Prepended to the signature, e.g. Go's `type` keyword for a spec inside a `type ( … )` group. */
  prefix?: string;
  /** Appended to the signature, e.g. a C# property's `{ get; set; }` once accessor bodies are gone. */
  suffix?: string;
}

/** Renders a callee expression (see renderCallee in renderCallGraph.ts). */
export type RenderExpression = (expression: Node) => string;

/**
 * Describes one language's grammar to the call-graph renderer. The renderer
 * itself is language agnostic: everything grammar specific lives here.
 */
export interface CallGraphSpec {
  /** Classifies a node met among a container's members; null when it is not a declaration. */
  classify(node: Node): Declaration | null;
  /** Node types that are calls (invocations, constructions, macro calls, JSX elements). */
  callTypes: ReadonlySet<string>;
  /** The rendered callee of a node whose type is in callTypes, or null to ignore that call. */
  callee(node: Node, render: RenderExpression): string | null;
  /**
   * Renders a member access (`a.b`, `a?.b`, `a::b`) so a receiver that is
   * itself a call collapses to `.b`. Returns undefined for other node types.
   */
  renderMember(node: Node, render: RenderExpression): string | undefined;
  /**
   * Anonymous function scopes (lambdas, function expressions, closures). Their
   * contents are implementation: declarations inside them are never rendered
   * as members, only the calls they make are attributed to the enclosing code.
   */
  opaqueTypes: ReadonlySet<string>;
  /** Comment node types, dropped from signatures and skipped among members. */
  commentTypes: ReadonlySet<string>;
  /** Node types whose `=` child starts an initializer to drop from a field signature. */
  initializerParents: ReadonlySet<string>;
}
