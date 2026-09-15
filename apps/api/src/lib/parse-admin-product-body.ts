import { productSchema } from './validators/product';
import { resolveCategoryIdByName } from './resolve-category';

export async function parseAdminProductCreateBody(body: Record<string, unknown>) {
  const { panelOptions, categoryName, ...rest } = body;
  if (typeof categoryName === 'string' && categoryName.trim()) {
    rest.categoryId = await resolveCategoryIdByName(categoryName);
  }
  const data = productSchema.parse(rest);
  return { data, panelOptions };
}

export async function parseAdminProductUpdateBody(body: Record<string, unknown>) {
  const { panelOptions, categoryName, ...rest } = body;
  if (typeof categoryName === 'string' && categoryName.trim()) {
    rest.categoryId = await resolveCategoryIdByName(categoryName);
  }
  const data = productSchema.partial().parse(rest);
  return { data, panelOptions };
}
