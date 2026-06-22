/**
 * productos.js — CRUD de productos para el panel admin.
 * Requiere config.js y auth.js cargados antes (expone supabaseClient).
 */

const CATEGORIAS = {
    impresora: { label: 'Impresora', clase: 'badge-categoria-impresora' },
    scanner: { label: 'Scanner', clase: 'badge-categoria-scanner' },
    multifuncion: { label: 'Multifunción', clase: 'badge-categoria-multifuncion' },
    leasing: { label: 'Leasing', clase: 'badge-categoria-leasing' },
};

const IMAGEN_TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGEN_TAMANO_MAXIMO = 2 * 1024 * 1024; // 2MB
const BUCKET_IMAGENES = 'productos-imagenes';

/* ==========================================================================
   CAPA DE DATOS (Supabase)
   ========================================================================== */

function mensajeErrorLegible(error) {
    if (!error) return 'Ocurrió un error inesperado.';
    if (error.message && error.message.includes('Failed to fetch')) {
        return 'No se pudo conectar con el servidor. Revisá tu conexión.';
    }
    if (error.code === '23502') return 'Faltan campos obligatorios.';
    if (error.code === '42501' || error.status === 403) return 'No tenés permiso para realizar esta acción.';
    return 'No se pudo completar la operación. Intentá de nuevo.';
}

async function fetchProductos() {
    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .eq('cliente_id', CONFIG.clienteId)
        .order('orden', { ascending: true });

    if (error) return { data: null, error };
    return { data, error: null };
}

