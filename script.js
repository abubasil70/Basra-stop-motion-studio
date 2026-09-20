const container = document.getElementById('canvas-container');
const camLayer = document.getElementById('camera-layer'); // يلفّ الخلفية وكل الشخصيات معاً لأجل "كاميرا" المسرح الكاملة
const bgImage = document.getElementById('bg-image');
let selectedElement = null;
let bgScale = 1;
let bgOffsetX = 0; // إزاحة أفقية بالبكسل
let bgOffsetY = 0; // إزاحة عمودية بالبكسل

// ================== نظام التراجع (Undo) ==================
// يحفظ حالة المسرح الحالي (وليس الخط الزمني) قبل كل تعديل مؤثر، بحد أقصى 10 حالات —
// الأقدم يُحذف تلقائياً عند تجاوز الحد. يُفرَّغ المكدس عند القفز للقطة أخرى (انظر restoreScene).
let undoStack = [];
const UNDO_LIMIT = 10;

function pushUndoState() {
    undoStack.push(serializeScene());
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    updateUndoButtonState();
}

function undo() {
    if (undoStack.length === 0) return;
    const prevState = undoStack.pop();
    applySceneState(prevState);
    updateUndoButtonState();
}

function updateUndoButtonState() {
    const btn = document.getElementById('undo-btn');
    if (!btn) return;
    btn.disabled = undoStack.length === 0;
    btn.textContent = `↶ Undo (${undoStack.length})`;
}

// 1. تعيين خلفية المسرح
function setBackground(src) {
    pushUndoState();
    bgImage.src = src;
    // إعادة الضبط لكل خلفية جديدة حتى تبدأ من المنتصف بدون تراكم إزاحات قديمة
    bgScale = 1;
    bgOffsetX = 0;
    bgOffsetY = 0;
    updateBgTransform();
}

// 2. التحكم بالزووم والموضع للخلفية دون التأثير على الشخصيات
function updateBgTransform() {
    bgImage.style.transform =
        `translate(-50%, -50%) translate(${bgOffsetX}px, ${bgOffsetY}px) scale(${bgScale})`;
}

function zoomBg(amount) {
    pushUndoState();
    bgScale += amount;
    if (bgScale < 0.5) bgScale = 0.5; // حد أدنى للزووم
    if (bgScale > 4) bgScale = 4;     // حد أقصى للزووم
    updateBgTransform();
}

function panBg(dx, dy) {
    pushUndoState();
    bgOffsetX += dx;
    bgOffsetY += dy;
    updateBgTransform();
}

// ================== كاميرا المسرح الكاملة (خلفية + كل الشخصيات معاً) ==================
// بعكس zoomBg/panBg اللتين تحرّكان الخلفية وحدها فقط، هذه تحرّك كل شيء على المسرح دفعة واحدة
// عبر تطبيق التحويل على camera-layer نفسها (الأب المشترك للخلفية وكل الشخصيات). كل لقطة تحفظ
// قيم الكاميرا الخاصة بها، فيمكن محاكاة حركة كاميرا حقيقية (Push in / Pan) بين اللقطات أثناء العرض.
let camScale = 1;
let camOffsetX = 0;
let camOffsetY = 0;

function updateCameraTransform() {
    camLayer.style.transform = `translate(${camOffsetX}px, ${camOffsetY}px) scale(${camScale})`;
}

function zoomCam(amount) {
    pushUndoState();
    camScale += amount;
    if (camScale < 0.3) camScale = 0.3; // حد أدنى للزووم
    if (camScale > 4) camScale = 4;     // حد أقصى للزووم
    updateCameraTransform();
}

function panCam(dx, dy) {
    pushUndoState();
    camOffsetX += dx;
    camOffsetY += dy;
    updateCameraTransform();
}

function resetCamera() {
    pushUndoState();
    camScale = 1;
    camOffsetX = 0;
    camOffsetY = 0;
    updateCameraTransform();
}

// ================== خطوط التأطير الإرشادية (Composition Guides) ==================
// أداة عمل بصرية بحتة فوق المسرح (قاعدة الأثلاث + خط المنتصف): لا تُحفظ ضمن serializeScene،
// ولا تظهر في المعاينات المصغّرة أو عرض الفيلم أو التصدير، لأنها ليست جزءاً من اللقطة نفسها
function toggleCompositionGuides() {
    const layer = document.getElementById('composition-guides');
    const btn = document.getElementById('guides-btn');
    if (!layer) return;
    const isActive = layer.classList.toggle('active');
    if (btn) btn.style.backgroundColor = isActive ? '#e74c3c' : '#2c7873';
}

// 3. إضافة شخصية أو جزء لمسرح العمل (أو داخل كائن مركب محدد حالياً)
let charCounter = 0;
let topZIndex = 10;

// يحدد أي كائن مركب "نشط" حالياً بناءً على التحديد: الإطار نفسه، أو أب الجزء المحدد
function getActiveRig() {
    if (!selectedElement) return null;
    if (selectedElement.classList.contains('rig')) return selectedElement;
    if (selectedElement.parentElement && selectedElement.parentElement.classList.contains('rig')) {
        return selectedElement.parentElement;
    }
    return null;
}

function addCharacterToStage(src) {
    pushUndoState();
    // الغلاف الخارجي: هو العنصر القابل للتحديد والسحب، ويحمل التدوير والتكبير حول نقطة الارتكاز
    const wrapper = document.createElement('div');
    wrapper.className = 'character';

    // الصورة الداخلية: تحمل القلب الأفقي فقط، حول مركزها هي دائماً
    const img = document.createElement('img');
    img.src = src;
    img.className = 'character-img';
    img.draggable = false;
    wrapper.appendChild(img);

    const targetRig = getActiveRig();
    const parent = targetRig || camLayer;

    // إزاحة بسيطة لكل جزء جديد حتى لا يتراكب فوق غيره بالضبط
    const offset = (charCounter % 6) * 25;
    const base = targetRig ? 20 : 80; // إزاحة أصغر داخل الكائن المركب لأنه أصغر مساحة
    wrapper.style.left = (base + offset) + 'px';
    wrapper.style.top = (base + offset) + 'px';
    charCounter++;

    topZIndex++;
    wrapper.style.zIndex = topZIndex;

    wrapper.dataset.rotation = 0;
    wrapper.dataset.scaleX = 1;
    wrapper.dataset.scale = 1;
    wrapper.dataset.pivotX = 50; // نقطة الارتكاز الافتراضية = منتصف الصورة أفقياً
    wrapper.dataset.pivotY = 50; // نقطة الارتكاز الافتراضية = منتصف الصورة عمودياً
    
    makeDraggable(wrapper);
    parent.appendChild(wrapper);
    selectElement(wrapper);
}

// إنشاء كائن مركب جديد (إطار فارغ) يمكن إضافة الأجزاء بداخله والتحكم بالكل معاً
function createRig() {
    pushUndoState();
    const rig = document.createElement('div');
    rig.className = 'rig';

    rig.dataset.rotation = 0;
    rig.dataset.scaleX = 1;
    rig.dataset.scale = 1;
    rig.dataset.pivotX = 50;
    rig.dataset.pivotY = 50;

    const offset = (charCounter % 6) * 25;
    rig.style.left = (250 + offset) + 'px';
    rig.style.top = (90 + offset) + 'px';
    charCounter++;

    topZIndex++;
    rig.style.zIndex = topZIndex;

    makeDraggable(rig);
    camLayer.appendChild(rig);
    selectElement(rig);
}

