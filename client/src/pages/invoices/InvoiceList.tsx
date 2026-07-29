import { Badge, Group, Pagination, Select, Table, Text, TextInput, Title } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchInvoices } from "../../api/invoices";

const STATUS_COLOR: Record<string, string> = {
  UNPAID: "red",
  PARTIALLY_PAID: "yellow",
  PAID: "green",
};

export function InvoiceList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["invoices", debouncedSearch, paymentStatus, page],
    queryFn: () => fetchInvoices({ search: debouncedSearch || undefined, paymentStatus: paymentStatus || undefined, page, pageSize: 10 }),
  });

  return (
    <div>
      <Title order={2} mb="md">
        Invoices
      </Title>

      <Group mb="md">
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
          placeholder="Payment status"
          clearable
          data={[
            { value: "UNPAID", label: "Unpaid" },
            { value: "PARTIALLY_PAID", label: "Partially Paid" },
            { value: "PAID", label: "Paid" },
          ]}
          value={paymentStatus}
          onChange={(v) => {
            setPaymentStatus(v);
            setPage(1);
          }}
          w={180}
        />
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Invoice #</Table.Th>
            <Table.Th>Client</Table.Th>
            <Table.Th>Quotation</Table.Th>
            <Table.Th>Grand Total</Table.Th>
            <Table.Th>Payment</Table.Th>
            <Table.Th>Due Date</Table.Th>
            <Table.Th>Issued</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {query.data?.invoices.map((inv) => (
            <Table.Tr key={inv.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/invoices/${inv.id}`)}>
              <Table.Td>{inv.invoiceNumber}</Table.Td>
              <Table.Td>{inv.clientName}</Table.Td>
              <Table.Td>{inv.quotation?.quotationNumber}</Table.Td>
              <Table.Td>{inv.grandTotal.toFixed(2)}</Table.Td>
              <Table.Td>
                <Badge color={STATUS_COLOR[inv.paymentStatus]}>{inv.paymentStatus.replace("_", " ")}</Badge>
              </Table.Td>
              <Table.Td>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</Table.Td>
              <Table.Td>{new Date(inv.issuedAt).toLocaleDateString()}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {query.data?.invoices.length === 0 && (
        <Text c="dimmed" mt="md">
          No invoices yet. Convert an Approved or Sent quotation to create one.
        </Text>
      )}

      {query.data && Math.ceil(query.data.total / query.data.pageSize) > 1 && (
        <Group justify="center" mt="lg">
          <Pagination
            value={page}
            onChange={setPage}
            total={Math.ceil(query.data.total / query.data.pageSize)}
          />
        </Group>
      )}
    </div>
  );
}
