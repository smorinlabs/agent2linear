import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const permanentFixtures = [
  'tests/scripts/test-m36-api-key-cli.js',
  'tests/scripts/test-m36-config-cli.js',
  'tests/scripts/test-m36-diagnostics-cli.js',
  'tests/scripts/test-m36-output-cli.js',
  'tests/scripts/test-m36-output-migrations-cli.js',
  'tests/scripts/test-m36-parser-help-cli.js',
  'tests/scripts/test-m36-parser-suggestions-cli.js',
  'tests/scripts/test-m36-parser-no-input-cli.js',
  'tests/scripts/test-m36-parser-auth-cli.js',
  'tests/scripts/test-m36-signals-cli.js',
  'tests/scripts/test-m36-tsv-cli.js',
  'tests/scripts/test-m36-version-cli.js',
] as const;

const e2eRunner = 'tests/scripts/run-e2e-cli.mjs';

describe('[RLS-STD-FIXTURES] permanent built-CLI conformance evidence', () => {
  const workflow = readFileSync(resolve('.github/workflows/ci.yml'), 'utf8');
  const runner = readFileSync(resolve(e2eRunner), 'utf8');

  it('runs the built-CLI E2E runner in ordinary CI', () => {
    expect(workflow).toContain(`node ${e2eRunner}`);
  });

  it.each(permanentFixtures)('runs %s in ordinary CI', fixture => {
    expect(runner).toContain(`'${fixture}'`);
  });
});