// 4. نظام السحب والإفلات للشخصيات
function makeDraggable(element) {
    let isDragging = false;
    let dragMoved = false;
    let startClientX, startClientY, startLeft, startTop;

    element.addEventListener('mousedown', (e) => {
        e.preventDefault(); // يمنع أي سلوك افتراضي للمتصفح (تحديد نص، سحب أصلي) يتعارض مع كودنا
        selectElement(element);

        // إذا كان وضع تحديد نقطة الارتكاز مفعّلاً، نحسب موضع النقرة داخل الصورة كنسبة مئوية
        if (pivotMode) {
            pushUndoState();
            const rect = element.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * 100;
            const py = ((e.clientY - rect.top) / rect.height) * 100;
            element.dataset.pivotX = px.toFixed(1);
            element.dataset.pivotY = py.toFixed(1);
            updateTransform(element);

            pivotMode = false;
            const btn = document.getElementById('pivot-btn');
            if (btn) btn.style.backgroundColor = '#8e44ad';
            document.body.style.cursor = 'default';

            e.stopPropagation();
            return; // لا نبدأ سحب العنصر في هذه الحالة
        }

        isDragging = true;
        dragMoved = false;
        // نسجّل نقطة البداية بمقياس الشاشة الحقيقي + الموضع المحلي الحالي للعنصر،
        // بدل احتساب فرق مباشر بينهما (الذي يفشل إن كانت كاميرا المسرح مكبَّرة/مصغَّرة)
        startClientX = e.clientX;
        startClientY = e.clientY;
        startLeft = parseFloat(element.style.left) || 0;
        startTop = parseFloat(element.style.top) || 0;
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        // نسجّل حالة التراجع مرة واحدة فقط عند أول حركة فعلية، وليس عند مجرد نقرة اختيار بلا سحب
        if (!dragMoved) {
            pushUndoState();
            dragMoved = true;
        }
        // فرق الماوس بمقياس الشاشة يُقسَم على زووم كاميرا المسرح، حتى تبقى حركة السحب مطابقة
        // بصرياً لحركة الماوس الفعلية بغض النظر عن مستوى تكبير الكاميرا الحالي
        const dx = (e.clientX - startClientX) / camScale;
        const dy = (e.clientY - startClientY) / camScale;
        element.style.left = (startLeft + dx) + 'px';
        element.style.top = (startTop + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// تحديد عنصر للتعديل فقط (بلا أي تأثير على ترتيب الطبقات) — رفع الطبقة يتم فقط عند إضافة عنصر
// جديد فعلاً (في addCharacterToStage/createRig) أو صراحةً عبر bringForward، وليس عند كل نقرة تحديد،
// وإلا فإن أي ترتيب يدوي للطبقات (bringForward/sendBackward) سيُلغى بمجرد النقر على العنصر مرة أخرى
function selectElement(element) {
    if (selectedElement) {
        selectedElement.classList.remove('selected');
    }
    selectedElement = element;
    selectedElement.classList.add('selected');
}

// الضغط على مساحة فاضية من المسرح (الخلفية) يلغي أي تحديد حالي
container.addEventListener('mousedown', (e) => {
    if (e.target === container || e.target === camLayer || e.target === bgImage || e.target.parentElement.id === 'bg-layer') {
        if (selectedElement) {
            selectedElement.classList.remove('selected');
            selectedElement = null;
        }
    }
});

// تحريك دقيق للعنصر المحدد بأسهم لوحة المفاتيح (1px عادي، 10px مع Shift للتحريك السريع)
document.addEventListener('keydown', (e) => {
    // اختصار التراجع (Ctrl+Z أو Cmd+Z على ماك) يعمل بغض النظر عن وجود تحديد حالي
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undo();
        return;
    }

    if (!selectedElement) return;
    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (!arrowKeys.includes(e.key)) return;

    e.preventDefault(); // يمنع تمرير الصفحة بالأسهم
    pushUndoState();
    const step = e.shiftKey ? 10 : 1;
    let left = parseFloat(selectedElement.style.left) || 0;
    let top = parseFloat(selectedElement.style.top) || 0;

    if (e.key === 'ArrowUp') top -= step;
    if (e.key === 'ArrowDown') top += step;
    if (e.key === 'ArrowLeft') left -= step;
    if (e.key === 'ArrowRight') left += step;

    selectedElement.style.left = left + 'px';
    selectedElement.style.top = top + 'px';
});

// 5.5 وضع تحديد نقطة الارتكاز: نقرة على الزر، ثم نقرة على مكان المفصل بالصورة
let pivotMode = false;

function togglePivotMode() {
    if (!selectedElement) return alert("Select an element first!");
    pivotMode = !pivotMode;
    const btn = document.getElementById('pivot-btn');
    if (btn) btn.style.backgroundColor = pivotMode ? '#e74c3c' : '#8e44ad';
    document.body.style.cursor = pivotMode ? 'crosshair' : 'default';
}

function resetPivot() {
    if (!selectedElement) return alert("Select an element first!");
    pushUndoState();
    selectedElement.dataset.pivotX = 50;
    selectedElement.dataset.pivotY = 50;
    updateTransform(selectedElement);
}

// 5. أدوات التحكم (التدوير، القلب، الإخفاء، الحذف)
function rotateBy(angle) {
    if (!selectedElement) return alert("Select an element first!");
    pushUndoState();
    let rot = parseInt(selectedElement.dataset.rotation) || 0;
    rot = (rot + angle) % 360;
    selectedElement.dataset.rotation = rot;
    updateTransform(selectedElement);
}

function flipSelected() {
    if (!selectedElement) return alert("Select an element first!");
    pushUndoState();
    let scaleX = parseFloat(selectedElement.dataset.scaleX) || 1;
    scaleX *= -1;
    selectedElement.dataset.scaleX = scaleX;
    updateTransform(selectedElement);
}

// ================== ترتيب الطبقات (Z-Order) ==================
// يحرّك العنصر المحدد خطوة واحدة للأمام أو للخلف، فقط بين إخوته المباشرين في نفس الأب
// (المسرح الرئيسي، أو داخل نفس الكائن المركّب لو كان العنصر جزءاً من Rig) — وليس بشكل عالمي،
// لأن الترتيب بين عناصر تابعة لآباء مختلفين أصلاً لا معنى تنافسي له بينها
function getZOrderSiblings(el) {
    const parent = el.parentElement;
    if (!parent) return [];
    return Array.from(parent.children)
        .filter(child => child.classList.contains('character') || child.classList.contains('rig'))
        .sort((a, b) => (parseInt(a.style.zIndex) || 0) - (parseInt(b.style.zIndex) || 0));
}

function bringForward() {
    if (!selectedElement) return alert("Select an element first!");
    const siblings = getZOrderSiblings(selectedElement);
    const idx = siblings.indexOf(selectedElement);
    if (idx === -1 || idx >= siblings.length - 1) return; // العنصر في أعلى طبقة بين إخوته أصلاً

    pushUndoState();
    const next = siblings[idx + 1];
    const tmp = selectedElement.style.zIndex;
    selectedElement.style.zIndex = next.style.zIndex;
    next.style.zIndex = tmp;
}

function sendBackward() {
    if (!selectedElement) return alert("Select an element first!");
    const siblings = getZOrderSiblings(selectedElement);
    const idx = siblings.indexOf(selectedElement);
    if (idx <= 0) return; // العنصر في أسفل طبقة بين إخوته أصلاً

    pushUndoState();
    const prev = siblings[idx - 1];
    const tmp = selectedElement.style.zIndex;
    selectedElement.style.zIndex = prev.style.zIndex;
    prev.style.zIndex = tmp;
}

function scaleSelected(amount) {
    if (!selectedElement) return alert("Select an element first!");
    pushUndoState();
    let scale = parseFloat(selectedElement.dataset.scale) || 1;
    scale += amount;
    if (scale < 0.2) scale = 0.2; // حد أدنى حتى لا تختفي الشخصية
    if (scale > 4) scale = 4;     // حد أقصى منطقي
    selectedElement.dataset.scale = scale;
    updateTransform(selectedElement);
}

// قائمة العناصر المخفية حالياً حتى يمكن الوصول لأي عنصر وإعادة إظهاره لاحقاً
let hiddenElements = [];

function toggleVisibility() {
    if (!selectedElement) return alert("Select an element first!");
    pushUndoState();
    if (selectedElement.style.display === 'none') {
        showElement(selectedElement);
    } else {
        hideElement(selectedElement);
    }
}

function hideElement(el) {
    el.style.display = 'none';
    if (!hiddenElements.includes(el)) hiddenElements.push(el);
    renderHiddenList();
}

function showElement(el) {
    el.style.display = 'block';
    hiddenElements = hiddenElements.filter(x => x !== el);
    renderHiddenList();
    selectElement(el);
}

function renderHiddenList() {
    const listEl = document.getElementById('hidden-list');
    if (!listEl) return;

    if (hiddenElements.length === 0) {
        listEl.innerHTML = '<p style="font-size:11px; color:#888; margin:2px;">No hidden elements</p>';
        return;
    }

    listEl.innerHTML = '';
    hiddenElements.forEach(el => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; align-items:center; gap:4px; background:#f4f4f9; padding:4px; border-radius:4px; width:100%;';

        let icon;
        const innerImg = el.querySelector(':scope > img.character-img');
        if (innerImg) {
            icon = document.createElement('img');
            icon.src = innerImg.src;
            icon.style.cssText = 'width:26px; height:26px; object-fit:contain; border:1px solid #ddd; border-radius:3px; background:#fff;';
        } else {
            icon = document.createElement('span');
            icon.textContent = '🧩';
            icon.style.cssText = 'font-size:18px; width:26px; text-align:center;';
        }

        const showBtn = document.createElement('button');
        showBtn.textContent = '👁 Show';
        showBtn.style.cssText = 'flex:1; font-size:11px; padding:4px; min-width:0;';
        showBtn.onclick = () => { pushUndoState(); showElement(el); };

        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑';
        delBtn.style.cssText = 'font-size:11px; padding:4px 6px; min-width:0; background:#eb3b5a;';
        delBtn.onclick = () => {
            pushUndoState();
            hiddenElements = hiddenElements.filter(x => x !== el);
            el.remove();
            renderHiddenList();
        };

        row.appendChild(icon);
        row.appendChild(showBtn);
        row.appendChild(delBtn);
        listEl.appendChild(row);
    });
}

function deleteSelected() {
    if (selectedElement) {
        pushUndoState();
        hiddenElements = hiddenElements.filter(x => x !== selectedElement);
        selectedElement.remove();
        selectedElement = null;
        renderHiddenList();
    }
}

function updateTransform(el) {
    let rot = el.dataset.rotation || 0;
    let scale = el.dataset.scale || 1;
    let pivotX = el.dataset.pivotX || 50;
    let pivotY = el.dataset.pivotY || 50;
    let scaleX = el.dataset.scaleX || 1;
    el.style.transformOrigin = `${pivotX}% ${pivotY}%`;

    const innerImg = el.querySelector(':scope > img.character-img');
    if (innerImg) {
        // عنصر مفرد (شخصية/جزء): التدوير والتكبير على الغلاف حول نقطة الارتكاز،
        // والقلب الأفقي على الصورة الداخلية حول مركزها دائماً (بمعزل عن نقطة الارتكاز)
        el.style.transform = `rotate(${rot}deg) scale(${scale})`;
        innerImg.style.transform = `scaleX(${scaleX})`;
    } else {
        // كائن مركب (rig): لا يوجد له "صورة داخلية" مفردة، فالقلب يبقى على نفس الإطار لقلب المجموعة كاملة
        el.style.transform = `rotate(${rot}deg) scaleX(${scaleX}) scale(${scale})`;
    }
}

// 6. جلب قوائم الصور من السيرفر (الخلفيات والشخصيات) وعرضها في الشريط الجانبي
function loadImageList(type, gridId, onClickAction) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    fetch(`get_files.php?type=${type}`)
        .then(response => response.json())
        .then(files => {
            grid.innerHTML = ''; // تفريغ القائمة قبل التعبئة
            if (!files.length) {
                grid.innerHTML = `<p style="font-size:11px; color:#888; grid-column: 1 / -1;">No images yet</p>`;
                return;
            }
            files.forEach(src => {
                const thumb = document.createElement('img');
                thumb.src = src;
                thumb.title = src;
                thumb.addEventListener('click', () => onClickAction(src));
                grid.appendChild(thumb);
            });
        })
        .catch(err => console.error(`Failed to load ${type}:`, err));
}

function loadBackgrounds() {
    loadImageList('backgrounds', 'bg-grid', setBackground);
}

function loadCharacters() {
    loadImageList('characters', 'char-grid', addCharacterToStage);
}

// تعبئة القائمة المنسدلة بملفات الصوت المرفوعة (بجانب حقل FPS)
function loadAudioList() {
    const select = document.getElementById('audio-select');
    if (!select) return;
    const previousValue = select.value;

    fetch('get_files.php?type=audio')
        .then(response => response.json())
        .then(files => {
            select.innerHTML = '<option value="">None</option>';
            files.forEach(src => {
                const opt = document.createElement('option');
                opt.value = src;
                opt.textContent = src.split('/').pop();
                select.appendChild(opt);
            });
            // نحافظ على الاختيار السابق إن كان لا يزال موجوداً في القائمة
            if ([...select.options].some(o => o.value === previousValue)) {
                select.value = previousValue;
            }
        })
        .catch(err => console.error('Failed to load audio list:', err));
}

// رفع صورة أو أكثر لمجلد الخلفيات أو الشخصيات على السيرفر
async function uploadImages(fileList, type, onDone) {
    if (!fileList || fileList.length === 0) return;

    for (const file of fileList) {
        const formData = new FormData();
        formData.append('type', type);
        formData.append('file', file);

        try {
            const response = await fetch('upload.php', { method: 'POST', body: formData });
            const data = await response.json();
            if (!data.success) {
                alert(`Failed to upload "${file.name}": ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert(`Could not upload "${file.name}", check the server connection.`);
        }
    }

    if (onDone) onDone();
}

// رفع ملف صوتي واحد لمجلد audio عبر ملف الرفع المستقل الخاص بالصوت
async function uploadAudio(fileList, onDone) {
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('upload_mp3.php', { method: 'POST', body: formData });
        const data = await response.json();
        if (!data.success) {
            alert(`Failed to upload "${file.name}": ${data.error || 'Unknown error'}`);
        }
    } catch (err) {
        console.error('Upload error:', err);
        alert(`Could not upload "${file.name}", check the server connection.`);
    }

    if (onDone) onDone();
}

// 7. الخط الزمني (Timeline): كل لقطة = حالة كاملة قابلة للاسترجاع، بدون أي تصوير للشاشة
let shotNumber = 1;

// ================== تسجيل حالة كل لقطة والرجوع لها أو تعديلها أو عرض الفيلم منها ==================

// كل عنصر على المسرح يأخذ معرّفاً فريداً وثابتاً حتى نستطيع تتبعه بين اللقطات المختلفة
let elIdCounter = 0;
function ensureElId(el) {
    if (!el.dataset.elId) el.dataset.elId = 'el' + (++elIdCounter);
    return el.dataset.elId;
}

// ================== تأثيرات الألوان (Color Effects) على الشخصيات/الأجزاء فقط ==================
const COLOR_FX_DEFAULTS = {
    opacity: 1, brightness: 100, contrast: 100, saturate: 100, hue: 0, blur: 0, sepia: 0,
    // shadowOpacity = 0 يعني "بلا ظل" افتراضياً، حتى تبقى كل اللقطات القديمة (المحفوظة قبل هذه الميزة)
    // بلا أي تغيير بصري عند تحميلها — لا حاجة لعلَم "enabled" منفصل
    shadowOpacity: 0, shadowBlur: 8, shadowOffsetX: 6, shadowOffsetY: 10
};

function getColorFx(el) {
    if (!el || !el.dataset.colorFx) return { ...COLOR_FX_DEFAULTS };
    try {
        return { ...COLOR_FX_DEFAULTS, ...JSON.parse(el.dataset.colorFx) };
    } catch (e) {
        return { ...COLOR_FX_DEFAULTS };
    }
}

// يطبّق القيم المحفوظة في dataset.colorFx فعلياً على صورة الشخصية (يُستدعى من المسرح الحي وأيضاً من المعاينات/التصدير)
function applyColorFx(el) {
    const innerImg = el.querySelector(':scope > img.character-img');
    if (!innerImg) return;
    const fx = getColorFx(el);
    innerImg.style.opacity = fx.opacity;

    let filterStr =
        `brightness(${fx.brightness}%) contrast(${fx.contrast}%) saturate(${fx.saturate}%) hue-rotate(${fx.hue}deg) blur(${fx.blur}px) sepia(${fx.sepia}%)`;

    // الظل يُضاف كآخر فلتر في السلسلة (drop-shadow يتبع الشكل الفعلي بعد كل الفلاتر السابقة)،
    // ولا يُضاف إطلاقاً إن كانت شفافيته صفراً، توفيراً لتكلفة رسم غير مرئية أصلاً
    if (fx.shadowOpacity > 0) {
        filterStr += ` drop-shadow(${fx.shadowOffsetX}px ${fx.shadowOffsetY}px ${fx.shadowBlur}px rgba(0,0,0,${fx.shadowOpacity}))`;
    }

    innerImg.style.filter = filterStr;
}

function updateColorEffectsLabels(fx) {
    document.getElementById('cfx-val-opacity').textContent = fx.opacity;
    document.getElementById('cfx-val-brightness').textContent = fx.brightness;
    document.getElementById('cfx-val-contrast').textContent = fx.contrast;
    document.getElementById('cfx-val-saturate').textContent = fx.saturate;
    document.getElementById('cfx-val-hue').textContent = fx.hue;
    document.getElementById('cfx-val-blur').textContent = fx.blur;
    document.getElementById('cfx-val-sepia').textContent = fx.sepia;
    document.getElementById('cfx-val-shadowOpacity').textContent = fx.shadowOpacity;
    document.getElementById('cfx-val-shadowBlur').textContent = fx.shadowBlur;
    document.getElementById('cfx-val-shadowOffsetX').textContent = fx.shadowOffsetX;
    document.getElementById('cfx-val-shadowOffsetY').textContent = fx.shadowOffsetY;
}

// فتح النافذة المنبثقة وتحميل القيم الحالية للعنصر المحدد (أو الافتراضية إن لم يكن له فلتر محفوظ)
function openColorEffectsPanel() {
    if (!selectedElement) return alert("Select a character first!");
    if (!selectedElement.querySelector(':scope > img.character-img')) {
        return alert("Color effects currently work on a single character/part, not a whole rig frame. Select a part inside it.");
    }
    // نسجّل الحالة مرة واحدة هنا (قبل أي تعديل بالمنزلقات)، حتى يعيد "تراجع" كل التعديلات التي ستتم في هذه الجلسة دفعة واحدة
    pushUndoState();

    const fx = getColorFx(selectedElement);
    document.getElementById('cfx-opacity').value = fx.opacity;
    document.getElementById('cfx-brightness').value = fx.brightness;
    document.getElementById('cfx-contrast').value = fx.contrast;
    document.getElementById('cfx-saturate').value = fx.saturate;
    document.getElementById('cfx-hue').value = fx.hue;
    document.getElementById('cfx-blur').value = fx.blur;
    document.getElementById('cfx-sepia').value = fx.sepia;
    document.getElementById('cfx-shadowOpacity').value = fx.shadowOpacity;
    document.getElementById('cfx-shadowBlur').value = fx.shadowBlur;
    document.getElementById('cfx-shadowOffsetX').value = fx.shadowOffsetX;
    document.getElementById('cfx-shadowOffsetY').value = fx.shadowOffsetY;
    updateColorEffectsLabels(fx);

    document.getElementById('color-fx-panel').style.display = 'block';
}

function closeColorEffectsPanel() {
    document.getElementById('color-fx-panel').style.display = 'none';
}

// يُستدعى مع كل تحريك لأي منزلق: يطبّق التأثير حياً على المسرح الفعلي ويحفظه في dataset الخاص بالعنصر
function onColorEffectsInput() {
    if (!selectedElement) return;
    const fx = {
        opacity: parseFloat(document.getElementById('cfx-opacity').value),
        brightness: parseFloat(document.getElementById('cfx-brightness').value),
        contrast: parseFloat(document.getElementById('cfx-contrast').value),
        saturate: parseFloat(document.getElementById('cfx-saturate').value),
        hue: parseFloat(document.getElementById('cfx-hue').value),
        blur: parseFloat(document.getElementById('cfx-blur').value),
        sepia: parseFloat(document.getElementById('cfx-sepia').value),
        shadowOpacity: parseFloat(document.getElementById('cfx-shadowOpacity').value),
        shadowBlur: parseFloat(document.getElementById('cfx-shadowBlur').value),
        shadowOffsetX: parseFloat(document.getElementById('cfx-shadowOffsetX').value),
        shadowOffsetY: parseFloat(document.getElementById('cfx-shadowOffsetY').value)
    };
    updateColorEffectsLabels(fx);
    selectedElement.dataset.colorFx = JSON.stringify(fx);
    applyColorFx(selectedElement);
}

function resetColorEffects() {
    if (!selectedElement) return;
    pushUndoState();
    delete selectedElement.dataset.colorFx;
    applyColorFx(selectedElement);
    openColorEffectsPanel(); // إعادة تحميل القيم الافتراضية في المنزلقات
}

// ربط كل منزلق بحدث input مرة واحدة عند تحميل السكربت (عناصر النافذة المنبثقة ثابتة في الصفحة)
['opacity', 'brightness', 'contrast', 'saturate', 'hue', 'blur', 'sepia',
 'shadowOpacity', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY'].forEach(key => {
    const input = document.getElementById('cfx-' + key);
    if (input) input.addEventListener('input', onColorEffectsInput);
});

// ================== تدرّج لوني على مستوى اللقطة كاملة (Scene Grading) ==================
// بعكس Color Effects التي تُطبَّق على شخصية واحدة فقط، هذا يُطبَّق على camera-layer نفسها —
// أي الخلفية وكل الشخصيات معاً دفعة واحدة — لضبط "مزاج" اللقطة كلها (دفء غروب، تبريد ليلي...).
// يُحفَظ كجزء من حالة اللقطة نفسها (مثل الكاميرا تماماً)، لا كإعداد عام ثابت للتطبيق كله.
const SCENE_GRADE_DEFAULTS = { brightness: 100, contrast: 100, saturate: 100, hue: 0, blur: 0, sepia: 0, opacity: 1 };
let sceneGrade = { ...SCENE_GRADE_DEFAULTS };

// يبني نص فلتر CSS من كائن تدرّج لوني — دالة مشتركة يستخدمها المسرح الحي، المصغّرات، عرض الفيلم،
// ورق البصل، والتصدير، حتى تُطبَّق نفس القيم بنفس الطريقة في كل مكان تظهر فيه اللقطة
function sceneGradeFilterString(g) {
    const grade = { ...SCENE_GRADE_DEFAULTS, ...(g || {}) };
    return `brightness(${grade.brightness}%) contrast(${grade.contrast}%) saturate(${grade.saturate}%) `
         + `hue-rotate(${grade.hue}deg) blur(${grade.blur}px) sepia(${grade.sepia}%) opacity(${grade.opacity})`;
}

// يطبّق التدرّج الحالي (sceneGrade) فعلياً على المسرح الحي أثناء التعديل
function applySceneGrade() {
    camLayer.style.filter = sceneGradeFilterString(sceneGrade);
}

function updateSceneGradeLabels(g) {
    document.getElementById('sg-val-brightness').textContent = g.brightness;
    document.getElementById('sg-val-contrast').textContent = g.contrast;
    document.getElementById('sg-val-saturate').textContent = g.saturate;
    document.getElementById('sg-val-hue').textContent = g.hue;
    document.getElementById('sg-val-blur').textContent = g.blur;
    document.getElementById('sg-val-sepia').textContent = g.sepia;
    document.getElementById('sg-val-opacity').textContent = g.opacity;
}

function openSceneGradePanel() {
    // نسجّل الحالة مرة واحدة هنا، قبل أي تعديل بالمنزلقات، حتى يعيد "تراجع" كل تعديلات هذه الجلسة دفعة واحدة
    pushUndoState();
    document.getElementById('sg-brightness').value = sceneGrade.brightness;
    document.getElementById('sg-contrast').value = sceneGrade.contrast;
    document.getElementById('sg-saturate').value = sceneGrade.saturate;
    document.getElementById('sg-hue').value = sceneGrade.hue;
    document.getElementById('sg-blur').value = sceneGrade.blur;
    document.getElementById('sg-sepia').value = sceneGrade.sepia;
    document.getElementById('sg-opacity').value = sceneGrade.opacity;
    updateSceneGradeLabels(sceneGrade);
    document.getElementById('scene-grade-panel').style.display = 'block';
}

function closeSceneGradePanel() {
    document.getElementById('scene-grade-panel').style.display = 'none';
}

function onSceneGradeInput() {
    sceneGrade = {
        brightness: parseFloat(document.getElementById('sg-brightness').value),
        contrast: parseFloat(document.getElementById('sg-contrast').value),
        saturate: parseFloat(document.getElementById('sg-saturate').value),
        hue: parseFloat(document.getElementById('sg-hue').value),
        blur: parseFloat(document.getElementById('sg-blur').value),
        sepia: parseFloat(document.getElementById('sg-sepia').value),
        opacity: parseFloat(document.getElementById('sg-opacity').value)
    };
    updateSceneGradeLabels(sceneGrade);
    applySceneGrade();
}

function resetSceneGrade() {
    pushUndoState();
    sceneGrade = { ...SCENE_GRADE_DEFAULTS };
    applySceneGrade();
    openSceneGradePanel(); // إعادة تحميل القيم الافتراضية في المنزلقات (بدون تسجيل تراجع مضاعف مهم، فهذا مجرد عرض)
}

['brightness', 'contrast', 'saturate', 'hue', 'blur', 'sepia', 'opacity'].forEach(key => {
    const input = document.getElementById('sg-' + key);
    if (input) input.addEventListener('input', onSceneGradeInput);
});

// يبني وصفاً كاملاً قابلاً للاسترجاع لعنصر واحد (شخصية أو كائن مركب)، بما فيه أطفاله إن وُجدوا
function serializeElement(el) {
    const isRig = el.classList.contains('rig');
    const innerImg = el.querySelector(':scope > img.character-img');
    const data = {
        id: ensureElId(el),
        type: isRig ? 'rig' : 'character',
        left: el.style.left,
        top: el.style.top,
        zIndex: el.style.zIndex,
        display: el.style.display || 'block',
        rotation: el.dataset.rotation || 0,
        scale: el.dataset.scale || 1,
        scaleX: el.dataset.scaleX || 1,
        pivotX: el.dataset.pivotX || 50,
        pivotY: el.dataset.pivotY || 50,
        colorFx: el.dataset.colorFx || null,
        src: innerImg ? innerImg.src : null,
        children: []
    };
    if (isRig) {
        el.querySelectorAll(':scope > .character').forEach(child => {
            data.children.push(serializeElement(child));
        });
    }
    return data;
}

// يجمع حالة المسرح بأكملها: الخلفية (صورة/زووم/إزاحة) + كاميرا المسرح الكاملة + كل الشخصيات
// والكائنات المركبة + أبعاد المسرح (أبعاد المسرح تُحفظ حتى تُبنى المعاينة المصغّرة لاحقاً بالمقياس الصحيح)
function serializeScene() {
    const topLevel = [];
    camLayer.querySelectorAll(':scope > .character, :scope > .rig').forEach(el => {
        topLevel.push(serializeElement(el));
    });
    return {
        background: { src: bgImage.src, scale: bgScale, offsetX: bgOffsetX, offsetY: bgOffsetY },
        camera: { scale: camScale, offsetX: camOffsetX, offsetY: camOffsetY },
        grade: { ...sceneGrade },
        elements: topLevel,
        topZIndex: topZIndex,
        charCounter: charCounter,
        stageWidth: container.clientWidth,
        stageHeight: container.clientHeight
    };
}

// يعيد بناء عنصر واحد **تفاعلي** على المسرح الحقيقي من بيانات محفوظة (يُستخدم عند استرجاع لقطة للتعديل)
function rebuildElement(data, parent) {
    const wrapper = document.createElement('div');
    wrapper.className = data.type === 'rig' ? 'rig' : 'character';
    wrapper.dataset.elId = data.id;
    wrapper.style.left = data.left;
    wrapper.style.top = data.top;
    wrapper.style.zIndex = data.zIndex;
    wrapper.style.display = data.display;
    wrapper.dataset.rotation = data.rotation;
    wrapper.dataset.scale = data.scale;
    wrapper.dataset.scaleX = data.scaleX;
    wrapper.dataset.pivotX = data.pivotX;
    wrapper.dataset.pivotY = data.pivotY;
    if (data.colorFx) wrapper.dataset.colorFx = data.colorFx;

    if (data.type === 'character' && data.src) {
        const img = document.createElement('img');
        img.src = data.src;
        img.className = 'character-img';
        img.draggable = false;
        wrapper.appendChild(img);
        applyColorFx(wrapper);
    }

    makeDraggable(wrapper);
    parent.appendChild(wrapper);
    updateTransform(wrapper);

    if (data.type === 'rig' && data.children) {
        data.children.forEach(childData => rebuildElement(childData, wrapper));
    }
    if (data.display === 'none') hiddenElements.push(wrapper);

    return wrapper;
}

// يعيد بناء المسرح الحقيقي بالكامل من حالة محفوظة (بدون لمس مكدس التراجع) — الشخصيات تصبح قابلة للسحب والتعديل من جديد
function applySceneState(state) {
    container.querySelectorAll('.character, .rig').forEach(el => el.remove());
    hiddenElements = [];
    selectedElement = null;

    bgImage.src = state.background.src;
    bgScale = state.background.scale;
    bgOffsetX = state.background.offsetX;
    bgOffsetY = state.background.offsetY;
    updateBgTransform();

    // state.camera قد لا يكون موجوداً في ملفات سيناريو قديمة صُدّرت قبل إضافة الكاميرا — نستخدم قيماً محايدة حينها
    const cam = state.camera || { scale: 1, offsetX: 0, offsetY: 0 };
    camScale = cam.scale;
    camOffsetX = cam.offsetX;
    camOffsetY = cam.offsetY;
    updateCameraTransform();

    // نفس المنطق: state.grade قد لا يكون موجوداً في لقطات قديمة صُدّرت قبل إضافة التدرّج اللوني
    sceneGrade = { ...SCENE_GRADE_DEFAULTS, ...(state.grade || {}) };
    applySceneGrade();

    state.elements.forEach(data => rebuildElement(data, camLayer));

    topZIndex = state.topZIndex || topZIndex;
    charCounter = state.charCounter || charCounter;

    renderHiddenList();
}

// نقطة الدخول العامة للقفز إلى لقطة محفوظة (من الخط الزمني أو من استيراد سيناريو): تعيد بناء المسرح
// وتُفرّغ مكدس التراجع، لأن تاريخ "التراجع" الخاص باللقطة السابقة لا معنى له بعد القفز للقطة أخرى
function restoreScene(state) {
    applySceneState(state);
    undoStack = [];
    updateUndoButtonState();
}

// يبني عنصر واحد **غير تفاعلي** (بدون سحب) لاستخدامه في المعاينات المصغّرة وعرض الفيلم فقط
function buildStaticElement(data, parent) {
    const wrapper = document.createElement('div');
    wrapper.className = data.type === 'rig' ? 'rig' : 'character';
    wrapper.style.left = data.left;
    wrapper.style.top = data.top;
    wrapper.style.zIndex = data.zIndex;
    wrapper.style.display = data.display;
    wrapper.style.pointerEvents = 'none';
    wrapper.dataset.rotation = data.rotation;
    wrapper.dataset.scale = data.scale;
    wrapper.dataset.scaleX = data.scaleX;
    wrapper.dataset.pivotX = data.pivotX;
    wrapper.dataset.pivotY = data.pivotY;
    if (data.colorFx) wrapper.dataset.colorFx = data.colorFx;

    if (data.type === 'character' && data.src) {
        const img = document.createElement('img');
        img.src = data.src;
        img.className = 'character-img';
        img.draggable = false;
        wrapper.appendChild(img);
        applyColorFx(wrapper);
    }
    parent.appendChild(wrapper);
    updateTransform(wrapper);
    if (data.type === 'rig' && data.children) {
        data.children.forEach(childData => buildStaticElement(childData, wrapper));
    }
    return wrapper;
}

// يرسم معاينة مصغّرة (مبنية من العناصر الحقيقية بمقياس مصغّر) داخل أي صندوق — تُستخدم لمصغّرات
// شريط اللقطات وأيضاً لصندوق عرض الفيلم الكبير، بدون أي تصوير أو لقطة شاشة
function renderScenePreview(state, box) {
    box.innerHTML = '';
    const stageW = state.stageWidth || container.clientWidth || 800;
    const stageH = state.stageHeight || container.clientHeight || 500;
    const boxW = box.clientWidth || 1;
    const boxH = box.clientHeight || 1;
    const scale = Math.min(boxW / stageW, boxH / stageH);

    const mini = document.createElement('div');
    mini.style.position = 'absolute';
    mini.style.top = '0';
    mini.style.left = '0';
    mini.style.width = stageW + 'px';
    mini.style.height = stageH + 'px';
    mini.style.transform = `scale(${scale})`;
    mini.style.transformOrigin = 'top left';
    mini.style.background = '#fff';
    mini.style.overflow = 'hidden';

    // طبقة فرعية تحمل تحويل كاميرا هذه اللقطة بالذات، حتى تعكس المعاينة المصغّرة (وعرض الفيلم)
    // فعلياً تأثير الزووم/التحريك الذي طبّقناه على كل المسرح وقت حفظ هذه اللقطة
    const camDiv = document.createElement('div');
    camDiv.style.position = 'absolute';
    camDiv.style.inset = '0';
    const cam = state.camera || { scale: 1, offsetX: 0, offsetY: 0 };
    camDiv.style.transform = `translate(${cam.offsetX}px, ${cam.offsetY}px) scale(${cam.scale})`;
    camDiv.style.filter = sceneGradeFilterString(state.grade);
    mini.appendChild(camDiv);

    if (state.background && state.background.src) {
        const bg = document.createElement('img');
        bg.src = state.background.src;
        bg.style.position = 'absolute';
        bg.style.top = '50%';
        bg.style.left = '50%';
        bg.style.width = '100%';
        bg.style.height = '100%';
        bg.style.objectFit = 'cover';
        bg.style.transform =
            `translate(-50%,-50%) translate(${state.background.offsetX}px, ${state.background.offsetY}px) scale(${state.background.scale})`;
        camDiv.appendChild(bg);
    }

    state.elements.forEach(data => buildStaticElement(data, camDiv));
    box.appendChild(mini);
}

// مصفوفة الخط الزمني: كل عنصر = لقطة كاملة (رقمها + الحالة الكاملة القابلة للاسترجاع والتعديل)
let timeline = [];
let activeFrameIndex = -1;

// ================== ورق البصل (Onion Skinning) ==================
// يعرض اللقطة "السابقة" (بالنسبة لموضع التعديل الحالي) بشفافية خفيفة خلف المسرح، كمرجع بصري فقط.
// غير قابلة للنقر أو التحريك، وتُحدَّث تلقائياً مع أي تغيير على الخط الزمني أو استرجاع لقطة.
let onionSkinEnabled = false;

function toggleOnionSkin() {
    onionSkinEnabled = !onionSkinEnabled;
    const btn = document.getElementById('onion-skin-btn');
    if (btn) {
        btn.textContent = onionSkinEnabled ? '🧅 Onion Skin: On' : '🧅 Onion Skin: Off';
        btn.style.backgroundColor = onionSkinEnabled ? '#e74c3c' : '#8e44ad';
    }
    updateOnionSkin();
}

// تحدد أي لقطة تُعتبر "السابقة" بالنسبة لموضع العمل الحالي:
// - إذا كانت هناك لقطة محمَّلة للتعديل (activeFrameIndex)، فالمرجع هو التي قبلها في الخط الزمني.
// - إذا كنا نبني لقطة جديدة لم تُحفظ بعد (لا يوجد تحديد نشط)، فالمرجع هو آخر لقطة محفوظة،
//   لأن اللقطة الجديدة ستُضاف بعدها مباشرة عند الضغط على "Save New Shot".
function getOnionReferenceFrame() {
    if (activeFrameIndex >= 0 && timeline[activeFrameIndex]) {
        return timeline[activeFrameIndex - 1] || null;
    }
    return timeline.length ? timeline[timeline.length - 1] : null;
}

// يعيد رسم طبقة ورق البصل من الصفر بناءً على حالة اللقطة المرجعية، باستخدام نفس بناء العناصر
// غير التفاعلي المستخدم في المعاينات المصغّرة (buildStaticElement)، بدون أي احتكاك بالمسرح الحي
function updateOnionSkin() {
    const layer = document.getElementById('onion-layer');
    if (!layer) return;

    layer.innerHTML = '';

    if (!onionSkinEnabled) {
        layer.classList.remove('active');
        return;
    }

    const ref = getOnionReferenceFrame();
    if (!ref) {
        layer.classList.remove('active'); // لا توجد لقطة سابقة بعد لعرضها كمرجع
        return;
    }

    layer.classList.add('active');
    const state = ref.state;

    // نبني محتوى اللقطة المرجعية داخل طبقة فرعية تحمل تحويل الكاميرا الخاص بتلك اللقطة نفسها
    // (وليس كاميرا اللقطة الحالية)، حتى يظهر الشبح مطابقاً تماماً لما كان معروضاً فعلياً وقتها
    const camDiv = document.createElement('div');
    camDiv.style.position = 'absolute';
    camDiv.style.inset = '0';
    const cam = state.camera || { scale: 1, offsetX: 0, offsetY: 0 };
    camDiv.style.transform = `translate(${cam.offsetX}px, ${cam.offsetY}px) scale(${cam.scale})`;
    camDiv.style.filter = sceneGradeFilterString(state.grade);
    layer.appendChild(camDiv);

    if (state.background && state.background.src) {
        const bg = document.createElement('img');
        bg.src = state.background.src;
        bg.style.position = 'absolute';
        bg.style.top = '50%';
        bg.style.left = '50%';
        bg.style.width = '100%';
        bg.style.height = '100%';
        bg.style.objectFit = 'cover';
        bg.style.transform =
            `translate(-50%,-50%) translate(${state.background.offsetX}px, ${state.background.offsetY}px) scale(${state.background.scale})`;
        camDiv.appendChild(bg);
    }

    state.elements.forEach(data => buildStaticElement(data, camDiv));
}

// حفظ لقطة جديدة في نهاية الخط الزمني دائماً (لا تُستبدل أي لقطة سابقة)
function saveNewShot() {
    timeline.push({ number: shotNumber, state: serializeScene() });
    activeFrameIndex = timeline.length - 1;
    shotNumber++;
    renderFilmstrip();
}

// تحديث اللقطة المحددة حالياً بالحالة الجديدة للمسرح — مفيد بعد استرجاع لقطة قديمة وتصحيح وضعية فيها
function updateActiveShot() {
    if (activeFrameIndex < 0 || !timeline[activeFrameIndex]) {
        alert('No shot selected to update! First click a shot on the strip below to load it for editing.');
        return;
    }
    timeline[activeFrameIndex].state = serializeScene();
    renderFilmstrip();
}

function updateActiveFrameLabel() {
    const label = document.getElementById('active-frame-label');
    if (!label) return;
    if (timeline.length === 0) {
        label.textContent = 'No shots yet';
        return;
    }
    const activeNum = (activeFrameIndex >= 0 && timeline[activeFrameIndex]) ? timeline[activeFrameIndex].number : '—';
    label.textContent = `Shots: ${timeline.length} | Selected for editing: ${activeNum}`;
}

function renderFilmstrip() {
    const track = document.getElementById('filmstrip-track');
    if (!track) return;

    if (timeline.length === 0) {
        track.innerHTML = '<p style="font-size:11px; color:#888; margin:2px 10px;">No shots recorded yet — click "💾 Save New Shot"</p>';
        updateActiveFrameLabel();
        updateOnionSkin();
        return;
    }

    track.innerHTML = '';
    timeline.forEach((frame, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'frame-thumb' + (index === activeFrameIndex ? ' active' : '');
        thumb.title = 'Click to load this shot onto the stage for editing — double-click to duplicate it';

        // صندوق داخلي مخصص للمعاينة فقط، حتى لا يُمحى الرقم وزر الحذف عند إعادة رسمها
        const previewBox = document.createElement('div');
        previewBox.style.position = 'absolute';
        previewBox.style.inset = '0';
        previewBox.style.overflow = 'hidden';
        thumb.appendChild(previewBox);

        const num = document.createElement('span');
        num.className = 'frame-num';
        num.textContent = frame.number;
        thumb.appendChild(num);

        const del = document.createElement('button');
        del.className = 'frame-del';
        del.textContent = '🗑';
        del.title = 'Delete this shot from the timeline';
        del.onclick = (e) => {
            e.stopPropagation();
            const confirmed = confirm(`Are you sure you want to delete shot #${frame.number}? This action cannot be undone.`);
            if (!confirmed) return;
            timeline.splice(index, 1);
            if (activeFrameIndex >= timeline.length) activeFrameIndex = timeline.length - 1;
            renderFilmstrip();
        };
        thumb.appendChild(del);

        // النقر على أي لقطة سابقة يحمّلها على المسرح الحقيقي للتعديل (وليس فقط لعرضها).
        // لا نعيد بناء الشريط بالكامل هنا (renderFilmstrip) لأن ذلك يعيد إنشاء كل الصور في كل
        // مصغّرة من جديد رغم أن شيئاً منها لم يتغيّر فعلياً — فقط ننقل صنف "active" بين المصغّرتين،
        // وهذا وحده كافٍ لتحديث المظهر ويمنع التجمّد عند التنقل السريع بين اللقطات.
        thumb.onclick = () => {
            const prevActive = track.querySelector('.frame-thumb.active');
            if (prevActive) prevActive.classList.remove('active');
            thumb.classList.add('active');

            activeFrameIndex = index;
            restoreScene(frame.state);
            updateActiveFrameLabel();
            updateOnionSkin();
        };

        // الضغط المزدوج على أي لقطة ينسخها ويضعها بجانب الأصلية مباشرة في الخط الزمني
        thumb.ondblclick = (e) => {
            e.stopPropagation();
            duplicateShot(index);
        };

        // زرّا تحريك اللقطة خطوة واحدة لليسار أو لليمين داخل الخط الزمني
        const moveRow = document.createElement('div');
        moveRow.style.cssText = 'position:absolute; bottom:2px; left:2px; right:2px; z-index:2; display:flex; gap:2px;';

        const moveLeftBtn = document.createElement('button');
        moveLeftBtn.textContent = '◀';
        moveLeftBtn.title = 'Move this shot one step earlier';
        moveLeftBtn.style.cssText = 'flex:1; font-size:10px; padding:2px 0; min-width:0; background:#6c757d; color:#fff; border:none; border-radius:3px; cursor:pointer;';
        moveLeftBtn.onclick = (e) => {
            e.stopPropagation();
            moveShot(index, -1);
        };

        const moveRightBtn = document.createElement('button');
        moveRightBtn.textContent = '▶';
        moveRightBtn.title = 'Move this shot one step later';
        moveRightBtn.style.cssText = 'flex:1; font-size:10px; padding:2px 0; min-width:0; background:#6c757d; color:#fff; border:none; border-radius:3px; cursor:pointer;';
        moveRightBtn.onclick = (e) => {
            e.stopPropagation();
            moveShot(index, 1);
        };

        moveRow.appendChild(moveLeftBtn);
        moveRow.appendChild(moveRightBtn);
        thumb.appendChild(moveRow);

        track.appendChild(thumb);
        renderScenePreview(frame.state, previewBox);
    });

    updateActiveFrameLabel();
    updateOnionSkin();
}

// يحرّك لقطة واحدة خطوة واحدة يميناً أو يساراً ضمن الخط الزمني (direction: -1 أو 1)
function moveShot(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= timeline.length) return;

    const [moved] = timeline.splice(index, 1);
    timeline.splice(newIndex, 0, moved);

    if (activeFrameIndex === index) {
        activeFrameIndex = newIndex;
    } else if (activeFrameIndex === newIndex) {
        activeFrameIndex = index;
    }

    renderFilmstrip();
}

// ينسخ لقطة موجودة نسخة كاملة مستقلة (بدون أي ارتباط بالأصلية) ويضعها مباشرة بعدها في الخط الزمني
function duplicateShot(index) {
    if (index < 0 || !timeline[index]) return;

    const clonedState = JSON.parse(JSON.stringify(timeline[index].state));
    const newFrame = { number: shotNumber, state: clonedState };
    shotNumber++;

    timeline.splice(index + 1, 0, newFrame);
    activeFrameIndex = index + 1;
    restoreScene(newFrame.state);
    renderFilmstrip();
}

// تصدير الخط الزمني كاملاً إلى ملف JSON خارجي (سيناريو) يمكن حفظه واستيراده لاحقاً
function exportScenario() {
    if (timeline.length === 0) return alert('No shots to export yet!');

    const project = {
        version: 1,
        savedAt: new Date().toISOString(),
        shotNumber: shotNumber,
        timeline: timeline
    };

    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'scenario.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

// استيراد ملف سيناريو محفوظ مسبقاً وتحميله في الخط الزمني الحالي
function importScenario(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const project = JSON.parse(e.target.result);
            if (!project || !Array.isArray(project.timeline)) {
                throw new Error('Invalid file format (does not contain a valid timeline)');
            }

            timeline = project.timeline;
            shotNumber = project.shotNumber || (timeline.length ? timeline[timeline.length - 1].number + 1 : 1);

            // إعادة ضبط عداد معرّفات العناصر حتى لا تتعارض مع أي عنصر جديد يُضاف بعد الاستيراد
            let maxElId = 0;
            const scanChildren = (list) => {
                (list || []).forEach(el => {
                    const n = parseInt(String(el.id || '').replace('el', ''), 10) || 0;
                    if (n > maxElId) maxElId = n;
                    scanChildren(el.children);
                });
            };
            timeline.forEach(frame => scanChildren(frame.state.elements));
            elIdCounter = maxElId;

            activeFrameIndex = timeline.length - 1;
            if (activeFrameIndex >= 0) restoreScene(timeline[activeFrameIndex].state);

            renderFilmstrip();
        } catch (err) {
            alert('Could not read the scenario file: ' + err.message);
            console.error(err);
        }
    };
    reader.readAsText(file);
}

