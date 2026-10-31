-- Tenancy + building profile core (docs/18). Every tenant-owned table has tenant_id and an RLS policy.
-- The API runs tenant queries as role ma3000_app with app.tenant_id set per transaction (see src/db/tenant-db.ts).

DO $$ BEGIN
  CREATE ROLE ma3000_app NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
GRANT ma3000_app TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO ma3000_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ma3000_app;

-- Current tenant for RLS; NULL when not set, which matches no tenant rows.
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;

CREATE TABLE tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('house_committee', 'management_company', 'owner')),
  settings    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Catalogs: tenant_id NULL = platform catalog (visible to all), otherwise tenant-defined.
CREATE TABLE element_types (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid REFERENCES tenants(id),
  key                  text NOT NULL,
  name                 text NOT NULL,
  default_level        integer,
  attribute_schema     jsonb NOT NULL DEFAULT '{"fields":[]}',
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX element_types_key ON element_types (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'), key);

CREATE TABLE asset_types (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid REFERENCES tenants(id),
  key                  text NOT NULL,
  name                 text NOT NULL,
  category             text NOT NULL CHECK (category IN ('safety', 'vertical', 'water', 'electric', 'hvac', 'access', 'other')),
  life_safety          boolean NOT NULL DEFAULT false,
  base_type_id         uuid REFERENCES asset_types(id),
  attribute_schema     jsonb NOT NULL DEFAULT '{"fields":[]}',
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX asset_types_key ON asset_types (coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'), key);

CREATE TABLE buildings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id),
  name             text NOT NULL,
  type             text NOT NULL CHECK (type IN ('residential', 'office', 'mixed')),
  city             text,
  address          text,
  year_built       integer,
  floors_above     integer NOT NULL DEFAULT 0 CHECK (floors_above >= 0),
  floors_below     integer NOT NULL DEFAULT 0 CHECK (floors_below >= 0),
  attributes       jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX buildings_tenant ON buildings (tenant_id);

CREATE TABLE building_nodes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id),
  building_id      uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  parent_id        uuid REFERENCES building_nodes(id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('entrance', 'floor', 'unit', 'common_area', 'element')),
  name             text NOT NULL,
  level            integer,
  unit_type        text CHECK (unit_type IN ('apartment', 'office', 'store', 'parking', 'storage')),
  element_type_id  uuid REFERENCES element_types(id),
  sort             integer NOT NULL DEFAULT 0,
  attributes       jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'unit') = (unit_type IS NOT NULL)),
  CHECK (kind <> 'element' OR element_type_id IS NOT NULL)
);
CREATE INDEX building_nodes_building ON building_nodes (building_id, parent_id, sort);

CREATE TABLE assets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id),
  building_id      uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  node_id          uuid REFERENCES building_nodes(id) ON DELETE SET NULL,
  asset_type_id    uuid NOT NULL REFERENCES asset_types(id),
  name             text NOT NULL,
  responsibility   text NOT NULL DEFAULT 'common' CHECK (responsibility IN ('common', 'unit_owner', 'management_contract')),
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
  install_date     date,
  attributes       jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assets_building ON assets (building_id, node_id);

-- Row-level security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_self ON tenants FOR SELECT TO ma3000_app USING (id = app_current_tenant());

ALTER TABLE element_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_read ON element_types FOR SELECT TO ma3000_app
  USING (tenant_id IS NULL OR tenant_id = app_current_tenant());
CREATE POLICY catalog_write ON element_types FOR ALL TO ma3000_app
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE asset_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_read ON asset_types FOR SELECT TO ma3000_app
  USING (tenant_id IS NULL OR tenant_id = app_current_tenant());
CREATE POLICY catalog_write ON asset_types FOR ALL TO ma3000_app
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON buildings FOR ALL TO ma3000_app
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE building_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON building_nodes FOR ALL TO ma3000_app
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON assets FOR ALL TO ma3000_app
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

GRANT SELECT, INSERT, UPDATE, DELETE ON tenants, element_types, asset_types, buildings, building_nodes, assets TO ma3000_app;
