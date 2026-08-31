'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api';
import { Loader2, Save, UserCheck, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ProfilePage() {
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Common');
  const { user, fetchMe } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', companyName: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        companyName: user.companyName || '',
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      await fetchMe();
      setMessage(t('profile.saved'));
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#C8B89A]" />
      </div>
    );
  }

  const inputClass =
    'w-full mt-1.5 px-4 py-2.5 bg-[#F8F8F6] border border-zinc-200 rounded-xl text-sm transition-all focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] text-zinc-800';

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest">
          {t('accountLabel')}
        </span>
        <h1 className="text-3xl font-light tracking-tight text-zinc-900 mt-1">{t('profile.title')}</h1>
        <p className="text-zinc-500 text-sm font-light mt-1">{t('profile.subtitle')}</p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-zinc-100 p-6 sm:p-8 shadow-sm space-y-5 max-w-xl"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {tc('firstName')} <span className="text-red-400">*</span>
            </span>
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className={inputClass}
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {tc('lastName')} <span className="text-red-400">*</span>
            </span>
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className={inputClass}
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{tc('email')}</span>
          <input
            value={user.email}
            disabled
            className="w-full mt-1.5 px-4 py-2.5 bg-zinc-50 border border-zinc-100 rounded-xl text-sm text-zinc-400 cursor-not-allowed"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{tc('phone')}</span>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
            placeholder="+41 79 123 45 67"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('profile.company')}</span>
          <input
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className={inputClass}
            placeholder="SwissWall Panels LLC"
          />
        </label>

        {message && (
          <div
            className={`flex items-start gap-2.5 p-4 rounded-xl text-sm border ${
              isError
                ? 'bg-red-50 border-red-100 text-red-600'
                : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}
          >
            {isError ? (
              <AlertCircle className="w-5 h-5 shrink-0" />
            ) : (
              <UserCheck className="w-5 h-5 shrink-0" />
            )}
            <p>{message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 disabled:opacity-50 shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
      </form>
    </div>
  );
}
