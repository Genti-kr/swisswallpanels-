'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ProductDTO, CategoryDTO, ProductImageDTO } from '@swisswall/types';
import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media-url';
import { ProductPhotoFrame } from '@/components/ProductPhotoFrame';
import {
  Plus,
  Pencil,
  Trash2,
  ImagePlus,
  Star,
  X,
  Package,
  Layers,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const emptyMultilingual = { de: '', fr: '', en: '', sq: '' };
const locales = ['de', 'fr', 'en', 'sq'] as const;
const localeLabels = { de: 'Deutsch', fr: 'Français', en: 'English', sq: 'Shqip' };

type FormState = {
  slug: string;
  sku: string;
  categoryId: string;
  nameJson: typeof emptyMultilingual;
  descJson: typeof emptyMultilingual;
  priceChf: number;
  priceBtwChf: number;
  stockQuantity: number;
  thickness_mm: number;
  width_mm: number;
  height_mm: number;
  isFeatured: boolean;
  isActive: boolean;
};

type PendingProductImage = {
  localId: string;
  file: File;
  previewUrl: string;
  isPrimary: boolean;
};

const defaultForm = (categoryId = ''): FormState => ({
  slug: '',
  sku: '',
  categoryId,
  nameJson: { ...emptyMultilingual },
  descJson: { ...emptyMultilingual },
  priceChf: 0,
  priceBtwChf: 0,
  stockQuantity: 0,
  thickness_mm: 12,
  width_mm: 600,
  height_mm: 2400,
  isFeatured: false,
  isActive: true,
});

function formatCHF(value: number) {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
  }).format(value);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingImages, setEditingImages] = useState<ProductImageDTO[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeLocale, setActiveLocale] = useState<(typeof locales)[number]>('de');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(defaultForm());
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearPendingImages = useCallback(() => {
    setPendingImages((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.previewUrl);
      return [];
    });
  }, []);

  const uploadPendingBatch = async (productId: string, batch: PendingProductImage[]) => {
    if (!batch.length) return;
    const primary = batch.find((p) => p.isPrimary)?.localId ?? batch[0].localId;
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      const fd = new FormData();
      fd.append('image', item.file);
      fd.append('isPrimary', item.localId === primary ? 'true' : 'false');
      await apiFetch(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        body: fd,
      });
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [prodRes, catRes] = await Promise.all([
        apiFetch<{ items: ProductDTO[] }>('/api/admin/products'),
        apiFetch<{ items: CategoryDTO[] }>('/api/categories'),
      ]);
      setProducts(prodRes.items);
      setCategories(catRes.items);
      setForm((f) => ({ ...f, categoryId: f.categoryId || catRes.items[0]?.id || '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dështoi ngarkimi i produkteve');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    clearPendingImages();
    setForm(defaultForm(categories[0]?.id || ''));
    setEditingId(null);
    setEditingImages([]);
    setShowForm(false);
    setActiveLocale('de');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const nameJson = { ...form.nameJson };
      const descJson = { ...form.descJson };
      for (const loc of locales) {
        if (!nameJson[loc]) nameJson[loc] = nameJson.de;
        if (!descJson[loc]) descJson[loc] = descJson.de;
      }

      const existingProduct = editingId
        ? products.find((p) => p.id === editingId)
        : undefined;
      const priorSpecs =
        (existingProduct?.specsJson as Record<string, unknown> | undefined) ?? {};

      const payload = {
        slug: form.slug,
        sku: form.sku,
        categoryId: form.categoryId,
        nameJson,
        descJson,
        priceChf: form.priceChf,
        priceBtwChf: form.priceBtwChf || form.priceChf,
        stockQuantity: form.stockQuantity,
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        specsJson: {
          ...priorSpecs,
          thickness_mm: form.thickness_mm,
          width_mm: form.width_mm,
          height_mm: form.height_mm,
        },
      };

      if (editingId) {
        await apiFetch(`/api/admin/products/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        const res = await apiFetch<{ product: ProductDTO }>('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const newId = res.product.id;
        setEditingId(newId);
        if (pendingImages.length > 0) {
          await uploadPendingBatch(newId, pendingImages);
          clearPendingImages();
        }
        const list = await apiFetch<{ items: ProductDTO[] }>('/api/admin/products');
        const created = list.items.find((p) => p.id === newId);
        if (created) setEditingImages(created.images);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dështoi ruajtja');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p: ProductDTO) => {
    const specs = (p.specsJson ?? {}) as {
      thickness_mm?: number;
      width_mm?: number;
      height_mm?: number;
    };
    clearPendingImages();
    setEditingId(p.id);
    setEditingImages(p.images);
    setForm({
      slug: p.slug,
      sku: p.sku,
      categoryId: p.categoryId,
      nameJson: p.nameJson,
      descJson: p.descJson,
      priceChf: p.priceChf,
      priceBtwChf: p.priceBtwChf,
      stockQuantity: p.stockQuantity,
      thickness_mm: specs.thickness_mm ?? 12,
      width_mm: specs.width_mm ?? 600,
      height_mm: specs.height_mm ?? 2400,
      isFeatured: p.isFeatured,
      isActive: p.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Fshi këtë produkt?')) return;
    try {
      await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dështoi fshirja');
    }
  };

  const uploadImages = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!fileArray.length) return;

    if (!editingId) {
      setError('');
      setPendingImages((prev) => {
        const hasPrimary = prev.some((p) => p.isPrimary);
        const next = [...prev];
        fileArray.forEach((file, i) => {
          next.push({
            localId: crypto.randomUUID(),
            file,
            previewUrl: URL.createObjectURL(file),
            isPrimary: !hasPrimary && prev.length === 0 && i === 0,
          });
        });
        return next;
      });
      return;
    }

    setUploading(true);
    setError('');
    try {
      for (let i = 0; i < fileArray.length; i++) {
        const fd = new FormData();
        fd.append('image', fileArray[i]);
        fd.append('isPrimary', i === 0 && editingImages.length === 0 ? 'true' : 'false');
        await apiFetch(`/api/admin/products/${editingId}/images`, {
          method: 'POST',
          body: fd,
        });
      }
      const res = await apiFetch<{ items: ProductDTO[] }>('/api/admin/products');
      const updated = res.items.find((p) => p.id === editingId);
      if (updated) setEditingImages(updated.images);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dështoi ngarkimi i fotografive');
    } finally {
      setUploading(false);
    }
  };

  const removePendingImage = (localId: string) => {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const rest = prev.filter((p) => p.localId !== localId);
      if (rest.length && !rest.some((p) => p.isPrimary)) {
        rest[0] = { ...rest[0], isPrimary: true };
      }
      return rest;
    });
  };

  const setPrimaryPendingImage = (localId: string) => {
    setPendingImages((prev) =>
      prev.map((p) => ({ ...p, isPrimary: p.localId === localId }))
    );
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!editingId || !confirm('Fshi këtë fotografi?')) return;
    try {
      await apiFetch(`/api/admin/products/${editingId}/images/${imageId}`, {
        method: 'DELETE',
      });
      setEditingImages((imgs) => imgs.filter((img) => img.id !== imageId));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dështoi fshirja e fotografisë');
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    if (!editingId) return;
    try {
      await apiFetch(`/api/admin/products/${editingId}/images/${imageId}/primary`, {
        method: 'PATCH',
      });
      setEditingImages((imgs) =>
        imgs.map((img) => ({ ...img, isPrimary: img.id === imageId }))
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dështoi vendosja e fotos kryesore');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadImages(e.dataTransfer.files);
  };

  const activeCount = products.filter((p) => p.isActive).length;
  const lowStockCount = products.filter((p) => p.stockQuantity <= 5).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">
            Admin Panel
          </span>
          <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1">Produkte</h1>
          <p className="text-zinc-500 text-sm font-light mt-1">
            Menaxho katalogun, çmimet dhe fotografitë e produkteve
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 shadow-md"
        >
          <Plus className="w-4 h-4" />
          Produkt i ri
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Produkte', value: products.length, icon: Package },
          { label: 'Aktive', value: activeCount, icon: CheckCircle2 },
          { label: 'Stok i ulët', value: lowStockCount, icon: AlertCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-zinc-100 p-5 flex items-center gap-4 shadow-sm"
          >
            <div className="w-11 h-11 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#C8B89A]" />
            </div>
            <div>
              <div className="text-2xl font-light text-zinc-900">{value}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={resetForm}
          />
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-zinc-100 my-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <div>
                <h2 className="text-xl font-light text-zinc-900">
                  {editingId ? 'Ndrysho produktin' : 'Produkt i ri'}
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  {editingId ? 'Përditëso të dhënat dhe fotografitë' : 'Plotëso të dhënat bazë'}
                </p>
              </div>
              <button
                onClick={resetForm}
                className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Basic fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Slug" required>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className={inputClass}
                    placeholder="akustik-panel-eiche"
                    required
                  />
                </Field>
                <Field label="SKU" required>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className={inputClass}
                    placeholder="SWP-001"
                    required
                  />
                </Field>
                <Field label="Kategoria" required>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className={inputClass}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameJson.de}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Stoku (copë paneli)">
                  <input
                    type="number"
                    min="0"
                    value={form.stockQuantity}
                    onChange={(e) =>
                      setForm({ ...form, stockQuantity: Number(e.target.value) })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-[#F8F8F6]/60 p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-800">
                    Dimensionet e panelit
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1.5 font-light leading-relaxed">
                    Matjet e mëposhtme janë për <strong className="font-medium text-zinc-700">një copë</strong>{' '}
                    panel (1 copë). Klienti porosit sa copë të duhen; totali = copë × çmimi për copë.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Trashësia (mm) — 1 copë" required>
                    <input
                      type="number"
                      min="1"
                      value={form.thickness_mm}
                      onChange={(e) =>
                        setForm({ ...form, thickness_mm: Number(e.target.value) })
                      }
                      className={inputClass}
                      required
                    />
                  </Field>
                  <Field label="Gjerësia (mm) — 1 copë" required>
                    <input
                      type="number"
                      min="1"
                      value={form.width_mm}
                      onChange={(e) =>
                        setForm({ ...form, width_mm: Number(e.target.value) })
                      }
                      className={inputClass}
                      required
                    />
                  </Field>
                  <Field label="Lartësia (mm) — 1 copë" required>
                    <input
                      type="number"
                      min="1"
                      value={form.height_mm}
                      onChange={(e) =>
                        setForm({ ...form, height_mm: Number(e.target.value) })
                      }
                      className={inputClass}
                      required
                    />
                  </Field>
                </div>

                <div className="border-t border-zinc-200/70 pt-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-800">
                      Cakto çmimin
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1.5 font-light">
                      Vendos çmimin në CHF për <strong className="font-medium text-zinc-700">1 copë</strong> panel
                      (me TVSH). Në shop dhe kalkulator: totali = numri i copave × ky çmim.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Çmimi për 1 copë (CHF)" required>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.priceChf || ''}
                        onChange={(e) =>
                          setForm({ ...form, priceChf: Number(e.target.value) })
                        }
                        className={inputClass}
                        required
                      />
                    </Field>
                    <Field label="Çmimi B2B për 1 copë (CHF)">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.priceBtwChf || ''}
                        onChange={(e) =>
                          setForm({ ...form, priceBtwChf: Number(e.target.value) })
                        }
                        className={inputClass}
                        placeholder={form.priceChf ? String(form.priceChf) : ''}
                      />
                    </Field>
                  </div>
                  {form.priceChf > 0 && (
                    <p className="text-xs text-zinc-600 bg-white/80 border border-zinc-100 rounded-xl px-4 py-3">
                      Shembull:{' '}
                      <span className="font-semibold text-zinc-900">
                        3 copë × {formatCHF(form.priceChf)} = {formatCHF(form.priceChf * 3)}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Multilingual tabs */}
              <div>
                <div className="flex gap-1 mb-3 border-b border-zinc-100">
                  {locales.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setActiveLocale(loc)}
                      className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                        activeLocale === loc
                          ? 'border-[#C8B89A] text-[#1A1A1A]'
                          : 'border-transparent text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      {localeLabels[loc]}
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  <Field label={`Emri (${localeLabels[activeLocale]})`} required>
                    <input
                      value={form.nameJson[activeLocale]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          nameJson: { ...form.nameJson, [activeLocale]: e.target.value },
                        })
                      }
                      className={inputClass}
                      required={activeLocale === 'de'}
                    />
                  </Field>
                  <Field label={`Përshkrimi (${localeLabels[activeLocale]})`} required>
                    <textarea
                      value={form.descJson[activeLocale]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          descJson: { ...form.descJson, [activeLocale]: e.target.value },
                        })
                      }
                      className={`${inputClass} h-24 resize-none`}
                      required={activeLocale === 'de'}
                    />
                  </Field>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="rounded border-zinc-300 text-[#C8B89A] focus:ring-[#C8B89A]"
                  />
                  <span className="text-sm text-zinc-700">Featured (kryesor në faqe)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-zinc-300 text-[#C8B89A] focus:ring-[#C8B89A]"
                  />
                  <span className="text-sm text-zinc-700">Aktiv (i dukshëm në shop)</span>
                </label>
              </div>

              {/* Images section */}
              <div className="border-t border-zinc-100 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <ImagePlus className="w-5 h-5 text-[#C8B89A]" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">
                    Fotografitë e produktit
                  </h3>
                </div>

                <p className="text-xs text-zinc-500 mb-4 font-light">
                  Shto foto edhe para se të ruash produktin e ri — ngarkohen automatikisht kur
                  klikon &quot;Ruaj produktin&quot;.
                </p>
                  <div className="space-y-4">
                    {pendingImages.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {pendingImages.map((img) => (
                          <div
                            key={img.localId}
                            className={`relative group rounded-xl overflow-hidden border-2 aspect-square bg-[#F8F8F6] flex items-center justify-center p-2 ${
                              img.isPrimary ? 'border-[#C8B89A]' : 'border-amber-200/80'
                            }`}
                          >
                            <img
                              src={img.previewUrl}
                              alt=""
                              className="max-w-full max-h-full w-auto h-auto object-contain"
                            />
                            <span className="absolute top-2 right-2 bg-amber-100 text-amber-900 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                              E re
                            </span>
                            {img.isPrimary && (
                              <span className="absolute top-2 left-2 bg-[#C8B89A] text-[#1A1A1A] text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" />
                                Kryesore
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {!img.isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => setPrimaryPendingImage(img.localId)}
                                  className="p-2 bg-white rounded-lg text-zinc-800 hover:bg-[#C8B89A] transition-colors"
                                  title="Vendos si kryesore"
                                >
                                  <Star className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removePendingImage(img.localId)}
                                className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                title="Fshi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Existing images */}
                    {editingImages.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {editingImages.map((img) => (
                          <div
                            key={img.id}
                            className={`relative group rounded-xl overflow-hidden border-2 aspect-square bg-[#F8F8F6] flex items-center justify-center p-2 ${
                              img.isPrimary
                                ? 'border-[#C8B89A]'
                                : 'border-zinc-100'
                            }`}
                          >
                            <img
                              src={resolveMediaUrl(img.url)}
                              alt=""
                              className="max-w-full max-h-full w-auto h-auto object-contain"
                            />
                            {img.isPrimary && (
                              <span className="absolute top-2 left-2 bg-[#C8B89A] text-[#1A1A1A] text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" />
                                Kryesore
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {!img.isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimary(img.id)}
                                  className="p-2 bg-white rounded-lg text-zinc-800 hover:bg-[#C8B89A] transition-colors"
                                  title="Vendos si kryesore"
                                >
                                  <Star className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteImage(img.id)}
                                className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                title="Fshi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                        dragOver
                          ? 'border-[#C8B89A] bg-[#C8B89A]/5'
                          : 'border-zinc-200 hover:border-[#C8B89A] hover:bg-[#F8F8F6]'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) =>
                          e.target.files && uploadImages(e.target.files)
                        }
                      />
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2 text-zinc-500">
                          <Loader2 className="w-8 h-8 animate-spin text-[#C8B89A]" />
                          <span className="text-sm">Duke ngarkuar...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-zinc-500">
                          <Upload className="w-8 h-8 text-[#C8B89A]" />
                          <span className="text-sm font-medium text-zinc-700">
                            Kliko ose tërhiq fotografi këtu
                          </span>
                          <span className="text-xs">PNG, JPG, WEBP — max 10MB</span>
                        </div>
                      )}
                    </div>
                  </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-zinc-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingId ? 'Përditëso' : 'Ruaj produktin'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-zinc-200 rounded-xl text-xs font-semibold uppercase tracking-wider text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Mbyll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#C8B89A]" />
          <span className="text-sm">Duke ngarkuar produktet...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-16 text-center">
          <Layers className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500 font-light">Nuk ka produkte ende.</p>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="mt-4 text-[#C8B89A] text-sm font-semibold hover:underline"
          >
            Shto produktin e parë
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {products.map((p) => {
            const primaryImage = p.images.find((i) => i.isPrimary) || p.images[0];
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="relative p-3 pb-0">
                  {primaryImage ? (
                    <ProductPhotoFrame
                      src={primaryImage.url}
                      alt={p.nameJson.de}
                      variant="card"
                    />
                  ) : (
                    <div className="aspect-[4/3] rounded-xl bg-[#F8F8F6] flex flex-col items-center justify-center text-zinc-400 gap-2 border border-zinc-100">
                      <ImagePlus className="w-10 h-10" />
                      <span className="text-xs">Pa foto</span>
                    </div>
                  )}
                  <div className="absolute top-5 left-5 z-10 flex gap-2 pointer-events-none">
                    {p.isFeatured && (
                      <span className="bg-[#C8B89A] text-[#1A1A1A] text-[10px] font-bold uppercase px-2 py-1 rounded-full">
                        Featured
                      </span>
                    )}
                    {!p.isActive && (
                      <span className="bg-zinc-800/80 text-white text-[10px] font-bold uppercase px-2 py-1 rounded-full">
                        Joaktiv
                      </span>
                    )}
                  </div>
                  {p.images.length > 1 && (
                    <span className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                      {p.images.length} foto
                    </span>
                  )}
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-medium text-zinc-900 leading-snug">
                      {p.nameJson.de}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 font-mono">{p.sku}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-900 font-semibold">
                      {formatCHF(p.priceChf)}
                      <span className="text-zinc-400 font-normal"> / copë</span>
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        p.stockQuantity <= 5
                          ? 'bg-red-50 text-red-600'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      Stok: {p.stockQuantity}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-zinc-50">
                    <button
                      onClick={() => startEdit(p)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#F8F8F6] text-zinc-700 hover:bg-[#C8B89A]/20 hover:text-[#1A1A1A] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Ndrysho
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                      title="Fshi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full px-4 py-2.5 bg-[#F8F8F6] border border-zinc-200 rounded-xl text-sm transition-all focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] text-zinc-800';
