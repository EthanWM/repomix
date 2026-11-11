/**
 * Golden tests for the `calls` compress mode (`--compress-mode calls`).
 *
 * Same layout and workflow as parseFile.golden.test.ts, with fixtures under
 * `fixtures-calls/<lang>/`. Each `.expected` file is the call-graph outline of
 * its input: review a changed one like code, never update it blindly with -u.
 *
 * A language without a call-graph spec (e.g. Ruby) falls back to the
 * signatures mode; its fixture pins that fallback.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { getLanguageConfigByExtension } from '../../../src/core/treeSitter/languageConfig.js';
import { parseFile } from '../../../src/core/treeSitter/parseFile.js';
import { createMockConfig } from '../../testing/testUtils.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures-calls');
const EXPECTED_SUFFIX = '.expected';

const allFiles = fs
  .readdirSync(fixturesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((langDir) =>
    fs.readdirSync(path.join(fixturesDir, langDir.name)).map((fileName) => ({ lang: langDir.name, fileName })),
  )
  .sort((a, b) => `${a.lang}/${a.fileName}`.localeCompare(`${b.lang}/${b.fileName}`));

const fixtures = allFiles.filter(({ fileName }) => !fileName.endsWith(EXPECTED_SUFFIX));

const config = createMockConfig({ output: { compress: true, compressMode: 'calls' } });

describe('parseFile calls-mode golden fixtures', () => {
  test('fixtures are discovered', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  test('every expected file has a matching input', () => {
    const inputs = new Set(fixtures.map(({ lang, fileName }) => `${lang}/${fileName}`));
    const orphans = allFiles
      .filter(({ fileName }) => fileName.endsWith(EXPECTED_SUFFIX))
      .map(({ lang, fileName }) => `${lang}/${fileName.slice(0, -EXPECTED_SUFFIX.length)}`)
      .filter((input) => !inputs.has(input));
    expect(orphans).toEqual([]);
  });

  test.each(fixtures)('$lang/$fileName', async ({ lang, fileName }) => {
    const inputPath = path.join(fixturesDir, lang, fileName);

    // Guard against fixtures placed in the wrong language directory
    expect(getLanguageConfigByExtension(path.extname(fileName).slice(1))?.name).toBe(lang);

    const content = fs.readFileSync(inputPath, 'utf8');
    const result = await parseFile(content, fileName, config);

    expect(typeof result).toBe('string');
    await expect(`${result}\n`).toMatchFileSnapshot(`${inputPath}${EXPECTED_SUFFIX}`);
  });
});
