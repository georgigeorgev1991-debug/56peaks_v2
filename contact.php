<?php
header_remove('X-Powered-By');

// Contact Form Handler for Bulgarian 56 Peaks

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

ini_set('display_errors', 0);
session_start();

function ensure_csrf_token() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function rotate_csrf_token() {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}

function validate_csrf_token($submitted) {
    return isset($_SESSION['csrf_token'])
        && is_string($submitted)
        && hash_equals($_SESSION['csrf_token'], $submitted);
}

function send_json($payload, $status = 200) {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

ensure_csrf_token();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    send_json(array('csrf_token' => $_SESSION['csrf_token']));
}

$response = array('success' => false, 'message' => '');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(
        array(
            'success' => false,
            'message' => 'Method not allowed',
            'csrf_token' => ensure_csrf_token()
        ),
        405
    );
}

$submitted_token = isset($_POST['csrf_token']) ? $_POST['csrf_token'] : '';
if (!validate_csrf_token($submitted_token)) {
    send_json(
        array(
            'success' => false,
            'message' => 'Invalid security token. Please refresh the page and try again.',
            'csrf_token' => rotate_csrf_token()
        ),
        403
    );
}

// Rate Limiting (Basic session-based)
$current_time = time();
if (isset($_SESSION['last_submit_time']) && ($current_time - $_SESSION['last_submit_time']) < 60) {
    send_json(
        array(
            'success' => false,
            'message' => 'Please wait 60 seconds before sending another message.',
            'csrf_token' => ensure_csrf_token()
        ),
        429
    );
}

// Get and sanitize form data
$name    = isset($_POST['name'])    ? trim($_POST['name'])    : '';
$email   = isset($_POST['email'])   ? trim($_POST['email'])   : '';
$subject = isset($_POST['subject']) ? trim($_POST['subject']) : '';
$message = isset($_POST['message']) ? trim($_POST['message']) : '';

// Validation
$errors = array();

if (empty($name) || strlen($name) < 2 || strlen($name) > 100) {
    $errors[] = 'Name must be between 2 and 100 characters';
}
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Valid email is required';
}
if (empty($subject) || strlen($subject) < 3 || strlen($subject) > 200) {
    $errors[] = 'Subject must be between 3 and 200 characters';
}
if (empty($message) || strlen($message) < 10 || strlen($message) > 5000) {
    $errors[] = 'Message must be between 10 and 5000 characters';
}

if (!empty($errors)) {
    send_json(
        array(
            'success' => false,
            'message' => implode(', ', $errors),
            'csrf_token' => ensure_csrf_token()
        ),
        400
    );
}

// Sanitize for storage/email
$name    = htmlspecialchars($name,    ENT_QUOTES, 'UTF-8');
$email   = filter_var($email,         FILTER_SANITIZE_EMAIL);
$subject = htmlspecialchars($subject, ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

$recipient_email = 'hello@bulgarian56peaks.org';
$website_name    = 'Bulgarian 56 Peaks';

$headers  = "From: {$website_name} <noreply@bulgarian56peaks.org>\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "X-Mailer: Bulgarian56Peaks-Mailer\r\n";

$email_subject = "New Contact: " . $subject;

$email_body = "
<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;'>
    <div style='background:#0A1432;color:#fff;padding:20px;text-align:center;'>
        <h1 style='margin:0;'>{$website_name}</h1>
        <p style='margin:5px 0 0;'>New Contact Inquiry</p>
    </div>
    <div style='background:#fff;padding:30px;'>
        <p><strong>Name:</strong> {$name}</p>
        <p><strong>Email:</strong> <a href='mailto:{$email}'>{$email}</a></p>
        <p><strong>Subject:</strong> {$subject}</p>
        <hr style='border:0;border-top:1px solid #eee;margin:20px 0;'>
        <div style='background:#f9f9f9;padding:20px;border-radius:4px;white-space:pre-wrap;'>
            " . nl2br($message) . "
        </div>
    </div>
    <div style='background:#f4f4f4;padding:15px;text-align:center;font-size:12px;color:#888;'>
        Sent from Bulgarian 56 Peaks Contact Form
    </div>
</div>";

if (mail($recipient_email, $email_subject, $email_body, $headers)) {
    $_SESSION['last_submit_time'] = time();

    $confirm_headers  = "From: {$website_name} <noreply@bulgarian56peaks.org>\r\n";
    $confirm_headers .= "MIME-Version: 1.0\r\n";
    $confirm_headers .= "Content-Type: text/html; charset=UTF-8\r\n";

    $confirm_body = "
    <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;'>
        <div style='background:#0A1432;color:#fff;padding:20px;text-align:center;'>
            <h1 style='margin:0;'>Thank You, {$name}</h1>
        </div>
        <div style='background:#fff;padding:30px;'>
            <p>We received your message about <strong>{$subject}</strong> and will get back to you shortly.</p>
            <p>Best regards,<br>{$website_name} Team</p>
        </div>
    </div>";

    @mail($email, "We received your message — {$website_name}", $confirm_body, $confirm_headers);

    send_json(
        array(
            'success' => true,
            'message' => "Thank you! We'll get back to you as soon as possible.",
            'csrf_token' => rotate_csrf_token()
        ),
        200
    );
}

send_json(
    array(
        'success' => false,
        'message' => 'Sorry, there was an issue sending your message. Please try again later.',
        'csrf_token' => ensure_csrf_token()
    ),
    500
);
