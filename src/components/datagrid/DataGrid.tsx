import React from 'react';

export type DataGridColumn<T> = {
  key: keyof T | string;
  title: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => React.ReactNode;
};

export type DataGridFetchArgs = {
  page: number;
  pageSize: number;
  sortBy?: string | null;
  sortDir?: 'asc' | 'desc' | null;
  search?: string;
  filters?: Record<string, any>;
};

export type DataGridFetchResult<T> = { rows: T[]; total: number };

type Props<T> = {
  tableKey: string;
  columns: DataGridColumn<T>[];
  fetchData: (args: DataGridFetchArgs) => Promise<DataGridFetchResult<T>>;
  defaultPageSize?: number;
  toolbar?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
};

export function DataGrid<T extends { id: string }>(props: Props<T>) {
  const { tableKey, columns, fetchData, defaultPageSize = 20, toolbar, rowActions } = props;

  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(defaultPageSize);
  const [sortBy, setSortBy] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc' | null>(null);
  const [search, setSearch] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [rows, setRows] = React.useState<T[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [visibleMap, setVisibleMap] = React.useState<Record<string, boolean>>({});

  const visibleColumns = React.useMemo(() => {
    if (!columns?.length) return [] as DataGridColumn<T>[];
    return columns.filter(c => visibleMap[c.key as string] !== false);
  }, [columns, visibleMap]);

  React.useEffect(() => {
    // init column visibility from localStorage
    const key = `grid:${tableKey}:columns`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) setVisibleMap(JSON.parse(saved));
    } catch {}
  }, [tableKey]);

  function setColumnVisible(key: string, visible: boolean) {
    setVisibleMap((prev) => {
      const next = { ...prev, [key]: visible };
      try { localStorage.setItem(`grid:${tableKey}:columns`, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const { rows, total } = await fetchData({ page, pageSize, sortBy, sortDir, search });
      setRows(rows);
      setTotal(total);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortDir, search, fetchData]);

  React.useEffect(() => { void reload(); }, [reload]);

  function onSort(colKey: string) {
    if (sortBy !== colKey) {
      setSortBy(colKey);
      setSortDir('asc');
    } else {
      setSortDir(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
      if (sortDir === null) setSortBy(null);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="form-control"
          placeholder="Ara..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ minWidth: 260 }}
        />
        <button className="btn btn-secondary" onClick={() => void reload()} disabled={loading}>Yenile</button>
        {toolbar}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <select className="form-control" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}>
            {[10, 20, 50, 100].map(ps => <option key={ps} value={ps}>{ps}/sayfa</option>)}
          </select>
          <div className="text-muted" style={{ fontSize: 12 }}>{total} kayıt</div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              {visibleColumns.map((c) => (
                <th key={String(c.key)} style={{ width: c.width }} onClick={() => onSort(String(c.key))}>
                  <span style={{ cursor: 'pointer', userSelect: 'none' }}>
                    {c.title}
                    {sortBy === c.key && sortDir ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </span>
                </th>
              ))}
              {rowActions && <th style={{ width: 160 }}>İşlemler</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {visibleColumns.map((c) => (
                  <td key={String(c.key)} style={{ textAlign: c.align ?? 'left' }}>
                    {c.render ? c.render(r) : (r as any)[c.key]}
                  </td>
                ))}
                {rowActions && (
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {rowActions(r)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={(visibleColumns.length + (rowActions ? 1 : 0))}>
                  {loading ? 'Yükleniyor...' : 'Kayıt bulunamadı.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}>Önceki</button>
        <div className="text-muted" style={{ fontSize: 12 }}>{page} / {pageCount}</div>
        <button className="btn btn-secondary" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page >= pageCount || loading}>Sonraki</button>
        <div className="text-muted" style={{ fontSize: 12 }}>Sayfa: </div>
        <input className="form-control" style={{ width: 70 }} value={page} onChange={(e) => setPage(Math.max(1, Math.min(pageCount, parseInt(e.target.value || '1', 10) || 1)))} />
      </div>

      <details style={{ marginTop: 8 }}>
        <summary>Kolonlar</summary>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 8 }}>
          {columns.map((c) => {
            const visible = visibleMap[c.key as string] !== false;
            return (
              <label key={String(c.key)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={visible} onChange={(e) => setColumnVisible(String(c.key), e.target.checked)} />
                {c.title}
              </label>
            );
          })}
        </div>
      </details>
    </div>
  );
}


