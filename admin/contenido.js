/**
 * contenido.js — Edición de textos del sitio (tabla contenido_sitio), agrupados por sección.
 * Requiere config.js y auth.js cargados antes (expone supabaseClient).
 */

const ETIQUETAS_SECCION = {
    hero: 'Hero',
    servicios: 'Servicios',
    nosotros: 'Nosotros',
    cta: 'CTA',
};

const ETIQUETAS_CAMPO = {
    titulo: 'Título',
    subtitulo: 'Subtítulo',
    descripcion: 'Descripción',
    cta_texto: 'Texto CTA',
};

const CLAVES_LARGAS = ['subtitulo', 'descripcion'];

/* ==========================================================================
   CAPA DE DATOS (Supabase)
   ========================================================================== */

function mensajeErrorLegible(error) {
    if (!error) return 'Ocurrió un error inesperado.';
    if (error.message && error.message.includes('Failed to fetch')) {
        return 'No se pudo conectar con el servidor. Revisá tu conexión.';
    }
    if (error.code === '42501' || error.status === 403) return 'No tenés permiso para realizar esta acción.';
    return 'No se pudo guardar la sección. Intentá de nuevo.';
}

async function fetchContenido() {
    const { data, error } = await supabaseClient
        .from('contenido_sitio')
        .select('*')
        .eq('cliente_id', CONFIG.clienteId)
        .order('seccion', { ascending: true })
        .order('clave', { ascending: true });

    return { data, error };
}

async function guardarSeccion(filas) {
    return supabaseClient
        .from('contenido_sitio')
        .upsert(filas, { onConflict: 'cliente_id,seccion,clave' })
        .select();
}

/* ==========================================================================
   CAPA DE DOM / UI
   ========================================================================== */

const contenedor = document.getElementById('secciones-container');
const globalMessageEl = document.getElementById('global-message');

function mostrarMensajeGlobal(texto, tipo) {
    globalMessageEl.textContent = texto;
    globalMessageEl.className = `form-message mb-3 form-message-${tipo}`;
    globalMessageEl.classList.remove('d-none');
}

function etiquetaSeccion(seccion) {
    return ETIQUETAS_SECCION[seccion] || seccion.charAt(0).toUpperCase() + seccion.slice(1);
}

function etiquetaCampo(clave) {
    return ETIQUETAS_CAMPO[clave] || clave.charAt(0).toUpperCase() + clave.slice(1).replace(/_/g, ' ');
}

function agruparPorSeccion(filas) {
    const grupos = {};
    filas.forEach((fila) => {
        if (!grupos[fila.seccion]) grupos[fila.seccion] = [];
        grupos[fila.seccion].push(fila);
    });
    return grupos;
}

function escapeHtml(texto) {
    return String(texto || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderCampo(fila) {
    const esLargo = CLAVES_LARGAS.includes(fila.clave);
    const idCampo = `campo-${fila.seccion}-${fila.clave}`;

    if (esLargo) {
        return `
            <div class="col-12">
                <label class="form-label" for="${idCampo}">${etiquetaCampo(fila.clave)}</label>
                <textarea id="${idCampo}" class="form-control form-dark" rows="3" data-clave="${fila.clave}">${escapeHtml(fila.valor)}</textarea>
            </div>
        `;
    }

    return `
        <div class="col-md-6">
            <label class="form-label" for="${idCampo}">${etiquetaCampo(fila.clave)}</label>
            <input type="text" id="${idCampo}" class="form-control form-dark" data-clave="${fila.clave}" value="${escapeHtml(fila.valor)}">
        </div>
    `;
}

function renderSeccion(seccion, filas, indice) {
    const idCollapse = `collapse-${seccion}`;

    return `
        <div class="accordion-item bg-card-custom border-custom">
            <h2 class="accordion-header">
                <button class="accordion-button ${indice === 0 ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#${idCollapse}">
                    ${etiquetaSeccion(seccion)}
                </button>
            </h2>
            <div id="${idCollapse}" class="accordion-collapse collapse ${indice === 0 ? 'show' : ''}">
                <div class="accordion-body">
                    <form data-seccion="${seccion}">
                        <div class="row g-3">
                            ${filas.map(renderCampo).join('')}
                        </div>

                        <div class="form-message d-none mt-3"></div>

                        <div class="mt-3">
                            <button type="submit" class="btn btn-brand btn-guardar-seccion">
                                <span class="btn-guardar-text">Guardar sección</span>
                                <span class="spinner-border spinner-border-sm d-none ms-2" role="status" aria-hidden="true"></span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function renderSecciones(grupos) {
    const secciones = Object.keys(grupos);

    if (secciones.length === 0) {
        contenedor.innerHTML = '<p class="text-muted-custom">Todavía no hay contenido cargado para este sitio.</p>';
        return;
    }

    contenedor.innerHTML = secciones
        .map((seccion, indice) => renderSeccion(seccion, grupos[seccion], indice))
        .join('');

    contenedor.querySelectorAll('form[data-seccion]').forEach((form) => {
        form.addEventListener('submit', manejarSubmitSeccion);
    });
}

function setGuardandoSeccion(form, guardando) {
    const boton = form.querySelector('.btn-guardar-seccion');
    const texto = form.querySelector('.btn-guardar-text');
    const spinner = form.querySelector('.spinner-border');
    boton.disabled = guardando;
    texto.textContent = guardando ? 'Guardando...' : 'Guardar sección';
    spinner.classList.toggle('d-none', !guardando);
}

function mostrarMensajeSeccion(form, texto, tipo) {
    const el = form.querySelector('.form-message');
    el.textContent = texto;
    el.className = `form-message mt-3 form-message-${tipo}`;
    el.classList.remove('d-none');
}

async function manejarSubmitSeccion(event) {
    event.preventDefault();
    const form = event.target;
    const seccion = form.dataset.seccion;

    const filas = Array.from(form.querySelectorAll('[data-clave]')).map((campo) => ({
        cliente_id: CONFIG.clienteId,
        seccion,
        clave: campo.dataset.clave,
        valor: campo.value,
    }));

    setGuardandoSeccion(form, true);

    const { error } = await guardarSeccion(filas);

    setGuardandoSeccion(form, false);

    if (error) {
        mostrarMensajeSeccion(form, mensajeErrorLegible(error), 'error');
        return;
    }

    mostrarMensajeSeccion(form, '¡Sección guardada!', 'success');
}

async function cargarContenido() {
    const { data, error } = await fetchContenido();

    if (error) {
        contenedor.innerHTML = '';
        mostrarMensajeGlobal(mensajeErrorLegible(error), 'error');
        return;
    }

    renderSecciones(agruparPorSeccion(data));
}

