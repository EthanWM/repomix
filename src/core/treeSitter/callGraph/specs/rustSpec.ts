import type { CallGraphSpec } from '../callGraphTypes.js';
import { bodyOf, callable, container, enumMember, field, renderMemberAccess, verbatim } from './specHelpers.js';

const VERBATIM = new Set([
  'use_declaration',
  'extern_crate_declaration',
  'type_item',
  'associated_type',
  'function_signature_item',
  'attribute_item',
  'inner_attribute_item',
  // Struct and union fields
  'field_declaration',
]);

const CONTAINERS = new Set(['mod_item', 'struct_item', 'union_item', 'enum_item', 'trait_item', 'impl_item']);

export const rustCallGraphSpec: CallGraphSpec = {
  classify(node) {
    const { type } = node;
    if (VERBATIM.has(type)) {
      return verbatim(node);
    }
    if (CONTAINERS.has(type)) {
      const body = bodyOf(node);
      // Tuple structs (`struct Point(i32, i32);`) keep their field types inline
      return body?.type === 'ordered_field_declaration_list' ? verbatim(node) : container(node, body);
    }
    if (type === 'function_item') {
      return callable(node, bodyOf(node));
    }
    if (type === 'const_item' || type === 'static_item') {
      return field(node);
    }
    if (type === 'enum_variant') {
      return enumMember(node);
    }
    if (type === 'macro_definition') {
      // The macro's rules are implementation; its name is the interface
      const name = node.childForFieldName('name');
      return verbatim(node, name ? `macro_rules! ${name.text}` : undefined);
    }
    return null;
  },

  callTypes: new Set(['call_expression', 'macro_invocation']),

  callee(node, render) {
    if (node.type === 'macro_invocation') {
      const macro = node.childForFieldName('macro');
      return macro ? `${macro.text}!` : null;
    }
    const fn = node.childForFieldName('function');
    return fn ? render(fn) : null;
  },

  renderMember(node, render) {
    return node.type === 'field_expression' ? renderMemberAccess(node, render, 'value', 'field') : undefined;
  },

  opaqueTypes: new Set(['closure_expression']),
  commentTypes: new Set(['line_comment', 'block_comment']),
  initializerParents: new Set(['const_item', 'static_item']),
};
