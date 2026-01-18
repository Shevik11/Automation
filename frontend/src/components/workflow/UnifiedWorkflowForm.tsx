import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  FormHelperText,
} from '@chakra-ui/react';

interface UnifiedWorkflowFormData {
  workflow_name: string;
  keywords: string;
  location: string;
}

interface UnifiedWorkflowFormProps {
  onSubmit: (data: UnifiedWorkflowFormData) => Promise<void>;
  initialData?: Partial<UnifiedWorkflowFormData>;
  loading?: boolean;
}

// Memoized keyword tag component
const KeywordTag = React.memo<{
  keyword: string;
  index: number;
  onRemove: (index: number) => void;
}>(({ keyword, onRemove, index }) => (
  <Tag size="md" colorScheme="red" borderRadius="full">
    <TagLabel>{keyword}</TagLabel>
    <TagCloseButton onClick={() => onRemove(index)} />
  </Tag>
));
KeywordTag.displayName = 'KeywordTag';

export const UnifiedWorkflowForm: React.FC<UnifiedWorkflowFormProps> = ({
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [formData, setFormData] = useState<UnifiedWorkflowFormData>({
    workflow_name: initialData?.workflow_name || '',
    keywords: initialData?.keywords || '',
    location: initialData?.location || '',
  });
  const [keywordInput, setKeywordInput] = useState('');

  // Оновлюємо форму коли змінюються initialData
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        workflow_name: initialData.workflow_name ?? prev.workflow_name,
        keywords: initialData.keywords ?? prev.keywords,
        location: initialData.location ?? prev.location,
      }));
    }
  }, [initialData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  }, [onSubmit, formData]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const parseKeywords = useCallback((keywords: string): string[] => {
    return keywords ? keywords.split(',').map(k => k.trim()).filter(k => k) : [];
  }, []);

  const addKeyword = useCallback(() => {
    if (keywordInput.trim()) {
      const currentKeywords = parseKeywords(formData.keywords);
      const newKeywords = [...currentKeywords, keywordInput.trim()];
      setFormData(prev => ({
        ...prev,
        keywords: newKeywords.join(', ')
      }));
      setKeywordInput('');
    }
  }, [keywordInput, formData.keywords, parseKeywords]);

  const removeKeyword = useCallback((index: number) => {
    const keywords = parseKeywords(formData.keywords);
    const newKeywords = keywords.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      keywords: newKeywords.join(', ')
    }));
  }, [formData.keywords, parseKeywords]);

  const handleKeywordInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setKeywordInput(e.target.value);
  }, []);

  const handleKeywordKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  }, [addKeyword]);

  const keywordsList = useMemo(() => parseKeywords(formData.keywords), [formData.keywords, parseKeywords]);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <VStack spacing={4} align="stretch">
        <FormControl isRequired>
          <FormLabel color="gray.700" fontWeight="500" fontSize="sm" mb={2}>
            Workflow name
          </FormLabel>
          <Input
            type="text"
            name="workflow_name"
            value={formData.workflow_name}
            onChange={handleChange}
            placeholder="My N8N Workflow"
            size="md"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.300"
            bg="white"
            focusBorderColor="red.500"
            _hover={{
              borderColor: 'gray.400',
            }}
            _focus={{
              borderColor: 'red.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
            }}
          />
          <FormHelperText color="gray.600" fontSize="sm" mt={1}>
            Name of your workflow for identification
          </FormHelperText>
        </FormControl>

        <FormControl isRequired>
          <FormLabel color="gray.700" fontWeight="500" fontSize="sm" mb={2}>
            Keywords
          </FormLabel>
          <InputGroup>
            <Input
              value={keywordInput}
              onChange={handleKeywordInputChange}
              onKeyPress={handleKeywordKeyPress}
              placeholder="Add keyword and press Enter"
              size="md"
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.300"
              bg="white"
              pr="5rem"
              focusBorderColor="red.500"
              _hover={{
                borderColor: 'gray.400',
              }}
              _focus={{
                borderColor: 'red.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
              }}
            />
            <InputRightElement width="5rem" pr={2}>
              <Button 
                h="1.75rem" 
                size="sm" 
                onClick={addKeyword}
                bg="red.500"
                color="white"
                _hover={{
                  bg: 'red.600',
                }}
              >
                Add
              </Button>
            </InputRightElement>
          </InputGroup>
          {keywordsList.length > 0 && (
            <HStack spacing={2} mt={2} flexWrap="wrap">
              {keywordsList.map((keyword, index) => (
                <KeywordTag
                  key={`${keyword}-${index}`}
                  keyword={keyword}
                  index={index}
                  onRemove={removeKeyword}
                />
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
            focusBorderColor="red.500"
            _hover={{
              borderColor: 'gray.400',
            }}
            _focus={{
              borderColor: 'red.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
            }}
          />
          <FormHelperText color="gray.600" fontSize="sm" mt={1}>
            Keywords for job search (e.g. "React Developer", "Legal", "Java"). 
            Can enter multiple values through comma or as a JSON array.
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
            focusBorderColor="red.500"
            _hover={{
              borderColor: 'gray.400',
            }}
            _focus={{
              borderColor: 'red.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-red-500)',
            }}
          />
          <FormHelperText color="gray.600" fontSize="sm" mt={1}>
            Geographic location for job search (e.g. "Ukraine", "Kyiv", "Lviv", "Remote")
          </FormHelperText>
        </FormControl>

        <Button
          type="submit"
          bg="red.500"
          color="white"
          size="md"
          width="full"
          isLoading={loading}
          loadingText="Running..."
          borderRadius="lg"
          fontWeight="600"
          _hover={{
            bg: 'red.600',
            transform: 'translateY(-1px)',
            boxShadow: 'md',
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

