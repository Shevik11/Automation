import React, { useState } from 'react';
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
    keywords: initialData?.keywords || '',
    location: initialData?.location || '',
    save_as_preset: false,
    preset_name: '',
  });
  const [keywordInput, setKeywordInput] = useState('');

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
              placeholder="Додати keyword і натиснути Enter"
              isRequired={false}
              required={false}
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
                Додати
              </Button>
            </InputRightElement>
          </InputGroup>
          {keywordsList.length > 0 && (
            <HStack spacing={2} mt={2} flexWrap="wrap">
              {keywordsList.map((keyword, index) => (
                <Tag key={index} size="md" colorScheme="red" borderRadius="full">
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
            placeholder="Keywords (через кому або JSON)"
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
            <strong>Призначення:</strong> Ключові слова для пошуку вакансій (наприклад: "React Developer", "Legal", "Java"). 
            Використовується для фільтрації вакансій за посадою або навичками. 
            Можна вводити кілька значень через кому або як JSON масив.
          </FormHelperText>
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Location</FormLabel>
          <Input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="наприклад: Ukraine, Kyiv"
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
            <strong>Призначення:</strong> Географічна локація для пошуку вакансій. 
            <strong>Впливає на:</strong> Фільтрує вакансії за місцем роботи. 
            <strong>Як вводити:</strong> Вкажіть країну або місто (наприклад: "Ukraine", "Kyiv", "Lviv", "Remote"). 
            Автоматизація шукатиме вакансії тільки в зазначеній локації.
          </FormHelperText>
        </FormControl>

        <Box 
          p={4} 
          bg="gray.50" 
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.200"
          _hover={{
            borderColor: 'red.200',
            bg: 'red.50',
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
                  bg: 'red.500',
                  borderColor: 'red.500',
                  _hover: {
                    bg: 'red.600',
                    borderColor: 'red.600',
                    transform: 'scale(1.05)',
                  },
                },
                _hover: {
                  borderColor: 'red.400',
                  bg: 'red.50',
                  transform: 'scale(1.05)',
                },
                _focus: {
                  boxShadow: '0 0 0 3px rgba(229, 62, 62, 0.1)',
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
              Зберегти параметри як preset
            </Text>
          </Checkbox>
          <Text color="gray.600" fontSize="sm" mt={1} mb={formData.save_as_preset ? 2 : 0}>
            <strong>Призначення:</strong> Зберігає поточні параметри (keywords, location) для швидкого повторного використання. 
            <strong>Впливає на:</strong> Дозволяє швидко запускати автоматизацію з тими ж параметрами без повторного введення. 
            Збережені presets можна вибрати зі списку при наступному запуску.
          </Text>
          {formData.save_as_preset && (
            <FormControl mt={2}>
              <FormLabel fontSize="sm">Назва preset</FormLabel>
            <Input
              type="text"
              name="preset_name"
              value={formData.preset_name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, preset_name: e.target.value }))}
              placeholder="наприклад: React Ukraine Daily"
              size="sm"
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
                <strong>Призначення:</strong> Назва для ідентифікації preset. 
                <strong>Як вводити:</strong> Введіть зрозумілу назву, яка описує параметри (наприклад: "React Ukraine Daily", "Java Remote Weekly").
              </FormHelperText>
            </FormControl>
          )}
        </Box>

        <Button
          type="submit"
          bg="red.500"
          color="white"
          size="md"
          width="full"
          isLoading={loading}
          loadingText="Запуск..."
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
          Запустити автоматизацію
        </Button>
      </VStack>
    </form>
  );
};
