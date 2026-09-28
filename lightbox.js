(function () {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const lightboxImg = document.getElementById('lightboxImg');
  const caption = document.getElementById('lightboxCaption');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  if (!lightboxImg || !closeBtn) return;

  let previousFocus = null;

  lightboxImg.tabIndex = -1;

  function focusableElements() {
    return [closeBtn, lightboxImg];
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;

    const items = focusableElements();
    const first = items[0];
    const last = items[items.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openLightbox(src, alt, label) {
    previousFocus = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = alt;
    if (caption) caption.textContent = label || '';
    lightboxImg.tabIndex = 0;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeLightbox() {
    if (!lightbox.classList.contains('active')) return;

    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    lightboxImg.removeAttribute('src');
    lightboxImg.alt = '';
    lightboxImg.tabIndex = -1;
    if (caption) caption.textContent = '';

    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
    previousFocus = null;
  }

  function shouldSkipCard(card) {
    return card.classList.contains('peak-card-upcoming');
  }

  function getLabelFromCard(card) {
    const badge = card.querySelector('.peak-badge');
    const name = card.querySelector('h3');
    return (badge ? badge.textContent + ' ' : '') + (name ? name.textContent : '');
  }

  function openFromCard(card) {
    const img = card.querySelector('img');
    if (!img || !img.src) return;
    openLightbox(img.src, img.alt, getLabelFromCard(card));
  }

  function initCard(card) {
    if (shouldSkipCard(card)) return;
    card.tabIndex = 0;
  }

  document.addEventListener('click', function (e) {
    if (!lightbox.classList.contains('active')) {
      const card = e.target.closest('.peak-card');
      if (!card || shouldSkipCard(card)) return;
      openFromCard(card);
      return;
    }

    if (e.target === lightbox) closeLightbox();
  });

  closeBtn.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('active')) {
      const card = e.target.closest('.peak-card');
      if (!card || shouldSkipCard(card) || card !== e.target) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFromCard(card);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      closeLightbox();
      return;
    }

    trapFocus(e);
  });

  document.querySelectorAll('.peak-card').forEach(initCard);

  const grid = document.getElementById('peaksGrid');
  if (grid) {
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains('peak-card')) initCard(node);
          if (node.querySelectorAll) {
            node.querySelectorAll('.peak-card').forEach(initCard);
          }
        });
      });
    }).observe(grid, { childList: true });
  }
})();
