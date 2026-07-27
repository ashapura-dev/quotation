import { ActionIcon, Button, Group, Modal, Stack, Table, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconPencil } from "@tabler/icons-react";
import { useState } from "react";
import { createClient, fetchClients, updateClient, type Client, type ClientInput } from "../../api/clients";

const emptyValues: ClientInput = { name: "", address: "", gstin: "", contactPerson: "", phone: "", email: "" };

export function Clients() {
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const query = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["clients"] });

  const form = useForm<ClientInput>({ initialValues: emptyValues });

  const saveMutation = useMutation({
    mutationFn: (values: ClientInput) => (editing ? updateClient(editing.id, values) : createClient(values)),
    onSuccess: () => {
      notifications.show({ color: "green", message: editing ? "Client updated" : "Client added" });
      invalidate();
      close();
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Save failed", message: err.message }),
  });

  function openCreate() {
    setEditing(null);
    form.setValues(emptyValues);
    open();
  }

  function openEdit(client: Client) {
    setEditing(client);
    form.setValues({
      name: client.name,
      address: client.address ?? "",
      gstin: client.gstin ?? "",
      contactPerson: client.contactPerson ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
    });
    open();
  }

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Title order={2}>Clients</Title>
        <Button onClick={openCreate}>Add client</Button>
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Contact person</Table.Th>
            <Table.Th>Phone</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>GSTIN</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {query.data?.map((client) => (
            <Table.Tr key={client.id}>
              <Table.Td>{client.name}</Table.Td>
              <Table.Td>{client.contactPerson}</Table.Td>
              <Table.Td>{client.phone}</Table.Td>
              <Table.Td>{client.email}</Table.Td>
              <Table.Td>{client.gstin}</Table.Td>
              <Table.Td>
                <ActionIcon variant="subtle" onClick={() => openEdit(client)}>
                  <IconPencil size={16} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title={editing ? "Edit client" : "Add client"}>
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack>
            <TextInput label="Name" required {...form.getInputProps("name")} />
            <TextInput label="Address" {...form.getInputProps("address")} />
            <TextInput label="Contact person" {...form.getInputProps("contactPerson")} />
            <TextInput label="Phone" {...form.getInputProps("phone")} />
            <TextInput label="Email" {...form.getInputProps("email")} />
            <TextInput label="GSTIN" {...form.getInputProps("gstin")} />
            <Button type="submit" loading={saveMutation.isPending} mt="sm">
              Save
            </Button>
          </Stack>
        </form>
      </Modal>
    </div>
  );
}
