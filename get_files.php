<?php
header('Content-Type: application/json; charset=utf-8');

$type = isset($_GET['type']) ? $_GET['type'] : '';
$dir = "";

if ($type === 'backgrounds') {
    $dir = "backgrounds/";
    $allowedExt = ['png', 'jpg', 'jpeg'];
} elseif ($type === 'characters') {
    $dir = "characters/";
    $allowedExt = ['png', 'jpg', 'jpeg'];
} elseif ($type === 'audio') {
    $dir = "audio/";
    $allowedExt = ['mp3'];
} else {
    echo json_encode([]);
    exit;
}

$files = [];
if (is_dir($dir)) {
    $handle = opendir($dir);
    while (($file = readdir($handle)) !== false) {
        if ($file !== '.' && $file !== '..') {
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (in_array($ext, $allowedExt)) {
                $files[] = $dir . $file;
            }
        }
    }
    closedir($handle);
}

echo json_encode($files);
?>