import { Command } from 'commander';

import { resolveAlias } from '../../lib/aliases.js';
import { getConfig } from '../../lib/config.js';
import { noInputRequested } from '../../lib/interaction-policy.js';
import { getAllWorkflowStates, getLinearClient } from '../../lib/linear-client.js';

export function listWorkflowStates(program: Command) {
  program
    .command('list')
    .alias('ls')
    .description('List workflow states (issue statuses)')
    .option('-t, --team <id>', 'Filter by team (ID, name, or alias)')
    .option('--type <type>', 'Filter by type (triage|backlog|unstarted|started|completed|canceled)')
    .option('--color <hex>', 'Filter by color (hex code)')
    .option('-f, --format <type>', 'Output format (json|tsv)', 'default')
    .action(async (options) => {
      // The default renderer reports asynchronous failures inside React. In
      // no-input mode, surface missing credentials at the process boundary.
      if (noInputRequested()) getLinearClient();

      // Handle JSON/TSV output before rendering React component
      if (options.format === 'json' || options.format === 'tsv') {
        try {
          let resolvedTeamId = options.team;
          if (!resolvedTeamId) {
            const config = getConfig();
            if (config.defaultTeam) {
              resolvedTeamId = config.defaultTeam;
            }
          }
          if (resolvedTeamId) {
            resolvedTeamId = resolveAlias('team', resolvedTeamId);
          }

          let allStates = await getAllWorkflowStates(resolvedTeamId);

          if (options.type) {
            allStates = allStates.filter(s => s.type === options.type);
          }
          if (options.color) {
            allStates = allStates.filter(s => s.color.toUpperCase() === options.color.toUpperCase());
          }

          if (options.format === 'json') {
            console.log(JSON.stringify(allStates, null, 2));
          } else if (options.format === 'tsv') {
            console.log('ID\tName\tType\tColor\tPosition\tTeam');
            for (const state of allStates) {
              console.log(`${state.id}\t${state.name}\t${state.type}\t${state.color}\t${state.position}\t${state.teamId}`);
            }
          }
          process.exit(0);
        } catch (err) {
          console.error('Error:', err instanceof Error ? err.message : 'Unknown error');
          process.exit(1);
        }
      }

      // Render interactive UI for default format
      const { renderWorkflowStatesList } = await import('./list-view.js');
      renderWorkflowStatesList({
        teamId: options.team,
        typeFilter: options.type,
        colorFilter: options.color,
        format: options.format,
      });
    });
}
