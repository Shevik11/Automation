import React, { useCallback } from 'react';
import {
  Box,
  Flex,
  Heading,
  Button,
  Text,
} from '@chakra-ui/react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = React.memo(() => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleLogoClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <Box
      as="header"
      bg="white"
      borderBottom="1px solid"
      borderColor="gray.200"
      boxShadow="0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)"
      position="sticky"
      top={0}
      zIndex={1000}
      backdropFilter="blur(10px)"
      bgGradient="linear(to-r, white, gray.50)"
    >
      <Flex
        maxW="7xl"
        mx="auto"
        px={6}
        py={5}
        align="center"
        justify="space-between"
      >
        <Heading 
          size="lg" 
          color="red.500" 
          cursor="pointer" 
          onClick={handleLogoClick}
          fontWeight="700"
          letterSpacing="-0.5px"
          _hover={{
            color: 'red.600',
            transform: 'scale(1.02)',
          }}
          transition="all 0.2s"
        >
          N8N Automation
        </Heading>
        {isAuthenticated && (
          <Flex align="center" gap={4}>
            {user && (
              <Box
                px={3}
                py={1.5}
                bg="gray.50"
                borderRadius="full"
                border="1px solid"
                borderColor="gray.200"
              >
                <Text color="gray.700" fontSize="sm" fontWeight="500">
                  {user.email}
                </Text>
              </Box>
            )}
            <Button
              bg="red.500"
              color="white"
              variant="solid"
              size="sm"
              onClick={handleLogout}
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
              Вийти
            </Button>
          </Flex>
        )}
      </Flex>
    </Box>
  );
});
Header.displayName = 'Header';
