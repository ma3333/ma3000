import type { HealthStatus, Tenant, TenantType } from '@ma3000/shared';
import { useCallback, useEffect, useState } from 'react';
import { api, errorText, getTenantId, setTenantId } from './api';
import { TENANT_TYPE } from './labels';
import { BuildingPage } from './pages/BuildingPage';
import { BuildingsPage } from './pages/BuildingsPage';
import { CatalogPage } from './pages/CatalogPage';
import { WizardPage } from './pages/WizardPage';
import { navigate, useRoute } from './router';

function HealthDot() {
  const [health, setHealth] = useState<HealthStatus | 'error' | null>(null);
  useEffect(() => {
    api.health().then(setHealth, () => setHealth('error'));
  }, []);
  const ok = health !== null && health !== 'error' && health.status === 'ok';
  const title = health === null ? 'בודק…' : ok ? 'המערכת תקינה' : 'שרת, מסד נתונים או Redis לא זמינים';
  return (
    <span
      className={`dot ${health === null ? '' : ok ? 'dot-ok' : 'dot-bad'}`}
      title={title}
      aria-label={title}
    />
  );
}

/** Development tenant picker. Replaced by login in module 3 (identity). */
function TenantPicker({
  tenantId,
  onSelect,
}: {
  tenantId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<TenantType>('house_committee');
  const [error, setError] = useState('');

  const load = useCallback(() => api.tenants().then(setTenants, (e) => setError(errorText(e))), []);
  useEffect(() => void load(), [load]);

  const create = async () => {
    try {
      const t = await api.createTenant({ name, type });
      await load();
      setCreating(false);
      setName('');
      onSelect(t.id);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <div className="tenant-picker">
      <label>
        לקוח:
        <select value={tenantId ?? ''} onChange={(e) => onSelect(e.target.value || null)}>
          <option value="">בחר לקוח…</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({TENANT_TYPE[t.type]})
            </option>
          ))}
        </select>
      </label>
      {creating ? (
        <span className="inline-form">
          <input placeholder="שם הלקוח" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value as TenantType)}>
            {Object.entries(TENANT_TYPE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button onClick={create} disabled={name.trim().length < 2}>
            צור
          </button>
          <button className="link" onClick={() => setCreating(false)}>
            ביטול
          </button>
        </span>
      ) : (
        <button className="link" onClick={() => setCreating(true)}>
          + לקוח חדש
        </button>
      )}
      {error && <span className="error">{error}</span>}
    </div>
  );
}

export function App() {
  const route = useRoute();
  const [tenantId, setTenant] = useState(getTenantId);

  const selectTenant = (id: string | null) => {
    setTenantId(id);
    setTenant(id);
    navigate('/');
  };

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/">
          ma3000 · ניהול בניינים
        </a>
        <nav>
          <a href="#/">בניינים</a>
          <a href="#/catalog">קטלוג ציוד</a>
        </nav>
        <TenantPicker tenantId={tenantId} onSelect={selectTenant} />
        <HealthDot />
      </header>
      <main className="page" key={tenantId ?? 'none'}>
        {!tenantId ? (
          <section className="card empty">
            <h1>ברוכים הבאים</h1>
            <p>בחרו לקוח בראש העמוד, או צרו לקוח חדש (ועד בית או חברת ניהול), כדי להתחיל.</p>
            <p className="muted">בשלב הפיתוח בחירת הלקוח מחליפה התחברות. מסך כניסה יתווסף במודול הזהות.</p>
          </section>
        ) : route.page === 'new' ? (
          <WizardPage />
        ) : route.page === 'building' ? (
          <BuildingPage id={route.id} />
        ) : route.page === 'catalog' ? (
          <CatalogPage />
        ) : (
          <BuildingsPage />
        )}
      </main>
    </>
  );
}
