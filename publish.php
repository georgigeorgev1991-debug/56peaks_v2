<?php
// publish.php — Receives blog posts from blog/admin.html
// Writes: blog/posts/{slug}.md, blog/posts/images/*, blog/{slug}.html, updates blog/posts.json, sitemap.xml, blog/feed.xml

declare(strict_types=1);

// GD image conversion can be memory-hungry on large photos
@ini_set('memory_limit', '256M');

// ---------- Config ----------
// Bcrypt hash of the shared admin password. Generate your own with:
//   php -r "echo password_hash('your-long-random-password', PASSWORD_DEFAULT), PHP_EOL;"
// then paste the result below. The plaintext password lives nowhere on the server.
// NOTE: the hash contains $ characters — keep it in SINGLE quotes.
const ADMIN_HASH    = '$2y$12$3GMKVTKeFtFGEiV/5iBFbugaZLsUbmOVs2kv6XtS.xVyrSakGh6aO';
const ALLOWED_HOST  = 'bulgarian56peaks.org';
const MAX_IMG_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES    = 30;
const MAX_MD_BYTES  = 200 * 1024;

// ---------- Helpers ----------
function fail(int $code, string $msg): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}
function ok(array $data): void {
    header('Content-Type: application/json');
    echo json_encode(['ok' => true] + $data);
    exit;
}
function h(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function jstr(string $s): string {
    // For embedding into JSON-LD JSON values. Strip control chars then JSON-encode without surrounding quotes.
    $s = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $s) ?? '';
    $enc = json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return $enc !== false ? substr($enc, 1, -1) : '';
}
function atomicWrite(string $path, string $contents): bool {
    $tmp = $path . '.tmp';
    if (file_put_contents($tmp, $contents) === false) return false;
    if (!rename($tmp, $path)) return false;
    @chmod($path, 0644);
    return true;
}

/**
 * Convert any GD-supported image to WebP. Returns true on success.
 * $imageType is the IMAGETYPE_* constant from getimagesize().
 */
function convertToWebp(string $srcPath, string $destPath, int $imageType, int $quality = 85): bool {
    if (!function_exists('imagewebp')) return false;

    switch ($imageType) {
        case IMAGETYPE_JPEG: $im = @imagecreatefromjpeg($srcPath); break;
        case IMAGETYPE_PNG:  $im = @imagecreatefrompng($srcPath);
                             if ($im) {
                                 imagepalettetotruecolor($im);
                                 imagealphablending($im, true);
                                 imagesavealpha($im, true);
                             }
                             break;
        case IMAGETYPE_GIF:  $im = @imagecreatefromgif($srcPath); break;
        case IMAGETYPE_WEBP: $im = @imagecreatefromwebp($srcPath); break;
        default: return false;
    }
    if (!$im) return false;

    $ok = @imagewebp($im, $destPath, $quality);
    imagedestroy($im);
    return (bool)$ok;
}

// ---------- Method + origin ----------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Method not allowed');
$referer = $_SERVER['HTTP_REFERER'] ?? '';
if (strpos($referer, 'https://' . ALLOWED_HOST) !== 0) fail(403, 'Bad origin');

// ---------- Auth ----------
$pass = (string)($_POST['password'] ?? '');
if (!password_verify($pass, ADMIN_HASH)) {
    // Crude but effective throttle: a wrong password costs the caller a second.
    sleep(1);
    fail(401, 'Bad password');
}

// ---------- Login check ----------
// blog/admin.js posts action=check with only a password to validate the login
// gate. Auth has passed by this point, so just confirm and stop.
if (($_POST['action'] ?? '') === 'check') {
    ok(['checked' => true]);
}

if (!function_exists('imagewebp') || !function_exists('imagecreatefromjpeg')) {
    fail(500, 'Server is missing GD with WebP support — contact admin');
}

// ---------- Validate fields ----------
$slug         = trim((string)($_POST['slug']           ?? ''));
$title        = trim((string)($_POST['title']          ?? ''));
$date         = trim((string)($_POST['date']           ?? ''));
$author       = trim((string)($_POST['author']         ?? 'Bulgarian 56 Peaks Team'));
$excerpt      = trim((string)($_POST['excerpt']        ?? ''));
$readMin      = (int)($_POST['readMinutes']            ?? 2);
$markdown     = (string)($_POST['markdown']            ?? '');
$bodyHtml     = (string)($_POST['bodyHtml']            ?? '');
$imgAlt       = trim((string)($_POST['imageAlt']       ?? ''));
$metaDesc     = trim((string)($_POST['metaDescription']?? ''));
$keywords     = trim((string)($_POST['keywords']       ?? ''));
$ogTitle      = trim((string)($_POST['ogTitle']        ?? ''));
$ogDesc       = trim((string)($_POST['ogDescription'] ?? ''));
$ogImage      = trim((string)($_POST['ogImage']        ?? ''));

