// Types shared between the API and the web app.

export type CheckState = 'up' | 'down';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  version: string;
  time: string;
  checks: {
    database: CheckState;
    redis: CheckState;
  };
}
