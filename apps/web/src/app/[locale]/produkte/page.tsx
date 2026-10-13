import { CategoryDTO, ProductDTO } from '@swisswall/types';
import { serverFetch } from '@/lib/api';
import { fetchAllProducts } from '@/lib/fetch-all-products';
import { ProductsPageClient } from './ProductsPageClient';

async function loadCatalogForSeo(): Promise<{
  products: ProductDTO[];
  categories: CategoryDTO[];
}> {
  const [products, categoryRes] = await Promise.all([
    fetchAllProducts('/api/products').catch(() => [] as ProductDTO[]),
    serverFetch<{ items: CategoryDTO[] }>('/api/categories'),
  ]);
  return {
    products,
    categories: categoryRes?.items ?? [],
  };
}

export default async function ProductsPage() {
  const { products, categories } = await loadCatalogForSeo();

  return (
    <ProductsPageClient initialProducts={products} initialCategories={categories} />
  );
}
