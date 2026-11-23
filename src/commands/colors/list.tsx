import { Command } from 'commander';

import { CURATED_COLORS, extractColorsFromEntities } from '../../lib/colors.js';

export function listColors(program: Command) {
  program
    .command('list')
    .alias('ls')
    .description('List colors')
    .option('--palette <type>', 'Palette source (default|workspace)', 'default')
    .option('--search <hex>', 'Search by hex code')
    .option('-f, --format <type>', 'Output format (json|tsv|grid)', 'grid')
    .action(async (options) => {
      // Handle JSON/TSV output before rendering React component
      if (options.format === 'json' || options.format === 'tsv') {
        try {
          let result = options.palette === 'workspace' ? await extractColorsFromEntities() : CURATED_COLORS;

          if (options.search) {
            result = result.filter(c => c.hex.toLowerCase().includes(options.search.toLowerCase()) || c.name?.toLowerCase().includes(options.search.toLowerCase()));
          }

          if (options.format === 'json') {
            console.log(JSON.stringify(result, null, 2));
          } else if (options.format === 'tsv') {
            console.log('Hex\tName\tUsage');
            for (const color of result) {
              console.log(`${color.hex}\t${color.name || ''}\t${color.usageCount || ''}`);
            }
          }
          process.exit(0);
        } catch (err) {
          console.error('Error:', err instanceof Error ? err.message : 'Unknown error');
          process.exit(1);
        }
      }

      // Render interactive UI for default/grid format
      const { renderColorsList } = await import('./list-view.js');
      renderColorsList({ palette: options.palette, search: options.search, format: options.format });
    });
}
