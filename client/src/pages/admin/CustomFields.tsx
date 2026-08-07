import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAdjustmentsHorizontal,
  IconBraces,
  IconCheck,
  IconChevronRight,
  IconFileDescription,
  IconHash,
  IconGripVertical,
  IconList,
  IconPencil,
  IconPlus,
  IconSearch,
  IconToggleLeft,
  IconTrash,
  IconTypography,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createCustomField,
  deleteCustomField,
  fetchCustomFields,
  reorderCustomFields,
  updateCustomField,
  type CustomField,
} from "../../api/customFields";
import styles from "./CustomFields.module.css";
import { DataTable, type DataTableColumn } from "../../components/DataTable";

type FieldType = CustomField["type"];
type VisibilityKey = "showInPdf" | "showInList" | "showInFilter" | "showInExport";

const TYPE_META: Record<FieldType, { label: string; description: string; color: string; icon: typeof IconTypography }> = {
  TEXT: { label: "Text", description: "Short or long written values", color: "blue", icon: IconTypography },
  NUMBER: { label: "Number", description: "Numeric values and quantities", color: "violet", icon: IconHash },
  BOOLEAN: { label: "Yes / No", description: "A simple on or off choice", color: "teal", icon: IconToggleLeft },
  SELECT: { label: "Dropdown", description: "Choose from a preset list", color: "orange", icon: IconList },
};

const TYPE_OPTIONS = Object.entries(TYPE_META).map(([value, meta]) => ({ value, label: meta.label }));
const FILTERABLE_CORE_FIELDS = new Set(["quotationType", "status", "createdAt"]);

const SCROLL_ZONE = 80;  // px from top/bottom edge that triggers scroll
const SCROLL_SPEED = 12; // px per animation frame

