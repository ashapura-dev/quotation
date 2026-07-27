import { Text, Title } from "@mantine/core";

export function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <Title order={2}>{title}</Title>
      <Text c="dimmed" mt="sm">
        This screen is built in a later phase of the plan.
      </Text>
    </div>
  );
}
