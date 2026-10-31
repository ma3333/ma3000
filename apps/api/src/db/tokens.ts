import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const CONFIG = Symbol('CONFIG');
export const PG_POOL = Symbol('PG_POOL');
export const DB = Symbol('DB');
export const REDIS = Symbol('REDIS');

export type Database = NodePgDatabase;
