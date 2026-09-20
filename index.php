<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <title>SSMS Simple stop motion Sutdio</title>
    <style>
        html, body {
            height: 100vh;
            margin: 0; padding: 0;
            overflow: hidden;
            font-family: Tahoma, sans-serif;
            background-color: #222;
        }
        .page-wrap {
            display: flex; flex-direction: column;
            height: 100vh; width: 100vw;
            box-sizing: border-box;
        }
        .app-container {
            display: flex; flex: 1 1 auto; min-height: 0; width: 100%;
            box-sizing: border-box; padding: 10px 10px 5px 10px; gap: 10px;
        }

        /* شريط اللقطات (الخط الزمني المصغّر) */
        .filmstrip-bar {
            flex: 0 0 108px; display: flex; align-items: center; gap: 10px;
            background: #1b1b1b; padding: 6px 10px; box-sizing: border-box;
        }
        .filmstrip-controls {
            display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px;
            width: 235px; flex: 0 0 auto; align-content: center;
        }
        .filmstrip-controls button, .filmstrip-controls label.upload-btn-sm {
            font-size: 11px; padding: 6px 3px; min-width: 0; width: 100%;
            box-sizing: border-box; text-align: center; flex: none;
        }
        #active-frame-label {
            grid-column: span 2; color: #bbb; font-size: 10px; text-align: center;
        }
        .filmstrip-controls .fps-row {
            grid-column: span 2; display: flex; align-items: center; justify-content: center;
            gap: 4px; color: #ccc; font-size: 11px;
        }
        .filmstrip-controls .fps-row input {
            width: 42px;
        }
        .filmstrip-track {
            flex: 1 1 auto; height: 100%; display: flex; gap: 6px;
            overflow-x: auto; align-items: center; padding: 4px;
        }
        .frame-thumb {
            position: relative; height: 84px; width: 112px; flex: 0 0 auto;
            border: 2px solid #444; border-radius: 4px; cursor: pointer;
            overflow: hidden; background: #000;
        }
        .frame-thumb .frame-num {
            position: absolute; top: 2px; right: 2px; z-index: 2;
            background: rgba(0,0,0,.65); color: #fff; font-size: 10px;
            padding: 1px 4px; border-radius: 3px;
        }
        .frame-thumb .frame-del {
            position: absolute; top: 2px; left: 2px; z-index: 2; display: none;
            background: #eb3b5a; color: #fff; border: none; font-size: 10px;
            padding: 1px 5px; border-radius: 3px; cursor: pointer;
        }
        .frame-thumb:hover .frame-del { display: block; }
        .frame-thumb.active { border-color: #007bff; }

        #play-overlay {
            display: none; position: fixed; inset: 0; background: #000;
            z-index: 1000; align-items: center; justify-content: center;
        }
        #play-overlay button {
            position: absolute; top: 20px; left: 20px; width: auto;
            background-color: #eb3b5a;
        }
        #play-frame-counter {
            position: absolute; top: 20px; right: 20px; color: #fff;
            font-size: 14px; background: rgba(255,255,255,.1); padding: 4px 10px; border-radius: 4px;
        }
        #play-stage {
            position: relative; overflow: hidden; background: #fff;
            width: 92vw; height: 80vh; border-radius: 6px;
        }
        .sidebar {
            width: 330px; background: #fff; padding: 12px;
            border-radius: 8px; display: flex; flex-direction: column;
            gap: 10px; overflow-y: auto; box-sizing: border-box;
        }
        .sidebar h3 {
            margin: 0 0 5px 0; font-size: 14px; color: #333;
            border-bottom: 2px solid #007bff; padding-bottom: 4px;
        }
        /* بدون هذا، عناصر الشريط الجانبي (Flexbox) تنكمش فوق بعضها عندما يزيد المحتوى عن الارتفاع المتاح،
           فتظهر الصور الزائدة تحت أزرار الزووم/التحريك بدل أن تدفعها لأسفل مع ظهور شريط تمرير */
        .sidebar > * {
            flex-shrink: 0;
        }
        .controls-group { display: flex; flex-wrap: wrap; gap: 4px; }
        .icon-row {
            display: flex; flex-wrap: nowrap; gap: 3px;
        }
        .icon-row button {
            flex: 1; min-width: 0; padding: 6px 2px;
            font-size: 15px;
        }
        button {
    padding: 7px 9px; font-size: 15px; cursor: pointer;
    background-color: #007bff; 
    border-radius: 4px; flex: 1; min-width: 45%;
}
        button:hover { background-color: #0056b3; }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        label.upload-btn-sm {
            display: inline-flex; align-items: center; justify-content: center;
            padding: 2px 7px; font-size: 12px; cursor: pointer;
            background-color: #28a745; color: #fff; border-radius: 4px;
        }
        label.upload-btn-sm:hover { background-color: #1e7e34; }
        
        .images-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;
            min-height: 50px;
        }
        .images-grid img {
            width: 100%; height: 55px; object-fit: contain; cursor: pointer;
            border: 2px solid #ddd; border-radius: 4px; background: #fafafa; padding: 2px;
        }
        .images-grid img:hover { border-color: #007bff; }

        /* حاوية خارجية تتوسّط فيها منطقة المسرح بنسبة 16:9 ثابتة، مع تفريغ letterbox داكن حول أي مساحة زائدة */
        .stage-wrapper {
            flex-grow: 1; display: flex; align-items: center; justify-content: center;
            min-width: 0; min-height: 0; overflow: hidden;
        }

        /* مسرح العمل */
        #canvas-container {
            position: relative; background-color: #ffffff;
            border: 2px solid #ccc; border-radius: 8px; overflow: hidden;
            box-sizing: border-box; flex: none;
        }
        
        #bg-layer {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 0; pointer-events: none; overflow: hidden;
            background-color: #fff;
        }
        #bg-image {
            position: absolute; top: 50%; left: 50%;
            width: 100%; height: 100%; object-fit: cover;
            transform: translate(-50%, -50%);
            transform-origin: center center;
        }

        /* الطبقة التي تمثل "كاميرا" المسرح الكاملة: تلف الخلفية وكل الشخصيات معاً، بحيث يؤثر
           زووم/تحريك الكاميرا على كل شيء دفعة واحدة (بعكس زووم/تحريك الخلفية وحدها الموجود أصلاً) */
        #camera-layer {
            position: absolute; inset: 0;
            transform-origin: center center;
        }

        /* طبقة "ورق البصل": تعرض اللقطة السابقة بشفافية خفيفة خلف المسرح الحالي كمرجع بصري فقط،
           فوق كل شيء في المسرح الحالي (بما فيه كاميرا اللقطة الحالية) وتحت لا شيء، بدون أي تفاعل */
        #onion-layer {
            position: absolute; inset: 0; z-index: 5;
            pointer-events: none; overflow: hidden;
            opacity: 0.32; display: none;
        }
        #onion-layer.active { display: block; }

        /* طبقة خطوط التأطير الإرشادية (Rule of Thirds + خط المنتصف): أداة عمل بصرية فقط أثناء
           التأليف، لا تُحفظ إطلاقاً ضمن بيانات اللقطة ولا تظهر عند تشغيل الفيلم أو التصدير */
        #composition-guides {
            position: absolute; inset: 0; z-index: 6;
            pointer-events: none; display: none;
        }
        #composition-guides.active { display: block; }
        #composition-guides .guide-line {
            position: absolute; background: rgba(255,255,255,.55);
        }
        #composition-guides .guide-line.v { top: 0; bottom: 0; width: 1px; }
        #composition-guides .guide-line.h { left: 0; right: 0; height: 1px; }
        #composition-guides .guide-center-v {
            position: absolute; top: 0; bottom: 0; left: 50%; width: 1px;
            background: rgba(235,59,90,.6);
        }
        #composition-guides .guide-center-h {
            position: absolute; left: 0; right: 0; top: 50%; height: 1px;
            background: rgba(235,59,90,.6);
        }

        .character {
            position: absolute; cursor: grab; user-select: none;
            z-index: 10;
        }
        .character:active { cursor: grabbing; }
        .character-img {
            display: block; max-width: 180px; height: auto;
            pointer-events: none; /* كل أحداث الماوس تذهب للغلاف الخارجي */
        }
        .selected {
            outline: 3px dashed #007bff;
            outline-offset: 2px;
        }
        .rig {
            position: absolute;
            min-width: 120px; min-height: 150px;
            border: 2px dashed rgba(0, 123, 255, 0.45);
            cursor: grab; user-select: none;
        }
        .rig:active { cursor: grabbing; }
    </style>
