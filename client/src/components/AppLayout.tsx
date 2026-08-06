import { AppShell, Burger, Group, NavLink, Text, Button, Avatar, Menu, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBoxSeam,
  IconFileText,
  IconLayoutDashboard,
  IconLogout,
  IconSettings,
  IconTags,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { NavLink as RouterNavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { RoleGate } from "./RoleGate";
import { NotificationBell } from "./NotificationBell";

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
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
  );
}
