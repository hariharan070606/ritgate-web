export function isPdfAttachment(uri?: string): boolean {
  if (!uri) return false;
  const normalized = uri.toLowerCase();
  return normalized.endsWith('.pdf') || normalized.startsWith('data:application/pdf');
}
