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
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { workflowService } from '../services/workflow.service';
import type { WorkflowConfig } from '../types';

// Memoized workflow card component
const WorkflowCard = React.memo<{
  workflow: WorkflowConfig;
  onClick: (id: number) => void;
}>(({ workflow, onClick }) => {
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
      shadow="0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
      borderRadius="2xl"
      border="1px solid"
      borderColor="gray.200"
      bg="white"
      cursor="pointer"
      transition="all 0.3s ease"
      _hover={{
        shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        transform: 'translateY(-4px)',
        borderColor: 'red.300',
      }}
      _focus={{
        outline: 'none',
        boxShadow: '0 0 0 3px rgba(229, 62, 62, 0.1), 0 0 0 5px rgba(229, 62, 62, 0.5)',
        borderColor: 'red.500',
      }}
      _focusVisible={{
        outline: 'none',
        boxShadow: '0 0 0 3px rgba(229, 62, 62, 0.1), 0 0 0 5px rgba(229, 62, 62, 0.5)',
        borderColor: 'red.500',
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
            bgGradient="linear(to-br, red.400, red.600)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <Text fontSize="xl" fontWeight="bold" color="white">
              {workflow.workflow_name.charAt(0).toUpperCase()}
            </Text>
          </Box>
          <Badge
            colorScheme={workflow.is_active ? 'green' : 'gray'}
            borderRadius="full"
            px={3}
            py={1}
            fontSize="xs"
            fontWeight="600"
          >
            {workflow.is_active ? 'Активна' : 'Неактивна'}
          </Badge>
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
            title: 'Ініціалізація',
            description: 'Дефолтна автоматизація була створена',
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
            title: 'Помилка ініціалізації',
            description: 'Не вдалося створити дефолтну автоматизацію',
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
        title: 'Помилка',
        description: error.message || 'Не вдалося завантажити автоматизації',
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

  const hasWorkflows = useMemo(() => workflows.length > 0, [workflows.length]);

  return (
    <Box minH="100vh" bg="gray.50">
      <Header />
      <Container maxW="7xl" py={10}>
        <Box mb={10}>
          <Heading
            size="xl"
            mb={2}
            color="gray.800"
            fontWeight="700"
            letterSpacing="-0.5px"
          >
            Автоматизація пошуку вакансій
          </Heading>
          <Text color="gray.600" fontSize="md">
            Оберіть варіант пошуку або заповніть форму самостійно
          </Text>
        </Box>

        {loading ? (
          <Box textAlign="center" py={20}>
            <Spinner size="xl" color="red.500" thickness="4px" />
            <Text mt={4} color="gray.600">Завантаження автоматизацій...</Text>
          </Box>
        ) : !hasWorkflows ? (
          <Box textAlign="center" py={20}>
            <Text fontSize="lg" color="gray.500">
              Немає автоматизацій. Створюємо дефолтну...
            </Text>
          </Box>
        ) : (
          <Grid
            templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
            gap={6}
          >
            {workflows.map((workflow) => (
              <GridItem key={workflow.id}>
                <WorkflowCard
                  workflow={workflow}
                  onClick={handleWorkflowClick}
                />
              </GridItem>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

