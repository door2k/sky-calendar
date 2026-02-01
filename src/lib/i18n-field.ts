export function lf(obj: any, field: string, lang: string): string {
  if (lang === 'he') return obj[`${field}_he`] || obj[field] || '';
  return obj[field] || '';
}