// عرض الفيلم: يبني كل لقطة مباشرة من بيانات المصفوفة (بدون أي صورة ملتقطة) بسرعة (FPS) قابلة للتغيير
let playbackTimer = null;
let playbackAudio = null;

function playFilm() {
    if (timeline.length === 0) return alert('No shots recorded yet!');

    const overlay = document.getElementById('play-overlay');
    const stageBox = document.getElementById('play-stage');
    const counter = document.getElementById('play-frame-counter');
    const fps = Math.max(1, Math.min(30, parseInt(document.getElementById('fps-input').value) || 8));
    const delay = 1000 / fps;

    // تشغيل الصوت المختار مرة واحدة فقط مع بداية العرض، دون أي تكرار حتى لو تكرر الفيلم
    const audioSelect = document.getElementById('audio-select');
    if (playbackAudio) {
        playbackAudio.pause();
        playbackAudio = null;
    }
    if (audioSelect && audioSelect.value) {
        playbackAudio = new Audio(audioSelect.value);
        playbackAudio.play().catch(err => console.error('Audio playback error:', err));
    }

    overlay.style.display = 'flex';
    let i = 0;

    const showFrame = () => {
        renderScenePreview(timeline[i].state, stageBox);
        counter.textContent = `${i + 1} / ${timeline.length} (shot ${timeline[i].number})`;
        i = (i + 1) % timeline.length;
    };

    showFrame();
    clearInterval(playbackTimer);
    playbackTimer = setInterval(showFrame, delay);
}

