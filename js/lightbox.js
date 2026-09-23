// ==========================================================================
// 🔍 Image & Table Lightbox with Pinch-Zoom, Pan, Double-Tap Zoom
// ==========================================================================

(function() {
    'use strict';

    // Create lightbox DOM once
    function ensureLightbox() {
        if (document.getElementById('image-lightbox')) return;
        const html = `
            <div id="image-lightbox" role="dialog" aria-label="نمایش تمام‌صفحه تصویر">
                <button id="lightbox-close" onclick="closeLightbox()" aria-label="بستن">✕</button>
                <img id="lightbox-img" src="" alt="">
                <div id="lightbox-controls">
                    <button class="lightbox-btn" onclick="lightboxZoom(-0.3)" aria-label="کوچک‌نمایی">−</button>
                    <button class="lightbox-btn" onclick="lightboxReset()" aria-label="بازنشانی">⟲</button>
                    <button class="lightbox-btn" onclick="lightboxZoom(0.3)" aria-label="بزرگ‌نمایی">+</button>
                    <span id="lightbox-caption"></span>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        wireLightbox();
    }

    // State
    const LB = {
        scale: 1,
        tx: 0,
        ty: 0,
        startX: 0,
        startY: 0,
        startTx: 0,
        startTy: 0,
        pinchStartDist: 0,
        pinchStartScale: 1,
        lastTap: 0
    };

    function applyTransform() {
        const img = document.getElementById('lightbox-img');
        if (img) img.style.transform = `translate(${LB.tx}px, ${LB.ty}px) scale(${LB.scale})`;
    }

    window.openLightbox = function(src, caption) {
        ensureLightbox();
        const lb = document.getElementById('image-lightbox');
        const img = document.getElementById('lightbox-img');
        const cap = document.getElementById('lightbox-caption');
        img.src = src;
        cap.textContent = caption || '';
        LB.scale = 1; LB.tx = 0; LB.ty = 0;
        applyTransform();
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    window.closeLightbox = function() {
        const lb = document.getElementById('image-lightbox');
        if (lb) lb.classList.remove('open');
        document.body.style.overflow = '';
    };

    window.lightboxZoom = function(delta) {
        LB.scale = Math.max(0.5, Math.min(6, LB.scale + delta));
        applyTransform();
    };

    window.lightboxReset = function() {
        LB.scale = 1; LB.tx = 0; LB.ty = 0;
        applyTransform();
    };

    function wireLightbox() {
        const lb = document.getElementById('image-lightbox');
        const img = document.getElementById('lightbox-img');
        if (!lb || !img) return;

        // Click backdrop closes
        lb.addEventListener('click', (e) => {
            if (e.target === lb) closeLightbox();
        });

        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lb.classList.contains('open')) closeLightbox();
            if (lb.classList.contains('open')) {
                if (e.key === '+' || e.key === '=') window.lightboxZoom(0.3);
                if (e.key === '-' || e.key === '_') window.lightboxZoom(-0.3);
                if (e.key === '0') window.lightboxReset();
            }
        });

        // Mouse wheel zoom
        img.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.15 : -0.15;
            window.lightboxZoom(delta);
        }, { passive: false });

        // Mouse drag pan
        let mouseDown = false;
        img.addEventListener('mousedown', (e) => {
            mouseDown = true;
            LB.startX = e.clientX;
            LB.startY = e.clientY;
            LB.startTx = LB.tx;
            LB.startTy = LB.ty;
            e.preventDefault();
        });
        window.addEventListener('mousemove', (e) => {
            if (!mouseDown) return;
            LB.tx = LB.startTx + (e.clientX - LB.startX);
            LB.ty = LB.startTy + (e.clientY - LB.startY);
            applyTransform();
        });
        window.addEventListener('mouseup', () => { mouseDown = false; });

        // Touch: single-finger pan, two-finger pinch, double-tap zoom
        img.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                // Double-tap detection
                const now = Date.now();
                if (now - LB.lastTap < 300) {
                    // Double tap: toggle between 1x and 2.5x
                    LB.scale = LB.scale > 1 ? 1 : 2.5;
                    LB.tx = 0; LB.ty = 0;
                    applyTransform();
                    LB.lastTap = 0;
                    e.preventDefault();
                    return;
                }
                LB.lastTap = now;
                LB.startX = e.touches[0].clientX;
                LB.startY = e.touches[0].clientY;
                LB.startTx = LB.tx;
                LB.startTy = LB.ty;
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                LB.pinchStartDist = Math.hypot(dx, dy);
                LB.pinchStartScale = LB.scale;
            }
        }, { passive: false });

        img.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                LB.tx = LB.startTx + (e.touches[0].clientX - LB.startX);
                LB.ty = LB.startTy + (e.touches[0].clientY - LB.startY);
                applyTransform();
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const ratio = dist / LB.pinchStartDist;
                LB.scale = Math.max(0.5, Math.min(6, LB.pinchStartScale * ratio));
                applyTransform();
            }
        }, { passive: false });
    }

    // Global click delegation: open lightbox on any slide image
    document.addEventListener('click', (e) => {
        const img = e.target.closest('.slide img');
        if (!img) return;
        if (img.classList.contains('no-zoom')) return;
        if (img.closest('.header-top-bar')) return;
        // Don't hijack in edit mode
        if (window.EditorState && window.EditorState.isEditMode) return;
        e.preventDefault();
        window.openLightbox(img.src, img.alt || img.title || '');
    });

    // Table zoom on mobile
    document.addEventListener('click', (e) => {
        const container = e.target.closest('.apa-table-container');
        if (!container) return;
        if (window.matchMedia('(pointer: fine)').matches) return; // desktop skip
        if (window.EditorState && window.EditorState.isEditMode) return;
        // Render table to an <img> via html2canvas? Simpler: open in a scrollable modal
        openTableFullscreen(container);
    });

    function openTableFullscreen(container) {
        ensureLightbox();
        // For tables: clone the table into a scrollable overlay
        let overlay = document.getElementById('table-fullscreen-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'table-fullscreen-overlay';
            overlay.style.cssText = `
                position: fixed; inset: 0; background: #FAF7EE; z-index: 100000;
                overflow: auto; padding: 60px 16px 20px; display: none;
            `;
            overlay.innerHTML = `
                <button onclick="document.getElementById('table-fullscreen-overlay').style.display='none'"
                    style="position:fixed;top:14px;left:14px;background:#0F2A1D;color:#FFF;
                    border:none;width:48px;height:48px;border-radius:50%;font-size:20px;
                    cursor:pointer;z-index:100001;">✕</button>
                <div id="table-fullscreen-body" style="max-width:100%;"></div>
            `;
            document.body.appendChild(overlay);
        }
        const body = document.getElementById('table-fullscreen-body');
        body.innerHTML = '';
        body.appendChild(container.cloneNode(true));
        // Scale up the cloned table
        const clonedTable = body.querySelector('table');
        if (clonedTable) {
            clonedTable.style.fontSize = '20px';
            clonedTable.style.width = '100%';
        }
        overlay.style.display = 'block';
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureLightbox);
    } else {
        ensureLightbox();
    }
})();






// ==========================================================================
// Image Lightbox: Tap-to-open on mobile + click on desktop
// ==========================================================================
(function initLightbox() {
    // ساخت المان لایت‌باکس اگر نبود
    let lightbox = document.getElementById('image-lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'image-lightbox';
        lightbox.innerHTML = `
            <button id="lightbox-close" aria-label="Close">✕</button>
            <img id="lightbox-img" src="" alt="">
            <div id="lightbox-controls">
                <button class="lightbox-btn" id="lb-zoom-in" aria-label="Zoom In">+</button>
                <button class="lightbox-btn" id="lb-zoom-out" aria-label="Zoom Out">−</button>
                <button class="lightbox-btn" id="lb-reset" aria-label="Reset">⟲</button>
                <div id="lightbox-caption"></div>
            </div>
        `;
        document.body.appendChild(lightbox);
    }

    const lbImg = document.getElementById('lightbox-img');
    const lbCaption = document.getElementById('lightbox-caption');
    const closeBtn = document.getElementById('lightbox-close');
    const zoomInBtn = document.getElementById('lb-zoom-in');
    const zoomOutBtn = document.getElementById('lb-zoom-out');
    const resetBtn = document.getElementById('lb-reset');

    let currentScale = 1;
    let translateX = 0;
    let translateY = 0;
    let pinchStart = 0;
    let panStart = null;

    function applyTransform() {
        if (lbImg) {
            lbImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
        }
    }

    function resetTransform() {
        currentScale = 1;
        translateX = 0;
        translateY = 0;
        applyTransform();
    }

    function openLightbox(src, alt) {
        if (!lightbox || !lbImg) return;
        lbImg.src = src;
        if (lbCaption) lbCaption.textContent = alt || '';
        lightbox.classList.add('open');
        resetTransform();
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
        resetTransform();
    }

    // دلگیت: هر عکس داخل اسلاید (به‌جز header و لوگو) با تپ باز شود
    document.addEventListener('click', (e) => {
        const img = e.target.closest('.slide img');
        if (!img) return;
        if (img.classList.contains('no-zoom')) return;
        if (img.closest('.header-top-bar')) return;
        if (img.closest('#lightbox-img')) return;
        e.preventDefault();
        e.stopPropagation();
        openLightbox(img.src, img.alt || img.title || '');
    }, true);

    // دکمه‌های کنترل
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => {
        currentScale = Math.min(currentScale * 1.35, 5);
        applyTransform();
    });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => {
        currentScale = Math.max(currentScale / 1.35, 0.5);
        applyTransform();
    });
    if (resetBtn) resetBtn.addEventListener('click', resetTransform);

    // کلیک روی پس‌زمینه لایت‌باکس (نه خود عکس) برای بستن
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    // Escape → بستن
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });

    // Pinch-zoom داخل لایت‌باکس
    if (lbImg) {
        lbImg.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchStart = Math.sqrt(dx * dx + dy * dy);
            } else if (e.touches.length === 1 && currentScale > 1) {
                panStart = {
                    x: e.touches[0].clientX - translateX,
                    y: e.touches[0].clientY - translateY
                };
            }
        }, { passive: false });

        lbImg.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 2 && pinchStart) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const ratio = dist / pinchStart;
                currentScale = Math.max(0.5, Math.min(5, currentScale * ratio));
                pinchStart = dist;
                applyTransform();
            } else if (e.touches.length === 1 && panStart && currentScale > 1) {
                translateX = e.touches[0].clientX - panStart.x;
                translateY = e.touches[0].clientY - panStart.y;
                applyTransform();
            }
        }, { passive: false });

        lbImg.addEventListener('touchend', () => {
            pinchStart = 0;
            panStart = null;
        });

        // Double-tap در لایت‌باکس → toggle x2 / x1
        let lbLastTap = 0;
        lbImg.addEventListener('click', (e) => {
            e.stopPropagation();
            const now = Date.now();
            if (now - lbLastTap < 300) {
                currentScale = currentScale > 1 ? 1 : 2;
                translateX = 0;
                translateY = 0;
                applyTransform();
            }
            lbLastTap = now;
        });
    }

    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;
})();