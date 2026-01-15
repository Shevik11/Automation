import React, { useState } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Button,
  Alert,
  AlertIcon,
  VStack,
  Heading,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import type { RegisterData } from '../../types';

export const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(formData);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Помилка реєстрації');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack spacing={6} align="stretch">
        <Heading 
          size="lg" 
          textAlign="center" 
          color="gray.800"
          fontWeight="600"
          letterSpacing="-0.5px"
        >
          Створіть акаунт
        </Heading>

        {error && (
          <Alert 
            status="error" 
            borderRadius="lg"
            bg="red.50"
            border="1px solid"
            borderColor="red.200"
          >
            <AlertIcon color="red.500" />
            <Box color="red.700" fontSize="sm">{error}</Box>
          </Alert>
        )}

        <FormControl isRequired>
          <FormLabel color="gray.700" fontWeight="500" fontSize="sm" mb={2}>
            Email
          </FormLabel>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your@email.com"
            size="lg"
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
        </FormControl>

        <FormControl isRequired>
          <FormLabel color="gray.700" fontWeight="500" fontSize="sm" mb={2}>
            Пароль
          </FormLabel>
          <InputGroup size="lg">
            <Input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Мінімум 6 символів"
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
            <InputRightElement width="4.5rem">
              <IconButton
                aria-label={showPassword ? 'Приховати пароль' : 'Показати пароль'}
                icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                onClick={() => setShowPassword(!showPassword)}
                variant="ghost"
                size="sm"
                color="gray.500"
                _hover={{
                  bg: 'gray.100',
                  color: 'red.500',
                }}
              />
            </InputRightElement>
          </InputGroup>
        </FormControl>

        <Button
          type="submit"
          bg="red.500"
          color="white"
          size="lg"
          width="full"
          isLoading={loading}
          loadingText="Реєстрація..."
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
          Зареєструватися
        </Button>
      </VStack>
    </Box>
  );
};
