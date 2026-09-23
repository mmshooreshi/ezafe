// ==========================================================================
// 🎨 Studio Visual Editor Engine v5.1 — Full Builder, Sanitizer & Sync
// ==========================================================================

const EditorState = {
    isEditMode: false,
    moveableInstance: null,
    selectedTargets: [],
    timeline: [],
    historyIndex: -1,
    savedVersions: []
};

const STORAGE_KEY_SLIDES = 'presbuilder_slides_delta_v1';
const STORAGE_KEY_VERSIONS = 'presbuilder_saved_versions_v1';

// --------------------------------------------------------------------------
// 1. TOOLBAR & SIDEBAR VIEW
// --------------------------------------------------------------------------
function updateToolbarUI() {
    const toolbar = document.getElementById('editor-toolbar');
    if (toolbar) {
        if (document.body.classList.contains('admin-unlocked')) {
            toolbar.classList.remove('editor-toolbar-hidden');
        } else {
            toolbar.classList.add('editor-toolbar-hidden');
        }
    }
    const btnEdit = document.getElementById('btn-edit');
    if (btnEdit) btnEdit.classList.toggle('active', EditorState.isEditMode);
}

function toggleSidebar() {
    const sidebar = document.getElementById('history-sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

// --------------------------------------------------------------------------
// 2. SELECTION HANDLERS
// --------------------------------------------------------------------------
function clearEditorSelection() {
    if (EditorState.moveableInstance) {
        EditorState.moveableInstance.destroy();
        EditorState.moveableInstance = null;
    }
    EditorState.selectedTargets = [];
}

const originalUpdateUI = typeof updateUI === 'function' ? updateUI : (typeof window !== 'undefined' && window.updateUI ? window.updateUI : function () { });
updateUI = function () {
    clearEditorSelection();
    if (typeof originalUpdateUI === 'function') {
        originalUpdateUI();
    }
};
if (typeof window !== 'undefined') window.updateUI = updateUI;

function toggleEditMode(forceState = null) {
    EditorState.isEditMode = forceState !== null ? forceState : !EditorState.isEditMode;
    document.body.style.cursor = EditorState.isEditMode ? 'crosshair' : 'default';

    document.querySelectorAll('.slide h1, .slide h2, .slide h3, .slide h4, .slide p, .slide span, .slide div.text-body, .slide td, .slide th, .slide li, .slide img').forEach(el => {
        if (el.tagName !== 'IMG') {
            el.contentEditable = EditorState.isEditMode;
        }
        el.style.outline = EditorState.isEditMode ? '1px dashed rgba(197, 143, 71, 0.4)' : 'none';
    });

    if (!EditorState.isEditMode) clearEditorSelection();
    updateToolbarUI();
}

// --------------------------------------------------------------------------
// 3. OBJECT INSERTION MODULES
// --------------------------------------------------------------------------
function getActiveSlideContent() {
    const activeSlide = document.querySelector('.slide.active');
    if (!activeSlide) return null;
    let content = activeSlide.querySelector('.layout-content');
    if (!content) content = activeSlide;
    return content;
}

function assignUniqueId(element) {
    element.id = `studio_${Math.random().toString(36).substr(2, 9)}`;
    if (element.hasChildNodes()) {
        element.querySelectorAll('*').forEach(child => {
            child.id = `studio_${Math.random().toString(36).substr(2, 9)}`;
        });
    }
}

window.insertNewText = function() {
    const content = getActiveSlideContent();
    if (!content) return;

    const p = document.createElement('p');
    p.className = 'text-block-new';
    p.style.fontSize = '20px';
    p.style.lineHeight = '1.8';
    p.style.color = 'var(--color-text-body)';
    p.innerHTML = 'متن جدید خود را بنویسید...';
    p.contentEditable = true;
    p.style.outline = '1px dashed rgba(197, 143, 71, 0.4)';
    assignUniqueId(p);

    content.appendChild(p);
    attachMoveable([p]);
    queueAutoSave();
};

window.triggerImageUpload = function() {
    const input = document.getElementById('studio-image-file-input');
    if (input) input.click();
};

window.handleImageFileUploaded = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = getActiveSlideContent();
        if (!content) return;

        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.maxWidth = '320px';
        img.style.height = 'auto';
        img.alt = 'تصویر آپلود شده';
        assignUniqueId(img);

        content.appendChild(img);
        attachMoveable([img]);
        queueAutoSave();
    };
    reader.readAsDataURL(file);
};

