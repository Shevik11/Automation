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
} from '@chakra-ui/react';
import { Header } from '../components/common/Header';
import { UnifiedWorkflowForm } from '../components/workflow/UnifiedWorkflowForm';
import { PresetsList } from '../components/workflow/PresetsList';
import { ExecutionStatus } from '../components/workflow/ExecutionStatus';
import { ActiveWorkflowsList } from '../components/workflow/ActiveWorkflowsList';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import { useExecutionStatus } from '../hooks/useExecutionStatus';
import { workflowService } from '../services/workflow.service';
import type { WorkflowConfig, WorkflowPreset, Execution, ExecutionCreate } from '../types';

export const DashboardPage: React.FC = () => {
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
  const [activeWorkflows, setActiveWorkflows] = useState<WorkflowConfig[]>([]);
  const [activeWorkflowsLoading, setActiveWorkflowsLoading] = useState(false);
  const [showRecentExecutions, setShowRecentExecutions] = useState(true);
  const toast = useToast();

  const handleExecutionComplete = useCallback((exec: Execution) => {
    setCurrentExecution(exec);
  }, []);

  const { execution, loading: executionStatusLoading, cancelExecution } = useExecutionStatus({
    executionId: currentExecution?.id || 0,
    pollInterval: 2000,
    onComplete: handleExecutionComplete,
  });

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
        description: error.message || 'Failed to fetch workflow',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [workflowService, setDefaultWorkflow, toast, navigate]);

  const fetchDefaultWorkflow = useCallback(async () => {
    try {
      const workflow = await workflowService.getDefaultWorkflow();
      setDefaultWorkflow(workflow);
    } catch (error: any) {
      console.error('Failed to fetch default workflow:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch workflow',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [workflowService, setDefaultWorkflow, toast]);

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

  const fetchActiveWorkflows = useCallback(async () => {
    setActiveWorkflowsLoading(true);
    try {
      // Get all workflows (active and inactive) instead of just active
      const workflows = await workflowService.getWorkflows();
      setActiveWorkflows(workflows);
    } catch (error: any) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setActiveWorkflowsLoading(false);
    }
  }, []);

  const handleWorkflowUpdate = useCallback((updatedWorkflows: WorkflowConfig[]) => {
    // Update state when workflow status changes
    setActiveWorkflows(updatedWorkflows);
  }, []);

  const fetchRecentExecutions = useCallback(async () => {
    setExecutionsLoading(true);
    try {
      const data = await workflowService.getExecutions(10);
      setRecentExecutions(data);
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
    fetchActiveWorkflows();
  }, [workflowId, fetchWorkflow, fetchDefaultWorkflow, fetchPresets, fetchRecentExecutions, fetchActiveWorkflows]);

  const handleUnifiedSubmit = useCallback(async (data: { keywords: string; location: string }) => {
    if (!defaultWorkflow) {
      toast({
        title: 'Error',
        description: 'Workflow not found. Please update the page',
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
      setCurrentExecution(execution);
      setSelectedPreset(null);
      
      // Refresh executions and workflows (auto-activation may have changed status)
      await fetchRecentExecutions();
      await fetchActiveWorkflows();
      setShowRecentExecutions(true);
      
      toast({
        title: 'Success!',
        description: `Execution #${execution.id} started. Workflow activated on n8n.`,
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
  }, [defaultWorkflow, toast, fetchRecentExecutions, fetchActiveWorkflows]);

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
        keywords: selectedPreset.keywords,
        location: selectedPreset.location,
      };
    }
    return {};
  }, [selectedPreset]);

  const hasRecentExecutions = useMemo(() => recentExecutions.length > 0, [recentExecutions.length]);

  return (
    <Box minH="100vh" bg="gray.50">
      <Header />
      <Container maxW="7xl" py={10}>
        <Box mb={10}>
          <HStack justify="space-between" align="center" mb={2}>
            <Box>
              <Heading 
                size="xl" 
                mb={2} 
                color="gray.800" 
                fontWeight="700" 
                letterSpacing="-0.5px"
              >
                {defaultWorkflow?.workflow_name || 'Workflow'}
              </Heading>
              <Text color="gray.600" fontSize="md">
                Manage automation and run executions
              </Text>
            </Box>
            <HStack spacing={3}>
              <Button
                as={RouterLink}
                to="/executions"
                colorScheme="red"
                variant="solid"
                size="sm"
              >
                View data
              </Button>
              <Button
                onClick={handleBack}
                variant="outline"
                colorScheme="gray"
                size="sm"
              >
                ← Back to list
              </Button>
            </HStack>
          </HStack>
        </Box>

        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={8}>
          <GridItem>
            <Card 
              shadow="card"
              borderRadius="2xl" 
              border="1px solid"
              borderColor="gray.100"
              bg="white"
              _hover={{
                shadow: 'cardHover',
                transform: 'translateY(-2px)',
              }}
              transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            >
              <CardHeader
                borderBottom="1px solid"
                borderColor="gray.100"
                bg="gray.50"
              >
                <HStack justify="space-between" align="center">
                  <Heading size="md" color="gray.800" fontWeight="700">
                    Run Workflow
                  </Heading>
                  <Button
                    size="sm"
                    variant="brandOutline"
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
                ) : (
                  <VStack spacing={6} align="stretch">
                    <UnifiedWorkflowForm
                      onSubmit={handleUnifiedSubmit}
                      workflowName={defaultWorkflow?.workflow_name}
                      initialData={initialFormData}
                      loading={executionLoading}
                    />
                    {currentExecution && (
                      <ExecutionStatus
                        execution={execution || currentExecution}
                        loading={executionStatusLoading}
                        onCancel={handleCancelExecution}
                      />
                    )}
                  </VStack>
                )}
              </CardBody>
            </Card>
          </GridItem>

          <GridItem>
            <Card
              shadow="card"
              borderRadius="2xl"
              border="1px solid"
              borderColor="gray.100"
              bg="white"
              _hover={{
                shadow: 'cardHover',
                transform: 'translateY(-2px)',
              }}
              transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            >
              <CardHeader
                borderBottom="1px solid"
                borderColor="gray.100"
                bg="gray.50"
              >
                <Heading size="md" color="gray.800" fontWeight="700">
                  My Workflows
                </Heading>
              </CardHeader>
              <CardBody>
                <ActiveWorkflowsList
                  workflows={activeWorkflows}
                  loading={activeWorkflowsLoading}
                  onWorkflowUpdate={handleWorkflowUpdate}
                />
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
                      bg: 'brand.50',
                      borderColor: 'brand.400',
                      color: 'brand.600',
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
    </Box>
  );
};
