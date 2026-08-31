'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ColorCatalogDTO, ColorSwatchDTO } from '@swisswall/types';
import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media-url';
import {
  Palette,
  Plus,
  Trash2,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ImagePlus,
} from 'lucide-react';

const locales = ['de', 'fr', 'en', 'sq'] as const;
const localeLabels = { de: 'Deutsch', fr: 'Français', en: 'English', sq: 'Shqip' };

const emptyMultilingual = { de: '', fr: '', en: '', sq: '' };

const inputClass =
  'w-full px-4 py-2.5 bg-[#F8F8F6] border border-zinc-200 rounded-xl text-sm transition-all focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] text-zinc-800';

export default function AdminCatalogPage() {
  const [catalogs, setCatalogs] = useState<ColorCatalogDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeLocale, setActiveLocale] = useState<(typeof locales)[number]>('de');
  const [showNewCatalog, setShowNewCatalog] = useState(false);
  const [newCatalog, setNewCatalog] = useState({
    slug: '',
    nameJson: { ...emptyMultilingual },
    descJson: { ...emptyMultilingual },
  });
  const [swatchForm, setSwatchForm] = useState({
    code: '',
    nameJson: { ...emptyMultilingual },
  });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCatalog = catalogs.find((c) => c.id === selectedId) || catalogs[0] || null;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ items: ColorCatalogDTO[] }>('/api/admin/catalogs');
      setCatalogs(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dështoi ngarkimi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (catalogs.length > 0 && !selectedId) {
      setSelectedId(catalogs[0].id);
    }
  }, [catalogs, selectedId]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const handleCreateCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch('/api/admin/catalogs', {
        method: 'POST',
        body: JSON.stringify(newCatalog),
      });
      setShowNewCatalog(false);
      setNewCatalog({ slug: '', nameJson: { ...emptyMultilingual }, descJson: { ...emptyMultilingual } });
      setSuccess('Katalogu u krijua');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dështoi krijimi');
    } finally {
      setSaving(false);
    }
  };

  const uploadSwatch = async (file: File) => {
    if (!selectedCatalog) return;
    const code = swatchForm.code.trim().toUpperCase();
    if (!code) {
      setError('Vendos kodin e ngjyrës (p.sh. AMF-326)');
      return;
    }

    const duplicate = selectedCatalog.swatches.some(
      (s) => s.code.trim().toUpperCase() === code
    );
    if (duplicate) {
      setError(`Kodi "${code}" ekziston tashmë në këtë katalog. Përdor një kod tjetër ose fshi ngjyrën ekzistuese.`);
      return;
    }

    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('code', code);
      const hasNames = Object.values(swatchForm.nameJson).some((v) => v.trim());
      if (hasNames) {
        fd.append('nameJson', JSON.stringify(swatchForm.nameJson));
      }
      await apiFetch(`/api/admin/catalogs/${selectedCatalog.id}/swatches`, {
        method: 'POST',
        body: fd,
      });
      setSwatchForm({ code: '', nameJson: { ...emptyMultilingual } });
      setSuccess('Ngjyra u shtua në katalog');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Dështoi ngarkimi i fotos';
      if (/already exists/i.test(msg)) {
        setError(`Kodi "${code}" ekziston tashmë në këtë katalog. Përdor një kod tjetër ose fshi ngjyrën ekzistuese.`);
      } else {
        setError(msg);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSwatch = async (swatch: ColorSwatchDTO) => {
    if (!confirm(`Fshi ${swatch.code}?`)) return;
    setError('');
    try {
      await apiFetch(`/api/admin/catalogs/swatches/${swatch.id}`, { method: 'DELETE' });
      setSuccess('Ngjyra u fshi');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dështoi fshirja');
    }
  };

  const handleDeleteCatalog = async () => {
    if (!selectedCatalog) return;
    if (!confirm(`Fshi katalogun "${selectedCatalog.slug}" dhe të gjitha ngjyrat?`)) return;
    setError('');
    try {
      await apiFetch(`/api/admin/catalogs/${selectedCatalog.id}`, { method: 'DELETE' });
      setSelectedId(null);
      setSuccess('Katalogu u fshi');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dështoi fshirja');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">Admin Panel</span>
          <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1">Katalogu i Ngjyrave</h1>
          <p className="text-sm text-zinc-500 font-light mt-1">
            Menaxho koleksionet e ngjyrave dhe ngarko fotot e swatch-ve
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewCatalog(!showNewCatalog)}
          className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all"
        >
          <Plus className="w-4 h-4" />
          Katalog i Ri
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl text-sm border bg-red-50 border-red-100 text-red-600">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl text-sm border bg-emerald-50 border-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {showNewCatalog && (
        <form
          onSubmit={handleCreateCatalog}
          className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-4"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Katalog i Ri</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Slug (p.sh. amf)</span>
              <input
                value={newCatalog.slug}
                onChange={(e) => setNewCatalog({ ...newCatalog, slug: e.target.value.toLowerCase() })}
                className={inputClass}
                placeholder="amf"
                required
                pattern="[a-z0-9-]+"
              />
            </label>
            {locales.map((loc) => (
              <label key={`name-${loc}`} className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Emri ({localeLabels[loc]})
                </span>
                <input
                  value={newCatalog.nameJson[loc]}
                  onChange={(e) =>
                    setNewCatalog({
                      ...newCatalog,
                      nameJson: { ...newCatalog.nameJson, [loc]: e.target.value },
                    })
                  }
                  className={inputClass}
                  required
                />
              </label>
            ))}
            {locales.map((loc) => (
              <label key={`desc-${loc}`} className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Përshkrimi ({localeLabels[loc]})
                </span>
                <input
                  value={newCatalog.descJson[loc]}
                  onChange={(e) =>
                    setNewCatalog({
                      ...newCatalog,
                      descJson: { ...newCatalog.descJson, [loc]: e.target.value },
                    })
                  }
                  className={inputClass}
                  required
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Krijo Katalogun
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#C8B89A]" />
        </div>
      ) : catalogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
          <Palette className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500">Nuk ka kataloge ende. Krijo katalogun e parë AMF.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          <aside className="bg-white rounded-2xl border border-zinc-100 p-3 shadow-sm space-y-1 h-fit lg:block">
            <div className="lg:hidden mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">
                Katalogu
              </label>
              <select
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
                className={inputClass}
              >
                {catalogs.map((catalog) => (
                  <option key={catalog.id} value={catalog.id}>
                    {catalog.nameJson.de || catalog.slug}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden lg:block space-y-1">
            {catalogs.map((catalog) => (
              <button
                key={catalog.id}
                type="button"
                onClick={() => setSelectedId(catalog.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                  selectedCatalog?.id === catalog.id
                    ? 'bg-[#1A1A1A] text-white font-medium'
                    : 'text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {catalog.nameJson.de || catalog.slug}
                <span className="block text-[10px] opacity-60 font-mono mt-0.5">{catalog.slug}</span>
              </button>
            ))}
            </div>
          </aside>

          {selectedCatalog && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-light text-zinc-900">{selectedCatalog.nameJson.de}</h2>
                  <p className="text-xs text-zinc-400 font-mono mt-1">/{selectedCatalog.slug}</p>
                  <p className="text-sm text-zinc-500 mt-2">{selectedCatalog.swatches.length} ngjyra</p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteCatalog}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Fshi Katalogun
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <ImagePlus className="w-4 h-4 text-[#C8B89A]" />
                  Shto Ngjyrë të Re
                </h3>

                <div className="flex gap-2 border-b border-zinc-100 pb-3">
                  {locales.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setActiveLocale(loc)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                        activeLocale === loc
                          ? 'bg-[#1A1A1A] text-white'
                          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                      }`}
                    >
                      {localeLabels[loc]}
                    </button>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Kodi <span className="text-red-400">*</span>
                    </span>
                    <input
                      value={swatchForm.code}
                      onChange={(e) =>
                        setSwatchForm({ ...swatchForm, code: e.target.value.toUpperCase() })
                      }
                      className={inputClass}
                      placeholder="AMF-326"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Emri ({localeLabels[activeLocale]})
                    </span>
                    <input
                      value={swatchForm.nameJson[activeLocale]}
                      onChange={(e) =>
                        setSwatchForm({
                          ...swatchForm,
                          nameJson: { ...swatchForm.nameJson, [activeLocale]: e.target.value },
                        })
                      }
                      className={inputClass}
                      placeholder="Anthrazit"
                    />
                  </label>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) uploadSwatch(file);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                    dragOver ? 'border-[#C8B89A] bg-[#C8B89A]/5' : 'border-zinc-200 bg-zinc-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadSwatch(file);
                      e.target.value = '';
                    }}
                  />
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-[#C8B89A] mx-auto" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
                      <p className="text-sm text-zinc-600 font-medium">Tërhiq foto swatch këtu</p>
                      <p className="text-xs text-zinc-400 mt-1">ose</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-3 inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all"
                      >
                        Zgjidh Fotografi
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedCatalog.swatches.map((swatch) => (
                  <div
                    key={swatch.id}
                    className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm group"
                  >
                    <div className="aspect-square bg-zinc-100 relative">
                      <img
                        src={resolveMediaUrl(swatch.thumbnailUrl)}
                        alt={swatch.code}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteSwatch(swatch)}
                        className="absolute top-2 right-2 p-2 rounded-full bg-white/90 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-zinc-900 truncate">
                        {swatch.nameJson.de || swatch.code}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-mono">{swatch.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