function stopPlayback() {
    clearInterval(playbackTimer);
    playbackTimer = null;
    if (playbackAudio) {
        playbackAudio.pause();
        playbackAudio = null;
    }
    document.getElementById('play-overlay').style.display = 'none';
}

// ================== تصدير كل اللقطات كصور PNG حقيقية دفعة واحدة (وليس معاينة مصغّرة) ==================
// كل لقطة تُبنى بحجمها الحقيقي الكامل في حاوية مخفية خارج الشاشة، ثم تُلتقط فعلياً كصورة
// عبر html2canvas (لضمان مطابقة ما يظهر على المسرح تماماً، بما في ذلك الكائنات المركبة المتداخلة)،
// وتُجمع كل الصور في ملف ZIP واحد يُنزَّل تلقائياً. هذا التصوير الفعلي منفصل تماماً عن نظام
// العرض الحي (playFilm) الذي يبقى يبني اللقطات من البيانات مباشرة بدون أي تصوير.

// تنتظر تحميل كل الصور داخل عنصر معيّن قبل المتابعة، لتفادي التقاط صورة فارغة أو ناقصة
function waitForImages(root) {
    const imgs = Array.from(root.querySelectorAll('img'));
    return Promise.all(imgs.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // حتى لو فشلت صورة واحدة، لا نوقف التصدير بالكامل
        });
    }));
}

