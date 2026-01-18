import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Heading,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Button,
  VStack,
  HStack,
  Text,
  useToast,
  IconButton,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Badge,
  Tooltip,
} from '@chakra-ui/react';
import { ViewIcon, EditIcon, DeleteIcon, CheckIcon, CloseIcon, TimeIcon } from '@chakra-ui/icons';
import { Header } from '../components/common/Header';
import { UnifiedWorkflowForm } from '../components/workflow/UnifiedWorkflowForm';
import { PresetsList } from '../components/workflow/PresetsList';
import { ExecutionStatus } from '../components/workflow/ExecutionStatus';
import { WorkflowViewModal } from '../components/workflow/WorkflowViewModal';
import { WorkflowEditModal } from '../components/workflow/WorkflowEditModal';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import { useExecutionStatus } from '../hooks/useExecutionStatus';
import { workflowService } from '../services/workflow.service';
import type { WorkflowConfig, WorkflowPreset, Execution, ExecutionCreate, WorkflowConfigCreate } from '../types';

export const WorkflowPage: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [defaultWorkflow, setDefaultWorkflow] = useState<WorkflowConfig | null>(null);
  const [presets, setPresets] = useState<WorkflowPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<Execution | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<WorkflowPreset | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<Execution[]>([]);
  const [executionsLoading, setExecutionsLoading] = useState(false);
  const [showRecentExecutions, setShowRecentExecutions] = useState(false);
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<number | null>(null);
  const toast = useToast();

  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const { execution, loading: executionStatusLoading, cancelExecution } = useExecutionStatus({
    executionId: currentExecution?.id || 0,
    pollInterval: 2000,
    onComplete: (exec) => {
      setCurrentExecution(exec);
    },
  });

  const fetchWorkflow = useCallback(async (id: number) => {
    try {
      const workflows = await workflowService.getWorkflows();
      const workflow = workflows.find(w => w.id === id);
      if (workflow) {
        setDefaultWorkflow(workflow);
      } else {
        toast({
          title: 'Помилка',
          description: 'Workflow не знайдено',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Failed to fetch workflow:', error);
      toast({
        title: 'Помилка',
        description: error.message || 'Не вдалося завантажити workflow',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast, navigate]);

  const fetchDefaultWorkflow = useCallback(async () => {
    try {
      const workflow = await workflowService.getDefaultWorkflow();
      setDefaultWorkflow(workflow);
    } catch (error: any) {
      console.error('Failed to fetch default workflow:', error);
      toast({
        title: 'Помилка',
        description: error.message || 'Не вдалося завантажити workflow',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);

  const fetchPresets = useCallback(async () => {
    setPresetsLoading(true);
    try {
      const data = await workflowService.getPresets();
      setPresets(data);
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    } finally {
      setPresetsLoading(false);
    }
  }, []);

  const fetchRecentExecutions = useCallback(async () => {
    setExecutionsLoading(true);
    try {
      const data = await workflowService.getExecutions();
      // Показуємо тільки останні 5
      setRecentExecutions(data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    } finally {
      setExecutionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (workflowId) {
      fetchWorkflow(parseInt(workflowId));
    } else {
      fetchDefaultWorkflow();
    }
    fetchPresets();
    fetchRecentExecutions();
  }, [workflowId, fetchWorkflow, fetchDefaultWorkflow, fetchPresets, fetchRecentExecutions]);

  const handleUnifiedSubmit = useCallback(async (data: { workflow_name: string; keywords: string; location: string }) => {
    if (!defaultWorkflow) {
      toast({
        title: 'Error',
        description: 'Workflow not loaded. Please update the page',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setExecutionLoading(true);
    try {
      // Створюємо execution з даними форми, використовуючи поточний workflow
      const executionData: ExecutionCreate = {
        workflow_config_id: defaultWorkflow.id,
        keywords: data.keywords,
        location: data.location,
      };
      
      const execution = await workflowService.createExecution(executionData);
      setCurrentExecution(execution);
      setSelectedPreset(null);
      
      // Оновлюємо список executions
      await fetchRecentExecutions();
      
      toast({
        title: 'Success!',
        description: 'Automation successfully started',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start automation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setExecutionLoading(false);
    }
  }, [defaultWorkflow, toast, fetchRecentExecutions]);

  const handleSelectPreset = useCallback((preset: WorkflowPreset) => {
    setSelectedPreset(preset);
    setShowPresets(false);
  }, []);

  const handleCancelExecution = useCallback(async () => {
    if (currentExecution) {
      try {
        await cancelExecution();
        toast({
          title: 'Cancelled',
          description: 'Execution cancelled',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to cancel execution',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, [currentExecution, cancelExecution, toast]);

  const handleView = useCallback(() => {
    if (defaultWorkflow) {
      onViewOpen();
    }
  }, [defaultWorkflow, onViewOpen]);

  const handleEdit = useCallback(() => {
    if (defaultWorkflow) {
      onEditOpen();
    }
  }, [defaultWorkflow, onEditOpen]);

  const handleDeleteClick = useCallback(() => {
    if (defaultWorkflow) {
      setDeleteWorkflowId(defaultWorkflow.id);
      onDeleteOpen();
    }
  }, [defaultWorkflow, onDeleteOpen]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteWorkflowId || !defaultWorkflow) return;

    try {
      await workflowService.deleteWorkflow(deleteWorkflowId);
      toast({
        title: 'Success!',
        description: 'Automation deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onDeleteClose();
      setDeleteWorkflowId(null);
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete automation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [deleteWorkflowId, defaultWorkflow, toast, navigate, onDeleteClose]);

  const handleToggleActive = useCallback(async () => {
    if (!defaultWorkflow) return;
    
    try {
      const updated = await workflowService.updateWorkflowActiveStatus(defaultWorkflow.id, !defaultWorkflow.is_active);
      setDefaultWorkflow(updated);
      toast({
        title: 'Success!',
        description: `Automation ${updated.is_active ? 'activated' : 'deactivated'}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change status',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [defaultWorkflow, toast]);

  const handleSaveEdit = useCallback(async (id: number, data: WorkflowConfigCreate) => {
    try {
      const updated = await workflowService.updateWorkflow(id, data);
      setDefaultWorkflow(updated);
      toast({
        title: 'Success!',
        description: 'Automation updated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onEditClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update automation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      throw error;
    }
  }, [toast, onEditClose]);

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleTogglePresets = useCallback(() => {
    setShowPresets(prev => !prev);
  }, []);

  const handleToggleRecentExecutions = useCallback(() => {
    setShowRecentExecutions(prev => !prev);
  }, []);

  const initialFormData = useMemo(() => {
    if (selectedPreset) {
      return {
        workflow_name: defaultWorkflow?.workflow_name || '',
        keywords: selectedPreset.keywords,
        location: selectedPreset.location,
      };
    }
    return {
      workflow_name: defaultWorkflow?.workflow_name || '',
    };
  }, [selectedPreset, defaultWorkflow?.workflow_name]);

  const hasRecentExecutions = useMemo(() => recentExecutions.length > 0, [recentExecutions.length]);

  return (
    <Box minH="100vh" bg="gray.50">
      <Header />
      <Container maxW="7xl" py={10}>
        <Box mb={10}>
          <HStack justify="space-between" align="center" mb={2}>
            <Box flex={1}>
              <Heading 
                size="xl" 
                color="gray.800" 
                fontWeight="700" 
                letterSpacing="-0.5px"
                mb={2}
              >
                {defaultWorkflow?.workflow_name || 'Workflow'}
              </Heading>
              <Text color="gray.600" fontSize="md">
                Manage automation and run executions
              </Text>
            </Box>
            <Button
              onClick={handleBack}
              variant="outline"
              colorScheme="gray"
              size="sm"
            >
              ← Back to list
            </Button>
          </HStack>
        </Box>

        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={8}>
          <GridItem colSpan={{ base: 1, lg: 2 }}>
            <Card
              shadow="0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
              borderRadius="2xl"
              border="1px solid"
              borderColor="gray.200"
              bg="white"
            >
              <CardBody>
                <Heading size="md" mb={3} color="gray.800">
                  Execution data
                </Heading>
                <Text color="gray.600" mb={4}>
                  Review execution history and download CSV/Excel from the database.
                </Text>
                <HStack>
                  <Button
                    as={RouterLink}
                    to="/executions"
                    colorScheme="red"
                    variant="solid"
                  >
                    View data
                  </Button>
                </HStack>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem>
            <Card 
              shadow="0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
              borderRadius="2xl" 
              border="1px solid"
              borderColor="gray.200"
              bg="white"
              _hover={{
                shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                transform: 'translateY(-2px)',
              }}
              transition="all 0.3s ease"
            >
              <CardHeader
                borderBottom="1px solid"
                borderColor="gray.100"
                bgGradient="linear(to-r, white, gray.50)"
              >
                <HStack justify="space-between" align="center">
                  <Heading size="md" color="gray.800" fontWeight="600">
                    Run Workflow
                  </Heading>
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="gray.300"
                    color="gray.700"
                    borderRadius="lg"
                    fontWeight="500"
                    _hover={{
                      bg: 'red.50',
                      borderColor: 'red.400',
                      color: 'red.600',
                      transform: 'scale(1.05)',
                    }}
                    _active={{
                      transform: 'scale(0.98)',
                    }}
                    transition="all 0.2s"
                    onClick={handleTogglePresets}
                  >
                    {showPresets ? 'Hide' : 'Show'} Presets
                  </Button>
                </HStack>
              </CardHeader>
              <CardBody>
                {showPresets ? (
                  <PresetsList
                    presets={presets}
                    onSelectPreset={handleSelectPreset}
                    loading={presetsLoading}
                  />
                ) : !currentExecution ? (
                  <UnifiedWorkflowForm
                    onSubmit={handleUnifiedSubmit}
                    initialData={initialFormData}
                    loading={executionLoading}
                  />
                ) : (
                  <ExecutionStatus
                    execution={execution || currentExecution}
                    loading={executionStatusLoading}
                    onCancel={handleCancelExecution}
                  />
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem>
            <Card
              shadow="0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
              borderRadius="2xl"
              border="1px solid"
              borderColor="gray.200"
              bg="white"
              _hover={{
                shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                transform: 'translateY(-2px)',
              }}
              transition="all 0.3s ease"
            >
              <CardHeader
                borderBottom="1px solid"
                borderColor="gray.100"
                bgGradient="linear(to-r, white, gray.50)"
              >
                <Heading size="md" color="gray.800" fontWeight="600">
                  My Workflows
                </Heading>
              </CardHeader>
              <CardBody>
                {defaultWorkflow ? (
                  <Box>
                    <HStack justify="space-between" align="flex-start" spacing={4} mb={4}>
                      <VStack align="flex-start" spacing={2} flex={1}>
                        <HStack spacing={3}>
                          <Heading size="sm" color="gray.800">
                            {defaultWorkflow.workflow_name}
                          </Heading>
                          <Badge
                            colorScheme={defaultWorkflow.is_active ? 'green' : 'gray'}
                            borderRadius="full"
                            px={3}
                            py={1}
                            fontSize="xs"
                            fontWeight="600"
                          >
                            {defaultWorkflow.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </HStack>
                        <HStack spacing={4} fontSize="sm" color="gray.600">
                          <HStack spacing={1}>
                            <TimeIcon boxSize={4} />
                            <Text>Every {defaultWorkflow.run_interval_minutes} minutes</Text>
                          </HStack>
                          <Text>
                            Last execution: {defaultWorkflow.last_run_at 
                              ? new Date(defaultWorkflow.last_run_at).toLocaleDateString('uk-UA')
                              : 'Not executed yet'}
                          </Text>
                        </HStack>
                      </VStack>
                      <HStack spacing={2}>
                        <Tooltip label="View parameters">
                          <IconButton
                            aria-label="View"
                            icon={<ViewIcon />}
                            size="sm"
                            variant="outline"
                            colorScheme="red"
                            onClick={handleView}
                          />
                        </Tooltip>
                        <Tooltip label="Edit">
                          <IconButton
                            aria-label="Edit"
                            icon={<EditIcon />}
                            size="sm"
                            variant="outline"
                            colorScheme="orange"
                            onClick={handleEdit}
                          />
                        </Tooltip>
                        <Tooltip label={defaultWorkflow.is_active ? 'Deactivate' : 'Activate'}>
                          <IconButton
                            aria-label={defaultWorkflow.is_active ? 'Deactivate' : 'Activate'}
                            icon={defaultWorkflow.is_active ? <CloseIcon /> : <CheckIcon />}
                            size="sm"
                            variant={defaultWorkflow.is_active ? 'outline' : 'solid'}
                            colorScheme={defaultWorkflow.is_active ? 'red' : 'green'}
                            onClick={handleToggleActive}
                          />
                        </Tooltip>
                        <Tooltip label="Delete">
                          <IconButton
                            aria-label="Delete"
                            icon={<DeleteIcon />}
                            size="sm"
                            variant="outline"
                            colorScheme="red"
                            onClick={handleDeleteClick}
                          />
                        </Tooltip>
                      </HStack>
                    </HStack>
                  </Box>
                ) : (
                  <Text color="gray.500" fontSize="md">
                    Workflow not loaded
                  </Text>
                )}
              </CardBody>
            </Card>
          </GridItem>


          <GridItem colSpan={{ base: 1, lg: 2 }}>
            <Card
              shadow="0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
              borderRadius="2xl"
              border="1px solid"
              borderColor="gray.200"
              bg="white"
            >
              <CardHeader 
                borderBottom="1px solid" 
                borderColor="gray.100"
                bgGradient="linear(to-r, white, gray.50)"
              >
                <HStack justify="space-between" align="center">
                  <Heading size="md" color="gray.800" fontWeight="600">
                    Recent executions
                  </Heading>
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="gray.300"
                    color="gray.700"
                    borderRadius="lg"
                    fontWeight="500"
                    _hover={{
                      bg: 'red.50',
                      borderColor: 'red.400',
                      color: 'red.600',
                      transform: 'scale(1.05)',
                    }}
                    _active={{
                      transform: 'scale(0.98)',
                    }}
                    transition="all 0.2s"
                    onClick={handleToggleRecentExecutions}
                  >
                    {showRecentExecutions ? 'Hide' : 'View'}
                  </Button>
                </HStack>
              </CardHeader>
              {showRecentExecutions && (
                <CardBody>
                  {executionsLoading ? (
                    <Text color="gray.500">Loading...</Text>
                  ) : !hasRecentExecutions ? (
                    <Text color="gray.500">No executions</Text>
                  ) : (
                    <VStack spacing={3} align="stretch">
                      {recentExecutions.map((exec) => (
                        <Box
                          key={exec.id}
                          p={4}
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="lg"
                          bg="gray.50"
                        >
                          <HStack justify="space-between" mb={2}>
                            <Text fontWeight="600" color="gray.700">
                              ID: {exec.id}
                            </Text>
                            <Box
                              px={3}
                              py={1}
                              borderRadius="md"
                              bg={
                                exec.status === 'success' ? 'green.100' :
                                exec.status === 'error' ? 'red.100' :
                                exec.status === 'running' ? 'blue.100' :
                                'yellow.100'
                              }
                              color={
                                exec.status === 'success' ? 'green.700' :
                                exec.status === 'error' ? 'red.700' :
                                exec.status === 'running' ? 'blue.700' :
                                'yellow.700'
                              }
                              fontSize="sm"
                              fontWeight="600"
                            >
                              {exec.status.toUpperCase()}
                            </Box>
                          </HStack>
                          <Text fontSize="sm" color="gray.600">
                            Keywords: {exec.keywords}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            Location: {exec.location}
                          </Text>
                          <Text fontSize="sm" color="gray.500" mt={1}>
                            {new Date(exec.created_at).toLocaleString()}
                          </Text>
                        </Box>
                      ))}
                    </VStack>
                  )}
                </CardBody>
              )}
            </Card>
          </GridItem>
        </Grid>
      </Container>

      <WorkflowViewModal
        isOpen={isViewOpen}
        onClose={onViewClose}
        workflow={defaultWorkflow}
      />

      <WorkflowEditModal
        isOpen={isEditOpen}
        onClose={onEditClose}
        workflow={defaultWorkflow}
        onSave={handleSaveEdit}
      />

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete automation?
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure? This action cannot be undone. All data associated with this automation will be deleted.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};
