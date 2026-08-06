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
  Paper,
  Tabs,
} from "@mantine/core";
import {
  IconPalette,
  IconLayout,
  IconCode,
  IconRefresh,
  IconCheck,
  IconTrash,
  IconStar,
  IconPlus,
  IconFileText,
} from "@tabler/icons-react";
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

Payment terms – Third party complete advance // rest within 15 days from the billing date.`,
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
  const [hoveredId, setHoveredId] = useState<number | null>(null);

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
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} style={{ fontWeight: 800, letterSpacing: "-0.5px" }}>PDF Templates</Title>
          <Text size="xs" c="dimmed">Customize branding, layout structure, and Handlebars HTML code for PDF generation.</Text>
        </div>
        <Button onClick={open} leftSection={<IconPlus size={16} />} radius="md">New Template</Button>
      </Group>

      <Grid gutter="md">
        <Grid.Col span={2}>
          <Paper shadow="xs" radius="md" p="md" withBorder style={{ height: "100%" }}>
            <Group justify="space-between" mb="md" align="center">
              <Text size="xs" fw={700} style={{ letterSpacing: "0.5px", textTransform: "uppercase" }} c="dimmed">Templates List</Text>
            </Group>
            <Stack gap="xs" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
              {query.data?.map((template) => (
                <Card
                  key={template.id}
                  withBorder
                  padding="sm"
                  radius="md"
                  onMouseEnter={() => setHoveredId(template.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    cursor: "pointer",
                    borderColor: selected?.id === template.id ? template.primaryColor : undefined,
                    boxShadow: (selected?.id === template.id || hoveredId === template.id) ? "0 6px 12px rgba(0, 0, 0, 0.05)" : "0 1px 2px rgba(0,0,0,0.01)",
                    transform: (selected?.id === template.id || hoveredId === template.id) ? "translateY(-2px)" : "translateY(0)",
                    transition: "all 0.2s ease",
                    position: "relative",
                    overflow: "hidden",
                    paddingLeft: "18px",
                  }}
                  onClick={() => selectTemplate(template)}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: "6px",
                      backgroundColor: template.primaryColor,
                    }}
                  />
                  <Group justify="space-between" gap="xs">
                    <Text fw={selected?.id === template.id ? 700 : 500} size="sm" style={{ color: selected?.id === template.id ? template.primaryColor : "inherit" }}>
                      {template.name}
                    </Text>
                    {template.isDefault && (
                      <Badge size="xs" variant="filled" style={{ backgroundColor: template.primaryColor }}>
                        Default
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    {template.quotationType ? `${template.quotationType} Type` : "Universal Template"}
                  </Text>
                </Card>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={10}>
          <Grid gutter="md">
            <Grid.Col span={5}>
              <Card shadow="xs" radius="md" p="md" withBorder style={{ height: "100%" }}>
                <form onSubmit={form.onSubmit((v) => saveMutation.mutate(v))}>
                  <Stack gap="md">
                    <Group justify="space-between" align="center" mb="xs">
                      <div>
                        <Title order={3} style={{ fontWeight: 800, letterSpacing: "-0.5px" }}>{selected ? selected.name : "New Template"}</Title>
                        <Text size="xs" c="dimmed">
                          {selected ? `${selected.quotationType ?? "Universal"}` : "Enter template details below"}
                        </Text>
                      </div>
                      <Button type="submit" loading={saveMutation.isPending} leftSection={<IconCheck size={16} />} radius="md">
                        Save
                      </Button>
                    </Group>

                    <Tabs defaultValue="branding" variant="outline" radius="md">
                      <Tabs.List mb="md">
                        <Tabs.Tab value="branding" leftSection={<IconPalette size={14} />}>Branding</Tabs.Tab>
                        <Tabs.Tab value="blocks" leftSection={<IconLayout size={14} />}>HTML Blocks</Tabs.Tab>
                        <Tabs.Tab value="code" leftSection={<IconCode size={14} />}>Layout Code</Tabs.Tab>
                      </Tabs.List>

                      <Tabs.Panel value="branding">
                        <Stack gap="xs">
                          <TextInput label="Template Name" required placeholder="e.g. Standard Quotation" {...form.getInputProps("name")} />
                          <Select
                            label="Quotation Type"
                            placeholder="Universal (both types)"
                            clearable
                            data={[
                              { value: "DPD", label: "DPD Quotations" },
                              { value: "NON_DPD", label: "Non-DPD Quotations" },
                            ]}
                            {...form.getInputProps("quotationType")}
                          />
                          <FileInput
                            label="Upload Logo"
                            placeholder={selected?.logoPath ? "Replace company logo" : "Choose logo file"}
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            leftSection={<IconFileText size={16} />}
                            {...form.getInputProps("logo")}
                          />
                          <Group grow gap="xs">
                            <ColorInput label="Primary Color" {...form.getInputProps("primaryColor")} />
                            <ColorInput label="Secondary Color" {...form.getInputProps("secondaryColor")} />
                          </Group>
                          <TextInput label="Font Family" placeholder="e.g. Inter, sans-serif" {...form.getInputProps("fontFamily")} />
                        </Stack>
                      </Tabs.Panel>

                      <Tabs.Panel value="blocks">
                        <Stack gap="xs">
                          <Textarea label="Header HTML" placeholder="<h1>Company Name</h1>" autosize minRows={3} maxRows={5} {...form.getInputProps("headerHtml")} />
                          <Textarea label="Footer HTML" placeholder="<p>Page 1 of 1</p>" autosize minRows={3} maxRows={5} {...form.getInputProps("footerHtml")} />
                          <Textarea label="Terms & Conditions" placeholder="Payment within 15 days..." autosize minRows={4} maxRows={8} {...form.getInputProps("termsAndConditions")} />
                        </Stack>
                      </Tabs.Panel>

                      <Tabs.Panel value="code">
                        <Stack gap="xs">
                          <Group justify="space-between" align="center">
                            <Text size="xs" c="dimmed">Handlebars PDF layout compiler code</Text>
                            <Button
                              size="xs"
                              variant="subtle"
                              leftSection={<IconRefresh size={12} />}
                              onClick={() => {
                                if (window.confirm("Reset HTML template code to default? Your current unsaved changes to this code block will be lost.")) {
                                  form.setFieldValue("htmlTemplate", defaultTemplateHtml);
                                }
                              }}
                            >
                              Reset default
                            </Button>
                          </Group>
                          <Textarea
                            placeholder="Paste your custom Handlebars HTML template here..."
                            autosize
                            minRows={12}
                            maxRows={18}
                            styles={{ input: { fontFamily: "Consolas, Monaco, monospace", fontSize: "11px", lineHeight: "1.4", backgroundColor: "#f8f9fa" } }}
                            {...form.getInputProps("htmlTemplate")}
                          />
                        </Stack>
                      </Tabs.Panel>
                    </Tabs>

                    {!isNew && selected && (
                      <Group mt="md" gap="xs">
                        <Button
                          variant="light"
                          color="red"
                          type="button"
                          style={{ flex: 1 }}
                          leftSection={<IconTrash size={14} />}
                          radius="md"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this PDF template?")) {
                              deactivateMutation.mutate(selected.id);
                            }
                          }}
                          loading={deactivateMutation.isPending}
                          disabled={selected.isDefault}
                        >
                          Delete
                        </Button>
                        <Button
                          variant="light"
                          type="button"
                          style={{ flex: 1 }}
                          leftSection={<IconStar size={14} />}
                          radius="md"
                          onClick={() => setDefaultMutation.mutate(selected.id)}
                          disabled={selected.isDefault}
                        >
                          Set Default
                        </Button>
                      </Group>
                    )}
                  </Stack>
                </form>
              </Card>
            </Grid.Col>

            <Grid.Col span={7}>
              <Paper shadow="xs" radius="md" p="md" withBorder style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <Group justify="space-between" mb="xs" align="center">
                  <Group gap="xs">
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#40c057", boxShadow: "0 0 0 2px rgba(64, 192, 87, 0.4)" }} />
                    <Text size="sm" fw={700}>Live Preview</Text>
                  </Group>
                  <Badge size="sm" variant="light" color={values.quotationType === "NON_DPD" ? "gray" : "blue"}>
                    {values.quotationType ?? "Universal"} Mock
                  </Badge>
                </Group>
                
                <div style={{ flex: 1, backgroundColor: "#f1f3f5", borderRadius: 8, padding: 12, display: "flex", justifyContent: "center" }}>
                  <iframe
                    title="PDF Preview"
                    srcDoc={renderPreviewHtml(values.htmlTemplate || defaultTemplateHtml, {
                      ...values,
                      logoUrl: logoUrl,
                    })}
                    style={{
                      width: "100%",
                      height: "720px",
                      border: "none",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                      borderRadius: "6px",
                      backgroundColor: "#fff",
                    }}
                  />
                </div>
              </Paper>
            </Grid.Col>
          </Grid>
        </Grid.Col>
      </Grid>

      <Modal opened={opened} onClose={close} title="New PDF template" radius="md">
        <form onSubmit={createForm.onSubmit((values) => createMutation.mutate(values))}>
          <Stack>
            <TextInput label="Name" required placeholder="e.g. DPD Nhava Sheva" {...createForm.getInputProps("name")} />
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
            <Button type="submit" loading={createMutation.isPending} mt="sm" radius="md">
              Create
            </Button>
          </Stack>
        </form>
      </Modal>
    </div>
  );
}
