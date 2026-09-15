import { productSchema } from './validators/product';
import { resolveCategoryIdByName } from './resolve-category';

const LOCALES = ['de', 'fr', 'en', 'sq'] as const;

function normalizeProductTextFields(rest: Record<string, unknown>) {
  const nameJson = { ...(rest.nameJson as Record<string, string>) };
  const descJson = { ...(rest.descJson as Record<string, string>) };

  for (const loc of LOCALES) {
    if (!nameJson[loc]?.trim()) {
      nameJson[loc] = nameJson.de?.trim() || nameJson.en?.trim() || 'Product';
    }
  }
  for (const loc of LOCALES) {
    if (!descJson[loc]?.trim()) {
      descJson[loc] = nameJson[loc] || nameJson.de;
    }
  }

  rest.nameJson = nameJson;
  rest.descJson = descJson;
}

async function applyCategoryFromBody(rest: Record<string, unknown>, categoryName: unknown) {
  if (typeof categoryName === 'string' && categoryName.trim()) {
    rest.categoryId = await resolveCategoryIdByName(categoryName);
  }
  if (typeof rest.categoryId !== 'string' || !rest.categoryId.trim()) {
    const err = new Error('CATEGORY_REQUIRED');
    err.name = 'CategoryRequiredError';
    throw err;
  }
}

export async function parseAdminProductCreateBody(body: Record<string, unknown>) {
  const { panelOptions, categoryName, ...rest } = body;
  await applyCategoryFromBody(rest, categoryName);
  normalizeProductTextFields(rest);
  const data = productSchema.parse(rest);
  return { data, panelOptions };
}

export async function parseAdminProductUpdateBody(body: Record<string, unknown>) {
  const { panelOptions, categoryName, ...rest } = body;
  if (typeof categoryName === 'string' && categoryName.trim()) {
    rest.categoryId = await resolveCategoryIdByName(categoryName);
  }
  if (rest.nameJson !== undefined || rest.descJson !== undefined) {
    normalizeProductTextFields(rest);
  }
  const data = productSchema.partial().parse(rest);
  return { data, panelOptions };
}
