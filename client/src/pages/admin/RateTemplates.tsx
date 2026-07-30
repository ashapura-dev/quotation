import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { computeQuotationTotals } from "../../lib/calcEngine";
import { useEffect, useMemo, useState } from "react";
import { fetchContainerSizes } from "../../api/containerSizes";
import {
  createNewRateTemplateVersion,
  createRateTemplate,
  deactivateRateTemplate,
  fetchRateTemplates,
  saveRateTemplateComponents,
  updateRateTemplateMeta,
  type RateComponent,
  type RateTemplate,
} from "../../api/rateTemplates";
import { DynamicComponentBuilder } from "../../components/DynamicComponentBuilder";

export function RateTemplates() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [draftComponents, setDraftComponents] = useState<RateComponent[]>([]);

  const templatesQuery = useQuery({ queryKey: ["rate-templates"], queryFn: () => fetchRateTemplates(undefined, true) });
  const containerSizesQuery = useQuery({ queryKey: ["container-sizes", false], queryFn: () => fetchContainerSizes(false) });

  const selected = templatesQuery.data?.find((t) => t.id === selectedId) ?? null;

  const [localLocation, setLocalLocation] = useState("");

  useEffect(() => {
    setLocalLocation(selected?.location ?? "");
  }, [selected?.id, selected?.location]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["rate-templates"] });

  useEffect(() => {
    if (templatesQuery.data && selectedId === null) {
      const defaultTemplate = templatesQuery.data.find((t) => t.isDefault) ?? templatesQuery.data[0];
      if (defaultTemplate) {
        selectTemplate(defaultTemplate);
      }
    }
  }, [templatesQuery.data, selectedId]);

  const createForm = useForm({ initialValues: { name: "", quotationType: "DPD" as "DPD" | "NON_DPD", location: "" } });

  const createMutation = useMutation({
    mutationFn: createRateTemplate,
    onSuccess: (template) => {
      notifications.show({ color: "green", message: "Rate template created" });
      invalidate();
      setSelectedId(template.id);
      close();
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not create template", message: err.message }),
  });

  const updateMetaMutation = useMutation({
    mutationFn: (meta: { name?: string; location?: string | null }) => updateRateTemplateMeta(selected!.id, meta),
    onSuccess: () => {
      invalidate();
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Update failed", message: err.message }),
  });

  const saveComponentsMutation = useMutation({
    mutationFn: () => saveRateTemplateComponents(selected!.id, draftComponents),
    onSuccess: () => {
      notifications.show({ color: "green", message: "Rate template saved" });
      invalidate();
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Save failed", message: err.message }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: () => updateRateTemplateMeta(selected!.id, { isDefault: true }),
    onSuccess: () => {
      notifications.show({ color: "green", message: "Set as default" });
      invalidate();
    },
  });

  const newVersionMutation = useMutation({
    mutationFn: () => createNewRateTemplateVersion(selected!.id),
    onSuccess: (template) => {
      notifications.show({ color: "green", message: `Created version ${template.version}` });
      invalidate();
      setSelectedId(template.id);
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Could not create version", message: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deactivateRateTemplate(selected!.id),
    onSuccess: () => {
      notifications.show({ color: "green", message: "Rate template deleted" });
      invalidate();
      setSelectedId(null);
    },
    onError: (err: Error) => notifications.show({ color: "red", title: "Delete failed", message: err.message }),
  });

  function selectTemplate(template: RateTemplate) {
    setSelectedId(template.id);
    setDraftComponents(template.components);
  }

  const preview = useMemo(() => {
    if (!containerSizesQuery.data) return null;
    const sampleContainers = containerSizesQuery.data.slice(0, 1).map((size) => ({
      containerSizeId: String(size.id),
      label: size.label,
      quantity: 1,
    }));
    return computeQuotationTotals(
      draftComponents.map((c, i) => ({
        id: c.id ? String(c.id) : `draft-${i}`,
        label: c.label,
        componentType: c.componentType,
        isTax: c.isTax,
        sortOrder: c.sortOrder,
        fixedValue: c.fixedValue ?? undefined,
        percentageValue: c.percentageValue ?? undefined,
        containerRates: c.containerRates.map((r) => ({ containerSizeId: String(r.containerSizeId), rateValue: r.rateValue })),
      })),
      sampleContainers,
    );
  }, [draftComponents, containerSizesQuery.data]);

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Title order={2}>Rate Templates</Title>
        <Button onClick={open}>New template</Button>
      </Group>

      <Grid>
        <Grid.Col span={4}>
          <Stack gap="xs">
            {templatesQuery.data?.map((template) => (
              <Card
                key={template.id}
                onClick={() => selectTemplate(template)}
                style={{ cursor: "pointer", borderColor: selectedId === template.id ? "var(--mantine-primary-color-filled)" : undefined }}
              >
                <Group justify="space-between">
                  <div>
                    <Text fw={600}>{template.name}</Text>
                    <Text size="xs" c="dimmed">
                      {template.quotationType} · v{template.version}
                    </Text>
                  </div>
                  <Stack gap={4} align="flex-end">
                    {template.isDefault && <Badge color="blue">Default</Badge>}
                    {!template.isActive && <Badge color="gray">Inactive</Badge>}
                  </Stack>
                </Group>
              </Card>
            ))}
          </Stack>
        </Grid.Col>

        <Grid.Col span={8}>
          {selected && containerSizesQuery.data ? (
            <Card>
              <Group justify="space-between" mb="md">
                <div>
                  <Title order={3}>{selected.name}</Title>
                  <Group gap="xs" mt={4} align="center">
                    <Text size="sm" c="dimmed">
                      {selected.quotationType} · version {selected.version}
                    </Text>
                    <Text size="sm" c="dimmed">·</Text>
                    <TextInput
                      placeholder="Add location (e.g. Nhava Sheva)"
                      variant="unstyled"
                      size="sm"
                      value={localLocation}
                      styles={{ input: { height: 20, minHeight: 20, color: "var(--mantine-color-dimmed)", fontWeight: 500, textDecoration: "underline", textDecorationStyle: "dashed" } }}
                      onChange={(e) => setLocalLocation(e.currentTarget.value)}
                      onBlur={() => {
                        updateMetaMutation.mutate({ location: localLocation || null });
                      }}
                      w={220}
                    />
                  </Group>
                </div>
                <Group>
                  <Button
                    color="red"
                    variant="light"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this rate template?")) {
                        deleteMutation.mutate();
                      }
                    }}
                    loading={deleteMutation.isPending}
                    disabled={selected.isDefault}
                  >
                    Delete template
                  </Button>
                  <Button variant="light" onClick={() => setDefaultMutation.mutate()} disabled={selected.isDefault}>
                    Set as default
                  </Button>
                  <Button variant="light" onClick={() => newVersionMutation.mutate()} loading={newVersionMutation.isPending}>
                    Save as new version
                  </Button>
                  <Button onClick={() => saveComponentsMutation.mutate()} loading={saveComponentsMutation.isPending}>
                    Save changes
                  </Button>
                </Group>
              </Group>

              <DynamicComponentBuilder
                key={selected.id}
                initialComponents={selected.components}
                containerSizes={containerSizesQuery.data}
                onChange={setDraftComponents}
              />

              {preview && (
                <Card mt="md" bg="var(--mantine-color-gray-0)">
                  <Text size="sm" fw={600} mb={4}>
                    Preview (1 of each container size)
                  </Text>
                  <Text size="sm">Subtotal: {preview.subtotal.toFixed(2)}</Text>
                  <Text size="sm">Tax: {preview.taxTotal.toFixed(2)}</Text>
                  <Text size="sm">Other adjustments: {preview.otherAdjustmentsTotal.toFixed(2)}</Text>
                  <Text size="sm" fw={700}>
                    Grand total: {preview.grandTotal.toFixed(2)}
                  </Text>
                </Card>
              )}
            </Card>
          ) : (
            <Text c="dimmed">Select a template to edit its components.</Text>
          )}
        </Grid.Col>
      </Grid>

      <Modal opened={opened} onClose={close} title="New rate template">
        <form onSubmit={createForm.onSubmit((values) => createMutation.mutate(values))}>
          <Stack>
            <TextInput label="Name" required {...createForm.getInputProps("name")} />
            <TextInput label="Location" placeholder="e.g. Nhava Sheva" {...createForm.getInputProps("location")} />
            <Select
              label="Quotation type"
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
