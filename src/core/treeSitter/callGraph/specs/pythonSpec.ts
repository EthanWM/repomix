import type { Node } from 'web-tree-sitter';
import type { CallGraphSpec, Declaration } from '../callGraphTypes.js';
import { bodyOf, callable, container, field, renderMemberAccess, verbatim, wrapped } from './specHelpers.js';

const IMPORTS = new Set(['import_statement', 'import_from_statement', 'future_import_statement']);

function classify(node: Node): Declaration | null {
  switch (node.type) {
    case 'class_definition':
      return container(node, bodyOf(node));
    case 'function_definition':
      return callable(node, bodyOf(node));
    case 'decorated_definition': {
      // Decorators are part of the signature: `@app.route("/") def index()`
      const definition = node.childForFieldName('definition');
      return definition ? wrapped(classify(definition), node) : null;
    }
    case 'expression_statement': {
      // Module and class attributes: `TIMEOUT = 30`, `name: str = ""`
      const assignment = node.namedChildren.length === 1 ? node.namedChildren[0] : null;
      return assignment?.type === 'assignment' ? field(node) : null;
    }
    default:
      return IMPORTS.has(node.type) ? verbatim(node) : null;
  }
}

export const pythonCallGraphSpec: CallGraphSpec = {
  classify,
  callTypes: new Set(['call']),

  callee(node, render) {
    const fn = node.childForFieldName('function');
    return fn ? render(fn) : null;
  },

  renderMember(node, render) {
    return node.type === 'attribute' ? renderMemberAccess(node, render, 'object', 'attribute') : undefined;
  },

  opaqueTypes: new Set(['lambda']),
  commentTypes: new Set(['comment']),
  initializerParents: new Set(['assignment']),
};
