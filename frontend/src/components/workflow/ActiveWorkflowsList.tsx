import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Card,
  CardBody,
  Heading,
  Tooltip,
  Button,
  useToast,
} from '@chakra-ui/react';
import { CheckCircleIcon, TimeIcon, CloseIcon } from '@chakra-ui/icons';
import type { WorkflowConfig } from '../../types';
import { workflowService } from '../../services/workflow.service';
// Simple date formatting without date-fns
const formatDateDistance = (dateStr?: string): string => {
  if (!dateStr) {
    return 'Ще не виконувався';
  }
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'щойно';
    } else if (diffMins < 60) {
      return `${diffMins} хв тому`;
    } else if (diffHours < 24) {
      return `${diffHours} год тому`;
    } else {
      return `${diffDays} дн тому`;
    }
  } catch {
    return 'Невідомо';
  }
};

interface ActiveWorkflowsListProps {
  workflows: WorkflowConfig[];
  loading?: boolean;
  onWorkflowUpdate?: (updatedWorkflows: WorkflowConfig[]) => void;
}

export const ActiveWorkflowsList: React.FC<ActiveWorkflowsListProps> = ({
  workflows,
  loading = false,
  onWorkflowUpdate,
}) => {
  const toast = useToast();
  const [localWorkflows, setLocalWorkflows] = React.useState<WorkflowConfig[]>(workflows);

  // Update local workflows when prop changes
  React.useEffect(() => {
    setLocalWorkflows(workflows);
  }, [workflows]);

  const handleToggleActive = async (workflow: WorkflowConfig) => {
    try {
      const newActiveStatus = !workflow.is_active;
      const updatedWorkflow = await workflowService.updateWorkflowActiveStatus(workflow.id, newActiveStatus);
      
      // Update local state immediately
      const updatedWorkflows = localWorkflows.map(w => 
        w.id === workflow.id ? updatedWorkflow : w
      );
      setLocalWorkflows(updatedWorkflows);
      
      toast({
        title: newActiveStatus ? 'Активовано' : 'Деактивовано',
        description: `Workflow "${workflow.workflow_name}" ${newActiveStatus ? 'активовано' : 'деактивовано'}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      if (onWorkflowUpdate) {
        onWorkflowUpdate(updatedWorkflows);
      }
    } catch (error: any) {
      toast({
        title: 'Помилка',
        description: error.message || 'Не вдалося оновити статус workflow',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  const formatInterval = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} хв`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} год`;
    }
    return `${hours} год ${mins} хв`;
  };


  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" color="red.500" />
      </Box>
    );
  }

  if (localWorkflows.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500" fontSize="md">
          Немає workflows
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {localWorkflows.map((workflow) => (
        <Card
          key={workflow.id}
          shadow="sm"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          _hover={{
            shadow: 'md',
            borderColor: 'red.300',
          }}
          transition="all 0.2s"
        >
          <CardBody>
            <HStack justify="space-between" align="flex-start" spacing={4}>
              <VStack align="flex-start" spacing={2} flex={1}>
                <HStack>
                  <Heading size="sm" color="gray.800">
                    {workflow.workflow_name}
                  </Heading>
                  {workflow.is_active && (
                    <Badge colorScheme="green" borderRadius="full" px={2} py={1}>
                      <HStack spacing={1}>
                        <CheckCircleIcon boxSize={3} />
                        <Text fontSize="xs" fontWeight="600">
                          Активний
                        </Text>
                      </HStack>
                    </Badge>
                  )}
                  {!workflow.is_active && (
                    <Badge colorScheme="gray" borderRadius="full" px={2} py={1}>
                      <HStack spacing={1}>
                        <CloseIcon boxSize={3} />
                        <Text fontSize="xs" fontWeight="600">
                          Неактивний
                        </Text>
                      </HStack>
                    </Badge>
                  )}
                </HStack>

                {workflow.is_active ? (
                  <HStack spacing={4} flexWrap="wrap">
                    <Tooltip label={`Workflow буде запускатися кожні ${formatInterval(workflow.run_interval_minutes)}`}>
                      <HStack spacing={2} color="gray.600">
                        <TimeIcon boxSize={4} />
                        <Text fontSize="sm" fontWeight="500">
                          Кожні {formatInterval(workflow.run_interval_minutes)}
                        </Text>
                      </HStack>
                    </Tooltip>

                    <HStack spacing={2} color="gray.600">
                      <Text fontSize="sm">Останнє виконання:</Text>
                      <Text fontSize="sm" fontWeight="500" color="gray.800">
                        {formatDateDistance(workflow.last_run_at)}
                      </Text>
                    </HStack>
                  </HStack>
                ) : (
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    Workflow деактивовано. Натисніть "Активувати" щоб увімкнути автоматичні запуски.
                  </Text>
                )}

                {workflow.description && (
                  <Text fontSize="sm" color="gray.600" noOfLines={2}>
                    {workflow.description}
                  </Text>
                )}
              </VStack>

              <Button
                size="sm"
                colorScheme={workflow.is_active ? "red" : "green"}
                variant={workflow.is_active ? "outline" : "solid"}
                onClick={() => handleToggleActive(workflow)}
                leftIcon={workflow.is_active ? <CloseIcon /> : <CheckCircleIcon />}
                _hover={{
                  transform: 'scale(1.05)',
                }}
                transition="all 0.2s"
              >
                {workflow.is_active ? 'Деактивувати' : 'Активувати'}
              </Button>
            </HStack>
          </CardBody>
        </Card>
      ))}
    </VStack>
  );
};

