import {
  Autocomplete,
  Button,
  Card,
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
import { fetchCustomFields } from "../../api/customFields";
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
  const [notes, setNotes] = useState("");
  const [containers, setContainers] = useState<QuotationContainer[]>([]);
  const [components, setComponents] = useState<RateComponent[]>([]);
  const [builderKey, setBuilderKey] = useState(0);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

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
    setNotes(q.notes ?? "");
    setCustomFields(q.customFields ?? {});
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
        const val = customFields[field.name];
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
      notes: notes || undefined,
      containers,
      components,
    };
    saveMutation.mutate(input);
  }

  if (isEdit && quotationQuery.isLoading) return <Text>Loading...</Text>;

  return (
    <div>
      <Title order={2} mb="md">
        {isEdit ? "Edit Quotation" : "New Quotation"}
      </Title>

      <Stack gap="md">
        <Card>
          <Stack gap="sm">
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
            <TextInput
              label="Quotation Title"
              placeholder="e.g. July Shipment or Factory Cargo"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
            />
            <Select
              label="Rate template"
              placeholder={`Select a ${quotationType === "DPD" ? "DPD" : "Non-DPD"} rate template`}
              data={rateTemplatesQuery.data?.map((t) => ({ value: String(t.id), label: `${t.name} (v${t.version})` })) ?? []}
              value={rateTemplateId ? String(rateTemplateId) : null}
              onChange={(v) => applyRateTemplate(v ? Number(v) : null)}
            />
            <Group grow>
              <TextInput
                label="Location"
                placeholder="e.g. Nhava Sheva"
                value={location}
                onChange={(e) => setLocation(e.currentTarget.value)}
              />
              <TextInput
                label="Route"
                placeholder="e.g. Nhava Sheva to Dharavi"
                value={route}
                onChange={(e) => setRoute(e.currentTarget.value)}
              />
            </Group>
          </Stack>
        </Card>

        <Card>
          <Text fw={600} mb="sm">
            Client details
          </Text>
          <Stack gap="sm">
            <Autocomplete
              label="Client name"
              required
              data={clientsQuery.data?.map((c) => c.name) ?? []}
              value={clientName}
              onChange={selectClient}
            />
            <Group grow>
              <TextInput label="Contact person" value={clientContactPerson} onChange={(e) => setClientContactPerson(e.currentTarget.value)} />
              <TextInput label="Phone" value={clientPhone} onChange={(e) => setClientPhone(e.currentTarget.value)} />
            </Group>
            <Group grow>
              <TextInput label="Email" value={clientEmail} onChange={(e) => setClientEmail(e.currentTarget.value)} />
              <TextInput label="GSTIN" value={clientGstin} onChange={(e) => setClientGstin(e.currentTarget.value)} />
            </Group>
            <Textarea label="Address" value={clientAddress} onChange={(e) => setClientAddress(e.currentTarget.value)} />
          </Stack>
        </Card>

        {customFieldsQuery.data && customFieldsQuery.data.filter(f => f.isActive).length > 0 && (
          <Card>
            <Text fw={600} mb="sm">
              Additional Details
            </Text>
            <Stack gap="sm">
              {customFieldsQuery.data.filter(f => f.isActive).map((field) => {
                if (field.type === "TEXT") {
                  return (
                    <TextInput
                      key={field.id}
                      label={field.label}
                      required={field.required}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      value={customFields[field.name] ?? ""}
                      onChange={(e) => setCustomFields({ ...customFields, [field.name]: e.currentTarget.value })}
                    />
                  );
                }
                if (field.type === "NUMBER") {
                  return (
                    <TextInput
                      key={field.id}
                      type="number"
                      label={field.label}
                      required={field.required}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      value={customFields[field.name] ?? ""}
                      onChange={(e) => setCustomFields({ ...customFields, [field.name]: e.currentTarget.value ? Number(e.currentTarget.value) : "" })}
                    />
                  );
                }
                if (field.type === "BOOLEAN") {
                  return (
                    <Switch
                      key={field.id}
                      label={field.label}
                      checked={Boolean(customFields[field.name])}
                      onChange={(e) => setCustomFields({ ...customFields, [field.name]: e.currentTarget.checked })}
                      mt="xs"
                    />
                  );
                }
                if (field.type === "SELECT") {
                  const opts = (field.options ?? "").split(",").map((o) => o.trim()).filter(Boolean);
                  return (
                    <Select
                      key={field.id}
                      label={field.label}
                      required={field.required}
                      placeholder="Select an option"
                      data={opts}
                      value={customFields[field.name] ?? null}
                      onChange={(val) => setCustomFields({ ...customFields, [field.name]: val })}
                    />
                  );
                }
                return null;
              })}
            </Stack>
          </Card>
        )}

        {containerSizesQuery.data && (
          <ContainerPicker containerSizes={containerSizesQuery.data} value={containers} onChange={setContainers} />
        )}

        <Card>
          <Text fw={600} mb="sm">
            Rate components
          </Text>
          <DynamicComponentBuilder
            key={builderKey}
            initialComponents={components}
            containerSizes={containerSizesQuery.data ?? []}
            onChange={setComponents}
          />
        </Card>

        <Card>
          <Select
            label="PDF template"
            placeholder="Use default"
            clearable
            data={pdfTemplatesQuery.data?.map((t) => ({ value: String(t.id), label: t.name })) ?? []}
            value={pdfTemplateId ? String(pdfTemplateId) : null}
            onChange={(v) => setPdfTemplateId(v ? Number(v) : null)}
          />
          <Textarea label="Terms and conditions" mt="sm" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
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
