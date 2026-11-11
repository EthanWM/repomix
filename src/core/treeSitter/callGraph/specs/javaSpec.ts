import type { CallGraphSpec } from '../callGraphTypes.js';
import { bodyOf, callable, container, enumMember, field, renderMemberAccess, verbatim } from './specHelpers.js';

const VERBATIM = new Set(['package_declaration', 'import_declaration', 'annotation_type_element_declaration']);

const CONTAINERS = new Set([
  'class_declaration',
  'interface_declaration',
  'enum_declaration',
  'record_declaration',
  'annotation_type_declaration',
]);

const CALLABLES = new Set(['method_declaration', 'constructor_declaration', 'compact_constructor_declaration']);

const FIELDS = new Set(['field_declaration', 'constant_declaration']);

export const javaCallGraphSpec: CallGraphSpec = {
  classify(node) {
    const { type } = node;
    if (VERBATIM.has(type)) {
      return verbatim(node);
    }
    if (CONTAINERS.has(type)) {
      return container(node, bodyOf(node));
    }
    if (CALLABLES.has(type)) {
      return callable(node, bodyOf(node));
    }
    if (FIELDS.has(type)) {
      return field(node);
    }
    if (type === 'enum_constant') {
      // Constructor arguments and constant-specific bodies are implementation
      const name = node.childForFieldName('name');
      return enumMember(node, name?.text);
    }
    return null;
  },

  callTypes: new Set(['method_invocation', 'object_creation_expression', 'explicit_constructor_invocation']),

  callee(node, render) {
    switch (node.type) {
      case 'method_invocation': {
        const name = node.childForFieldName('name');
        if (!name) {
          return null;
        }
        const object = node.childForFieldName('object');
        return object ? `${render(object)}.${name.text}` : name.text;
      }
      case 'object_creation_expression': {
        const type = node.childForFieldName('type');
        return type ? `new ${render(type)}` : null;
      }
      default: {
        // `this(...)` / `super(...)` in a constructor
        const constructorNode = node.childForFieldName('constructor');
        return constructorNode?.text ?? null;
      }
    }
  },

  renderMember(node, render) {
    return node.type === 'field_access' ? renderMemberAccess(node, render, 'object', 'field') : undefined;
  },

  opaqueTypes: new Set(['lambda_expression']),
  commentTypes: new Set(['line_comment', 'block_comment']),
  initializerParents: new Set(['variable_declarator']),
};
