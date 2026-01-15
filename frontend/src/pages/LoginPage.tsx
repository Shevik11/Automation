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
      bg="white"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={8}
      px={4}
    >
      <Container maxW="md">
        <Card 
          boxShadow="xl" 
          borderRadius="xl" 
          overflow="hidden"
          border="1px solid"
          borderColor="gray.200"
          bg="white"
        >
          <CardBody p={0}>
            <Tabs isFitted colorScheme="red" defaultIndex={0}>
              <TabList 
                bg="white" 
                borderBottom="2px solid" 
                borderColor="gray.100"
              >
                <Tab
                  _selected={{ 
                    color: 'red.500', 
                    borderColor: 'red.500', 
                    fontWeight: '600',
                    borderBottom: '2px solid',
                    borderBottomColor: 'red.500',
                  }}
                  _hover={{
                    color: 'red.400',
                  }}
                  py={5}
                  fontSize="md"
                  color="gray.600"
                  fontWeight="500"
                  transition="all 0.2s"
                >
                  Вхід
                </Tab>
                <Tab
                  _selected={{ 
                    color: 'red.500', 
                    borderColor: 'red.500', 
                    fontWeight: '600',
                    borderBottom: '2px solid',
                    borderBottomColor: 'red.500',
                  }}
                  _hover={{
                    color: 'red.400',
                  }}
                  py={5}
                  fontSize="md"
                  color="gray.600"
                  fontWeight="500"
                  transition="all 0.2s"
                >
                  Реєстрація
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
