'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { AddressDTO } from '@swisswall/types';
import { Loader2, Plus, Trash2, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

const emptyAddress = {
  firstName: '',
  lastName: '',
  street: '',
  houseNumber: '',
  postCode: '',
  city: '',
  canton: 'ZH',
  country: 'CH',
  type: 'shipping' as const,
  isDefault: false,
};

const fieldKeys = ['firstName', 'lastName', 'street', 'houseNumber', 'postCode', 'city'] as const;

const countryCodes = ['CH', 'DE', 'FR', 'IT'] as const;

export default function AddressesPage() {
  const t = useTranslations('Dashboard');
  const [addresses, setAddresses] = useState<AddressDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyAddress);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch<{ items: AddressDTO[] }>('/api/addresses')
      .then((res) => setAddresses(res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/addresses', { method: 'POST', body: JSON.stringify(form) });
      setForm(emptyAddress);
      setShowForm(false);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('addresses.deleteConfirm'))) return;
    await apiFetch(`/api/addresses/${id}`, { method: 'DELETE' });
    load();
  };

  const inputClass =
    'w-full mt-1.5 px-4 py-2.5 bg-[#F8F8F6] border border-zinc-200 rounded-xl text-sm transition-all focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] text-zinc-800';

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">
            {t('accountLabel')}
          </span>
          <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1">{t('addresses.title')}</h1>
          <p className="text-zinc-500 text-sm font-light mt-1">{t('addresses.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 shadow-md shrink-0"
        >
          {showForm ? (
            t('addresses.cancel')
          ) : (
            <>
              <Plus className="w-4 h-4" />
              {t('addresses.add')}
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-zinc-100 p-6 sm:p-8 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl"
        >
          {fieldKeys.map((key) => (
            <label key={key} className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {t(`addresses.fields.${key}`)} <span className="text-red-400">*</span>
              </span>
              <input
                value={form[key as keyof typeof form] as string}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className={inputClass}
                required
              />
            </label>
          ))}

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {t('addresses.country')}
            </span>
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className={inputClass}
            >
              {countryCodes.map((code) => (
                <option key={code} value={code}>
                  {t(`addresses.countries.${code}`)}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 disabled:opacity-50 shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? t('addresses.saving') : t('addresses.save')}
            </button>
          </div>
        </form>
      )}

      {loading && !showForm ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#C8B89A]" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center shadow-sm">
          <MapPin className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 font-light">{t('addresses.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="bg-white rounded-2xl border border-zinc-100 p-5 flex justify-between items-start shadow-sm hover:border-[#C8B89A]/30 transition-all duration-300 hover:shadow-md"
            >
              <div className="text-sm space-y-1">
                <p className="font-semibold text-zinc-900">
                  {addr.firstName} {addr.lastName}
                </p>
                <p className="text-zinc-500 font-light">
                  {addr.street} {addr.houseNumber}
                </p>
                <p className="text-zinc-500 font-light">
                  {addr.postCode} {addr.city}, {addr.country}
                </p>
                {addr.isDefault && (
                  <span className="inline-flex mt-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C8B89A]/15 text-[#1A1A1A] border border-[#C8B89A]/30">
                    {t('addresses.default')}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => addr.id && handleDelete(addr.id)}
                className="text-zinc-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 shrink-0"
                title={t('addresses.delete')}
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
