import React from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  Code,
  Divider,
  Spinner,
} from '@chakra-ui/react';
import type { Execution, ExecutionStatus as Status } from '../../types';

interface ExecutionStatusProps {
  execution: Execution | null;
  loading?: boolean;
  onCancel?: () => void;
}

const statusColors: Record<Status, string> = {
  pending: 'yellow',
  running: 'blue',
  success: 'green',
  error: 'red',
};

const statusLabels: Record<Status, string> = {
  pending: 'Pending',
  running: 'Running',
  success: 'Success',
  error: 'Error',
};

export const ExecutionStatus: React.FC<ExecutionStatusProps> = ({
  execution,
  loading = false,
  onCancel,
}) => {
  if (loading && !execution) {
    return (
      <Card>
        <CardBody>
          <Spinner />
        </CardBody>
      </Card>
    );
  }

  if (!execution) {
    return (
      <Card>
        <CardBody>
          <Text>No data about execution</Text>
        </CardBody>
      </Card>
    );
  }

  const canCancel = execution.status === 'pending' || execution.status === 'running';

  return (
    <Card shadow="md" borderRadius="lg">
      <CardHeader>
        <HStack justify="space-between" align="center">
          <Heading size="md" color="gray.700">
            Execution status
          </Heading>
          <Badge colorScheme={statusColors[execution.status]} fontSize="md" px={3} py={1} borderRadius="full">
            {statusLabels[execution.status]}
          </Badge>
        </HStack>
      </CardHeader>
      <CardBody>
        <VStack spacing={4} align="stretch">
          <Box>
            <Text fontSize="sm" color="gray.600" mb={1}>Keywords:</Text>
            <Text fontWeight="medium">{execution.keywords}</Text>
          </Box>

          <Box>
            <Text fontSize="sm" color="gray.600" mb={1}>Location:</Text>
            <Text fontWeight="medium">{execution.location}</Text>
          </Box>

          <Divider />

          <HStack spacing={4}>
            {execution.created_at && (
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Created:</Text>
                <Text fontSize="sm">{new Date(execution.created_at).toLocaleString('uk-UA')}</Text>
              </Box>
            )}
            {execution.completed_at && (
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Completed:</Text>
                <Text fontSize="sm">{new Date(execution.completed_at).toLocaleString('uk-UA')}</Text>
              </Box>
            )}
          </HStack>

          {execution.n8n_execution_id && (
            <Box>
              <Text fontSize="sm" color="gray.600" mb={1}>N8N Execution ID:</Text>
              <Code fontSize="sm">{execution.n8n_execution_id}</Code>
            </Box>
          )}

          {execution.result && (
            <Box>
              <Text fontSize="sm" color="gray.600" mb={2}>Result:</Text>
              <Box
                p={4}
                bg={execution.status === 'error' ? 'red.50' : 'green.50'}
                borderRadius="md"
                border="1px"
                borderColor={execution.status === 'error' ? 'red.200' : 'green.200'}
              >
                <Code whiteSpace="pre-wrap" fontSize="xs">
                  {JSON.stringify(execution.result, null, 2)}
                </Code>
              </Box>
            </Box>
          )}

          {canCancel && onCancel && (
            <Button
              colorScheme="red"
              variant="outline"
              onClick={onCancel}
              size="md"
            >
              Cancel Execution
            </Button>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};
