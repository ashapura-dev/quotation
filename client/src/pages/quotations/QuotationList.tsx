import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
  ThemeIcon,
  Loader,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconDownload, IconEdit, IconEye, IconFileDescription, IconFilter, IconPlus, IconSearch, IconTrash, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteQuotation, exportQuotationsUrl, fetchQuotations, type QuotationFilters } from "../../api/quotations";
import { fetchCustomFields } from "../../api/customFields";
import { useAuth } from "../../hooks/useAuth";
import styles from "./QuotationList.module.css";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "gray",
  PENDING: "yellow",
  APPROVED: "blue",
  SENT_TO_CLIENT: "indigo",
  APPROVED_BY_CLIENT: "green",
  REJECTED_BY_CLIENT: "red",
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const SIDEBAR_W = 360;

export function QuotationList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<string | null>(null);
  const [quotationType, setQuotationType] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [customFieldFilters, setCustomFieldFilters] = useState<Record<string, string>>({});

  const customFieldsQuery = useQuery({
    queryKey: ["custom-fields", false],
    queryFn: () => fetchCustomFields(false),
  });

  const filters: QuotationFilters = {
    search: debouncedSearch || undefined,
    status: (status as QuotationFilters["status"]) || undefined,
    quotationType: (quotationType as QuotationFilters["quotationType"]) || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    pageSize,
    ...customFieldFilters,
  };

  const query = useQuery({ queryKey: ["quotations", filters], queryFn: () => fetchQuotations(filters) });

  const deleteMutation = useMutation({
    mutationFn: deleteQuotation,
    onSuccess: () => {
      notifications.show({ color: "green", message: "Quotation deleted" });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
    },
    onError: (err: Error) =>
      notifications.show({ color: "red", title: "Could not delete", message: err.message }),
  });

  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.pageSize)) : 1;

  // Count active sidebar filters (excludes search which is always visible)
  const sidebarFilterCount =
    (status ? 1 : 0) +
    (quotationType ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    Object.values(customFieldFilters).filter(Boolean).length;

  function clearSidebarFilters() {
    setStatus(null);
    setQuotationType(null);
    setDateFrom("");
    setDateTo("");
    setCustomFieldFilters({});
    setPage(1);
  }

  const filterableFields = customFieldsQuery.data?.filter((f) => f.showInFilter) ?? [];

  const inputStyles = {
    input: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      color: "#1e293b",
      borderRadius: 8,
    },
    label: { color: "#475569" },
  };

  return (
    // Outer wrapper — relative so the absolute sidebar is positioned against it
    <div style={{ position: "relative" }} className={styles.page}>

      {/* ── FILTER SIDEBAR (slides in from the left) ── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Quotation filters"
        style={{
          position: "fixed",
          top: 60,           // below app header
          right: sidebarOpen ? 0 : `-${SIDEBAR_W + 24}px`,
          width: `min(${SIDEBAR_W}px, 100vw)`,
          height: "calc(100vh - 60px)",
          zIndex: 200,
          transition: "right 0.28s cubic-bezier(0.4,0,0.2,1)",
          background: "#ffffff",
          borderLeft: "1px solid rgba(0,0,0,0.08)",
          boxShadow: sidebarOpen ? "-4px 0 20px rgba(0,0,0,0.10)" : "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Group
          justify="space-between"
          px="lg"
          py="md"
          style={{
            borderBottom: "1px solid #f1f5f9",
            flexShrink: 0,
            position: "sticky",
            top: 0,
            background: "#ffffff",
            zIndex: 1,
          }}
        >
          <Group gap="xs">
            <IconFilter size={18} color="#2563eb" />
            <div>
              <Text fw={700} size="sm" c="dark.8">Filter quotations</Text>
              <Text size="xs" c="dimmed">Narrow down your results</Text>
            </div>
            {sidebarFilterCount > 0 && (
              <Badge size="xs" circle color="blue" variant="filled">
                {sidebarFilterCount}
              </Badge>
            )}
          </Group>
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => setSidebarOpen(false)}
            style={{ color: "#64748b" }}
            aria-label="Close quotation filters"
          >
            <IconX size={18} />
          </ActionIcon>
        </Group>

        {/* Filter fields */}
        <Stack gap="lg" px="lg" py="lg" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>

          {/* Status */}
          <div>
            <Text size="xs" fw={600} mb={5} style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Status
            </Text>
            <Select
              placeholder="All statuses"
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
              onChange={(v) => { setStatus(v); setPage(1); }}
              styles={inputStyles}
              size="xs"
            />
          </div>

          {/* Type */}
          <div>
            <Text size="xs" fw={600} mb={5} style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Type
            </Text>
            <Select
              placeholder="All types"
              clearable
              data={[
                { value: "DPD", label: "DPD" },
                { value: "NON_DPD", label: "Non-DPD" },
              ]}
              value={quotationType}
              onChange={(v) => { setQuotationType(v); setPage(1); }}
              styles={inputStyles}
              size="xs"
            />
          </div>

          {/* Date Range */}
          <div>
            <Text size="xs" fw={600} mb={5} style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Date Range
            </Text>
            <Stack gap={6}>
              <TextInput
                type="date"
                label="From"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.currentTarget.value); setPage(1); }}
                styles={inputStyles}
                size="xs"
              />
              <TextInput
                type="date"
                label="To"
                value={dateTo}
                onChange={(e) => { setDateTo(e.currentTarget.value); setPage(1); }}
                styles={inputStyles}
                size="xs"
              />
            </Stack>
          </div>

          {/* Dynamic fields */}
          {filterableFields.length > 0 && (
            <>
              <Divider color="#e2e8f0" label={
                <Text size="xs" c="dimmed" style={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: 10 }}>
                  Custom Fields
                </Text>
              } />
              {filterableFields.map((f) => {
                const fieldLabel = (
                  <Text size="xs" fw={600} mb={5} style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {f.label}
                  </Text>
                );
                if (f.type === "SELECT") {
                  const opts = f.options
                    ? f.options.split(",").map((o) => ({ value: o.trim(), label: o.trim() }))
                    : [];
                  return (
                    <div key={f.name}>
                      {fieldLabel}
                      <Select
                        placeholder={`All`}
                        clearable
                        data={opts}
                        value={customFieldFilters[f.name] || null}
                        onChange={(v) => { setCustomFieldFilters((p) => ({ ...p, [f.name]: v || "" })); setPage(1); }}
                        styles={inputStyles}
                        size="xs"
                      />
                    </div>
                  );
                }
                if (f.type === "BOOLEAN") {
                  return (
                    <div key={f.name}>
                      {fieldLabel}
                      <Select
                        placeholder="Any"
                        clearable
                        data={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]}
                        value={customFieldFilters[f.name] || null}
                        onChange={(v) => { setCustomFieldFilters((p) => ({ ...p, [f.name]: v || "" })); setPage(1); }}
                        styles={inputStyles}
                        size="xs"
                      />
                    </div>
                  );
                }
                return (
                  <div key={f.name}>
                    {fieldLabel}
                    <TextInput
                      placeholder={`Search…`}
                      value={customFieldFilters[f.name] || ""}
                      onChange={(e) => { setCustomFieldFilters((p) => ({ ...p, [f.name]: e.currentTarget.value })); setPage(1); }}
                      styles={inputStyles}
                      size="xs"
                    />
                  </div>
                );
              })}
            </>
          )}
        </Stack>

        {/* Fixed footer stays available while the filter fields scroll. */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #e2e8f0",
            flexShrink: 0,
            background: "#ffffff",
          }}
        >
          <Group grow>
            <Button
              variant="default"
              size="sm"
              disabled={sidebarFilterCount === 0}
              onClick={clearSidebarFilters}
              style={{ borderRadius: 8 }}
            >
              Clear all
            </Button>
            <Button size="sm" onClick={() => setSidebarOpen(false)} style={{ borderRadius: 8 }}>
              Show results
            </Button>
          </Group>
        </div>
      </aside>

      {/* Backdrop when sidebar open */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            top: 60,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 199,
            background: "rgba(15, 23, 42, 0.28)",
            backdropFilter: "blur(1px)",
          }}
        />
      )}

      {/* ── TOP BAR (sticky) ── */}
      <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={46} radius="md" variant="light"><IconFileDescription size={24} /></ThemeIcon>
          <Box>
            <Title order={1} className={styles.title}>Quotations</Title>
            <Text c="dimmed" size="sm">Create, track and manage client quotations.</Text>
          </Box>
        </Group>
        {query.data && <Badge variant="light" color="gray" size="lg">{query.data.total} total</Badge>}
      </Group>

      <Paper withBorder radius="lg" p="md" className={styles.commandBar}>
        <Group justify="space-between" wrap="wrap" gap="md">

          {/* Centre: client search — always visible */}
          <TextInput
            placeholder="Search by client name…"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
            className={styles.search}
            radius="md"
          />

          {/* Right: export + new + filter toggle */}
          <Group gap="sm" wrap="nowrap">
            <Button
              component="a"
              href={exportQuotationsUrl(
                filters,
                [
                  "quotationNumber",
                  "clientName",
                  "quotationType",
                  "status",
                  "containers",
                  "subtotal",
                  "taxTotal",
                  "otherAdjustmentsTotal",
                  "grandTotal",
                  "createdBy",
                  "approvedBy",
                  "createdAt",
                  ...(customFieldsQuery.data?.filter((f) => f.showInExport).map((f) => f.name) || []),
                ],
                API_BASE
              )}
              variant="light"
              leftSection={<IconDownload size={16} />}
            >
              Export
            </Button>
            <Button leftSection={<IconPlus size={17} />} onClick={() => navigate("/quotations/new")}>New quotation</Button>
            <Tooltip label={sidebarOpen ? "Close filters" : "Open filters"} position="bottom-end">
              <ActionIcon
                variant={sidebarOpen || sidebarFilterCount > 0 ? "filled" : "light"}
                color="dark"
                size="lg"
                radius="md"
                onClick={() => setSidebarOpen((o) => !o)}
                style={{ position: "relative", flexShrink: 0 }}
              >
                <IconFilter size={17} />
                {sidebarFilterCount > 0 && (
                  <Badge
                    size="xs"
                    circle
                    color="blue"
                    variant="filled"
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      minWidth: 16,
                      height: 16,
                      fontSize: 9,
                      pointerEvents: "none",
                    }}
                  >
                    {sidebarFilterCount}
                  </Badge>
                )}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Paper>

      {/* ── TABLE ── */}
      <Paper withBorder radius="lg" className={styles.tableCard}>
      <Group justify="space-between" px="lg" py="md">
        <Box>
          <Text fw={650}>Quotation register</Text>
          <Text size="xs" c="dimmed">Showing the latest matching records</Text>
        </Box>
        {sidebarFilterCount > 0 && <Badge variant="light" leftSection={<IconFilter size={12} />}>{sidebarFilterCount} active filters</Badge>}
      </Group>
      <Table.ScrollContainer minWidth={1180}>
      <Table striped highlightOnHover verticalSpacing="sm" className={styles.table}>
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
            {customFieldsQuery.data?.filter((f) => f.showInList).map((f) => (
              <Table.Th key={f.name}>{f.label}</Table.Th>
            ))}
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {query.isPending ? (
            <Table.Tr>
              <Table.Td
                colSpan={9 + (customFieldsQuery.data?.filter((f) => f.showInList).length || 0)}
                style={{ height: 200 }}
              >
                <Group justify="center" align="center" style={{ height: "100%" }}>
                  <Loader size="md" />
                </Group>
              </Table.Td>
            </Table.Tr>
          ) : (
            query.data?.quotations.map((q) => {
              const canDelete =
                user?.role === "SUPER_ADMIN" || (user?.id === q.createdById && q.status === "DRAFT");
              const canEdit =
                user?.role === "SUPER_ADMIN" || (user?.id === q.createdById && q.status === "DRAFT");
              return (
                <Table.Tr key={q.id}>
                  <Table.Td
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/quotations/${q.id}`)}
                  >
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
                  {customFieldsQuery.data?.filter((f) => f.showInList).map((f) => {
                    const val = f.isDefault
                      ? (q as any)[f.name]
                      : (q.customFields as Record<string, any>)?.[f.name];
                    let displayVal = "-";
                    if (val !== undefined && val !== null) {
                      displayVal = f.type === "BOOLEAN" ? (val ? "Yes" : "No") : String(val);
                    }
                    return <Table.Td key={f.name}>{displayVal}</Table.Td>;
                  })}
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Tooltip label="View quotation">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          radius="md"
                          onClick={() => navigate(`/quotations/${q.id}`)}
                          aria-label={`View quotation ${q.quotationNumber}`}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip label="Edit quotation">
                          <ActionIcon
                            variant="light"
                            color="orange"
                            radius="md"
                            onClick={() => navigate(`/quotations/${q.id}/edit`)}
                            aria-label={`Edit quotation ${q.quotationNumber}`}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {canDelete && (
                      <Tooltip label="Delete">
                        <ActionIcon
                          variant="light"
                          color="red"
                          radius="md"
                          onClick={() => {
                            if (confirm(`Delete quotation ${q.quotationNumber}?`))
                              deleteMutation.mutate(q.id);
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })
          )}
        </Table.Tbody>
      </Table>
      </Table.ScrollContainer>

      {query.data?.quotations.length === 0 && (
        <Stack align="center" gap={8} py={50}>
          <ThemeIcon size={50} radius="xl" variant="light" color="gray"><IconSearch size={24} /></ThemeIcon>
          <Text fw={600}>No quotations found</Text>
          <Text c="dimmed" size="sm">Try changing your search or clearing the active filters.</Text>
          {sidebarFilterCount > 0 && <Button variant="light" size="xs" onClick={clearSidebarFilters}>Clear filters</Button>}
        </Stack>
      )}

      {query.data && query.data.total > 0 && (
        <Group
          justify="space-between"
          align="center"
          className={styles.pagination}
        >
          <Text size="xs" c="dimmed">
            Showing {Math.min(query.data.total, (page - 1) * pageSize + 1)}–
            {Math.min(query.data.total, page * pageSize)} of {query.data.total} quotations
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
                  if (val) { setPageSize(Number(val)); setPage(1); }
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
      </Paper>
    </div>
  );
}
