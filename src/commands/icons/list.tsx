import { Command } from 'commander';

import { CURATED_ICONS, getIconsByCategory, searchIcons } from '../../lib/icons.js';

export function listIcons(program: Command) {
  program
    .command('list')
    .alias('ls')
    .description('List available icons')
    .option('--search <query>', 'Search icons by name or category')
    .option('--category <category>', 'Filter by category')
    .option('-f, --format <type>', 'Output format (json|tsv|grid)', 'grid')
    .action(async (options) => {
      // Handle JSON/TSV output before rendering React component
      if (options.format === 'json' || options.format === 'tsv') {
        const icons = options.search ? searchIcons(options.search) : options.category ? getIconsByCategory(options.category) : CURATED_ICONS;

        if (options.format === 'json') {
          console.log(JSON.stringify(icons, null, 2));
        } else if (options.format === 'tsv') {
          console.log('Name\tEmoji\tUnicode\tCategory');
          for (const icon of icons) {
            console.log(`${icon.name}\t${icon.emoji}\t${icon.unicode || ''}\t${icon.category || ''}`);
          }
        }
        process.exit(0);
      }

      // Render interactive UI for grid format
      const { renderIconsList } = await import('./list-view.js');
      renderIconsList({ search: options.search, category: options.category, format: options.format });
    });
}
