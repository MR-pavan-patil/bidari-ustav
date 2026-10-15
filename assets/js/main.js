/* ==========================================================================
   BIDARI UTSAV - CORE APPLICATION JS (INSTANT 0MS RENDER)
   ========================================================================== */

function initAll() {
  initMobileMenu();
  initLenisDesktop();
  initScrollAnimations();
  initYouTubeFacades();
  initCountUpObserver();
  initBackToTop();
  initLucide();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}


/* 2. Mobile Menu Overlay Toggle */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.nav-toggle');
  const closeBtn = document.querySelector('.mobile-close-btn');
  const overlay = document.querySelector('.mobile-menu-overlay');

  if (!overlay) return;

  const openMenu = () => {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeMenu = () => {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (toggleBtn) toggleBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  // Close when clicking any link inside mobile overlay
  overlay.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeMenu();
    }
  });
}

/* 3. Conditional Lenis Smooth Scroll (Desktop Only, High Spec Devices) */
function initLenisDesktop() {
  const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isHighSpec = !navigator.hardwareConcurrency || navigator.hardwareConcurrency > 4;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (isDesktop && isHighSpec && !prefersReducedMotion && typeof Lenis !== 'undefined') {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false
    });

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0, 0);
    } else {
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }
}

/* 4. Optimized GSAP ScrollTrigger Animations (Transforms & Opacity Only) */
function initScrollAnimations() {
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Batch animations for bento cards and timeline elements
    ScrollTrigger.batch('[data-animate="fade-up"]', {
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      },
      once: true
    });
  }
}

/* 5. Click-to-Play YouTube Facades (Prevents iframe drag/lag) */
function initYouTubeFacades() {
  const facades = document.querySelectorAll('[data-youtube-id]');
  facades.forEach(facade => {
    const id = facade.getAttribute('data-youtube-id');
    facade.addEventListener('click', () => {
      facade.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${id}?autoplay=1" 
                title="YouTube Video Player" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen></iframe>
      `;
    });
  });
}

/* 6. CountUp Observer */
function initCountUpObserver() {
  if (typeof countUp !== 'undefined' && typeof countUp.CountUp !== 'undefined') {
    const counters = document.querySelectorAll('[data-counter]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;
          const endVal = parseInt(target.getAttribute('data-counter'), 10) || 0;
          const anim = new countUp.CountUp(target, endVal, { duration: 2, useEasing: true });
          if (!anim.error) anim.start();
          else target.innerText = endVal;
          observer.unobserve(target);
        }
      });
    }, { threshold: 0.3 });

    counters.forEach(c => observer.observe(c));
  }
}

/* 7. Back to Top Button */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (btn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) btn.classList.add('show');
      else btn.classList.remove('show');
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/* 8. Lucide Icons Initializer */
function initLucide() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}
