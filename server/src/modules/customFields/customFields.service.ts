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
    orderBy: { createdAt: "asc" },
  });
}

export async function createCustomField(input: {
  label: string;
  type: string;
  required?: boolean;
  options?: string | null;
}) {
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
  }
) {
  const field = await prisma.customField.findUnique({ where: { id } });
  if (!field) {
    throw new HttpError(404, "Custom field not found.");
  }

  const data: any = {
    required: input.required,
    options: input.options,
    isActive: input.isActive,
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

export async function deleteCustomField(id: number) {
  const field = await prisma.customField.findUnique({ where: { id } });
  if (!field) {
    throw new HttpError(404, "Custom field not found.");
  }

  // Soft delete / deactivate so historical quotation custom field values remain valid
  return prisma.customField.update({
    where: { id },
    data: { isActive: false },
  });
}
