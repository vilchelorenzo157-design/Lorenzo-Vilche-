/* ==========================================================================
   Aurelia Clinic — Interacciones principales
   Header con blur al desplazar, menú móvil, filtros por pestañas,
   y animaciones de revelado al hacer scroll.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileMenu();
  initTreatmentTabs();
  initScrollReveal();
  initMediaPlaceholders();
});

/**
 * Mientras los recursos de alta resolución definitivos no estén disponibles,
 * oculta el ícono de imagen/vídeo roto y deja visible el color de fondo
 * del contenedor como marcador de posición limpio.
 */
function initMediaPlaceholders() {
  document.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', () => {
      img.style.opacity = '0';
    });
  });

  document.querySelectorAll('video').forEach((video) => {
    video.addEventListener('error', () => {
      video.style.display = 'none';
    });
  });
}

/**
 * Añade la clase `is-scrolled` al header cuando el usuario se desplaza,
 * activando el efecto backdrop-filter: blur definido en CSS.
 */
function initHeaderScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  const SCROLL_THRESHOLD = 40;

  const toggleHeaderState = () => {
    header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
  };

  toggleHeaderState();
  window.addEventListener('scroll', toggleHeaderState, { passive: true });
}

/**
 * Controla la apertura/cierre del menú de navegación en móvil/tablet.
 */
function initMobileMenu() {
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;

  const closeMenu = () => {
    toggle.classList.remove('is-active');
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  const openMenu = () => {
    toggle.classList.add('is-active');
    toggle.setAttribute('aria-expanded', 'true');
    nav.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.contains('is-open');
    isOpen ? closeMenu() : openMenu();
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
}

/**
 * Sistema de filtros por pestañas (estilo píldora) para el directorio
 * de tratamientos: Estética Médica / Naturopatía / Paquetes de Bienestar.
 */
function initTreatmentTabs() {
  const tabs = document.querySelectorAll('.tab-pill');
  const items = document.querySelectorAll('.treatment-item');
  if (!tabs.length || !items.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;

      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      items.forEach((item) => {
        item.hidden = item.dataset.category !== category;
      });
    });
  });
}

/**
 * Revela elementos con la clase `.reveal` a medida que entran en el
 * viewport, para un desplazamiento fluido y sofisticado.
 */
function initScrollReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  if (!('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );

  revealEls.forEach((el) => observer.observe(el));
}
