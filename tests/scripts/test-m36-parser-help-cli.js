#!/usr/bin/env node

// One of four shards of the M36 parser/no-input built-CLI fixture (split so the
// shards can run concurrently); see m36-parser-harness.js for the shared sandbox.

import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { assertUsageFailure, createParserSandbox, snapshot } from './m36-parser-harness.js';

const { root, run, caseCount } = createParserSandbox('help', fileURLToPath(import.meta.url));

try {
  const bare = run([]);
  assert.equal(bare.status, 0, bare.stderr);
  assert.match(bare.stdout, /Usage:/);
  assert.match(bare.stdout, /Commands:/);
  assert.equal(bare.stderr, '');

  for (const args of [
    ['--help'],
    ['project', '--help'],
    ['help'],
    ['help', 'project'],
    ['project', 'help'],
    ['project', 'help', 'list'],
    ['--', 'help', 'project'],
  ]) {
    const explicitHelp = run(args);
    assert.equal(explicitHelp.status, 0, explicitHelp.stderr);
    assert.match(explicitHelp.stdout, /Usage:/);
    assert.equal(explicitHelp.stderr, '');
  }

  const parentCommands = [
    ['initiatives'],
    ['project'],
    ['project', 'dependencies'],
    ['project', 'comment'],
    ['teams'],
    ['members'],
    ['project-status'],
    ['alias'],
    ['milestone-templates'],
    ['templates'],
    ['config'],
    ['config', 'override'],
    ['workflow-states'],
    ['issue-labels'],
    ['project-labels'],
    ['icons'],
    ['colors'],
    ['cache'],
    ['cursor-history'],
    ['issue'],
    ['issue', 'comment'],
    ['cycles'],
    ['workspace'],
    ['profile'],
    ['profile', 'match'],
    ['prompt'],
    ['issues'],
    ['milestones'],
    ['labels'],
  ];
  for (const command of parentCommands) {
    const before = snapshot(root);
    const result = run(command);
    assertUsageFailure(result, command.join(' '));
    assert.deepEqual(snapshot(root), before, `${command.join(' ')} changed local files`);
  }
  for (const aliasPath of [['init'], ['proj', 'deps'], ['lbl']]) {
    assertUsageFailure(run(aliasPath), aliasPath.join(' '));
  }
  assertUsageFailure(
    run(['--workspace', 'help', 'project']),
    '--workspace help project (help is an option value)'
  );
  for (const flags of ['-qC', '-vC', '-qvC']) {
    assertUsageFailure(run([flags, 'help', 'project']), `${flags} help project (help is -C value)`);
  }

  process.stdout.write(
    `M36 parser help/usage built-CLI verification passed (${caseCount()} CLI cases)\n`
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
