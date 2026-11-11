import type { Node } from 'web-tree-sitter';
import type { ParseContext, ParsedChunk } from './BaseParseStrategy.js';
import { BaseParseStrategy, getNodeEndRow } from './BaseParseStrategy.js';

enum CaptureType {
  Comment = 'comment',
  Import = 'definition.import',
  Module = 'definition.module',
  Class = 'definition.class',
  Interface = 'definition.interface',
  Enum = 'definition.enum',
  Delegate = 'definition.delegate',
  Method = 'definition.method',
  Property = 'definition.property',
  Field = 'definition.field',
}

/**
 * C# strategy for the signatures compress mode.
 *
 * The default strategy emits the source line holding a declaration's name. In
 * C# that drops attributes and the rest of a multi-line parameter list, and it
 * leaks single-line bodies (`void Bar() { Baz(); }`). This strategy cuts each
 * declaration at its body node instead, so a signature is emitted whole and the
 * body never is:
 *
 * - types and namespaces: header up to the `{` of their member list
 * - methods, constructors, operators: everything before the block or `=>` body
 * - properties, indexers, events: accessor bodies collapse to `{ get; set; }`
 * - enums, fields, usings, delegates, body-less members: kept whole
 */
export class CSharpParseStrategy extends BaseParseStrategy {
  parseCapture(
    capture: { node: Node; name: string },
    lines: string[],
    processedChunks: Set<string>,
    context: ParseContext,
  ): string | ParsedChunk | null {
    const { node, name } = capture;
    // Name captures only exist to anchor patterns; the declaration capture of
    // the same match carries the whole node
    if (name.startsWith('name.')) {
      return null;
    }
    const startRow = node.startPosition.row;
    if (!this.validateLineExists(lines, startRow)) {
      return null;
    }

    const captureTypes = this.getCaptureTypes(name, CaptureType);
    const source = context.fileContent;

    if (captureTypes.has(CaptureType.Comment)) {
      // Skip comments already emitted as part of an earlier chunk (inside an
      // enum, a parameter list, or trailing a field on the same line)
      if (processedChunks.has(coveredRowKey(startRow))) {
        return null;
      }
      return this.emitWhole(node, lines, processedChunks);
    }

    if (
      captureTypes.has(CaptureType.Module) ||
      captureTypes.has(CaptureType.Class) ||
      captureTypes.has(CaptureType.Interface)
    ) {
      return this.emitHeader(node, node.childForFieldName('body'), source, lines, processedChunks);
    }
    if (captureTypes.has(CaptureType.Method)) {
      return this.emitBeforeBody(node, node.childForFieldName('body'), source, lines, processedChunks);
    }
    if (captureTypes.has(CaptureType.Property)) {
      return this.emitProperty(node, source, lines, processedChunks);
    }
    if (captureTypes.has(CaptureType.Field)) {
      return node.startPosition.row === node.endPosition.row
        ? this.emitWhole(node, lines, processedChunks)
        : this.emitFieldWithoutInitializers(node, source, lines, processedChunks);
    }
    if (
      captureTypes.has(CaptureType.Import) ||
      captureTypes.has(CaptureType.Enum) ||
      captureTypes.has(CaptureType.Delegate)
    ) {
      return this.emitWhole(node, lines, processedChunks);
    }

    return null;
  }

  /**
   * Emit the node's text. A trailing comment on its last line
   * (`int count; // cached`) is kept with the declaration, since a separate
   * comment chunk on the same row would be dropped by row-based deduplication.
   */
  private emitWhole(node: Node, lines: string[], processedChunks: Set<string>): ParsedChunk | null {
    const endRow = getNodeEndRow(node);
    const lastLine = lines[endRow];
    if (lastLine === undefined) {
      return null;
    }
    const tail = node.endPosition.row === endRow ? lastLine.slice(node.endPosition.column) : '';
    const trailingComment = /^\s*(\/\/|\/\*)/.test(tail) ? tail : '';
    return this.claim(`${node.text}${trailingComment}`, node.startPosition.row, endRow, lines, processedChunks);
  }

  /** Type or namespace header: the text up to the `{` that opens its members. */
  private emitHeader(
    node: Node,
    body: Node | null,
    source: string,
    lines: string[],
    processedChunks: Set<string>,
  ): ParsedChunk | null {
    // Positional records (`record Point(int X, int Y);`) have no member list
    if (!body) {
      return this.emitWhole(node, lines, processedChunks);
    }
    const header = source.slice(node.startIndex, body.startIndex);
    // The `{` row is consumed too, so an Allman-style brace on its own line
    // does not separate the header from its first member
    return this.claim(header, node.startPosition.row, body.startPosition.row, lines, processedChunks);
  }

