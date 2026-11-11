import type { Node } from 'web-tree-sitter';
import type { Declaration, RenderExpression } from '../callGraphTypes.js';

export const verbatim = (node: Node, signature?: string): Declaration => ({ kind: 'verbatim', node, signature });

/** A type, namespace or module: rendered with its members when it has a member list. */
export const container = (node: Node, body: Node | null | undefined, outer: Node = node): Declaration =>
  body ? { kind: 'container', node: outer, body } : { kind: 'verbatim', node: outer };

/** A function-like declaration: body-less ones (abstract, interface, extern) render whole. */
export const callable = (node: Node, body: Node | null | undefined, outer: Node = node): Declaration =>
  body ? { kind: 'callable', node: outer, body } : { kind: 'verbatim', node: outer };

export const field = (node: Node): Declaration => ({ kind: 'field', node });

export const enumMember = (node: Node, signature?: string): Declaration => ({ kind: 'enum-member', node, signature });

/** Re-anchors a declaration on a wrapper (`export`, decorators) so its signature includes it. */
export const wrapped = (inner: Declaration | null, outer: Node): Declaration | null =>
  inner ? { ...inner, node: outer } : null;

export const bodyOf = (node: Node | null | undefined): Node | null => node?.childForFieldName('body') ?? null;

/**
 * `object.name` with the given field names. A receiver that is a call renders
 * as empty, which leaves `.name` for chained calls.
 */
export const renderMemberAccess = (
  node: Node,
  render: RenderExpression,
  objectField: string,
  nameField: string,
  separator = '.',
): string | undefined => {
  const name = node.childForFieldName(nameField);
  if (!name) {
    return undefined;
  }
  const object = node.childForFieldName(objectField);
  return object ? `${render(object)}${separator}${name.text}` : name.text;
};

export const namedChildrenOfType = (node: Node | null | undefined, ...types: string[]): Node[] =>
  (node?.namedChildren ?? []).filter((child): child is Node => child !== null && types.includes(child.type));
