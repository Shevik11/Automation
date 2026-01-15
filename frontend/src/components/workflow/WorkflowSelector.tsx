import React from 'react';
import { FormControl, FormLabel, Select, Spinner } from '@chakra-ui/react';
import type { WorkflowConfig } from '../../types';

interface WorkflowSelectorProps {
  workflows: WorkflowConfig[];
  selectedWorkflowId: number | null;
  onSelect: (workflowId: number) => void;
  loading?: boolean;
}

export const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({
  workflows,
  selectedWorkflowId,
  onSelect,
  loading = false,
}) => {
  if (loading) {
    return <Spinner />;
  }

  return (
    <FormControl>
      <FormLabel>Виберіть Workflow</FormLabel>
      <Select
        value={selectedWorkflowId || ''}
        onChange={(e) => onSelect(Number(e.target.value))}
        placeholder="-- Виберіть workflow --"
        size="md"
        borderRadius="md"
        focusBorderColor="blue.500"
      >
        {workflows.map((workflow) => (
          <option key={workflow.id} value={workflow.id}>
            {workflow.workflow_name}
          </option>
        ))}
      </Select>
    </FormControl>
  );
};
