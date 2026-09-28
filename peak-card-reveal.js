(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Immediately reveal all cards without animation
    document.querySelectorAll('.peak-card').forEach(function (card) {
      card.classList.add('revealed');
    });
    return;
  }

  var cards = document.querySelectorAll('.peak-card');
  if (!cards.length) return;

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  cards.forEach(function (card) {
    revealObserver.observe(card);
  });
})();
