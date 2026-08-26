import { Card, Group, SimpleGrid, Text, Title } from "@mantine/core";
import { BarChart, DonutChart } from "@mantine/charts";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "../api/dashboard";
import { useAuth } from "../hooks/useAuth";
import {
  IconFileDescription,
  IconClock,
  IconCircleCheck,
  IconSend,
  IconDiscountCheck,
  IconCircleX,
  IconPercentage,
  IconHourglass,
} from "@tabler/icons-react";

export function Dashboard() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchDashboardSummary });

  const typeData = data
    ? [
        { name: "DPD", value: data.typeCounts.DPD, color: "#2563eb" },
        { name: "Non-DPD", value: data.typeCounts.NON_DPD, color: "#ea580c" },
      ]
    : [];

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} style={{ fontWeight: 800, fontFamily: "Outfit, sans-serif", letterSpacing: "-0.5px" }}>
            Welcome back, {user?.name}
          </Title>
          <Text size="xs" c="dimmed">Here is an overview of Ashapura's quotation pipelines and performance metrics.</Text>
        </div>
      </Group>

      {/* Primary KPI Status Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mb="lg" spacing="md">
        <Card withBorder radius="lg" shadow="xs" className="hover-card" style={{ borderTop: "4px solid #94a3b8" }}>
          <Group justify="space-between" align="flex-start">
            <div>
              <Text c="dimmed" size="xs" fw={700} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Draft quotations
              </Text>
              <Title order={2} mt="xs" style={{ fontWeight: 800 }}>{data?.statusCounts.DRAFT ?? "—"}</Title>
            </div>
            <IconFileDescription size={28} color="#94a3b8" />
          </Group>
        </Card>

        <Card withBorder radius="lg" shadow="xs" className="hover-card" style={{ borderTop: "4px solid #f59e0b" }}>
          <Group justify="space-between" align="flex-start">
            <div>
              <Text c="dimmed" size="xs" fw={700} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Pending review
              </Text>
              <Title order={2} mt="xs" style={{ fontWeight: 800 }}>{data?.statusCounts.PENDING ?? "—"}</Title>
            </div>
            <IconClock size={28} color="#f59e0b" />
          </Group>
        </Card>

        <Card withBorder radius="lg" shadow="xs" className="hover-card" style={{ borderTop: "4px solid #10b981" }}>
          <Group justify="space-between" align="flex-start">
            <div>
              <Text c="dimmed" size="xs" fw={700} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Approved
              </Text>
              <Title order={2} mt="xs" style={{ fontWeight: 800 }}>{data?.statusCounts.APPROVED ?? "—"}</Title>
            </div>
            <IconCircleCheck size={28} color="#10b981" />
          </Group>
        </Card>

        <Card withBorder radius="lg" shadow="xs" className="hover-card" style={{ borderTop: "4px solid #3b82f6" }}>
          <Group justify="space-between" align="flex-start">
            <div>
              <Text c="dimmed" size="xs" fw={700} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Sent to client
              </Text>
              <Title order={2} mt="xs" style={{ fontWeight: 800 }}>{data?.statusCounts.SENT_TO_CLIENT ?? "—"}</Title>
            </div>
            <IconSend size={28} color="#3b82f6" />
          </Group>
        </Card>

        <Card withBorder radius="lg" shadow="xs" className="hover-card" style={{ borderTop: "4px solid #6366f1" }}>
          <Group justify="space-between" align="flex-start">
            <div>
              <Text c="dimmed" size="xs" fw={700} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Approved by client
              </Text>
              <Title order={2} mt="xs" style={{ fontWeight: 800 }}>{data?.statusCounts.APPROVED_BY_CLIENT ?? "—"}</Title>
            </div>
            <IconDiscountCheck size={28} color="#6366f1" />
          </Group>
        </Card>

        <Card withBorder radius="lg" shadow="xs" className="hover-card" style={{ borderTop: "4px solid #ef4444" }}>
          <Group justify="space-between" align="flex-start">
            <div>
              <Text c="dimmed" size="xs" fw={700} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Rejected by client
              </Text>
              <Title order={2} mt="xs" style={{ fontWeight: 800 }}>{data?.statusCounts.REJECTED_BY_CLIENT ?? "—"}</Title>
            </div>
            <IconCircleX size={28} color="#ef4444" />
          </Group>
        </Card>
      </SimpleGrid>

      {/* Operational Metrics Split */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} mb="lg" spacing="md">
        <Card withBorder radius="lg" shadow="xs" className="hover-card" style={{ borderLeft: "4px solid #ec4899" }}>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="xs" fw={700} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Conversion rate (Sent to Approved)
              </Text>
              <Title order={2} mt="xs" style={{ fontWeight: 800 }}>{data ? `${data.conversionRate}%` : "—"}</Title>
            </div>
            <IconPercentage size={28} color="#ec4899" />
          </Group>
        </Card>
        <Card withBorder radius="lg" shadow="xs" className="hover-card" style={{ borderLeft: "4px solid #8b5cf6" }}>
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="xs" fw={700} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Avg. approval turnaround
              </Text>
              <Title order={2} mt="xs" style={{ fontWeight: 800 }}>
                {data?.avgApprovalTurnaroundDays !== null && data?.avgApprovalTurnaroundDays !== undefined ? `${data.avgApprovalTurnaroundDays} days` : "No approvals yet"}
              </Title>
            </div>
            <IconHourglass size={28} color="#8b5cf6" />
          </Group>
        </Card>
      </SimpleGrid>

      {/* Chart Panels */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} mb="lg" spacing="md">
        <Card withBorder radius="lg" shadow="xs" p="md">
          <Text fw={700} size="sm" mb="md" style={{ letterSpacing: "0.2px" }}>
            Quotation volume (last 6 months)
          </Text>
          {data && (
            <BarChart
              h={260}
              data={data.volumeOverTime}
              dataKey="month"
              series={[{ name: "count", color: "#3b82f6", label: "Quotations" }]}
              tickLine="y"
              gridAxis="y"
            />
          )}
        </Card>
        <Card withBorder radius="lg" shadow="xs" p="md" style={{ display: "flex", flexDirection: "column" }}>
          <Text fw={700} size="sm" mb="md" style={{ letterSpacing: "0.2px" }}>
            DPD vs Non-DPD split
          </Text>
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
            {data && data.typeCounts.DPD + data.typeCounts.NON_DPD > 0 ? (
              <DonutChart data={typeData} withLabelsLine withLabels size={180} thickness={24} />
            ) : (
              <Text c="dimmed" size="sm">
                No quotations yet.
              </Text>
            )}
          </div>
        </Card>
      </SimpleGrid>
    </div>
  );
}
