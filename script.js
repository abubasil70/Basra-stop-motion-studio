const container = document.getElementById('canvas-container');
const bgImage = document.getElementById('bg-image');
let selectedElement = null;
let bgScale = 1;
let bgOffsetX = 0; // إزاحة أفقية بالبكسل
let bgOffsetY = 0; // إزاحة عمودية بالبكسل

// 1. تعيين خلفية المسرح
function setBackground(src) {
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
    bgScale += amount;
    if (bgScale < 0.5) bgScale = 0.5; // حد أدنى للزووم
    if (bgScale > 4) bgScale = 4;     // حد أقصى للزووم
    updateBgTransform();
}

function panBg(dx, dy) {
    bgOffsetX += dx;
    bgOffsetY += dy;
    updateBgTransform();
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
    const parent = targetRig || container;

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
    container.appendChild(rig);
    selectElement(rig);
}

// 4. نظام السحب والإفلات للشخصيات
function makeDraggable(element) {
    let isDragging = false;
    let startX, startY;

    element.addEventListener('mousedown', (e) => {
        e.preventDefault(); // يمنع أي سلوك افتراضي للمتصفح (تحديد نص، سحب أصلي) يتعارض مع كودنا
        selectElement(element);

        // إذا كان وضع تحديد نقطة الارتكاز مفعّلاً، نحسب موضع النقرة داخل الصورة كنسبة مئوية
        if (pivotMode) {
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
        startX = e.clientX - element.offsetLeft;
        startY = e.clientY - element.offsetTop;
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let x = e.clientX - startX;
        let y = e.clientY - startY;
        element.style.left = x + 'px';
        element.style.top = y + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

function selectElement(element) {
    if (selectedElement) {
        selectedElement.classList.remove('selected');
    }
    selectedElement = element;
    selectedElement.classList.add('selected');

    // رفع العنصر المحدد لأعلى طبقة حتى يظهر فوق البقية دائماً
    topZIndex++;
    selectedElement.style.zIndex = topZIndex;
}

// الضغط على مساحة فاضية من المسرح (الخلفية) يلغي أي تحديد حالي
container.addEventListener('mousedown', (e) => {
    if (e.target === container || e.target === bgImage || e.target.parentElement.id === 'bg-layer') {
        if (selectedElement) {
            selectedElement.classList.remove('selected');
            selectedElement = null;
        }
    }
});

// تحريك دقيق للعنصر المحدد بأسهم لوحة المفاتيح (1px عادي، 10px مع Shift للتحريك السريع)
document.addEventListener('keydown', (e) => {
    if (!selectedElement) return;
    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (!arrowKeys.includes(e.key)) return;

    e.preventDefault(); // يمنع تمرير الصفحة بالأسهم
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
    selectedElement.dataset.pivotX = 50;
    selectedElement.dataset.pivotY = 50;
    updateTransform(selectedElement);
}

// 5. أدوات التحكم (التدوير، القلب، الإخفاء، الحذف)
function rotateBy(angle) {
    if (!selectedElement) return alert("Select an element first!");
    let rot = parseInt(selectedElement.dataset.rotation) || 0;
    rot = (rot + angle) % 360;
    selectedElement.dataset.rotation = rot;
    updateTransform(selectedElement);
}

function flipSelected() {
    if (!selectedElement) return alert("Select an element first!");
    let scaleX = parseFloat(selectedElement.dataset.scaleX) || 1;
    scaleX *= -1;
    selectedElement.dataset.scaleX = scaleX;
    updateTransform(selectedElement);
}

function scaleSelected(amount) {
    if (!selectedElement) return alert("Select an element first!");
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
        showBtn.onclick = () => showElement(el);

        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑';
        delBtn.style.cssText = 'font-size:11px; padding:4px 6px; min-width:0; background:#eb3b5a;';
        delBtn.onclick = () => {
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

// 7. الخط الزمني (Timeline): كل لقطة = حالة كاملة قابلة للاسترجاع، بدون أي تصوير للشاشة
let shotNumber = 1;

// ================== تسجيل حالة كل لقطة والرجوع لها أو تعديلها أو عرض الفيلم منها ==================

// كل عنصر على المسرح يأخذ معرّفاً فريداً وثابتاً حتى نستطيع تتبعه بين اللقطات المختلفة
let elIdCounter = 0;
function ensureElId(el) {
    if (!el.dataset.elId) el.dataset.elId = 'el' + (++elIdCounter);
    return el.dataset.elId;
}

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

// يجمع حالة المسرح بأكملها: الخلفية (صورة/زووم/إزاحة) + كل الشخصيات والكائنات المركبة + أبعاد المسرح
// (أبعاد المسرح تُحفظ حتى تُبنى المعاينة المصغّرة لاحقاً بالمقياس الصحيح)
function serializeScene() {
    const topLevel = [];
    container.querySelectorAll(':scope > .character, :scope > .rig').forEach(el => {
        topLevel.push(serializeElement(el));
    });
    return {
        background: { src: bgImage.src, scale: bgScale, offsetX: bgOffsetX, offsetY: bgOffsetY },
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

    if (data.type === 'character' && data.src) {
        const img = document.createElement('img');
        img.src = data.src;
        img.className = 'character-img';
        img.draggable = false;
        wrapper.appendChild(img);
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

// يعيد بناء المسرح الحقيقي بالكامل من حالة محفوظة — الشخصيات تصبح قابلة للسحب والتعديل من جديد
function restoreScene(state) {
    container.querySelectorAll('.character, .rig').forEach(el => el.remove());
    hiddenElements = [];
    selectedElement = null;

    bgImage.src = state.background.src;
    bgScale = state.background.scale;
    bgOffsetX = state.background.offsetX;
    bgOffsetY = state.background.offsetY;
    updateBgTransform();

    state.elements.forEach(data => rebuildElement(data, container));

    topZIndex = state.topZIndex || topZIndex;
    charCounter = state.charCounter || charCounter;

    renderHiddenList();
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

    if (data.type === 'character' && data.src) {
        const img = document.createElement('img');
        img.src = data.src;
        img.className = 'character-img';
        img.draggable = false;
        wrapper.appendChild(img);
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
        mini.appendChild(bg);
    }

    state.elements.forEach(data => buildStaticElement(data, mini));
    box.appendChild(mini);
}

// مصفوفة الخط الزمني: كل عنصر = لقطة كاملة (رقمها + الحالة الكاملة القابلة للاسترجاع والتعديل)
let timeline = [];
let activeFrameIndex = -1;

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

        // النقر على أي لقطة سابقة يحمّلها على المسرح الحقيقي للتعديل (وليس فقط لعرضها)
        thumb.onclick = () => {
            activeFrameIndex = index;
            restoreScene(frame.state);
            renderFilmstrip();
        };

        // الضغط المزدوج على أي لقطة ينسخها ويضعها بجانب الأصلية مباشرة في الخط الزمني
        thumb.ondblclick = (e) => {
            e.stopPropagation();
            duplicateShot(index);
        };

        track.appendChild(thumb);
        renderScenePreview(frame.state, previewBox);
    });

    updateActiveFrameLabel();
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

function playFilm() {
    if (timeline.length === 0) return alert('No shots recorded yet!');

    const overlay = document.getElementById('play-overlay');
    const stageBox = document.getElementById('play-stage');
    const counter = document.getElementById('play-frame-counter');
    const fps = Math.max(1, Math.min(30, parseInt(document.getElementById('fps-input').value) || 8));
    const delay = 1000 / fps;

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
                exportStage.appendChild(bg);
            }

            state.elements.forEach(data => buildStaticElement(data, exportStage));

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
    fitStageToAspectRatio();
});