window.insertNewTable = function() {
    const content = getActiveSlideContent();
    if (!content) return;

    const container = document.createElement('div');
    container.className = 'apa-table-container';
    assignUniqueId(container);

    const table = document.createElement('table');
    table.className = 'booktabs';
    assignUniqueId(table);

    table.innerHTML = `
        <thead>
            <tr>
                <th id="${table.id}_h1">عنوان ستون ۱</th>
                <th id="${table.id}_h2">عنوان ستون ۲</th>
                <th id="${table.id}_h3">عنوان ستون ۳</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td id="${table.id}_r1_1">داده ۱</td>
                <td id="${table.id}_r1_2">داده ۲</td>
                <td id="${table.id}_r1_3">داده ۳</td>
            </tr>
            <tr>
                <td id="${table.id}_r2_1">داده ۴</td>
                <td id="${table.id}_r2_2">داده ۵</td>
                <td id="${table.id}_r2_3">داده ۶</td>
            </tr>
        </tbody>
    `;

    container.appendChild(table);
    content.appendChild(container);

    table.querySelectorAll('th, td').forEach(cell => {
        cell.contentEditable = true;
        cell.style.outline = '1px dashed rgba(197, 143, 71, 0.4)';
    });

    attachMoveable([container]);
    queueAutoSave();
};

// --------------------------------------------------------------------------
// 4. DYNAMIC LAYOUT & TEXT-WRAPPING MODES
// --------------------------------------------------------------------------
window.setSelectedLayoutMode = function(mode) {
    if (EditorState.selectedTargets.length === 0) {
        alert("🎯 ابتدا عنصری را برای تغییر چیدمان انتخاب کنید!");
        return;
    }

    EditorState.selectedTargets.forEach(target => {
        target.style.position = '';
        target.style.float = '';
        target.style.margin = '';
        target.style.transform = '';
        target.style.display = '';

        if (mode === 'absolute') {
            target.style.position = 'absolute';
            target.style.top = '100px';
            target.style.left = '100px';
        } else if (mode === 'float-right') {
            target.style.float = 'right';
            target.style.marginLeft = '24px';
            target.style.marginBottom = '24px';
            target.style.display = 'inline-block';
        } else if (mode === 'float-left') {
            target.style.float = 'left';
            target.style.marginRight = '24px';
            target.style.marginBottom = '24px';
            target.style.display = 'inline-block';
        } else if (mode === 'center') {
            target.style.display = 'block';
            target.style.margin = '20px auto';
        }
    });

    if (EditorState.moveableInstance) {
        setTimeout(() => EditorState.moveableInstance.updateRect(), 100);
    }
    queueAutoSave();
};

// --------------------------------------------------------------------------
// 5. TABLE ROW EDITOR & ELEMENT DELETION
// --------------------------------------------------------------------------
window.addTableRow = function() {
    if (EditorState.selectedTargets.length === 0) {
        alert("📊 ابتدا سلول یا خود جدول را انتخاب کنید!");
        return;
    }

    const activeEl = EditorState.selectedTargets[0];
    const table = activeEl.closest('table');
    if (!table) {
        alert("❌ عنصر انتخابی درون یک جدول قرار ندارد.");
        return;
    }

    const theadTr = table.querySelector('thead tr');
    const colCount = theadTr ? theadTr.childElementCount : 3;
    const tbody = table.querySelector('tbody') || table;
    const tr = document.createElement('tr');
    assignUniqueId(tr);

    for (let i = 0; i < colCount; i++) {
        const td = document.createElement('td');
        td.innerHTML = 'داده جدید';
        td.contentEditable = true;
        td.style.outline = '1px dashed rgba(197, 143, 71, 0.4)';
        assignUniqueId(td);
        tr.appendChild(td);
    }

    tbody.appendChild(tr);
    queueAutoSave();
    if (EditorState.moveableInstance) EditorState.moveableInstance.updateRect();
};

