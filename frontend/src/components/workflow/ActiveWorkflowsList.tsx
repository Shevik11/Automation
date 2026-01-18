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
import { formatDateDistance, formatInterval } from '../../utils/date';

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
        title: newActiveStatus ? 'Activated' : 'Deactivated',
        description: `Workflow "${workflow.workflow_name}" ${newActiveStatus ? 'Activated' : 'Deactivated'}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      if (onWorkflowUpdate) {
        onWorkflowUpdate(updatedWorkflows);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update workflow status',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
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
          No workflows
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
                          Active
                        </Text>
                      </HStack>
                    </Badge>
                  )}
                  {!workflow.is_active && (
                    <Badge colorScheme="gray" borderRadius="full" px={2} py={1}>
                      <HStack spacing={1}>
                        <CloseIcon boxSize={3} />
                        <Text fontSize="xs" fontWeight="600">
                          Inactive
                        </Text>
                      </HStack>
                    </Badge>
                  )}
                </HStack>

                {workflow.is_active ? (
                  <HStack spacing={4} flexWrap="wrap">
                    <Tooltip label={`Workflow will be run every ${formatInterval(workflow.run_interval_minutes)}`}>
                      <HStack spacing={2} color="gray.600">
                        <TimeIcon boxSize={4} />
                        <Text fontSize="sm" fontWeight="500">
                          Every {formatInterval(workflow.run_interval_minutes)}
                        </Text>
                      </HStack>
                    </Tooltip>

                    <HStack spacing={2} color="gray.600">
                      <Text fontSize="sm">Last execution:</Text>
                      <Text fontSize="sm" fontWeight="500" color="gray.800">
                        {formatDateDistance(workflow.last_run_at)}
                      </Text>
                    </HStack>
                  </HStack>
                ) : (
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    Workflow deactivated. Click "Activate" to enable automatic runs.
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
                {workflow.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </HStack>
          </CardBody>
        </Card>
      ))}
    </VStack>
  );
};

