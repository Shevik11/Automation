import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Heading,
  Grid,
  GridItem,
  Card,
  CardBody,
  Text,
  Badge,
  HStack,
  VStack,
  Spinner,
  useToast,
  Button,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { workflowService } from '../services/workflow.service';
import type { WorkflowConfig } from '../types';

// Memoized workflow card component
const WorkflowCard = React.memo<{
  workflow: WorkflowConfig;
  onClick: (id: number) => void;
  onDelete?: (id: number) => void;
}>(({ workflow, onClick, onDelete }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Activate card on Enter or Space key press (WCAG 2.1 SC 2.1.1)
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(workflow.id);
    }
  };

  return (
    <Card
      as="button"
      shadow="card"
      borderRadius="2xl"
      border="1px solid"
      borderColor="gray.100"
      bg="white"
      cursor="pointer"
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={{
        shadow: 'cardHover',
        transform: 'translateY(-4px)',
        borderColor: 'brand.200',
      }}
      _focus={{
        outline: 'none',
        boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15), 0 0 0 1px rgba(239, 68, 68, 0.5)',
        borderColor: 'brand.500',
      }}
      _focusVisible={{
        outline: 'none',
        boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15), 0 0 0 1px rgba(239, 68, 68, 0.5)',
        borderColor: 'brand.500',
      }}
      onClick={() => onClick(workflow.id)}
      onKeyDown={handleKeyDown}
      h="100%"
      display="flex"
      flexDirection="column"
      textAlign="left"
      aria-label={`Open ${workflow.workflow_name} workflow`}
    >
      <CardBody p={6}>
      <VStack align="stretch" spacing={4} h="100%">
        <HStack justify="space-between" align="start">
          <Box
            w="48px"
            h="48px"
            borderRadius="xl"
            bgGradient="linear(135deg, brand.400, accent.500)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <Text fontSize="xl" fontWeight="bold" color="white">
              {workflow.workflow_name.charAt(0).toUpperCase()}
            </Text>
          </Box>
          <HStack spacing={2}>
            <Badge
              colorScheme={workflow.is_active ? 'green' : 'gray'}
              variant="subtle"
              borderRadius="full"
              px={3}
              py={1}
              fontSize="xs"
              fontWeight="600"
            >
              {workflow.is_active ? 'Активна' : 'Неактивна'}
            </Badge>
            {onDelete && (
              <IconButton
                aria-label="Delete workflow"
                icon={<DeleteIcon />}
                size="xs"
                variant="ghost"
                colorScheme="red"
                onClick={(e) => { e.stopPropagation(); onDelete(workflow.id); }}
              />
            )}
          </HStack>
        </HStack>

        <VStack align="stretch" spacing={2} flex={1}>
          <Heading
            size="md"
            color="gray.800"
            fontWeight="600"
            noOfLines={2}
          >
            {workflow.workflow_name}
          </Heading>

          {workflow.description && (
            <Text
              color="gray.600"
              fontSize="sm"
              noOfLines={2}
            >
              {workflow.description}
            </Text>
          )}
        </VStack>
      </VStack>
    </CardBody>
  </Card>
  );
});
WorkflowCard.displayName = 'WorkflowCard';

