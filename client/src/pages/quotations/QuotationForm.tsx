import {
  Autocomplete,
  Button,
  Card,
  Grid,
  Group,
  Select,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { fetchCustomFields, type CustomField } from "../../api/customFields";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchClients } from "../../api/clients";
import { fetchContainerSizes } from "../../api/containerSizes";
import { fetchPdfTemplates } from "../../api/pdfTemplates";
import {
  createQuotation,
  fetchQuotation,
  updateQuotation,
  type QuotationContainer,
  type QuotationInput,
} from "../../api/quotations";
import { fetchRateTemplates, type RateComponent, type RateTemplate } from "../../api/rateTemplates";
import { ContainerPicker } from "../../components/ContainerPicker";
import { DynamicComponentBuilder } from "../../components/DynamicComponentBuilder";

function templateComponentsToDraft(template: RateTemplate): RateComponent[] {
  return template.components
    .filter((c) => c.isActive !== false)
    .map((c) => ({ ...c, sourceTemplateComponentId: c.id } as RateComponent & { sourceTemplateComponentId: number }));
}

const CLIENT_FIELD_NAMES = new Set(["clientName", "clientAddress", "clientGstin", "clientContactPerson", "clientPhone", "clientEmail"]);

export function QuotationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [quotationType, setQuotationType] = useState<"DPD" | "NON_DPD">("DPD");
  const [rateTemplateId, setRateTemplateId] = useState<number | null>(null);
  const [pdfTemplateId, setPdfTemplateId] = useState<number | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [clientContactPerson, setClientContactPerson] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [location, setLocation] = useState("");
  const [route, setRoute] = useState("");
  const [title, setTitle] = useState("");
  const [containers, setContainers] = useState<QuotationContainer[]>([]);
  const [components, setComponents] = useState<RateComponent[]>([]);
  const [builderKey, setBuilderKey] = useState(0);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [servicesOffered, setServicesOffered] = useState("");
  const [commodityType, setCommodityType] = useState("");
  const [containerDetails, setContainerDetails] = useState("");
  const [additionalRemarks, setAdditionalRemarks] = useState("");
  const [notes, setNotes] = useState("");

  const systemFieldBindings: Record<string, { value: string; setValue: (value: string) => void }> = {
    clientName: { value: clientName, setValue: selectClient },
    location: { value: location, setValue: setLocation },
    route: { value: route, setValue: setRoute },
    title: { value: title, setValue: setTitle },
    servicesOffered: { value: servicesOffered, setValue: setServicesOffered },
    commodityType: { value: commodityType, setValue: setCommodityType },
    containerDetails: { value: containerDetails, setValue: setContainerDetails },
    additionalRemarks: { value: additionalRemarks, setValue: setAdditionalRemarks },
    notes: { value: notes, setValue: setNotes },
    clientAddress: { value: clientAddress, setValue: setClientAddress },
    clientGstin: { value: clientGstin, setValue: setClientGstin },
    clientContactPerson: { value: clientContactPerson, setValue: setClientContactPerson },
    clientPhone: { value: clientPhone, setValue: setClientPhone },
    clientEmail: { value: clientEmail, setValue: setClientEmail },
  };

  const customFieldsQuery = useQuery({ queryKey: ["custom-fields", false], queryFn: () => fetchCustomFields(false) });

  const containerSizesQuery = useQuery({ queryKey: ["container-sizes", false], queryFn: () => fetchContainerSizes(false) });
  const pdfTemplatesQuery = useQuery({ queryKey: ["pdf-templates", false], queryFn: () => fetchPdfTemplates(false) });
  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: () => fetchClients() });
  const rateTemplatesQuery = useQuery({
    queryKey: ["rate-templates", quotationType],
    queryFn: () => fetchRateTemplates(quotationType, false),
    enabled: true,
  });

  const quotationQuery = useQuery({
    queryKey: ["quotation", id],
    queryFn: () => fetchQuotation(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    const q = quotationQuery.data;
    if (!q) return;
    setQuotationType(q.quotationType);
    setRateTemplateId(q.rateTemplateId);
    setPdfTemplateId(q.pdfTemplateId);
    setClientId(q.clientId);
    setClientName(q.clientName);
    setClientAddress(q.clientAddress ?? "");
    setClientGstin(q.clientGstin ?? "");
    setClientContactPerson(q.clientContactPerson ?? "");
    setClientPhone(q.clientPhone ?? "");
    setClientEmail(q.clientEmail ?? "");
    setLocation(q.location ?? "");
    setRoute(q.route ?? "");
    setTitle(q.title ?? "");
    setCustomFields(q.customFields ?? {});
    setServicesOffered(q.servicesOffered ?? "");
    setCommodityType(q.commodityType ?? "");
    setContainerDetails(q.containerDetails ?? "");
    setAdditionalRemarks(q.additionalRemarks ?? "");
    setNotes(q.notes ?? "");
    setContainers(q.containers);
    setComponents(
      q.lineItems.map((li) => ({
        ...li,
        containerRates: (li.containerBreakdown ?? []).map((cb) => ({
          containerSizeId: Number(cb.containerSizeId),
          rateValue: cb.rate,
        })),
      })),
    );
    setBuilderKey((k) => k + 1);
  }, [quotationQuery.data]);

  useEffect(() => {
    if (!isEdit && containerSizesQuery.data && containers.length === 0) {
      setContainers(
        containerSizesQuery.data.map((size) => ({
          containerSizeId: size.id,
          containerSizeLabel: size.label,
          quantity: 1,
        }))
      );
    }
  }, [containerSizesQuery.data, isEdit]);

  function applyRateTemplate(templateId: number | null) {
    setRateTemplateId(templateId);
    const template = rateTemplatesQuery.data?.find((t) => t.id === templateId);
    if (template) {
      setComponents(templateComponentsToDraft(template));
      setBuilderKey((k) => k + 1);
      if (template.location) {
        setLocation(template.location);
      }
    }
  }

  function selectClient(name: string) {
    setClientName(name);
    const match = clientsQuery.data?.find((c) => c.name === name);
    if (match) {
      setClientId(match.id);
      setClientAddress(match.address ?? "");
      setClientGstin(match.gstin ?? "");
      setClientContactPerson(match.contactPerson ?? "");
      setClientPhone(match.phone ?? "");
      setClientEmail(match.email ?? "");
    } else {
      setClientId(null);
    }
  }

  const saveMutation = useMutation({
    mutationFn: (input: QuotationInput) => (isEdit ? updateQuotation(Number(id), input) : createQuotation(input)),
    onSuccess: (quotation) => {
      notifications.show({ color: "green", message: `Quotation ${quotation.quotationNumber} saved` });
      navigate(`/quotations/${quotation.id}`);
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Save failed", message: err.message }),
  });

  function handleSave() {
    if (!clientName.trim()) {
      notifications.show({ color: "red", message: "Client name is required" });
      return;
    }
    if (components.length === 0) {
      notifications.show({ color: "red", message: "Add at least one rate component" });
      return;
    }

    // Validate required custom fields
    const activeCustomFields = customFieldsQuery.data?.filter(f => f.isActive) ?? [];
    for (const field of activeCustomFields) {
      if (field.required) {
        const val = field.isDefault ? systemFieldBindings[field.name]?.value : customFields[field.name];
        if (val === undefined || val === null || (typeof val === "string" && !val.trim())) {
          notifications.show({ color: "red", message: `${field.label} is required` });
          return;
        }
      }
    }

    const input: QuotationInput = {
      quotationType,
      clientId,
      clientName,
      clientAddress: clientAddress || undefined,
      clientGstin: clientGstin || undefined,
      clientContactPerson: clientContactPerson || undefined,
      clientPhone: clientPhone || undefined,
      clientEmail: clientEmail || undefined,
      rateTemplateId,
      pdfTemplateId,
      location: location || undefined,
      route: route || undefined,
      title: title || undefined,
      customFields: customFields,
      servicesOffered: servicesOffered || undefined,
      commodityType: commodityType || undefined,
      containerDetails: containerDetails || undefined,
      additionalRemarks: additionalRemarks || undefined,
      notes: notes || undefined,
      containers,
      components,
    };
    saveMutation.mutate(input);
  }

  function renderField(field: CustomField) {
    const systemBinding = field.isDefault ? systemFieldBindings[field.name] : undefined;
    if (field.isDefault && !systemBinding) return null;
    let element: React.ReactNode = null;

    if (field.name === "clientName") {
      element = (
        <Autocomplete
          label={field.label}
          required={field.required}
          placeholder="Select or enter a client"
          data={clientsQuery.data?.map((client) => client.name) ?? []}
          value={clientName}
          onChange={selectClient}
        />
      );
    } else if (field.type === "TEXT") {
      const isMultiline = ["clientAddress", "containerDetails", "additionalRemarks", "notes"].includes(field.name);
      const props = {
        label: field.label,
        required: field.required,
        placeholder: `Enter ${field.label.toLowerCase()}`,
        value: systemBinding?.value ?? customFields[field.name] ?? "",
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => systemBinding
          ? systemBinding.setValue(event.currentTarget.value)
          : setCustomFields({ ...customFields, [field.name]: event.currentTarget.value }),
      };
      element = isMultiline ? <Textarea {...props} minRows={2} /> : <TextInput {...props} />;
    } else if (field.type === "NUMBER") {
      element = <TextInput type="number" label={field.label} required={field.required} placeholder={`Enter ${field.label.toLowerCase()}`} value={customFields[field.name] ?? ""} onChange={(event) => setCustomFields({ ...customFields, [field.name]: event.currentTarget.value ? Number(event.currentTarget.value) : "" })} />;
    } else if (field.type === "BOOLEAN") {
      element = <Switch label={field.label} checked={Boolean(customFields[field.name])} onChange={(event) => setCustomFields({ ...customFields, [field.name]: event.currentTarget.checked })} mt="xl" />;
    } else if (field.type === "SELECT") {
      const options = (field.options ?? "").split(",").map((option) => option.trim()).filter(Boolean);
      element = <Select label={field.label} required={field.required} placeholder="Select an option" data={options} value={customFields[field.name] ?? null} onChange={(value) => setCustomFields({ ...customFields, [field.name]: value })} />;
    }

    return <Grid.Col key={field.id} span={{ base: 12, md: field.type === "BOOLEAN" ? 4 : 6 }}>{element}</Grid.Col>;
  }

  if (isEdit && quotationQuery.isLoading) return <Text>Loading...</Text>;

  return (
    <div>
      <Title order={2} mb="md">
        {isEdit ? "Edit Quotation" : "New Quotation"}
      </Title>

      <Stack gap="md">
        <Card withBorder padding="lg" radius="md">
          <Text fw={600} size="lg" mb="md">General Information</Text>
          <Grid align="flex-end">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <SegmentedControl
                fullWidth
                disabled={isEdit}
                value={quotationType}
                onChange={(v) => {
                  setQuotationType(v as "DPD" | "NON_DPD");
                  setRateTemplateId(null);
                  setComponents([]);
                  setBuilderKey((k) => k + 1);
                }}
                data={[
                  { label: "DPD (Loaded Delivery)", value: "DPD" },
                  { label: "Non-DPD", value: "NON_DPD" },
                ]}
              />
            </Grid.Col>
            
            <Grid.Col span={12}>
              <Select
                label="Rate Template"
                placeholder={`Select a ${quotationType === "DPD" ? "DPD" : "Non-DPD"} rate template`}
                data={rateTemplatesQuery.data?.map((t) => ({ value: String(t.id), label: `${t.name} (v${t.version})` })) ?? []}
                value={rateTemplateId ? String(rateTemplateId) : null}
                onChange={(v) => applyRateTemplate(v ? Number(v) : null)}
              />
            </Grid.Col>
          </Grid>
        </Card>

        <Card withBorder padding="lg" radius="md">
          <Text fw={600} size="lg" mb="md">Client Details</Text>
          <Grid>
            {customFieldsQuery.data
              ?.filter((field) => field.isActive && CLIENT_FIELD_NAMES.has(field.name))
              .map(renderField)}

          </Grid>
        </Card>

        {customFieldsQuery.data && customFieldsQuery.data.filter(f => f.isActive).length > 0 && (
          <Card withBorder padding="lg" radius="md">
            <Text fw={600} size="lg" mb="md">Quotation Details</Text>
            <Grid>
              {customFieldsQuery.data
                .filter((field) => field.isActive && !CLIENT_FIELD_NAMES.has(field.name))
                .map(renderField)}
            </Grid>
          </Card>
        )}

        {containerSizesQuery.data && (
          <ContainerPicker containerSizes={containerSizesQuery.data} value={containers} onChange={setContainers} />
        )}

        <Card withBorder padding="lg" radius="md">
          <Text fw={600} size="lg" mb="sm">
            Rate components
          </Text>
          <DynamicComponentBuilder
            key={builderKey}
            initialComponents={components}
            containerSizes={containerSizesQuery.data ?? []}
            onChange={setComponents}
          />
        </Card>

        <Card withBorder padding="lg" radius="md">
          <Text fw={600} size="lg" mb="md">Document Settings</Text>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="PDF Template"
                placeholder="Use default"
                clearable
                data={pdfTemplatesQuery.data?.map((t) => ({ value: String(t.id), label: t.name })) ?? []}
                value={pdfTemplateId ? String(pdfTemplateId) : null}
                onChange={(v) => setPdfTemplateId(v ? Number(v) : null)}
              />
            </Grid.Col>
            
          </Grid>
        </Card>

        <Group justify="flex-end" mt="md" gap="md">
          <Button variant="subtle" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saveMutation.isPending}>
            {isEdit ? "Save changes" : "Create Draft quotation"}
          </Button>
        </Group>
      </Stack>
    </div>
  );
}
