// ---------- Admin password handling ----------
// The password is NEVER stored in this file. It is typed at the login gate,
// held in sessionStorage for the life of the tab, and verified server-side
// by /publish.php. Closing the tab clears it.
function getAdminPass() {
  return sessionStorage.getItem('blogAdminPass') || '';
}
function setAdminPass(value) {
  sessionStorage.setItem('blogAdminPass', value);
}
function clearAdminPass() {
  sessionStorage.removeItem('blogAdminPass');
  sessionStorage.removeItem('blogAdminAuth');
}

let extractedHtml = '';

let ta;
let titleEl;
let dateEl;
let slugEl;
let excerptEl;
let imageAltEl;
let readMinutesEl;
let excerptCounterEl;
let imagesSummaryEl;
let preview;
let status;

let seoSection;
let generateSeoBtn;
let publishBtnEl;
let backToEditBtn;
let metaDescEl;
let keywordsEl;
let ogTitleEl;
let ogDescEl;
let ogImageEl;
let metaDescCounter;

let dropzone;
let fileInput;

// ---------- Toolbar ----------
function wrap(before, after, placeholder) {
  const s = ta.selectionStart, e = ta.selectionEnd;
  const sel = ta.value.substring(s, e) || placeholder || 'text';
  ta.value = ta.value.substring(0, s) + before + sel + after + ta.value.substring(e);
  ta.focus();
  ta.selectionStart = s + before.length;
  ta.selectionEnd = s + before.length + sel.length;
  render();
}
function prefix(p) {
  const s = ta.selectionStart;
  const before = ta.value.substring(0, s);
  const after = ta.value.substring(s);
  const lineStart = before.lastIndexOf('\n') + 1;
  ta.value = ta.value.substring(0, lineStart) + p + ta.value.substring(lineStart);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = s + p.length;
  render();
}
function insert(text) {
  const s = ta.selectionStart;
  ta.value = ta.value.substring(0, s) + text + ta.value.substring(s);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = s + text.length;
  render();
}
function insertLink() {
  const url = prompt('Link URL:');
  if (!url) return;
  wrap('[', '](' + url + ')', 'link text');
}
function insertImage() {
  const file = prompt('Image filename (must be uploaded to blog/posts/images/):');
  if (!file) return;
  const alt = prompt('Image caption / alt text:') || '';
  const path = file.startsWith('http') || file.startsWith('/') ? file : '/blog/posts/images/' + file;
  insert('\n\n![' + alt + '](' + path + ')\n\n');
}

// ---------- Title -> slug auto ----------
function slugify(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------- Markdown render (matches blog.js parser closely) ----------
function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function inline(t) {
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">');
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  return t;
}
function parseMd(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = []; let i = 0, inList = false, inQuote = false;
  const closeL = () => { if (inList) { out.push('</ul>'); inList = false; } };
  const closeQ = () => { if (inQuote) { out.push('</blockquote>'); inQuote = false; } };
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) { closeL(); closeQ(); i++; continue; }
    const h = t.match(/^(#{1,3})\s+(.+)$/);
    if (h) { closeL(); closeQ(); const lvl = h[1].length + 1; out.push('<h'+lvl+'>'+inline(esc(h[2]))+'</h'+lvl+'>'); i++; continue; }
    if (/^---+$/.test(t)) { closeL(); closeQ(); out.push('<hr>'); i++; continue; }
    const img = t.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img) { closeL(); closeQ(); out.push('<figure><img src="'+esc(img[2])+'" alt="'+esc(img[1])+'">'+(img[1]?'<figcaption>'+esc(img[1])+'</figcaption>':'')+'</figure>'); i++; continue; }
    const li = t.match(/^[-*]\s+(.+)$/);
    if (li) { closeQ(); if (!inList) { out.push('<ul>'); inList = true; } out.push('<li>'+inline(esc(li[1]))+'</li>'); i++; continue; }
    const bq = t.match(/^>\s?(.*)$/);
    if (bq) { closeL(); if (!inQuote) { out.push('<blockquote>'); inQuote = true; } out.push('<p>'+inline(esc(bq[1]))+'</p>'); i++; continue; }
    closeL(); closeQ();
    const para = [t]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}|---+|!\[|[-*]\s|>)/.test(lines[i].trim())) { para.push(lines[i].trim()); i++; }
    out.push('<p>'+inline(esc(para.join(' ')))+'</p>');
  }
  closeL(); closeQ();
  return out.join('\n');
}

