import React from 'react';
import {
  Box,
  Container,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';

export const LoginPage: React.FC = () => {
  return (
    <Box
      minH="100vh"
      bgGradient="linear(135deg, #eef2ff 0%, #f8fafc 40%, #fdf4ff 100%)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={8}
      px={4}
      position="relative"
      overflow="hidden"
    >
      {/* Decorative background elements */}
      <Box
        position="absolute"
        top="-20%"
        right="-10%"
        w="500px"
        h="500px"
        borderRadius="full"
        bg="brand.100"
        opacity={0.3}
        filter="blur(80px)"
      />
      <Box
        position="absolute"
        bottom="-15%"
        left="-10%"
        w="400px"
        h="400px"
        borderRadius="full"
        bg="accent.100"
        opacity={0.3}
        filter="blur(80px)"
      />

      <Container maxW="md" position="relative" zIndex={1}>
        {/* Logo */}
        <Box textAlign="center" mb={8}>
          <Box
            w="56px"
            h="56px"
            borderRadius="2xl"
            bgGradient="linear(135deg, brand.500, accent.500)"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            shadow="0 4px 14px rgba(239, 68, 68, 0.35)"
            mb={4}
          >
            <Box as="span" fontSize="xl" fontWeight="800" color="white">N8</Box>
          </Box>
        </Box>

        <Card
          shadow="0 25px 50px -12px rgba(0, 0, 0, 0.08)"
          borderRadius="2xl"
          overflow="hidden"
          border="1px solid"
          borderColor="gray.100"
          bg="white"
        >
          <CardBody p={0}>
            <Tabs isFitted colorScheme="purple" defaultIndex={0}>
              <TabList
                bg="gray.50"
                borderBottom="1px solid"
                borderColor="gray.100"
              >
                <Tab
                  _selected={{
                    color: 'brand.600',
                    borderColor: 'brand.500',
                    fontWeight: '600',
                    borderBottom: '2px solid',
                    borderBottomColor: 'brand.500',
                    bg: 'white',
                  }}
                  _hover={{
                    color: 'brand.500',
                  }}
                  py={5}
                  fontSize="md"
                  color="gray.500"
                  fontWeight="500"
                  transition="all 0.2s"
                >
                  Login
                </Tab>
                <Tab
                  _selected={{
                    color: 'brand.600',
                    borderColor: 'brand.500',
                    fontWeight: '600',
                    borderBottom: '2px solid',
                    borderBottomColor: 'brand.500',
                    bg: 'white',
                  }}
                  _hover={{
                    color: 'brand.500',
                  }}
                  py={5}
                  fontSize="md"
                  color="gray.500"
                  fontWeight="500"
                  transition="all 0.2s"
                >
                  Registration
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={8} py={8}>
                  <LoginForm />
                </TabPanel>
                <TabPanel px={8} py={8}>
                  <RegisterForm />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
};
