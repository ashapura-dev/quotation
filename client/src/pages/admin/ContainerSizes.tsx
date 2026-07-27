import { ActionIcon, Button, Group, Modal, Stack, Table, TextInput, Title, Tooltip } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import {
  createContainerSize,
  deactivateContainerSize,
  fetchContainerSizes,
  updateContainerSize,
  type ContainerSize,
} from "../../api/containerSizes";

export function ContainerSizes() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<ContainerSize | null>(null);

  const query = useQuery({ queryKey: ["container-sizes", true], queryFn: () => fetchContainerSizes(true) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["container-sizes"] });

  const form = useForm({ initialValues: { code: "", label: "" } });

  const saveMutation = useMutation({
    mutationFn: (values: { code: string; label: string }) =>
      editing ? updateContainerSize(editing.id, values) : createContainerSize(values),
    onSuccess: () => {
      notifications.show({ color: "green", message: editing ? "Container size updated" : "Container size added" });
      invalidate();
      close();
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Save failed", message: err.message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateContainerSize,
    onSuccess: () => {
      notifications.show({ color: "green", message: "Container size deactivated" });
      invalidate();
    },
  });

  function openCreate() {
    setEditing(null);
    form.setValues({ code: "", label: "" });
    open();
  }

  function openEdit(size: ContainerSize) {
    setEditing(size);
    form.setValues({ code: size.code, label: size.label });
    open();
  }

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Title order={2}>Container Sizes</Title>
        <Button onClick={openCreate}>Add container size</Button>
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Code</Table.Th>
            <Table.Th>Label</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {query.data?.map((size) => (
            <Table.Tr key={size.id} opacity={size.isActive ? 1 : 0.5}>
              <Table.Td>{size.code}</Table.Td>
              <Table.Td>{size.label}</Table.Td>
              <Table.Td>{size.isActive ? "Active" : "Inactive"}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => openEdit(size)}>
                    <IconPencil size={16} />
                  </ActionIcon>
                  {size.isActive && (
                    <Tooltip label="Deactivate">
                      <ActionIcon variant="subtle" color="red" onClick={() => deactivateMutation.mutate(size.id)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title={editing ? "Edit container size" : "Add container size"}>
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack>
            <TextInput label="Code" placeholder="e.g. 40HC" {...form.getInputProps("code")} />
            <TextInput label="Label" placeholder="e.g. 40ft High Cube" {...form.getInputProps("label")} />
            <Button type="submit" loading={saveMutation.isPending} mt="sm">
              Save
            </Button>
          </Stack>
        </form>
      </Modal>
    </div>
  );
}
