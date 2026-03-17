export const formatPhone = (jid: string | null): string => {
  if (!jid) return '';
  const clean = jid.replace(/@s\.whatsapp\.net$/, '');
  if (clean.length === 13)
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 9)}-${clean.slice(9)}`;
  if (clean.length === 12)
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 8)}-${clean.slice(8)}`;
  return clean;
};
