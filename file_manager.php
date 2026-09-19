<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <title>SSMS - File Manager</title>
    <style>
        html, body {
            margin: 0; padding: 0;
            font-family: Tahoma, sans-serif;
            background-color: #222;
            color: #eee;
        }
        .page {
            max-width: 1100px; margin: 0 auto; padding: 20px;
            box-sizing: border-box;
        }
        h1 {
            font-size: 20px; margin: 0 0 14px 0;
        }
        .warning-banner {
            background: #4a1414; border: 2px solid #eb3b5a; color: #ffdada;
            padding: 14px 16px; border-radius: 8px; margin-bottom: 22px;
            font-size: 13px; line-height: 1.7;
        }
        .warning-banner strong {
            color: #ff6b81; display: block; font-size: 14px; margin-bottom: 6px;
        }
        section {
            background: #1b1b1b; border-radius: 8px; padding: 14px 16px;
            margin-bottom: 22px;
        }
        section h2 {
            font-size: 15px; margin: 0 0 12px 0; color: #ddd;
            border-bottom: 2px solid #007bff; padding-bottom: 6px;
        }
        .empty-msg {
            font-size: 12px; color: #888; padding: 6px 2px;
        }
        .files-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 12px;
        }
        .file-card {
            background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px;
            padding: 8px; display: flex; flex-direction: column; gap: 6px;
        }
        .file-card img {
            width: 100%; height: 90px; object-fit: contain;
            background: #111; border-radius: 4px;
        }
        .file-card .name-row {
            display: flex; gap: 4px; align-items: center;
        }
        .file-card input[type="text"] {
            flex: 1; min-width: 0; font-size: 11px; padding: 4px 5px;
            border-radius: 4px; border: 1px solid #444; background: #111; color: #eee;
            box-sizing: border-box;
        }
        .file-card .ext-label {
            font-size: 11px; color: #999;
        }
        .file-card .actions {
            display: flex; gap: 4px;
        }
        .file-card button {
            flex: 1; font-size: 11px; padding: 5px 4px; cursor: pointer;
            border: none; border-radius: 4px; color: #fff;
        }
        .btn-save { background-color: #28a745; }
        .btn-save:hover { background-color: #1e7e34; }
        .btn-delete { background-color: #eb3b5a; }
        .btn-delete:hover { background-color: #c72e4a; }
        .status-msg {
            font-size: 10px; min-height: 14px; color: #7fd67f;
        }
        .status-msg.error { color: #ff8080; }
        .refresh-row {
            display: flex; justify-content: flex-end; margin-bottom: 8px;
        }
        .refresh-row button {
            background: #6c757d; color: #fff; border: none; border-radius: 4px;
            padding: 5px 10px; font-size: 12px; cursor: pointer;
        }
        .refresh-row button:hover { background: #565e64; }
    </style>
</head>
<body>
<div class="page">
    <h1>🗂 File Manager — Backgrounds &amp; Characters</h1>

    <div class="warning-banner">
        <strong>⚠ Read before you rename or delete anything</strong>
        Saved scenario files (the ones exported from the editor as "Save Shots File") store each background
        and character by its file name and folder path, not by a copy of the image itself. If you rename or
        delete a file that is already used in a scenario you plan to keep working on, that scenario will no
        longer be able to find the image when you import it again. Organize, rename and clean up your files
        here <em>before</em> you start building a scene — not in the middle of one.
    </div>

    <div class="refresh-row">
        <button onclick="loadAll()">🔄 Refresh Lists</button>
    </div>

    <section>
        <h2>Backgrounds</h2>
        <div id="backgrounds-grid" class="files-grid"></div>
    </section>

    <section>
        <h2>Characters &amp; Parts</h2>
        <div id="characters-grid" class="files-grid"></div>
    </section>
</div>

<script>
function loadList(type, gridId) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '<p class="empty-msg">Loading...</p>';

    fetch(`get_files.php?type=${type}`)
        .then(response => response.json())
        .then(files => {
            grid.innerHTML = '';
            if (!files.length) {
                grid.innerHTML = '<p class="empty-msg">No files yet.</p>';
                return;
            }
            files.forEach(path => grid.appendChild(buildFileCard(path, type)));
        })
        .catch(err => {
            grid.innerHTML = '<p class="empty-msg">Could not load the list.</p>';
            console.error(err);
        });
}

function splitNameExt(path) {
    const fileName = path.split('/').pop();
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex === -1) return { base: fileName, ext: '' };
    return { base: fileName.substring(0, dotIndex), ext: fileName.substring(dotIndex + 1) };
}

function buildFileCard(path, type) {
    const fileName = path.split('/').pop();
    const { base, ext } = splitNameExt(path);

    const card = document.createElement('div');
    card.className = 'file-card';

    const img = document.createElement('img');
    img.src = path;
    img.alt = fileName;
    card.appendChild(img);

    const nameRow = document.createElement('div');
    nameRow.className = 'name-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = base;

    const extLabel = document.createElement('span');
    extLabel.className = 'ext-label';
    extLabel.textContent = '.' + ext;

    nameRow.appendChild(input);
    nameRow.appendChild(extLabel);
    card.appendChild(nameRow);

    const status = document.createElement('div');
    status.className = 'status-msg';

    const actions = document.createElement('div');
    actions.className = 'actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-save';
    saveBtn.textContent = '✏️ Rename';
    saveBtn.onclick = () => renameFile(type, fileName, input.value, status);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.textContent = '🗑 Delete';
    delBtn.onclick = () => deleteFile(type, fileName, status);

    actions.appendChild(saveBtn);
    actions.appendChild(delBtn);
    card.appendChild(actions);
    card.appendChild(status);

    return card;
}

function setStatus(el, message, isError) {
    el.textContent = message;
    el.className = 'status-msg' + (isError ? ' error' : '');
}

async function renameFile(type, fileName, newName, statusEl) {
    if (!newName || !newName.trim()) {
        setStatus(statusEl, 'Enter a name first.', true);
        return;
    }

    const confirmed = confirm(
        `Rename "${fileName}"?\n\nMake sure this file is not already used in a scenario you want to keep working on — renaming it will break that scenario's link to this image.`
    );
    if (!confirmed) return;

    const formData = new FormData();
    formData.append('action', 'rename');
    formData.append('type', type);
    formData.append('file', fileName);
    formData.append('newName', newName);

    try {
        const response = await fetch('manage_file.php', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            setStatus(statusEl, 'Renamed.', false);
            loadList(type, type + '-grid');
        } else {
            setStatus(statusEl, data.error || 'Rename failed.', true);
        }
    } catch (err) {
        console.error(err);
        setStatus(statusEl, 'Server connection error.', true);
    }
}

async function deleteFile(type, fileName, statusEl) {
    const confirmed = confirm(
        `Delete "${fileName}"?\n\nMake sure this file is not already used in a scenario you want to keep working on — deleting it cannot be undone and will break that scenario's link to this image.`
    );
    if (!confirmed) return;

    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('type', type);
    formData.append('file', fileName);

    try {
        const response = await fetch('manage_file.php', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            loadList(type, type + '-grid');
        } else {
            setStatus(statusEl, data.error || 'Delete failed.', true);
        }
    } catch (err) {
        console.error(err);
        setStatus(statusEl, 'Server connection error.', true);
    }
}

function loadAll() {
    loadList('backgrounds', 'backgrounds-grid');
    loadList('characters', 'characters-grid');
}

document.addEventListener('DOMContentLoaded', loadAll);
</script>
</body>
</html>