function render() {
  preview.innerHTML = parseMd(ta.value || '_Start typing to see a preview..._');
}

// ---------- SEO step ----------
function validateBasicFields() {
  const errs = [];
  if (!titleEl.value.trim())                                              errs.push('Title required');
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slugEl.value.trim()))          errs.push('Slug must be lowercase letters, digits, hyphens');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateEl.value.trim()))                   errs.push('Valid date required');
  if (!excerptEl.value.trim())                                            errs.push('Excerpt required');
  if (!ta.value.trim())                                                   errs.push('Post body required');
  return errs;
}

function generateSeo() {
  const errs = validateBasicFields();
  const s = document.getElementById('status');
  if (errs.length) {
    s.className = 'err';
    s.textContent = errs.join(' · ');
    return;
  }
  s.className = ''; s.textContent = '';

  const cover = (window._extractedImages && window._extractedImages[0])
    ? ('/blog/posts/images/' + window._extractedImages[0].name)
    : '/hero.webp';
  if (!metaDescEl.value) metaDescEl.value = excerptEl.value.trim().substring(0, 160);
  if (!ogTitleEl.value)  ogTitleEl.value  = titleEl.value.trim();
  if (!ogDescEl.value)   ogDescEl.value   = excerptEl.value.trim();
  if (!ogImageEl.value)  ogImageEl.value  = cover;

  updateSeoPreviews();
  seoSection.classList.remove('is-hidden');
  generateSeoBtn.classList.add('is-hidden');
  publishBtnEl.classList.remove('is-hidden');
  backToEditBtn.classList.remove('is-hidden');
  seoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function backToEdit() {
  seoSection.classList.add('is-hidden');
  generateSeoBtn.classList.remove('is-hidden');
  publishBtnEl.classList.add('is-hidden');
  backToEditBtn.classList.add('is-hidden');
}

function updateSeoPreviews() {
  const slug   = slugEl.value.trim() || 'slug';
  const title  = ogTitleEl.value || titleEl.value || 'Post title';
  const desc   = metaDescEl.value || 'Post description';
  const ogDesc = ogDescEl.value || desc;
  const ogImg  = ogImageEl.value || '/hero.webp';
  const ogImgAbs = /^https?:\/\//.test(ogImg) ? ogImg : ('https://bulgarian56peaks.org' + ogImg);

  document.getElementById('gp-title').textContent = title + ' — Bulgarian 56 Peaks';
  document.getElementById('gp-url').textContent   = 'https://bulgarian56peaks.org/blog/' + slug + '.html';
  document.getElementById('gp-desc').textContent  = desc;
  document.getElementById('fb-title').textContent = title;
  document.getElementById('fb-desc').textContent  = ogDesc;
  document.getElementById('fb-img').style.setProperty('--fb-bg', "url('" + ogImgAbs + "')");
  metaDescCounter.textContent = metaDescEl.value.length + ' / 200 characters';
}

// ---------- Publish ----------
async function publishPost() {
  const errs = validateBasicFields();
  if (errs.length) {
    status.className = 'err';
    status.textContent = errs.join(' · ');
    return;
  }

  const title = titleEl.value.trim();
  const slug = slugEl.value.trim();
  const date = dateEl.value.trim();
  const excerpt = excerptEl.value.trim();
  const imageAlt = imageAltEl.value.trim();
  const readMinutes = String(readMinutesEl.value || '2');
  const markdown = ta.value.trim();

  const fd = new FormData();
  fd.append('password', getAdminPass());
  fd.append('slug', slug);
  fd.append('title', title);
  fd.append('date', date);
  fd.append('author', 'Bulgarian 56 Peaks Team');
  fd.append('excerpt', excerpt);
  fd.append('readMinutes', readMinutes);
  fd.append('imageAlt', imageAlt);
  fd.append('markdown', markdown);
  fd.append('bodyHtml', window._extractedHtml || ('<div>' + ta.value + '</div>'));
  fd.append('metaDescription', metaDescEl.value);
  fd.append('keywords', keywordsEl.value);
  fd.append('ogTitle', ogTitleEl.value);
  fd.append('ogDescription', ogDescEl.value);
  fd.append('ogImage', ogImageEl.value);

  const extractedImages = window._extractedImages || [];
  for (const image of extractedImages) {
    const blob = await fetch(image.dataUrl).then(r => r.blob());
    fd.append('images[]', blob, image.name);
  }

  status.className = 'ok';
  status.textContent = 'Publishing...';

  try {
    const response = await fetch('/publish.php', {
      method: 'POST',
      body: fd,
      credentials: 'same-origin'
    });
    if (response.status === 401) {
      clearAdminPass();
      const gate = document.getElementById('auth-gate');
      if (gate) gate.classList.remove('is-hidden');
      status.className = 'err';
      status.textContent = 'Session rejected — please log in again.';
      return;
    }
    const data = await response.json();
    if (data && data.ok && data.url) {
      status.className = 'ok';
      status.innerHTML = 'Published successfully: <a href="' + data.url + '" target="_blank" rel="noopener noreferrer">' + data.url + '</a>';
    } else {
      status.className = 'err';
      status.textContent = (data && data.error) ? data.error : 'Publish failed';
    }
  } catch (error) {
    status.className = 'err';
    status.textContent = 'Publish failed: ' + (error && error.message ? error.message : 'Unknown error');
  }
}

// ---------- Drafts (browser only) ----------
function saveDraft() {
  const draft = {
    title: titleEl.value, date: dateEl.value, slug: slugEl.value,
    excerpt: excerptEl.value, imageAlt: imageAltEl.value,
    readMinutes: readMinutesEl.value, body: ta.value,
    metaDescription: metaDescEl.value,
    keywords: keywordsEl.value,
    ogTitle: ogTitleEl.value,
    ogDescription: ogDescEl.value,
    ogImage: ogImageEl.value
  };
  localStorage.setItem('blogDraft', JSON.stringify(draft));
  status.className = 'ok'; status.textContent = '✓ Draft saved in this browser.';
}
function loadDraft() {
  const d = JSON.parse(localStorage.getItem('blogDraft') || '{}');
  titleEl.value = d.title || ''; dateEl.value = d.date || '';
  slugEl.value = d.slug || ''; excerptEl.value = d.excerpt || '';
  imageAltEl.value = d.imageAlt || '';
  readMinutesEl.value = d.readMinutes || 2;
  ta.value = d.body || '';
  metaDescEl.value = d.metaDescription || '';
  keywordsEl.value = d.keywords || '';
  ogTitleEl.value = d.ogTitle || '';
  ogDescEl.value = d.ogDescription || '';
  ogImageEl.value = d.ogImage || '';
  excerptCounterEl.textContent = excerptEl.value.length + ' / 400 characters';
  render();
}
function clearAll() {
  if (!confirm('Clear everything?')) return;
  [titleEl, dateEl, slugEl, excerptEl, imageAltEl, ta].forEach(el => el.value = '');
  readMinutesEl.value = 2;
  delete slugEl.dataset.manual;
  render();
  excerptCounterEl.textContent = '0 / 400 characters';
  imagesSummaryEl.textContent = 'No images extracted yet.';
  window._extractedImages = [];
  extractedHtml = '';
  window._extractedHtml = '';
  metaDescEl.value = '';
  keywordsEl.value = '';
  ogTitleEl.value  = '';
  ogDescEl.value   = '';
  ogImageEl.value  = '';
  backToEdit();
  status.className = '';
  status.textContent = '';
  fileInput.value = '';
}
function logout() {
  sessionStorage.removeItem('blogAdminAuth');
  location.reload();
}

function handleDocx(file) {
  if (typeof mammoth === 'undefined') {
    status.className = 'err';
    status.textContent = 'Word import library failed to load. Check your internet connection and refresh the page.';
    return;
  }
  if (!file.name.endsWith('.docx')) {
    alert('Please upload a .docx file (not .doc, .pdf, or other formats).');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
      .then(function (result) {
        processConverted(result, file.name);
        mammoth.convertToHtml({ arrayBuffer: arrayBuffer }).then(function (htmlResult) {
          if (!window._extractedHtml) {
            window._extractedHtml = htmlResult.value || '';
          }
        });
      })
      .catch(err => {
        alert('Could not read the document: ' + err.message);
      });
  };
  reader.readAsArrayBuffer(file);
}

function processConverted(result, filename) {
  const html = result.value;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // Auto-fill title from first h1 or h2
  const firstHeading = tmp.querySelector('h1, h2');
  if (firstHeading && !titleEl.value) {
    titleEl.value = firstHeading.textContent.trim();
    titleEl.dispatchEvent(new Event('input'));
    firstHeading.remove();
  }

  // Extract embedded images (base64 data URLs)
  const images = tmp.querySelectorAll('img');
  const extractedImgs = [];
  images.forEach((img, idx) => {
    const src = img.getAttribute('src') || '';
    if (src.startsWith('data:image/')) {
      const match = src.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const base = (titleEl.value || 'image')
          .toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
        const imgName = base + '-' + (idx + 1) + '.' + ext;
        extractedImgs.push({ name: imgName, dataUrl: src, alt: img.alt || '' });
        img.setAttribute('src', '/blog/posts/images/' + imgName);
      }
    }
  });

  // Convert HTML to Markdown
  const markdown = htmlToMarkdown(tmp);
  ta.value = markdown.trim();
  render();

  extractedHtml = tmp.innerHTML;
  window._extractedHtml = extractedHtml;

  // Show extracted images summary (kept in memory until publish)
  if (extractedImgs.length > 0) {
    imagesSummaryEl.textContent = extractedImgs.length + ' image(s) ready to publish: ' +
      extractedImgs.map(function (img) { return img.name; }).join(', ');
    window._extractedImages = extractedImgs;
  } else {
    imagesSummaryEl.textContent = 'No images extracted yet.';
    window._extractedImages = [];
  }

  status.className = 'ok';
  status.textContent = '✓ "' + filename + '" imported. ' +
    (extractedImgs.length > 0
      ? extractedImgs.length + ' image(s) are ready for publish.'
      : 'No images found in document.');

  if (result.messages && result.messages.length > 0) {
    console.log('Mammoth conversion notes:', result.messages);
  }
}

