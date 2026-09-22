// ==========================================================================
// PDF Export Engine: html2canvas + jsPDF with Persian/RTL nuclear fix
// ==========================================================================

/* ═══════ Popover Controls ═══════ */
        function openPdfOptions() {
            const opts = document.getElementById('pdf-options');
            if (opts) opts.classList.remove('pdf-options-hidden');
        }
        function closePdfOptions() {
            const opts = document.getElementById('pdf-options');
            if (opts) opts.classList.add('pdf-options-hidden');
        }
        document.addEventListener('click', function (e) {
            const opts = document.getElementById('pdf-options');
            const btn = document.getElementById('pdf-download-btn');
            if (opts && !opts.contains(e.target) && (!btn || !btn.contains(e.target))) {
                opts.classList.add('pdf-options-hidden');
            }
        });

        /* ═══════ Deep style snapshot/restore ═══════ */
        function snapshotAllStyles(root) {
            const map = new Map();
            root.querySelectorAll('*').forEach(el => {
                map.set(el, {
                    letterSpacing: el.style.letterSpacing,
                    wordSpacing: el.style.wordSpacing,
                    direction: el.style.direction,
                    unicodeBidi: el.style.unicodeBidi,
                    textRendering: el.style.textRendering,
                    fontKerning: el.style.fontKerning,
                    whiteSpace: el.style.whiteSpace
                });
            });
            return map;
        }

        function restoreAllStyles(map) {
            map.forEach((saved, el) => {
                el.style.letterSpacing = saved.letterSpacing || '';
                el.style.wordSpacing = saved.wordSpacing || '';
                el.style.direction = saved.direction || '';
                el.style.unicodeBidi = saved.unicodeBidi || '';
                el.style.textRendering = saved.textRendering || '';
                el.style.fontKerning = saved.fontKerning || '';
                el.style.whiteSpace = saved.whiteSpace || '';
            });
        }

        /* ═══════ Force-fix every element inline ═══════ */
        function forceFixElementsForCapture(root) {
            root.querySelectorAll('*').forEach(el => {
                // Skip SVG internals
                if (el instanceof SVGElement) return;
                if (el.closest('svg')) return;

                const tag = el.tagName.toLowerCase();
                const style = el.style;
                const computedDir = window.getComputedStyle(el).direction;
                const hasExplicitLtr = el.getAttribute('dir') === 'ltr'
                    || (style.direction && style.direction === 'ltr')
                    || el.classList.contains('ai-prompt-text')
                    || el.classList.contains('corr-table');

                // Kill letter-spacing and word-spacing on EVERYTHING
                style.letterSpacing = '0px';
                style.wordSpacing = '0px';
                style.fontKerning = 'normal';
                style.textRendering = 'geometricPrecision';

                // Force RTL unless explicitly LTR
                if (!hasExplicitLtr) {
                    style.direction = 'rtl';
                    style.unicodeBidi = 'embed';
                }
            });
        }

        /* ═══════ PDF Export ═══════ */
        async function exportToPdf() {
            closePdfOptions();
            const includeNotes = document.getElementById('includeNotes')?.checked ?? false;
            const loading = document.getElementById('pdf-loading');
            const progress = document.getElementById('pdf-progress');
            if (loading) loading.classList.remove('pdf-loading-hidden');
            document.body.classList.add('pdf-exporting');

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            const slides = document.querySelectorAll('.slide');
            const stage = document.getElementById('stage');

            const originalActiveIndex = Array.from(slides).findIndex(s => s.classList.contains('active'));
            const origStage = {
                transform: stage.style.transform,
                marginTop: stage.style.marginTop,
                position: stage.style.position,
                top: stage.style.top,
                left: stage.style.left
            };

            stage.style.transform = 'none';
            stage.style.marginTop = '0';
            stage.style.position = 'absolute';
            stage.style.top = '0';
            stage.style.left = '0';

            const a4W = 297, a4H = 210;

            // Snapshot ALL inline styles before we touch anything
            const styleSnapshot = snapshotAllStyles(stage);

            // Force-fix every element inline (belt-and-suspenders with CSS)
            forceFixElementsForCapture(stage);

            try {
                for (let i = 0; i < slides.length; i++) {
                    const slide = slides[i];

                    // Show only current slide
                    slides.forEach(s => {
                        s.style.opacity = '0';
                        s.style.visibility = 'hidden';
                        s.style.position = 'absolute';
                    });
                    slide.style.opacity = '1';
                    slide.style.visibility = 'visible';
                    slide.style.transform = 'none';

                    // Re-apply fixes on this slide (in case restore messed things up)
                    forceFixElementsForCapture(slide);

                    // Handle presenter notes
                    const notes = slide.querySelector('.presenter-notes');
                    let savedNotes = null;
                    if (notes) {
                        savedNotes = {
                            position: notes.style.position,
                            top: notes.style.top,
                            bottom: notes.style.bottom,
                            left: notes.style.left,
                            width: notes.style.width,
                            maxHeight: notes.style.maxHeight,
                            overflow: notes.style.overflow,
                            display: notes.style.display,
                            zIndex: notes.style.zIndex,
                            boxSizing: notes.style.boxSizing,
                            borderRadius: notes.style.borderRadius
                        };
                        if (!includeNotes) {
                            notes.style.display = 'none';
                        }
                    }

                    await new Promise(r => setTimeout(r, 100));

                    if (i > 0) pdf.addPage('a4', 'landscape');

                    if (includeNotes && notes && notes.style.display !== 'none') {
                        /* ══════ TWO-PART: slide top + notes bottom ══════ */

                        notes.style.display = 'none';
                        await new Promise(r => setTimeout(r, 100));

                        const slideCanvas = await html2canvas(slide, {
                            width: 1920, height: 1080, scale: 1.5,
                            useCORS: true, allowTaint: true,
                            backgroundColor: '#FFFFFF', logging: false,
                            windowWidth: 1920, windowHeight: 1080,
                            onclone: function (clonedDoc) {
                                // Apply fixes inside the clone too
                                clonedDoc.querySelectorAll('*').forEach(el => {
                                    if (el instanceof SVGElement || el.closest('svg')) return;
                                    el.style.letterSpacing = '0px';
                                    el.style.wordSpacing = '0px';
                                    el.style.fontKerning = 'normal';
                                    el.style.textRendering = 'geometricPrecision';
                                    const hasLtr = el.getAttribute('dir') === 'ltr'
                                        || el.style.direction === 'ltr'
                                        || el.classList.contains('ai-prompt-text')
                                        || el.classList.contains('corr-table');
                                    if (!hasLtr) {
                                        el.style.direction = 'rtl';
                                        el.style.unicodeBidi = 'embed';
                                    }
                                });
                            }
                        });

                        // Show & prepare notes for capture
                        notes.style.display = 'block';
                        notes.style.position = 'relative';
                        notes.style.top = '0';
                        notes.style.left = '0';
                        notes.style.width = '1920px';
                        notes.style.maxHeight = 'none';
                        notes.style.overflow = 'visible';
                        notes.style.boxSizing = 'border-box';
                        notes.style.borderRadius = '0';
                        notes.style.zIndex = '1';
                        forceFixElementsForCapture(notes);

                        await new Promise(r => setTimeout(r, 100));

                        const notesCanvas = await html2canvas(notes, {
                            width: 1920, scale: 1.5,
                            useCORS: true, allowTaint: true,
                            backgroundColor: '#1a1a1a', logging: false,
                            windowWidth: 1920,
                            onclone: function (clonedDoc) {
                                clonedDoc.querySelectorAll('*').forEach(el => {
                                    if (el instanceof SVGElement || el.closest('svg')) return;
                                    el.style.letterSpacing = '0px';
                                    el.style.wordSpacing = '0px';
                                });
                            }
                        });

                        const notesZone = 40;
                        const slideZone = a4H - notesZone;
                        const sImgW = a4W;
                        const sImgH = (a4W * 1080) / 1920;

                        let fw, fh, sx, sy;
                        if (sImgH > slideZone) {
                            const r = slideZone / sImgH;
                            fw = sImgW * r; fh = slideZone;
                            sx = (a4W - fw) / 2; sy = 0;
                        } else {
                            fw = sImgW; fh = sImgH; sx = 0; sy = 0;
                        }

                        pdf.addImage(slideCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', sx, sy, fw, fh);

                        // Red separator
                        pdf.setDrawColor(220, 38, 38);
                        pdf.setLineWidth(0.5);
                        pdf.line(10, slideZone, a4W - 10, slideZone);

                        // Notes at bottom
                        const nAsp = notesCanvas.width / notesCanvas.height;
                        let nw = a4W - 10, nh = nw / nAsp;
                        if (nh > notesZone - 2) { nh = notesZone - 2; nw = nh * nAsp; }
                        const nx = (a4W - nw) / 2;
                        const ny = a4H - nh - 1;
                        pdf.addImage(notesCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', nx, ny, nw, nh);

                    } else {
                        /* ══════ SIMPLE: slide only ══════ */

                        const canvas = await html2canvas(slide, {
                            width: 1920, height: 1080, scale: 1.5,
                            useCORS: true, allowTaint: true,
                            backgroundColor: '#FFFFFF', logging: false,
                            windowWidth: 1920, windowHeight: 1080,
                            onclone: function (clonedDoc) {
                                clonedDoc.querySelectorAll('*').forEach(el => {
                                    if (el instanceof SVGElement || el.closest('svg')) return;
                                    el.style.letterSpacing = '0px';
                                    el.style.wordSpacing = '0px';
                                    el.style.fontKerning = 'normal';
                                    el.style.textRendering = 'geometricPrecision';
                                    const hasLtr = el.getAttribute('dir') === 'ltr'
                                        || el.style.direction === 'ltr'
                                        || el.classList.contains('ai-prompt-text')
                                        || el.classList.contains('corr-table');
                                    if (!hasLtr) {
                                        el.style.direction = 'rtl';
                                        el.style.unicodeBidi = 'embed';
                                    }
                                });
                            }
                        });

                        const imgW = a4W, imgH = (a4W * 1080) / 1920;
                        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, (a4H - imgH) / 2, imgW, imgH);
                    }

                    // Restore notes
                    if (notes && savedNotes) {
                        Object.keys(savedNotes).forEach(k => {
                            notes.style[k] = savedNotes[k] || '';
                        });
                    }

                    if (progress) progress.textContent = Math.round(((i + 1) / slides.length) * 100) + '%';
                }

                pdf.save('Defense_Presentation_Ezafe_Razavi.pdf');

            } catch (err) {
                console.error('PDF Export Error:', err);
                alert('خطا در ساخت PDF: ' + err.message);
            } finally {
                // Restore ALL inline styles from snapshot
                restoreAllStyles(styleSnapshot);

                // Restore slide visibility
                slides.forEach((s, idx) => {
                    s.style.opacity = '';
                    s.style.visibility = '';
                    s.style.position = '';
                    s.style.transform = '';
                    if (idx === originalActiveIndex) s.classList.add('active');
                    else s.classList.remove('active');
                });

                // Restore stage
                Object.keys(origStage).forEach(k => { stage.style[k] = origStage[k] || ''; });

                document.body.classList.remove('pdf-exporting');
                if (loading) loading.classList.add('pdf-loading-hidden');
                if (progress) progress.textContent = '0%';

                if (typeof fitStage === 'function') fitStage();
            }
        }
