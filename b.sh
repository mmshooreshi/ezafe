cat << 'BUILD_EOF' > scripts/build.js
#!/usr/bin/env node
/**
 * ============================================================================
 * Master Thesis Presentation Compiler (Loop-Free, Manifest-Driven)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const slidesDir = path.join(rootDir, 'slides');
const dataFile = path.join(rootDir, 'data', 'presentation.json');

const presentationData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const meta = presentationData.metadata;

// Master manifest loader
const orderFile = path.join(slidesDir, '_order.json');
let slideFiles;
if (fs.existsSync(orderFile)) {
    slideFiles = JSON.parse(fs.readFileSync(orderFile, 'utf8'));
    console.log(`📋 Loading ${slideFiles.length} slides from manifest`);
} else {
    slideFiles = fs.readdirSync(slidesDir).filter(f => f.endsWith('.html')).sort();
}

const slidesHtml = slideFiles.map(file => {
    const filePath = path.join(slidesDir, file);
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Warning: slide file missing: ${file}`);
        return '';
    }
    return fs.readFileSync(filePath, 'utf8').trim();
}).filter(Boolean).join('\n\n            ');

const buildTimestamp = Date.now();

const uiHtml = `    <!-- Admin Passcode Security Modal (5x Enter + Passcode 6519) -->
    <div id="passcode-modal" class="passcode-modal-hidden">
        <div class="passcode-dialog">
            <div class="passcode-header">
                <h3>🔒 دسترسی به پنل مدیریت</h3>
                <button type="button" class="passcode-close-btn" onclick="closePasscodeModal()">✕</button>
            </div>
            <p class="passcode-desc">برای دسترسی به نوار ابزار و یادداشت‌های ارائه‌دهنده، کد عبور را وارد کنید:</p>
            <form id="passcode-form" onsubmit="handlePasscodeSubmit(event)">
                <input type="password" id="passcode-input" placeholder="کد عبور..." autocomplete="off" maxlength="10">
                <div id="passcode-error" class="passcode-error-hidden">کد عبور نادرست است!</div>
                <div class="passcode-actions">
                    <button type="button" class="passcode-btn-cancel" onclick="closePasscodeModal()">انصراف</button>
                    <button type="submit" class="passcode-btn-submit">تایید و ورود</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Role Switcher Hub -->
    <div id="role-switcher-bar">
        <button class="role-tab-btn" data-role-target="audience" onclick="setRole('audience')">🎓 مخاطب</button>
        <button class="role-tab-btn" data-role-target="presenter" onclick="setRole('presenter')">🎙️ ارائه‌دهنده</button>
        <button class="role-tab-btn" data-role-target="admin" onclick="setRole('admin')">✏️ ویرایشگر</button>
        <div class="role-divider"></div>
        <span id="slide-counter-badge">1 / ${slideFiles.length}</span>
        <div class="role-divider"></div>
        <button class="role-tab-btn" onclick="toggleFullscreen()" title="تمام‌صفحه (F)">⛶</button>
        <button class="role-tab-btn" id="pdf-download-btn" onclick="openPdfOptions()">📥 PDF</button>
        <div class="role-divider"></div>
        <button class="role-tab-btn" onclick="lockAdminMode()" title="قفل مجدد">🔒 قفل</button>
    </div>

    <!-- Presenter HUD -->
    <div id="presenter-hud">
        <div class="hud-header" onclick="toggleHudMinimize()">
            <div class="hud-header-title">
                <span>🎙️ یادداشت‌های ارائه‌دهنده و زمان‌سنج</span>
                <span id="hud-slide-indicator" style="font-size: 12px; opacity: 0.85;">اسلاید ۱</span>
            </div>
            <div class="hud-timer-wrap" onclick="event.stopPropagation()">
                <span id="hud-timer-digits">00:00</span>
                <button class="hud-timer-btn" id="btn-timer-play" onclick="startTimer()">⏸</button>
                <button class="hud-timer-btn" onclick="resetTimer()">🔄</button>
                <button class="hud-timer-btn" onclick="toggleHudMinimize()">−</button>
            </div>
        </div>
        <div class="hud-body">
            <div class="hud-next-preview">
                <b>اسلاید بعدی: </b><span id="hud-next-title">...</span>
            </div>
            <div class="hud-notes-box" id="hud-notes-text">
                در حال بارگذاری یادداشت‌ها...
            </div>
        </div>
    </div>

    <!-- Mini Options Popover for PDF Export -->
    <div id="pdf-options" class="pdf-options-hidden">
        <h4>تنظیمات خروجی PDF</h4>
        <label class="pdf-toggle">
            <input type="checkbox" id="includeNotes">
            <span>شامل یادداشت‌های ارائه‌دهنده</span>
        </label>
        <div class="pdf-actions">
            <button class="pdf-btn-cancel" onclick="closePdfOptions()">انصراف</button>
            <button class="pdf-btn-export" onclick="exportToPdf()">📥 خروجی PDF</button>
        </div>
    </div>

    <!-- Studio Edit Toolbar -->
    <div id="editor-toolbar" class="">
        <button class="editor-btn active" id="btn-edit" title="حالت ویرایش (Ctrl+E)" onclick="toggleEditMode()">✏️</button>
        <div class="toolbar-divider"></div>
        <button class="editor-btn" id="btn-undo" title="بازگشت (Ctrl+Z)" onclick="undo()">↩️</button>
        <button class="editor-btn" id="btn-redo" title="تکرار (Ctrl+Y)" onclick="redo()">↪️</button>
        <div class="toolbar-divider"></div>
        <button class="editor-btn" id="btn-magic" title="ترازسازی هوشمند" onclick="magicTidy()">✨</button>
        <div class="toolbar-divider"></div>
        <button class="editor-btn" id="btn-save" title="ذخیره محلی (Ctrl+S)" onclick="triggerSave()">💾</button>
        <button class="editor-btn" id="btn-clear-cache" title="پاکسازی کش محلی و بازنشانی" onclick="clearLocalCache()" style="color: #DC2626;">🧹</button>
    </div>

    <!-- History Sidebar -->
    <div id="history-sidebar" class="">
        <div class="sidebar-header">
            <h3>🕒 Timeline</h3>
            <button onclick="toggleSidebar()">✕</button>
        </div>
        <div class="sidebar-content" id="sidebar-versions">
            <div class="version-item">
                <div class="v-time">Just now</div>
                <div class="v-name">Auto-save</div>
            </div>
        </div>
    </div>

    <!-- Loading overlay -->
    <div id="pdf-loading" class="pdf-loading-hidden">
        <div class="pdf-spinner"></div>
        <p>در حال آماده‌سازی PDF... <span id="pdf-progress">0%</span></p>
    </div>`;

const modularHtml = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="build-timestamp" content="${buildTimestamp}">
    <title>دفاع پایان‌نامه - ${meta.student}</title>

    <!-- Modular Stylesheets -->
    <link rel="stylesheet" href="css/presentation.css">
    <link rel="stylesheet" href="css/editor.css">

    <!-- External Visual Libraries -->
    <script src="https://unpkg.com/roughjs@latest/bundled/rough.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/moveable/0.53.0/moveable.min.js" integrity="sha512-gFIuV9WCEJeWYkY1ZdJXugypot9ooEtwJf6U8In5JR6z5ZvV1xAvAQe9mQ7IYBXiF9ICXyiCeqgCJzqf64wh7A==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>

    <!-- MathJax 3 -->
    <script>
    window.MathJax = {
        tex: {
            inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
            displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
            processEscapes: true
        },
        svg: { fontCache: 'global' },
        options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'] }
    };
    </script>
    <script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>

    <!-- Mermaid.js -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
    mermaid.initialize({
        startOnLoad: true,
        look: 'handDrawn',
        theme: 'base',
        themeVariables: {
            fontFamily: 'Peyda, sans-serif',
            primaryColor: '#EBF3ED',
            primaryBorderColor: '#1B4332',
            primaryTextColor: '#0F2A1D',
            lineColor: '#1B4332',
            secondaryColor: '#FAF7EE',
            tertiaryColor: '#FFFFFF'
        }
    });
    </script>
</head>

<body data-role="presenter">
    <div id="presentation-wrapper">
        <div id="stage">
            <div class="progress-container">
                <div class="progress-bar" id="progress"></div>
            </div>

            ${slidesHtml}
        </div>
    </div>

${uiHtml}

    <!-- PDF & Canvas Libraries -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

    <!-- Presentation Engine Modules (Strict Execution Order) -->
    <script src="js/presentation.js"></script>
    <script src="js/lightbox.js"></script>
    <script src="js/header-enhancer.js"></script>
    <script src="js/passcode-gate.js"></script>
    <script src="js/pdf-export.js"></script>
    <script src="js/editor.js"></script>
</body>
</html>`;

const outPath = path.join(rootDir, 'index.html');
fs.writeFileSync(outPath, modularHtml);
console.log(`✅ Generated clean build: ${outPath} (${Math.round(modularHtml.length / 1024)} KB)`);
BUILD_EOF
echo "✅ scripts/build.js rewritten cleanly"