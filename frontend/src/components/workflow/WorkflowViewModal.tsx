import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Divider,
  Code,
} from '@chakra-ui/react';
import type { WorkflowConfig } from '../../types';

interface WorkflowViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: WorkflowConfig | null;
}

export const WorkflowViewModal: React.FC<WorkflowViewModalProps> = ({
  isOpen,
  onClose,
  workflow,
}) => {
  if (!workflow) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={3}>
            <Text>Automation parameters</Text>
            <Badge
              colorScheme={workflow.is_active ? 'green' : 'gray'}
              borderRadius="full"
              px={3}
              py={1}
            >
              {workflow.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Name
              </Text>
              <Text fontWeight="600" fontSize="md">
                {workflow.workflow_name}
              </Text>
            </Box>

            <Divider />

            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                N8N Workflow ID or webhook path
              </Text>
              <Code p={2} borderRadius="md" fontSize="sm">
                {workflow.n8n_workflow_id}
              </Code>
            </Box>

            {workflow.webhook_path && (
              <>
                <Divider />
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Webhook Path
                  </Text>
                  <Code p={2} borderRadius="md" fontSize="sm">
                    {workflow.webhook_path}
                  </Code>
                </Box>
              </>
            )}

            <Divider />

            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Execution interval
              </Text>
              <Text fontWeight="500">
                {workflow.run_interval_minutes} minutes
              </Text>
            </Box>

            {workflow.description && (
              <>
                <Divider />
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Description
                  </Text>
                  <Text>{workflow.description}</Text>
                </Box>
              </>
            )}

            {workflow.workflow_version && (
              <>
                <Divider />
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Version
                  </Text>
                  <Code p={2} borderRadius="md" fontSize="sm">
                    {workflow.workflow_version}
                  </Code>
                </Box>
              </>
            )}

            {workflow.source_file && (
              <>
                <Divider />
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Source file
                  </Text>
                  <Text>{workflow.source_file}</Text>
                </Box>
              </>
            )}

            <Divider />

            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Created
              </Text>
              <Text>
                {new Date(workflow.created_at).toLocaleString('uk-UA')}
              </Text>
            </Box>

            {workflow.last_run_at && (
              <>
                <Divider />
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Last run
                  </Text>
                  <Text>
                    {new Date(workflow.last_run_at).toLocaleString('uk-UA')}
                  </Text>
                </Box>
              </>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