// HTML → Markdown converter (matches the parser in blog.js)
function htmlToMarkdown(root) {
  let md = '';
  root.childNodes.forEach(node => {
    md += nodeToMd(node) + '\n\n';
  });
  return md.replace(/\n{3,}/g, '\n\n');
}

function nodeToMd(node) {
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeType !== 1) return '';
  const tag = node.tagName.toLowerCase();
  const inner = Array.from(node.childNodes).map(nodeToMd).join('');
  switch (tag) {
    case 'h1':
    case 'h2': return '# ' + inner;
    case 'h3': return '## ' + inner;
    case 'h4': return '### ' + inner;
    case 'p': return inner;
    case 'strong':
    case 'b': return '**' + inner + '**';
    case 'em':
    case 'i': return '*' + inner + '*';
    case 'a':
      return '[' + inner + '](' + (node.getAttribute('href') || '') + ')';
    case 'img':
      return '![' + (node.getAttribute('alt') || '') + '](' +
             (node.getAttribute('src') || '') + ')';
    case 'ul':
      return Array.from(node.querySelectorAll(':scope > li'))
        .map(li => '- ' + Array.from(li.childNodes).map(nodeToMd).join('').trim())
        .join('\n');
    case 'ol':
      return Array.from(node.querySelectorAll(':scope > li'))
        .map((li, i) => (i + 1) + '. ' + Array.from(li.childNodes).map(nodeToMd).join('').trim())
        .join('\n');
    case 'blockquote': return '> ' + inner;
    case 'hr': return '---';
    case 'br': return '\n';
    case 'code': return '`' + inner + '`';
    default: return inner;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  (function() {
    // The username is cosmetic only — a single shared password is what the
    // server actually checks. No credentials are stored in this file.
    const ADMIN_USER = 'admin';

    const gate = document.getElementById('auth-gate');
    const form = document.getElementById('auth-form');
    const err = document.getElementById('auth-error');
    const submitBtn = form.querySelector('.auth-submit');

    // Only stay logged in if we still hold the password for this tab
    if (sessionStorage.getItem('blogAdminAuth') === '1' && getAdminPass()) {
      gate.classList.add('is-hidden');
    } else {
      clearAdminPass();
    }

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const u = document.getElementById('auth-user').value;
      const p = document.getElementById('auth-pass').value;
      const passField = document.getElementById('auth-pass');

      if (u !== ADMIN_USER) {
        err.textContent = 'Incorrect username or password.';
        passField.value = '';
        return;
      }

      err.textContent = '';
      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'Checking...';

      try {
        // Verify the password against the server. Nothing is trusted locally.
        const fd = new FormData();
        fd.append('action', 'check');
        fd.append('password', p);

        const response = await fetch('/publish.php', {
          method: 'POST',
          body: fd,
          credentials: 'same-origin'
        });

        if (response.ok) {
          setAdminPass(p);
          sessionStorage.setItem('blogAdminAuth', '1');
          gate.classList.add('is-hidden');
          err.textContent = '';
          passField.value = '';
        } else if (response.status === 401) {
          err.textContent = 'Incorrect username or password.';
          passField.value = '';
        } else {
          err.textContent = 'Login failed (server error ' + response.status + ').';
          passField.value = '';
        }
      } catch (error) {
        err.textContent = 'Login failed: could not reach the server.';
        passField.value = '';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });

    // Focus the username field on load
    document.getElementById('auth-user').focus();
  })();

  ta = document.getElementById('body');
  titleEl = document.getElementById('title');
  dateEl = document.getElementById('date');
  slugEl = document.getElementById('slug');
  excerptEl = document.getElementById('excerpt');
  imageAltEl = document.getElementById('imageAlt');
  readMinutesEl = document.getElementById('readMinutes');
  excerptCounterEl = document.getElementById('excerptCounter');
  imagesSummaryEl = document.getElementById('imagesSummary');
  preview = document.getElementById('preview');
  status = document.getElementById('status');

  seoSection      = document.getElementById('seo-section');
  generateSeoBtn  = document.getElementById('generateSeoBtn');
  publishBtnEl    = document.getElementById('publishBtn');
  backToEditBtn   = document.getElementById('backToEditBtn');
  metaDescEl      = document.getElementById('metaDescription');
  keywordsEl      = document.getElementById('keywords');
  ogTitleEl       = document.getElementById('ogTitle');
  ogDescEl        = document.getElementById('ogDescription');
  ogImageEl       = document.getElementById('ogImage');
  metaDescCounter = document.getElementById('metaDescCounter');

  dropzone = document.getElementById('dropzone');
  fileInput = document.getElementById('docxFile');

  titleEl.addEventListener('input', function () {
    if (!slugEl.dataset.manual) {
      slugEl.value = slugify(titleEl.value).substring(0, 60);
    }
  });
  slugEl.addEventListener('input', function () { slugEl.dataset.manual = '1'; });
  excerptEl.addEventListener('input', function () {
    excerptCounterEl.textContent = excerptEl.value.length + ' / 400 characters';
  });

  ta.addEventListener('input', render);
  // Paste handler — strip Word formatting cleanly
  ta.addEventListener('paste', function () { setTimeout(render, 10); });

  [metaDescEl, ogTitleEl, ogDescEl, ogImageEl, keywordsEl].forEach(function (el) {
    if (el) el.addEventListener('input', updateSeoPreviews);
  });

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('is-drag-over');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('is-drag-over');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-drag-over');
    if (e.dataTransfer.files[0]) handleDocx(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleDocx(e.target.files[0]);
  });

  document.getElementById('boldBtn').addEventListener('click', function () { wrap('**', '**', 'bold'); });
  document.getElementById('italicBtn').addEventListener('click', function () { wrap('*', '*', 'italic'); });
  document.getElementById('h2Btn').addEventListener('click', function () { prefix('# '); });
  document.getElementById('h3Btn').addEventListener('click', function () { prefix('## '); });
  document.getElementById('listBtn').addEventListener('click', function () { prefix('- '); });
  document.getElementById('quoteBtn').addEventListener('click', function () { prefix('> '); });
  document.getElementById('linkBtn').addEventListener('click', insertLink);
  document.getElementById('imageBtn').addEventListener('click', insertImage);
  document.getElementById('dividerBtn').addEventListener('click', function () { insert('\n---\n'); });

  document.getElementById('generateSeoBtn').addEventListener('click', generateSeo);
  document.getElementById('publishBtn').addEventListener('click', publishPost);
  document.getElementById('backToEditBtn').addEventListener('click', backToEdit);
  document.getElementById('loadDraftBtn').addEventListener('click', loadDraft);
  document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);
  document.getElementById('clearAllBtn').addEventListener('click', clearAll);
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Init
  dateEl.value = new Date().toISOString().slice(0, 10);
  readMinutesEl.value = 2;
  excerptCounterEl.textContent = excerptEl.value.length + ' / 400 characters';
  window._extractedImages = [];
  window._extractedHtml = '';
  render();
});
