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
  creado_en timestamptz not null default now()
);

-- Índice único sobre el endpoint para evitar duplicados
create unique index if not exists suscripciones_endpoint_unique
  on suscripciones ((subscription->>'endpoint'));

-- Historial de notificaciones enviadas (para anti-spam del cron)
create table if not exists notificaciones_enviadas (
  id uuid primary key default gen_random_uuid(),
  enviado_en timestamptz not null default now()
);

-- =============================================================================
-- Row Level Security
-- - service_role (usado por /api/*) BYPASSA RLS, así que puede hacer todo.
-- - anon (usado por el frontend) solo necesita LEER tomas para el historial.
-- =============================================================================

alter table tomas enable row level security;
alter table suscripciones enable row level security;
alter table notificaciones_enviadas enable row level security;

drop policy if exists "tomas_select_anon" on tomas;
create policy "tomas_select_anon" on tomas
  for select to anon using (true);

-- Las inserciones de tomas van SIEMPRE por /api/registrar-toma (service_role),
-- así que NO creamos policy de INSERT para anon.
-- Las suscripciones y notificaciones solo se gestionan desde el backend.
