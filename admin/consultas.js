/**
 * consultas.js — Bandeja de consultas del formulario de contacto (tabla consultas).
 * Requiere config.js y auth.js cargados antes (expone supabaseClient y escapeHtml).
 */

const TIPOS = {
    impresora: 'Impresora',
    scanner: 'Scanner',
    'servicio-tecnico': 'Servicio Técnico',
    otro: 'Otro',
};

let filtroActual = 'nueva';

const lista = document.getElementById('consultas-lista');
const globalMessageEl = document.getElementById('global-message');

function mostrarError(texto) {
    globalMessageEl.textContent = texto;
    globalMessageEl.className = 'form-message mb-3 form-message-error';
}

function formatearFecha(iso) {
    return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function linkWhatsapp(telefono) {
    const numero = String(telefono || '').replace(/\D/g, '');
    return numero ? `https://wa.me/${numero}` : null;
}

function renderConsulta(c) {
    const wa = linkWhatsapp(c.telefono);
    const accion = c.estado === 'nueva'
        ? `<button class="btn btn-sm btn-outline-success btn-estado" data-id="${c.id}" data-nuevo="atendida"><i class="bi bi-check2 me-1"></i>Marcar atendida</button>`
        : `<button class="btn btn-sm btn-outline-light btn-estado" data-id="${c.id}" data-nuevo="nueva"><i class="bi bi-arrow-counterclockwise me-1"></i>Volver a nueva</button>`;

    return `
        <div class="card bg-card-custom border-custom p-3">
            <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                <div>
                    <span class="fw-bold">${escapeHtml(c.nombre)}</span>
                    <span class="badge bg-secondary ms-2">${escapeHtml(TIPOS[c.tipo] || c.tipo || '—')}</span>
                    ${c.estado === 'nueva' ? '<span class="badge bg-danger ms-1">Nueva</span>' : ''}
                </div>
                <small class="text-muted-custom">${formatearFecha(c.created_at)}</small>
            </div>
            <p class="mb-3" style="white-space: pre-wrap;">${escapeHtml(c.descripcion)}</p>
            <div class="d-flex flex-wrap align-items-center gap-2">
                <a href="mailto:${escapeHtml(c.email)}" class="btn btn-sm btn-outline-light"><i class="bi bi-envelope me-1"></i>${escapeHtml(c.email)}</a>
                ${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-light"><i class="bi bi-whatsapp me-1"></i>${escapeHtml(c.telefono)}</a>` : ''}
                <span class="ms-auto">${accion}</span>
            </div>
        </div>
    `;
}

async function cargarConsultas() {
    globalMessageEl.className = 'form-message d-none mb-3';
    let query = supabaseClient
        .from('consultas')
        .select('*')
        .eq('cliente_id', CONFIG.clienteId)
        .order('created_at', { ascending: false })
        .limit(200);

    if (filtroActual !== 'todas') query = query.eq('estado', filtroActual);

    const { data, error } = await query;
    if (error) {
        lista.innerHTML = '';
        mostrarError('No se pudieron cargar las consultas.');
        return;
    }

    lista.innerHTML = data.length
        ? data.map(renderConsulta).join('')
        : '<p class="text-muted-custom">No hay consultas en esta vista.</p>';
}

async function cambiarEstado(id, estado) {
    const { error } = await supabaseClient
        .from('consultas')
        .update({ estado })
        .eq('id', id)
        .eq('cliente_id', CONFIG.clienteId);

    if (error) {
        mostrarError('No se pudo actualizar la consulta.');
        return;
    }
    cargarConsultas();
}

document.getElementById('filtros').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-estado]');
    if (!btn) return;
    document.querySelectorAll('#filtros .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroActual = btn.dataset.estado;
    cargarConsultas();
});

lista.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-estado');
    if (btn) cambiarEstado(btn.dataset.id, btn.dataset.nuevo);
});

document.getElementById('logout-btn').addEventListener('click', logout);

checkAuth().then((user) => { if (user) cargarConsultas(); });
