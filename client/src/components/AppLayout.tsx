import { AppShell, Burger, Group, NavLink, Text, Button, Avatar, Menu } from "@mantine/core";
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
    <AppShell header={{ height: 60 }} navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: !opened } }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg">
              Ashapura Quotations
            </Text>
          </Group>
          <Group>
            <NotificationBell />
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button variant="subtle" leftSection={<Avatar size={24} radius="xl" />}>
                  {user?.name}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconLogout size={16} />} onClick={handleLogout}>
                  Log out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink component={RouterNavLink} to="/dashboard" label="Dashboard" leftSection={<IconLayoutDashboard size={18} />} />
        <NavLink component={RouterNavLink} to="/quotations" label="Quotations" leftSection={<IconFileText size={18} />} />
        <RoleGate allow={["ADMIN"]}>
          <NavLink component={RouterNavLink} to="/admin/users" label="Users" leftSection={<IconUsers size={18} />} />
          <NavLink component={RouterNavLink} to="/admin/clients" label="Clients" leftSection={<IconUsersGroup size={18} />} />
          <NavLink component={RouterNavLink} to="/admin/container-sizes" label="Container Sizes" leftSection={<IconBoxSeam size={18} />} />
          <NavLink component={RouterNavLink} to="/admin/rate-templates" label="Rate Templates" leftSection={<IconTags size={18} />} />
          <NavLink component={RouterNavLink} to="/admin/pdf-templates" label="PDF Templates" leftSection={<IconFileText size={18} />} />
          <NavLink component={RouterNavLink} to="/admin/settings" label="Admin Settings" leftSection={<IconSettings size={18} />} />
        </RoleGate>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
