async function getUploadCredentials(): Promise<{ token: string; apiBase: string }> {
  const res = await fetch('/api/admin/upload-token', { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Nuk u mor leja për ngarkimin e fotove');
  }
  return { token: data.token, apiBase: data.apiBase };
}

export async function uploadProductImageDirect(
  productId: string,
  formData: FormData
): Promise<unknown> {
  const { token, apiBase } = await getUploadCredentials();

  const res = await fetch(`${apiBase}/api/admin/products/${productId}/images`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = Array.isArray(data.details)
      ? data.details.map((d: { message?: string }) => d.message).filter(Boolean).join('; ')
      : '';
    throw new Error(data.error || details || `Upload failed: ${res.status}`);
  }
  return data;
}
