import { ActionIcon, Badge, Button, Card, Group, Modal, Select, Stack, Switch, Table, Text, TextInput, Title, Tooltip, Loader } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import {
  createCustomField,
  deleteCustomField,
  fetchCustomFields,
  updateCustomField,
  type CustomField,
} from "../../api/customFields";

export function CustomFields() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [newOption, setNewOption] = useState("");
  const [optionsList, setOptionsList] = useState<string[]>([]);

  const query = useQuery({ queryKey: ["custom-fields", true], queryFn: () => fetchCustomFields(true) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["custom-fields"] });

  const form = useForm({
    initialValues: {
      label: "",
      type: "TEXT" as "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT",
      required: false,
      options: "",
      isActive: true,
      showInPdf: true,
      showInFilter: true,
      showInExport: true,
      showInList: true,
      isDefault: false,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: typeof form.values) => {
      const payload = {
        label: values.label,
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
      notifications.show({ color: "green", message: editing ? "Custom field updated" : "Custom field added" });
      invalidate();
      close();
      setNewOption("");
      setOptionsList([]);
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Save failed", message: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomField,
    onSuccess: () => {
      notifications.show({ color: "green", message: "Custom field removed successfully" });
      invalidate();
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Delete failed", message: err.message }),
  });

  // Inline toggle — saves a single boolean flag without opening the modal
  const toggleMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<{ showInFilter: boolean; showInExport: boolean; showInList: boolean; showInPdf: boolean; required: boolean; isActive: boolean }> }) =>
      updateCustomField(id, patch),
    onSuccess: () => invalidate(),
    onError: (err: Error) => notifications.show({ color: "red", title: "Update failed", message: err.message }),
  });

  function openCreate() {
    setEditing(null);
    form.setValues({
      label: "",
      type: "TEXT",
      required: false,
      options: "",
      isActive: true,
      showInPdf: true,
      showInFilter: true,
      showInExport: true,
      showInList: true,
      isDefault: false,
    });
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
    const opts = field.options ? field.options.split(",").map(o => o.trim()).filter(Boolean) : [];
    setOptionsList(opts);
    setNewOption("");
    open();
  }

  function addOption() {
    const val = newOption.trim();
    if (val && !optionsList.includes(val)) {
      const updated = [...optionsList, val];
      setOptionsList(updated);
      form.setFieldValue("options", updated.join(", "));
      setNewOption("");
    }
  }

  function removeOption(opt: string) {
    const updated = optionsList.filter(o => o !== opt);
    setOptionsList(updated);
    form.setFieldValue("options", updated.join(", "));
  }

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Title order={2}>Custom Fields</Title>
        <Button onClick={openCreate}>Add Custom Field</Button>
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Field Name</Table.Th>
            <Table.Th>Field Type</Table.Th>
            <Table.Th>Required</Table.Th>
            <Table.Th>PDF</Table.Th>
            <Table.Th>Show in List</Table.Th>
            <Table.Th>Show in Filter</Table.Th>
            <Table.Th>Show in Export</Table.Th>
            <Table.Th>Active</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {query.isPending ? (
            <Table.Tr>
              <Table.Td colSpan={9} style={{ height: "200px" }}>
                <Group justify="center" align="center" style={{ height: "100%" }}>
                  <Loader size="md" />
                </Group>
              </Table.Td>
            </Table.Tr>
          ) : (
            query.data?.map((field) => (
              <Table.Tr key={field.id}>
                <Table.Td fw={500}>
                  <Group gap="xs">
                    <span>{field.label}</span>
                    {field.isDefault && (
                      <Badge size="xs" color="gray" variant="light">System</Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>{field.isDefault ? "System Text" : field.type}</Table.Td>
                {/* Required — editable for custom fields, disabled for system fields */}
                <Table.Td>
                  <Switch
                    size="xs"
                    checked={field.isDefault ? false : field.required}
                    disabled={field.isDefault}
                    onChange={(e) => toggleMutation.mutate({ id: field.id, patch: { required: e.currentTarget.checked } })}
                  />
                </Table.Td>
                {/* Show in PDF — only editable for non-default fields */}
                <Table.Td>
                  {field.isDefault ? (
                    <Text size="xs" c="dimmed">—</Text>
                  ) : (
                    <Switch
                      size="xs"
                      checked={field.showInPdf}
                      onChange={(e) => toggleMutation.mutate({ id: field.id, patch: { showInPdf: e.currentTarget.checked } })}
                    />
                  )}
                </Table.Td>
                {/* Show in List */}
                <Table.Td>
                  <Switch
                    size="xs"
                    checked={field.showInList}
                    onChange={(e) => toggleMutation.mutate({ id: field.id, patch: { showInList: e.currentTarget.checked } })}
                  />
                </Table.Td>
                {/* Show in Filter */}
                <Table.Td>
                  <Switch
                    size="xs"
                    checked={field.showInFilter}
                    onChange={(e) => toggleMutation.mutate({ id: field.id, patch: { showInFilter: e.currentTarget.checked } })}
                  />
                </Table.Td>
                {/* Show in Export */}
                <Table.Td>
                  <Switch
                    size="xs"
                    checked={field.showInExport}
                    onChange={(e) => toggleMutation.mutate({ id: field.id, patch: { showInExport: e.currentTarget.checked } })}
                  />
                </Table.Td>
                {/* Status (isActive) — editable for custom fields, disabled for system fields */}
                <Table.Td>
                  <Switch
                    size="xs"
                    checked={field.isActive}
                    disabled={field.isDefault}
                    color="green"
                    onChange={(e) => toggleMutation.mutate({ id: field.id, patch: { isActive: e.currentTarget.checked } })}
                  />
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" onClick={() => openEdit(field)}>
                      <IconPencil size={16} />
                    </ActionIcon>
                    {!field.isDefault && (
                      <Tooltip label="Delete">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete the custom field "${field.label}"?`)) {
                              deleteMutation.mutate(field.id);
                            }
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title={form.values.isDefault ? "Edit System Field" : (editing ? "Edit Custom Field" : "Add Custom Field")}>
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack>
            <TextInput label="Label" placeholder="e.g. Vessel Name" required {...form.getInputProps("label")} />
            
            {!form.values.isDefault && (
              <Select
                label="Type"
                required
                data={[
                  { value: "TEXT", label: "Text Input" },
                  { value: "NUMBER", label: "Number Input" },
                  { value: "BOOLEAN", label: "Yes/No Toggle" },
                  { value: "SELECT", label: "Dropdown Selection" },
                ]}
                {...form.getInputProps("type")}
              />
            )}

            {!form.values.isDefault && form.values.type === "SELECT" && (
              <Card withBorder p="sm" mt="xs" radius="md" style={{ background: "#f8fafc" }}>
                <Text size="sm" fw={600} mb="xs">
                  Dropdown Options
                </Text>
                <Group gap="xs" align="flex-end">
                  <TextInput
                    placeholder="Add option (e.g. Option A)"
                    value={newOption}
                    onChange={(e) => setNewOption(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button onClick={addOption}>Add</Button>
                </Group>
                {optionsList.length > 0 ? (
                  <Group gap="xs" mt="md">
                    {optionsList.map((opt) => (
                      <Badge
                        key={opt}
                        variant="light"
                        size="md"
                        rightSection={
                          <span
                            style={{ cursor: "pointer", marginLeft: "4px", fontSize: "14px", fontWeight: "bold" }}
                            onClick={() => removeOption(opt)}
                          >
                            &times;
                          </span>
                        }
                      >
                        {opt}
                      </Badge>
                    ))}
                  </Group>
                ) : (
                  <Text size="xs" c="dimmed" mt="xs">
                    No options added yet. At least one option is required.
                  </Text>
                )}
              </Card>
            )}

            {!form.values.isDefault && (
              <Switch
                label="Required Field"
                checked={form.values.required}
                onChange={(event) => form.setFieldValue("required", event.currentTarget.checked)}
                mt="xs"
              />
            )}

            {!form.values.isDefault && (
              <Switch
                label="Show in PDF Template"
                checked={form.values.showInPdf}
                onChange={(event) => form.setFieldValue("showInPdf", event.currentTarget.checked)}
                mt="xs"
              />
            )}

            <Switch
              label="Show in Filter Panel"
              checked={form.values.showInFilter}
              onChange={(event) => form.setFieldValue("showInFilter", event.currentTarget.checked)}
              mt="xs"
            />

            <Switch
              label="Include in Excel Export"
              checked={form.values.showInExport}
              onChange={(event) => form.setFieldValue("showInExport", event.currentTarget.checked)}
              mt="xs"
            />

            <Switch
              label="Show in Quotations List Column"
              checked={form.values.showInList}
              onChange={(event) => form.setFieldValue("showInList", event.currentTarget.checked)}
              mt="xs"
            />

            {editing && !form.values.isDefault && (
              <Switch
                label="Is Active"
                checked={form.values.isActive}
                onChange={(event) => form.setFieldValue("isActive", event.currentTarget.checked)}
                mt="xs"
              />
            )}

            <Button type="submit" loading={saveMutation.isPending} mt="sm">
              Save
            </Button>
          </Stack>
        </form>
      </Modal>
    </div>
  );
}
