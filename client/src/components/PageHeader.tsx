import { Box, Group, Text, ThemeIcon, Title } from "@mantine/core";
import type { ReactNode } from "react";
import type { Icon as TablerIcon } from "@tabler/icons-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: TablerIcon;
  actions?: ReactNode;
}

/** Consistent title area used across application modules. */
export function PageHeader({ title, description, eyebrow, icon: Icon, actions }: PageHeaderProps) {
  return (
    <Group justify="space-between" align="flex-end" mb="xl" gap="md" wrap="wrap">
      <Group gap="sm" align="center" wrap="nowrap">
        {Icon && <ThemeIcon size={46} radius="md" variant="light"><Icon size={24} /></ThemeIcon>}
        <Box>
          {eyebrow && <Text size="xs" fw={700} c="brand.7" tt="uppercase" style={{ letterSpacing: ".08em" }}>{eyebrow}</Text>}
          <Title order={1} style={{ fontSize: "clamp(1.75rem, 3vw, 2.2rem)", letterSpacing: "-.035em" }}>{title}</Title>
          {description && <Text c="dimmed" size="sm" mt={3}>{description}</Text>}
        </Box>
      </Group>
      {actions}
    </Group>
  );
}
