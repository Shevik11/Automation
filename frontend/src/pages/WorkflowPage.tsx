import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Tooltip,
  Spinner,
  Badge,
  Divider,
  Progress,
} from '@chakra-ui/react';
import { ViewIcon, EditIcon, DeleteIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons';
import { Header } from '../components/common/Header';
import { UnifiedWorkflowForm } from '../components/workflow/UnifiedWorkflowForm';
import { PresetsList } from '../components/workflow/PresetsList';
import { WorkflowViewModal } from '../components/workflow/WorkflowViewModal';
import { WorkflowEditModal } from '../components/workflow/WorkflowEditModal';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import { workflowService } from '../services/workflow.service';
import type { WorkflowConfig, WorkflowPreset, Execution, ExecutionCreate, WorkflowConfigCreate } from '../types';

const STATUS_COLORS: Record<string, { bg: string; color: string; icon: string }> = {
  success: { bg: 'green.50', color: 'green.600', icon: '✅' },
  error: { bg: 'red.50', color: 'red.600', icon: '❌' },
  running: { bg: 'blue.50', color: 'blue.600', icon: '🔄' },
  cancelled: { bg: 'gray.50', color: 'gray.600', icon: '⏹️' },
  pending: { bg: 'yellow.50', color: 'yellow.600', icon: '⏳' },
};

export const WorkflowPage: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [defaultWorkflow, setDefaultWorkflow] = useState<WorkflowConfig | null>(null);
  const [presets, setPresets] = useState<WorkflowPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<WorkflowPreset | null>(null);
  const [workflowExecutions, setWorkflowExecutions] = useState<Execution[]>([]);
  const [executionsLoading, setExecutionsLoading] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<number | null>(null);
  const toast = useToast();
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // Split executions into running and completed
  const runningExecutions = useMemo(
    () => workflowExecutions.filter(e => e.status === 'running' || e.status === 'pending'),
    [workflowExecutions],
  );

  const completedExecutions = useMemo(
    () => workflowExecutions.filter(e => e.status === 'success' || e.status === 'error' || e.status === 'cancelled'),
    [workflowExecutions],
  );

  const fetchWorkflow = useCallback(async (id: number) => {
    try {
      const workflows = await workflowService.getWorkflows();
      const workflow = workflows.find(w => w.id === id);
      if (workflow) {
        setDefaultWorkflow(workflow);
      } else {
        toast({
          title: 'Error',
          description: 'Workflow not found',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Failed to fetch workflow:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load workflow',
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
        title: 'Error',
        description: error.message || 'Failed to load workflow',
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

  const fetchWorkflowExecutions = useCallback(async () => {
    if (!workflowId) return;
    setExecutionsLoading(true);
    try {
      const data = await workflowService.getExecutionsByWorkflow(parseInt(workflowId));
      setWorkflowExecutions(data);
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    } finally {
      setExecutionsLoading(false);
    }
  }, [workflowId]);

  // Check status of all running executions via n8n API and refresh list
  const checkRunningExecutionsStatus = useCallback(async () => {
    const activeExecs = workflowExecutions.filter(e => e.status === 'running' || e.status === 'pending');
    if (activeExecs.length === 0) return;

    try {
      const results = await Promise.allSettled(
        activeExecs.map(exec => workflowService.checkExecutionStatus(exec.id))
      );

      // If any execution changed status, refresh the full list
      const anyChanged = results.some((r, i) => {
        if (r.status === 'fulfilled') {
          return r.value.status !== activeExecs[i].status;
        }
        return false;
      });

      if (anyChanged) {
        await fetchWorkflowExecutions();
      }
    } catch (error) {
      console.error('Failed to check execution statuses:', error);
    }
  }, [workflowExecutions, fetchWorkflowExecutions]);

  // Auto-poll while any execution is running or pending
  const hasActiveExecutions = useMemo(
    () => workflowExecutions.some(e => e.status === 'running' || e.status === 'pending'),
    [workflowExecutions],
  );

  useEffect(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (hasActiveExecutions) {
      pollTimerRef.current = setTimeout(() => {
        checkRunningExecutionsStatus();
        fetchWorkflowExecutions();
      }, 5000);
    }
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [hasActiveExecutions, workflowExecutions, fetchWorkflowExecutions, checkRunningExecutionsStatus]);

  useEffect(() => {
    if (workflowId) {
      fetchWorkflow(parseInt(workflowId));
    } else {
      fetchDefaultWorkflow();
    }
    fetchPresets();
    fetchWorkflowExecutions();
  }, [workflowId, fetchWorkflow, fetchDefaultWorkflow, fetchPresets, fetchWorkflowExecutions]);

  const handleUnifiedSubmit = useCallback(async (data: { keywords: string; location: string }) => {
    if (!defaultWorkflow) {
      toast({
        title: 'Error',
        description: 'Workflow not loaded. Please refresh the page',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setExecutionLoading(true);
    try {
      const executionData: ExecutionCreate = {
        workflow_config_id: defaultWorkflow.id,
        keywords: data.keywords,
        location: data.location,
      };

      const execution = await workflowService.createExecution(executionData);
      setSelectedPreset(null);

      await fetchWorkflowExecutions();

      toast({
        title: 'Automation Started!',
        description: `Execution #${execution.id} — n8n workflow created and activated.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.detail || error.message || 'Failed to start automation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setExecutionLoading(false);
    }
  }, [defaultWorkflow, toast, fetchWorkflowExecutions]);

  const handleSelectPreset = useCallback((preset: WorkflowPreset) => {
    setSelectedPreset(preset);
    setShowPresets(false);
  }, []);

  const handleStopExecution = useCallback(async (execId: number) => {
    setDeactivatingId(execId);
    try {
      await workflowService.deactivateExecution(execId);
      await fetchWorkflowExecutions();
      toast({
        title: 'Workflow Stopped',
        description: `Execution #${execId} stopped — n8n workflow deleted.`,
        status: 'info',
        duration: 4000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.detail || error.message || 'Failed to stop execution',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setDeactivatingId(null);
    }
  }, [fetchWorkflowExecutions, toast]);

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
        description: `Automation ${updated.is_active ? 'activated — n8n workflow created' : 'deactivated — n8n workflow deleted'}`,
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

  const initialFormData = useMemo(() => {
    if (selectedPreset) {
      return {
        keywords: selectedPreset.keywords,
        location: selectedPreset.location,
      };
    }
    return {};
  }, [selectedPreset]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getElapsedTime = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <Header />
      <Container maxW="7xl" py={10}>
        {/* Page Header */}
        <Box mb={8}>
          <HStack justify="space-between" align="center" mb={2}>
            <Box flex={1}>
              <Heading
                size="xl"
                bgGradient="linear(to-r, gray.800, gray.600)"
                bgClip="text"
                fontWeight="800"
                letterSpacing="-0.5px"
                mb={2}
              >
                {defaultWorkflow?.workflow_name || 'Workflow'}
              </Heading>
              <Text color="gray.500" fontSize="md">
                Start automation to create n8n workflow • Stop to delete it from n8n
              </Text>
            </Box>
            <HStack spacing={2}>
              {defaultWorkflow && (
                <>
                  <Tooltip label="View parameters">
                    <IconButton
                      aria-label="View"
                      icon={<ViewIcon />}
                      size="sm"
                      variant="outline"
                      colorScheme="purple"
                      borderRadius="xl"
                      onClick={handleView}
                    />
                  </Tooltip>
                  <Tooltip label="Edit">
                    <IconButton
                      aria-label="Edit"
                      icon={<EditIcon />}
                      size="sm"
                      variant="outline"
                      colorScheme="blue"
                      borderRadius="xl"
                      onClick={handleEdit}
                    />
                  </Tooltip>
                  <Tooltip label={defaultWorkflow.is_active ? 'Deactivate template' : 'Activate template'}>
                    <IconButton
                      aria-label={defaultWorkflow.is_active ? 'Deactivate' : 'Activate'}
                      icon={defaultWorkflow.is_active ? <CloseIcon /> : <CheckIcon />}
                      size="sm"
                      variant={defaultWorkflow.is_active ? 'outline' : 'solid'}
                      colorScheme={defaultWorkflow.is_active ? 'orange' : 'green'}
                      borderRadius="xl"
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
                      borderRadius="xl"
                      onClick={handleDeleteClick}
                    />
                  </Tooltip>
                </>
              )}
              <Button
                onClick={handleBack}
                variant="brandOutline"
                size="sm"
              >
                ← Back to list
              </Button>
            </HStack>
          </HStack>
        </Box>

        {/* Global Execution Data Button */}
        {completedExecutions.length > 0 && (
          <Box mb={6} display="flex" justifyContent="flex-end">
            <Button
              as={RouterLink}
              to="/executions"
              variant="outline"
              colorScheme="red"
              size="xs"
              borderRadius="full"
              rightIcon={<Text as="span">→</Text>}
            >
              View all execution data
            </Button>
          </Box>
        )}

        {/* Run Workflow Form */}
        <Card
          shadow="card"
          borderRadius="2xl"
          border="1px solid"
          borderColor="gray.100"
          bg="white"
          mb={8}
          overflow="hidden"
          position="relative"
        >
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            h="3px"
            bgGradient="linear(to-r, brand.400, accent.400)"
          />
          <CardHeader
            borderBottom="1px solid"
            borderColor="gray.100"
            bg="gray.50"
          >
            <HStack justify="space-between" align="center">
              <VStack align="flex-start" spacing={1}>
                <Heading size="md" color="gray.800" fontWeight="700">
                  🚀 Run Automation
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  Creates a new n8n workflow, activates it, and triggers execution
                </Text>
              </VStack>
              <HStack spacing={2}>
                <Button
                  size="sm"
                  variant="brandOutline"
                  onClick={handleTogglePresets}
                >
                  {showPresets ? 'Hide' : 'Show'} Presets
                </Button>
              </HStack>
            </HStack>
          </CardHeader>
          <CardBody>
            {showPresets ? (
              <PresetsList
                presets={presets}
                onSelectPreset={handleSelectPreset}
                loading={presetsLoading}
              />
            ) : (
              <UnifiedWorkflowForm
                onSubmit={handleUnifiedSubmit}
                workflowName={defaultWorkflow?.workflow_name}
                initialData={initialFormData}
                loading={executionLoading}
              />
            )}
          </CardBody>
        </Card>

        {/* Two-panel layout: Running Workflows | Results */}
        <Grid templateColumns="1fr" gap={8}>
          {/* LEFT: Running Workflows */}
          <GridItem>
            <Card
              shadow="card"
              borderRadius="2xl"
              border="1px solid"
              borderColor="gray.100"
              bg="white"
              overflow="hidden"
              position="relative"
              h="100%"
            >
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                h="3px"
                bgGradient="linear(to-r, blue.400, cyan.400)"
              />
              <CardHeader
                borderBottom="1px solid"
                borderColor="gray.100"
                bg="blue.50"
              >
                <HStack justify="space-between" align="center">
                  <HStack spacing={3}>
                    <Text fontSize="xl">⚡</Text>
                    <VStack align="flex-start" spacing={0}>
                      <Heading size="md" color="gray.800" fontWeight="700">
                        Running Workflows
                      </Heading>
                      <Text fontSize="xs" color="gray.500">
                        Active n8n workflow instances
                      </Text>
                    </VStack>
                  </HStack>
                  {runningExecutions.length > 0 && (
                    <Badge
                      colorScheme="blue"
                      variant="solid"
                      borderRadius="full"
                      px={3}
                      py={1}
                      fontSize="sm"
                    >
                      {runningExecutions.length} active
                    </Badge>
                  )}
                </HStack>
              </CardHeader>
              <CardBody>
                {executionsLoading && workflowExecutions.length === 0 ? (
                  <HStack justify="center" py={8}>
                    <Spinner size="md" color="blue.500" />
                    <Text color="gray.500">Loading...</Text>
                  </HStack>
                ) : runningExecutions.length === 0 ? (
                  <VStack py={10} spacing={3}>
                    <Text fontSize="3xl">💤</Text>
                    <Text color="gray.500" fontSize="md" textAlign="center">
                      No running workflows
                    </Text>
                    <Text color="gray.400" fontSize="sm" textAlign="center">
                      Start an automation above to create and activate an n8n workflow
                    </Text>
                  </VStack>
                ) : (
                  <VStack spacing={5} align="stretch">
                    {runningExecutions.map((exec) => {
                      const colors = STATUS_COLORS[exec.status] ?? STATUS_COLORS.pending;
                      return (
                        <Box
                          key={exec.id}
                          p={4}
                          minH="125px"
                          border="1px solid"
                          borderColor="blue.200"
                          borderRadius="xl"
                          bg="blue.50"
                          position="relative"
                          overflow="hidden"
                        >
                          {exec.status === 'running' && (
                            <Progress
                              size="xs"
                              isIndeterminate
                              colorScheme="blue"
                              position="absolute"
                              top={0}
                              left={0}
                              right={0}
                              borderTopRadius="xl"
                            />
                          )}
                          <HStack justify="space-between" mb={4} mt={exec.status === 'running' ? 1 : 0}>
                            <HStack spacing={3}>
                              <Text fontSize="xl">{colors.icon}</Text>
                              <Text fontWeight="700" color="gray.800" fontSize="lg">
                                Execution #{exec.id}
                              </Text>
                            </HStack>
                            <HStack spacing={2}>
                              <Badge
                                colorScheme={exec.status === 'running' ? 'blue' : 'yellow'}
                                variant="subtle"
                                borderRadius="full"
                                px={3}
                                py={1}
                                fontSize="xs"
                                fontWeight="600"
                              >
                                {exec.status.toUpperCase()}
                              </Badge>
                              <Button
                                size="sm"
                                colorScheme="red"
                                variant="solid"
                                borderRadius="lg"
                                isLoading={deactivatingId === exec.id}
                                onClick={() => handleStopExecution(exec.id)}
                                _hover={{ transform: 'translateY(-1px)', shadow: 'md' }}
                                transition="all 0.2s"
                              >
                                ⏹ Stop
                              </Button>
                            </HStack>
                          </HStack>
                          <VStack align="stretch" spacing={3}>
                            <HStack>
                              <Text fontSize="md" color="gray.600" fontWeight="500">Keywords:</Text>
                              <Text fontSize="md" color="gray.700" wordBreak="break-word">{exec.keywords}</Text>
                            </HStack>
                            <HStack>
                              <Text fontSize="md" color="gray.600" fontWeight="500">Location:</Text>
                              <Text fontSize="md" color="gray.700" wordBreak="break-word">{exec.location}</Text>
                            </HStack>
                            {exec.instance_n8n_workflow_id && (
                              <HStack>
                                <Text fontSize="md" color="gray.600" fontWeight="500">n8n ID:</Text>
                                <Text fontSize="sm" color="blue.600" fontFamily="mono">
                                  {exec.instance_n8n_workflow_id}
                                </Text>
                              </HStack>
                            )}
                            <HStack justify="space-between" mt={2}>
                              <Text fontSize="sm" color="gray.400">
                                Started: {formatDate(exec.created_at)}
                              </Text>
                              <Text fontSize="sm" color="blue.500" fontWeight="600">
                                Running for {getElapsedTime(exec.created_at)}
                              </Text>
                            </HStack>
                          </VStack>
                        </Box>
                      );
                    })}
                  </VStack>
                )}
              </CardBody>
            </Card>
          </GridItem>

          {/* RIGHT: Results */}
          <GridItem>
            <Card
              shadow="card"
              borderRadius="2xl"
              border="1px solid"
              borderColor="gray.100"
              bg="white"
              overflow="hidden"
              position="relative"
              h="100%"
            >
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                h="3px"
                bgGradient="linear(to-r, green.400, green.300, red.400)"
              />
              <CardHeader
                borderBottom="1px solid"
                borderColor="gray.100"
                bg="gray.50"
              >
                <HStack justify="space-between" align="center">
                  <HStack spacing={3}>
                    <Text fontSize="xl">📊</Text>
                    <VStack align="flex-start" spacing={0}>
                      <Heading size="md" color="gray.800" fontWeight="700">
                        Results
                      </Heading>
                      <Text fontSize="xs" color="gray.500">
                        Completed execution outcomes
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack spacing={2}>
                    {completedExecutions.filter(e => e.status === 'success').length > 0 && (
                      <Badge colorScheme="green" variant="subtle" borderRadius="full" px={2} py={1} fontSize="xs">
                        ✅ {completedExecutions.filter(e => e.status === 'success').length}
                      </Badge>
                    )}
                    {completedExecutions.filter(e => e.status === 'error').length > 0 && (
                      <Badge colorScheme="red" variant="subtle" borderRadius="full" px={2} py={1} fontSize="xs">
                        ❌ {completedExecutions.filter(e => e.status === 'error').length}
                      </Badge>
                    )}
                    {completedExecutions.filter(e => e.status === 'cancelled').length > 0 && (
                      <Badge colorScheme="gray" variant="subtle" borderRadius="full" px={2} py={1} fontSize="xs">
                        ⏹ {completedExecutions.filter(e => e.status === 'cancelled').length}
                      </Badge>
                    )}
                  </HStack>
                </HStack>
              </CardHeader>
              <CardBody>
                {executionsLoading && workflowExecutions.length === 0 ? (
                  <HStack justify="center" py={8}>
                    <Spinner size="md" color="gray.400" />
                    <Text color="gray.500">Loading...</Text>
                  </HStack>
                ) : completedExecutions.length === 0 ? (
                  <VStack py={10} spacing={3}>
                    <Text fontSize="3xl">📭</Text>
                    <Text color="gray.500" fontSize="md" textAlign="center">
                      No results yet
                    </Text>
                    <Text color="gray.400" fontSize="sm" textAlign="center">
                      Completed executions will appear here with their status
                    </Text>
                  </VStack>
                ) : (
                  <VStack spacing={5} align="stretch">
                    {completedExecutions.map((exec) => {
                      const colors = STATUS_COLORS[exec.status] ?? STATUS_COLORS.pending;
                      const isSuccess = exec.status === 'success';
                      const isError = exec.status === 'error';
                      return (
                        <Box
                          key={exec.id}
                          p={4}
                          minH="125px"
                          border="1px solid"
                          borderColor={isSuccess ? 'green.200' : isError ? 'red.200' : 'gray.200'}
                          borderRadius="xl"
                          bg={colors.bg}
                        >
                          <HStack justify="space-between" mb={3}>
                            <HStack spacing={3}>
                              <Text fontSize="xl">{colors.icon}</Text>
                              <Text fontWeight="700" color="gray.800" fontSize="lg">
                                Execution #{exec.id}
                              </Text>
                            </HStack>
                            <Badge
                              colorScheme={isSuccess ? 'green' : isError ? 'red' : 'gray'}
                              variant="solid"
                              borderRadius="full"
                              px={3}
                              py={1}
                              fontSize="xs"
                              fontWeight="700"
                              textTransform="uppercase"
                            >
                              {exec.status}
                            </Badge>
                          </HStack>
                          <VStack align="stretch" spacing={3}>
                            <HStack>
                              <Text fontSize="md" color="gray.600" fontWeight="500">Keywords:</Text>
                              <Text fontSize="md" color="gray.700" wordBreak="break-word">{exec.keywords}</Text>
                            </HStack>
                            <HStack>
                              <Text fontSize="md" color="gray.600" fontWeight="500">Location:</Text>
                              <Text fontSize="md" color="gray.700" wordBreak="break-word">{exec.location}</Text>
                            </HStack>
                            {exec.result && isError && (
                              <Box mt={2} p={3} bg="red.100" borderRadius="md">
                                <Text fontSize="sm" color="red.700" fontFamily="mono" wordBreak="break-word">
                                  {typeof exec.result === 'object' && exec.result.error
                                    ? exec.result.error
                                    : JSON.stringify(exec.result)}
                                </Text>
                              </Box>
                            )}
                            {exec.result && isSuccess && (
                              <Box mt={2} p={3} bg="green.100" borderRadius="md">
                                <Text fontSize="sm" color="green.700" wordBreak="break-word">
                                  {typeof exec.result === 'object'
                                    ? JSON.stringify(exec.result).substring(0, 200)
                                    : String(exec.result)}
                                </Text>
                              </Box>
                            )}
                            <Divider my={1} />
                            <HStack justify="space-between">
                              <Text fontSize="sm" color="gray.400">
                                Started: {formatDate(exec.created_at)}
                              </Text>
                              {exec.completed_at && (
                                <Text fontSize="sm" color="gray.400">
                                  Finished: {formatDate(exec.completed_at)}
                                </Text>
                              )}
                            </HStack>
                          </VStack>
                        </Box>
                      );
                    })}
                  </VStack>
                )}
              </CardBody>
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
