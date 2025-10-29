import React from 'react';

export default function Settings() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Ayarlar</h2>
      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Genel</h3>
        <div className="grid-3">
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Firma Adı</div>
            <input className="form-control" placeholder="Örn: Finova Yazılım" disabled />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Varsayılan Para Birimi</div>
            <select className="form-control" disabled>
              <option>TRY</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Varsayılan KDV (%)</div>
            <input className="form-control" type="number" step="0.01" placeholder="Örn: 20" disabled />
          </div>
        </div>
        <div className="text-muted" style={{ marginTop: 8, fontSize: 12 }}>Not: Hangi ayarların olacağını söyledikten sonra aktif edeceğiz.</div>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Fatura</h3>
        <div className="grid-3">
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Fatura Serisi</div>
            <input className="form-control" placeholder="Örn: FNV" disabled />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Otomatik Numara</div>
            <select className="form-control" disabled>
              <option>Evet</option>
              <option>Hayır</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}


