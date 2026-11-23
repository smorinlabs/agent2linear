#!/usr/bin/env node

// One of four shards of the M36 parser/no-input built-CLI fixture (split so the
// shards can run concurrently); see m36-parser-harness.js for the shared sandbox.

import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createParserSandbox, snapshot } from './m36-parser-harness.js';

const { root, project, run, caseCount } = createParserSandbox(
  'suggestions',
  fileURLToPath(import.meta.url)
);

try {
  for (const [args, suggestion] of [
    [['projcet'], 'project'],
    [['project', 'lsit'], 'list'],
    [['--verboes'], '--verbose'],
    [['project', 'list', '--interactiv'], '--interactive'],
    [['issue', 'comment', 'lsit'], 'list'],
  ]) {
    const result = run(args);
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Usage:/);
    assert.match(result.stderr, /Did you mean/);
    assert.match(result.stderr, new RegExp(suggestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(result.stderr, /\(outputHelp\)/);
  }

  for (const [args, suggestion] of [
    [['help', 'projcet'], 'project'],
    [['project', 'help', 'lsit'], 'list'],
    [['help', 'project', 'lsit'], 'list'],
    [['project', 'dependencies', 'help', 'lsit'], 'list'],
    [['--', 'help', 'projcet'], 'project'],
    [['help', 'project', 'dependencies', 'lsit'], 'list'],
    [['help', 'issue', 'comment', 'lsit'], 'list'],
    [['--', 'help', 'project', 'lsit'], 'list'],
  ]) {
    const result = run(args);
    assert.equal(result.status, 2, `${args.join(' ')}\n${result.stderr}`);
    assert.equal(result.stdout, '', args.join(' '));
    assert.match(result.stderr, /Usage:/, args.join(' '));
    assert.match(result.stderr, /Did you mean/, args.join(' '));
    assert.match(result.stderr, new RegExp(suggestion), args.join(' '));
  }

  for (const args of [
    ['help', 'help'],
    ['project', 'help', 'help'],
    ['help', 'project', 'help'],
    ['--', 'help', 'help'],
    ['help', 'icons', 'help', 'list'],
    ['icons', 'help', 'help', 'list'],
    ['--', 'help', 'icons', 'help', 'list'],
    ['--no-input', 'help', 'config', 'help', 'set', 'projectCacheMinTTL', '120'],
    ['--no-input', 'help', 'config', 'set', 'projectCacheMinTTL', '120'],
    ['help', 'icons', 'view', 'bug'],
    ['icons', 'help', 'list', '--search', 'bug'],
  ]) {
    const before = snapshot(root);
    const result = run(args);
    assert.equal(result.status, 2, `${args.join(' ')}\n${result.stderr}`);
    assert.equal(result.stdout, '', args.join(' '));
    assert.match(result.stderr, /Usage:/, args.join(' '));
    assert.match(result.stderr, /Invalid generated help:/, args.join(' '));
    assert.doesNotMatch(result.stderr, /__invalid_help__/, args.join(' '));
    assert.deepEqual(snapshot(root), before, `${args.join(' ')} changed local files`);
  }

  const legacy = run(['issue', 'comment', 'ENG-123']);
  assert.equal(legacy.status, 2, legacy.stderr);
  assert.match(legacy.stderr, /legacy comment syntax has been removed/);
  assert.match(legacy.stderr, /issue comment add 'ENG-123'/);
  const terminatedLegacy = run(['--', 'issue', 'comment', 'ENG-123']);
  assert.equal(terminatedLegacy.status, 2, terminatedLegacy.stderr);
  assert.match(terminatedLegacy.stderr, /legacy comment syntax has been removed/);
  for (const flags of ['-qv', '-vq', '-qvv']) {
    const clusteredLegacy = run([flags, 'issue', 'comment', 'ENG-123']);
    assert.equal(clusteredLegacy.status, 2, clusteredLegacy.stderr);
    assert.match(clusteredLegacy.stderr, /legacy comment syntax has been removed/);
  }
  for (const args of [
    ['-qC', project, 'issue', 'comment', 'ENG-123'],
    ['-vC', project, 'issue', 'comment', 'ENG-123'],
    [`-qC${project}`, 'issue', 'comment', 'ENG-123'],
  ]) {
    const cwdClusteredLegacy = run(args);
    assert.equal(cwdClusteredLegacy.status, 2, cwdClusteredLegacy.stderr);
    assert.match(cwdClusteredLegacy.stderr, /legacy comment syntax has been removed/);
  }

  process.stdout.write(
    `M36 parser did-you-mean/generated-help/legacy built-CLI verification passed (${caseCount()} CLI cases)\n`
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
