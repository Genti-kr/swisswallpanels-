/** Upload via same-origin Next route (proxies to API) — avoids browser CORS to Hetzner. */
export async function uploadProductImageDirect(
  productId: string,
  formData: FormData
): Promise<unknown> {
  const res = await fetch(`/api/admin/products/${productId}/images`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = Array.isArray(data.details)
      ? data.details.map((d: { message?: string }) => d.message).filter(Boolean).join('; ')
      : '';
    const msg =
      data.error ||
      data.message ||
      details ||
      (res.status === 503
        ? 'API ose storage (R2) nuk është i arritshëm. Kontrollo serverin dhe R2_PUBLIC_URL.'
        : `Upload failed: ${res.status}`);
    throw new Error(msg);
  }
  return data;
}