window.deleteTableRow = function() {
    if (EditorState.selectedTargets.length === 0) {
        alert("📊 سلول سطر مورد نظر را انتخاب کنید!");
        return;
    }

    const activeEl = EditorState.selectedTargets[0];
    const tr = activeEl.closest('tr');
    const tbody = activeEl.closest('tbody');
    
    if (!tr || !tbody) {
        alert("❌ سلول معتبری انتخاب نشده است.");
        return;
    }

    if (tbody.children.length <= 1) {
        alert("⚠️ امکان حذف آخرین سطر جدول وجود ندارد.");
        return;
    }

    tr.remove();
    clearEditorSelection();
    queueAutoSave();
};

window.deleteSelectedElement = function() {
    if (EditorState.selectedTargets.length === 0) {
        alert("🗑️ ابتدا عنصری را برای حذف انتخاب کنید!");
        return;
    }

    if (confirm("آیا از حذف عنصر انتخاب شده مطمئن هستید؟")) {
        EditorState.selectedTargets.forEach(target => {
            target.remove();
        });
        clearEditorSelection();
        queueAutoSave();
    }
};

// --------------------------------------------------------------------------
// 6. TIMELINE & UNDO / REDO
// --------------------------------------------------------------------------
function recordAction(actionType, targets, beforeDataList, afterDataList) {
    if (EditorState.historyIndex < EditorState.timeline.length - 1) {
        EditorState.timeline = EditorState.timeline.slice(0, EditorState.historyIndex + 1);
    }
    EditorState.timeline.push({ id: Date.now(), type: actionType, targets: targets.map(t => t.id), before: beforeDataList, after: afterDataList });
    EditorState.historyIndex++;
}

function undo() {
    if (EditorState.historyIndex >= 0) {
        const action = EditorState.timeline[EditorState.historyIndex];
        applyState(action.targets, action.before, action.type);
        EditorState.historyIndex--;
    }
}

function redo() {
    if (EditorState.historyIndex < EditorState.timeline.length - 1) {
        EditorState.historyIndex++;
        const action = EditorState.timeline[EditorState.historyIndex];
        applyState(action.targets, action.after, action.type);
    }
}

function applyState(targetIds, dataList, type) {
    targetIds.forEach((id, index) => {
        const el = document.getElementById(id);
        if (!el) return;
        const data = dataList[index];

        el.style.transition = 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        el.addEventListener('transitionend', () => {
            if (EditorState.moveableInstance) EditorState.moveableInstance.updateRect();
        }, { once: true });

        if (type === 'transform') {
            el.style.transform = data.transform;
            el.style.width = data.width;
            el.style.height = data.height;
        } else if (type === 'textEdit') {
            el.innerHTML = data.html;
        }
        setTimeout(() => { el.style.transition = 'none'; }, 350);
    });
}

// --------------------------------------------------------------------------
// 7. MOVEABLE ORCHESTRATION
// --------------------------------------------------------------------------
function attachMoveable(targets) {
    if (targets.length === 0) return;
    clearEditorSelection();
    EditorState.selectedTargets = targets;

    const guidelines = Array.from(document.querySelectorAll('.slide.active *:not(#stage):not(.moveable-control-box)'));

    EditorState.moveableInstance = new Moveable(document.body, {
        target: targets,
        draggable: true, resizable: true, rotatable: true,
        snappable: true, snapCenter: true,
        elementGuidelines: guidelines, snapGap: true, isDisplaySnapDigit: true,
        checkInput: false
    });

    let initialStates = [];
    const onStart = (e) => {
        const evTargets = e.targets || [e.target];
        initialStates = evTargets.map(t => ({ transform: t.style.transform || 'none', width: t.style.width, height: t.style.height }));
    };
    const onDrag = ({ target, transform }) => { target.style.transform = transform; };
    const onDragGroup = ({ events }) => { events.forEach(ev => { ev.target.style.transform = ev.transform; }); };
    const onEnd = (e) => {
        const evTargets = e.targets || [e.target];
        const finalStates = evTargets.map(t => ({ transform: t.style.transform, width: t.style.width, height: t.style.height }));
        recordAction('transform', evTargets, initialStates, finalStates);
    };

    EditorState.moveableInstance.on("dragStart", onStart).on("dragGroupStart", onStart);
    EditorState.moveableInstance.on("drag", onDrag).on("dragGroup", onDragGroup);
    EditorState.moveableInstance.on("dragEnd", onEnd).on("dragGroupEnd", onEnd);
    EditorState.moveableInstance.on("rotateStart", onStart).on("rotateGroupStart", onStart);
    EditorState.moveableInstance.on("rotate", onDrag).on("rotateGroup", onDragGroup);
    EditorState.moveableInstance.on("rotateEnd", onEnd).on("rotateGroupEnd", onEnd);
}