async function exportAllFramesAsImages() {
    if (timeline.length === 0) return alert('No shots recorded yet!');

    if (typeof html2canvas === 'undefined' || typeof JSZip === 'undefined') {
        alert('Export libraries failed to load. Check your internet connection and reload the page, then try again.');
        return;
    }

    const btn = document.getElementById('export-frames-btn');
    const originalLabel = btn ? btn.textContent : '';
    if (btn) btn.disabled = true;

    // حاوية مخفية خارج حدود الشاشة، تُبنى فيها كل لقطة بحجمها الحقيقي الكامل قبل تصويرها
    const exportStage = document.createElement('div');
    exportStage.style.position = 'fixed';
    exportStage.style.left = '-99999px';
    exportStage.style.top = '0';
    exportStage.style.background = '#fff';
    exportStage.style.overflow = 'hidden';
    document.body.appendChild(exportStage);

    const zip = new JSZip();
    const padWidth = String(timeline.length).length;

    try {
        for (let i = 0; i < timeline.length; i++) {
            if (btn) btn.textContent = `⏳ Exporting ${i + 1}/${timeline.length}...`;

            const frame = timeline[i];
            const state = frame.state;
            const w = state.stageWidth || container.clientWidth || 800;
            const h = state.stageHeight || container.clientHeight || 500;

            exportStage.style.width = w + 'px';
            exportStage.style.height = h + 'px';
            exportStage.innerHTML = '';

            // طبقة فرعية تحمل تحويل كاميرا هذه اللقطة، حتى يطابق التصدير النهائي ما يظهر فعلياً على المسرح
            const camDiv = document.createElement('div');
            camDiv.style.position = 'absolute';
            camDiv.style.inset = '0';
            const cam = state.camera || { scale: 1, offsetX: 0, offsetY: 0 };
            camDiv.style.transform = `translate(${cam.offsetX}px, ${cam.offsetY}px) scale(${cam.scale})`;
            camDiv.style.filter = sceneGradeFilterString(state.grade);
            exportStage.appendChild(camDiv);

            if (state.background && state.background.src) {
                const bg = document.createElement('img');
                bg.src = state.background.src;
                bg.style.position = 'absolute';
                bg.style.top = '50%';
                bg.style.left = '50%';
                bg.style.width = '100%';
                bg.style.height = '100%';
                bg.style.objectFit = 'cover';
                bg.style.transform =
                    `translate(-50%,-50%) translate(${state.background.offsetX}px, ${state.background.offsetY}px) scale(${state.background.scale})`;
                camDiv.appendChild(bg);
            }

            state.elements.forEach(data => buildStaticElement(data, camDiv));

            await waitForImages(exportStage);

            const canvas = await html2canvas(exportStage, {
                width: w,
                height: h,
                backgroundColor: '#ffffff',
                useCORS: true,
                scale: 1
            });

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const frameNum = String(i + 1).padStart(padWidth, '0');
            zip.file(`frame_${frameNum}_shot${frame.number}.png`, blob);
        }

        if (btn) btn.textContent = '📦 Packing ZIP...';
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.download = 'stage_frames.zip';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
        alert('Something went wrong while exporting the frames: ' + err.message);
    } finally {
        exportStage.remove();
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalLabel;
        }
    }
}

