import React, { useState, useEffect } from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  HStack,
  Tag,
  TagLabel,
  TagCloseButton,
  InputGroup,
  InputRightElement,
  Textarea,
  Checkbox,
  Box,
  FormHelperText,
  Text,
} from '@chakra-ui/react';
import type { ExecutionCreate } from '../../types';

interface ExecutionFormProps {
  onSubmit: (data: ExecutionCreate) => Promise<void>;
  initialData?: Partial<ExecutionCreate>;
  loading?: boolean;
}

export const ExecutionForm: React.FC<ExecutionFormProps> = ({
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = useState<ExecutionCreate>({
    keywords: initialData?.keywords ?? '',
    location: initialData?.location ?? '',
    save_as_preset: initialData?.save_as_preset ?? false,
    preset_name: initialData?.preset_name ?? '',
  });
  const [keywordInput, setKeywordInput] = useState('');

  // Sync form data when initialData changes
  useEffect(() => {
    setFormData(prev => ({
      keywords: initialData?.keywords ?? prev.keywords,
      location: initialData?.location ?? prev.location,
      save_as_preset: initialData?.save_as_preset ?? prev.save_as_preset,
      preset_name: initialData?.preset_name ?? prev.preset_name,
    }));
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      const currentKeywords = formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) : [];
      const newKeywords = [...currentKeywords, keywordInput.trim()];
      setFormData(prev => ({
        ...prev,
        keywords: newKeywords.join(', ')
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    const keywords = formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) : [];
    const newKeywords = keywords.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      keywords: newKeywords.join(', ')
    }));
  };

  const keywordsList = formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) : [];

  return (
    <form onSubmit={handleSubmit} noValidate>
      <VStack spacing={4} align="stretch">
        <FormControl isRequired>
          <FormLabel>Keywords</FormLabel>
          <InputGroup>
            <Input
              value={keywordInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeywordInput(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              placeholder="Add keyword and press Enter"
              isRequired={false}
              required={false}
              size="md"
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.300"
              bg="white"
              pr="5rem"
              focusBorderColor="brand.500"
              _hover={{
                borderColor: 'gray.400',
              }}
              _focus={{
                borderColor: 'brand.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
              }}
            />
            <InputRightElement width="5rem" pr={2}>
              <Button 
                h="1.75rem" 
                size="sm" 
                onClick={addKeyword}
                bg="brand.500"
                color="white"
                _hover={{
                  bg: 'brand.600',
                }}
              >
                Add
              </Button>
            </InputRightElement>
          </InputGroup>
          {keywordsList.length > 0 && (
            <HStack spacing={2} mt={2} flexWrap="wrap">
              {keywordsList.map((keyword, index) => (
                <Tag key={index} size="md" colorScheme="purple" borderRadius="full">
                  <TagLabel>{keyword}</TagLabel>
                  <TagCloseButton onClick={() => removeKeyword(index)} />
                </Tag>
              ))}
            </HStack>
          )}
          <Textarea
            name="keywords"
            value={formData.keywords}
            onChange={handleChange}
            placeholder="Keywords (comma or JSON)"
            rows={3}
            mt={2}
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
          <FormHelperText color="gray.600" fontSize="sm" mt={1}>
            <strong>Purpose:</strong> Keywords for job search (e.g. "React Developer", "Legal", "Java"). 
            Used to filter jobs by position or skills. 
            Can enter multiple values through comma or as a JSON array.
          </FormHelperText>
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Location</FormLabel>
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
          <FormHelperText color="gray.600" fontSize="sm" mt={1}>
            <strong>Purpose:</strong> Geographic location for job search. 
            <strong>Affects:</strong> Filters jobs by location. 
            <strong>How to enter:</strong> Specify country or city (e.g. "Ukraine", "Kyiv", "Lviv", "Remote"). 
            Automation will only search for jobs in the specified location.
          </FormHelperText>
        </FormControl>

        <Box 
          p={4} 
          bg="gray.50" 
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.200"
          _hover={{
            borderColor: 'brand.200',
            bg: 'brand.50',
          }}
          transition="all 0.2s"
        >
          <Checkbox
            isChecked={formData.save_as_preset}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, save_as_preset: e.target.checked }))}
            mb={formData.save_as_preset ? 3 : 0}
            size="lg"
            sx={{
              '& .chakra-checkbox__control': {
                width: '24px',
                height: '24px',
                borderColor: 'gray.300',
                borderWidth: '2px',
                borderRadius: '6px',
                bg: 'white',
                transition: 'all 0.2s ease',
                _checked: {
                  bg: 'brand.500',
                  borderColor: 'brand.500',
                  _hover: {
                    bg: 'brand.600',
                    borderColor: 'brand.600',
                    transform: 'scale(1.05)',
                  },
                },
                _hover: {
                  borderColor: 'brand.400',
                  bg: 'brand.50',
                  transform: 'scale(1.05)',
                },
                _focus: {
                  boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)',
                },
              },
              '& .chakra-checkbox__icon': {
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
              },
            }}
          >
            <Text as="span" fontWeight="600" color="gray.800" fontSize="md">
              Save parameters as preset
            </Text>
          </Checkbox>
          <Text color="gray.600" fontSize="sm" mt={1} mb={formData.save_as_preset ? 2 : 0}>
            <strong>Purpose:</strong> Saves current parameters (keywords, location) for quick reuse. 
            <strong>Affects:</strong> Allows quickly running automation with the same parameters without re-entering. 
            Saved presets can be selected from the list when running next.
          </Text>
          {formData.save_as_preset && (
            <FormControl mt={2}>
              <FormLabel fontSize="sm">Preset name</FormLabel>
            <Input
              type="text"
              name="preset_name"
              value={formData.preset_name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, preset_name: e.target.value }))}
              placeholder="e.g. React Ukraine Daily"
              size="sm"
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
              <FormHelperText color="gray.600" fontSize="sm" mt={1}>
                <strong>Purpose:</strong> Name for identifying preset. 
                <strong>How to enter:</strong> Enter a clear name that describes the parameters (e.g. "React Ukraine Daily", "Java Remote Weekly").
              </FormHelperText>
            </FormControl>
          )}
        </Box>

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