</head>
<body>

    <div class="page-wrap">
    <div class="app-container">
        
        <!-- القائمة الجانبية -->
<div class="sidebar">
    <div style="display:flex; gap:4px; margin-bottom:2px;">
        <a href="file_manager.php" target="_blank" rel="noopener"
           style="flex:1; min-width:0; text-align:center; background-color:#6c757d; color:#fff; text-decoration:none;
                  padding:7px 3px; border-radius:4px; font-size:11px; display:flex; align-items:center; justify-content:center;"
           title="Opens in a new tab. Organize, rename or delete your background/character files here before starting a scene — not while one is in progress.">
            🗂 Files
        </a>
        <button id="undo-btn" onclick="undo()" disabled
                title="Undo the last change (last 10 actions) — also works with Ctrl+Z / Cmd+Z"
                style="background-color:#c0392b; flex:1; min-width:0; padding:7px 3px; font-size:11px;">↶ Undo (0)</button>
        <button id="onion-skin-btn" onclick="toggleOnionSkin()"
                title="Shows the previous shot as a faint reference layer behind the current stage, to help you line up the next pose"
                style="background-color:#8e44ad; flex:1; min-width:0; padding:7px 3px; font-size:11px;">🧅 Onion</button>
        <button id="guides-btn" onclick="toggleCompositionGuides()"
                title="Rule-of-thirds and center guide lines over the stage — a framing aid only, never saved or shown during playback/export"
                style="background-color:#2c7873; flex:1; min-width:0; padding:7px 3px; font-size:11px;">📐 Grid</button>
    </div>
   <!-- <h4>أدوات التدوير والتحكم</h4>-->

            <h4 style="margin:2px 0 4px 0;">🎥 Stage Camera  <button onclick="resetCamera()"  title="Reset camera zoom/pan for this shot">↺ Reset Camera</button> </h4>
            <div class="icon-row">
                <button onclick="zoomCam(0.1)" style="background-color:#ffcc5e;" title="Camera push in">🎥+</button>
                <button onclick="zoomCam(-0.1)" style="background-color:#ffcc5e;" title="Camera pull out">🎥-</button>
                <button onclick="panCam(-40,0)" style="background-color:#ffcc5e;" title="Pan camera left">⬅</button>
                <button onclick="panCam(40,0)" style="background-color:#ffcc5e;" title="Pan camera right">➡</button>
                <button onclick="panCam(0,-40)" style="background-color:#ffcc5e;" title="Pan camera up">⬆</button>
                <button onclick="panCam(0,40)" style="background-color:#ffcc5e;" title="Pan camera down">⬇</button>
            </div>
            <button onclick="openSceneGradePanel()" title="Color grading applied to the whole shot at once (background + all characters) — not to a single character"
                    style="background-color:#16a085; min-width:100%; margin-top:5px;">🎬 Scene Grading</button>
           
            <div class="controls-group" >
			<button onclick="rotateBy(-5)" style="background-color: #17a2b8;">↺ CCW 5°</button>
                <button onclick="rotateBy(5)" style="background-color: #28a745;">CW 5° ↻</button>
                
                <button onclick="rotateBy(-15)" style="background-color: #17a2b8;">↺ CCW 15°</button>
				<button onclick="rotateBy(15)" style="background-color: #28a745;">CW 15° ↻</button>
                 <button onclick="toggleVisibility()" style="background-color: #9b59b6;">Hide / Show</button>
                <button onclick="flipSelected()" style="background-color: #f39c12;">Flip Horizontal</button>
                <button onclick="scaleSelected(0.1)" style="background-color: #2ecc71;">🔍+</button>
                <button onclick="scaleSelected(-0.1)" style="background-color: #2ecc71;">🔍-</button>
                <button onclick="bringForward()" style="background-color: #1abc9c;"
                        title="Move one layer forward — swaps order with the layer directly in front of it among its siblings">⬆ Layer Forward</button>
                <button onclick="sendBackward()" style="background-color: #1abc9c;"
                        title="Move one layer backward — swaps order with the layer directly behind it among its siblings">⬇ Layer Backward</button>
                <button id="pivot-btn" onclick="togglePivotMode()" style="background-color: #8e44ad;">📍 Set Pivot Point</button>
                <button onclick="resetPivot()" style="background-color: #7f8c8d;">↺ Reset Pivot to Center</button>
                <button onclick="openColorEffectsPanel()" style="background-color: #e67e22;">🎨 Color Effects</button>
               
                <button onclick="deleteSelected()" style="background-color: #eb3b5a; min-width: 100%;">Delete Selected</button>
            </div>

            <h4>🙈 Hidden Elements</h4>
            <div id="hidden-list" style="display:flex; flex-direction:column; gap:2px;">
                <p style="font-size:9px; color:#888; margin:2px;">No hidden elements</p>
            </div>


			
            <h3 style="display:flex; justify-content:space-between; align-items:center;">
                Characters &amp; Parts
                <span style="display:flex; gap:4px;">
                    <label class="upload-btn-sm" title="Upload a new character or part">📤
                        <input type="file" accept="image/png,image/jpeg" multiple
                               style="display:none"
                               onchange="uploadImages(this.files, 'characters', loadCharacters); this.value='';">
                    </label>
                    <button onclick="loadCharacters()" title="Refresh list" style="flex:0 0 auto; min-width:0; padding:2px 7px; font-size:12px;">🔄</button>
                </span>
            </h3>
            <button onclick="createRig()" style="background-color: #d35400; min-width:100%; margin-bottom:6px;">🧩 New Rig</button>
            <div id="char-grid" class="images-grid"></div>
			            <h4>
                Static Backgrounds<div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="display:flex; gap:2px;">
                    <label class="upload-btn-sm" title="Upload a new background">📤
                        <input type="file" accept="image/png,image/jpeg" multiple
                               style="display:none"
                               onchange="uploadImages(this.files, 'backgrounds', loadBackgrounds); this.value='';">
                    </label>
                    <button onclick="loadBackgrounds()" title="Refresh list" style="flex:0 0 auto; min-width:0; padding:2px 7px; font-size:12px;">🔄</button>
                </span>
            </div></h4>
            <div id="bg-grid" class="images-grid"></div>
            <div class="icon-row" style="margin-top: 5px;">
                <button onclick="zoomBg(0.1)" style="background-color: #6c757d;" title="Zoom in">🔍+</button>
                <button onclick="zoomBg(-0.1)" style="background-color: #6c757d;" title="Zoom out">🔍-</button>
                <button onclick="panBg(-40,0)" style="background-color: #6c757d;" title="Pan left">⬅</button>
                <button onclick="panBg(40,0)" style="background-color: #6c757d;" title="Pan right">➡</button>
                <button onclick="panBg(0,-40)" style="background-color: #6c757d;" title="Pan up">⬆</button>
                <button onclick="panBg(0,40)" style="background-color: #6c757d;" title="Pan down">⬇</button>
            </div>
        </div>

        <!-- مسرح العمل: حاوية توسيط ثابتة النسبة 16:9 -->
        <div id="stage-wrapper" class="stage-wrapper">
            <div id="canvas-container">
                <div id="camera-layer">
                    <div id="bg-layer"><img id="bg-image" alt=""></div>
                </div>
                <div id="onion-layer"></div>
                <div id="composition-guides">
                    <div class="guide-line v" style="left:33.333%"></div>
                    <div class="guide-line v" style="left:66.666%"></div>
                    <div class="guide-line h" style="top:33.333%"></div>
                    <div class="guide-line h" style="top:66.666%"></div>
                    <div class="guide-center-v"></div>
                    <div class="guide-center-h"></div>
                </div>
            </div>
        </div>

    </div>

    <!-- شريط اللقطات: خط زمني مصغّر لكل اللقطات المسجّلة، يمكن الرجوع لأي لقطة منه أو تعديلها -->
    <div class="filmstrip-bar">
        <div class="filmstrip-controls">
            <div id="active-frame-label">No shots yet</div>
            <button onclick="saveNewShot()" style="background-color:#28a745;">💾 Save New Shot</button>
            <button onclick="updateActiveShot()" style="background-color:#f39c12;">✏️ Update Selected Shot</button>
            <label class="upload-btn-sm" title="Import a saved scenario file">📂 Import Scenario
                <input type="file" accept="application/json" style="display:none"
                       onchange="importScenario(this.files[0]); this.value='';">
            </label>
            <button onclick="exportScenario()" style="background-color:#3498db;">⬇ Save Shots File</button>
            <div class="fps-row">
                <label for="fps-input">Speed (FPS)</label>
                <input id="fps-input" type="number" value="8" min="1" max="30">
				 </div>
				<div class="fps-row">

			   <label for="audio-select" title="Audio to play once at the start of Play Film">🔊</label>
                <select id="audio-select" style="max-width:100px;">
                    <option value="">None</option>
                </select>
                <label title="Upload audio (mp3, max 1MB)">📤
                    <br><input type="file" accept="audio/mpeg" style="display:none;"
                           onchange="uploadAudio(this.files, loadAudioList); this.value='';">
                </label>
            </div>
            <button onclick="playFilm()" style="background-color:#27ae60; grid-column: span 1;">▶ Play Film</button>
            <button id="export-frames-btn" onclick="exportAllFramesAsImages()" style="background-color:#6f42c1; grid-column: span 1;" title="Renders every saved shot at full size and downloads them as PNG files in one ZIP">📸 Export All Frames</button>
        </div>
        <div id="filmstrip-track" class="filmstrip-track">
            <p style="font-size:11px; color:#888; margin:2px 10px;">No shots recorded yet — click "💾 Save New Shot"</p>
        </div>
    </div>
    </div><!-- /.page-wrap -->

    <!-- نافذة تأثيرات الألوان المنبثقة: تُطبَّق حياً على الشخصية المحددة على المسرح مباشرة -->
    <div id="color-fx-panel" style="display:none; position:fixed; top:70px; left:20px; z-index:500;
         background:#1e1e1e; color:#eee; padding:14px; border-radius:8px; width:220px;
         box-shadow:0 4px 15px rgba(0,0,0,.5); font-size:12px; font-family:Tahoma, sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <strong>🎨 Color Effects</strong>
            <button onclick="closeColorEffectsPanel()" style="background:#eb3b5a; padding:2px 8px; font-size:11px; flex:none; min-width:0;">✕</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
            <label>Opacity: <span id="cfx-val-opacity">1</span>
                <input type="range" id="cfx-opacity" min="0" max="1" step="0.05" value="1" style="width:100%;">
            </label>
            <label>Brightness: <span id="cfx-val-brightness">100</span>%
                <input type="range" id="cfx-brightness" min="0" max="200" step="1" value="100" style="width:100%;">
            </label>
            <label>Contrast: <span id="cfx-val-contrast">100</span>%
                <input type="range" id="cfx-contrast" min="0" max="200" step="1" value="100" style="width:100%;">
            </label>
            <label>Saturation: <span id="cfx-val-saturate">100</span>%
                <input type="range" id="cfx-saturate" min="0" max="300" step="1" value="100" style="width:100%;">
            </label>
            <label>Hue Rotate: <span id="cfx-val-hue">0</span>deg
                <input type="range" id="cfx-hue" min="0" max="360" step="1" value="0" style="width:100%;">
            </label>
            <label>Blur: <span id="cfx-val-blur">0</span>px
                <input type="range" id="cfx-blur" min="0" max="20" step="0.5" value="0" style="width:100%;">
            </label>
            <label>Sepia: <span id="cfx-val-sepia">0</span>%
                <input type="range" id="cfx-sepia" min="0" max="100" step="1" value="0" style="width:100%;">
            </label>
            <div style="border-top:1px solid #333; margin-top:4px; padding-top:8px;">
                <strong style="display:block; margin-bottom:6px;">🌓 Ground Shadow</strong>
                <label>Shadow Opacity: <span id="cfx-val-shadowOpacity">0</span>
                    <input type="range" id="cfx-shadowOpacity" min="0" max="1" step="0.05" value="0" style="width:100%;"
                           title="0 = no shadow. Raise this to turn the shadow on.">
                </label>
                <label>Shadow Blur: <span id="cfx-val-shadowBlur">8</span>px
                    <input type="range" id="cfx-shadowBlur" min="0" max="30" step="1" value="8" style="width:100%;">
                </label>
                <label>Shadow Offset X: <span id="cfx-val-shadowOffsetX">6</span>px
                    <input type="range" id="cfx-shadowOffsetX" min="-30" max="30" step="1" value="6" style="width:100%;">
                </label>
                <label>Shadow Offset Y: <span id="cfx-val-shadowOffsetY">10</span>px
                    <input type="range" id="cfx-shadowOffsetY" min="0" max="30" step="1" value="10" style="width:100%;"
                           title="Vertical drop — how far below the character the shadow falls">
                </label>
            </div>
            <button onclick="resetColorEffects()" style="background-color:#6c757d; margin-top:4px;">↺ Reset</button>
        </div>
    </div>

    <!-- نافذة تدرّج لوني على مستوى اللقطة كاملة: تؤثر على الخلفية وكل الشخصيات معاً دفعة واحدة
         (بعكس نافذة Color Effects أعلاه التي تعمل على شخصية واحدة محددة فقط) -->
    <div id="scene-grade-panel" style="display:none; position:fixed; top:70px; left:20px; z-index:500;
         background:#1e1e1e; color:#eee; padding:14px; border-radius:8px; width:220px;
         box-shadow:0 4px 15px rgba(0,0,0,.5); font-size:12px; font-family:Tahoma, sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <strong>🎬 Scene Grading (whole shot)</strong>
            <button onclick="closeSceneGradePanel()" style="background:#eb3b5a; padding:2px 8px; font-size:11px; flex:none; min-width:0;">✕</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
            <label>Opacity: <span id="sg-val-opacity">1</span>
                <input type="range" id="sg-opacity" min="0" max="1" step="0.05" value="1" style="width:100%;">
            </label>
            <label>Brightness: <span id="sg-val-brightness">100</span>%
                <input type="range" id="sg-brightness" min="0" max="200" step="1" value="100" style="width:100%;">
            </label>
            <label>Contrast: <span id="sg-val-contrast">100</span>%
                <input type="range" id="sg-contrast" min="0" max="200" step="1" value="100" style="width:100%;">
            </label>
            <label>Saturation: <span id="sg-val-saturate">100</span>%
                <input type="range" id="sg-saturate" min="0" max="300" step="1" value="100" style="width:100%;">
            </label>
            <label>Hue Rotate: <span id="sg-val-hue">0</span>deg
                <input type="range" id="sg-hue" min="0" max="360" step="1" value="0" style="width:100%;">
            </label>
            <label>Blur: <span id="sg-val-blur">0</span>px
                <input type="range" id="sg-blur" min="0" max="10" step="0.5" value="0" style="width:100%;">
            </label>
            <label>Sepia: <span id="sg-val-sepia">0</span>%
                <input type="range" id="sg-sepia" min="0" max="100" step="1" value="0" style="width:100%;">
            </label>
            <button onclick="resetSceneGrade()" style="background-color:#6c757d; margin-top:4px;">↺ Reset</button>
        </div>
    </div>

    <!-- نافذة عرض الفيلم (Flipbook) مبنية مباشرة من بيانات المصفوفة، وليس من صور ملتقطة -->
    <div id="play-overlay">
        <button onclick="stopPlayback()">⏹ Stop Playback</button>
        <span id="play-frame-counter"></span>
        <div id="play-stage"></div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="script.js"></script>
</body>
</html>