export function CustomFields() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [newOption, setNewOption] = useState("");
  const [optionsList, setOptionsList] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("all");
  const [draggedId, setDraggedId] = useState<number | null>(null);

  // Auto-scroll state
  const scrollRafRef = useRef<number | null>(null);
  const scrollDirectionRef = useRef<-1 | 0 | 1>(0);

  function startAutoScroll(direction: -1 | 1) {
    scrollDirectionRef.current = direction;
    if (scrollRafRef.current !== null) return; // already running
    const tick = () => {
      if (scrollDirectionRef.current === 0) {
        scrollRafRef.current = null;
        return;
      }
      window.scrollBy(0, scrollDirectionRef.current * SCROLL_SPEED);
      scrollRafRef.current = requestAnimationFrame(tick);
    };
    scrollRafRef.current = requestAnimationFrame(tick);
  }

  function stopAutoScroll() {
    scrollDirectionRef.current = 0;
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  }

  // Clean up RAF on unmount
  useEffect(() => () => stopAutoScroll(), []);

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    const y = event.clientY;
    const vh = window.innerHeight;
    if (y < SCROLL_ZONE) {
      startAutoScroll(-1);
    } else if (y > vh - SCROLL_ZONE) {
      startAutoScroll(1);
    } else {
      stopAutoScroll();
    }
  }

  const query = useQuery({ queryKey: ["custom-fields", true], queryFn: () => fetchCustomFields(true) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["custom-fields"] });

  const form = useForm({
    initialValues: {
      label: "",
      type: "TEXT" as FieldType,
      required: false,
      options: "",
      isActive: true,
      showInPdf: true,
      showInFilter: true,
      showInExport: true,
      showInList: true,
      isDefault: false,
    },
    validate: {
      label: (value) => value.trim().length < 2 ? "Enter a label with at least 2 characters" : null,
      options: (value, values) => values.type === "SELECT" && !value ? "Add at least one dropdown option" : null,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: typeof form.values) => {
      const payload = {
        label: values.label.trim(),
        type: values.type,
        required: values.required,
        options: values.type === "SELECT" ? values.options : null,
        isActive: values.isActive,
        showInPdf: values.showInPdf,
        showInFilter: values.showInFilter,
        showInExport: values.showInExport,
        showInList: values.showInList,
      };
      return editing ? updateCustomField(editing.id, payload) : createCustomField(payload);
    },
    onSuccess: () => {
      notifications.show({ color: "teal", icon: <IconCheck size={16} />, message: editing ? "Custom field updated" : "Custom field created" });
      invalidate();
      handleClose();
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not save field", message: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomField,
    onSuccess: () => {
      notifications.show({ color: "teal", message: "Custom field removed" });
      invalidate();
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not delete field", message: err.message }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Record<VisibilityKey | "required" | "isActive", boolean>> }) =>
      updateCustomField(id, patch),
    onSuccess: () => invalidate(),
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not update field", message: err.message }),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderCustomFields,
    onSuccess: () => invalidate(),
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not reorder fields", message: err.message }),
  });

  const fields = query.data ?? [];
  const filteredFields = useMemo(() => fields.filter((field) => {
    const matchesSearch = `${field.label} ${field.name} ${field.type}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? field.isActive : !field.isActive);
    return matchesSearch && matchesStatus;
  }), [fields, search, statusFilter]);

  const stats = {
    total: fields.length,
    active: fields.filter((field) => field.isActive).length,
    required: fields.filter((field) => field.required && !field.isDefault).length,
    visible: fields.filter((field) => field.showInPdf).length,
  };
  const tableColumns: DataTableColumn[] = [
    "Field", "Type", "Required", "PDF", "List", "Filter", "Export", "Status", "Actions",
  ].map((header) => ({ key: header, header }));

  function handleClose() {
    close();
    setEditing(null);
    setNewOption("");
    setOptionsList([]);
    form.reset();
  }

  function openCreate() {
    setEditing(null);
    form.reset();
    setNewOption("");
    setOptionsList([]);
    open();
  }

  function openEdit(field: CustomField) {
    setEditing(field);
    form.setValues({
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.options ?? "",
      isActive: field.isActive,
      showInPdf: field.showInPdf,
      showInFilter: field.showInFilter,
      showInExport: field.showInExport,
      showInList: field.showInList,
      isDefault: field.isDefault,
    });
    setOptionsList(field.options?.split(",").map((option) => option.trim()).filter(Boolean) ?? []);
    setNewOption("");
    open();
  }

  function addOption() {
    const value = newOption.trim();
    if (!value || optionsList.some((option) => option.toLowerCase() === value.toLowerCase())) return;
    const updated = [...optionsList, value];
    setOptionsList(updated);
    form.setFieldValue("options", updated.join(", "));
    form.clearFieldError("options");
    setNewOption("");
  }

  function removeOption(option: string) {
    const updated = optionsList.filter((item) => item !== option);
    setOptionsList(updated);
    form.setFieldValue("options", updated.join(", "));
  }

  function toggle(field: CustomField, key: VisibilityKey | "required" | "isActive", value: boolean) {
    toggleMutation.mutate({ id: field.id, patch: { [key]: value } });
  }

  function dropField(targetId: number) {
    if (draggedId === null || draggedId === targetId) return setDraggedId(null);
    const orderedIds = fields.map((field) => field.id);
    const from = orderedIds.indexOf(draggedId);
    const to = orderedIds.indexOf(targetId);
    if (from < 0 || to < 0) return setDraggedId(null);
    const [moved] = orderedIds.splice(from, 1);
    orderedIds.splice(to, 0, moved);
    reorderMutation.mutate(orderedIds);
    setDraggedId(null);
  }

  return (
    <Stack gap="xl" className={styles.page}>
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Box>
          <Group gap={8} mb={6}>
            <ThemeIcon variant="light" radius="md" size={34}><IconBraces size={19} /></ThemeIcon>
            <Text size="xs" fw={700} c="brand.7" tt="uppercase" className={styles.eyebrow}>Data configuration</Text>
          </Group>
          <Title order={1} className={styles.title}>Custom Fields</Title>
          <Text c="dimmed" mt={6}>Shape the information your team captures on every quotation.</Text>
        </Box>
        <Button leftSection={<IconPlus size={18} />} size="md" radius="md" onClick={openCreate}>Create field</Button>
      </Group>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Metric label="Total fields" value={stats.total} color="blue" icon={IconBraces} />
        <Metric label="Active" value={stats.active} color="teal" icon={IconCheck} />
        <Metric label="Required" value={stats.required} color="violet" icon={IconAdjustmentsHorizontal} />
        <Metric label="Shown in PDF" value={stats.visible} color="orange" icon={IconFileDescription} />
      </SimpleGrid>

      <Paper withBorder radius="lg" className={styles.contentCard}>
        <Group justify="space-between" p="lg" gap="md" wrap="wrap">
          <Box>
            <Text fw={650} size="lg">Field library</Text>
            <Text size="sm" c="dimmed">Manage field behavior and where each value appears.</Text>
          </Box>
          <Group gap="sm" className={styles.filters}>
            <TextInput
              leftSection={<IconSearch size={16} />}
              placeholder="Search fields..."
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              className={styles.search}
            />
            <Select
              leftSection={<IconAdjustmentsHorizontal size={16} />}
              data={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
              value={statusFilter}
              onChange={setStatusFilter}
              allowDeselect={false}
              w={160}
            />
          </Group>
        </Group>
        <Divider />

        <Box className={styles.tableWrap}>
          <DataTable columns={tableColumns} loading={query.isPending} minWidth={1100} verticalSpacing="md">
              {filteredFields.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Center className={styles.emptyState}>
                      <Stack align="center" gap={8}>
                        <ThemeIcon size={48} radius="xl" variant="light" color="gray"><IconSearch size={23} /></ThemeIcon>
                        <Text fw={600}>{fields.length ? "No matching fields" : "No custom fields yet"}</Text>
                        <Text size="sm" c="dimmed">{fields.length ? "Try another search or status filter." : "Create your first field to start collecting more details."}</Text>
                        {!fields.length && <Button variant="light" mt="xs" onClick={openCreate}>Create first field</Button>}
                      </Stack>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : filteredFields.map((field) => {
                const meta = TYPE_META[field.type];
                const TypeIcon = meta.icon;
                return (
                  <Table.Tr
                    key={field.id}
                    draggable={!search && statusFilter === "all"}
                    onDragStart={() => setDraggedId(field.id)}
                    onDragEnd={() => { setDraggedId(null); stopAutoScroll(); }}
                    onDragOver={handleDragOver}
                    onDrop={() => { stopAutoScroll(); dropField(field.id); }}
                    className={`${!field.isActive ? styles.inactiveRow : ""} ${draggedId === field.id ? styles.draggingRow : ""}`}
                  >
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <IconGripVertical size={17} className={styles.dragHandle} />
                        <ThemeIcon variant="light" color={field.isDefault ? "gray" : meta.color} size={38} radius="md"><TypeIcon size={19} /></ThemeIcon>
                        <Box>
                          <Group gap={7} wrap="nowrap">
                            <Text fw={600}>{field.label}</Text>
                            {field.category === "CORE" && <Badge size="xs" variant="light" color="violet">Core</Badge>}
                            {field.category === "SYSTEM" && <Badge size="xs" variant="light" color="gray">System</Badge>}
                          </Group>
                          <Text size="xs" c="dimmed">{field.name}</Text>
                        </Box>
                      </Group>
                    </Table.Td>
                    <Table.Td><Badge variant="light" color={field.isDefault ? "gray" : meta.color}>{field.isDefault ? "System text" : meta.label}</Badge></Table.Td>
                    <Table.Td>
                      <Switch size="sm" checked={!field.isDefault && field.required} disabled={field.isDefault} onChange={(event) => toggle(field, "required", event.currentTarget.checked)} aria-label={`Make ${field.label} required`} />
                    </Table.Td>
                    <Table.Td><Switch size="sm" checked={field.showInPdf} disabled={field.isDefault} onChange={(event) => toggle(field, "showInPdf", event.currentTarget.checked)} aria-label={`Show ${field.label} in PDF`} /></Table.Td>
                    <Table.Td><Switch size="sm" checked={field.showInList} onChange={(event) => toggle(field, "showInList", event.currentTarget.checked)} aria-label={`Show ${field.label} in list`} /></Table.Td>
                    <Table.Td><Switch size="sm" checked={field.showInFilter} disabled={field.category === "CORE" && !FILTERABLE_CORE_FIELDS.has(field.name)} onChange={(event) => toggle(field, "showInFilter", event.currentTarget.checked)} aria-label={`Show ${field.label} in filters`} /></Table.Td>
                    <Table.Td><Switch size="sm" checked={field.showInExport} onChange={(event) => toggle(field, "showInExport", event.currentTarget.checked)} aria-label={`Include ${field.label} in export`} /></Table.Td>
                    <Table.Td><Badge variant="dot" color={field.isActive ? "teal" : "gray"}>{field.isActive ? "Active" : "Inactive"}</Badge></Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap={6} wrap="nowrap">
                        {field.category !== "CORE" && <Tooltip label="Edit field"><ActionIcon variant="subtle" color="gray" onClick={() => openEdit(field)} aria-label={`Edit ${field.label}`}><IconPencil size={17} /></ActionIcon></Tooltip>}
                        {!field.isDefault && <Tooltip label="Delete field"><ActionIcon variant="subtle" color="red" loading={deleteMutation.isPending} onClick={() => window.confirm(`Delete “${field.label}”? This cannot be undone.`) && deleteMutation.mutate(field.id)} aria-label={`Delete ${field.label}`}><IconTrash size={17} /></ActionIcon></Tooltip>}
                        <IconChevronRight size={16} color="#94a3b8" />
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
          </DataTable>
        </Box>
        {!query.isPending && filteredFields.length > 0 && <Text size="xs" c="dimmed" px="lg" py="md">Showing {filteredFields.length} of {fields.length} fields</Text>}
      </Paper>

      <Modal
        opened={opened}
        onClose={handleClose}
        title={null}
        withCloseButton={false}
        size="lg"
        radius="lg"
        padding={0}
        centered
        classNames={{ content: styles.modalContent, body: styles.modalBody }}
      >
        <Box className={styles.modalHeader}>
          <Group justify="space-between" gap="md" wrap="nowrap" align="flex-start">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size={42} radius="md" variant="light"><IconBraces size={22} /></ThemeIcon>
              <Box>
                <Title order={3}>{editing ? (form.values.isDefault ? "Edit system field" : "Edit custom field") : "Create custom field"}</Title>
                <Text size="sm" c="dimmed">{editing ? "Update how this field behaves across quotations." : "Add a new piece of information to your quotation workflow."}</Text>
              </Box>
            </Group>
            <ActionIcon variant="subtle" color="gray" radius="xl" size="lg" onClick={handleClose} aria-label="Close field editor">
              <IconX size={20} />
            </ActionIcon>
          </Group>
        </Box>
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack gap="lg" p="xl" className={styles.modalForm}>
            <Box>
              <Text fw={650} mb={4}>Field details</Text>
              <Text size="sm" c="dimmed" mb="md">Give the field a clear label and select the best input type.</Text>
              <SimpleGrid cols={{ base: 1, sm: form.values.isDefault ? 1 : 2 }}>
                <TextInput label="Field label" placeholder="e.g. Vessel name" required {...form.getInputProps("label")} />
                {!form.values.isDefault && <Select label="Input type" data={TYPE_OPTIONS} allowDeselect={false} required {...form.getInputProps("type")} />}
              </SimpleGrid>
              {!form.values.isDefault && <Text size="xs" c="dimmed" mt={8}>{TYPE_META[form.values.type].description}</Text>}
            </Box>

            {!form.values.isDefault && form.values.type === "SELECT" && (
              <Paper withBorder radius="md" p="md" className={styles.optionBuilder}>
                <Text fw={600}>Dropdown options</Text>
                <Text size="xs" c="dimmed" mb="sm">Add options in the order users should see them.</Text>
                <Group gap="xs" align="flex-start">
                  <TextInput value={newOption} onChange={(event) => setNewOption(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addOption(); } }} placeholder="Type an option" style={{ flex: 1 }} error={form.errors.options} />
                  <Button variant="light" onClick={addOption}>Add</Button>
                </Group>
                <Group gap={8} mt="md">
                  {optionsList.map((option) => <Badge key={option} size="lg" variant="white" className={styles.optionBadge} rightSection={<button type="button" className={styles.removeOption} onClick={() => removeOption(option)} aria-label={`Remove ${option}`}>×</button>}>{option}</Badge>)}
                  {!optionsList.length && <Text size="xs" c="dimmed">No options added yet.</Text>}
                </Group>
              </Paper>
            )}

            <Divider />
            <Box>
              <Text fw={650} mb={4}>Behavior & visibility</Text>
              <Text size="sm" c="dimmed" mb="md">Choose where this value is available throughout the app.</Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                {!form.values.isDefault && <SettingSwitch title="Required field" description="Users must provide a value" checked={form.values.required} onChange={(value) => form.setFieldValue("required", value)} />}
                {!form.values.isDefault && <SettingSwitch title="Active" description="Available on new quotations" checked={form.values.isActive} onChange={(value) => form.setFieldValue("isActive", value)} />}
                {!form.values.isDefault && <SettingSwitch title="Show in PDF" description="Print on quotation documents" checked={form.values.showInPdf} onChange={(value) => form.setFieldValue("showInPdf", value)} />}
                <SettingSwitch title="Show in list" description="Display as a quotation column" checked={form.values.showInList} onChange={(value) => form.setFieldValue("showInList", value)} />
                <SettingSwitch title="Show in filters" description="Use to narrow quotation results" checked={form.values.showInFilter} onChange={(value) => form.setFieldValue("showInFilter", value)} />
                <SettingSwitch title="Include in export" description="Add to exported spreadsheets" checked={form.values.showInExport} onChange={(value) => form.setFieldValue("showInExport", value)} />
              </SimpleGrid>
            </Box>
          </Stack>
          <Group justify="flex-end" className={styles.modalFooter}>
            <Button variant="default" onClick={handleClose}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editing ? "Save changes" : "Create field"}</Button>
          </Group>
        </form>
      </Modal>
    </Stack>
  );
}

function Metric({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: typeof IconBraces }) {
  return <Paper withBorder radius="lg" p="lg" className={styles.metric}><Group justify="space-between" wrap="nowrap"><Box><Text size="xs" c="dimmed" fw={600} tt="uppercase" className={styles.metricLabel}>{label}</Text><Text fz={28} fw={700} lh={1.2} mt={5}>{value}</Text></Box><ThemeIcon color={color} variant="light" size={44} radius="md"><Icon size={22} /></ThemeIcon></Group></Paper>;
}

function SettingSwitch({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <Paper withBorder radius="md" p="md" className={styles.setting}><Group justify="space-between" wrap="nowrap"><Box><Text size="sm" fw={600}>{title}</Text><Text size="xs" c="dimmed">{description}</Text></Box><Switch checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} /></Group></Paper>;
}
