'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SiteImageDTO, SiteImageSection } from '@swisswall/types';
import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media-url';
import {
  ImagePlus,
  Trash2,
  Upload,
  Loader2,
  AlertCircle,
  Images,
  Info,
  CheckCircle2,
  LayoutGrid,
} from 'lucide-react';

const locales = ['de', 'fr', 'en', 'sq'] as const;
const localeLabels = { de: 'Deutsch', fr: 'Français', en: 'English', sq: 'Shqip' };

const emptyAlt = { de: '', fr: '', en: '', sq: '' };

const inputClass =
  'w-full px-4 py-2.5 bg-[#F8F8F6] border border-zinc-200 rounded-xl text-sm transition-all focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] text-zinc-800';

const tabs: { id: SiteImageSection; label: string; icon: typeof Images; hint: string }[] = [
  {
    id: 'GALLERY',
    label: 'Gallery',
    icon: LayoutGrid,
    hint: 'Fotot shfaqen në seksionin Gallery të faqes kryesore',
  },
  {
    id: 'ABOUT',
    label: 'About Us',
    icon: Info,
    hint: 'Foto kryesore pranë tekstit "Rreth Nesh"',
  },
];

export default function AdminContentPage() {
  const [images, setImages] = useState<SiteImageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<SiteImageSection | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<SiteImageSection>('GALLERY');
  const [dragOver, setDragOver] = useState(false);
  const [altForm, setAltForm] = useState(emptyAlt);
  const [activeLocale, setActiveLocale] = useState<(typeof locales)[number]>('de');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ items: SiteImageDTO[] }>('/api/admin/site/images');
      setImages(res.items);
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
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const galleryImages = images.filter((img) => img.section === 'GALLERY');
  const aboutImages = images.filter((img) => img.section === 'ABOUT');
  const currentImages = activeTab === 'GALLERY' ? galleryImages : aboutImages;
  const activeTabMeta = tabs.find((t) => t.id === activeTab)!;

  const uploadImages = async (files: FileList | File[], section: SiteImageSection) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!fileArray.length) return;

    setUploading(section);
    setError('');
    setSuccess('');
    try {
      for (const file of fileArray) {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('section', section);
        const hasAlt = Object.values(altForm).some((v) => v.trim());
        if (hasAlt) {
          fd.append('altJson', JSON.stringify(altForm));
        }
        await apiFetch('/api/admin/site/images', { method: 'POST', body: fd });
      }
      setAltForm(emptyAlt);
      setSuccess(
        section === 'GALLERY'
          ? `${fileArray.length} fotografi u ngarkuan në Gallery`
          : 'Fotografia About Us u përditësua'
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dështoi ngarkimi i fotografive');
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Fshi këtë fotografi?')) return;
    setError('');
    try {
      await apiFetch(`/api/admin/site/images/${id}`, { method: 'DELETE' });
      setSuccess('Fotografia u fshi');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dështoi fshirja');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      uploadImages(e.dataTransfer.files, activeTab);
    }
  };

  const getAltText = (img: SiteImageDTO, locale: string) => {
    const alt = img.altJson as Record<string, string> | null;
    return alt?.[locale] || alt?.de || '—';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">
          Admin Panel
        </span>
        <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1">
          Përmbajtja e faqes
        </h1>
        <p className="text-zinc-500 text-sm font-light mt-1">
          Menaxho fotografitë e Gallery dhe About Us në faqen kryesore
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Gallery', value: galleryImages.length, icon: LayoutGrid },
          { label: 'About Us', value: aboutImages.length, icon: Info },
          { label: 'Gjithsej', value: images.length, icon: Images },
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

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              activeTab === id
                ? 'bg-[#1A1A1A] text-white shadow-md'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:border-[#C8B89A] hover:text-[#1A1A1A]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === id ? 'bg-white/15 text-white' : 'bg-[#F8F8F6] text-zinc-500'
              }`}
            >
              {id === 'GALLERY' ? galleryImages.length : aboutImages.length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Upload panel */}
        <div className="xl:col-span-4">
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden sticky top-24">
            <div className="p-6 border-b border-zinc-100 bg-gradient-to-r from-[#F8F8F6] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                  <ImagePlus className="w-5 h-5 text-[#C8B89A]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-800">
                    {activeTab === 'GALLERY' ? 'Shto në Gallery' : 'Ndrysho About Us'}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5 font-light">{activeTabMeta.hint}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {activeTab === 'ABOUT' && (
                <div className="flex items-start gap-3 p-4 bg-amber-50/80 border border-amber-100 rounded-xl text-amber-800 text-xs leading-relaxed">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>About Us përdor vetëm një fotografi. Ngarkimi i një të re zëvendëson atë ekzistuese.</p>
                </div>
              )}

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-3">
                  Teksti alt (opsional)
                </span>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {locales.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setActiveLocale(loc)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border-b-2 ${
                        activeLocale === loc
                          ? 'border-[#C8B89A] text-[#1A1A1A] bg-[#F8F8F6]'
                          : 'border-transparent text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      {localeLabels[loc]}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={altForm[activeLocale]}
                  onChange={(e) =>
                    setAltForm((prev) => ({ ...prev, [activeLocale]: e.target.value }))
                  }
                  placeholder={`Përshkrimi i fotos (${localeLabels[activeLocale]})`}
                  className={inputClass}
                />
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                  dragOver
                    ? 'border-[#C8B89A] bg-[#C8B89A]/5 scale-[1.01]'
                    : 'border-zinc-200 hover:border-[#C8B89A] hover:bg-[#F8F8F6]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple={activeTab === 'GALLERY'}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      uploadImages(e.target.files, activeTab);
                      e.target.value = '';
                    }
                  }}
                />
                {uploading === activeTab ? (
                  <div className="flex flex-col items-center gap-3 text-zinc-500">
                    <Loader2 className="w-9 h-9 animate-spin text-[#C8B89A]" />
                    <span className="text-sm font-medium">Duke ngarkuar...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#F8F8F6] flex items-center justify-center">
                      <Upload className="w-7 h-7 text-[#C8B89A]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-700">
                        Tërhiq foto këtu ose kliko
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">PNG, JPG, WEBP — max 10MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Gallery grid */}
        <div className="xl:col-span-8">
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">
                {activeTab === 'GALLERY' ? 'Fotot e Gallery' : 'Foto About Us'}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 font-light">
                {currentImages.length}{' '}
                {currentImages.length === 1 ? 'fotografi' : 'fotografi'} aktive
              </p>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-[#C8B89A]" />
                  <span className="text-sm text-zinc-400 font-light">Duke ngarkuar...</span>
                </div>
              ) : currentImages.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
                    <Images className="w-8 h-8 text-zinc-300" />
                  </div>
                  <p className="text-zinc-500 font-light">
                    {activeTab === 'GALLERY'
                      ? 'Nuk ka fotografi në Gallery ende.'
                      : 'Nuk ka fotografi About Us ende.'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-2">
                    Ngarko fotografinë e parë nga paneli majtas
                  </p>
                </div>
              ) : activeTab === 'ABOUT' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {currentImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-2xl overflow-hidden border-2 border-[#C8B89A]/30 shadow-sm"
                    >
                      <div className="aspect-[4/3] bg-zinc-50">
                        <img
                          src={resolveMediaUrl(img.url)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="absolute top-3 left-3 bg-[#C8B89A] text-[#1A1A1A] text-[10px] font-bold uppercase px-2.5 py-1 rounded-full">
                        About Us
                      </span>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(img.id)}
                          className="p-2.5 bg-white rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                          title="Fshi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {img.altJson && (
                        <div className="p-4 border-t border-zinc-100 bg-[#F8F8F6]/50">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                            Alt text
                          </p>
                          <p className="text-sm text-zinc-600">{getAltText(img, 'de')}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="rounded-2xl border border-zinc-100 bg-[#F8F8F6]/50 p-6 space-y-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8B89A]">
                      Parapamje faqe
                    </span>
                    <h4 className="text-xl font-light text-zinc-900">Rreth Nesh</h4>
                    <p className="text-sm text-zinc-500 font-light leading-relaxed">
                      Kështu shfaqet seksioni About Us në faqen kryesore — foto majtas, tekst
                      djathtas.
                    </p>
                    <div className="h-1 w-12 bg-[#C8B89A] rounded-full" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {currentImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className="group relative bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <div className="aspect-[4/5] bg-zinc-50">
                        <img
                          src={resolveMediaUrl(img.url)}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        #{idx + 1}
                      </span>
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(img.id)}
                          className="p-2.5 bg-white rounded-xl text-red-600 hover:bg-red-50 transition-colors shadow-lg"
                          title="Fshi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {img.altJson && (
                        <div className="px-3 py-2.5 border-t border-zinc-50 bg-white">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider truncate">
                            {getAltText(img, 'de')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
