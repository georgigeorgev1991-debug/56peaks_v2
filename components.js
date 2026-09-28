(function () {
  const NAV_LINKS = [
    { href: '/', label: 'Home' },
    { href: 'about.html', label: 'About' },
    { href: 'initiatives.html', label: 'Initiatives' },
    { href: 'challenges.html', label: 'Challenges' },
    { href: '/blog/', label: 'Blog' },
    { href: 'contact.html', label: 'Contact' }
  ];

  const MOUNTAIN_SVG =
    '<svg viewBox="0 0 1920 800" preserveAspectRatio="none">' +
      '<path d="M0,550 L150,380 L300,480 L450,320 L600,420 L750,350 L900,500 L1050,380 L1200,450 L1350,300 L1500,420 L1650,380 L1800,480 L1920,350 L1920,800 L0,800 Z" fill="#1a2d4d" opacity="0.85"/>' +
      '<path d="M0,600 L200,420 L400,520 L600,360 L800,480 L900,300 L1100,450 L1300,320 L1500,480 L1700,380 L1920,480 L1920,800 L0,800 Z" fill="#0f2340" opacity="0.95"/>' +
      '<path d="M0,680 L180,480 L360,600 L540,380 L720,520 L900,280 L1080,500 L1260,340 L1440,580 L1620,400 L1800,550 L1920,420 L1920,800 L0,800 Z" fill="#0a1530" opacity="1"/>' +
    '</svg>';

  function isActiveNavLink(href) {
    const file = window.location.pathname.split('/').pop() || '';

    if (href === '/') {
      return file === '' || file === 'index.html';
    }

    if (href === '/blog/') {
      return window.location.pathname.startsWith('/blog/');
    }

    return file === href;
  }

  function injectMountain() {
    const mount = document.getElementById('mountain-mount');
    if (!mount) return;

    mount.outerHTML = '<div class="mountain-background">' + MOUNTAIN_SVG + '</div>';
  }

  function injectNav() {
    const mount = document.getElementById('nav-mount');
    if (!mount) return;

    const links = NAV_LINKS.map(function (link) {
      const activeClass = isActiveNavLink(link.href) ? ' class="active"' : '';
      return '<a href="' + link.href + '"' + activeClass + '>' + link.label + '</a>';
    }).join('\n        ');

    mount.outerHTML =
      '<header class="nav-header">' +
        '<div class="nav-container">' +
          '<a href="/" class="logo">Bulgarian 56 Peaks</a>' +
          '<button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
          '<nav class="nav-menu">' + links + '</nav>' +
        '</div>' +
      '</header>';
  }

  function injectFooter() {
    const mount = document.getElementById('footer-mount');
    if (!mount) return;

    mount.outerHTML =
      '<footer class="footer">' +
        '<div class="footer-content">' +
          '<div class="footer-section">' +
            '<h3>Bulgarian 56 Peaks</h3>' +
            '<p>Conquering Bulgaria\'s highest peaks to support vulnerable children and families through Foundation "For Our Children", and to protect our mountain trails.</p>' +
          '</div>' +
          '<div class="footer-section quick-links-section">' +
            '<h4>Quick Links</h4>' +
            '<ul>' +
              '<li><a href="/">Home</a></li>' +
              '<li><a href="about.html">About</a></li>' +
              '<li><a href="initiatives.html">Initiatives</a></li>' +
              '<li><a href="challenges.html">Challenges</a></li>' +
              '<li><a href="contact.html">Contact</a></li>' +
              '<li><a href="privacy.html">Privacy Policy</a></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<p>&copy; 2026 Bulgarian 56 Peaks. All rights reserved. &nbsp;&middot;&nbsp; <a href="privacy.html" class="footer-legal-link">Privacy Policy</a></p>' +
        '</div>' +
      '</footer>';
  }

  function initComponents() {
    injectMountain();
    injectNav();
    injectFooter();
  }

  window.injectMountain = injectMountain;
  window.injectNav = injectNav;
  window.injectFooter = injectFooter;

  document.addEventListener('DOMContentLoaded', initComponents);
})();
