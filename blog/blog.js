/* Bulgarian 56 Peaks — Blog Renderer
   Handles both the listing page (/blog/) and single posts (/blog/post.html?slug=...).
   No dependencies. Markdown is parsed inline.
*/
(function () {
  'use strict';

  const POSTS_JSON = '/blog/posts.json';

  // ---------- Minimal Markdown parser (safe, escapes HTML) ----------
  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseInline(text) {
    // images: ![alt](url)
    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g,
      function (_, alt, url, title) {
        const t = title ? ' title="' + escapeHtml(title) + '"' : '';
        return '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(alt) + '" loading="lazy"' + t + '>';
      });
    // links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
      function (_, label, url) {
        const external = /^https?:\/\//.test(url);
        const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return '<a href="' + escapeHtml(url) + '"' + attrs + '>' + escapeHtml(label) + '</a>';
      });
    // bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // italic
    text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    // inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    return text;
  }

  function parseMarkdown(md) {
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;
    let inList = false;
    let inQuote = false;

    function closeList() {
      if (inList) { out.push('</ul>'); inList = false; }
    }
    function closeQuote() {
      if (inQuote) { out.push('</blockquote>'); inQuote = false; }
    }

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        closeList();
        closeQuote();
        i++;
        continue;
      }

      // Headings
      const h = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (h) {
        closeList(); closeQuote();
        const level = h[1].length + 1; // # => h2, ## => h3, ### => h4
        out.push('<h' + level + '>' + parseInline(escapeHtml(h[2])) + '</h' + level + '>');
        i++;
        continue;
      }

      // Horizontal rule
      if (/^---+$/.test(trimmed)) {
        closeList(); closeQuote();
        out.push('<hr>');
        i++;
        continue;
      }

      // Image-only line (standalone figure)
      const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)$/);
      if (imgMatch) {
        closeList(); closeQuote();
        const alt = imgMatch[1];
        const url = imgMatch[2];
        const caption = imgMatch[3];
        out.push('<figure class="blog-figure">' +
          '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(alt) + '" loading="lazy">' +
          (caption ? '<figcaption>' + escapeHtml(caption) + '</figcaption>' : '') +
          '</figure>');
        i++;
        continue;
      }

      // Bullet list
      const li = trimmed.match(/^[-*]\s+(.+)$/);
      if (li) {
        closeQuote();
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + parseInline(escapeHtml(li[1])) + '</li>');
        i++;
        continue;
      }

      // Blockquote
      const bq = trimmed.match(/^>\s?(.*)$/);
      if (bq) {
        closeList();
        if (!inQuote) { out.push('<blockquote>'); inQuote = true; }
        out.push('<p>' + parseInline(escapeHtml(bq[1])) + '</p>');
        i++;
        continue;
      }

      // Paragraph (collect adjacent lines)
      closeList(); closeQuote();
      const para = [trimmed];
      i++;
      while (i < lines.length && lines[i].trim() && !/^(#{1,3}|---+|!\[|[-*]\s|>)/.test(lines[i].trim())) {
        para.push(lines[i].trim());
        i++;
      }
      out.push('<p>' + parseInline(escapeHtml(para.join(' '))) + '</p>');
    }
    closeList(); closeQuote();
    return out.join('\n');
  }

  // ---------- Helpers ----------
  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function fetchText(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }

  // ---------- Listing page ----------
  function renderList() {
    const mount = document.getElementById('blog-list');
    if (!mount) return;

    fetchJson(POSTS_JSON).then(function (data) {
      const posts = (data.posts || []).filter(function (p) { return p.published !== false; });
      posts.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

      if (posts.length === 0) {
        mount.innerHTML = '<p class="blog-empty">No posts yet. Check back soon.</p>';
        return;
      }

      mount.innerHTML = posts.map(function (p) {
        const img = p.image
          ? '<div class="blog-card-image"><img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.imageAlt || '') + '" loading="lazy"></div>'
          : '';
        return '<a class="blog-card" href="' + (p.url || ('post.html?slug=' + encodeURIComponent(p.slug))) + '">' +
          img +
          '<div class="blog-card-body">' +
            '<p class="blog-card-meta">' + escapeHtml(formatDate(p.date)) +
              (p.readMinutes ? ' · ' + p.readMinutes + ' min read' : '') +
            '</p>' +
            '<h2 class="blog-card-title">' + escapeHtml(p.title) + '</h2>' +
            '<p class="blog-card-excerpt">' + escapeHtml(p.excerpt || '') + '</p>' +
            '<span class="blog-card-read">Read more →</span>' +
          '</div>' +
          '</a>';
      }).join('');
    }).catch(function (err) {
      mount.innerHTML = '<p class="blog-error">Could not load posts. Please try again later.</p>';
      console.error('Blog list error:', err);
    });
  }

  // ---------- Single post page ----------
  function renderPost() {
    const contentMount = document.getElementById('post-content');
    if (!contentMount) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (!slug) {
      contentMount.innerHTML = '<p class="blog-error">No post specified. <a href="/blog/">Back to all posts</a>.</p>';
      return;
    }

    fetchJson(POSTS_JSON).then(function (data) {
      const post = (data.posts || []).find(function (p) { return p.slug === slug && p.published !== false; });
      if (!post) {
        contentMount.innerHTML = '<p class="blog-error">Post not found. <a href="/blog/">Back to all posts</a>.</p>';
        return;
      }

      // Update meta + hero
      document.title = post.title + ' — Bulgarian 56 Peaks';
      const pageTitle = document.getElementById('page-title');
      if (pageTitle) pageTitle.textContent = post.title + ' — Bulgarian 56 Peaks';

      const setAttr = function (id, attr, val) {
        const el = document.getElementById(id);
        if (el) el.setAttribute(attr, val);
      };
      const setText = function (id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      setAttr('meta-description', 'content', post.excerpt || post.title);
      setAttr('og-title', 'content', post.title);
      setAttr('og-description', 'content', post.excerpt || post.title);
      setAttr('og-image', 'content', (post.image && post.image.startsWith('http')) ? post.image : 'https://bulgarian56peaks.org' + (post.image || '/hero.webp'));
      setAttr('og-url', 'content', 'https://bulgarian56peaks.org/blog/post.html?slug=' + encodeURIComponent(post.slug));
      setAttr('canonical-link', 'href', 'https://bulgarian56peaks.org/blog/post.html?slug=' + encodeURIComponent(post.slug));

      setText('post-title', post.title);
      setText('post-date', formatDate(post.date));
      setText('post-readtime', (post.readMinutes || 3) + ' min read');
      setText('post-excerpt', post.excerpt || '');

      // Optional cover image inside hero
      if (post.image) {
        const hero = document.querySelector('.blog-post-hero');
        if (hero) {
          hero.style.backgroundImage =
            'linear-gradient(rgba(10, 20, 50, 0.78), rgba(10, 20, 50, 0.92)), url(' + post.image + ')';
        }
      }

      // Load the markdown body
      return fetchText('/blog/posts/' + slug + '.md').then(function (md) {
        contentMount.innerHTML = parseMarkdown(md);
      });
    }).catch(function (err) {
      contentMount.innerHTML = '<p class="blog-error">Could not load this post. <a href="/blog/">Back to all posts</a>.</p>';
      console.error('Blog post error:', err);
    });
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', function () {
    renderList();
    renderPost();
  });
})();
