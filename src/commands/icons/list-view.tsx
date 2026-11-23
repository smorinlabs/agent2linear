// Ink/React view, loaded via dynamic import() only when the interactive UI renders,
// so non-interactive invocations of the CLI do not pay ink's import cost.
import { Box, render, Text } from 'ink';
import React from 'react';

import { CURATED_ICONS, getIconsByCategory, searchIcons } from '../../lib/icons.js';

interface IconsListProps {
  search?: string;
  category?: string;
  format?: string;
}

function IconsList({ search, category, format: _format }: IconsListProps) {
  const icons = search ? searchIcons(search) : category ? getIconsByCategory(category) : CURATED_ICONS;

  if (icons.length === 0) {
    return <Text color="yellow">No icons found</Text>;
  }

  const categories = new Map<string, typeof icons>();
  for (const icon of icons) {
    const cat = icon.category || 'other';
    if (!categories.has(cat)) {
      categories.set(cat, []);
    }
    categories.get(cat)!.push(icon);
  }

  return (
    <Box flexDirection="column">
      <Text bold>Curated Icons ({icons.length})</Text>
      <Text> </Text>

      {Array.from(categories.entries()).map(([cat, catIcons]) => (
        <Box key={cat} flexDirection="column">
          <Text bold color="cyan">Category: {cat}</Text>
          {catIcons.map(icon => (
            <Text key={icon.name}>
              {icon.emoji} <Text bold>{icon.name.padEnd(20)}</Text> <Text dimColor>{icon.unicode || ''}</Text>
            </Text>
          ))}
          <Text> </Text>
        </Box>
      ))}
    </Box>
  );
}

export function renderIconsList(props: IconsListProps): void {
  render(<IconsList {...props} />);
}