if (!preg_match('/^[a-z0-9][a-z0-9-]*[a-z0-9]$/', $slug)) fail(400, 'Invalid slug');
if ($title === '' || mb_strlen($title) > 200)             fail(400, 'Invalid title');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date))          fail(400, 'Invalid date');
if (mb_strlen($excerpt) > 400)                            fail(400, 'Excerpt too long');
if (mb_strlen($metaDesc) > 200)                           fail(400, 'Meta description too long');
if (mb_strlen($ogTitle) > 200)                            fail(400, 'OG title too long');
if (mb_strlen($ogDesc) > 300)                             fail(400, 'OG description too long');
if (mb_strlen($keywords) > 300)                           fail(400, 'Keywords too long');
if ($readMin < 1 || $readMin > 60)                        $readMin = 2;
if (strlen($markdown) === 0 || strlen($markdown) > MAX_MD_BYTES) fail(400, 'Markdown empty or too large');
if (strlen($bodyHtml) === 0 || strlen($bodyHtml) > 4 * MAX_MD_BYTES) fail(400, 'Body HTML empty or too large');

// ---------- Paths ----------
$root      = __DIR__;
$blogDir   = $root . '/blog';
$postsDir  = $blogDir . '/posts';
$imagesDir = $postsDir . '/images';
$mdPath    = $postsDir . '/' . $slug . '.md';
$htmlPath  = $blogDir . '/' . $slug . '.html';
$jsonPath  = $blogDir . '/posts.json';
$tmplPath  = $blogDir . '/post-template.html';
$sitemap   = $root . '/sitemap.xml';
$rssPath   = $blogDir . '/feed.xml';

foreach ([$postsDir, $imagesDir, $blogDir] as $d) {
    if (!is_dir($d) || !is_writable($d)) fail(500, 'Dir not writable: ' . basename($d));
}
if (!is_writable($jsonPath)) fail(500, 'posts.json not writable');
if (!is_file($tmplPath))      fail(500, 'post-template.html missing');

// ---------- Handle image uploads (convert all to WebP) ----------
$savedImages = [];
$coverImage  = '';
if (!empty($_FILES['images']) && is_array($_FILES['images']['name'])) {
    $count = count($_FILES['images']['name']);
    if ($count > MAX_IMAGES) fail(400, 'Too many images');

    for ($i = 0; $i < $count; $i++) {
        if ($_FILES['images']['error'][$i] !== UPLOAD_ERR_OK) fail(400, 'Upload error');
        if ($_FILES['images']['size'][$i] > MAX_IMG_BYTES)    fail(400, 'Image too large');

        $tmp  = $_FILES['images']['tmp_name'][$i];
        $orig = $_FILES['images']['name'][$i];

        // Real content-type detection
        $info = @getimagesize($tmp);
        if (!$info) fail(400, 'Not a valid image: ' . $orig);

        $allowed = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_GIF, IMAGETYPE_WEBP];
        if (!in_array($info[2], $allowed, true)) fail(400, 'Unsupported image type: ' . $orig);

        // Build safe filename, always with .webp extension
        $base = pathinfo($orig, PATHINFO_FILENAME);
        $base = strtolower(preg_replace('/[^a-z0-9-]+/i', '-', $base) ?? '');
        $base = trim($base, '-');
        if ($base === '') $base = $slug . '-' . ($i + 1);

        $finalName = $base . '.webp';
        $finalPath = $imagesDir . '/' . $finalName;

        // Avoid clobbering unrelated files
        if (file_exists($finalPath) && strpos($finalName, $slug) === false) {
            $finalName = $slug . '-' . ($i + 1) . '.webp';
            $finalPath = $imagesDir . '/' . $finalName;
        }

        // Convert to WebP, writing atomically
        $tmpDest = $finalPath . '.tmp';
        if (!convertToWebp($tmp, $tmpDest, $info[2], 85)) {
            @unlink($tmpDest);
            fail(500, 'WebP conversion failed for: ' . $orig);
        }
        if (!rename($tmpDest, $finalPath)) {
            @unlink($tmpDest);
            fail(500, 'Rename failed');
        }
        @chmod($finalPath, 0644);

        $savedImages[] = '/blog/posts/images/' . $finalName;
        if ($i === 0) $coverImage = '/blog/posts/images/' . $finalName;
    }
}

// ---------- Defaults for SEO ----------
$canonical = 'https://' . ALLOWED_HOST . '/blog/' . $slug . '.html';
if ($metaDesc === '') $metaDesc = $excerpt;
if ($ogTitle  === '') $ogTitle  = $title;
if ($ogDesc   === '') $ogDesc   = $excerpt;
$finalCover = $coverImage ?: '/hero.webp';
$ogImageAbs = $ogImage !== ''
    ? (preg_match('#^https?://#', $ogImage) ? $ogImage : 'https://' . ALLOWED_HOST . $ogImage)
    : 'https://' . ALLOWED_HOST . $finalCover;

// ---------- Write markdown ----------
if (!atomicWrite($mdPath, $markdown)) fail(500, 'MD write failed');

