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
import { useEffect, useState } from "react";
import {
  createPdfTemplate,
  deactivatePdfTemplate,
  fetchPdfTemplates,
  setDefaultPdfTemplate,
  updatePdfTemplate,
  fetchDefaultTemplateHtml,
  type PdfTemplate,
  type PdfTemplateInput,
} from "../../api/pdfTemplates";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

function renderPreviewHtml(template: string, values: any) {
  const mockData = {
    fontFamily: values.fontFamily || "Inter, sans-serif",
    primaryColor: values.primaryColor || "#1c7ed6",
    secondaryColor: values.secondaryColor || "#495057",
    logoDataUri: values.logoUrl || "",
    headerHtml: values.headerHtml || "",
    footerHtml: values.footerHtml || "",
    termsAndConditions: values.termsAndConditions || "",
    quotationNumber: "QTN-2026-0001",
    createdAtFormatted: new Date().toLocaleDateString(),
    quotationType: values.quotationType || "DPD",
    showType: values.quotationType !== "NON_DPD",
    heading: ((values.quotationType === "NON_DPD" ? "IMPORT CLEARANCE FOR NON-DPD CARGO" : "IMPORT CLEARANCE FOR DPD CARGO") + " - NHAVA SHEVA").toUpperCase(),
    clientName: "Acme Corporation Pvt Ltd",
    clientAddress: "404, Business Hub, Sector 11, CBD Belapur, Navi Mumbai - 400614",
    clientGstin: "27AAACA1111A1Z1",
    clientContactPerson: "Mr. Rajan Sharma",
    clientPhone: "+91 98765 43210",
    clientEmail: "rajan@acme.com",
    location: "Nhava Sheva",
    route: "Nhava Sheva to Taloja MIDC",
    servicesOffered: "Customs Clearance & Transportation",
    commodityType: "Auto Parts (Dry Cargo)",
    additionalRemarks: "Rates are subject to container availability.",
    notes: "Payment Terms: Complete advance for third-party charges, rest within 15 days.",
    preparedBy: "Admin User",
    containers: [
      { quantity: 1, containerSizeLabel: "20ft Standard" },
      { quantity: 2, containerSizeLabel: "40ft Standard" }
    ],
    lineItems: [
      { label: "Agency / Handling Charges", rate20: "Rs. 3000.00", rate40: "Rs. 3500.00", remark: "Per shipment" },
      { label: "CFS Charges", rate20: "Rs. 7500.00", rate40: "Rs. 9000.00", remark: "As per tariff" },
      { label: "Transportation", rate20: "Rs. 21000.00", rate40: "Rs. 23000.00", remark: "To MIDC Taloja" }
    ],
    customFields: [
      { label: "Vessel Name", value: "MAERSK MC-KINNEY MOLLER" },
      { label: "ETA Nhava Sheva", value: "2026-08-15" }
    ]
  };

  let result = template || "";

  // Replace loops first:
  // {{#each containers}} ... {{/each}}
  result = result.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (_: string, arrayName: string, innerContent: string) => {
    const list = mockData[arrayName as keyof typeof mockData];
    if (Array.isArray(list)) {
      return list.map(item => {
        let itemHtml = innerContent;
        itemHtml = itemHtml.replace(/{{this\.(\w+)}}/g, (__: string, prop: string) => {
          return String((item as any)[prop] ?? "");
        });
        itemHtml = itemHtml.replace(/{{#if this\.isTax}}([\s\S]*?){{\/if}}/g, (__: string, ifContent: string) => {
          return (item as any).isTax ? ifContent : "";
        });
        return itemHtml;
      }).join("");
    }
    return "";
  });

  // Replace conditionals with else:
  // {{#if key}} ... {{else}} ... {{/if}}
  let hasConditionals = true;
  let iterations = 0;
  while (hasConditionals && iterations < 50) {
    const match = /{{#if ([\w\.]+)}}([\s\S]*?){{\/if}}/.exec(result);
    if (match) {
      const fullMatch = match[0];
      const key = match[1];
      const content = match[2];
      
      const ifVal = !!mockData[key as keyof typeof mockData];

      let replacement = "";
      const elseIndex = content.indexOf("{{else}}");
      if (elseIndex !== -1) {
        const ifContent = content.substring(0, elseIndex);
        const elseContent = content.substring(elseIndex + 8);
        replacement = ifVal ? ifContent : elseContent;
      } else {
        replacement = ifVal ? content : "";
      }
      
      result = result.replace(fullMatch, replacement);
      iterations++;
    } else {
      hasConditionals = false;
    }
  }

  // Replace variable insertions:
  // {{{variable}}}
  result = result.replace(/{{{([\w\.]+)}}}/g, (_: string, key: string) => {
    return String(mockData[key as keyof typeof mockData] ?? "");
  });

  // {{variable}}
  result = result.replace(/{{([\w\.]+)}}/g, (_: string, key: string) => {
    const val = mockData[key as keyof typeof mockData];
    if (val === undefined || val === null) return "";
    return String(val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  });

  return result;
}

const emptyValues: PdfTemplateInput = {
  name: "",
  quotationType: null,
  primaryColor: "#1c7ed6",
  secondaryColor: "#495057",
  fontFamily: "Inter, sans-serif",
  headerHtml: "<h1>ashapura quotation</h1>",
  footerHtml: "<p>Thank you for your business.</p>",
  termsAndConditions: `Please note:-
NN must be shared at least 8 working days prior to the shipment's arrival at nn@ashapura.in id. Failure to do so may attract additional charges.
Scanning/ Scan Mismatch/Seal mismatch / examination (if applicable) will be at actual asper CFS tariff & customs norms.
Any incidental or additional charges will be on actuals with prior approval, if applicable.
All relevant documents or justification to be presented in case if any query is raised by customs.
Vehicle Detention: In case of transportation, Rs.2500 per container per day will be applicable if the vehicle is held for more than 24 hours at both port/plant.
Outside Weighment charges at actual (if required).

Payment terms – Third party complete advance // rest within 15 days from date of Ashapura E-invoice.`,
  htmlTemplate: "",
  logo: null,
};

export function PdfTemplates() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PdfTemplate | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [defaultTemplateHtml, setDefaultTemplateHtml] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchDefaultTemplateHtml()
      .then((html) => setDefaultTemplateHtml(html))
      .catch((err) => console.error("Failed to fetch default template HTML:", err));
  }, []);

  useEffect(() => {
    if (defaultTemplateHtml && !form.values.htmlTemplate) {
      form.setFieldValue("htmlTemplate", defaultTemplateHtml);
    }
  }, [defaultTemplateHtml]);

  const query = useQuery({ queryKey: ["pdf-templates"], queryFn: () => fetchPdfTemplates(true) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["pdf-templates"] });

  const form = useForm<PdfTemplateInput>({ initialValues: emptyValues });
  const values = form.values;

  useEffect(() => {
    if (values.logo) {
      const url = URL.createObjectURL(values.logo);
      setLogoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoUrl(selected?.logoPath ? `${API_BASE}${selected.logoPath}` : null);
    }
  }, [values.logo, selected?.logoPath]);

  useEffect(() => {
    if (query.data && selected === null) {
      const defaultTemplate = query.data.find((t) => t.isDefault) ?? query.data[0];
      if (defaultTemplate) {
        selectTemplate(defaultTemplate);
      }
    }
  }, [query.data, selected]);
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
      form.setValues({ ...emptyValues, htmlTemplate: defaultTemplateHtml });
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
      htmlTemplate: template.htmlTemplate || defaultTemplateHtml,
      logo: null,
    });
  }

  const createMutation = useMutation({
    mutationFn: (values: { name: string; quotationType: "DPD" | "NON_DPD" | null }) =>
      createPdfTemplate({
        ...emptyValues,
        name: values.name,
        quotationType: values.quotationType,
        htmlTemplate: defaultTemplateHtml || null,
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
              <Stack gap="md">
                <Group justify="space-between" mb="xs">
                  <div>
                    <Title order={3}>{selected ? selected.name : "New Template"}</Title>
                    <Text size="sm" c="dimmed">
                      {selected ? `${selected.quotationType ?? "Any type"}` : "Enter template details below"}
                    </Text>
                  </div>
                  <Group gap="xs">
                    {!isNew && selected && (
                      <>
                        <Button
                          variant="light"
                          color="red"
                          type="button"
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
                        <Button
                          variant="light"
                          type="button"
                          onClick={() => setDefaultMutation.mutate(selected.id)}
                          disabled={selected.isDefault}
                        >
                          Set as default
                        </Button>
                      </>
                    )}
                    <Button type="submit" loading={saveMutation.isPending}>
                      Save
                    </Button>
                  </Group>
                </Group>

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

                <Group justify="space-between" align="center" mt="xs">
                  <Text size="sm" fw={500}>HTML Template Code (Handlebars)</Text>
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => {
                      if (window.confirm("Reset HTML template code to default? Your current unsaved changes to this code block will be lost.")) {
                        form.setFieldValue("htmlTemplate", defaultTemplateHtml);
                      }
                    }}
                  >
                    Reset to Default
                  </Button>
                </Group>
                <Textarea
                  placeholder="Paste your custom Handlebars HTML template here..."
                  autosize
                  minRows={10}
                  maxRows={20}
                  styles={{ input: { fontFamily: "monospace", fontSize: "12px", lineHeight: "1.4" } }}
                  {...form.getInputProps("htmlTemplate")}
                />
              </Stack>
            </form>
          </Card>
        </Grid.Col>

        <Grid.Col span={4}>
          <Text size="sm" fw={600} mb="xs">
            Live preview
          </Text>
          <iframe
            title="PDF Preview"
            srcDoc={renderPreviewHtml(values.htmlTemplate || defaultTemplateHtml, {
              ...values,
              logoUrl: logoUrl,
            })}
            style={{
              width: "100%",
              height: "750px",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              backgroundColor: "#fff",
            }}
          />
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
