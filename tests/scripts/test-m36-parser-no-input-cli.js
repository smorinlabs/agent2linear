#!/usr/bin/env node

// One of four shards of the M36 parser/no-input built-CLI fixture (split so the
// shards can run concurrently); see m36-parser-harness.js for the shared sandbox.

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createParserSandbox, snapshot } from './m36-parser-harness.js';

const { root, project, history, milestoneTemplates, run, caseCount } = createParserSandbox(
  'no-input',
  fileURLToPath(import.meta.url)
);

try {
  mkdirSync(dirname(history), { recursive: true });
  const seededHistory = '{"version":1,"entries":[]}\n';
  for (const args of [
    ['--no-input', 'cursor-history', 'clear'],
    ['cursor-history', 'clear', '--no-input'],
  ]) {
    writeFileSync(history, seededHistory, 'utf8');
    const result = run(args);
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /--no-input/);
    assert.match(result.stderr, /--yes/);
    assert.equal(readFileSync(history, 'utf8'), seededHistory);
  }

  for (const args of [
    ['--no-input', 'setup'],
    ['--no-input', 'initiatives', 'select'],
    ['--no-input', 'teams', 'select'],
    ['--no-input', 'alias', 'edit'],
    ['--no-input', 'config', 'edit'],
    ['--no-input', 'milestone-templates', 'edit', 'example'],
    ['--no-input', 'initiatives', 'list', '--interactive'],
    ['--no-input', 'initiatives', 'view', '--interactive'],
    ['--no-input', 'teams', 'list', '--interactive'],
    ['--no-input', 'members', 'list', '--interactive'],
    ['--no-input', 'templates', 'list', '--interactive'],
    ['--no-input', 'project-status', 'list', '--interactive'],
    ['--no-input', 'milestone-templates', 'create', '--interactive'],
    ['--no-input', 'project', 'create', '--interactive'],
    ['--no-input', 'project', 'list', '--interactive'],
  ]) {
    const result = run(args);
    assert.equal(result.status, 2, `${args.join(' ')}\n${result.stderr}`);
    assert.equal(result.stdout, '', args.join(' '));
    assert.match(result.stderr, /--no-input forbids interactive input/, args.join(' '));
  }

  for (const args of [
    ['setup'],
    ['initiatives', 'select'],
    ['teams', 'select'],
    ['alias', 'edit'],
    ['config', 'edit'],
    ['milestone-templates', 'edit', 'example'],
    ['initiatives', 'list', '--interactive'],
    ['teams', 'list', '--interactive'],
    ['milestone-templates', 'create', '--interactive'],
  ]) {
    const result = run(args);
    assert.equal(result.status, 2, `${args.join(' ')}\n${result.stderr}`);
    assert.equal(result.stdout, '', args.join(' '));
    assert.match(result.stderr, /requires interactive input from a TTY/, args.join(' '));
  }

  writeFileSync(history, seededHistory, 'utf8');
  const accepted = run(['--no-input', 'cursor-history', 'clear', '--yes']);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(existsSync(history), false);

  mkdirSync(dirname(milestoneTemplates), { recursive: true });
  const seededTemplates = JSON.stringify({
    templates: { std: { name: 'std', milestones: [{ name: 'M1' }] } },
  });
  writeFileSync(milestoneTemplates, seededTemplates, 'utf8');
  const templateConsentFailure = run(['--no-input', 'milestone-templates', 'remove', 'std']);
  assert.equal(templateConsentFailure.status, 2, templateConsentFailure.stderr);
  assert.equal(readFileSync(milestoneTemplates, 'utf8'), seededTemplates);
  const templateNonTtyFailure = run(['milestone-templates', 'remove', 'std']);
  assert.equal(templateNonTtyFailure.status, 2, templateNonTtyFailure.stderr);
  assert.match(templateNonTtyFailure.stderr, /requires interactive input from a TTY/);
  assert.equal(readFileSync(milestoneTemplates, 'utf8'), seededTemplates);

  const authFailure = run(['--no-input', 'whoami']);
  assert.equal(authFailure.status, 4, authFailure.stderr);
  assert.equal(authFailure.stdout, '');
  const workspaceAuthFailure = run(['--no-input', 'workspace', 'add', 'scratch']);
  assert.equal(workspaceAuthFailure.status, 4, workspaceAuthFailure.stderr);
  assert.equal(workspaceAuthFailure.stdout, '');

  for (const args of [
    ['--no-input', 'issue', 'create'],
    ['--no-input', 'milestone-templates', 'create'],
    ['--no-input', 'initiatives', 'view'],
    ['--no-input', 'alias', 'add', 'team', 'scratch'],
    ['--no-input', 'project', 'create', '--team', 'team_x'],
    ['--no-input', 'project', 'create', '--title', 'Example'],
    ['--no-input', 'milestone-templates', 'create', 'example'],
    ['--no-input', 'issue', 'update', 'ENG-1'],
    ['--no-input', 'workflow-states', 'create'],
    ['--no-input', 'workflow-states', 'create', '--name', 'Example'],
    ['--no-input', 'workflow-states', 'update', 'state_x'],
    ['--no-input', 'project', 'dependencies', 'clear', 'missing'],
    ['--no-input', 'workflow-states', 'delete', 'fake-id'],
    ['--no-input', 'project', 'add-milestones', 'missing'],
  ]) {
    const missingInput = run(args);
    assert.equal(missingInput.status, 2, `${args.join(' ')}\n${missingInput.stderr}`);
    assert.equal(missingInput.stdout, '', args.join(' '));
  }

  const pipedIssueWithoutTeam = run(['--no-input', 'issue', 'create'], {
    input: 'Piped issue title\n',
  });
  assert.equal(pipedIssueWithoutTeam.status, 2, pipedIssueWithoutTeam.stderr);
  assert.match(pipedIssueWithoutTeam.stderr, /team.*required/i);

  const missingKey = join(project, 'missing-key.txt');
  const inputFailure = run(['--no-input', '--api-key-file', missingKey, 'workspace', 'current']);
  assert.equal(inputFailure.status, 1, inputFailure.stderr);
  assert.equal(inputFailure.stdout, '');
  assert.match(inputFailure.stderr, /missing-key\.txt/);

  const suppliedInput = run(['--no-input', '--api-key-file', '-', 'workspace', 'current'], {
    input: 'lin_api_explicit_stdin_only\n',
  });
  assert.equal(suppliedInput.status, 0, suppliedInput.stderr);
  assert.doesNotMatch(JSON.stringify(snapshot(root)), /lin_api_explicit_stdin_only/);

  process.stdout.write(
    `M36 parser no-input/TTY/consent built-CLI verification passed (${caseCount()} CLI cases)\n`
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
