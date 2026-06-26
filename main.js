/* ==========================================================================
   SCRIPT PRINCIPAL - TECNICAX
   Carga de partials, animaciones y efectos visuales
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    loadPartials();
    initScrollReveal();
    initAnimatedCounters();
    initButtonEffects();
});

/**
 * 0. CARGA DE PARTIALS (Nav y Footer)
 * Inyecta el header y el footer compartidos vía fetch para no
 * duplicar ese markup en cada página.
 */
function loadPartials() {
    const navPlaceholder = document.getElementById('nav-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (navPlaceholder) {
        fetch('/partials/nav.html')
            .then(response => response.text())
            .then(html => {
                navPlaceholder.innerHTML = html;
                setActiveNavLink();
            })
            .catch(error => console.error('No se pudo cargar el nav:', error));
    }

    if (footerPlaceholder) {
        fetch('/partials/footer.html')
            .then(response => response.text())
            .then(html => {
                footerPlaceholder.innerHTML = html;
                updateFooterContacts();
            })
            .catch(error => console.error('No se pudo cargar el footer:', error));
    }
}

async function updateFooterContacts() {
    if (typeof SUPABASE_CONFIG === 'undefined') return;
    try {
        const params = new URLSearchParams({
            select: 'direccion,telefono',
            cliente_id: `eq.${SUPABASE_CONFIG.clienteId}`,
            limit: '1'
        });
        const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/contacto?${params}`, {
            headers: {
                apikey: SUPABASE_CONFIG.anonKey,
                Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`
            }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const [data] = await res.json();
        if (!data) return;

        const dir = document.getElementById('footer-direccion');
        const tel = document.getElementById('footer-telefono');
        if (dir && data.direccion) dir.textContent = data.direccion;
        if (tel && data.telefono) tel.textContent = data.telefono;
    } catch (err) {
        console.error('Error actualizando footer con contacto:', err);
    }
}

/**
 * Marca como activo el link del nav correspondiente a la página actual.
 * Normaliza rutas para que funcione tanto si el servidor expone ".html"
 * en la URL como si lo limpia (ej. "clean URLs" de `npx serve` o Vercel).
 */
function setActiveNavLink() {
    const normalize = (path) => {
        if (path === '' || path === '/') return '/index';
        return path.replace(/\.html$/, '').replace(/\/$/, '');
    };

    const currentPath = normalize(window.location.pathname);

    document.querySelectorAll('#nav-placeholder .nav-link').forEach(link => {
        if (normalize(link.getAttribute('href')) === currentPath) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

/**
 * 1. EFECTO SCROLL REVEAL (Aparición suave al hacer scroll)
 * Busca elementos con la clase .reveal y los muestra fluidamente.
 */
function initScrollReveal() {
    const elementsToReveal = document.querySelectorAll('.producto-card, .card, section h2, .servicio');
    
    const observerOptions = {
        root: null, // usa la ventana del navegador
        threshold: 0.1, // se activa cuando el 10% del elemento es visible
        rootMargin: '0px 0px -50px 0px' // se activa un poquito antes de llegar
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Le agregamos una clase de CSS para activar la animación
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target); // Deja de observarlo para que no repita la animación
            }
        });
    }, observerOptions);

    elementsToReveal.forEach(element => {
        // Le damos un estado inicial por JS por si el usuario tiene deshabilitado JS que vea la web igual
        element.style.opacity = '0';
        element.style.transform = 'translateY(16px)';
        element.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        revealObserver.observe(element);
    });
}

/**
 * 2. CONTADORES ANIMADOS (Para la sección Nosotros)
 * Hace que los números incrementen de 0 al valor final de forma fluida.
 */
function initAnimatedCounters() {
    const counters = document.querySelectorAll('.animate-number');
    if (counters.length === 0) return;

    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const targetValue = parseInt(entry.target.getAttribute('data-target'));
                const duration = 1500; // tiempo total de la animación en milisegundos
                const startTime = performance.now();

                function updateCounter(currentTime) {
                    const elapsedTime = currentTime - startTime;
                    const progress = Math.min(elapsedTime / duration, 1);
                    
                    // Función de suavizado para que frene lento
                    const easeProgress = 1 - Math.pow(1 - progress, 3);
                    const currentValue = Math.floor(easeProgress * targetValue);

                    entry.target.innerText = currentValue;

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    } else {
                        entry.target.innerText = targetValue; // Asegura el valor exacto al final
                    }
                }

                requestAnimationFrame(updateCounter);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));
}

/**
 * 3. EFECTO MICRO-INTERACCIONES EN BOTONES
 * Agrega una pequeña vibración o escala al hacer clic
 */
function initButtonEffects() {
    const buttons = document.querySelectorAll('.btn-brand, .button-inicio, .btn-outline-light');
    
    buttons.forEach(btn => {
        btn.addEventListener('mousedown', () => {
            btn.style.transform = 'scale(0.95)';
        });
        btn.addEventListener('mouseup', () => {
            btn.style.transform = '';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
}