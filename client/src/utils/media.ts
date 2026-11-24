const UPLOADS_ORIGIN = 'http://localhost:5000/uploads';

export function resolveUploadUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }
  if (value.startsWith('/uploads/')) return `http://localhost:5000${value}`;
  if (value.startsWith('/')) return value;
  return `${UPLOADS_ORIGIN}/${value}`;
}

export function resolveAvatarUrl(value: string | null | undefined): string {
  return resolveUploadUrl(value) ?? '/Defpfp.png';
}
