-- Aplicada en Supabase (proyecto tecnicax) el 2026-11-03.
-- Consultas que llegan desde el formulario público de contacto.
create table if not exists public.consultas (
    id uuid primary key default gen_random_uuid(),
    cliente_id uuid not null references public.clientes(id),
    nombre text not null check (char_length(nombre) between 1 and 120),
    email text not null check (char_length(email) between 3 and 160 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    telefono text check (telefono is null or char_length(telefono) <= 40),
    tipo text check (tipo in ('impresora','scanner','servicio-tecnico','otro')),
    descripcion text not null check (char_length(descripcion) between 1 and 2000),
    estado text not null default 'nueva' check (estado in ('nueva','atendida')),
    created_at timestamptz not null default now()
);
create index if not exists consultas_cliente_estado_idx on public.consultas (cliente_id, estado, created_at desc);
alter table public.consultas enable row level security;

-- Visitantes: solo pueden INSERTAR consultas nuevas (no leer, no editar)
create policy consultas_insert_publico on public.consultas
    for insert to anon, authenticated with check (estado = 'nueva');

-- Admins del mismo cliente: leer, actualizar y borrar
create policy consultas_select_admin on public.consultas for select to authenticated
    using ((select auth.uid()) in (select a.id from public.admin_usuarios a where a.cliente_id = consultas.cliente_id));
create policy consultas_update_admin on public.consultas for update to authenticated
    using ((select auth.uid()) in (select a.id from public.admin_usuarios a where a.cliente_id = consultas.cliente_id))
    with check ((select auth.uid()) in (select a.id from public.admin_usuarios a where a.cliente_id = consultas.cliente_id));
create policy consultas_delete_admin on public.consultas for delete to authenticated
    using ((select auth.uid()) in (select a.id from public.admin_usuarios a where a.cliente_id = consultas.cliente_id));

grant insert on public.consultas to anon;
grant select, insert, update, delete on public.consultas to authenticated;

-- Aviso del linter de seguridad
alter function public.actualizar_timestamp() set search_path = '';

-- Textos nuevos editables desde el admin
insert into public.contenido_sitio (cliente_id, seccion, clave, valor) values
 ('224b8eb5-cf36-4116-b70a-4c50a1632969','hero','etiqueta','Soluciones de Impresión Corporativa'),
 ('224b8eb5-cf36-4116-b70a-4c50a1632969','nosotros','detalle','Brindamos un ecosistema completo enfocado en optimizar tus costos operativos...')
on conflict (cliente_id, seccion, clave) do nothing;
