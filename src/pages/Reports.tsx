import React from 'react';

export default function Reports() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Raporlar</h2>
      <div className="text-muted" style={{ fontSize: 14 }}>
        Hangi raporlar istendiğini belirtin; bu sayfaya sekmeli bir rapor merkezi ekleyelim.
      </div>
      <div className="grid-3" style={{ marginTop: 12 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Özet</div>
          <div className="text-muted" style={{ fontSize: 12 }}>Satış, alış, kasa ve POS özetleri burada listelenecek.</div>
        </div>
      </div>
    </div>
  );
}
