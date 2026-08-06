import { prisma } from "../../config/db.js";
import { HttpError } from "../../middleware/errorHandler.js";

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function listCustomFields(onlyActive = false) {
  return prisma.customField.findMany({
    where: onlyActive ? { isActive: true } : {},
    orderBy: [{ listOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createCustomField(input: {
  label: string;
  type: string;
  required?: boolean;
  options?: string | null;
  showInPdf?: boolean;
  showInFilter?: boolean;
  showInExport?: boolean;
  showInList?: boolean;
}) {
  const maxOrder = await prisma.customField.aggregate({ _max: { listOrder: true } });
  const name = slugify(input.label);
  if (!name) {
    throw new HttpError(400, "Invalid label. Custom field label must contain alphanumeric characters.");
  }

  const existing = await prisma.customField.findUnique({
    where: { name },
  });

  if (existing) {
    // If it exists but is inactive, we can reactivate it, or throw error
    if (!existing.isActive) {
      return prisma.customField.update({
        where: { id: existing.id },
        data: {
          label: input.label,
          type: input.type,
          required: input.required ?? false,
          options: input.options ?? null,
          isActive: true,
          showInPdf: input.showInPdf ?? true,
          showInFilter: input.showInFilter ?? true,
          showInExport: input.showInExport ?? true,
          showInList: input.showInList ?? true,
        },
      });
    }
    throw new HttpError(400, `A custom field with the name '${name}' already exists.`);
  }

  return prisma.customField.create({
    data: {
      name,
      label: input.label,
      type: input.type,
      required: input.required ?? false,
      options: input.options ?? null,
      showInPdf: input.showInPdf ?? true,
      showInFilter: input.showInFilter ?? true,
      showInExport: input.showInExport ?? true,
      showInList: input.showInList ?? true,
      category: "CUSTOM",
      listOrder: (maxOrder._max.listOrder ?? -1) + 1,
    },
  });
}

export async function updateCustomField(
  id: number,
  input: {
    label?: string;
    type?: string;
    required?: boolean;
    options?: string | null;
    isActive?: boolean;
    showInPdf?: boolean;
    showInFilter?: boolean;
    showInExport?: boolean;
    showInList?: boolean;
  }
) {
  const field = await prisma.customField.findUnique({ where: { id } });
  if (!field) {
    throw new HttpError(404, "Custom field not found.");
  }

  if (field.isDefault) {
    const data: any = {
      showInPdf: input.showInPdf,
      showInFilter: input.showInFilter,
      showInExport: input.showInExport,
      showInList: input.showInList,
    };
    if (field.category !== "CORE" && input.label !== undefined) {
      data.label = input.label;
    }
    return prisma.customField.update({
      where: { id },
      data,
    });
  }

  const data: any = {
    required: input.required,
    options: input.options,
    isActive: input.isActive,
    showInPdf: input.showInPdf,
    showInFilter: input.showInFilter,
    showInExport: input.showInExport,
    showInList: input.showInList,
  };

  if (input.label && input.label !== field.label) {
    const newName = slugify(input.label);
    const existing = await prisma.customField.findFirst({
      where: { name: newName, NOT: { id } },
    });
    if (existing) {
      throw new HttpError(400, `A custom field with the name '${newName}' already exists.`);
    }
    data.label = input.label;
    data.name = newName;
  }

  if (input.type) {
    data.type = input.type;
  }

  return prisma.customField.update({
    where: { id },
    data,
  });
}

export async function reorderCustomFields(orderedIds: number[]) {
  const existingCount = await prisma.customField.count({ where: { id: { in: orderedIds } } });
  if (existingCount !== orderedIds.length) throw new HttpError(400, "One or more custom fields are invalid.");

  await prisma.$transaction(
    orderedIds.map((id, listOrder) => prisma.customField.update({ where: { id }, data: { listOrder } })),
  );
  return listCustomFields(false);
}

export async function deleteCustomField(id: number) {
  const field = await prisma.customField.findUnique({ where: { id } });
  if (!field) {
    throw new HttpError(404, "Custom field not found.");
  }

  if (field.isDefault) {
    throw new HttpError(400, "Default system fields cannot be deleted.");
  }

  // Check if this field is used in any quotation
  const check: any[] = await prisma.$queryRawUnsafe(
    `SELECT id FROM quotations WHERE JSON_EXTRACT(customFields, '$.${field.name}') IS NOT NULL AND JSON_EXTRACT(customFields, '$.${field.name}') != 'null' LIMIT 1`
  );
  const isUsed = check.length > 0;

  if (isUsed) {
    throw new HttpError(400, "Cannot delete custom field because it is used in one or more quotations.");
  } else {
    // Hard delete since it has never been used in any quotation
    return prisma.customField.delete({
      where: { id },
    });
  }
}
