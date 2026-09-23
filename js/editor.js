// ==========================================================================
// Studio Visual Editor Engine v4: Solid State Sync (Zero Reload Loop)
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

    document.querySelectorAll('.slide h1, .slide h2, .slide h3, .slide h4, .slide p, .slide span, .slide div.text-body, .slide td, .slide tr, .slide th, .slide li').forEach(el => {
        el.contentEditable = EditorState.isEditMode;
        el.style.outline = EditorState.isEditMode ? '1px dashed rgba(220, 38, 38, 0.3)' : 'none';
    });

    if (!EditorState.isEditMode) clearEditorSelection();
    updateToolbarUI();
}

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

// 📦 Smart In-Memory Bootloader (Zero loop, Zero automated reload)
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

// Only manually clean and reload via client action
function clearLocalCache() {
    if (confirm('🧹 کش تغییرات مرورگر پاک شود و به کدهای خام سرور بازگردید؟')) {
        localStorage.removeItem(STORAGE_KEY_SLIDES);
        localStorage.removeItem(STORAGE_KEY_VERSIONS);
        localStorage.removeItem('presbuilder_last_compiled_build');
        window.location.reload();
    }
}

document.addEventListener('input', () => queueAutoSave());

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('h1, h2, h3, h4, p, span, div, img, svg').forEach((el) => {
            if (!el.id) el.id = `el_${Math.random().toString(36).substr(2, 9)}`;
        });
        restoreLocalSlideEdits();
        updateToolbarUI();
    });
} else {
    restoreLocalSlideEdits();
    updateToolbarUI();
}

window.triggerSave = triggerSave;
window.clearLocalCache = clearLocalCache;
window.toggleEditMode = toggleEditMode;
window.magicTidy = magicTidy;
window.undo = undo;
window.redo = redo;
