import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('shows the status of each dependency in Hebrew', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            status: 'degraded',
            version: '0.1.0',
            time: '',
            checks: { database: 'up', redis: 'down' },
          }),
      }),
    );
    render(<App />);
    expect(await screen.findByText('מסד נתונים')).toBeTruthy();
    expect(screen.getAllByText('תקין')).toHaveLength(2);
    expect(screen.getByText('לא זמין')).toBeTruthy();
  });

  it('explains when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<App />);
    expect(await screen.findByText(/השרת לא זמין/)).toBeTruthy();
  });
});
