import type { Node } from 'web-tree-sitter';
import type { CallGraphSpec, Declaration } from '../callGraphTypes.js';
import {
  bodyOf,
  callable,
  container,
  enumMember,
  field,
  namedChildrenOfType,
  renderMemberAccess,
  verbatim,
  wrapped,
} from './specHelpers.js';

// Shared by JavaScript and TypeScript: the TypeScript grammar extends the
// JavaScript one, so types missing from a grammar simply never match.

const VERBATIM = new Set([
  'import_statement',
  'type_alias_declaration',
  'function_signature',
  'abstract_method_signature',
  'method_signature',
  'property_signature',
  'index_signature',
  'call_signature',
  'construct_signature',
]);

const CONTAINERS = new Set([
  'class_declaration',
  'abstract_class_declaration',
  'interface_declaration',
  'enum_declaration',
  'internal_module',
  'module',
]);

const CALLABLES = new Set([
  'function_declaration',
  'generator_function_declaration',
  'method_definition',
  'class_static_block',
]);

const FUNCTION_VALUES = new Set(['arrow_function', 'function_expression', 'generator_function']);

/** `handler = async (req) => {…}` declares a function, not data. */
const functionValue = (node: Node | null): Node | null => (node && FUNCTION_VALUES.has(node.type) ? node : null);

/** `const f = () => …` is a callable; any other variable declaration is a field. */
const classifyVariables = (node: Node): Declaration => {
  const declarators = namedChildrenOfType(node, 'variable_declarator');
  const fn = declarators.length === 1 ? functionValue(declarators[0].childForFieldName('value')) : null;
  return fn ? callable(node, bodyOf(fn)) : field(node);
};

const classifyExport = (node: Node): Declaration | null => {
  const declaration = node.childForFieldName('declaration');
  if (declaration) {
    return wrapped(classify(declaration), node);
  }
  const value = node.childForFieldName('value');
  if (!value) {
    // `export { a, b }`, `export * from './x'`
    return verbatim(node);
  }
  if (FUNCTION_VALUES.has(value.type)) {
    return callable(value, bodyOf(value), node);
  }
  if (value.type === 'class') {
    return container(value, bodyOf(value), node);
  }
  // `export default createApp()` is a statement: only its calls are kept
  return null;
};

function classify(node: Node): Declaration | null {
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
  if (type === 'export_statement') {
    return classifyExport(node);
  }
  if (type === 'lexical_declaration' || type === 'variable_declaration') {
    return classifyVariables(node);
  }
  if (type === 'public_field_definition' || type === 'field_definition') {
    const fn = functionValue(node.childForFieldName('value'));
    return fn ? callable(node, bodyOf(fn)) : field(node);
  }
  if (type === 'ambient_declaration') {
    // `declare module 'x' {…}`, `declare const x: T`, `declare global {…}`
    const inner = node.namedChildren.find((child) => child !== null && classify(child) !== null);
    return inner ? wrapped(classify(inner), node) : verbatim(node);
  }
  if ((type === 'property_identifier' || type === 'enum_assignment') && node.parent?.type === 'enum_body') {
    return enumMember(node);
  }
  return null;
}

export const typescriptCallGraphSpec: CallGraphSpec = {
  classify,

  callTypes: new Set(['call_expression', 'new_expression', 'jsx_opening_element', 'jsx_self_closing_element']),

  callee(node, render) {
    switch (node.type) {
      case 'call_expression': {
        const fn = node.childForFieldName('function');
        return fn ? render(fn) : null;
      }
      case 'new_expression': {
        const constructorNode = node.childForFieldName('constructor');
        return constructorNode ? `new ${render(constructorNode)}` : null;
      }
      default: {
        // JSX: a component (`<UserList>`, `<Form.Field>`) is a dependency;
        // an intrinsic element (`<div>`) is markup
        const name = node.childForFieldName('name')?.text;
        return name && (/^[A-Z]/.test(name) || name.includes('.')) ? `<${name}>` : null;
      }
    }
  },

  renderMember(node, render) {
    if (node.type !== 'member_expression') {
      return undefined;
    }
    const optional = node.children.some((child) => child?.type === 'optional_chain');
    return renderMemberAccess(node, render, 'object', 'property', optional ? '?.' : '.');
  },

  opaqueTypes: new Set([...FUNCTION_VALUES, 'class']),
  commentTypes: new Set(['comment']),
  initializerParents: new Set(['variable_declarator', 'public_field_definition', 'field_definition']),
};
