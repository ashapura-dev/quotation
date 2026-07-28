import {
  Badge,
  Button,
  Card,
  ColorInput,
  FileInput,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  createPdfTemplate,
  deactivatePdfTemplate,
  fetchPdfTemplates,
  setDefaultPdfTemplate,
  updatePdfTemplate,
  type PdfTemplate,
  type PdfTemplateInput,
} from "../../api/pdfTemplates";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

const emptyValues: PdfTemplateInput = {
  name: "",
  quotationType: null,
  primaryColor: "#1c7ed6",
  secondaryColor: "#495057",
  fontFamily: "Inter, sans-serif",
  headerHtml: "<h1>Ashapura Impex</h1>",
  footerHtml: "<p>Thank you for your business.</p>",
  termsAndConditions: "Standard terms and conditions apply.",
  logo: null,
};

export function PdfTemplates() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PdfTemplate | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);

  const query = useQuery({ queryKey: ["pdf-templates"], queryFn: () => fetchPdfTemplates(true) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["pdf-templates"] });

  const form = useForm<PdfTemplateInput>({ initialValues: emptyValues });
  const createForm = useForm({ initialValues: { name: "", quotationType: null as "DPD" | "NON_DPD" | null } });

  const saveMutation = useMutation({
    mutationFn: (values: PdfTemplateInput) => (selected ? updatePdfTemplate(selected.id, values) : createPdfTemplate(values)),
    onSuccess: (template) => {
      notifications.show({ color: "green", message: "Template saved" });
      invalidate();
      setSelected(template);
      setIsNew(false);
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Save failed", message: err.message }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => setDefaultPdfTemplate(id),
    onSuccess: invalidate,
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivatePdfTemplate,
    onSuccess: () => {
      notifications.show({ color: "green", message: "Template deleted" });
      invalidate();
      setSelected(null);
      setIsNew(true);
      form.setValues(emptyValues);
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Delete failed", message: err.message }),
  });

  function selectTemplate(template: PdfTemplate) {
    setSelected(template);
    setIsNew(false);
    form.setValues({
      name: template.name,
      quotationType: template.quotationType,
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor,
      fontFamily: template.fontFamily,
      headerHtml: template.headerHtml ?? "",
      footerHtml: template.footerHtml ?? "",
      termsAndConditions: template.termsAndConditions ?? "",
      logo: null,
    });
  }

  const createMutation = useMutation({
    mutationFn: (values: { name: string; quotationType: "DPD" | "NON_DPD" | null }) =>
      createPdfTemplate({
        ...emptyValues,
        name: values.name,
        quotationType: values.quotationType,
      }),
    onSuccess: (template) => {
      notifications.show({ color: "green", message: "PDF template created" });
      invalidate();
      selectTemplate(template);
      close();
      createForm.reset();
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not create template", message: err.message }),
  });

  const values = form.values;

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Title order={2}>PDF Templates</Title>
        <Button onClick={open}>New template</Button>
      </Group>

      <Grid>
        <Grid.Col span={3}>
          <Stack gap="xs">
            {query.data?.map((template) => (
              <Card
                key={template.id}
                withBorder
                style={{
                  cursor: "pointer",
                  borderColor: selected?.id === template.id ? "var(--mantine-primary-color-filled)" : undefined,
                }}
                onClick={() => selectTemplate(template)}
              >
                <Group justify="space-between">
                  <Text fw={600} size="sm">
                    {template.name}
                  </Text>
                  {template.isDefault && <Badge size="xs">Default</Badge>}
                </Group>
                <Text size="xs" c="dimmed">
                  {template.quotationType ?? "Any type"}
                </Text>
              </Card>
            ))}
          </Stack>
        </Grid.Col>

        <Grid.Col span={5}>
          <Card>
            <form onSubmit={form.onSubmit((v) => saveMutation.mutate(v))}>
              <Stack>
                <TextInput label="Name" required {...form.getInputProps("name")} />
                <Select
                  label="Quotation type"
                  placeholder="Usable for both"
                  clearable
                  data={[
                    { value: "DPD", label: "DPD" },
                    { value: "NON_DPD", label: "Non-DPD" },
                  ]}
                  {...form.getInputProps("quotationType")}
                />
                <FileInput
                  label="Logo"
                  placeholder={selected?.logoPath ? "Replace logo" : "Upload logo"}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  {...form.getInputProps("logo")}
                />
                <Group grow>
                  <ColorInput label="Primary color" {...form.getInputProps("primaryColor")} />
                  <ColorInput label="Secondary color" {...form.getInputProps("secondaryColor")} />
                </Group>
                <TextInput label="Font family" {...form.getInputProps("fontFamily")} />
                <Textarea label="Header HTML" autosize minRows={2} {...form.getInputProps("headerHtml")} />
                <Textarea label="Footer HTML" autosize minRows={2} {...form.getInputProps("footerHtml")} />
                <Textarea label="Terms & conditions" autosize minRows={3} {...form.getInputProps("termsAndConditions")} />

                <Group justify="space-between" mt="sm">
                  <Group>
                    {!isNew && selected && (
                      <>
                        <Button
                          variant="light"
                          onClick={() => setDefaultMutation.mutate(selected.id)}
                          disabled={selected.isDefault}
                        >
                          Set as default
                        </Button>
                        <Button
                          variant="light"
                          color="red"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this PDF template?")) {
                              deactivateMutation.mutate(selected.id);
                            }
                          }}
                          loading={deactivateMutation.isPending}
                          disabled={selected.isDefault}
                        >
                          Delete template
                        </Button>
                      </>
                    )}
                  </Group>
                  <Button type="submit" loading={saveMutation.isPending}>
                    Save
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card>
        </Grid.Col>

        <Grid.Col span={4}>
          <Text size="sm" fw={600} mb="xs">
            Live preview
          </Text>
          <Card withBorder style={{ fontFamily: values.fontFamily, borderTop: `6px solid ${values.primaryColor}` }}>
            {selected?.logoPath && (
              <img src={`${API_BASE}${selected.logoPath}`} alt="Logo" style={{ maxHeight: 60, marginBottom: 8 }} />
            )}
            <div style={{ color: values.primaryColor }} dangerouslySetInnerHTML={{ __html: values.headerHtml ?? "" }} />
            <Text size="sm" c={values.secondaryColor} my="sm">
              Sample quotation line items would render here.
            </Text>
            <div style={{ color: values.secondaryColor, fontSize: 12 }} dangerouslySetInnerHTML={{ __html: values.footerHtml ?? "" }} />
            <Text size="xs" c="dimmed" mt="sm">
              {values.termsAndConditions}
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Modal opened={opened} onClose={close} title="New PDF template">
        <form onSubmit={createForm.onSubmit((values) => createMutation.mutate(values))}>
          <Stack>
            <TextInput label="Name" required {...createForm.getInputProps("name")} />
            <Select
              label="Quotation type"
              placeholder="Usable for both"
              clearable
              data={[
                { value: "DPD", label: "DPD" },
                { value: "NON_DPD", label: "Non-DPD" },
              ]}
              {...createForm.getInputProps("quotationType")}
            />
            <Button type="submit" loading={createMutation.isPending} mt="sm">
              Create
            </Button>
          </Stack>
        </form>
      </Modal>
    </div>
  );
}
