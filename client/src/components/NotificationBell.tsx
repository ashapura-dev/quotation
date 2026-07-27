import { ActionIcon, Indicator, Popover, ScrollArea, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications";

export function NotificationBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 30_000,
  });

  const unreadCount = query.data?.filter((n) => !n.isRead).length ?? 0;

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <Popover width={340} position="bottom-end" shadow="md">
      <Popover.Target>
        <Indicator disabled={unreadCount === 0} label={unreadCount} size={16} color="red">
          <ActionIcon variant="subtle" size="lg" aria-label="Notifications">
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Stack gap={0}>
          <Stack gap={0} p="sm" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
            <UnstyledButton
              onClick={() => readAllMutation.mutate()}
              disabled={unreadCount === 0}
              style={{ alignSelf: "flex-end" }}
            >
              <Text size="xs" c="blue">
                Mark all read
              </Text>
            </UnstyledButton>
          </Stack>
          <ScrollArea.Autosize mah={360}>
            {query.data?.length === 0 && (
              <Text size="sm" c="dimmed" p="md">
                No notifications yet.
              </Text>
            )}
            {query.data?.map((n) => (
              <UnstyledButton
                key={n.id}
                p="sm"
                w="100%"
                bg={n.isRead ? undefined : "var(--mantine-color-blue-0)"}
                onClick={() => {
                  if (!n.isRead) readMutation.mutate(n.id);
                  if (n.relatedQuotationId) navigate(`/quotations/${n.relatedQuotationId}`);
                }}
                style={{ borderBottom: "1px solid var(--mantine-color-gray-1)", display: "block" }}
              >
                <Text size="sm">{n.message}</Text>
                <Text size="xs" c="dimmed" mt={2}>
                  {new Date(n.createdAt).toLocaleString()}
                </Text>
              </UnstyledButton>
            ))}
          </ScrollArea.Autosize>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
