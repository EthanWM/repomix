import type { Node } from 'web-tree-sitter';
import type { CallGraphSpec } from './callGraphTypes.js';

// Callee expressions longer than this (a long lambda invoked in place, a
// multi-line builder) are shown as "…" rather than inflating the call list
const MAX_CALLEE_LENGTH = 60;

// Tokens that end a signature but carry no information once the body is gone:
// `{` and `=>` (C-family, JS), `:` (Python), `;` (body-less members)
const TRAILING_PUNCTUATION = /(?:\s|;|\{|=>|:)+$/;

/**
 * Source text of `[start, end)` as a single line: comments dropped,
 * whitespace collapsed, and (for fields) initializer values removed.
 */
export const signatureText = (
  source: string,
  root: Node,
  start: number,
  end: number,
  spec: CallGraphSpec,
  removeInitializers: boolean,
): string => {
  const removed = collectRemovedRanges(root, start, end, spec, removeInitializers);

  let text = '';
  let cursor = start;
  for (const [from, to] of removed) {
    if (from > cursor) {
      text += source.slice(cursor, from);
    }
    cursor = Math.max(cursor, to);
  }
  if (cursor < end) {
    text += source.slice(cursor, end);
  }

  return collapseWhitespace(text).replace(TRAILING_PUNCTUATION, '');
};

/** Single-line text for a callee expression, or "…" when it is too long to help. */
export const compactText = (node: Node): string => {
  const text = collapseWhitespace(node.text);
  return text.length > MAX_CALLEE_LENGTH ? '…' : text;
};

const collapseWhitespace = (text: string): string =>
  text
    .replace(/\s+/g, ' ')
    // A parameter list split over several lines collapses to `( int a, int b )`
    .replace(/([([<]) /g, '$1')
    .replace(/ ([)\]>])/g, '$1')
    // A dropped initializer leaves `a , b`; a trailing comma leaves `b,)`
    .replace(/ ,/g, ',')
    .replace(/,([)\]>])/g, '$1')
    .trim();

/**
 * Comment ranges inside `[start, end)` and, when requested, initializer
 * ranges (`= value`), sorted by start. Iterative so a deeply nested
 * expression cannot overflow the stack.
 */
const collectRemovedRanges = (
  root: Node,
  start: number,
  end: number,
  spec: CallGraphSpec,
  removeInitializers: boolean,
): Array<[number, number]> => {
  const ranges: Array<[number, number]> = [];
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || node.endIndex <= start || node.startIndex >= end) {
      continue;
    }
    if (spec.commentTypes.has(node.type)) {
      ranges.push([node.startIndex, node.endIndex]);
      continue;
    }
    const parent = node.parent;
    if (removeInitializers && node.type === '=' && parent && spec.initializerParents.has(parent.type)) {
      ranges.push([node.startIndex, parent.endIndex]);
      continue;
    }
    for (const child of node.children) {
      if (child) {
        stack.push(child);
      }
    }
  }
  return ranges.sort((a, b) => a[0] - b[0]);
};
