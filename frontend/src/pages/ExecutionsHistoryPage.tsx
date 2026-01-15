import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/common/Header';
import type { LinkedinResult } from '../types';
import { workflowService } from '../services/workflow.service';
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
    _hover={{ bg: 'gray.50', cursor: 'pointer' }}
    onClick={() => onSelect(row)}
    bg={isSelected ? 'red.50' : undefined}
  >
    <Td>{row.id}</Td>
    <Td>{row.workflow_execution_id}</Td>
    <Td maxW="400px" isTruncated>{row.title}</Td>
    <Td>
      <a
        href={row.vacancy_link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#3182ce' }}
      >
        Відкрити
      </a>
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

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workflowService.getLinkedinResults();
      setRows(data);
    } catch (error) {
      console.error('Failed to fetch linkedin results:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

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
              ← Назад
            </Button>
            <Heading size="lg">
              Дані автоматизацій (Linkedin)
            </Heading>
          </HStack>
        </HStack>

        <Box mb={6}>
          <Button
            colorScheme="red"
            onClick={downloadCsv}
            isLoading={downloading}
          >
            Download CSV
          </Button>
        </Box>

        <Box bg="white" borderRadius="xl" boxShadow="sm" p={4}>
          {loading ? (
            <Box textAlign="center" py={10}>
              <Spinner size="lg" color="red.500" />
            </Box>
          ) : !hasRows ? (
            <Box textAlign="center" py={10} color="gray.500">
              Немає даних
            </Box>
          ) : (
            <Table variant="simple" size="sm">
              <Thead bg="gray.100">
                <Tr>
                  <Th>ID</Th>
                  <Th>Workflow Execution ID</Th>
                  <Th>Title</Th>
                  <Th>Vacancy Link</Th>
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
          )}
        </Box>
      </Container>
    </Box>
  );
};

