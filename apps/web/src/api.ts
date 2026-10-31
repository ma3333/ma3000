import type {
  Asset,
  AssetType,
  Building,
  BuildingDetails,
  BuildingNode,
  BuildingWizardInput,
  ElementType,
  HealthStatus,
  Tenant,
} from '@ma3000/shared';

const TENANT_KEY = 'ma3000.tenantId';

export const getTenantId = () => localStorage.getItem(TENANT_KEY);
export const setTenantId = (id: string | null) =>
  id ? localStorage.setItem(TENANT_KEY, id) : localStorage.removeItem(TENANT_KEY);

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly errors: string[],
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const tenantId = getTenantId();
  if (tenantId) headers['x-tenant-id'] = tenantId; // temporary until login (module 3)
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data.message === 'string' ? data.message : `שגיאה ${res.status}`;
    throw new ApiError(res.status, Array.isArray(data.errors) ? data.errors : [], message);
  }
  return data as T;
}

export const api = {
  health: () => request<HealthStatus>('GET', '/health'),
  tenants: () => request<Tenant[]>('GET', '/platform/tenants'),
  createTenant: (input: Pick<Tenant, 'name' | 'type'>) => request<Tenant>('POST', '/platform/tenants', input),
  elementTypes: () => request<ElementType[]>('GET', '/catalog/element-types'),
  assetTypes: () => request<AssetType[]>('GET', '/catalog/asset-types'),
  createAssetType: (input: unknown) => request<AssetType>('POST', '/catalog/asset-types', input),
  buildings: () => request<Building[]>('GET', '/buildings'),
  createBuilding: (input: BuildingWizardInput) => request<BuildingDetails>('POST', '/buildings', input),
  building: (id: string) => request<BuildingDetails>('GET', `/buildings/${id}`),
  addNode: (buildingId: string, input: unknown) =>
    request<BuildingNode>('POST', `/buildings/${buildingId}/nodes`, input),
  updateNode: (id: string, input: unknown) => request<BuildingNode>('PATCH', `/nodes/${id}`, input),
  removeNode: (id: string) => request<void>('DELETE', `/nodes/${id}`),
  addAsset: (buildingId: string, input: unknown) =>
    request<Asset>('POST', `/buildings/${buildingId}/assets`, input),
  removeAsset: (id: string) => request<void>('DELETE', `/assets/${id}`),
};

export const errorText = (e: unknown) =>
  e instanceof ApiError ? [e.message, ...e.errors].join(' · ') : 'השרת לא זמין. ודא שה-API רץ (pnpm dev).';
