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
        <Text color="gray.500">No saved presets</Text>
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
        Saved Presets
      </Heading>
      {presets.map((preset) => (
        <Card
          key={preset.id}
          cursor="pointer"
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="xl"
          shadow="card"
          onClick={() => onSelectPreset(preset)}
          _hover={{ 
            shadow: 'cardHover',
            transform: 'translateY(-3px)',
            borderColor: 'brand.200',
          }}
          transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          position="relative"
          overflow="hidden"
          _before={{
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            bgGradient: 'linear(to-b, brand.500, brand.600)',
          }}
        >
          <CardBody p={5}>
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between" align="start">
                <Heading size="sm" color="brand.600" fontWeight="700">
                  {preset.preset_name}
                </Heading>
                <Badge 
                  bg="brand.100" 
                  color="brand.700"
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
                Created: {new Date(preset.created_at).toLocaleDateString('uk-UA', {
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
