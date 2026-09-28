document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const params = new URLSearchParams(window.location.search);
  if (params.get('reason') === 'donate') {
    const subjectInput = document.getElementById('subject');
    const msgInput = document.getElementById('message');
    if (subjectInput) subjectInput.value = "I'd like to make a donation";
    if (msgInput) msgInput.placeholder =
      "Please share how much you'd like to give and preferred payment method.";
    const form = document.getElementById('contactForm');
    if (form) setTimeout(() =>
      form.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  function releaseHeroScrollLock() {
    document.body.style.overflow = '';
    if (typeof window.__dismissMist === 'function') {
      window.__dismissMist();
    }
  }

  const skipLink = document.querySelector('.skip-link');
  if (skipLink) {
    skipLink.addEventListener('click', releaseHeroScrollLock);
  }

  // ===== ACCESSIBILITY: Keyboard Navigation for Menu =====
  const setupAccessibility = () => {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    if (toggle && menu) {
      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle.click();
        }
      });
    }
  };
  setupAccessibility();

  // ===== HAMBURGER MENU TOGGLE =====
  const navToggle = document.querySelector('.nav-toggle');
  const navHeaderEl = document.querySelector('.nav-header');

  if (navToggle && navHeaderEl) {
    navToggle.addEventListener('click', () => {
      const isOpen = navHeaderEl.classList.toggle('menu-open');
      navToggle.classList.toggle('active', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      // Prevent page scroll while menu is open
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu when a nav link is clicked
    navHeaderEl.querySelectorAll('.nav-menu a').forEach(link => {
      link.addEventListener('click', () => {
        navHeaderEl.classList.remove('menu-open');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close menu on outside tap
    document.addEventListener('click', (e) => {
      if (navHeaderEl.classList.contains('menu-open') && !navHeaderEl.contains(e.target)) {
        navHeaderEl.classList.remove('menu-open');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // ===== PREMIUM HERO EXPERIENCE =====
  const hero = document.getElementById('hero');
  const pageHero = document.querySelector('.page-hero');
  const navHeader = document.querySelector('.nav-header');
  const button = document.querySelector('.cta-button');
  const heroHeight = window.innerHeight;
  let navVisible = false;

  // Only apply hero-specific behavior if on the home page (has hero element)
  if (hero) {
    const heroContent = document.querySelector('.hero-content');
    const h1 = hero.querySelector('h1');
    const heroP = hero.querySelector('p');
    const ctaBtn = hero.querySelector('.cta-button');

    // Initialize hero to fully visible state
    hero.style.opacity = '1';

    if (prefersReducedMotion) {
      document.body.style.overflow = '';
      if (heroContent) {
        heroContent.style.animation = 'none';
        heroContent.style.opacity = '1';
        heroContent.style.transform = 'none';
      }
      if (h1) h1.style.opacity = '1';
      if (heroP) heroP.style.opacity = '0.9';
      if (ctaBtn) {
        ctaBtn.style.opacity = '1';
        ctaBtn.style.transform = 'none';
      }
      if (navHeader) {
        navHeader.classList.add('visible');
      }
    } else {
      // Disable scrolling during hero animation (desktop only — skip on touch devices)
      const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      if (!isTouchDevice) {
        document.body.style.overflow = 'hidden';
        // Overflow is restored by GSAP onComplete; this timeout is a safety fallback only
        setTimeout(() => {
          if (!document.getElementById('mistCanvas')) {
            document.body.style.overflow = 'auto';
          }
        }, 2000);
      }

      // ===== GSAP HERO ENTRANCE =====
      if (typeof gsap !== 'undefined') {
        const mountainPaths = document.querySelectorAll('.mountain-background path');

        gsap.set(mountainPaths, { opacity: 0, y: 50 });
        if (h1) gsap.set(h1, { opacity: 0, y: 50 });
        if (heroP) gsap.set(heroP, { opacity: 0, y: 30 });
        if (ctaBtn) gsap.set(ctaBtn, { opacity: 0, y: 20, scale: 0.92 });

        if (heroContent) {
          heroContent.style.animation = 'none';
          heroContent.style.opacity = '1';
          heroContent.style.transform = 'none';
        }

        const heroTL = gsap.timeline({
          onComplete: () => {
            if (!document.getElementById('mistCanvas')) {
              document.body.style.overflow = 'auto';
            }
          }
        });

        heroTL.to(mountainPaths, {
          opacity: 1,
          y: 0,
          duration: 1.4,
          stagger: 0.2,
          ease: 'power2.out'
        }, 0);

        if (h1) heroTL.to(h1, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out'
        }, 0.5);

        if (heroP) heroTL.to(heroP, {
          opacity: 0.9,
          y: 0,
          duration: 0.7,
          ease: 'power2.out'
        }, 0.8);

        if (ctaBtn) heroTL.to(ctaBtn, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: 'back.out(1.7)'
        }, 1.05);
      }
    }

    if (!prefersReducedMotion) {
    let scrollTicking = false;
    // Parallax and fade effect on scroll
    window.addEventListener('scroll', () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;

          const fadeStart = 0;
          const fadeEnd = heroHeight * 1.5;
          const heroOpacity = Math.max(0, 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart));

          if (heroOpacity < 0.5 && !navVisible) {
            navHeader.classList.add('visible');
            navVisible = true;
          }

          if (heroOpacity > 0.5 && navVisible) {
            navHeader.classList.remove('visible');
            navVisible = false;
          }

          if (button) {
            if (scrollY > 0) {
              button.style.pointerEvents = 'none';
              button.style.opacity = '0.5';
            } else {
              button.style.pointerEvents = 'auto';
              button.style.opacity = '1';
            }
          }

          hero.style.transform = `translateY(${scrollY * 0.5}px)`;
          hero.style.opacity = heroOpacity;
          const blurAmount = Math.min(5, (scrollY / heroHeight) * 5);
          hero.classList.toggle('hero--blurred', blurAmount > 0);

          scrollTicking = false;
        });
        scrollTicking = true;
      }
    }, { passive: true });
    }
  } else if (pageHero) {
  if (!prefersReducedMotion) {
    let scrollTicking = false;
    // Apply parallax to page-hero on non-home pages
    window.addEventListener('scroll', () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          pageHero.style.transform = `translateY(${scrollY * 0.5}px)`;
          const pageHeroRect = pageHero.getBoundingClientRect();
          const pageHeroHeight = pageHeroRect.height;
          const fadeStart = pageHeroHeight;
          const fadeEnd = pageHeroHeight * 1.5;
          const pageHeroOpacity = Math.max(0, 1 - Math.max(0, scrollY - fadeStart) / (fadeEnd - fadeStart));
          pageHero.style.opacity = pageHeroOpacity;
          const blurAmount = Math.min(5, (scrollY / window.innerHeight) * 5);
          pageHero.classList.toggle('page-hero--blurred', blurAmount > 0);

          scrollTicking = false;
        });
        scrollTicking = true;
      }
    }, { passive: true });
  }

    if (navHeader) {
      navHeader.classList.add('visible');
    }
  } else {
    if (navHeader) {
      navHeader.classList.add('visible');
    }
  }

  // Feature cards reveal
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!prefersReducedMotion) {
          entry.target.style.animation = 'card-fade-in 0.72s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
        }
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  if (!prefersReducedMotion) {
    document.querySelectorAll('.feature-card').forEach(card => {
      observer.observe(card);
    });
  }

  // ===== CONTACT FORM =====
  const contactForm = document.getElementById('contactForm');
  const formMessage = document.getElementById('formMessage');
  const csrfInput = document.getElementById('csrfToken');

  function setCsrfToken(token) {
    if (csrfInput && token) {
      csrfInput.value = token;
    }
  }

  if (contactForm) {
    fetch('contact.php', { method: 'GET', credentials: 'same-origin' })
      .then(response => response.json())
      .then(data => {
        if (data.csrf_token) {
          setCsrfToken(data.csrf_token);
        }
      })
      .catch(error => {
        console.error('Error loading security token:', error);
      });

    function fieldErrorMessage(input) {
      const v = input.validity;
      if (input.id === 'name') {
        if (v.valueMissing) return 'Name is required.';
        if (v.tooShort) return 'Name must be at least 2 characters.';
      }
      if (input.id === 'email') {
        if (v.valueMissing) return 'Email address is required.';
        if (v.typeMismatch) return 'Please enter a valid email address.';
      }
      if (input.id === 'subject') {
        if (v.valueMissing) return 'Subject is required.';
        if (v.tooShort) return 'Subject must be at least 3 characters.';
      }
      if (input.id === 'message') {
        if (v.valueMissing) return 'Message is required.';
        if (v.tooShort) return 'Message must be at least 10 characters.';
      }
      return '';
    }

    function updateFieldErrors() {
      ['name', 'email', 'subject', 'message'].forEach(function (id) {
        const input = document.getElementById(id);
        const errorEl = document.getElementById(id + '-error');
        if (input && errorEl) {
          errorEl.textContent = fieldErrorMessage(input);
        }
      });
    }

    ['name', 'email', 'subject', 'message'].forEach(function (id) {
      const input = document.getElementById(id);
      const errorEl = document.getElementById(id + '-error');
      if (!input || !errorEl) return;
      input.addEventListener('input', function () {
        if (input.validity.valid) {
          errorEl.textContent = '';
        }
      });
    });

    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      updateFieldErrors();
      if (!contactForm.checkValidity()) {
        const firstInvalid = contactForm.querySelector(':invalid');
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      const formData = new FormData(contactForm);
      const submitBtn = document.getElementById('submitBtn');
      const originalButtonText = submitBtn.textContent;

      formMessage.innerHTML = '';
      formMessage.className = 'form-message';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      fetch('contact.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          formMessage.innerHTML = data.message;
          formMessage.className = 'form-message success';
          contactForm.reset();
          setTimeout(() => {
            formMessage.innerHTML = '';
            formMessage.className = 'form-message';
          }, 5000);
        } else {
          formMessage.innerHTML = data.message;
          formMessage.className = 'form-message error';
        }

        if (data.csrf_token) {
          setCsrfToken(data.csrf_token);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        formMessage.innerHTML = 'An error occurred. Please try again later.';
        formMessage.className = 'form-message error';
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalButtonText;
      });
    });
  }

  // ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a[href*="#"]');
    if (!target) return;

    const href = target.getAttribute('href');
    const hash = href.split('#')[1];

    if (hash && href.includes('#') && hash !== '') {
      const targetElement = document.getElementById(hash);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start'
        });
        window.history.pushState(null, '', '#' + hash);
      }
    }
  });

});
