(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.matchMedia('(max-width: 899px)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ═══════════════ Lenis smooth scroll ═══════════════ */
  let lenis = null;
  if (!prefersReducedMotion && window.Lenis) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });
    lenis.on('scroll', () => { if (hasGsap) ScrollTrigger.update(); });
    if (hasGsap) {
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  // Anchor navigation through Lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ═══════════════ Preloader ═══════════════ */
  const preloader = document.getElementById('preloader');
  let pageRevealed = false;

  function revealPage() {
    if (pageRevealed) return;
    pageRevealed = true;
    preloader.classList.add('done');
    animateHeroIn();
    setTimeout(() => preloader.remove(), 1200);
  }
  window.addEventListener('load', revealPage);
  setTimeout(revealPage, 3500); // failsafe

  /* ═══════════════ Hero intro (líneas del titular) ═══════════════ */
  const hlLines = document.querySelectorAll('.hl-line');
  hlLines.forEach((line) => {
    const inner = document.createElement('span');
    inner.style.display = 'inline-block';
    inner.innerHTML = line.innerHTML;
    line.innerHTML = '';
    line.appendChild(inner);
    if (!prefersReducedMotion) inner.style.transform = 'translateY(115%)';
  });

  function animateHeroIn() {
    if (prefersReducedMotion || !hasGsap) return;
    gsap.to('.hl-line > span', {
      y: 0,
      duration: 1.1,
      ease: 'power4.out',
      stagger: 0.12,
      delay: 0.55,
    });
    gsap.from('.hero-left-inner, .hero-left-foot', {
      opacity: 0,
      y: 30,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.15,
      delay: 0.7,
    });
  }

  /* ═══════════════ Header: scrolled + tema por sección ═══════════════ */
  const header = document.getElementById('siteHeader');

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', (window.scrollY || 0) > 60);
  }, { passive: true });

  // El header arranca oscuro sobre el hero split (panel claro a la izquierda,
  // pero el logo/nav caen sobre la zona clara en desktop) → usamos tema light
  // mientras el hero esté visible, y el data-header de cada sección después.
  function setHeaderTheme(theme) {
    header.setAttribute('data-theme', theme);
  }
  setHeaderTheme('light');

  const themedSections = document.querySelectorAll('[data-header]');
  const themeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const t = entry.target.getAttribute('data-header');
        setHeaderTheme(t === 'dark' ? 'dark' : 'light');
      });
    },
    { rootMargin: '-4% 0px -88% 0px' }
  );
  themedSections.forEach((s) => themeObserver.observe(s));

  /* ═══════════════ Menú móvil ═══════════════ */
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  function toggleMenu(force) {
    const open = force !== undefined ? force : !mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open', open);
    menuToggle.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  menuToggle.addEventListener('click', () => toggleMenu());
  mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => toggleMenu(false)));

  /* ═══════════════ Reveal genérico (fade / stagger) ═══════════════ */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.hasAttribute('data-stagger')) {
          const siblings = Array.from(el.parentElement.querySelectorAll('[data-stagger]'));
          const i = siblings.indexOf(el);
          el.style.transitionDelay = prefersReducedMotion ? '0ms' : `${Math.min(i, 8) * 90}ms`;
        }
        el.classList.add('in-view');
        io.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  );
  document.querySelectorAll('[data-fade], [data-stagger]').forEach((el) => io.observe(el));

  /* ═══════════════ Statement: reveal palabra por palabra ═══════════════ */
  const stLines = document.querySelectorAll('.st-line');
  stLines.forEach((line) => {
    const parts = [];
    line.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/\s+/).filter(Boolean).forEach((w) => parts.push({ text: w, em: false }));
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        node.textContent.split(/\s+/).filter(Boolean).forEach((w) => parts.push({ text: w, em: node.tagName === 'EM' }));
      }
    });
    line.innerHTML = '';
    parts.forEach((p, i) => {
      const w = document.createElement(p.em ? 'em' : 'span');
      w.className = 'word';
      w.textContent = p.text;
      line.appendChild(w);
      if (i < parts.length - 1) line.appendChild(document.createTextNode(' '));
    });
  });

  const statementTitle = document.querySelector('.statement-title');
  if (statementTitle && hasGsap && !prefersReducedMotion) {
    gsap.to(statementTitle.querySelectorAll('.word'), {
      y: 0,
      duration: 1,
      ease: 'power4.out',
      stagger: 0.05,
      scrollTrigger: {
        trigger: statementTitle,
        start: 'top 78%',
        once: true,
      },
    });
  } else if (statementTitle) {
    statementTitle.querySelectorAll('.word').forEach((w) => (w.style.transform = 'none'));
  }

  /* ═══════════════ Parallax media del statement ═══════════════ */
  if (hasGsap && !prefersReducedMotion && !isMobile()) {
    document.querySelectorAll('[data-parallax-media] img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -10 }, {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: {
          trigger: img.closest('[data-parallax-media]'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });
  }

  /* ═══════════════ Contadores de stats ═══════════════ */
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          counterObserver.unobserve(el);
          if (prefersReducedMotion || !hasGsap) { el.textContent = target.toLocaleString('es-AR'); return; }
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('es-AR'); },
          });
        });
      },
      { threshold: 0.6 }
    );
    counterObserver.observe(el);
  });

  /* ═══════════════ Paneles de servicios: título + fotos + nav activa ═══════════════ */
  const panels = document.querySelectorAll('.service-panel');
  const navItems = document.querySelectorAll('#servicesNavList li');

  panels.forEach((panel) => {
    const titleSpans = panel.querySelectorAll('.panel-title span');
    // envolver el contenido de cada línea del título para el reveal
    titleSpans.forEach((s) => {
      const inner = document.createElement('span');
      inner.style.display = 'inline-block';
      inner.innerHTML = s.innerHTML;
      s.innerHTML = '';
      s.appendChild(inner);
      if (!prefersReducedMotion) inner.style.transform = 'translateY(110%)';
    });

    if (hasGsap && !prefersReducedMotion) {
      gsap.to(panel.querySelectorAll('.panel-title span > span'), {
        y: 0,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.12,
        scrollTrigger: { trigger: panel, start: 'top 62%', once: true },
      });
      gsap.from(panel.querySelectorAll('.panel-photo'), {
        opacity: 0,
        y: 60,
        scale: 1.04,
        duration: 1.2,
        ease: 'power3.out',
        stagger: 0.15,
        scrollTrigger: { trigger: panel, start: 'top 68%', once: true },
      });
      gsap.from(panel.querySelector('.panel-solutions'), {
        opacity: 0,
        y: 40,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: panel, start: 'top 55%', once: true },
      });
      // parallax interno de las fotos
      if (!isMobile()) {
        gsap.to(panel.querySelector('.ph-a'), {
          yPercent: -8, ease: 'none',
          scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: true },
        });
        gsap.to(panel.querySelector('.ph-b'), {
          yPercent: 10, ease: 'none',
          scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      }
    }

    // nav lateral activa
    const idx = parseInt(panel.getAttribute('data-panel-index'), 10);
    const panelObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navItems.forEach((li) => li.classList.toggle('is-active', parseInt(li.getAttribute('data-panel'), 10) === idx));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    panelObserver.observe(panel);
  });

  /* ═══════════════ Arco de sonrisa: dibujo scrubbed ═══════════════ */
  const smileArc = document.getElementById('smileArc');
  if (smileArc) {
    const len = smileArc.getTotalLength();
    smileArc.style.strokeDasharray = len;
    smileArc.style.strokeDashoffset = len;
    if (hasGsap && !prefersReducedMotion) {
      gsap.to(smileArc, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '.arc-stage',
          start: 'top 85%',
          end: 'bottom 45%',
          scrub: 0.6,
        },
      });
    } else {
      smileArc.style.strokeDashoffset = 0;
    }
  }

  /* ═══════════════ Título "por qué" y equipo: reveal por línea ═══════════════ */
  document.querySelectorAll('.wt-line').forEach((line) => {
    const inner = document.createElement('span');
    inner.style.display = 'inline-block';
    inner.innerHTML = line.innerHTML;
    line.innerHTML = '';
    line.appendChild(inner);
    if (!prefersReducedMotion) inner.style.transform = 'translateY(112%)';
  });
  const whyTitle = document.querySelector('.why-title');
  if (whyTitle && hasGsap && !prefersReducedMotion) {
    gsap.to('.wt-line > span', {
      y: 0,
      duration: 1.1,
      ease: 'power4.out',
      stagger: 0.12,
      scrollTrigger: { trigger: whyTitle, start: 'top 75%', once: true },
    });
  }

  const teamTitle = document.querySelector('.team-title');
  if (teamTitle && hasGsap && !prefersReducedMotion) {
    gsap.from(teamTitle, {
      opacity: 0,
      y: 80,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: { trigger: teamTitle, start: 'top 80%', once: true },
    });
  }

  /* ═══════════════ Galería horizontal scrubbed ═══════════════ */
  const galleryPin = document.getElementById('galleryPin');
  const galleryStrip = document.getElementById('galleryStrip');
  if (galleryPin && galleryStrip && hasGsap && !prefersReducedMotion && !isMobile()) {
    const getDistance = () => galleryStrip.scrollWidth - window.innerWidth;
    gsap.to(galleryStrip, {
      x: () => -getDistance(),
      ease: 'none',
      scrollTrigger: {
        trigger: galleryPin,
        start: 'top 12%',
        end: () => `+=${getDistance()}`,
        pin: true,
        scrub: 0.7,
        invalidateOnRefresh: true,
      },
    });
  } else if (galleryPin) {
    // mobile / reduced motion: scroll horizontal nativo
    galleryPin.style.overflowX = 'auto';
    galleryPin.style.webkitOverflowScrolling = 'touch';
  }

  /* ═══════════════ Testimonios: slider fade ═══════════════ */
  const slides = Array.from(document.querySelectorAll('.t-slide'));
  const dotsWrap = document.getElementById('testimonialDots');
  if (slides.length && dotsWrap) {
    let active = 0;
    let autoplayId = null;

    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', `Ver testimonio ${i + 1}`);
      if (i === 0) b.classList.add('is-active');
      b.addEventListener('click', () => go(i, true));
      dotsWrap.appendChild(b);
    });
    const dots = Array.from(dotsWrap.children);

    function go(i, user) {
      slides[active].classList.remove('is-active');
      dots[active].classList.remove('is-active');
      active = (i + slides.length) % slides.length;
      slides[active].classList.add('is-active');
      dots[active].classList.add('is-active');
      if (user) restart();
    }
    function restart() {
      if (autoplayId) clearInterval(autoplayId);
      autoplayId = setInterval(() => go(active + 1, false), 6500);
    }
    restart();
  }

  /* ═══════════════ FAQ: cierre de los demás al abrir uno ═══════════════ */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      faqItems.forEach((other) => { if (other !== item) other.open = false; });
      if (hasGsap && !prefersReducedMotion) {
        gsap.from(item.querySelector('p'), { opacity: 0, y: -8, duration: 0.45, ease: 'power2.out' });
      }
    });
  });

  /* ═══════════════ Refresh final ═══════════════ */
  window.addEventListener('load', () => { if (hasGsap) ScrollTrigger.refresh(); });
})();
