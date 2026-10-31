import type { Building } from '@ma3000/shared';
import { useEffect, useState } from 'react';
import { api, errorText } from '../api';
import { BUILDING_TYPE } from '../labels';

export function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.buildings().then(setBuildings, (e) => setError(errorText(e)));
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>הבניינים שלי</h1>
        <a className="button" href="#/new">
          + בניין חדש
        </a>
      </div>
      {error && <p className="error">{error}</p>}
      {buildings?.length === 0 && (
        <section className="card empty">
          <p>עוד אין בניינים. אשף ההקמה ייצור את מבנה הבניין (כניסות, קומות, דירות ואלמנטים) בכמה שאלות.</p>
          <a className="button" href="#/new">
            הקמת בניין ראשון
          </a>
        </section>
      )}
      <div className="grid">
        {buildings?.map((b) => (
          <a key={b.id} className="card building-card" href={`#/b/${b.id}`}>
            <h2>{b.name}</h2>
            <p className="muted">{[b.address, b.city].filter(Boolean).join(', ') || 'ללא כתובת'}</p>
            <p>
              {BUILDING_TYPE[b.type]} · {b.floorsAbove} קומות
              {b.floorsBelow > 0 && ` + ${b.floorsBelow} מתחת לקרקע`}
            </p>
          </a>
        ))}
      </div>
    </>
  );
}
