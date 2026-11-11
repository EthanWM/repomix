// Every declaration is captured as a whole node; CSharpParseStrategy cuts each
// one down to its signature using the AST (body/accessors/value fields), so the
// query does not need to describe signatures itself.
//
// Namespace names are matched with (_) because they are usually qualified
// (`namespace Acme.Orders`), which the grammar parses as qualified_name, not
// identifier. Matching only (identifier) silently dropped most namespaces.
//
// Note: every node type here must exist in the bundled grammar version
// (tree-sitter-c-sharp 0.23): one unknown type makes the whole query fail to
// compile, which disables compression for every C# file. Record structs parse
// as record_declaration in this version (there is no record_struct_declaration).
export const queryCSharp = `
(comment) @comment

(using_directive) @definition.import
(extern_alias_directive) @definition.import

(file_scoped_namespace_declaration
  name: (_) @name.definition.module
) @definition.module

(namespace_declaration
  name: (_) @name.definition.module
) @definition.module

(class_declaration
  name: (identifier) @name.definition.class
) @definition.class

(struct_declaration
  name: (identifier) @name.definition.class
) @definition.class

(record_declaration
  name: (identifier) @name.definition.class
) @definition.class

(interface_declaration
  name: (identifier) @name.definition.interface
) @definition.interface

(enum_declaration
  name: (identifier) @name.definition.enum
) @definition.enum

(delegate_declaration
  name: (identifier) @name.definition.delegate
) @definition.delegate

(method_declaration
  name: (identifier) @name.definition.method
) @definition.method

(constructor_declaration
  name: (identifier) @name.definition.method
) @definition.method

(destructor_declaration
  name: (identifier) @name.definition.method
) @definition.method

; Functions declared among top-level statements (Program.cs). Local functions
; inside method bodies are implementation details and are not captured.
(global_statement
  (local_function_statement
    name: (identifier) @name.definition.method
  ) @definition.method
)

(operator_declaration) @definition.method
(conversion_operator_declaration) @definition.method

(property_declaration
  name: (identifier) @name.definition.property
) @definition.property

(indexer_declaration) @definition.property

(event_declaration
  name: (identifier) @name.definition.property
) @definition.property

(event_field_declaration) @definition.field

; Only field declarations: local variables live inside method bodies
(field_declaration) @definition.field
`;
