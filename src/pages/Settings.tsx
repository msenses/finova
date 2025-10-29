import React, { useState } from 'react';

type TabKey = 'firma' | 'stok' | 'kasa_banka' | 'pos' | 'rapor';

export default function Settings() {
  const [tab, setTab] = useState<TabKey>('firma');

  const TabButton = ({ k, label }: { k: TabKey; label: string }) => (
    <button
      type="button"
      onClick={() => setTab(k)}
      className={tab === k ? 'btn' : 'btn btn-secondary'}
      style={{ padding: '8px 12px' }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Ayarlar</h2>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="toolbar" style={{ gap: 8 }}>
          <TabButton k="firma" label="Firma" />
          <TabButton k="stok" label="Stok" />
          <TabButton k="kasa_banka" label="Kasa & Banka" />
          <TabButton k="pos" label="POS" />
          <TabButton k="rapor" label="Rapor" />
        </div>
      </div>

      {tab === 'firma' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Firma Ayarları</h3>
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
          <div className="text-muted" style={{ marginTop: 8, fontSize: 12 }}>Not: Hangi alanların olacağını belirttiğinizde aktif edeceğiz.</div>
        </div>
      )}

      {tab === 'stok' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Stok Ayarları</h3>
          <div className="grid-3">
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Varsayılan Birim</div>
              <select className="form-control" disabled>
                <option>ADET</option>
                <option>KG</option>
                <option>LT</option>
                <option>PAKET</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Stok Takip</div>
              <select className="form-control" disabled>
                <option>Açık</option>
                <option>Kapalı</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {tab === 'kasa_banka' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Kasa & Banka Ayarları</h3>
          <div className="grid-3">
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Varsayılan Kasa</div>
              <input className="form-control" placeholder="Örn: Merkez Kasa" disabled />
            </div>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Varsayılan Banka</div>
              <input className="form-control" placeholder="Örn: Ziraat - TRxx" disabled />
            </div>
          </div>
        </div>
      )}

      {tab === 'pos' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>POS Ayarları</h3>
          <div className="grid-3">
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Varsayılan Komisyon (%)</div>
              <input className="form-control" type="number" step="0.01" placeholder="Örn: 2.40" disabled />
            </div>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Bloke Gün Sayısı</div>
              <input className="form-control" type="number" step="1" placeholder="Örn: 7" disabled />
            </div>
          </div>
        </div>
      )}

      {tab === 'rapor' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Rapor Ayarları</h3>
          <div className="grid-3">
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Tarih Formatı</div>
              <select className="form-control" disabled>
                <option>DD.MM.YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Para Formatı</div>
              <select className="form-control" disabled>
                <option>1.234,56</option>
                <option>1,234.56</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


