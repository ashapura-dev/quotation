import {
  Badge,
  Button,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Table,
  TextInput,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { createUser, fetchUsers, setUserActive, updateUser, type User } from "../../api/users";
import type { Role } from "../../api/auth";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { DataTable } from "../../components/DataTable";
import { PageHeader } from "../../components/PageHeader";
import { IconPlus, IconUsers } from "@tabler/icons-react";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "TL", label: "TL" },
];

const createSchema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["SUPER_ADMIN", "EMPLOYEE", "TL"]),
});

export function Users() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      notifications.show({ color: "green", message: "User created" });
      invalidate();
      close();
      form.reset();
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not create user", message: err.message }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) => updateUser(id, { role }),
    onSuccess: invalidate,
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not update role", message: err.message }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => setUserActive(id, isActive),
    onSuccess: invalidate,
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not update status", message: err.message }),
  });

  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const passwordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => updateUser(id, { password }),
    onSuccess: () => {
      notifications.show({ color: "green", message: "Password updated successfully" });
      setSelectedUserForPassword(null);
      setNewPassword("");
      invalidate();
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not change password", message: err.message }),
  });

  const form = useForm({
    initialValues: { name: "", email: "", password: "", role: "EMPLOYEE" as Role },
    validate: zodResolver(createSchema),
  });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage team access, roles and account status."
        eyebrow="Administration"
        icon={IconUsers}
        actions={<Button leftSection={<IconPlus size={17} />} onClick={open}>New user</Button>}
      />

      <DataTable columns={["Name", "Email", "Role", "Status", "Actions"].map((header) => ({ key: header, header }))} loading={usersQuery.isPending} minWidth={760}>
            {usersQuery.data?.map((u: User) => (
              <Table.Tr key={u.id}>
                <Table.Td>{u.name}</Table.Td>
                <Table.Td>{u.email}</Table.Td>
                <Table.Td>
                  <Select
                    data={ROLE_OPTIONS}
                    value={u.role}
                    disabled={u.id === currentUser?.id}
                    onChange={(value) => value && roleMutation.mutate({ id: u.id, role: value as Role })}
                    w={140}
                  />
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Badge color={u.isActive ? "green" : "gray"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                    <Switch
                      checked={u.isActive}
                      disabled={u.id === currentUser?.id}
                      onChange={(e) => statusMutation.mutate({ id: u.id, isActive: e.currentTarget.checked })}
                    />
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Button size="xs" variant="light" onClick={() => setSelectedUserForPassword(u)}>
                    Change Password
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
      </DataTable>

      <Modal opened={opened} onClose={close} title="New user">
        <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
          <Stack>
            <TextInput label="Name" {...form.getInputProps("name")} />
            <TextInput label="Email" {...form.getInputProps("email")} />
            <PasswordInput label="Temporary password" {...form.getInputProps("password")} />
            <Select label="Role" data={ROLE_OPTIONS} {...form.getInputProps("role")} />
            <Button type="submit" loading={createMutation.isPending} mt="sm">
              Create user
            </Button>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={selectedUserForPassword !== null}
        onClose={() => {
          setSelectedUserForPassword(null);
          setNewPassword("");
        }}
        title={`Change Password for ${selectedUserForPassword?.name}`}
      >
        <Stack>
          <PasswordInput
            label="New password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
          />
          <Button
            onClick={() => {
              if (newPassword.length < 8) {
                notifications.show({ color: "red", message: "Password must be at least 8 characters" });
                return;
              }
              passwordMutation.mutate({ id: selectedUserForPassword!.id, password: newPassword });
            }}
            loading={passwordMutation.isPending}
            mt="sm"
          >
            Update password
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}
