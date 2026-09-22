// ==========================================================================
// Studio Visual Editor Engine v3: Moveable, Rough.js, History, Demo
// ==========================================================================

// ==========================================
        // 🪄 MAX-LEVEL STUDIO ENGINE v3
        // ==========================================

        const EditorState = {
            isEditMode: false,
            moveableInstance: null,
            selectedTargets: [], // Array for Multi-select
            timeline: [],
            historyIndex: -1,
            savedVersions: [] // For Sidebar
        };

        // --- 0. SHORTCUT DIRECTORY ---
        console.table({
            "Ctrl + E": "Toggle Edit Mode",
            "Ctrl + S": "Save Latest",
            "Ctrl + Shift + S": "Save Named Version",
            "Ctrl + Z": "Undo",
            "Ctrl + Y": "Redo",
            "Ctrl + H": "Cycle Magic Highlighters",
            "Ctrl + Click": "Multi-select elements",
            "Ctrl + A": "Select All in Slide",
            "Magic Wand": "Tidy Alignments (UI)",
            "Rocket": "Cinematic Auto-Demo (UI)"
        });

        // --- 1. TOOLBAR & SIDEBAR ---
        function updateToolbarUI() {
            const toolbar = document.getElementById('editor-toolbar');
            if (toolbar) toolbar.classList.remove('editor-toolbar-hidden');
            const btnEdit = document.getElementById('btn-edit');
            if (btnEdit) btnEdit.classList.toggle('active', EditorState.isEditMode);
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('history-sidebar');
            if (sidebar) sidebar.classList.toggle('open');
        }

        // --- 2. PERSISTENCE & CLEANUP ---
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

        // --- 3. EDIT MODE ---
        function toggleEditMode(forceState = null) {
            EditorState.isEditMode = forceState !== null ? forceState : !EditorState.isEditMode;
            document.body.style.cursor = EditorState.isEditMode ? 'crosshair' : 'default';

            document.querySelectorAll('h1, h2, h3, h4, p, span, div.text-body, td, tr, th, li').forEach(el => {
                el.contentEditable = EditorState.isEditMode;
                el.style.outline = EditorState.isEditMode ? '1px dashed rgba(220, 38, 38, 0.3)' : 'none';
            });

            if (!EditorState.isEditMode) clearEditorSelection();
            updateToolbarUI();
        }

        // --- 4. TIMELINE & UNDO (FIXED) ---
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

                // Fix: Wait for transition to end before updating Moveable skeleton
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

        // --- 5. MOVEABLE (MULTI-SELECT & SNAPPING) ---
        // --- 5. MOVEABLE (MULTI-SELECT & SNAPPING) ---
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
                checkInput: false // 🔥 THIS FIXES THE "CANNOT DRAG EDITABLE TEXT" BUG
            });

            const controlBox = document.querySelector('.moveable-control-box');
            if (controlBox) {
                controlBox.classList.add('active');
                if (targets.length > 1) controlBox.dataset.type = 'group';
                else if (targets.tagName === 'IMG') controlBox.dataset.type = 'image';
                else if (targets.tagName === 'svg') controlBox.dataset.type = 'svg';
                else controlBox.dataset.type = 'text';
            }

            let initialStates = [];

            // 🔥 FIXED: Handle both single target and group targets safely
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

            // Bind events
            EditorState.moveableInstance.on("dragStart", onStart).on("dragGroupStart", onStart);
            EditorState.moveableInstance.on("drag", onDrag).on("dragGroup", onDragGroup);
            EditorState.moveableInstance.on("dragEnd", onEnd).on("dragGroupEnd", onEnd);

            EditorState.moveableInstance.on("rotateStart", onStart).on("rotateGroupStart", onStart);
            EditorState.moveableInstance.on("rotate", onDrag).on("rotateGroup", onDragGroup);
            EditorState.moveableInstance.on("rotateEnd", onEnd).on("rotateGroupEnd", onEnd);
        }
        document.addEventListener('mousedown', (e) => {
            if (!EditorState.isEditMode) return;

            // Prevent deselecting if clicking on toolbar or sidebar
            if (e.target.closest('#editor-toolbar') || e.target.closest('#history-sidebar')) return;

            // Clicked the background -> Deselect everything
            if (e.target.id === 'stage' || e.target.id === 'presentation-wrapper') {
                clearEditorSelection();
                return;
            }

            // 🔥 FIXED: Ignore clicks ON the moveable skeleton itself so it doesn't ghost
            if (e.target.closest('.moveable-control-box')) return;

            if (e.target.id) {
                // Check if clicking a NEW element
                if (!EditorState.selectedTargets.includes(e.target)) {
                    let newSelection = [...EditorState.selectedTargets];
                    if (e.ctrlKey || e.metaKey || e.shiftKey) {
                        newSelection.push(e.target); // Add to multi-select
                    } else {
                        newSelection = [e.target]; // Fresh single select
                    }
                    attachMoveable(newSelection);
                }
            }
        });

        // --- 6. MAGIC TIDY ---
        function magicTidy() {
            if (EditorState.selectedTargets.length === 0) { alert("🪄 Select elements to tidy!"); return; }

            let initialStates = [];
            let finalStates = [];

            EditorState.selectedTargets.forEach(target => {
                initialStates.push({ transform: target.style.transform || 'none', width: target.style.width, height: target.style.height });

                let newTransform = target.style.transform || '';
                const rotMatch = newTransform.match(/rotate\(([-0-9.]+)deg\)/);
                if (rotMatch) {
                    let angle = parseFloat(rotMatch);
                    let snappedAngle = Math.round(angle / 45) * 45;
                    newTransform = newTransform.replace(`rotate(${angle}deg)`, `rotate(${snappedAngle}deg)`);
                }
                target.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                target.style.transform = newTransform;

                finalStates.push({ transform: newTransform, width: target.style.width, height: target.style.height });
                setTimeout(() => { target.style.transition = 'none'; }, 500);
            });

            recordAction('transform', EditorState.selectedTargets, initialStates, finalStates);
            setTimeout(() => { if (EditorState.moveableInstance) EditorState.moveableInstance.updateRect(); }, 520);
        }



        // --- 7. BACKEND SAVE & HTML SANITIZER ---
        function timeAgo(date) {
            const seconds = Math.floor((new Date() - date) / 1000);
            if (seconds < 60) return "Just now";
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;
            return `${Math.floor(minutes / 60)}h ago`;
        }

        // 🔥 This function strips out dev-tools and skeletons before saving
        function getCleanHTML() {
            // Clone the document so we don't mess up the live view
            const clone = document.documentElement.cloneNode(true);

            // 1. Remove BrowserSync injected scripts (Fixes the loop/flicker)
            clone.querySelectorAll('script[id="__bs_script__"]').forEach(el => el.remove());
            clone.querySelectorAll('script[src*="browser-sync"]').forEach(el => el.remove());

            // 2. Remove Moveable ghost skeletons
            clone.querySelectorAll('.moveable-control-box').forEach(el => el.remove());

            // 3. Remove highlight SVGs (unless you want them saved permanently)
            // clone.querySelectorAll('.hl-svg').forEach(el => el.remove());

            // 4. Strip contenteditable attributes so the raw HTML is clean
            clone.querySelectorAll('[contenteditable]').forEach(el => {
                el.removeAttribute('contenteditable');
                el.style.outline = '';
            });

            // 5. Clean up any leftover cinematic effects
            clone.querySelectorAll('.cinematic-focus').forEach(el => el.classList.remove('cinematic-focus'));

            return "<!DOCTYPE html>\n" + clone.outerHTML;
        }

        async function triggerSave(forceNamed = false) {
            let vName = "Auto-save";
            if (forceNamed) {
                vName = prompt("Enter a name for this version (e.g. 'Fixed Titles'):", "");
                if (!vName) return; // User cancelled
            }

            // Get the sanitized HTML instead of the raw live DOM
            const cleanHTML = getCleanHTML();

            try {
                const res = await fetch('http://127.0.0.1:8080/save', {
                    method: 'POST',
                    body: JSON.stringify({ html: cleanHTML, versionName: vName }),
                    headers: { 'Content-Type': 'application/json' }
                });
                if (res.ok) {
                    EditorState.savedVersions.unshift({ name: vName, time: new Date() });
                    renderSidebar();
                    console.log(`💾 Saved: ${vName}`);

                    // Optional visual feedback
                    const saveBtn = document.getElementById('btn-save');
                    if (saveBtn) {
                        saveBtn.style.background = '#10B981';
                        setTimeout(() => saveBtn.style.background = '', 1000);
                    }
                }
            } catch (err) {
                console.error(err);
                alert("❌ Backend Save Failed");
            }
        }

        function renderSidebar() {
            const container = document.getElementById('sidebar-versions');
            if (!container) return;
            container.innerHTML = EditorState.savedVersions.map(v => `
            <div class="version-item">
                <div class="v-time">${timeAgo(v.time)}</div>
                <div class="v-name">${v.name}</div>
            </div>
        `).join('');
        }
        // --- 8. KEYBOARD BINDINGS ---
        document.removeEventListener('keydown', window._globalKeydownHandler);


        let typingTimer = null;
        const TYPING_TIMEOUT_MS = 2000; // 2 seconds

        // Helper: Restart the 2-second timer when typing
        function resetTypingTimer(target) {
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                // After 2 seconds of no typing, blur the element so Moveable can take over
                if (target && typeof target.blur === 'function') {
                    console.log("⏱️ 2 seconds idle. Auto-blurring to enable drag.");
                    target.blur();

                    // Re-attach moveable to update the skeleton size after editing
                    if (EditorState.selectedTargets.includes(target)) {
                        attachMoveable(EditorState.selectedTargets);
                    }
                }
            }, TYPING_TIMEOUT_MS);
        }

        // Input event fires on actual content changes (typing)
        document.addEventListener('input', (e) => {
            if (EditorState.isEditMode && e.target.isContentEditable) {
                resetTypingTimer(e.target);
                // Optional: Update moveable rect immediately while typing so it grows
                if (EditorState.moveableInstance) EditorState.moveableInstance.updateRect();
            }
        });

        // Clear timer if user manually clicks away
        document.addEventListener('focusout', (e) => {
            clearTimeout(typingTimer);
        });

        // Main Keyboard Handler
        document.addEventListener('keydown', (e) => {
            const isTyping = e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

            // If they press a key while focused, reset the 2-second timer
            if (isTyping) {
                resetTypingTimer(e.target);
            }

            // Slide Nav (Disabled if typing)
            if (!isTyping) {
                if (e.key === 'ArrowLeft' || e.key === 'PageDown') { e.preventDefault(); nextSlide(); return; }
                if (e.key === 'ArrowRight' || e.key === 'PageUp') { e.preventDefault(); prevSlide(); return; }
            }

            // Select All (Ctrl+A)
            if ((e.ctrlKey || e.metaKey) && e.key === 'a' && EditorState.isEditMode && !isTyping) {
                e.preventDefault();
                const allElements = Array.from(document.querySelectorAll('.slide.active *:not(#stage):not(.moveable-control-box):not(.layout-header):not(.layout-content)'));
                if (allElements.length > 0) attachMoveable(allElements);
            }

            // Saves (Ctrl+S / Ctrl+Shift+S)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                // If Shift is held, force named save. Otherwise standard auto-save.
                triggerSave(e.shiftKey);
            }

            // Toggles & History
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); toggleEditMode(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !isTyping) { e.preventDefault(); undo(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !isTyping) { e.preventDefault(); redo(); }

            // Highlight
            if ((e.ctrlKey || e.metaKey) && e.key === 'h' && EditorState.selectedTargets.length > 0 && !isTyping) {
                e.preventDefault();
                const styleName = highlightKeys[highlightTypeIndex];
                highlightTypeIndex = (highlightTypeIndex + 1) % highlightKeys.length;
                EditorState.selectedTargets.forEach(target => {
                    renderHighlight(target, { id: Date.now().toString() + Math.random(), style: HighlightStyles[styleName], active: true });
                });
            }
        });
        // --- 8.5. QUICK EDIT OVERRIDE ---
        // If an element is selected (skeleton is on it) and you press a normal character or Enter, 
        // force focus onto the text so you can start typing immediately without double clicking.
        document.addEventListener('keydown', (e) => {
            if (!EditorState.isEditMode || EditorState.selectedTargets.length !== 1) return;

            const target = EditorState.selectedTargets;
            const isTyping = e.target.isContentEditable || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

            // If we are NOT currently typing, and the target is editable, and it's a valid key
            if (!isTyping && target.isContentEditable) {
                // Ignore modifiers, arrows, and function keys
                if (e.ctrlKey || e.metaKey || e.altKey) return;
                if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace' && e.key !== 'Delete') return;

                // Prevent default if it's Enter so it doesn't immediately add a newline before focus
                if (e.key === 'Enter') e.preventDefault();

                target.focus();
                resetTypingTimer(target);
            }
        });
        // --- 9. CINEMATIC DEMO MODE (10s of Madness) ---
        async function runCinematicDemo() {
            if (EditorState.isEditMode) toggleEditMode(false);
            const sleep = ms => new Promise(r => setTimeout(r, ms));

            // Go to a random slide to start the show
            currentIndex = Math.floor(Math.random() * slides.length);
            updateUI();
            await sleep(1000);

            const activeSlide = slides[currentIndex];

            // 1. Gather all meaningful content
            let elements = Array.from(activeSlide.querySelectorAll('h1, h2, h3, p, li, img, .insight-box, .reg-stat-box'));

            // 2. Filter out tiny or invisible elements
            elements = elements.filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 30 && rect.height > 20 && el.offsetParent !== null;
            });

            if (elements.length === 0) return;

            // 3. SPATIAL SORTING (The Magic Proximity Flow)
            // Sorts Top-to-Bottom. If elements are on the same line, sorts Right-to-Left (Persian reading order)
            elements.sort((a, b) => {
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();

                // If they are within 40px vertically, treat them as the same row
                if (Math.abs(rectA.top - rectB.top) < 40) {
                    return rectB.right - rectA.right; // Right to Left
                }
                return rectA.top - rectB.top; // Top to Bottom
            });

            // Limit the demo to 5 elements so it doesn't drag on
            const targetElements = elements.slice(0, 5);

            for (let i = 0; i < targetElements.length; i++) {
                const target = targetElements[i];
                const tagName = target.tagName.toUpperCase();

                // 4. Smooth Focus
                target.classList.add('cinematic-focus');
                await sleep(700); // Wait for the camera to 'focus'

                // 5. Smart Style Selection based on Element Type
                let styleName = "box-yellow";
                if (tagName === 'P' || tagName === 'LI') styleName = "underline-red"; // Underline text
                else if (tagName === 'H1' || tagName === 'H2' || tagName === 'H3') styleName = "circle-blue"; // Circle headers
                else if (tagName === 'IMG' || target.classList.contains('insight-box')) styleName = "fade-purple"; // Ghost box for large items

                renderHighlight(target, { id: `demo_${i}`, style: HighlightStyles[styleName], active: true });

                await sleep(2000); // Absorb the information

                // Unfocus, but leave the highlight
                target.classList.remove('cinematic-focus');
                await sleep(400); // Small breath before moving to the next item
            }

            // 6. Grand Finale Cleanup
            await sleep(2000);
            document.querySelectorAll('.hl-svg').forEach(el => {
                el.style.transition = 'opacity 1s ease, filter 1s ease';
                el.style.opacity = '0';
                el.style.filter = 'blur(4px)';
                setTimeout(() => el.remove(), 1000);
            });
        }
        // --- 10. HIGHLIGHTER RENDERER (ULTRA-SMOOTH & HUMAN-LIKE) ---
        const HighlightStyles = {
            // Thin, elegant box
            "box-yellow": { type: 'rectangle', color: '#FCD34D', strokeWidth: 1.5, roughness: 0.6, bowing: 0.5, class: 'hl-draw', duration: '1.2s' },
            // Smooth, slightly curved underline
            "underline-red": { type: 'line', color: '#DC2626', strokeWidth: 2, roughness: 0.4, bowing: 1.2, class: 'hl-draw', duration: '0.8s' },
            // Steady hand-drawn circle
            "circle-blue": { type: 'ellipse', color: '#3B82F6', strokeWidth: 1.5, roughness: 0.8, bowing: 1, class: 'hl-draw', duration: '1.5s' },
            // Slithering thin snake
            "snake-green": { type: 'rectangle', color: '#10B981', strokeWidth: 1.5, roughness: 0.5, bowing: 0, class: 'hl-snake', duration: '3s' },
            // Ghostly thin box that fades
            "fade-purple": { type: 'rectangle', color: '#8B5CF6', strokeWidth: 1.5, roughness: 0.5, bowing: 0.5, class: 'hl-fade', duration: '1s' },
        };

        let highlightTypeIndex = 0;
        const highlightKeys = Object.keys(HighlightStyles);

        function renderHighlight(targetEl, config) {
            const rc = rough.svg(document.body);
            const rect = targetEl.getBoundingClientRect();
            const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svgNode.id = `hl_${config.id}`;
            svgNode.setAttribute("class", `hl-svg ${config.style.class}`);

            // Add a little extra padding so it breathes around the text
            const padX = 10;
            const padY = 8;

            svgNode.style.top = `${rect.top + window.scrollY - padY}px`;
            svgNode.style.left = `${rect.left + window.scrollX - padX}px`;
            svgNode.style.width = `${rect.width + (padX * 2)}px`;
            svgNode.style.height = `${rect.height + (padY * 2)}px`;
            svgNode.style.setProperty('--dur', config.style.duration);

            // 🔥 THE SECRET SAUCE: disableMultiStroke makes it a single, clean, thin line
            const opts = {
                roughness: config.style.roughness,
                stroke: config.style.color,
                strokeWidth: config.style.strokeWidth,
                bowing: config.style.bowing,
                disableMultiStroke: true,
                preserveVertices: true
            };

            let shape;
            const w = rect.width + (padX * 2);
            const h = rect.height + (padY * 2);

            if (config.style.type === 'rectangle') {
                shape = rc.rectangle(2, 2, w - 4, h - 4, opts);
            } else if (config.style.type === 'line') {
                // Draw slightly tilted underline right at the bottom edge
                shape = rc.line(4, h - 2, w - 4, h - 6, opts);
            } else if (config.style.type === 'ellipse') {
                shape = rc.ellipse(w / 2, h / 2, w - 4, h - 4, opts);
            }

            svgNode.appendChild(shape);
            document.body.appendChild(svgNode);
        }

        // Ensure IDs exist on boot
        document.addEventListener("DOMContentLoaded", () => {
            document.querySelectorAll('h1, h2, h3, h4, p, span, div, img, svg').forEach((el) => {
                if (!el.id) el.id = `el_${Math.random().toString(36).substr(2, 9)}`;
            });
            updateToolbarUI();
        });
