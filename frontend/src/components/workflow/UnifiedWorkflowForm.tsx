import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Text,
  FormHelperText,
} from '@chakra-ui/react';

interface UnifiedWorkflowFormData {
  keywords: string;
  location: string;
}

interface UnifiedWorkflowFormProps {
  onSubmit: (data: UnifiedWorkflowFormData) => Promise<void>;
  workflowName?: string;
  initialData?: Partial<UnifiedWorkflowFormData>;
  loading?: boolean;
}

export const UnifiedWorkflowForm: React.FC<UnifiedWorkflowFormProps> = ({
  onSubmit,
  workflowName,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = useState<UnifiedWorkflowFormData>({
    keywords: initialData?.keywords || '',
    location: initialData?.location || '',
  });

  // Оновлюємо форму коли змінюються initialData
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        keywords: initialData.keywords ?? prev.keywords,
        location: initialData.location ?? prev.location,
      }));
    }
  }, [initialData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  }, [onSubmit, formData]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <VStack spacing={4} align="stretch">
        {workflowName && (
          <Box p={3} bg="brand.50" borderRadius="xl" border="1px solid" borderColor="brand.100">
            <Text fontSize="xs" color="brand.500" fontWeight="600" textTransform="uppercase" letterSpacing="wider">Workflow</Text>
            <Text fontSize="md" color="gray.800" fontWeight="600">{workflowName}</Text>
          </Box>
        )}

        <FormControl isRequired>
          <FormLabel color="gray.700" fontWeight="500" fontSize="sm" mb={2}>
            Keywords
          </FormLabel>
          <Input
            type="text"
            name="keywords"
            value={formData.keywords}
            onChange={handleChange}
            placeholder="e.g. Software Engineer, Data Scientist"
            size="md"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.300"
            bg="white"
            focusBorderColor="brand.500"
            _hover={{
              borderColor: 'gray.400',
            }}
            _focus={{
              borderColor: 'brand.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
            }}
          />
          <FormHelperText color="gray.500" fontSize="sm" mt={1}>
            Ключові слова для пошуку вакансій (розділяйте комою)
          </FormHelperText>
        </FormControl>

        <FormControl isRequired>
          <FormLabel color="gray.700" fontWeight="500" fontSize="sm" mb={2}>
            Location
          </FormLabel>
          <Input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g. Ukraine, Kyiv"
            size="md"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.300"
            bg="white"
            focusBorderColor="brand.500"
            _hover={{
              borderColor: 'gray.400',
            }}
            _focus={{
              borderColor: 'brand.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
            }}
          />
          <FormHelperText color="gray.500" fontSize="sm" mt={1}>
            Geographic location for job search (e.g. "Ukraine", "Kyiv", "Lviv", "Remote")
          </FormHelperText>
        </FormControl>

        <Button
          type="submit"
          bgGradient="linear(to-r, brand.500, brand.600)"
          color="white"
          size="md"
          width="full"
          isLoading={loading}
          loadingText="Running..."
          borderRadius="xl"
          fontWeight="600"
          _hover={{
            bgGradient: 'linear(to-r, brand.600, brand.700)',
            transform: 'translateY(-1px)',
            shadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
          transition="all 0.2s"
        >
          Run automation
        </Button>
      </VStack>
    </form>
  );
};

