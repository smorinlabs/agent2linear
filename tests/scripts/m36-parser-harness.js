// Shared sandbox + helpers for the test-m36-parser-*-cli.js built-CLI fixtures.
// Each fixture gets its own mkdtemp root so the shards can run concurrently.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cli = join(repo, 'dist/index.js');

export function createParserSandbox(name, fixturePath) {
  if (!existsSync(cli)) {
    throw new Error(`Build dist/index.js before running ${fixturePath}`);
  }
  const root = mkdtempSync(join(tmpdir(), `a2l-m36-parser-${name}-`));
  const home = join(root, 'home');
  const xdg = join(root, 'xdg');
  const state = join(root, 'state');
  const project = join(root, 'project');
  mkdirSync(home, { recursive: true });
  mkdirSync(project, { recursive: true });

  let cases = 0;
  function run(args, { input, extraEnv = {} } = {}) {
    cases += 1;
    return spawnSync(process.execPath, [cli, ...args], {
      cwd: repo,
      encoding: 'utf8',
      input,
      timeout: 10_000,
      env: {
        ...process.env,
        HOME: home,
        XDG_CONFIG_HOME: xdg,
        XDG_CACHE_HOME: join(root, 'cache'),
        XDG_STATE_HOME: state,
        AGENT2LINEAR_WORKSPACE: '',
        LINEAR_API_KEY: '',
        NODE_NO_WARNINGS: '1',
        ...extraEnv,
      },
    });
  }

  return {
    root,
    xdg,
    project,
    history: join(state, 'agent2linear', 'cursor-history.json'),
    milestoneTemplates: join(xdg, 'agent2linear', 'milestone-templates.json'),
    run,
    caseCount: () => cases,
  };
}

export function snapshot(path) {
  if (!existsSync(path)) return null;
  const stats = statSync(path);
  if (stats.isFile()) return { type: 'file', body: readFileSync(path, 'utf8') };
  return {
    type: 'directory',
    entries: Object.fromEntries(
      readdirSync(path)
        .sort()
        .map(name => [name, snapshot(join(path, name))])
    ),
  };
}

export function assertUsageFailure(result, commandLabel) {
  assert.equal(result.status, 2, `${commandLabel}\n${result.stderr}`);
  assert.equal(result.stdout, '', commandLabel);
  assert.match(result.stderr, /Usage:/, commandLabel);
  assert.match(result.stderr, /Commands:/, commandLabel);
  assert.doesNotMatch(result.stderr, /\(outputHelp\)/, commandLabel);
}