async function subirImagen(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const path = `${CONFIG.clienteId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseClient.storage
        .from(BUCKET_IMAGENES)
        .upload(path, file, { cacheControl: '3600', upsert: false });

    if (uploadError) return { url: null, error: uploadError };

    const { data } = supabaseClient.storage.from(BUCKET_IMAGENES).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
}

async function crearProducto(payload) {
    const { data, error } = await supabaseClient
        .from('productos')
        .insert({ ...payload, cliente_id: CONFIG.clienteId })
        .select()
        .single();

    return { data, error };
}

async function actualizarProducto(id, payload) {
    const { data, error } = await supabaseClient
        .from('productos')
        .update(payload)
        .eq('id', id)
        .eq('cliente_id', CONFIG.clienteId)
        .select()
        .single();

    return { data, error };
}

async function setActivoProducto(id, activo) {
    return actualizarProducto(id, { activo });
}

/* ==========================================================================
   CAPA DE DOM / UI
   ========================================================================== */

let productosCache = [];
let imagenSeleccionada = null;

const tbody = document.getElementById('productos-tbody');
const globalMessageEl = document.getElementById('global-message');
const formMessageEl = document.getElementById('form-message');
const form = document.getElementById('producto-form');
const imagenInput = document.getElementById('campo-imagen');
const imagenPreview = document.getElementById('imagen-preview');
const btnGuardar = document.getElementById('btn-guardar-producto');
const btnGuardarText = document.getElementById('btn-guardar-text');
const btnGuardarSpinner = document.getElementById('btn-guardar-spinner');
const modalTitle = document.getElementById('producto-modal-title');
const productoModalEl = document.getElementById('producto-modal');
const productoModal = new bootstrap.Modal(productoModalEl);

function mostrarMensaje(el, texto, tipo, claseEspaciado) {
    el.textContent = texto;
    el.className = `form-message ${claseEspaciado} form-message-${tipo}`;
    el.classList.remove('d-none');
}

function ocultarMensaje(el) {
    el.classList.add('d-none');
}

function formatearPrecio(precio) {
    if (precio === null || precio === undefined) return '—';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(precio);
}

function renderBadgeCategoria(categoria) {
    const info = CATEGORIAS[categoria];
    if (!info) return `<span class="badge bg-secondary badge-categoria">${categoria || '—'}</span>`;
    return `<span class="badge badge-categoria ${info.clase}">${info.label}</span>`;
}

function renderBadgeEstado(activo) {
    return activo
        ? '<span class="badge badge-estado-activo">Activo</span>'
        : '<span class="badge badge-estado-inactivo">Inactivo</span>';
}

function renderAcciones(producto) {
    const accionEstado = producto.activo
        ? `<button class="btn btn-sm btn-outline-danger btn-desactivar" data-id="${producto.id}">Desactivar</button>`
        : `<button class="btn btn-sm btn-outline-success btn-reactivar" data-id="${producto.id}">Reactivar</button>`;

    return `
        <div class="d-flex justify-content-end gap-2" data-acciones-id="${producto.id}">
            <button class="btn btn-sm btn-outline-light btn-editar" data-id="${producto.id}">Editar</button>
            ${accionEstado}
        </div>
    `;
}

function renderConfirmacionDesactivar(producto) {
    const celda = tbody.querySelector(`[data-acciones-id="${producto.id}"]`);
    if (!celda) return;
    celda.innerHTML = `
        <div class="d-flex align-items-center justify-content-end gap-2 confirm-inline">
            <span class="text-muted-custom">¿Desactivar "${producto.nombre}"?</span>
            <button class="btn btn-sm btn-danger btn-confirmar-desactivar" data-id="${producto.id}">Sí</button>
            <button class="btn btn-sm btn-outline-light btn-cancelar-desactivar" data-id="${producto.id}">No</button>
        </div>
    `;
}

function renderTabla(productos) {
    productosCache = productos;

    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted-custom py-4">Todavía no hay productos cargados.</td></tr>';
        return;
    }

    tbody.innerHTML = productos.map((producto) => `
        <tr>
            <td>
                ${producto.imagen_url
                    ? `<img src="${producto.imagen_url}" alt="${producto.nombre}" class="producto-thumb">`
                    : '<div class="producto-thumb d-flex align-items-center justify-content-center"><i class="bi bi-image text-muted-custom"></i></div>'}
            </td>
            <td>${producto.nombre}</td>
            <td>${renderBadgeCategoria(producto.categoria)}</td>
            <td>${formatearPrecio(producto.precio)}</td>
            <td>${producto.orden ?? 0}</td>
            <td>${renderBadgeEstado(producto.activo)}</td>
            <td>${renderAcciones(producto)}</td>
        </tr>
    `).join('');
}

async function cargarProductos() {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted-custom py-4">Cargando productos...</td></tr>';
    ocultarMensaje(globalMessageEl);

    const { data, error } = await fetchProductos();

    if (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted-custom py-4">No se pudieron cargar los productos.</td></tr>';
        mostrarMensaje(globalMessageEl, mensajeErrorLegible(error), 'error', 'mb-3');
        return;
    }

    renderTabla(data);
}

function limpiarFormulario() {
    form.reset();
    document.getElementById('campo-id').value = '';
    document.getElementById('campo-activo').checked = true;
    document.getElementById('campo-orden').value = 0;
    imagenSeleccionada = null;
    imagenPreview.classList.add('d-none');
    imagenPreview.src = '';
    ocultarMensaje(formMessageEl);
}

function abrirModalNuevo() {
    limpiarFormulario();
    modalTitle.textContent = 'Nuevo producto';
    productoModal.show();
}

function abrirModalEditar(producto) {
    limpiarFormulario();
    modalTitle.textContent = 'Editar producto';

    document.getElementById('campo-id').value = producto.id;
    document.getElementById('campo-nombre').value = producto.nombre;
    document.getElementById('campo-descripcion').value = producto.descripcion || '';
    document.getElementById('campo-categoria').value = producto.categoria || 'impresora';
    document.getElementById('campo-precio').value = producto.precio ?? '';
    document.getElementById('campo-orden').value = producto.orden ?? 0;
    document.getElementById('campo-activo').checked = !!producto.activo;

    if (producto.imagen_url) {
        imagenPreview.src = producto.imagen_url;
        imagenPreview.classList.remove('d-none');
    }

    productoModal.show();
}

function validarImagen(file) {
    if (!IMAGEN_TIPOS_PERMITIDOS.includes(file.type)) {
        return 'Formato no soportado. Usá JPG, PNG o WEBP.';
    }
    if (file.size > IMAGEN_TAMANO_MAXIMO) {
        return 'La imagen supera el tamaño máximo de 2MB.';
    }
    return null;
}

function manejarSeleccionImagen(event) {
    const file = event.target.files[0];
    if (!file) return;

    const errorValidacion = validarImagen(file);
    if (errorValidacion) {
        mostrarMensaje(formMessageEl, errorValidacion, 'error', 'mt-3');
        imagenInput.value = '';
        imagenSeleccionada = null;
        return;
    }

    ocultarMensaje(formMessageEl);
    imagenSeleccionada = file;
    imagenPreview.src = URL.createObjectURL(file);
    imagenPreview.classList.remove('d-none');
}

function setGuardando(guardando, texto) {
    btnGuardar.disabled = guardando;
    btnGuardarText.textContent = guardando ? texto : 'Guardar producto';
    btnGuardarSpinner.classList.toggle('d-none', !guardando);
}

async function manejarSubmitFormulario(event) {
    event.preventDefault();

    const nombre = document.getElementById('campo-nombre').value.trim();
    if (!nombre) {
        mostrarMensaje(formMessageEl, 'El nombre es obligatorio.', 'error', 'mt-3');
        return;
    }

    const id = document.getElementById('campo-id').value;
    const precioValor = document.getElementById('campo-precio').value;

    const payload = {
        nombre,
        descripcion: document.getElementById('campo-descripcion').value.trim() || null,
        categoria: document.getElementById('campo-categoria').value,
        precio: precioValor === '' ? null : Number(precioValor),
        orden: Number(document.getElementById('campo-orden').value) || 0,
        activo: document.getElementById('campo-activo').checked,
    };

    setGuardando(true, 'Guardando...');

    if (imagenSeleccionada) {
        setGuardando(true, 'Subiendo imagen...');
        const { url, error: errorImagen } = await subirImagen(imagenSeleccionada);

        if (errorImagen) {
            setGuardando(false, '');
            mostrarMensaje(formMessageEl, mensajeErrorLegible(errorImagen), 'error', 'mt-3');
            return;
        }

        payload.imagen_url = url;
    }

    setGuardando(true, 'Guardando producto...');

    const { error } = id
        ? await actualizarProducto(id, payload)
        : await crearProducto(payload);

    setGuardando(false, '');

    if (error) {
        mostrarMensaje(formMessageEl, mensajeErrorLegible(error), 'error', 'mt-3');
        return;
    }

    mostrarMensaje(formMessageEl, '¡Producto guardado!', 'success', 'mt-3');
    await cargarProductos();
    setTimeout(() => productoModal.hide(), 800);
}

async function manejarConfirmarDesactivar(id) {
    const { error } = await setActivoProducto(id, false);

    if (error) {
        mostrarMensaje(globalMessageEl, mensajeErrorLegible(error), 'error', 'mb-3');
        await cargarProductos();
        return;
    }

    await cargarProductos();
}

async function manejarReactivar(id) {
    const { error } = await setActivoProducto(id, true);

    if (error) {
        mostrarMensaje(globalMessageEl, mensajeErrorLegible(error), 'error', 'mb-3');
        return;
    }

    await cargarProductos();
}

function manejarClickTabla(event) {
    const id = event.target.dataset.id;
    if (!id) return;

    if (event.target.classList.contains('btn-editar')) {
        const producto = productosCache.find((p) => p.id === id);
        if (producto) abrirModalEditar(producto);
        return;
    }

    if (event.target.classList.contains('btn-desactivar')) {
        const producto = productosCache.find((p) => p.id === id);
        if (producto) renderConfirmacionDesactivar(producto);
        return;
    }

    if (event.target.classList.contains('btn-confirmar-desactivar')) {
        manejarConfirmarDesactivar(id);
        return;
    }

    if (event.target.classList.contains('btn-cancelar-desactivar')) {
        renderTabla(productosCache);
        return;
    }

    if (event.target.classList.contains('btn-reactivar')) {
        manejarReactivar(id);
    }
}

document.getElementById('btn-nuevo-producto').addEventListener('click', abrirModalNuevo);
form.addEventListener('submit', manejarSubmitFormulario);
imagenInput.addEventListener('change', manejarSeleccionImagen);
tbody.addEventListener('click', manejarClickTabla);
productoModalEl.addEventListener('hidden.bs.modal', limpiarFormulario);

cargarProductos();
