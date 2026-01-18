import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/common/Header';
import type { LinkedinResult } from '../types';
import { workflowService } from '../services/workflow.service';
import api from '../services/api';
import {
  Box,
  Container,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  HStack,
} from '@chakra-ui/react';

// Memoized table row component
const TableRow = React.memo<{
  row: LinkedinResult;
  isSelected: boolean;
  onSelect: (row: LinkedinResult) => void;
}>(({ row, isSelected, onSelect }) => (
  <Tr
    _hover={{ bg: 'blue.25', cursor: 'pointer', transform: 'scale(1.01)' }}
    onClick={() => onSelect(row)}
    bg={isSelected ? 'blue.100' : undefined}
    transition="all 0.2s"
    borderBottom="1px solid"
    borderColor="gray.100"
  >
    <Td fontWeight="medium" color="gray.700" borderColor="gray.200">{row.id}</Td>
    <Td fontFamily="mono" fontSize="sm" color="gray.600" borderColor="gray.200">{row.workflow_execution_id}</Td>
    <Td
      maxW="400px"
      borderColor="gray.200"
      fontWeight="medium"
      sx={{
        '&:hover': {
          textDecoration: 'underline',
          cursor: 'pointer'
        }
      }}
    >
      <Box
        as="span"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          window.open(row.vacancy_link, '_blank');
        }}
        color="blue.600"
        _hover={{ color: 'blue.800' }}
      >
        {row.title || 'Без назви'}
      </Box>
    </Td>
    <Td borderColor="gray.200">
      <Button
        as="a"
        href={row.vacancy_link}
        target="_blank"
        rel="noopener noreferrer"
        size="xs"
        colorScheme="blue"
        variant="outline"
        _hover={{ bg: 'blue.50' }}
        onClick={(e) => e.stopPropagation()}
      >
        🔗 Відкрити
      </Button>
    </Td>
    <Td borderColor="gray.200" color="gray.500" fontSize="sm">
      {new Date().toLocaleDateString('uk-UA')}
    </Td>
  </Tr>
));
TableRow.displayName = 'TableRow';

export const ExecutionsHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LinkedinResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<LinkedinResult | null>(null);
  const [debugMode, setDebugMode] = useState(false);

  const fetchRowsFromService = useCallback(async (): Promise<LinkedinResult[]> => {
    return await workflowService.getLinkedinResults();
  }, []);

  const fetchRowsFromDebug = useCallback(async (): Promise<LinkedinResult[]> => {
    const response = await api.get('/linkedin-results/debug');
    return response.data;
  }, []);

  const fetchRows = useCallback(async (useDebug: boolean = false) => {
    setLoading(true);
    try {
      const data = useDebug
        ? await fetchRowsFromDebug()
        : await fetchRowsFromService();

      setRows(data);
    } catch (error) {
      console.error('Failed to fetch linkedin results:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fetchRowsFromService, fetchRowsFromDebug]);

  useEffect(() => {
    fetchRows(debugMode);
  }, [fetchRows, debugMode]);

  const downloadCsv = useCallback(async () => {
    setDownloading(true);
    try {
      const blob = await workflowService.downloadExecutionsCsv();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'executions.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download CSV:', error);
    } finally {
      setDownloading(false);
    }
  }, []);

  const handleRowSelect = useCallback((row: LinkedinResult) => {
    setSelectedRow(row);
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);

  return (
    <Box minH="100vh" bg="gray.50">
      <Header />
      <Container maxW="7xl" py={10}>
        <HStack justify="space-between" align="center" mb={4}>
          <HStack spacing={4}>
            <Button
              variant="outline"
              colorScheme="gray"
              onClick={handleBack}
            >
              ← Back
            </Button>
            <Box>
              <Heading size="lg" mb={1}>
                Automation data (LinkedIn jobs)
              </Heading>
              <Box fontSize="sm" color="gray.600">
                {loading ? 'Loading...' : `${rows.length} records found`}
                {debugMode && <Box as="span" color="orange.600" ml={2}>🔧 Debug mode</Box>}
                {rows.length > 0 && (
                  <Box as="span" color="blue.600" ml={2}>
                    (Displaying: {rows.length})
                  </Box>
                )}
              </Box>
            </Box>
          </HStack>
        </HStack>

        <HStack spacing={4} mb={6}>
          <Button
            colorScheme="red"
            onClick={downloadCsv}
            isLoading={downloading}
          >
            Download CSV
          </Button>
          <Button
            colorScheme={debugMode ? "orange" : "gray"}
            variant={debugMode ? "solid" : "outline"}
            onClick={() => {
              setDebugMode(!debugMode);
              fetchRows(!debugMode);
            }}
          >
            {debugMode ? "Debug Mode (All data)" : "Debug Mode"}
          </Button>
          <Button
            colorScheme="blue"
            variant="outline"
            onClick={() => fetchRows(debugMode)}
          >
            Refresh
          </Button>
        </HStack>

        <Box bg="white" borderRadius="xl" boxShadow="sm" p={4}>
          {loading ? (
            <Box textAlign="center" py={10}>
              <Spinner size="lg" color="red.500" />
            </Box>
          ) : !hasRows ? (
            <Box textAlign="center" py={10} color="gray.500">
              No data
            </Box>
          ) : (
            <Box overflowX="auto" borderRadius="md" border="1px" borderColor="gray.200">
              <Table variant="simple" size="sm" colorScheme="gray">
                <Thead bg="blue.50">
                  <Tr>
                    <Th fontWeight="bold" color="blue.700" borderColor="blue.200">ID</Th>
                    <Th fontWeight="bold" color="blue.700" borderColor="blue.200">Execution ID</Th>
                    <Th fontWeight="bold" color="blue.700" borderColor="blue.200" minW="300px">Job title</Th>
                    <Th fontWeight="bold" color="blue.700" borderColor="blue.200">Job link</Th>
                    <Th fontWeight="bold" color="blue.700" borderColor="blue.200">Creation date</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      row={row}
                      isSelected={selectedRow?.id === row.id}
                      onSelect={handleRowSelect}
                    />
                  ))}
                </Tbody>
              </Table>
              {rows.length === 0 && !loading && (
                <Box textAlign="center" py={8} color="gray.500" fontSize="lg">
                  No data found
                  {debugMode && (
                    <Box mt={2} fontSize="sm" color="orange.600">
                      Try to disable Debug Mode, if the data belongs to another user
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