document.addEventListener('mousedown', (e) => {
    if (!EditorState.isEditMode) return;
    if (e.target.closest('#editor-toolbar') || e.target.closest('#history-sidebar') || e.target.closest('#role-switcher-bar')) return;
    if (e.target.id === 'stage' || e.target.id === 'presentation-wrapper') {
        clearEditorSelection();
        return;
    }
    if (e.target.closest('.moveable-control-box')) return;

    if (e.target.id) {
        if (!EditorState.selectedTargets.includes(e.target)) {
            let newSelection = [...EditorState.selectedTargets];
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
                newSelection.push(e.target);
            } else {
                newSelection = [e.target];
            }
            attachMoveable(newSelection);
        }
    }
});

function magicTidy() {
    if (EditorState.selectedTargets.length === 0) { alert("🪄 ابتدا عنصری را انتخاب کنید!"); return; }

    let initialStates = [];
    let finalStates = [];

    EditorState.selectedTargets.forEach(target => {
        initialStates.push({ transform: target.style.transform || 'none', width: target.style.width, height: target.style.height });

        let newTransform = target.style.transform || '';
        const rotMatch = newTransform.match(/rotate\(([-0-9.]+)deg\)/);
        if (rotMatch) {
            let angle = parseFloat(rotMatch[1]);
            let snappedAngle = Math.round(angle / 45) * 45;
            newTransform = newTransform.replace(`rotate(${angle}deg)`, `rotate(${snappedAngle}deg)`);
        }
        target.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        target.style.transform = newTransform;

        finalStates.push({ transform: newTransform, width: target.style.width, height: target.style.height });
        setTimeout(() => { target.style.transition = 'none'; }, 420);
    });

    recordAction('transform', EditorState.selectedTargets, initialStates, finalStates);
    setTimeout(() => { if (EditorState.moveableInstance) EditorState.moveableInstance.updateRect(); }, 450);
}

// --------------------------------------------------------------------------
// 8. PERSISTENCE LAYER & TEAM EXPORT / IMPORT
// --------------------------------------------------------------------------
function restoreLocalSlideEdits() {
    try {
        const metaTag = document.querySelector('meta[name="build-timestamp"]');
        const currentBuild = metaTag ? metaTag.getAttribute('content') : null;
        const lastBuild = localStorage.getItem('presbuilder_last_compiled_build');

        if (currentBuild && currentBuild !== lastBuild) {
            console.log('🔄 [Storage] Newer server compilation build detected. Clearing local state cache silently.');
            localStorage.removeItem(STORAGE_KEY_SLIDES);
            localStorage.setItem('presbuilder_last_compiled_build', currentBuild);
            return;
        }

        const savedData = localStorage.getItem(STORAGE_KEY_SLIDES);
        if (!savedData) return;
        const editsMap = JSON.parse(savedData);

        Object.keys(editsMap).forEach(slideId => {
            const slideEl = document.getElementById(slideId);
            if (!slideEl) return;
            const data = editsMap[slideId];
            if (data && data.html) slideEl.innerHTML = data.html;
        });
        console.log('✅ [Storage] Local slide overrides restored.');
    } catch (e) {
        console.warn('[Storage] Restore bypassed:', e);
    }
}

function captureCurrentSlideEdits() {
    const editsMap = {};
    document.querySelectorAll('.slide').forEach(slide => {
        const clone = slide.cloneNode(true);
        clone.querySelectorAll('.moveable-control-box').forEach(el => el.remove());
        clone.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
            el.style.outline = '';
        });
        editsMap[slide.id] = { html: clone.innerHTML };
    });
    return editsMap;
}

