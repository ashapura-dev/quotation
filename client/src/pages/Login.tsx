import { Box, Button, Group, PasswordInput, Stack, Text, TextInput, ThemeIcon, Title } from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconArrowRight, IconCheck, IconLock, IconMail, IconShieldCheck } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../hooks/useAuth";
import styles from "./Login.module.css";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const BENEFITS = [
  "Create accurate quotations in minutes",
  "Manage approvals from one workspace",
  "Keep clients, rates and documents organized",
];

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
      await login(values.email.trim(), values.password);
      navigate("/dashboard");
    } catch (err) {
      notifications.show({ color: "red", title: "Login failed", message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel}>
        <div className={styles.grid} />
        <div className={`${styles.orb} ${styles.orbOne}`} />
        <div className={`${styles.orb} ${styles.orbTwo}`} />

        <div className={styles.brandContent}>
          <div className={styles.logoWrap}>
            <img src="/logo.png" alt="Ashapura" className={styles.logo} />
          </div>

          <Box className={styles.message}>
            <Text className={styles.eyebrow}>Quotation workspace</Text>
            <Title order={1} className={styles.heroTitle}>
              From rates to approval,<br />all in one place.
            </Title>
            <Text className={styles.heroCopy}>
              A focused workspace for building, reviewing and delivering professional logistics quotations.
            </Text>

            <Stack gap="md" mt={34}>
              {BENEFITS.map((benefit) => (
                <Group key={benefit} gap="sm" wrap="nowrap">
                  <ThemeIcon size={25} radius="xl" className={styles.checkIcon}><IconCheck size={14} stroke={2.5} /></ThemeIcon>
                  <Text className={styles.benefit}>{benefit}</Text>
                </Group>
              ))}
            </Stack>
          </Box>

          <Text className={styles.copyright}>© {new Date().getFullYear()} Ashapura. Internal business system.</Text>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formWrap}>
          <div className={styles.mobileLogo}>
            <img src="/logo.png" alt="Ashapura" />
          </div>

          <ThemeIcon variant="light" size={46} radius="md" mb="lg"><IconShieldCheck size={24} /></ThemeIcon>
          <Title order={2} className={styles.formTitle}>Welcome back</Title>
          <Text c="dimmed" mt={6} mb={30}>Sign in with your company account to continue.</Text>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="lg">
              <TextInput
                label="Email address"
                placeholder="name@company.com"
                leftSection={<IconMail size={18} />}
                size="md"
                autoComplete="email"
                autoFocus
                {...form.getInputProps("email")}
              />
              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                leftSection={<IconLock size={18} />}
                size="md"
                autoComplete="current-password"
                {...form.getInputProps("password")}
              />
              <Button
                type="submit"
                loading={submitting}
                fullWidth
                size="md"
                mt={4}
                rightSection={!submitting && <IconArrowRight size={18} />}
                className={styles.submit}
              >
                Sign in to workspace
              </Button>
            </Stack>
          </form>

          <Group justify="center" gap={7} mt={30} className={styles.secureNote}>
            <IconLock size={13} />
            <Text size="xs" c="dimmed">Secure access · Authorized users only</Text>
          </Group>
        </div>
      </section>
    </main>
  );
}
