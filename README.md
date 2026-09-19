# SSMS — Simple Stop Motion Studio

A lightweight, browser-based stop-motion animation tool. Drag characters and backgrounds onto a stage, save shots, and play them back as a film — all in plain PHP, HTML, CSS, and JavaScript.

## Features

- Drag, rotate, scale, flip, and hide/show characters and backgrounds
- Custom pivot points for rotation
- Composite rigs (group multiple parts together)
- Save, update, duplicate, and delete shots on a timeline
- Play back the film at a custom FPS
- Export/import scenarios as JSON
- Export all shots as full-size PNG images (ZIP)
- Built-in file manager to upload, rename, and delete images
- Fixed 16:9 stage

## Requirements

- A PHP-enabled web server (e.g. XAMPP, MAMP, or any standard PHP hosting)

## Setup

1. Upload all files to your PHP server.
2. Create two folders in the project root: `backgrounds/` and `characters/`.
3. Open `index.php` in your browser.

## Files

| File | Purpose |
|---|---|
| `index.php` | Main app (the stage editor) |
| `script.js` | App logic |
| `get_files.php` | Lists background/character images |
| `upload.php` | Handles image uploads |
| `manage_file.php` | Handles rename/delete of images |
| `file_manager.php` | Standalone page to organize images (open in a new tab) |

## Notes

- Organize your images in the File Manager **before** starting a scene — renaming or deleting an image breaks any saved scenario that references it.
