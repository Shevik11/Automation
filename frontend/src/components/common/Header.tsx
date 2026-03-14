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
      borderColor="gray.100"
      boxShadow="soft"
      position="sticky"
      top={0}
      zIndex={1000}
      backdropFilter="blur(12px)"
      bgColor="rgba(255, 255, 255, 0.85)"
    >
      <Flex
        maxW="7xl"
        mx="auto"
        px={6}
        py={4}
        align="center"
        justify="space-between"
      >
        <Flex align="center" gap={3} cursor="pointer" onClick={handleLogoClick}>
          <Box
            w="36px"
            h="36px"
            borderRadius="xl"
            bgGradient="linear(135deg, brand.500, accent.500)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            shadow="0 2px 8px rgba(239, 68, 68, 0.3)"
          >
            <Text fontSize="md" fontWeight="800" color="white">N8</Text>
          </Box>
          <Heading
            size="md"
            bgGradient="linear(to-r, brand.600, accent.600)"
            bgClip="text"
            fontWeight="700"
            letterSpacing="-0.5px"
            _hover={{
              bgGradient: 'linear(to-r, brand.700, accent.700)',
            }}
            transition="all 0.2s"
          >
            Automation
          </Heading>
        </Flex>
        {isAuthenticated && (
          <Flex align="center" gap={3}>
            {user && (
              <Box
                px={4}
                py={1.5}
                bg="brand.50"
                borderRadius="full"
                border="1px solid"
                borderColor="brand.100"
              >
                <Text color="brand.700" fontSize="sm" fontWeight="500">
                  {user.email}
                </Text>
              </Box>
            )}
            <Button
              variant="brand"
              size="sm"
              onClick={handleLogout}
              px={5}
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
