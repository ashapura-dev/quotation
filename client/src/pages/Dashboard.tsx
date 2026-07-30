import { Card, Group, SimpleGrid, Table, Text, Title } from "@mantine/core";
import { BarChart, DonutChart } from "@mantine/charts";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "../api/dashboard";
import { useAuth } from "../hooks/useAuth";

export function Dashboard() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchDashboardSummary });

  const typeData = data
    ? [
        { name: "DPD", value: data.typeCounts.DPD, color: "blue.6" },
        { name: "Non-DPD", value: data.typeCounts.NON_DPD, color: "orange.6" },
      ]
    : [];

  return (
    <div>
      <Title order={2} mb="md">
        Welcome back, {user?.name}
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mb="lg">
        <Card>
          <Text c="dimmed" size="sm">
            Draft quotations
          </Text>
          <Title order={3}>{data?.statusCounts.DRAFT ?? "—"}</Title>
        </Card>
        <Card>
          <Text c="dimmed" size="sm">
            Pending review
          </Text>
          <Title order={3}>{data?.statusCounts.PENDING ?? "—"}</Title>
        </Card>
        <Card>
          <Text c="dimmed" size="sm">
            Approved
          </Text>
          <Title order={3}>{data?.statusCounts.APPROVED ?? "—"}</Title>
        </Card>
        <Card>
          <Text c="dimmed" size="sm">
            Sent to client
          </Text>
          <Title order={3}>{data?.statusCounts.SENT_TO_CLIENT ?? "—"}</Title>
        </Card>
        <Card>
          <Text c="dimmed" size="sm">
            Approved by client
          </Text>
          <Title order={3}>{data?.statusCounts.APPROVED_BY_CLIENT ?? "—"}</Title>
        </Card>
        <Card>
          <Text c="dimmed" size="sm">
            Rejected by client
          </Text>
          <Title order={3}>{data?.statusCounts.REJECTED_BY_CLIENT ?? "—"}</Title>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} mb="lg">
        <Card>
          <Text c="dimmed" size="sm">
            Conversion rate (Sent or Approved by Client)
          </Text>
          <Title order={3}>{data ? `${data.conversionRate}%` : "—"}</Title>
        </Card>
        <Card>
          <Text c="dimmed" size="sm">
            Avg. approval turnaround
          </Text>
          <Title order={3}>{data?.avgApprovalTurnaroundDays !== null && data?.avgApprovalTurnaroundDays !== undefined ? `${data.avgApprovalTurnaroundDays} days` : "No approvals yet"}</Title>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} mb="lg">
        <Card>
          <Text fw={600} mb="sm">
            Quotation volume (last 6 months)
          </Text>
          {data && (
            <BarChart
              h={260}
              data={data.volumeOverTime}
              dataKey="month"
              series={[{ name: "count", color: "blue.6", label: "Quotations" }]}
              tickLine="y"
              gridAxis="y"
            />
          )}
        </Card>
        <Card>
          <Text fw={600} mb="sm">
            DPD vs Non-DPD split
          </Text>
          {data && data.typeCounts.DPD + data.typeCounts.NON_DPD > 0 ? (
            <DonutChart data={typeData} withLabelsLine withLabels />
          ) : (
            <Text c="dimmed" size="sm">
              No quotations yet.
            </Text>
          )}
        </Card>
      </SimpleGrid>

      <Card>
        <Text fw={600} mb="sm">
          Top clients (last 6 months)
        </Text>
        {data && data.topClients.length > 0 ? (
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Client</Table.Th>
                <Table.Th ta="right">Quotations</Table.Th>
                <Table.Th ta="right">Total value</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.topClients.map((c) => (
                <Table.Tr key={c.clientName}>
                  <Table.Td>{c.clientName}</Table.Td>
                  <Table.Td ta="right">{c.count}</Table.Td>
                  <Table.Td ta="right">{c.total.toFixed(2)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Text c="dimmed" size="sm">
            No quotations yet.
          </Text>
        )}
      </Card>

      <Group mt="lg">
        <Text c="dimmed" size="xs">
          Notifications are available from the bell icon in the header.
        </Text>
      </Group>
    </div>
  );
}
