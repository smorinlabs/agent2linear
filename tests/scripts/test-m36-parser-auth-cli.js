#!/usr/bin/env node

// One of four shards of the M36 parser/no-input built-CLI fixture (split so the
// shards can run concurrently); see m36-parser-harness.js for the shared sandbox.

import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createParserSandbox, snapshot } from './m36-parser-harness.js';

const { root, xdg, run, caseCount } = createParserSandbox('auth', fileURLToPath(import.meta.url));

try {
  const seededAlias = run([
    '--no-input',
    'alias',
    'add',
    'team',
    'seeded-auth-check',
    'fake-id',
    '--skip-validation',
  ]);
  assert.equal(seededAlias.status, 0, seededAlias.stderr);

  const promptSafetyAlias = run([
    '--no-input',
    'alias',
    'add',
    'user',
    'prompt-safety',
    'fake-user-id',
    '--skip-validation',
  ]);
  assert.equal(promptSafetyAlias.status, 0, promptSafetyAlias.stderr);
  const aliasesBeforeConsent = snapshot(xdg);
  for (const args of [
    ['--no-input', 'alias', 'clear', 'user', '--global'],
    ['--no-input', 'alias', 'clear', 'user', '--global', '--force'],
  ]) {
    const consentFailure = run(args);
    assert.equal(consentFailure.status, 2, `${args.join(' ')}\n${consentFailure.stderr}`);
    assert.equal(consentFailure.stdout, '', args.join(' '));
    assert.deepEqual(snapshot(xdg), aliasesBeforeConsent, args.join(' '));
  }
  const consentedAliasClear = run(['--no-input', 'alias', 'clear', 'user', '--global', '--yes']);
  assert.equal(consentedAliasClear.status, 0, consentedAliasClear.stderr);
  assert.doesNotMatch(consentedAliasClear.stdout, /Are you sure|\(y\/N\)/);

  for (const args of [
    ['--no-input', 'teams', 'list'],
    ['--no-input', 'members', 'list', '--org-wide'],
    ['--no-input', 'initiatives', 'list'],
    ['--no-input', 'templates', 'list'],
    ['--no-input', 'project-status', 'list'],
    ['--no-input', 'cycles', 'list'],
    ['--no-input', 'workflow-states', 'list'],
    ['--no-input', 'project', 'view', 'missing-project'],
    ['--no-input', 'issue', 'view', 'ENG-1'],
    ['--no-input', 'alias', 'sync', 'team'],
    ['--no-input', 'alias', 'add', 'team', 'new-auth-check', 'fake-id'],
    ['--no-input', 'alias', 'list', 'team', '--validate'],
    ['--no-input', 'config', 'set', 'defaultTeam', 'fake-id'],
    ['--no-input', 'config', 'set', 'defaultInitiative', 'fake-id'],
    ['--no-input', 'config', 'set', 'defaultProject', 'fake-id'],
    ['--no-input', 'config', 'set', 'defaultIssueTemplate', 'fake-id'],
    ['--no-input', 'config', 'set', 'defaultProjectTemplate', 'fake-id'],
    ['--no-input', 'initiatives', 'set', 'fake-id'],
    ['--no-input', 'initiatives', 'view', 'fake-id'],
    ['--no-input', 'project', 'dependencies', 'list', 'missing'],
    ['--no-input', 'project', 'dependencies', 'clear', 'missing', '--yes'],
    ['--no-input', 'project-status', 'view', 'fake-id'],
    ['--no-input', 'teams', 'set', 'fake-id'],
    ['--no-input', 'teams', 'view', 'fake-id'],
    ['--no-input', 'templates', 'view', 'fake-id'],
    ['--no-input', 'workflow-states', 'delete', 'fake-id', '--yes'],
    ['--no-input', 'workflow-states', 'view', 'fake-id'],
    ['--no-input', 'cycles', 'view', 'fake-id'],
    ['--no-input', 'project', 'add-milestones', 'missing', '--template', 'scratch'],
    ['--no-input', 'colors', 'extract', '--type', 'labels'],
    ['--no-input', 'icons', 'extract', '--type', 'labels'],
    ['--no-input', 'icons', 'extract', '--type', 'labels', '--team', 'fake-id'],
    ['--no-input', 'project', 'create', '--title', 'Example', '--team', 'fake-id'],
    ['--no-input', 'issue', 'create', '--title', 'Example', '--team', 'fake-id'],
    ['--no-input', 'issue', 'update', 'ENG-1', '--title', 'Example'],
    ['--no-input', 'project', 'dependencies', 'add', 'missing', '--depends-on', 'other'],
    ['--no-input', 'project', 'dependencies', 'remove', 'missing', '--with', 'other'],
    ['--no-input', 'workflow-states', 'create', '--name', 'Example', '--team', 'fake-id'],
    ['--no-input', 'workflow-states', 'update', 'fake-id', '--name', 'Example'],
  ]) {
    const missingAuth = run(args);
    assert.equal(missingAuth.status, 4, `${args.join(' ')}\n${missingAuth.stderr}`);
  }

  process.stdout.write(
    `M36 parser auth/alias-consent built-CLI verification passed (${caseCount()} CLI cases)\n`
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
