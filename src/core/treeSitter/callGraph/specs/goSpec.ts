import type { Node } from 'web-tree-sitter';
import type { CallGraphSpec, Declaration } from '../callGraphTypes.js';
import {
  bodyOf,
  callable,
  container,
  field,
  namedChildrenOfType,
  renderMemberAccess,
  verbatim,
} from './specHelpers.js';

const VERBATIM = new Set([
  'package_clause',
  'import_declaration',
  // Members of struct and interface types
  'field_declaration',
  'method_elem',
  'type_elem',
]);

const TYPE_SPECS = ['type_spec', 'type_alias'];
const VALUE_SPECS = ['var_spec', 'const_spec'];

/**
 * Struct and interface types render with their fields and methods; other
 * types (`type ID string`, function types, aliases) render whole. `outer` is
 * the `type` declaration when it holds a single spec, so the keyword is kept.
 */
const classifyTypeSpec = (spec: Node, outer: Node): Declaration => {
  const type = spec.childForFieldName('type');
  let declaration: Declaration;
  if (type?.type === 'struct_type') {
    declaration = container(spec, namedChildrenOfType(type, 'field_declaration_list')[0], outer);
  } else if (type?.type === 'interface_type') {
    declaration = container(spec, type, outer);
  } else {
    declaration = verbatim(outer);
  }
  // A spec inside a `type ( … )` group does not include the keyword
  return outer === spec ? { ...declaration, prefix: 'type ' } : declaration;
};

export const goCallGraphSpec: CallGraphSpec = {
  classify(node) {
    const { type } = node;
    if (VERBATIM.has(type)) {
      return verbatim(node);
    }
    if (type === 'function_declaration' || type === 'method_declaration') {
      return callable(node, bodyOf(node));
    }
    if (type === 'type_declaration') {
      // A grouped `type ( … )` is walked through so each spec renders on its own
      const specs = namedChildrenOfType(node, ...TYPE_SPECS);
      return specs.length === 1 ? classifyTypeSpec(specs[0], node) : null;
    }
    if (TYPE_SPECS.includes(type)) {
      return classifyTypeSpec(node, node);
    }
    if (type === 'var_declaration' || type === 'const_declaration') {
      const specs = namedChildrenOfType(node, ...VALUE_SPECS);
      return specs.length === 1 ? field(node) : null;
    }
    if (VALUE_SPECS.includes(type)) {
      // A spec inside a `var ( … )` / `const ( … )` group
      return { ...field(node), prefix: type === 'var_spec' ? 'var ' : 'const ' };
    }
    return null;
  },

  callTypes: new Set(['call_expression']),

  callee(node, render) {
    const fn = node.childForFieldName('function');
    return fn ? render(fn) : null;
  },

  renderMember(node, render) {
    return node.type === 'selector_expression' ? renderMemberAccess(node, render, 'operand', 'field') : undefined;
  },

  opaqueTypes: new Set(['func_literal']),
  commentTypes: new Set(['comment']),
  initializerParents: new Set(VALUE_SPECS),
};