// ---------- Render static HTML from template ----------
$tpl = file_get_contents($tmplPath);
if ($tpl === false) fail(500, 'Template read failed');

$dateHuman = date('F j, Y', strtotime($date));
$repl = [
    '{{TITLE}}'                 => h($title),
    '{{TITLE_JSON}}'            => jstr($title),
    '{{META_DESCRIPTION}}'      => h($metaDesc),
    '{{META_DESCRIPTION_JSON}}' => jstr($metaDesc),
    '{{KEYWORDS}}'              => h($keywords),
    '{{AUTHOR}}'                => h($author),
    '{{AUTHOR_JSON}}'           => jstr($author),
    '{{CANONICAL_URL}}'         => h($canonical),
    '{{OG_TITLE}}'              => h($ogTitle),
    '{{OG_DESCRIPTION}}'        => h($ogDesc),
    '{{OG_IMAGE}}'              => h($ogImageAbs),
    '{{OG_IMAGE_ALT}}'          => h($imgAlt !== '' ? $imgAlt : $title),
    '{{DATE_ISO}}'              => h($date),
    '{{DATE_HUMAN}}'            => h($dateHuman),
    '{{READ_MINUTES}}'          => (string)$readMin,
    '{{EXCERPT}}'               => h($excerpt),
    '{{BODY_HTML}}'             => $bodyHtml,   // trusted-author HTML, NOT escaped
];
$html = strtr($tpl, $repl);
if (!atomicWrite($htmlPath, $html)) fail(500, 'HTML write failed');

// ---------- Update posts.json ----------
$jsonRaw = file_get_contents($jsonPath);
$json = json_decode($jsonRaw, true);
if (!is_array($json) || !isset($json['posts']) || !is_array($json['posts'])) {
    $json = ['posts' => []];
}
$json['posts'] = array_values(array_filter(
    $json['posts'],
    function ($p) use ($slug) { return ($p['slug'] ?? '') !== $slug; }
));
$entry = [
    'slug'        => $slug,
    'title'       => $title,
    'date'        => $date,
    'author'      => $author,
    'excerpt'     => $excerpt,
    'image'       => $finalCover,
    'imageAlt'    => $imgAlt !== '' ? $imgAlt : $title,
    'readMinutes' => $readMin,
    'url'         => '/blog/' . $slug . '.html',
    'published'   => true,
];
array_unshift($json['posts'], $entry);
$jsonOut = json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if (!atomicWrite($jsonPath, $jsonOut)) fail(500, 'JSON write failed');

// ---------- Update sitemap.xml ----------
if (is_writable($sitemap)) {
    $smRaw = file_get_contents($sitemap);
    // Remove any existing entry for this slug
    $smRaw = preg_replace(
        '#\s*<url>\s*<loc>https://' . preg_quote(ALLOWED_HOST, '#') . '/blog/' . preg_quote($slug, '#') . '\.html</loc>.*?</url>#s',
        '',
        $smRaw
    ) ?? $smRaw;
    $today = date('Y-m-d');
    $newUrl = "  <url>\n    <loc>https://" . ALLOWED_HOST . "/blog/{$slug}.html</loc>\n    <lastmod>{$today}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.7</priority>\n  </url>\n";
    $smRaw = preg_replace('#</urlset>#', $newUrl . '</urlset>', $smRaw, 1);
    atomicWrite($sitemap, $smRaw);
}

// ---------- Regenerate RSS feed ----------
if (is_writable($blogDir)) {
    $rssItems = '';
    foreach (array_slice($json['posts'], 0, 20) as $p) {
        if (empty($p['published'])) continue;
        $purl = 'https://' . ALLOWED_HOST . '/blog/' . $p['slug'] . '.html';
        $pubDate = date(DATE_RSS, strtotime($p['date']));
        $rssItems .= "  <item>\n"
                  .  "    <title>" . h($p['title']) . "</title>\n"
                  .  "    <link>" . h($purl) . "</link>\n"
                  .  "    <guid isPermaLink=\"true\">" . h($purl) . "</guid>\n"
                  .  "    <pubDate>" . $pubDate . "</pubDate>\n"
                  .  "    <description>" . h($p['excerpt'] ?? '') . "</description>\n"
                  .  "  </item>\n";
    }
    $rss = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
         . "<rss version=\"2.0\"><channel>\n"
         . "  <title>Bulgarian 56 Peaks Blog</title>\n"
         . "  <link>https://" . ALLOWED_HOST . "/blog/</link>\n"
         . "  <description>News and stories from Bulgarian 56 Peaks.</description>\n"
         . "  <language>en</language>\n"
         . "  <lastBuildDate>" . date(DATE_RSS) . "</lastBuildDate>\n"
         . $rssItems
         . "</channel></rss>\n";
    atomicWrite($rssPath, $rss);
}

ok([
    'slug'   => $slug,
    'url'    => $canonical,
    'images' => $savedImages,
]);