  /** Callable signature: everything before the block or `=>` body. */
  private emitBeforeBody(
    node: Node,
    body: Node | null,
    source: string,
    lines: string[],
    processedChunks: Set<string>,
  ): ParsedChunk | null {
    // Abstract, interface, extern and partial members have no body
    if (!body) {
      return this.emitWhole(node, lines, processedChunks);
    }
    const signature = source.slice(node.startIndex, body.startIndex);
    return this.claim(signature, node.startPosition.row, getNodeEndRow(node), lines, processedChunks);
  }

  /**
   * Properties, indexers and events. Auto-properties are kept whole (their
   * accessors are the signature); accessor bodies collapse to `get;`/`set;`
   * and an expression body (`=> _items.Count`) is cut like a method body.
   */
  private emitProperty(node: Node, source: string, lines: string[], processedChunks: Set<string>): ParsedChunk | null {
    const value = node.childForFieldName('value');
    if (value?.type === 'arrow_expression_clause') {
      return this.emitBeforeBody(node, value, source, lines, processedChunks);
    }

    const accessorList = node.childForFieldName('accessors');
    const accessors = accessorList?.namedChildren.filter((child) => child?.type === 'accessor_declaration') ?? [];
    if (!accessorList || !accessors.some((accessor) => accessor?.childForFieldName('body'))) {
      return this.emitWhole(node, lines, processedChunks);
    }

    const accessorSignatures = accessors.map((accessor) => {
      const body = accessor?.childForFieldName('body');
      if (!accessor || !body) {
        return accessor?.text ?? '';
      }
      return `${source.slice(accessor.startIndex, body.startIndex).trim()};`;
    });
    const content = `${source.slice(node.startIndex, accessorList.startIndex).trimEnd()} { ${accessorSignatures.join(' ')} }`;
    return this.claim(content, node.startPosition.row, getNodeEndRow(node), lines, processedChunks);
  }

  /**
   * A field whose initializer spans several lines (a lookup table, a long
   * builder chain) keeps its declaration and drops the initializer.
   */
  private emitFieldWithoutInitializers(
    node: Node,
    source: string,
    lines: string[],
    processedChunks: Set<string>,
  ): ParsedChunk | null {
    const removed: Array<[number, number]> = [];
    for (const declarator of node.descendantsOfType('variable_declarator')) {
      const equals = declarator?.children.find((child) => child?.type === '=');
      if (declarator && equals) {
        removed.push([equals.startIndex, declarator.endIndex]);
      }
    }
    if (removed.length === 0) {
      return this.emitWhole(node, lines, processedChunks);
    }

    let content = '';
    let cursor = node.startIndex;
    for (const [from, to] of removed) {
      content += source.slice(cursor, from).trimEnd();
      cursor = to;
    }
    content += source.slice(cursor, node.endIndex);
    return this.claim(content, node.startPosition.row, getNodeEndRow(node), lines, processedChunks);
  }

  /** Dedupe by position and mark the emitted rows so nested comments are not repeated. */
  private claim(
    content: string,
    startRow: number,
    endRow: number,
    lines: string[],
    processedChunks: Set<string>,
  ): ParsedChunk | null {
    const trimmed = dedent(content, lines[startRow] ?? '').trim();
    const positionKey = `csharp:${startRow}:${trimmed}`;
    if (!trimmed || processedChunks.has(positionKey)) {
      return null;
    }
    processedChunks.add(positionKey);
    for (let row = startRow; row <= endRow; row++) {
      processedChunks.add(coveredRowKey(row));
    }
    return { content: trimmed, endRow };
  }
}

const coveredRowKey = (row: number): string => `csharp:covered-row:${row}`;

/**
 * Node text starts mid-line (after its indentation) while continuation lines
 * keep their full source indentation. Strip the declaration line's indentation
 * from them so a multi-line signature reads as it does in the source.
 */
const dedent = (content: string, firstSourceLine: string): string => {
  const indent = firstSourceLine.length - firstSourceLine.trimStart().length;
  if (indent === 0 || !content.includes('\n')) {
    return content;
  }
  return content
    .split('\n')
    .map((line, index) => {
      if (index === 0) {
        return line;
      }
      const leading = line.length - line.trimStart().length;
      return line.slice(Math.min(leading, indent));
    })
    .join('\n');
};
