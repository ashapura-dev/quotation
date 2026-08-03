import type { ComponentType, QuotationType } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { HttpError } from "../../middleware/errorHandler.js";

const templateInclude = {
  components: {
    orderBy: { sortOrder: "asc" as const },
    include: { containerRates: true },
  },
};

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function serializeTemplate(template: Awaited<ReturnType<typeof getRateTemplate>>) {
  if (!template) return template;
  return {
    ...template,
    components: template.components.map((c) => ({
      ...c,
      fixedValue: num(c.fixedValue),
      percentageValue: num(c.percentageValue),
      containerRates: c.containerRates.map((r) => ({ ...r, rateValue: num(r.rateValue) })),
    })),
  };
}

export async function listRateTemplates(quotationType?: QuotationType, includeInactive = false) {
  const templates = await prisma.rateTemplate.findMany({
    where: { quotationType, ...(includeInactive ? {} : { isActive: true }) },
    include: templateInclude,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }, { version: "desc" }],
  });
  return templates.map(serializeTemplate);
}

export function getRateTemplate(id: number) {
  return prisma.rateTemplate.findUniqueOrThrow({ where: { id }, include: templateInclude });
}

export async function getRateTemplateSerialized(id: number) {
  return serializeTemplate(await getRateTemplate(id));
}

export async function createRateTemplate(input: { name: string; quotationType: QuotationType; createdById: number; location?: string | null }) {
  const template = await prisma.rateTemplate.create({ data: { ...input }, include: templateInclude });
  return serializeTemplate(template);
}

export async function updateRateTemplate(id: number, input: { name?: string; isDefault?: boolean; location?: string | null }) {
  if (input.isDefault) {
    const template = await prisma.rateTemplate.findUniqueOrThrow({ where: { id } });
    await prisma.rateTemplate.updateMany({
      where: { quotationType: template.quotationType, isDefault: true },
      data: { isDefault: false },
    });
  }
  await prisma.rateTemplate.update({ where: { id }, data: input });
  return getRateTemplateSerialized(id);
}

export async function deactivateRateTemplate(id: number) {
  const template = await prisma.rateTemplate.findUnique({ where: { id } });
  if (!template) {
    throw new HttpError(404, "Rate template not found");
  }
  if (template.isDefault) {
    throw new HttpError(400, "Cannot delete the default rate template");
  }

  const usedCount = await prisma.quotation.count({ where: { rateTemplateId: id } });
  if (usedCount > 0) {
    throw new HttpError(400, "Cannot delete this rate template because it is used by one or more quotations");
  }

  await prisma.rateTemplate.delete({ where: { id } });
}

// ---------- Components ----------

export async function addComponent(
  rateTemplateId: number,
  input: { label: string; componentType: ComponentType; isTax?: boolean; fixedValue?: number; percentageValue?: number },
) {
  const maxSort = await prisma.rateTemplateComponent.aggregate({
    where: { rateTemplateId },
    _max: { sortOrder: true },
  });
  await prisma.rateTemplateComponent.create({
    data: { rateTemplateId, sortOrder: (maxSort._max.sortOrder ?? -1) + 1, ...input },
  });
  return getRateTemplateSerialized(rateTemplateId);
}

export async function updateComponent(
  rateTemplateId: number,
  componentId: number,
  input: { label?: string; isTax?: boolean; fixedValue?: number | null; percentageValue?: number | null },
) {
  await prisma.rateTemplateComponent.update({ where: { id: componentId }, data: input });
  return getRateTemplateSerialized(rateTemplateId);
}

export async function deleteComponent(rateTemplateId: number, componentId: number) {
  // Soft-deleted: quotations may still reference this component id for traceability.
  await prisma.rateTemplateComponent.update({ where: { id: componentId }, data: { isActive: false } });
  return getRateTemplateSerialized(rateTemplateId);
}

export async function reorderComponents(rateTemplateId: number, orderedIds: number[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.rateTemplateComponent.update({ where: { id }, data: { sortOrder: index } })),
  );
  return getRateTemplateSerialized(rateTemplateId);
}

export async function setContainerRate(
  rateTemplateId: number,
  componentId: number,
  containerSizeId: number,
  rateValue: number,
) {
  await prisma.rateTemplateContainerRate.upsert({
    where: { rateTemplateComponentId_containerSizeId: { rateTemplateComponentId: componentId, containerSizeId } },
    update: { rateValue },
    create: { rateTemplateComponentId: componentId, containerSizeId, rateValue },
  });
  return getRateTemplateSerialized(rateTemplateId);
}

export async function removeContainerRate(rateTemplateId: number, componentId: number, containerSizeId: number) {
  await prisma.rateTemplateContainerRate.delete({
    where: { rateTemplateComponentId_containerSizeId: { rateTemplateComponentId: componentId, containerSizeId } },
  });
  return getRateTemplateSerialized(rateTemplateId);
}