let autoSaveDebounceTimer = null;
function queueAutoSave() {
    if (!EditorState.isEditMode) return;
    clearTimeout(autoSaveDebounceTimer);
    autoSaveDebounceTimer = setTimeout(() => {
        try {
            const editsMap = captureCurrentSlideEdits();
            localStorage.setItem(STORAGE_KEY_SLIDES, JSON.stringify(editsMap));
            console.log('⚡ [Storage] Auto-saved changes to localStorage');
        } catch (e) {}
    }, 300);
}

function triggerSave(forceNamed = false) {
    let vName = "Auto-save " + new Date().toLocaleTimeString('fa-IR');
    if (forceNamed) {
        vName = prompt("نام این نسخه را وارد کنید:", "");
        if (!vName) return;
    }

    const editsMap = captureCurrentSlideEdits();
    localStorage.setItem(STORAGE_KEY_SLIDES, JSON.stringify(editsMap));

    let versions = [];
    try {
        versions = JSON.parse(localStorage.getItem(STORAGE_KEY_VERSIONS) || '[]');
    } catch (err) { versions = []; }

    versions.unshift({ name: vName, time: new Date().toISOString(), data: editsMap });
    if (versions.length > 20) versions.pop();
    localStorage.setItem(STORAGE_KEY_VERSIONS, JSON.stringify(versions));

    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) {
        const origBg = saveBtn.style.background;
        saveBtn.style.background = '#10B981';
        setTimeout(() => saveBtn.style.background = origBg, 1000);
    }
    console.log(`💾 [Storage] Saved: ${vName}`);
}

function clearLocalCache() {
    if (confirm('🧹 کش تغییرات مرورگر پاک شود و به کدهای خام سرور بازگردید؟')) {
        localStorage.removeItem(STORAGE_KEY_SLIDES);
        localStorage.removeItem(STORAGE_KEY_VERSIONS);
        localStorage.removeItem('presbuilder_last_compiled_build');
        window.location.reload();
    }
}

// 📦 ENHANCED EXPORT: Captures Author, Message, and Generates Clean Named JSON
function exportPresentationState() {
    const editsMap = captureCurrentSlideEdits();
    
    let author = localStorage.getItem('presbuilder_author_name') || '';
    if (!author) {
        author = prompt('✍️ نام شما (برای ثبت در تاریخچه):', 'محسن رضوی') || 'ناشناس';
        localStorage.setItem('presbuilder_author_name', author);
    }
    const message = prompt('📝 توضیح تغییرات (پیام commit):', 'به‌روزرسانی محتوای اسلایدها') || 'به‌روزرسانی محتوا';
    
    const exportPayload = {
        exportedAt: new Date().toISOString(),
        exportedBy: author,
        commitMessage: message,
        version: "1.1",
        totalSlides: Object.keys(editsMap).length,
        slides: editsMap
    };
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeAuthor = author.replace(/[^a-zA-Z0-9\u0600-\u06FF]+/g, '_');
    
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thesis_deck_${safeAuthor}_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setTimeout(() => {
        alert(`✅ فایل با موفقیت دانلود شد!\n\n📁 نام فایل: thesis_deck_${safeAuthor}_${timestamp}.json\n👤 نویسنده: ${author}\n📝 پیام: ${message}\n📊 تعداد اسلاید: ${Object.keys(editsMap).length}\n\n💡 برای هم‌گام‌سازی با تیم:\nاین فایل را برای مهدی بفرستید تا با یک دستور آن را روی کد اصلی اعمال کند.`);
    }, 300);
}

