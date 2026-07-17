-- =============================================================================
-- Migration: añadir tabla stock para avisos de pastillas bajas.
-- Esta migración es idempotente: puede ejecutarse varias veces sin error.
-- =============================================================================

create table if not exists stock (
  id uuid primary key default gen_random_uuid(),
  cantidad integer not null default 0 check (cantidad >= 0),
  actualizado_en timestamptz not null default now(),
  ultimo_aviso_nivel text
    check (ultimo_aviso_nivel in ('bajo', 'critico') or ultimo_aviso_nivel is null),
  ultimo_aviso_en timestamptz
);

-- Fila única inicial (idempotente)
insert into stock (cantidad)
select 0
where not exists (select 1 from stock);

-- RLS + policy de lectura para anon (el frontend la consume via supabase-js)
alter table stock enable row level security;

drop policy if exists "stock_select_anon" on stock;
create policy "stock_select_anon" on stock
  for select to anon using (true);
