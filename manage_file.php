<?php
header('Content-Type: application/json; charset=utf-8');

$action = isset($_POST['action']) ? $_POST['action'] : '';
$type = isset($_POST['type']) ? $_POST['type'] : '';
$allowedTypes = ['backgrounds', 'characters', 'audio'];

if (!in_array($type, $allowedTypes)) {
    echo json_encode(['success' => false, 'error' => 'Invalid type']);
    exit;
}

$dir = $type . '/';

// basename() strips any path separators so the request can never escape the target folder
if ($action === 'delete') {
    $file = isset($_POST['file']) ? basename($_POST['file']) : '';
    if ($file === '') {
        echo json_encode(['success' => false, 'error' => 'File name is missing']);
        exit;
    }

    $path = $dir . $file;
    if (!file_exists($path)) {
        echo json_encode(['success' => false, 'error' => 'File not found']);
        exit;
    }

    if (unlink($path)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Could not delete the file']);
    }
    exit;
}

if ($action === 'rename') {
    $file = isset($_POST['file']) ? basename($_POST['file']) : '';
    $newName = isset($_POST['newName']) ? trim($_POST['newName']) : '';

    if ($file === '' || $newName === '') {
        echo json_encode(['success' => false, 'error' => 'Missing data']);
        exit;
    }

    $path = $dir . $file;
    if (!file_exists($path)) {
        echo json_encode(['success' => false, 'error' => 'File not found']);
        exit;
    }

    // نحافظ على الامتداد الأصلي للملف دائماً، ونسمح فقط بتغيير الاسم قبل الامتداد
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $safeBase = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($newName, PATHINFO_FILENAME));

    if ($safeBase === '') {
        echo json_encode(['success' => false, 'error' => 'Invalid name']);
        exit;
    }

    $newPath = $dir . $safeBase . '.' . $ext;

    if ($newPath === $path) {
        // نفس الاسم فعلياً، لا داعي لأي عملية
        echo json_encode(['success' => true, 'path' => $path]);
        exit;
    }

    if (file_exists($newPath)) {
        echo json_encode(['success' => false, 'error' => 'A file with this name already exists']);
        exit;
    }

    if (rename($path, $newPath)) {
        echo json_encode(['success' => true, 'path' => $newPath]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Could not rename the file']);
    }
    exit;
}

echo json_encode(['success' => false, 'error' => 'Unknown action']);
