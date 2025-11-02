export function toCSV(rows: any[], columns: { key: string; title: string }[]) {
  const header = columns.map(c => escape((c.title || '').toString())).join(',');
  const lines = rows.map(r => columns.map(c => escape(valueOf(r[c.key]))).join(','));
  return [header, ...lines].join('\n');
}

function valueOf(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function escape(s: string) {
  // Wrap in quotes if contains comma, quote or newline; escape quotes
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}


