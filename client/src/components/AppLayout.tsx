import { AppShell, Burger, Group, NavLink, Text, Button, Avatar, Menu, Stack, Modal, PasswordInput, Divider, Box, ThemeIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation } from "@tanstack/react-query";
import {
  IconBoxSeam,
  IconFileText,
  IconKey,
  IconLayoutDashboard,
  IconLogout,
  IconSettings,
  IconShieldLock,
  IconTags,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { NavLink as RouterNavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { RoleGate } from "./RoleGate";
import { NotificationBell } from "./NotificationBell";
import { changeOwnPassword } from "../api/auth";

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure();
  const [pwOpened, { open: openPw, close: closePw }] = useDisclosure(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const pwForm = useForm({
    initialValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    validate: {
      currentPassword: (v) => (v.length < 1 ? "Required" : null),
      newPassword: (v) => (v.length < 8 ? "At least 8 characters" : null),
      confirmPassword: (v, values) => (v !== values.newPassword ? "Passwords do not match" : null),
    },
  });

  const changePwMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changeOwnPassword(currentPassword, newPassword),
    onSuccess: async () => {
      notifications.show({ color: "teal", title: "Password changed", message: "Please log in again with your new password." });
      closePw();
      pwForm.reset();
      await logout();
      navigate("/login");
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not change password", message: err.message }),
  });

  return (
    <>
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
      styles={{
        main: {
          backgroundColor: "#f8fafc",
          minHeight: "100vh",
        }
      }}
    >
      <AppShell.Header style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.05)", background: "rgba(255, 255, 255, 0.8)", backdropFilter: "blur(12px)", zIndex: 100 }}>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap="xs" align="center">
              <img src="/logo.png" alt="Ashapura Logo" style={{ height: "30px", objectFit: "contain" }} />
            </Group>
          </Group>
          <Group gap="sm">
            <NotificationBell />
            <Menu shadow="lg" width={200} radius="md">
              <Menu.Target>
                <Button
                  variant="subtle"
                  radius="md"
                  px="xs"
                  leftSection={
                    <Avatar color="blue" radius="xl" size={26} style={{ fontWeight: 700, fontSize: "11px" }}>
                      {user?.name?.substring(0, 2).toUpperCase() || "US"}
                    </Avatar>
                  }
                >
                  <Text size="sm" fw={600} style={{ color: "#475569" }}>
                    {user?.name}
                  </Text>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item leftSection={<IconKey size={16} />} onClick={openPw}>
                  Change password
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item leftSection={<IconLogout size={16} />} onClick={handleLogout} color="red">
                  Log out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" style={{ borderRight: "1px solid rgba(0, 0, 0, 0.05)", backgroundColor: "#fff" }}>
        <Stack gap="xs" style={{ height: "100%" }}>
          <Text size="xs" fw={700} c="dimmed" px="xs" mt="xs" style={{ letterSpacing: "1px", textTransform: "uppercase" }}>
            Main Menu
          </Text>
          <Stack gap={4}>
            <NavLink
              styles={{
                root: {
                  borderRadius: "8px",
                  transition: "all 0.2s ease",
                  "&:hover": { backgroundColor: "#f1f5f9", transform: "translateX(4px)" }
                },
                label: { fontWeight: 500 }
              }}
              component={RouterNavLink}
              to="/dashboard"
              label="Dashboard"
              leftSection={<IconLayoutDashboard size={18} />}
            />
            <NavLink
              styles={{
                root: {
                  borderRadius: "8px",
                  transition: "all 0.2s ease",
                  "&:hover": { backgroundColor: "#f1f5f9", transform: "translateX(4px)" }
                },
                label: { fontWeight: 500 }
              }}
              component={RouterNavLink}
              to="/quotations"
              label="Quotations"
              leftSection={<IconFileText size={18} />}
            />
          </Stack>

          <RoleGate allow={["SUPER_ADMIN"]}>
            <Text size="xs" fw={700} c="dimmed" px="xs" mt="md" style={{ letterSpacing: "1px", textTransform: "uppercase" }}>
              Administration
            </Text>
            <Stack gap={4}>
              <NavLink
                styles={{
                  root: {
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    "&:hover": { backgroundColor: "#f1f5f9", transform: "translateX(4px)" }
                  },
                  label: { fontWeight: 500 }
                }}
                component={RouterNavLink}
                to="/admin/users"
                label="Users"
                leftSection={<IconUsers size={18} />}
              />
              <NavLink
                styles={{
                  root: {
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    "&:hover": { backgroundColor: "#f1f5f9", transform: "translateX(4px)" }
                  },
                  label: { fontWeight: 500 }
                }}
                component={RouterNavLink}
                to="/admin/clients"
                label="Clients"
                leftSection={<IconUsersGroup size={18} />}
              />
              <NavLink
                styles={{
                  root: {
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    "&:hover": { backgroundColor: "#f1f5f9", transform: "translateX(4px)" }
                  },
                  label: { fontWeight: 500 }
                }}
                component={RouterNavLink}
                to="/admin/container-sizes"
                label="Container Sizes"
                leftSection={<IconBoxSeam size={18} />}
              />
              <NavLink
                styles={{
                  root: {
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    "&:hover": { backgroundColor: "#f1f5f9", transform: "translateX(4px)" }
                  },
                  label: { fontWeight: 500 }
                }}
                component={RouterNavLink}
                to="/admin/rate-templates"
                label="Rate Templates"
                leftSection={<IconTags size={18} />}
              />
              <NavLink
                styles={{
                  root: {
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    "&:hover": { backgroundColor: "#f1f5f9", transform: "translateX(4px)" }
                  },
                  label: { fontWeight: 500 }
                }}
                component={RouterNavLink}
                to="/admin/pdf-templates"
                label="PDF Templates"
                leftSection={<IconFileText size={18} />}
              />
              <NavLink
                styles={{
                  root: {
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    "&:hover": { backgroundColor: "#f1f5f9", transform: "translateX(4px)" }
                  },
                  label: { fontWeight: 500 }
                }}
                component={RouterNavLink}
                to="/admin/custom-fields"
                label="Custom Fields"
                leftSection={<IconSettings size={18} />}
              />
              <NavLink
                styles={{
                  root: {
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    "&:hover": { backgroundColor: "#f1f5f9", transform: "translateX(4px)" }
                  },
                  label: { fontWeight: 500 }
                }}
                component={RouterNavLink}
                to="/admin/settings"
                label="Admin Settings"
                leftSection={<IconSettings size={18} />}
              />
            </Stack>
          </RoleGate>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>

    <Modal
      opened={pwOpened}
      onClose={() => { closePw(); pwForm.reset(); }}
      title={null}
      withCloseButton={false}
      size="sm"
      radius="lg"
      padding={0}
      centered
    >
      <Box
        style={{
          padding: "24px 28px 20px",
          borderBottom: "1px solid #edf0f4",
          background: "linear-gradient(145deg,#f8fbff,#fff)",
          borderRadius: "var(--mantine-radius-lg) var(--mantine-radius-lg) 0 0",
        }}
      >
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={42} radius="md" variant="light" color="blue">
            <IconShieldLock size={22} />
          </ThemeIcon>
          <Box>
            <Text fw={700} size="lg" lh={1.2}>Change password</Text>
            <Text size="sm" c="dimmed" mt={2}>Enter your current password to confirm.</Text>
          </Box>
        </Group>
      </Box>
      <form onSubmit={pwForm.onSubmit((v) => changePwMutation.mutate({ currentPassword: v.currentPassword, newPassword: v.newPassword }))}>
        <Stack gap="md" p="xl">
          <PasswordInput
            label="Current password"
            placeholder="Your existing password"
            {...pwForm.getInputProps("currentPassword")}
          />
          <Divider label="New password" labelPosition="left" />
          <PasswordInput
            label="New password"
            placeholder="At least 8 characters"
            {...pwForm.getInputProps("newPassword")}
          />
          <PasswordInput
            label="Confirm new password"
            placeholder="Repeat new password"
            {...pwForm.getInputProps("confirmPassword")}
          />
        </Stack>
        <Group justify="flex-end" style={{ padding: "14px 28px", borderTop: "1px solid #e9edf2", background: "#f8fafc", borderRadius: "0 0 var(--mantine-radius-lg) var(--mantine-radius-lg)" }}>
          <Button variant="default" onClick={() => { closePw(); pwForm.reset(); }}>Cancel</Button>
          <Button type="submit" loading={changePwMutation.isPending}>Update password</Button>
        </Group>
      </form>
    </Modal>
    </>
  );
}
