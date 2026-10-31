import type { CheckState, HealthStatus } from '@ma3000/shared';
import { useEffect, useState } from 'react';

type Load = { kind: 'loading' } | { kind: 'ready'; health: HealthStatus } | { kind: 'error' };

const LABELS: Record<keyof HealthStatus['checks'], string> = { database: 'מסד נתונים', redis: 'Redis' };

function StateBadge({ state }: { state: CheckState }) {
  return <span className={`badge badge-${state}`}>{state === 'up' ? 'תקין' : 'לא זמין'}</span>;
}

export function App() {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json() as Promise<HealthStatus>)
      .then((health) => setLoad({ kind: 'ready', health }))
      .catch(() => setLoad({ kind: 'error' }));
  }, []);

  return (
    <main className="page">
      <h1>שלום! מערכת ניהול הבניינים</h1>
      <p className="subtitle">בדיקת חיבור: אפליקציה ← שרת ← מסד נתונים</p>

      <section className="card" aria-live="polite">
        <h2>מצב המערכת</h2>
        {load.kind === 'loading' && <p>בודק…</p>}
        {load.kind === 'error' && <p className="error">השרת לא זמין. ודא שה-API רץ (pnpm dev).</p>}
        {load.kind === 'ready' && (
          <ul className="checks">
            <li>
              שרת (API) <StateBadge state="up" />
            </li>
            {(Object.keys(LABELS) as (keyof HealthStatus['checks'])[]).map((key) => (
              <li key={key}>
                {LABELS[key]} <StateBadge state={load.health.checks[key]} />
              </li>
            ))}
            <li className="muted">גרסה {load.health.version}</li>
          </ul>
        )}
      </section>
    </main>
  );
}
