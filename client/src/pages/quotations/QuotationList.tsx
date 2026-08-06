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
  Loader,
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
  SENT_TO_CLIENT: "indigo",
  APPROVED_BY_CLIENT: "green",
  REJECTED_BY_CLIENT: "red",
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
  const [pageSize, setPageSize] = useState<number>(10);

  const filters: QuotationFilters = {
    search: debouncedSearch || undefined,
    status: (status as QuotationFilters["status"]) || undefined,
    quotationType: (quotationType as QuotationFilters["quotationType"]) || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize,
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
      <div style={{ position: "sticky", top: 60, backgroundColor: "#f8fafc", zIndex: 100, paddingTop: "8px", paddingBottom: "12px", borderBottom: "1px solid rgba(0,0,0,0.05)", marginBottom: "16px" }}>
        <Group justify="space-between" mb="sm">
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

        <Group gap="sm" align="flex-end">
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
            data={[
              { value: "DRAFT", label: "Draft" },
              { value: "PENDING", label: "Pending Review" },
              { value: "APPROVED", label: "Approved" },
              { value: "SENT_TO_CLIENT", label: "Sent to Client" },
              { value: "APPROVED_BY_CLIENT", label: "Approved by Client" },
              { value: "REJECTED_BY_CLIENT", label: "Rejected by Client" },
            ]}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            w={160}
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
      </div>

      <Table className="sticky-th" striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Number</Table.Th>
            <Table.Th>Client</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Grand total</Table.Th>
            <Table.Th>Created by</Table.Th>
            <Table.Th>Approved by</Table.Th>
            <Table.Th>Date</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {query.isPending ? (
            <Table.Tr>
              <Table.Td colSpan={9} style={{ height: "200px" }}>
                <Group justify="center" align="center" style={{ height: "100%" }}>
                  <Loader size="md" />
                </Group>
              </Table.Td>
            </Table.Tr>
          ) : (
            query.data?.quotations.map((q) => {
              const canDelete =
                user?.role === "SUPER_ADMIN" || (user?.id === q.createdById && q.status === "DRAFT");
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
                  <Table.Td>{q.approvedBy?.name ?? "-"}</Table.Td>
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
            })
          )}
        </Table.Tbody>
      </Table>

      {query.data?.quotations.length === 0 && (
        <Text c="dimmed" mt="md">
          No quotations match your filters.
        </Text>
      )}

      {query.data && query.data.total > 0 && (
        <Group justify="space-between" align="center" mt="lg" style={{ borderTop: "1px solid rgba(0, 0, 0, 0.05)", paddingTop: "16px" }}>
          <Text size="xs" c="dimmed">
            Showing {Math.min(query.data.total, (page - 1) * pageSize + 1)} - {Math.min(query.data.total, page * pageSize)} of {query.data.total} quotations
          </Text>
          <Group gap="md">
            {totalPages > 1 && (
              <Pagination value={page} onChange={setPage} total={totalPages} size="sm" />
            )}
            <Group gap="xs" align="center">
              <Text size="xs" c="dimmed">Show</Text>
              <Select
                value={String(pageSize)}
                onChange={(val) => {
                  if (val) {
                    setPageSize(Number(val));
                    setPage(1);
                  }
                }}
                data={[
                  { value: "10", label: "10 per page" },
                  { value: "15", label: "15 per page" },
                  { value: "20", label: "20 per page" },
                ]}
                w={120}
                size="xs"
              />
            </Group>
          </Group>
        </Group>
      )}
    </div>
  );
}
