/* ==========================================================================
   ANIMACIONES Y EFECTOS VISUALES - TECNICAX
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initAnimatedCounters();
    initButtonEffects();
});

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
        element.style.transform = 'translateY(30px)';
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