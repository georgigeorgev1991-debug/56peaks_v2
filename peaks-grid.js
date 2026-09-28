(function () {
  const BATCH_SIZE = 12;
  const grid = document.getElementById('peaksGrid');
  const sentinel = document.getElementById('peaksSentinel');

  if (!grid || !sentinel || typeof PEAKS_DATA === 'undefined') return;

  let rendered = 0;

  function formatBadge(id) {
    return '#' + String(id).padStart(2, '0');
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(text) {
    return escapeHtml(text).replace(/'/g, '&#39;');
  }

  function createPeakCard(peak) {
    const article = document.createElement('article');
    article.className = peak.final ? 'peak-card peak-card-final' : 'peak-card';
    article.tabIndex = 0;

    article.innerHTML =
      '<div class="peak-image-wrapper">' +
        '<img src="56/' + peak.id + '.webp"' +
        ' alt="' + escapeAttr(peak.alt) + '"' +
        ' loading="lazy" width="400" height="300"' +
        ' sizes="(max-width: 560px) calc(100vw - 2rem),' +
                ' (max-width: 1024px) calc(50vw - 2.5rem),' +
                ' calc(33vw - 2rem)"' +
        ' srcset="56/' + peak.id + '-sm.webp 200w, 56/' + peak.id + '.webp 400w"' +
        '>' +
        '<span class="peak-badge">' + formatBadge(peak.id) + '</span>' +
      '</div>' +
      '<div class="peak-body">' +
        '<div class="peak-header">' +
          '<h3>' + escapeHtml(peak.nameBg) + '</h3>' +
          '<span class="peak-name-sub">' + escapeHtml(peak.nameEn) + '</span>' +
        '</div>' +
        '<div class="peak-stats-row">' +
          '<div class="peak-stat-item"><i data-lucide="mountain-snow"></i><span>' + escapeHtml(peak.height) + '</span></div>' +
          '<div class="peak-stat-item"><i data-lucide="clock"></i><span>' + escapeHtml(peak.duration) + '</span></div>' +
          '<div class="peak-stat-item"><i data-lucide="map"></i><span>' + escapeHtml(peak.distance) + '</span></div>' +
          '<div class="peak-stat-item"><i data-lucide="trending-up"></i><span>' + escapeHtml(peak.elevation) + '</span></div>' +
        '</div>' +
        '<p class="peak-summary">' + escapeHtml(peak.summary) + '</p>' +
      '</div>';

    return article;
  }

  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  function observeNewCards(cards) {
    cards.forEach(function (card) {
      revealObserver.observe(card);
    });
  }

  function renderBatch() {
    const slice = PEAKS_DATA.slice(rendered, rendered + BATCH_SIZE);
    if (!slice.length) {
      loadObserver.disconnect();
      sentinel.remove();
      return;
    }

    const fragment = document.createDocumentFragment();
    const cards = [];

    slice.forEach(function (peak) {
      const card = createPeakCard(peak);
      fragment.appendChild(card);
      cards.push(card);
    });

    grid.insertBefore(fragment, sentinel);
    rendered += slice.length;

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    observeNewCards(cards);

    if (rendered < PEAKS_DATA.length && sentinel.isConnected) {
      requestAnimationFrame(function () {
        var rect = sentinel.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200) {
          renderBatch();
        }
      });
    }
  }

  const loadObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        renderBatch();
      }
    });
  }, { rootMargin: '200px 0px' });

  loadObserver.observe(sentinel);
  renderBatch();
})();
