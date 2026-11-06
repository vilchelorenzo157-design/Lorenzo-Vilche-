/* Interacciones: age gate, nav, split de titulares, reveals,
   parallax, zoom de video por scroll, marquees y FAQ animado. */

(function () {
  'use strict';

  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- age gate (+18) ---------- */
  const puerta = document.getElementById('puerta');
  const botonSi = document.getElementById('puerta-si');
  const botonNo = document.getElementById('puerta-no');
  const rechazo = document.getElementById('puerta-rechazo');
  const CLAVE = 'cogollo-mayor-de-edad';

  function abrirSitio() {
    puerta.classList.add('oculta');
    document.body.classList.remove('bloqueado');
  }

  if (localStorage.getItem(CLAVE) === 'si') {
    abrirSitio();
  }
  botonSi.addEventListener('click', () => {
    localStorage.setItem(CLAVE, 'si');
    abrirSitio();
  });
  botonNo.addEventListener('click', () => {
    rechazo.style.display = 'block';
    botonNo.disabled = true;
    botonNo.style.opacity = '.4';
  });

  /* ---------- red de seguridad: si Three.js (CDN) nunca arranca, video de respaldo ---------- */
  setTimeout(() => {
    const carga = document.getElementById('carga');
    const porcentaje = document.getElementById('porcentaje');
    const sinProgreso = porcentaje && porcentaje.textContent === '0%';
    if (carga && !carga.classList.contains('listo') && sinProgreso) {
      carga.classList.add('listo');
      document.getElementById('inicio').classList.add('sin-webgl');
      const video = document.getElementById('escena-video');
      if (video && !video.src) {
        video.src = video.dataset.src;
        video.play().catch(() => {});
      }
    }
  }, 18000);

  /* ---------- nav compacta al hacer scroll ---------- */
  const nav = document.getElementById('nav');
  addEventListener('scroll', () => {
    nav.classList.toggle('compacta', scrollY > 40);
  }, { passive: true });

  /* ---------- pin del hero: progreso → uFactor del 3D + fades del overlay ----------
     Mapeo LINEAL del handoff: uFactor = clamp((p − 0.10) / 0.75, 0, 1).
     El easing vive en el vertex shader; acá no se duplica. */
  const heroPin = document.getElementById('inicio');
  let pinPendiente = false;
  function medirPin() {
    pinPendiente = false;
    if (!heroPin) return;
    const r = heroPin.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    heroPin.style.setProperty('--p', p.toFixed(4));
    if (window.__cogolloEstado) {
      window.__cogolloEstado.objetivo = Math.min(1, Math.max(0, (p - 0.1) / 0.75));
    }
  }
  addEventListener('scroll', () => {
    if (!pinPendiente) { pinPendiente = true; requestAnimationFrame(medirPin); }
  }, { passive: true });
  addEventListener('resize', medirPin);
  medirPin();

  /* ---------- split de titulares: palabra por palabra ---------- */
  document.querySelectorAll('.titulo-split').forEach((titulo) => {
    const palabras = titulo.textContent.trim().split(/\s+/);
    titulo.textContent = '';
    palabras.forEach((palabra, i) => {
      const externo = document.createElement('span');
      externo.className = 'palabra';
      const interno = document.createElement('span');
      interno.textContent = palabra;
      if (!reducirMovimiento) interno.style.transitionDelay = (i * 0.045) + 's';
      externo.appendChild(interno);
      titulo.appendChild(externo);
      if (i < palabras.length - 1) titulo.appendChild(document.createTextNode(' '));
    });
  });

  /* ---------- reveals (incluye titulares split) ---------- */
  const heroTitulo = document.querySelector('.hero-titulo');
  const observador = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observador.unobserve(e.target);
      }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });

  document.querySelectorAll('.reveal, .titulo-split').forEach((el) => {
    if (el === heroTitulo) return; // el del hero espera al age gate + loader
    observador.observe(el);
  });

  // el titular del hero anima recién cuando se ve de verdad (sin puerta ni loader)
  const esperarHero = setInterval(() => {
    const carga = document.getElementById('carga');
    if (puerta.classList.contains('oculta') && carga.classList.contains('listo')) {
      clearInterval(esperarHero);
      setTimeout(() => heroTitulo.classList.add('visible'), 250);
    }
  }, 200);

  /* ---------- parallax + zoom de video por scroll ---------- */
  const paralajes = [...document.querySelectorAll('[data-paralaje]')];
  const zooms = [...document.querySelectorAll('[data-zoom-scroll]')];
  let pendiente = false;

  function aplicarScroll() {
    pendiente = false;
    if (reducirMovimiento) return;
    const vh = innerHeight;

    for (const el of paralajes) {
      const caja = el.getBoundingClientRect();
      if (caja.bottom < 0 || caja.top > vh) continue;
      const factor = parseFloat(el.dataset.paralaje) || 0.06;
      const progreso = (caja.top + caja.height / 2 - vh / 2) / vh; // -0.5 … 0.5
      const objetivo = el.querySelector('img') || el;
      objetivo.style.setProperty('--paralaje', (-progreso * factor * 100).toFixed(2) + 'px');
    }

    for (const el of zooms) {
      const caja = el.getBoundingClientRect();
      if (caja.bottom < 0 || caja.top > vh) continue;
      // 0 cuando entra por abajo, 1 cuando sale por arriba
      const progreso = Math.min(1, Math.max(0, (vh - caja.top) / (vh + caja.height)));
      const zoom = 1.18 - progreso * 0.18;
      el.style.setProperty('--zoom', zoom.toFixed(4));
    }
  }
  addEventListener('scroll', () => {
    if (!pendiente) { pendiente = true; requestAnimationFrame(aplicarScroll); }
  }, { passive: true });
  addEventListener('resize', aplicarScroll);
  aplicarScroll();

  /* ---------- marquees: repetir contenido hasta cubrir 2 anchos ---------- */
  document.querySelectorAll('[data-marquee]').forEach((pista) => {
    const original = pista.innerHTML;
    let mitad = original;
    // asegurar que una mitad cubra al menos el ancho de la ventana
    pista.innerHTML = mitad;
    while (pista.scrollWidth < innerWidth && mitad.length < original.length * 30) {
      mitad += original;
      pista.innerHTML = mitad;
    }
    pista.innerHTML = mitad + mitad; // dos mitades idénticas → bucle -50% perfecto
  });

  /* ---------- FAQ: acordeón animado ---------- */
  const preguntas = [...document.querySelectorAll('.pregunta')];

  function abrirPregunta(p) {
    const respuesta = p.querySelector('.respuesta');
    const caja = p.querySelector('.respuesta-caja');
    p.classList.add('abierta');
    p.querySelector('.pregunta-boton').setAttribute('aria-expanded', 'true');
    respuesta.style.height = caja.offsetHeight + 'px';
  }
  function cerrarPregunta(p) {
    const respuesta = p.querySelector('.respuesta');
    p.classList.remove('abierta');
    p.querySelector('.pregunta-boton').setAttribute('aria-expanded', 'false');
    respuesta.style.height = '0px';
  }

  preguntas.forEach((p) => {
    p.querySelector('.pregunta-boton').addEventListener('click', () => {
      const abierta = p.classList.contains('abierta');
      preguntas.forEach((otra) => { if (otra !== p && otra.classList.contains('abierta')) cerrarPregunta(otra); });
      abierta ? cerrarPregunta(p) : abrirPregunta(p);
    });
  });

  // recalcular la altura de la pregunta abierta al redimensionar
  addEventListener('resize', () => {
    const abierta = document.querySelector('.pregunta.abierta');
    if (abierta) {
      abierta.querySelector('.respuesta').style.height =
        abierta.querySelector('.respuesta-caja').offsetHeight + 'px';
    }
  });
})();
