import {
  ActionIcon,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconGripVertical, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import type { ContainerSize } from "../api/containerSizes";
import type { RateComponent } from "../api/rateTemplates";

let tempKeyCounter = 0;
function tempKey() {
  tempKeyCounter += 1;
  return `new-${Date.now()}-${tempKeyCounter}`;
}

type Row = RateComponent & { _key: string };

const TYPE_OPTIONS = [
  { value: "FIXED", label: "Fixed amount" },
  { value: "PER_CONTAINER", label: "Per container" },
  { value: "TEXT", label: "Text" },
];

function withKeys(components: RateComponent[]): Row[] {
  return components.map((c) => ({ ...c, _key: c.id ? String(c.id) : tempKey() }));
}

function blankRow(): Row {
  return {
    _key: tempKey(),
    label: "",
    componentType: "FIXED",
    isTax: false,
    sortOrder: 0,
    fixedValue: 0,
    percentageValue: null,
    containerRates: [],
    textValue: "",
    remark: "",
  };
}

interface Props {
  initialComponents: RateComponent[];
  containerSizes: ContainerSize[];
  onChange: (components: RateComponent[]) => void;
}

export function DynamicComponentBuilder({ initialComponents, containerSizes, onChange }: Props) {
  const [rows, setRows] = useState<Row[]>(() => (initialComponents.length ? withKeys(initialComponents) : []));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function commit(next: Row[]) {
    setRows(next);
    onChange(next.map(({ _key, ...rest }) => rest));
  }

  function addRow() {
    commit([...rows, blankRow()]);
  }

  function updateRow(key: string, patch: Partial<Row>) {
    commit(rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    commit(rows.filter((r) => r._key !== key));
  }

  function setContainerRate(key: string, containerSizeId: number, rateValue: number) {
    commit(
      rows.map((r) => {
        if (r._key !== key) return r;
        const existing = r.containerRates.filter((cr) => Number(cr.containerSizeId) !== containerSizeId);
        return { ...r, containerRates: [...existing, { containerSizeId, rateValue }] };
      }),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r._key === active.id);
    const newIndex = rows.findIndex((r) => r._key === over.id);
    commit(arrayMove(rows, oldIndex, newIndex));
  }

  return (
    <Stack gap="sm">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map((r) => r._key)} strategy={verticalListSortingStrategy}>
          <Stack gap="xs">
            {rows.map((row) => (
              <ComponentRow
                key={row._key}
                row={row}
                containerSizes={containerSizes}
                onUpdate={(patch) => updateRow(row._key, patch)}
                onRemove={() => removeRow(row._key)}
                onSetContainerRate={(sizeId, value) => setContainerRate(row._key, sizeId, value)}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      <Group>
        <ActionIcon variant="light" onClick={addRow} size="lg" aria-label="Add a rate component">
          <IconPlus size={18} />
        </ActionIcon>
        <Text size="sm" c="dimmed">
          Add a rate component
        </Text>
      </Group>
    </Stack>
  );
}

function ComponentRow({
  row,
  containerSizes,
  onUpdate,
  onRemove,
  onSetContainerRate,
}: {
  row: Row;
  containerSizes: ContainerSize[];
  onUpdate: (patch: Partial<Row>) => void;
  onRemove: () => void;
  onSetContainerRate: (containerSizeId: number, rateValue: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row._key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Paper ref={setNodeRef} style={style} withBorder p="sm" radius="md">
      <Stack gap="xs">
        <Group wrap="nowrap">
          <ActionIcon variant="subtle" {...attributes} {...listeners} style={{ cursor: "grab" }}>
            <IconGripVertical size={16} />
          </ActionIcon>
          <TextInput
            placeholder="Component label"
            value={row.label}
            onChange={(e) => onUpdate({ label: e.currentTarget.value })}
            style={{ flex: 1 }}
          />
          <Select
            data={TYPE_OPTIONS}
            value={row.componentType}
            onChange={(value) => value && onUpdate({ componentType: value as Row["componentType"] })}
            w={200}
          />
          {row.componentType === "FIXED" && (
            <NumberInput
              placeholder="Amount"
              value={row.fixedValue ?? 0}
              onChange={(value) => onUpdate({ fixedValue: Number(value) || 0 })}
              w={140}
              decimalScale={2}
              min={0}
            />
          )}
          {row.componentType === "TEXT" && (
            <TextInput
              placeholder="Text value"
              value={row.textValue ?? ""}
              onChange={(e) => onUpdate({ textValue: e.currentTarget.value })}
              w={140}
            />
          )}
          <TextInput
            placeholder="Remark"
            value={row.remark ?? ""}
            onChange={(e) => onUpdate({ remark: e.currentTarget.value })}
            w={180}
          />
          <ActionIcon color="red" variant="subtle" onClick={onRemove}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>

        {row.componentType === "PER_CONTAINER" && (
          <Table withTableBorder={false} verticalSpacing={4}>
            <Table.Thead>
              <Table.Tr>
                {containerSizes.map((size) => (
                  <Table.Th key={size.id}>{size.label}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                {containerSizes.map((size) => {
                  const rate = row.containerRates.find((r) => Number(r.containerSizeId) === size.id);
                  return (
                    <Table.Td key={size.id}>
                      <NumberInput
                        placeholder="Rate"
                        value={rate?.rateValue ?? ""}
                        onChange={(value) => onSetContainerRate(size.id, Number(value) || 0)}
                        decimalScale={2}
                        min={0}
                      />
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}
