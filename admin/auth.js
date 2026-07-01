
/**
 * auth.js — Sesión y cliente Supabase para el panel admin.
 * Requiere que config.js y el SDK de Supabase (CDN) se carguen antes que este script.
 */

// Nombre distinto a "supabase": el bundle UMD del CDN ya expone ese global,
// y redeclararlo con const/let revienta el script entero con un SyntaxError.
const supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

/**
 * Verifica que haya una sesión activa. Si no la hay, redirige a login.html.
 * Llamar al inicio de toda página protegida del admin.
 */
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '/admin/login.html';
        return null;
    }
    return session;
}

/**
 * Cierra la sesión actual y redirige a login.html.
 */
async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = '/admin/login.html';
}

function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
