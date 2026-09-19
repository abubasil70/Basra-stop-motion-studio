<?php
header('Content-Type: application/json; charset=utf-8');

$type = isset($_POST['type']) ? $_POST['type'] : '';
$allowedTypes = ['backgrounds', 'characters'];

if (!in_array($type, $allowedTypes)) {
    echo json_encode(['success' => false, 'error' => 'Invalid type']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'File was not received correctly']);
    exit;
}

// حد أقصى معقول لحجم الملف (8 ميغابايت) لتفادي رفع ملفات ضخمة بالخطأ
if ($_FILES['file']['size'] > 8 * 1024 * 1024) {
    echo json_encode(['success' => false, 'error' => 'File size exceeds the allowed limit (8MB)']);
    exit;
}

$allowedExt = ['png', 'jpg', 'jpeg'];
$originalName = $_FILES['file']['name'];
$ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

if (!in_array($ext, $allowedExt)) {
    echo json_encode(['success' => false, 'error' => 'Unsupported file format (png or jpg only)']);
    exit;
}

$dir = $type . '/';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

// تنظيف اسم الملف من أي رموز غير آمنة
$safeBase = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
if ($safeBase === '') $safeBase = 'image';
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
