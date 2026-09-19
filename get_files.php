<?php
header('Content-Type: application/json; charset=utf-8');

$type = isset($_GET['type']) ? $_GET['type'] : '';
$dir = "";

if ($type === 'backgrounds') {
    $dir = "backgrounds/";
} elseif ($type === 'characters') {
    $dir = "characters/";
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
            if (in_array($ext, ['png', 'jpg', 'jpeg'])) {
                $files[] = $dir . $file;
            }
        }
    }
    closedir($handle);
}

echo json_encode($files);
?>