import type { Node } from 'web-tree-sitter';
import type { CallGraphSpec, Declaration, RenderExpression } from '../callGraphTypes.js';
import {
  bodyOf,
  callable,
  container,
  enumMember,
  field,
  namedChildrenOfType,
  renderMemberAccess,
  verbatim,
} from './specHelpers.js';

const VERBATIM = new Set([
  'using_directive',
  'extern_alias_directive',
  'file_scoped_namespace_declaration',
  'delegate_declaration',
]);

const CONTAINERS = new Set([
  'namespace_declaration',
  'class_declaration',
  'struct_declaration',
  'record_declaration',
  'interface_declaration',
  'enum_declaration',
]);

const CALLABLES = new Set([
  'method_declaration',
  'constructor_declaration',
  'destructor_declaration',
  'operator_declaration',
  'conversion_operator_declaration',
  // Only reached among top-level statements: method bodies are never walked
  'local_function_statement',
]);

const PROPERTIES = new Set(['property_declaration', 'indexer_declaration', 'event_declaration']);

const FIELDS = new Set(['field_declaration', 'event_field_declaration']);

/**
 * Properties, indexers and events. Expression-bodied ones (`=> _items.Count`)
 * render like methods; accessor bodies collapse to `{ get; set; }` with their
 * calls listed; auto-properties render as fields (initializer dropped).
 */
const classifyProperty = (node: Node): Declaration => {
  const value = node.childForFieldName('value');
  if (value?.type === 'arrow_expression_clause') {
    return callable(node, value);
  }

  const accessorList = node.childForFieldName('accessors');
  const accessors = namedChildrenOfType(accessorList, 'accessor_declaration');
  if (!accessorList || !accessors.some((accessor) => bodyOf(accessor))) {
    return field(node);
  }

  const accessorSignatures = accessors.map((accessor) => {
    const body = bodyOf(accessor);
    // Keep modifiers and attributes (`private set`), drop the body
    const head = body ? accessor.text.slice(0, body.startIndex - accessor.startIndex) : accessor.text;
    return `${head.replace(/[\s;]+$/, '').replace(/\s+/g, ' ')};`;
  });
  return { kind: 'callable', node, body: accessorList, suffix: `{ ${accessorSignatures.join(' ')} }` };
};

const renderMember = (node: Node, render: RenderExpression): string | undefined => {
  switch (node.type) {
    case 'member_access_expression':
      return renderMemberAccess(node, render, 'expression', 'name');
    case 'conditional_access_expression': {
      // `Placed?.Invoke` / `handlers?[0]`: the binding is an unnamed child
      const condition = node.childForFieldName('condition');
      const binding = namedChildrenOfType(node, 'member_binding_expression', 'element_binding_expression')[0];
      if (!condition || !binding) {
        return undefined;
      }
      const name = binding.childForFieldName('name');
      return `${render(condition)}?${name ? `.${name.text}` : '[]'}`;
    }
    case 'member_binding_expression': {
      const name = node.childForFieldName('name');
      return name ? `.${name.text}` : undefined;
    }
    default:
      return undefined;
  }
};

export const csharpCallGraphSpec: CallGraphSpec = {
  classify(node) {
    const { type } = node;
    if (VERBATIM.has(type)) {
      return verbatim(node);
    }
    if (CONTAINERS.has(type)) {
      return container(node, bodyOf(node));
    }
    if (type === 'enum_member_declaration') {
      return enumMember(node);
    }
    if (CALLABLES.has(type)) {
      return callable(node, bodyOf(node));
    }
    if (PROPERTIES.has(type)) {
      return classifyProperty(node);
    }
    if (FIELDS.has(type)) {
      return field(node);
    }
    return null;
  },

  callTypes: new Set(['invocation_expression', 'object_creation_expression']),

  callee(node, render) {
    if (node.type === 'object_creation_expression') {
      const type = node.childForFieldName('type');
      return type ? `new ${render(type)}` : null;
    }
    const fn = node.childForFieldName('function');
    // nameof(x) is a compile-time operator, not a call
    if (!fn || fn.text === 'nameof') {
      return null;
    }
    return render(fn);
  },

  renderMember,
  opaqueTypes: new Set(['lambda_expression', 'anonymous_method_expression']),
  commentTypes: new Set(['comment']),
  initializerParents: new Set(['variable_declarator', 'property_declaration']),
};
