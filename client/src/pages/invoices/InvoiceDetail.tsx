import { Badge, Button, Card, Group, Select, Stack, Table, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { fetchInvoice, invoicePdfUrl, updateInvoicePaymentStatus, type PaymentStatus } from "../../api/invoices";

const STATUS_COLOR: Record<string, string> = {
  UNPAID: "red",
  PARTIALLY_PAID: "yellow",
  PAID: "green",
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ["invoice", id], queryFn: () => fetchInvoice(Number(id)) });

  const statusMutation = useMutation({
    mutationFn: (paymentStatus: PaymentStatus) => updateInvoicePaymentStatus(Number(id), paymentStatus),
    onSuccess: () => {
      notifications.show({ color: "green", message: "Payment status updated" });
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  if (query.isLoading || !query.data) return <Text>Loading...</Text>;
  const inv = query.data;

  return (
    <div>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2}>{inv.invoiceNumber}</Title>
          <Group gap="xs" mt={4}>
            <Badge color={STATUS_COLOR[inv.paymentStatus]}>{inv.paymentStatus.replace("_", " ")}</Badge>
            {inv.quotation && (
              <Text
                size="sm"
                c="blue"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/quotations/${inv.quotation!.id}`)}
              >
                From quotation {inv.quotation.quotationNumber}
              </Text>
            )}
          </Group>
        </div>
        <Group>
          <Select
            data={[
              { value: "UNPAID", label: "Unpaid" },
              { value: "PARTIALLY_PAID", label: "Partially Paid" },
              { value: "PAID", label: "Paid" },
            ]}
            value={inv.paymentStatus}
            onChange={(v) => v && statusMutation.mutate(v as PaymentStatus)}
            w={160}
          />
          <Button component="a" href={invoicePdfUrl(inv.id, API_BASE)} target="_blank" variant="light">
            Download PDF
          </Button>
        </Group>
      </Group>

      <Card mb="md">
        <Text fw={600} mb="xs">
          Client
        </Text>
        <Text>{inv.clientName}</Text>
        {inv.clientAddress && <Text size="sm" c="dimmed">{inv.clientAddress}</Text>}
        <Group gap="lg" mt="xs">
          {inv.clientContactPerson && <Text size="sm">Contact: {inv.clientContactPerson}</Text>}
          {inv.clientPhone && <Text size="sm">Phone: {inv.clientPhone}</Text>}
          {inv.clientEmail && <Text size="sm">Email: {inv.clientEmail}</Text>}
          {inv.clientGstin && <Text size="sm">GSTIN: {inv.clientGstin}</Text>}
        </Group>
      </Card>

      <Card>
        <Text fw={600} mb="xs">
          Line items
        </Text>
        <Table verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Description</Table.Th>
              <Table.Th ta="right">Amount</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {inv.lineItems.map((li) => (
              <Table.Tr key={li.id}>
                <Table.Td>{li.label}</Table.Td>
                <Table.Td ta="right">{li.amount.toFixed(2)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Stack gap={4} mt="md" align="flex-end">
          <Text size="sm">Subtotal: {inv.subtotal.toFixed(2)}</Text>
          <Text size="sm">Tax: {inv.taxTotal.toFixed(2)}</Text>
          <Text fw={700}>Grand total: {inv.grandTotal.toFixed(2)}</Text>
        </Stack>
      </Card>
    </div>
  );
}
