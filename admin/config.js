/**
 * config.js — Adaptador de configuración para el panel admin.
 * Toma los valores públicos de /supabase-config.js (cargado antes) para no duplicarlos.
 * La anon key es pública por diseño: la seguridad la dan las políticas RLS de Supabase.
 */
const CONFIG = {
    supabaseUrl: SUPABASE_CONFIG.url,
    supabaseKey: SUPABASE_CONFIG.anonKey,
    clienteId: SUPABASE_CONFIG.clienteId,
};