function importPresentationState() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (!parsed.slides) throw new Error('فایل معتبر نیست (کلید slides یافت نشد)');
                localStorage.setItem(STORAGE_KEY_SLIDES, JSON.stringify(parsed.slides));
                alert('✅ فایل پشتیبان با موفقیت بازیابی شد.');
                location.reload();
            } catch (err) {
                alert('❌ خطا در بازخوانی فایل: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// --------------------------------------------------------------------------
// 9. MS OFFICE/WORD REALTIME CLIPBOARD SANITIZER & DRAG-AND-DROP
// --------------------------------------------------------------------------
document.addEventListener('paste', function(e) {
    if (!EditorState.isEditMode) return;
    
    const target = e.target;
    if (!target.isContentEditable) return;

    const html = e.clipboardData.getData('text/html');
    if (html && (html.includes('urn:schemas-microsoft-com:office:office') || html.includes('mso-'))) {
        e.preventDefault();
        
        const sandbox = document.createElement('div');
        sandbox.innerHTML = html;

        const wordTable = sandbox.querySelector('table');
        if (wordTable) {
            console.log('📋 Word/Excel table detected! Transforming into semantic booktabs...');
            const standardTable = document.createElement('table');
            standardTable.className = 'booktabs';
            assignUniqueId(standardTable);

            const rows = Array.from(wordTable.querySelectorAll('tr'));
            if (rows.length > 0) {
                const thead = document.createElement('thead');
                const tbody = document.createElement('tbody');
                
                rows.forEach((row, rIdx) => {
                    const tr = document.createElement('tr');
                    assignUniqueId(tr);
                    
                    const cells = Array.from(row.querySelectorAll('td, th'));
                    cells.forEach(cell => {
                        const cellNode = document.createElement(rIdx === 0 ? 'th' : 'td');
                        cellNode.innerHTML = cell.innerText.trim();
                        cellNode.contentEditable = true;
                        cellNode.style.outline = '1px dashed rgba(197, 143, 71, 0.4)';
                        assignUniqueId(cellNode);
                        tr.appendChild(cellNode);
                    });
                    
                    if (rIdx === 0) thead.appendChild(tr);
                    else tbody.appendChild(tr);
                });
                
                standardTable.appendChild(thead);
                standardTable.appendChild(tbody);
            }

            const container = document.createElement('div');
            container.className = 'apa-table-container';
            assignUniqueId(container);
            container.appendChild(standardTable);

            const activeSlideContent = getActiveSlideContent();
            if (activeSlideContent) {
                activeSlideContent.appendChild(container);
                attachMoveable([container]);
                queueAutoSave();
            }
        } else {
            console.log('📝 MS Office rich text sanitized.');
            const cleanText = sandbox.innerText.trim();
            document.execCommand('insertText', false, cleanText);
        }
    }
});

document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', function(e) {
    if (!EditorState.isEditMode) return;
    e.preventDefault();

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const content = getActiveSlideContent();
            if (!content) return;

            const img = document.createElement('img');
            img.src = evt.target.result;
            img.style.maxWidth = '320px';
            img.style.height = 'auto';
            img.alt = 'تصویر رها شده';
            assignUniqueId(img);

            content.appendChild(img);
            attachMoveable([img]);
            queueAutoSave();
        };
        reader.readAsDataURL(files[0]);
    }
});

// --------------------------------------------------------------------------
// 10. KEYBOARD SHORTCUTS & BOOT INITIALIZATION
// --------------------------------------------------------------------------
document.addEventListener('input', () => queueAutoSave());

document.addEventListener('keydown', (e) => {
    const isTyping = e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

    // Slide navigation (only when not typing)
    if (!isTyping) {
        if (e.key === 'ArrowLeft' || e.key === 'PageDown') { e.preventDefault(); nextSlide(); return; }
        if (e.key === 'ArrowRight' || e.key === 'PageUp') { e.preventDefault(); prevSlide(); return; }
    }

    // Ctrl/Cmd + S -> Save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerSave(e.shiftKey);
    }

    // Ctrl/Cmd + E -> Edit mode toggle
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        toggleEditMode();
    }

    // Ctrl/Cmd + Z -> Undo, Ctrl/Cmd + Y -> Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !isTyping) {
        e.preventDefault();
        undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) && !isTyping) {
        e.preventDefault();
        redo();
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('h1, h2, h3, h4, p, span, div, img, svg, table, td, tr, th').forEach((el) => {
            if (!el.id) el.id = `el_${Math.random().toString(36).substr(2, 9)}`;
        });
        restoreLocalSlideEdits();
        updateToolbarUI();
    });
} else {
    restoreLocalSlideEdits();
    updateToolbarUI();
}

// Global exports for inline HTML onclick attributes
window.triggerSave = triggerSave;
window.clearLocalCache = clearLocalCache;
window.toggleEditMode = toggleEditMode;
window.magicTidy = magicTidy;
window.undo = undo;
window.redo = redo;
window.exportPresentationState = exportPresentationState;
window.importPresentationState = importPresentationState;
window.toggleSidebar = toggleSidebar;
