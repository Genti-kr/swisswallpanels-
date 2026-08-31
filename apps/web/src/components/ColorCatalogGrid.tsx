'use client';

import { useLocale } from 'next-intl';
import { ColorCatalogDTO } from '@swisswall/types';
import { resolveMediaUrl } from '@/lib/media-url';
import { Check, X, ZoomIn } from 'lucide-react';
import { useState } from 'react';

type Props = {
  catalog: ColorCatalogDTO;
  selectedCode?: string | null;
  onSelect?: (code: string) => void;
  compact?: boolean;
};

export function ColorCatalogGrid({ catalog, selectedCode, onSelect, compact = false }: Props) {
  const locale = useLocale();
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const previewSwatch = previewCode
    ? catalog.swatches.find((s) => s.code === previewCode)
    : null;

  const catalogName =
    catalog.nameJson[locale as keyof typeof catalog.nameJson] || catalog.nameJson.de;

  return (
    <div className="space-y-6">
      {!compact && (
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest block">
            {catalogName}
          </span>
          <p className="text-sm text-zinc-500 font-light">
            {catalog.descJson[locale as keyof typeof catalog.descJson] || catalog.descJson.de}
          </p>
        </div>
      )}

      {catalog.swatches.length === 0 ? (
        <p className="text-center text-sm text-zinc-400 py-8">—</p>
      ) : (
        <div
          className={`grid gap-4 ${
            compact
              ? 'grid-cols-2 sm:grid-cols-4'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-5xl mx-auto'
          }`}
        >
          {catalog.swatches.map((swatch) => {
            const name =
              swatch.nameJson[locale as keyof typeof swatch.nameJson] || swatch.nameJson.de;
            const isSelected = selectedCode === swatch.code;

            return (
              <button
                key={swatch.id}
                type="button"
                onClick={() => {
                  if (onSelect) {
                    onSelect(swatch.code);
                  } else {
                    setPreviewCode(swatch.code);
                  }
                }}
                className={`group text-left rounded-2xl border overflow-hidden transition-all duration-300 ${
                  isSelected
                    ? 'border-[#C8B89A] ring-2 ring-[#C8B89A]/30 shadow-md'
                    : 'border-zinc-100 hover:border-[#C8B89A]/40 hover:shadow-md'
                } ${onSelect ? 'cursor-pointer' : 'cursor-zoom-in'}`}
              >
                <div className="relative aspect-square bg-zinc-100 overflow-hidden">
                  <img
                    src={resolveMediaUrl(swatch.thumbnailUrl)}
                    alt={name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center shadow">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {!compact && !onSelect && (
                    <span className="absolute bottom-2 right-2 p-1.5 rounded-full bg-white/90 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div className="p-3 bg-white">
                  <p className="text-xs font-semibold text-zinc-900 truncate">{name}</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{swatch.code}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {previewSwatch && !compact && !onSelect && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewCode(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {previewSwatch.nameJson[locale as keyof typeof previewSwatch.nameJson] ||
                    previewSwatch.nameJson.de}
                </p>
                <p className="text-xs text-zinc-400 font-mono">{previewSwatch.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCode(null)}
                className="p-2 rounded-full hover:bg-zinc-100 text-zinc-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={resolveMediaUrl(previewSwatch.imageUrl)}
              alt={previewSwatch.code}
              className="w-full aspect-square object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}
