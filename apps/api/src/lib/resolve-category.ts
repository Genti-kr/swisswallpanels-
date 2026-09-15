import { prisma } from './prisma';

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function slugFromCategoryName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'kategori';
}

async function uniqueCategorySlug(baseSlug: string): Promise<string> {
  let candidate = baseSlug;
  let n = 0;
  while (await prisma.category.findUnique({ where: { slug: candidate } })) {
    n += 1;
    candidate = `${baseSlug}-${n}`;
  }
  return candidate;
}

/** Finds existing category by any locale name, or creates one with the given label. */
export async function resolveCategoryIdByName(name: string): Promise<string> {
  const label = name.trim();
  if (!label) {
    throw new Error('Category name is required');
  }

  const categories = await prisma.category.findMany();
  const needle = normalizeName(label);
  for (const category of categories) {
    const nameJson = category.nameJson as Record<string, string>;
    for (const value of Object.values(nameJson)) {
      if (typeof value === 'string' && normalizeName(value) === needle) {
        return category.id;
      }
    }
  }

  const slug = await uniqueCategorySlug(slugFromCategoryName(label));
  const nameJson = { de: label, fr: label, en: label, sq: label };
  const created = await prisma.category.create({
    data: {
      slug,
      nameJson,
      descJson: {},
    },
  });
  return created.id;
}
