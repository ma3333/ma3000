import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { parseRoute } from './router';

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

describe('App', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('asks to choose a tenant first and lists existing tenants', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('/platform/tenants')
          ? json([{ id: 't1', name: 'ועד הרצל 10', type: 'house_committee' }])
          : json({ status: 'ok', version: '0.1.0', time: '', checks: { database: 'up', redis: 'up' } }),
      ),
    );
    render(<App />);
    expect(screen.getByText('ברוכים הבאים')).toBeTruthy();
    expect(await screen.findByText('ועד הרצל 10 (ועד בית)')).toBeTruthy();
  });

  it('shows the buildings of the selected tenant and sends the tenant header', async () => {
    localStorage.setItem('ma3000.tenantId', '00000000-0000-0000-0000-000000000001');
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/buildings'))
        return json([
          {
            id: 'b1',
            name: 'הרצל 10',
            type: 'residential',
            city: 'חיפה',
            address: null,
            yearBuilt: null,
            floorsAbove: 4,
            floorsBelow: 1,
          },
        ]);
      if (url.endsWith('/platform/tenants')) return json([]);
      return json({ status: 'ok', version: '0.1.0', time: '', checks: { database: 'up', redis: 'up' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    expect(await screen.findByText('הרצל 10')).toBeTruthy();
    expect(screen.getByText(/1 מתחת לקרקע/)).toBeTruthy();
    const call = fetchMock.mock.calls.find(([url]) => url.endsWith('/buildings')) as unknown as [
      string,
      RequestInit,
    ];
    expect((call[1].headers as Record<string, string>)['x-tenant-id']).toBe(
      '00000000-0000-0000-0000-000000000001',
    );
  });
});

describe('parseRoute', () => {
  it('maps hashes to pages', () => {
    expect(parseRoute('#/new')).toEqual({ page: 'new' });
    expect(parseRoute('#/catalog')).toEqual({ page: 'catalog' });
    expect(parseRoute('#/b/5fb07044-a626-48be-aebc-42e7551eceee')).toEqual({
      page: 'building',
      id: '5fb07044-a626-48be-aebc-42e7551eceee',
    });
    expect(parseRoute('#/whatever')).toEqual({ page: 'buildings' });
  });
});
