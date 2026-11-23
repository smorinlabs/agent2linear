// Ink/React view, loaded via dynamic import() only when the interactive UI renders,
// so non-interactive invocations of the CLI do not pay ink's import cost.
import { Box, render, Text } from 'ink';
import React from 'react';

import { formatContentPreview } from '../../lib/output.js';
import type { ProjectListItem } from '../../lib/types.js';
import type { PaginationPresentation } from './list.js';

interface ProjectListProps {
  projects: ProjectListItem[];
  presentation: PaginationPresentation;
}

function ProjectList({ projects, presentation }: ProjectListProps): React.ReactElement {
  if (projects.length === 0) {
    return <Text color="yellow">No projects found matching your filters.</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold underline>
        Projects ({projects.length})
      </Text>
      <Text> </Text>
      {projects.map(project => (
        <Box key={project.id} flexDirection="column" marginBottom={1}>
          <Text>
            <Text bold color="cyan">
              {project.name}
            </Text>{' '}
            <Text dimColor>({project.id.substring(0, 8)}...)</Text>
          </Text>
          <Text>
            Status: <Text color="green">{project.status?.name || project.state}</Text>
            {' | '}Team: <Text color="blue">{project.team?.name || 'N/A'}</Text>
            {' | '}Lead: <Text color="magenta">{project.lead?.name || 'N/A'}</Text>
          </Text>
          {(project.description || project.content) && (
            <Text dimColor>
              {formatContentPreview(project.description || project.content || '')}
            </Text>
          )}
        </Box>
      ))}
      {presentation.commands && (
        <Box flexDirection="column">
          <Text>Next page:</Text>
          <Text>{presentation.commands.nextCommand}</Text>
          <Text>All remaining:</Text>
          <Text>{presentation.commands.allRemainingCommand}</Text>
        </Box>
      )}
    </Box>
  );
}

export function renderProjectList(props: ProjectListProps): void {
  render(<ProjectList {...props} />);
}