export interface ComponentSyncInput {
  id?: number;
  label: string;
  componentType: ComponentType;
  isTax: boolean;
  fixedValue?: number | null;
  percentageValue?: number | null;
  containerRates?: { containerSizeId: number; rateValue: number }[];
  textValue?: string | null;
  remark?: string | null;
}

/**
 * Replaces the full component list for a template in one transaction: updates matching ids,
 * creates new ones, and soft-deletes (isActive=false) any active component no longer present —
 * never hard-deletes, since existing quotations may reference a component id for traceability.
 */
export async function replaceComponents(rateTemplateId: number, components: ComponentSyncInput[]) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.rateTemplateComponent.findMany({
      where: { rateTemplateId, isActive: true },
      include: { containerRates: true },
    });
    const incomingIds = new Set(components.filter((c) => c.id).map((c) => c.id));

    for (const existingComponent of existing) {
      if (!incomingIds.has(existingComponent.id)) {
        await tx.rateTemplateComponent.update({ where: { id: existingComponent.id }, data: { isActive: false } });
      }
    }

    for (const [index, component] of components.entries()) {
      const componentId = component.id
        ? (
            await tx.rateTemplateComponent.update({
              where: { id: component.id },
              data: {
                label: component.label,
                componentType: component.componentType,
                isTax: component.isTax,
                fixedValue: component.fixedValue ?? null,
                percentageValue: component.percentageValue ?? null,
                sortOrder: index,
                textValue: component.textValue ?? null,
                remark: component.remark ?? null,
              },
            })
          ).id
        : (
            await tx.rateTemplateComponent.create({
              data: {
                rateTemplateId,
                label: component.label,
                componentType: component.componentType,
                isTax: component.isTax,
                fixedValue: component.fixedValue ?? null,
                percentageValue: component.percentageValue ?? null,
                sortOrder: index,
                textValue: component.textValue ?? null,
                remark: component.remark ?? null,
              },
            })
          ).id;

      if (component.componentType === "PER_CONTAINER") {
        const existingRates = existing.find((c) => c.id === componentId)?.containerRates ?? [];
        const incomingSizeIds = new Set((component.containerRates ?? []).map((r) => r.containerSizeId));
        for (const rate of existingRates) {
          if (!incomingSizeIds.has(rate.containerSizeId)) {
            await tx.rateTemplateContainerRate.delete({ where: { id: rate.id } });
          }
        }
        for (const rate of component.containerRates ?? []) {
          await tx.rateTemplateContainerRate.upsert({
            where: { rateTemplateComponentId_containerSizeId: { rateTemplateComponentId: componentId, containerSizeId: rate.containerSizeId } },
            update: { rateValue: rate.rateValue },
            create: { rateTemplateComponentId: componentId, containerSizeId: rate.containerSizeId, rateValue: rate.rateValue },
          });
        }
      }
    }
  });

  return getRateTemplateSerialized(rateTemplateId);
}

// ---------- Versioning ----------

/** Clones the template + its active components + container rates as a new version; the old version is kept but deactivated. */
export async function createNewVersion(rateTemplateId: number, createdById: number) {
  const source = await prisma.rateTemplate.findUniqueOrThrow({
    where: { id: rateTemplateId },
    include: { components: { where: { isActive: true }, include: { containerRates: true } } },
  });
  if (!source.isActive) throw new HttpError(400, "Cannot version an already-inactive template");

  const created = await prisma.$transaction(async (tx) => {
    const clone = await tx.rateTemplate.create({
      data: {
        name: source.name,
        quotationType: source.quotationType,
        version: source.version + 1,
        isDefault: source.isDefault,
        createdById,
        location: source.location,
      },
    });

    for (const component of source.components) {
      const newComponent = await tx.rateTemplateComponent.create({
        data: {
          rateTemplateId: clone.id,
          label: component.label,
          componentType: component.componentType,
          isTax: component.isTax,
          fixedValue: component.fixedValue,
          percentageValue: component.percentageValue,
          sortOrder: component.sortOrder,
        },
      });
      if (component.containerRates.length > 0) {
        await tx.rateTemplateContainerRate.createMany({
          data: component.containerRates.map((r) => ({
            rateTemplateComponentId: newComponent.id,
            containerSizeId: r.containerSizeId,
            rateValue: r.rateValue,
          })),
        });
      }
    }

    if (source.isDefault) {
      await tx.rateTemplate.updateMany({
        where: { quotationType: source.quotationType, isDefault: true, id: { not: clone.id } },
        data: { isDefault: false },
      });
    }
    await tx.rateTemplate.update({ where: { id: source.id }, data: { isDefault: false } });

    return clone.id;
  });

  return getRateTemplateSerialized(created);
}
