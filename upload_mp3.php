<?php
header('Content-Type: application/json; charset=utf-8');

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'File was not received correctly']);
    exit;
}

// حد أقصى 1 ميغابايت
if ($_FILES['file']['size'] > 1 * 1024 * 1024) {
    echo json_encode(['success' => false, 'error' => 'File size exceeds the allowed limit (1MB)']);
    exit;
}

$originalName = $_FILES['file']['name'];
$ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

if ($ext !== 'mp3') {
    echo json_encode(['success' => false, 'error' => 'Unsupported file format (mp3 only)']);
    exit;
}

$dir = 'audio/';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

// تنظيف اسم الملف من أي رموز غير آمنة
$safeBase = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
if ($safeBase === '') $safeBase = 'audio';
$targetPath = $dir . $safeBase . '.' . $ext;

// تفادي الكتابة فوق ملف موجود بنفس الاسم
$counter = 1;
while (file_exists($targetPath)) {
    $targetPath = $dir . $safeBase . '_' . $counter . '.' . $ext;
    $counter++;
}

if (move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
    echo json_encode(['success' => true, 'path' => $targetPath]);
} else {
    echo json_encode(['success' => false, 'error' => 'Could not save the file on the server']);
}
