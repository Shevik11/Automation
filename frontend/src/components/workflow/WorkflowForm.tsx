import React, { useState } from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  FormHelperText,
} from '@chakra-ui/react';
import type { WorkflowConfigCreate } from '../../types';

interface WorkflowFormProps {
  onSubmit: (data: WorkflowConfigCreate) => Promise<void>;
  initialData?: Partial<WorkflowConfigCreate>;
  loading?: boolean;
}

export const WorkflowForm: React.FC<WorkflowFormProps> = ({
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = useState<WorkflowConfigCreate>({
    workflow_name: initialData?.workflow_name || '',
    n8n_workflow_id: initialData?.n8n_workflow_id || '',
    run_interval_minutes: initialData?.run_interval_minutes || 15,
    is_active: initialData?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <VStack spacing={4} align="stretch">
        <FormControl isRequired>
          <FormLabel color="gray.700" fontWeight="500" fontSize="sm" mb={2}>
            Workflow name
          </FormLabel>
          <Input
            type="text"
            name="workflow_name"
            value={formData.workflow_name}
            onChange={handleChange}
            placeholder="e.g. My N8N Workflow"
            size="md"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.300"
            bg="white"
            focusBorderColor="red.500"
            _hover={{
              borderColor: 'gray.400',
            }}
            _focus={{
              borderColor: 'red.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
            }}
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel color="gray.700" fontWeight="500" fontSize="sm" mb={2}>
            N8N Workflow ID
          </FormLabel>
          <Input
            type="text"
            name="n8n_workflow_id"
            value={formData.n8n_workflow_id}
            onChange={handleChange}
            placeholder="n8n workflow ID or webhook path"
            size="md"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.300"
            bg="white"
            focusBorderColor="red.500"
            _hover={{
              borderColor: 'gray.400',
            }}
            _focus={{
              borderColor: 'red.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
            }}
          />
          <FormHelperText color="gray.600" fontSize="sm" mt={1}>
            Enter n8n workflow ID or webhook path
          </FormHelperText>
        </FormControl>

        <FormControl isRequired>
          <FormLabel color="gray.700" fontWeight="500" fontSize="sm" mb={2}>
            Execution interval (minutes)
          </FormLabel>
          <Input
            type="number"
            name="run_interval_minutes"
            value={formData.run_interval_minutes}
            onChange={(e) => setFormData(prev => ({ ...prev, run_interval_minutes: parseInt(e.target.value) || 15 }))}
            placeholder="15"
            min={1}
            size="md"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.300"
            bg="white"
            focusBorderColor="red.500"
            _hover={{
              borderColor: 'gray.400',
            }}
            _focus={{
              borderColor: 'red.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
            }}
          />
          <FormHelperText color="gray.600" fontSize="sm" mt={1}>
            How often to run workflow automatically (every how many minutes)
          </FormHelperText>
        </FormControl>

        <Button
          type="submit"
          bg="red.500"
          color="white"
          size="md"
          width="full"
          isLoading={loading}
          loadingText="Saving..."
          borderRadius="lg"
          fontWeight="600"
          _hover={{
            bg: 'red.600',
            transform: 'translateY(-1px)',
            boxShadow: 'md',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
          transition="all 0.2s"
        >
          Save Workflow Config
        </Button>
      </VStack>
    </form>
  );
};
