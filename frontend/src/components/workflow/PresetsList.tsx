import React from 'react';
import {
  VStack,
  Card,
  CardBody,
  Heading,
  Text,
  HStack,
  Badge,
  Spinner,
  Box,
} from '@chakra-ui/react';
import type { WorkflowPreset } from '../../types';

interface PresetsListProps {
  presets: WorkflowPreset[];
  onSelectPreset: (preset: WorkflowPreset) => void;
  loading?: boolean;
}

export const PresetsList: React.FC<PresetsListProps> = ({
  presets,
  onSelectPreset,
  loading = false,
}) => {
  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" />
      </Box>
    );
  }

  if (presets.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500">Немає збережених presets</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={5} align="stretch">
      <Heading 
        size="md" 
        color="gray.800" 
        fontWeight="600"
        mb={2}
      >
        Збережені Presets
      </Heading>
      {presets.map((preset) => (
        <Card
          key={preset.id}
          cursor="pointer"
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="xl"
          shadow="sm"
          onClick={() => onSelectPreset(preset)}
          _hover={{ 
            shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            transform: 'translateY(-3px)',
            borderColor: 'red.300',
          }}
          transition="all 0.3s ease"
          position="relative"
          overflow="hidden"
          _before={{
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            bg: 'red.500',
          }}
        >
          <CardBody p={5}>
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between" align="start">
                <Heading size="sm" color="red.600" fontWeight="700">
                  {preset.preset_name}
                </Heading>
                <Badge 
                  bg="red.100" 
                  color="red.700" 
                  fontSize="xs"
                  px={2}
                  py={1}
                  borderRadius="full"
                  fontWeight="600"
                >
                  #{preset.id}
                </Badge>
              </HStack>
              <Box 
                p={3} 
                bg="gray.50" 
                borderRadius="lg"
                border="1px solid"
                borderColor="gray.200"
              >
                <Text fontSize="sm" color="gray.700" mb={2}>
                  <Text as="span" fontWeight="600" color="gray.800">Keywords:</Text>{' '}
                  {preset.keywords}
                </Text>
                <Text fontSize="sm" color="gray.700">
                  <Text as="span" fontWeight="600" color="gray.800">Location:</Text>{' '}
                  {preset.location}
                </Text>
              </Box>
              <Text fontSize="xs" color="gray.500" fontStyle="italic">
                Створено: {new Date(preset.created_at).toLocaleDateString('uk-UA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </VStack>
          </CardBody>
        </Card>
      ))}
    </VStack>
  );
};
