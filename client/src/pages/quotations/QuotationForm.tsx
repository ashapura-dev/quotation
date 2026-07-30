import {
  Autocomplete,
  Button,
  Card,
  Grid,
  Group,
  Select,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery } from "@tanstack/react-query";
import { computeQuotationTotals } from "@ashapura/calc-engine";
import { useEffect, useMemo, useState } from "react";
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

const NHAVA_SHEVA_DEFAULT_NOTES = `Please note:-
NN must be shared at least 8 working days prior to the shipment's arrival at nn@ashapura.in id. Failure to do so may attract additional charges.
Scanning/ Scan Mismatch/Seal mismatch / examination (if applicable) will be at actual asper CFS tariff & customs norms.
Any incidental or additional charges will be on actuals with prior approval, if applicable.
All relevant documents or justification to be presented in case if any query is raised by customs.
Vehicle Detention: In case of transportation, Rs.2500 per container per day will be applicable if the vehicle is held for more than 24 hours at both port/plant.
Outside Weighment charges at actual (if required).

Payment terms – Third party complete advance // rest within 15 days from date of Ashapura E-invoice.`;

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
  const [notes, setNotes] = useState("");
  const [containers, setContainers] = useState<QuotationContainer[]>([]);
  const [components, setComponents] = useState<RateComponent[]>([]);
  const [builderKey, setBuilderKey] = useState(0);

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
      if (template.name.toLowerCase().includes("nhava")) {
        setNotes(NHAVA_SHEVA_DEFAULT_NOTES);
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
    const input: QuotationInput = {
      quotationType,
      clientId,
      clientName,
      clientAddress: clientAddress || undefined,
      clientGstin: clientGstin || undefined,
      clientContactPerson: clientContactPerson || undefined,
      clientPhone: clientPhone || undefined,
      clientEmail: clientEmail || undefined,
      rateTemplateId: quotationType === "DPD" ? rateTemplateId : null,
      pdfTemplateId,
      notes: notes || undefined,
      containers,
      components,
    };
    saveMutation.mutate(input);
  }

  const preview = useMemo(() => {
    return computeQuotationTotals(
      components.map((c, i) => ({
        id: c.id ? String(c.id) : `draft-${i}`,
        label: c.label,
        componentType: c.componentType,
        isTax: c.isTax,
        sortOrder: i,
        fixedValue: c.fixedValue ?? undefined,
        percentageValue: c.percentageValue ?? undefined,
        containerRates: c.containerRates.map((r) => ({ containerSizeId: String(r.containerSizeId), rateValue: r.rateValue })),
      })),
      containers.map((c) => ({ containerSizeId: String(c.containerSizeId), label: c.containerSizeLabel, quantity: c.quantity })),
    );
  }, [components, containers]);

  if (isEdit && quotationQuery.isLoading) return <Text>Loading...</Text>;

  return (
    <div>
      <Title order={2} mb="md">
        {isEdit ? "Edit Quotation" : "New Quotation"}
      </Title>

      <Grid>
        <Grid.Col span={8}>
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
                <Select
                  label="Rate template"
                  placeholder={`Select a ${quotationType === "DPD" ? "DPD" : "Non-DPD"} rate template`}
                  data={rateTemplatesQuery.data?.map((t) => ({ value: String(t.id), label: `${t.name} (v${t.version})` })) ?? []}
                  value={rateTemplateId ? String(rateTemplateId) : null}
                  onChange={(v) => applyRateTemplate(v ? Number(v) : null)}
                />
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
          </Stack>
        </Grid.Col>

        <Grid.Col span={4}>
          <Card withBorder pos="sticky" top={20}>
            <Text fw={600} mb="sm">
              Totals
            </Text>
            <Stack gap={4}>
              <Group justify="space-between">
                <Text size="sm">Subtotal</Text>
                <Text size="sm">{preview.subtotal.toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Tax</Text>
                <Text size="sm">{preview.taxTotal.toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Other adjustments</Text>
                <Text size="sm">{preview.otherAdjustmentsTotal.toFixed(2)}</Text>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text fw={700}>Grand total</Text>
                <Text fw={700}>{preview.grandTotal.toFixed(2)}</Text>
              </Group>
            </Stack>
            <Button fullWidth mt="md" onClick={handleSave} loading={saveMutation.isPending}>
              {isEdit ? "Save changes" : "Create Draft quotation"}
            </Button>
          </Card>
        </Grid.Col>
      </Grid>
    </div>
  );
}
