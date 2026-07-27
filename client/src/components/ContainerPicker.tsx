import { Group, NumberInput, Paper, Stack, Text } from "@mantine/core";
import type { ContainerSize } from "../api/containerSizes";
import type { QuotationContainer } from "../api/quotations";

interface Props {
  containerSizes: ContainerSize[];
  value: QuotationContainer[];
  onChange: (containers: QuotationContainer[]) => void;
}

export function ContainerPicker({ containerSizes, value, onChange }: Props) {
  function setQuantity(size: ContainerSize, quantity: number) {
    const withoutThis = value.filter((c) => c.containerSizeId !== size.id);
    if (quantity > 0) {
      onChange([...withoutThis, { containerSizeId: size.id, containerSizeLabel: size.label, quantity }]);
    } else {
      onChange(withoutThis);
    }
  }

  return (
    <Paper withBorder p="sm" radius="md">
      <Text size="sm" fw={600} mb="xs">
        Containers
      </Text>
      <Group gap="md">
        {containerSizes.map((size) => {
          const current = value.find((c) => c.containerSizeId === size.id);
          return (
            <Stack key={size.id} gap={4} w={140}>
              <Text size="xs" c="dimmed">
                {size.label}
              </Text>
              <NumberInput
                min={0}
                value={current?.quantity ?? 0}
                onChange={(v) => setQuantity(size, Number(v) || 0)}
                placeholder="Qty"
              />
            </Stack>
          );
        })}
      </Group>
    </Paper>
  );
}
