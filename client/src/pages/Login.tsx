import { Button, Card, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
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
    <div style={{ position: "relative", width: "100%", height: "100vh", backgroundColor: "#0f172a", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center" }}>
      {/* Decorative Glow Circles */}
      <div className="glow-circle" style={{ width: "300px", height: "300px", background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", top: "10%", left: "15%" }} />
      <div className="glow-circle" style={{ width: "400px", height: "400px", background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", bottom: "10%", right: "15%" }} />

      <Card
        className="glass-panel"
        w={420}
        p="xl"
        radius="lg"
        shadow="xl"
        style={{
          zIndex: 1,
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          border: "1px solid rgba(255, 255, 255, 0.1) !important",
          background: "rgba(15, 23, 42, 0.65) !important",
          backdropFilter: "blur(20px)",
        }}
      >
        <Stack gap="lg">
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <img src="/logo.png" alt="Ashapura Logo" style={{ height: "50px", objectFit: "contain", marginBottom: "12px" }} />
            <Title
              order={1}
              style={{
                fontFamily: "Outfit, sans-serif",
                fontWeight: 900,
                fontSize: "28px",
                letterSpacing: "-1px",
                background: "linear-gradient(135deg, #60a5fa 0%, #a5b4fc 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Ashapura Quotations
            </Title>
            <Text c="gray.4" size="xs" mt="xs" style={{ letterSpacing: "0.2px" }}>
              Sign in to manage DPD &amp; Non-DPD quotations
            </Text>
          </div>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label={<Text size="xs" fw={600} c="gray.3">Email Address</Text>}
                placeholder="you@ashapura.com"
                radius="md"
                styles={{
                  input: {
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    "&:focus": {
                      borderColor: "#3b82f6",
                    }
                  }
                }}
                {...form.getInputProps("email")}
              />
              <PasswordInput
                label={<Text size="xs" fw={600} c="gray.3">Password</Text>}
                placeholder="Your password"
                radius="md"
                styles={{
                  input: {
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    "&:focus": {
                      borderColor: "#3b82f6",
                    }
                  },
                  innerInput: {
                    color: "#fff",
                  }
                }}
                {...form.getInputProps("password")}
              />
              <Button
                type="submit"
                loading={submitting}
                fullWidth
                mt="md"
                radius="md"
                size="md"
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                Sign in
              </Button>
            </Stack>
          </form>
        </Stack>
      </Card>
    </div>
  );
}
