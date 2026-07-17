-- =============================================================================
-- Pastillas Perro NFC - schema de Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → pegar y Run
-- =============================================================================

create extension if not exists "pgcrypto";

-- Tomas registradas
create table if not exists tomas (
  id uuid primary key default gen_random_uuid(),
  fecha_hora timestamptz not null default now(),
  metodo text not null check (metodo in ('manual', 'nfc'))
);

create index if not exists tomas_fecha_hora_desc_idx
  on tomas (fecha_hora desc);

-- Suscripciones push (de todos los dispositivos de la familia)
create table if not exists suscripciones (
  id uuid primary key default gen_random_uuid(),
  subscription jsonb not null,
  -- Columna generada con el endpoint, necesaria para poder hacer
  -- upsert con onConflict desde PostgREST (un unique index sobre una
  -- expresión como (subscription->>'endpoint') NO es válido como
  -- target de ON CONFLICT en PostgREST).
  endpoint text generated always as (subscription->>'endpoint') stored,
  creado_en timestamptz not null default now()
);

-- Constraint único sobre la columna generada (PostgREST lo reconoce como
-- target válido de ON CONFLICT).
alter table suscripciones
  add constraint suscripciones_endpoint_unique unique (endpoint);

-- Historial de notificaciones enviadas (para anti-spam del cron)
create table if not exists notificaciones_enviadas (
  id uuid primary key default gen_random_uuid(),
  enviado_en timestamptz not null default now()
);

-- Stock de pastillas en la caja. Una sola fila (se inicializa con cantidad 0).
-- ultimo_aviso_nivel sirve para no spamear: solo notificamos cuando CRUZA un
-- umbral (null -> bajo, null -> critico, bajo -> critico). Se resetea al reponer.
create table if not exists stock (
  id uuid primary key default gen_random_uuid(),
  cantidad integer not null default 0 check (cantidad >= 0),
  actualizado_en timestamptz not null default now(),
  ultimo_aviso_nivel text
    check (ultimo_aviso_nivel in ('bajo', 'critico') or ultimo_aviso_nivel is null),
  ultimo_aviso_en timestamptz
);

-- Fila única de stock (idempotente)
insert into stock (cantidad)
select 0
where not exists (select 1 from stock);

-- =============================================================================
-- Row Level Security
-- - service_role (usado por /api/*) BYPASSA RLS, así que puede hacer todo.
-- - anon (usado por el frontend) solo necesita LEER tomas para el historial.
-- =============================================================================

alter table tomas enable row level security;
alter table suscripciones enable row level security;
alter table notificaciones_enviadas enable row level security;
alter table stock enable row level security;

drop policy if exists "tomas_select_anon" on tomas;
create policy "tomas_select_anon" on tomas
  for select to anon using (true);

drop policy if exists "stock_select_anon" on stock;
create policy "stock_select_anon" on stock
  for select to anon using (true);

-- Las inserciones de tomas van SIEMPRE por /api/registrar-toma (service_role),
-- así que NO creamos policy de INSERT para anon.
-- Las suscripciones, stock y notificaciones solo se gestionan desde el backend.
