import { ActionIcon, Badge, Button, Card, Group, Modal, Select, Stack, Switch, Table, Text, TextInput, Title, Tooltip } from "@mantine/core";
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

  function openCreate() {
    setEditing(null);
    form.setValues({
      label: "",
      type: "TEXT",
      required: false,
      options: "",
      isActive: true,
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
            <Table.Th>Label</Table.Th>
            <Table.Th>Name (Key)</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Required</Table.Th>
            <Table.Th>Options</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {query.data?.map((field) => (
            <Table.Tr key={field.id}>
              <Table.Td fw={500}>{field.label}</Table.Td>
              <Table.Td style={{ fontFamily: "monospace", fontSize: "12px" }}>{field.name}</Table.Td>
              <Table.Td>{field.type}</Table.Td>
              <Table.Td>{field.required ? "Yes" : "No"}</Table.Td>
              <Table.Td>{field.type === "SELECT" ? field.options || "-" : "-"}</Table.Td>
              <Table.Td>{field.isActive ? "Active" : "Inactive"}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => openEdit(field)}>
                    <IconPencil size={16} />
                  </ActionIcon>
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
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title={editing ? "Edit Custom Field" : "Add Custom Field"}>
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack>
            <TextInput label="Label" placeholder="e.g. Vessel Name" required {...form.getInputProps("label")} />
            
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

            {form.values.type === "SELECT" && (
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

            <Switch
              label="Required Field"
              checked={form.values.required}
              onChange={(event) => form.setFieldValue("required", event.currentTarget.checked)}
              mt="xs"
            />

            {editing && (
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
