#!/usr/bin/env node

// Runs the offline/hermetic built-CLI E2E scripts against dist/index.js.
// Every script sandboxes its own temp root, so most run concurrently (pool of
// E2E_CONCURRENCY, default 4, longest first). Timing-sensitive scripts run
// serially after the pool. Output is buffered per script and printed when the
// script finishes; the run exits non-zero if any script fails.

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Ordered longest-first (CI timings) so the pool's tail stays short.
const parallelScripts = [
  'tests/scripts/test-m36-config-cli.js',
  'tests/scripts/test-m36-parser-no-input-cli.js',
  'tests/scripts/test-m36-parser-help-cli.js',
  'tests/scripts/test-m36-parser-auth-cli.js',
  'tests/scripts/test-m36-parser-suggestions-cli.js',
  'tests/scripts/test-m36-api-key-cli.js',
  'tests/scripts/test-m36-output-cli.js',
  'tests/scripts/test-config-override-cli.sh',
  'tests/scripts/test-m36-output-migrations-cli.js',
  'tests/scripts/test-label-lifecycle-cli.sh',
  'tests/scripts/test-m36-diagnostics-cli.js',
  'tests/scripts/test-comments-cli.sh',
  'tests/scripts/test-cursor-history-cli.sh',
  'tests/scripts/test-m36-tsv-cli.js',
  'tests/scripts/test-m36-version-cli.js',
];

// Sends SIGINT/SIGTERM right after stdin drains; CPU contention can expose a
// timing race, so it runs alone after the pool.
const serialScripts = ['tests/scripts/test-m36-signals-cli.js'];

const concurrency = Math.max(1, Number.parseInt(process.env.E2E_CONCURRENCY ?? '4', 10) || 4);

function runScript(script) {
  const command = script.endsWith('.sh') ? 'bash' : process.execPath;
  const started = Date.now();
  return new Promise(resolveRun => {
    const chunks = [];
    const child = spawn(command, [script], { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', chunk => chunks.push(chunk));
    child.stderr.on('data', chunk => chunks.push(chunk));
    child.on('error', error => chunks.push(Buffer.from(`spawn error: ${error.message}\n`)));
    child.on('close', (code, signal) => {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      const ok = code === 0;
      const status = ok ? 'PASS' : `FAIL (${signal ? `signal ${signal}` : `exit ${code}`})`;
      const output = Buffer.concat(chunks).toString('utf8').trimEnd();
      const header = `${ok ? '✓' : '✗'} ${script} ${status} in ${seconds}s`;
      if (process.env.GITHUB_ACTIONS === 'true' && ok) {
        // Collapse passing output; failing output stays expanded below.
        process.stdout.write(`::group::${header}\n${output}\n::endgroup::\n`);
      } else {
        process.stdout.write(`${header}\n${output ? `${output}\n` : ''}`);
        if (!ok && process.env.GITHUB_ACTIONS === 'true') {
          process.stdout.write(`::error title=E2E failed::${script} ${status}\n`);
        }
      }
      resolveRun({ script, ok, seconds });
    });
  });
}

async function runPool(scripts, size) {
  const queue = [...scripts];
  const results = [];
  const workers = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length > 0) {
      results.push(await runScript(queue.shift()));
    }
  });
  await Promise.all(workers);
  return results;
}

const started = Date.now();
const results = await runPool(parallelScripts, concurrency);
for (const script of serialScripts) results.push(await runScript(script));

const failed = results.filter(result => !result.ok);
const total = ((Date.now() - started) / 1000).toFixed(1);
process.stdout.write(
  `\nE2E: ${results.length - failed.length}/${results.length} scripts passed in ${total}s ` +
    `(concurrency ${concurrency})\n`
);
if (failed.length > 0) {
  process.stderr.write(`Failed:\n${failed.map(result => `  - ${result.script}`).join('\n')}\n`);
  process.exitCode = 1;
}
