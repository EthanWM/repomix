import { describe, expect, test } from 'vitest';
import { parseFile } from '../../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../../testing/testUtils.js';

const callsConfig = createMockConfig({ output: { compress: true, compressMode: 'calls' } });

const outline = (content: string, fileName: string) => parseFile(content, fileName, callsConfig);

describe('renderCallGraph', () => {
  test('lists each callee once, arguments before the call that consumes them', async () => {
    const result = await outline('function f() {\n  log(a());\n  log(b());\n  a();\n}\n', 'f.ts');
    expect(result).toBe('function f() → a, log, b');
  });

  test('renders a call on a call result with a leading dot', async () => {
    const result = await outline('function f() {\n  return items.filter(isOk).map(toDto).join();\n}\n', 'f.ts');
    expect(result).toBe('function f() → items.filter, .map, .join');
  });

  test('skips an anonymous function invoked in place but keeps the calls inside it', async () => {
    const result = await outline('function f() {\n  (() => { boot(); })();\n}\n', 'f.ts');
    expect(result).toBe('function f() → boot');
  });

  test('does not surface declarations inside callbacks as members', async () => {
    const content = "describe('x', () => {\n  const helper = make();\n  it('y', () => helper());\n});\n";
    expect(await outline(content, 'x.test.ts')).toBe('→ make, helper, it, describe');
  });

  test('renders through wrappers that hold declarations', async () => {
    const content = 'class A\n{\n#if DEBUG\n    void Trace() { Log(); }\n#endif\n}\n';
    expect(await outline(content, 'A.cs')).toBe('class A\n  void Trace() → Log');
  });

  test('ignores nameof, which is not a call', async () => {
    const content = 'class A { void F(int x) { Guard(nameof(x)); } }';
    expect(await outline(content, 'A.cs')).toBe('class A\n  void F(int x) → Guard');
  });

  test('shows an over-long callee expression as an ellipsis', async () => {
    const receiver = `(${'a'.repeat(80)} as Foo)`;
    expect(await outline(`function f() { ${receiver}(); }`, 'f.ts')).toBe('function f() → …');
  });

  test('handles deeply nested expressions without overflowing the stack', async () => {
    const terms = Array.from({ length: 5000 }, (_, i) => `v${i}`).join(' + ');
    const result = await outline(`function f() {\n  return g(${terms});\n}\n`, 'f.ts');
    expect(result).toBe('function f() → g');
  });

  test('keeps the signatures mode as the default', async () => {
    const result = await parseFile(
      'class A { void F() { G(); } }',
      'A.cs',
      createMockConfig({ output: { compress: true } }),
    );
    expect(result).not.toContain('→');
  });
});