// ================== فرض نسبة عرض/ارتفاع ثابتة 16:9 على المسرح ==================
// نحسب أبعاد المسرح بأنفسنا بدل الاعتماد على flex-grow وحده، حتى يبقى المسرح دائماً
// بنسبة 16:9 حقيقية مهما كان حجم النافذة، مع مساحة فارغة (letterbox) تتوسّط تلقائياً
// حول أي بعد زائد بدل تمديد المسرح وتشويهه.
const STAGE_ASPECT_RATIO = 16 / 9;

function fitStageToAspectRatio() {
    const wrapper = document.getElementById('stage-wrapper');
    if (!wrapper || !container) return;

    const availW = wrapper.clientWidth;
    const availH = wrapper.clientHeight;
    if (availW <= 0 || availH <= 0) return;

    let w = availW;
    let h = w / STAGE_ASPECT_RATIO;
    if (h > availH) {
        h = availH;
        w = h * STAGE_ASPECT_RATIO;
    }

    container.style.width = Math.floor(w) + 'px';
    container.style.height = Math.floor(h) + 'px';
}

window.addEventListener('resize', fitStageToAspectRatio);

// تحميل القوائم وضبط أبعاد المسرح تلقائياً عند فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
    loadBackgrounds();
    loadCharacters();
    loadAudioList();
    fitStageToAspectRatio();
    updateUndoButtonState();
    updateCameraTransform();
});