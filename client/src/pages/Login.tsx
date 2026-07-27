import { Button, Card, Center, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: zodResolver(schema),
  });

  async function handleSubmit(values: typeof form.values) {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch (err) {
      notifications.show({ color: "red", title: "Login failed", message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Center h="100vh" bg="var(--mantine-color-gray-0)">
      <Card w={380} p="xl">
        <Stack gap="md">
          <div>
            <Title order={2}>Ashapura Quotations</Title>
            <Text c="dimmed" size="sm">
              Sign in to manage DPD &amp; Non-DPD quotations
            </Text>
          </div>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="sm">
              <TextInput label="Email" placeholder="you@ashapura.com" {...form.getInputProps("email")} />
              <PasswordInput label="Password" placeholder="Your password" {...form.getInputProps("password")} />
              <Button type="submit" loading={submitting} fullWidth mt="sm">
                Sign in
              </Button>
            </Stack>
          </form>
        </Stack>
      </Card>
    </Center>
  );
}
