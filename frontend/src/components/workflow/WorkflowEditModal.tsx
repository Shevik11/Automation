import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Textarea,
  useToast,
  FormHelperText,
} from '@chakra-ui/react';
import type { WorkflowConfig, WorkflowConfigCreate } from '../../types';

interface WorkflowEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: WorkflowConfig | null;
  onSave: (id: number, data: WorkflowConfigCreate) => Promise<void>;
}

export const WorkflowEditModal: React.FC<WorkflowEditModalProps> = ({
  isOpen,
  onClose,
  workflow,
  onSave,
}) => {
  const [formData, setFormData] = useState<WorkflowConfigCreate>({
    workflow_name: '',
    n8n_workflow_id: '',
    webhook_path: '',
    run_interval_minutes: 15,
    is_active: true,
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (workflow) {
      setFormData({
        workflow_name: workflow.workflow_name,
        n8n_workflow_id: workflow.n8n_workflow_id,
        webhook_path: workflow.webhook_path || '',
        run_interval_minutes: workflow.run_interval_minutes,
        is_active: workflow.is_active,
        description: workflow.description || '',
      });
    }
  }, [workflow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflow) return;

    setLoading(true);
    try {
      await onSave(workflow.id, formData);
      toast({
        title: 'Success!',
        description: 'Automation updated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update automation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  if (!workflow) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <form onSubmit={handleSubmit}>
        <ModalContent>
          <ModalHeader>Edit automation</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Workflow name</FormLabel>
                <Input
                  name="workflow_name"
                  value={formData.workflow_name}
                  onChange={handleChange}
                  placeholder="My N8N Workflow"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>N8N Workflow ID</FormLabel>
                <Input
                  name="n8n_workflow_id"
                  value={formData.n8n_workflow_id}
                  onChange={handleChange}
                  placeholder="n8n workflow ID or webhook path"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Webhook Path (optional)</FormLabel>
                <Input
                  name="webhook_path"
                  value={formData.webhook_path}
                  onChange={handleChange}
                  placeholder="webhook path"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Execution interval (minutes)</FormLabel>
                <Input
                  type="number"
                  name="run_interval_minutes"
                  value={formData.run_interval_minutes}
                  onChange={handleNumberChange}
                  min={1}
                  isDisabled
                  bg="gray.100"
                  cursor="not-allowed"
                />
                <FormHelperText color="gray.500" fontSize="xs" mt={1}>
                  Execution interval cannot be edited
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Automation description"
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              bg="red.500"
              color="white"
              isLoading={loading}
              loadingText="Saving..."
              _hover={{ bg: 'red.600' }}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </form>
    </Modal>
  );
};

