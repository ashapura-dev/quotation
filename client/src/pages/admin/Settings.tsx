import { Badge, Button, Card, Group, NumberInput, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchSmtpSettings, sendTestEmail, updateSmtpSettings, type SmtpSettingsInput } from "../../api/settings";

export function Settings() {
  const query = useQuery({ queryKey: ["smtp-settings"], queryFn: fetchSmtpSettings });
  const [testAddress, setTestAddress] = useState("");

  const form = useForm<SmtpSettingsInput>({
    initialValues: { host: "", port: 587, username: "", password: "", fromAddress: "", fromName: "Ashapura Quotations" },
  });

  useEffect(() => {
    if (!query.data) return;
    form.setValues({
      host: query.data.host ?? "",
      port: query.data.port ?? 587,
      username: query.data.username ?? "",
      password: "",
      fromAddress: query.data.fromAddress ?? "",
      fromName: query.data.fromName ?? "Ashapura Quotations",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: updateSmtpSettings,
    onSuccess: () => notifications.show({ color: "green", message: "SMTP settings saved" }),
    onError: (err: Error) => notifications.show({ color: "red", title: "Save failed", message: err.message }),
  });

  const testMutation = useMutation({
    mutationFn: () => sendTestEmail(testAddress),
    onSuccess: () => notifications.show({ color: "green", message: `Test email sent to ${testAddress}` }),
    onError: (err: Error) => notifications.show({ color: "red", title: "Test email failed", message: err.message }),
  });

  return (
    <div>
      <Title order={2} mb="md">
        Admin Settings
      </Title>

      <Card maw={520}>
        <Group justify="space-between" mb="sm">
          <Text fw={600}>SMTP (email) configuration</Text>
          {query.data?.isConfigured && <Badge color="green">Configured</Badge>}
        </Group>
        <form onSubmit={form.onSubmit((values) => saveMutation.mutate(values))}>
          <Stack gap="sm">
            <TextInput label="SMTP host" placeholder="smtp.gmail.com" required {...form.getInputProps("host")} />
            <NumberInput label="Port" required {...form.getInputProps("port")} />
            <TextInput label="Username" required {...form.getInputProps("username")} />
            <PasswordInput
              label="Password"
              placeholder={query.data?.isConfigured ? "Leave blank to keep existing password" : "SMTP password"}
              {...form.getInputProps("password")}
            />
            <TextInput label="From address" required {...form.getInputProps("fromAddress")} />
            <TextInput label="From name" required {...form.getInputProps("fromName")} />
            <Button type="submit" loading={saveMutation.isPending}>
              Save SMTP settings
            </Button>
          </Stack>
        </form>

        <Group mt="lg" align="flex-end">
          <TextInput
            label="Send a test email to"
            placeholder="you@example.com"
            value={testAddress}
            onChange={(e) => setTestAddress(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button variant="light" onClick={() => testMutation.mutate()} loading={testMutation.isPending} disabled={!testAddress}>
            Send test
          </Button>
        </Group>
      </Card>
    </div>
  );
}
