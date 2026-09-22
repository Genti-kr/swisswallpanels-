/** Shared admin content area styles (readable on light cards). */
export const adminInputClass =
  'border border-zinc-200 rounded-xl px-4 py-3 text-sm w-full text-zinc-900 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#C8B89A]/40 focus:border-[#C8B89A]';

export const adminSelectClass = `${adminInputClass} max-w-xs cursor-pointer`;

export const adminTextareaClass = `${adminInputClass} resize-none`;

export const adminCardClass = 'bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm text-zinc-900';

export const adminSectionTitleClass =
  'text-sm font-semibold uppercase tracking-wider text-zinc-700';

export const adminRowLabelClass = 'text-zinc-700';

export const adminRowValueClass = 'font-semibold text-zinc-900 tabular-nums';

export const adminMainClass =
  'flex-1 p-4 lg:p-8 overflow-auto text-zinc-900 [&_input:not([type=checkbox]):not([type=radio])]:text-zinc-900 [&_input:not([type=checkbox]):not([type=radio])]:bg-white [&_select]:text-zinc-900 [&_select]:bg-white [&_textarea]:text-zinc-900 [&_textarea]:bg-white [&_option]:text-zinc-900';
