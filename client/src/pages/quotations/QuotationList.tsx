import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Pagination,
  Select,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteQuotation, exportQuotationsUrl, fetchQuotations, type QuotationFilters } from "../../api/quotations";
import { useAuth } from "../../hooks/useAuth";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "gray",
  PENDING: "yellow",
  APPROVED: "blue",
  SENT: "green",
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export function QuotationList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<string | null>(null);
  const [quotationType, setQuotationType] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filters: QuotationFilters = {
    search: debouncedSearch || undefined,
    status: (status as QuotationFilters["status"]) || undefined,
    quotationType: (quotationType as QuotationFilters["quotationType"]) || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize: 20,
  };

  const query = useQuery({ queryKey: ["quotations", filters], queryFn: () => fetchQuotations(filters) });

  const deleteMutation = useMutation({
    mutationFn: deleteQuotation,
    onSuccess: () => {
      notifications.show({ color: "green", message: "Quotation deleted" });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not delete", message: err.message }),
  });

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.pageSize)) : 1;

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Title order={2}>Quotations</Title>
        <Group>
          <Button
            component="a"
            href={exportQuotationsUrl(filters, API_BASE)}
            variant="light"
            leftSection={<IconDownload size={16} />}
          >
            Export
          </Button>
          <Button onClick={() => navigate("/quotations/new")}>New quotation</Button>
        </Group>
      </Group>

      <Group mb="md" gap="sm" align="flex-end">
        <TextInput
          placeholder="Search by client name"
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
          w={220}
        />
        <Select
          placeholder="Status"
          clearable
          data={["DRAFT", "PENDING", "APPROVED", "SENT"]}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          w={140}
        />
        <Select
          placeholder="Type"
          clearable
          data={[
            { value: "DPD", label: "DPD" },
            { value: "NON_DPD", label: "Non-DPD" },
          ]}
          value={quotationType}
          onChange={(v) => {
            setQuotationType(v);
            setPage(1);
          }}
          w={140}
        />
        <TextInput
          type="date"
          label="From"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.currentTarget.value);
            setPage(1);
          }}
        />
        <TextInput
          type="date"
          label="To"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.currentTarget.value);
            setPage(1);
          }}
        />
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Number</Table.Th>
            <Table.Th>Client</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Grand total</Table.Th>
            <Table.Th>Created by</Table.Th>
            <Table.Th>Date</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {query.data?.quotations.map((q) => {
            const canDelete =
              user?.role === "ADMIN" || (user?.id === q.createdById && q.status === "DRAFT");
            return (
              <Table.Tr key={q.id}>
                <Table.Td style={{ cursor: "pointer" }} onClick={() => navigate(`/quotations/${q.id}`)}>
                  {q.quotationNumber}
                </Table.Td>
                <Table.Td>{q.clientName}</Table.Td>
                <Table.Td>{q.quotationType}</Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLOR[q.status]}>{q.status}</Badge>
                </Table.Td>
                <Table.Td>{q.grandTotal.toFixed(2)}</Table.Td>
                <Table.Td>{q.createdBy?.name}</Table.Td>
                <Table.Td>{new Date(q.createdAt).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  {canDelete && (
                    <Tooltip label="Delete">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => {
                          if (confirm(`Delete quotation ${q.quotationNumber}?`)) deleteMutation.mutate(q.id);
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      {query.data?.quotations.length === 0 && (
        <Text c="dimmed" mt="md">
          No quotations match your filters.
        </Text>
      )}

      {totalPages > 1 && (
        <Group justify="center" mt="lg">
          <Pagination value={page} onChange={setPage} total={totalPages} />
        </Group>
      )}
    </div>
  );
}