export const HomePage: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<number | null>(null);
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchWorkflows = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await workflowService.getWorkflows(signal);
      setWorkflows(data);

      // If no workflows exist, try to initialize default one
      if (data.length === 0) {
        try {
          await workflowService.importWorkflowFromFile('automation.json', signal);
          toast({
            title: 'Initialization',
            description: 'Default automation was created',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          // Fetch workflows again
          const updatedData = await workflowService.getWorkflows(signal);
          setWorkflows(updatedData);
        } catch (initError: any) {
          if (initError.name === 'AbortError') {
            return; // Skip toasts/logs for aborted requests
          }
          console.error('Failed to initialize default workflow:', initError);
          toast({
            title: 'Initialization error',
            description: 'Failed to create default automation',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Skip toasts/logs for aborted requests
      }
      console.error('Failed to fetch workflows:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch automations',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchWorkflows(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchWorkflows]);

  const handleWorkflowClick = useCallback((workflowId: number) => {
    navigate(`/workflow/${workflowId}`);
  }, [navigate]);

  const handleCreateWorkflow = useCallback(async () => {
    if (!newWorkflowName.trim()) return;
    const sourceWorkflow = workflows[0];
    if (!sourceWorkflow) {
      toast({ title: 'Error', description: 'No source workflow to duplicate', status: 'error', duration: 5000, isClosable: true });
      return;
    }
    setCreating(true);
    try {
      await workflowService.duplicateWorkflow(sourceWorkflow.id, newWorkflowName.trim());
      toast({ title: 'Success!', description: `Workflow "${newWorkflowName.trim()}" created`, status: 'success', duration: 3000, isClosable: true });
      setNewWorkflowName('');
      onCreateClose();
      const controller = new AbortController();
      const data = await workflowService.getWorkflows(controller.signal);
      setWorkflows(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.detail || error.message || 'Failed to create workflow', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setCreating(false);
    }
  }, [newWorkflowName, workflows, toast, onCreateClose]);

  const handleDeleteWorkflow = useCallback(async () => {
    if (!deleteWorkflowId) return;
    try {
      await workflowService.deleteWorkflow(deleteWorkflowId);
      toast({ title: 'Success!', description: 'Workflow deleted', status: 'success', duration: 3000, isClosable: true });
      onDeleteClose();
      setDeleteWorkflowId(null);
      const controller = new AbortController();
      const data = await workflowService.getWorkflows(controller.signal);
      setWorkflows(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.response?.data?.detail || error.message || 'Failed to delete workflow', status: 'error', duration: 5000, isClosable: true });
    }
  }, [deleteWorkflowId, toast, onDeleteClose]);

  const hasWorkflows = useMemo(() => workflows.length > 0, [workflows.length]);

  return (
    <Box minH="100vh" bg="gray.50">
      <Header />
      <Container maxW="7xl" py={10}>
        <Box mb={10}>
          <Heading
            size="xl"
            mb={3}
            bgGradient="linear(to-r, gray.800, gray.600)"
            bgClip="text"
            fontWeight="800"
            letterSpacing="-0.5px"
          >
            Automation for job search
          </Heading>
          <Text color="gray.500" fontSize="md">
            Choose a search option or fill the form yourself
          </Text>
        </Box>

        <Box mb={6}>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="brand"
            onClick={onCreateOpen}
            size="md"
          >
            Create Workflow
          </Button>
        </Box>

        {loading ? (
          <Box textAlign="center" py={20}>
            <Spinner size="xl" color="brand.500" thickness="4px" />
            <Text mt={4} color="gray.600">Loading automations...</Text>
          </Box>
        ) : !hasWorkflows ? (
          <Box textAlign="center" py={20}>
            <Text fontSize="lg" color="gray.500">
              No automations. Creating default...
            </Text>
          </Box>
        ) : (
          <>
            <Grid
              templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
              gap={6}
            >
              {workflows.map((workflow) => (
                <GridItem key={workflow.id}>
                  <WorkflowCard
                    workflow={workflow}
                    onClick={handleWorkflowClick}
                    onDelete={(id) => { setDeleteWorkflowId(id); onDeleteOpen(); }}
                  />
                </GridItem>
              ))}
            </Grid>
          </>
        )}
      </Container>

      {/* Create Workflow Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Workflow</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={3} color="gray.600" fontSize="sm">
              A new workflow will be created based on the default template with its own n8n instance.
            </Text>
            <Input
              placeholder="Workflow name"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateWorkflow(); }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Cancel
            </Button>
            <Button
              colorScheme="brand"
              onClick={handleCreateWorkflow}
              isLoading={creating}
              isDisabled={!newWorkflowName.trim()}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Workflow Confirmation */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Workflow?
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure? This will also delete the n8n workflow. This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteWorkflow} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

