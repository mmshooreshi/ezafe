// ==========================================================================
// 🚀 Lightbox Engine with Smooth Multi-Touch Pinch & Drag-Pan (Mouse + Touch)
// ==========================================================================
(function initLightbox() {
    // ساخت المان لایت‌باکس اگر در صفحه وجود نداشت
    let lightbox = document.getElementById('image-lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'image-lightbox';
        lightbox.innerHTML = `
            <button id="lightbox-close" aria-label="Close">✕</button>
            <img id="lightbox-img" src="" alt="" style="transition: transform 0.2s ease-out; cursor: grab;">
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

    // وضعیت زوم و جابه‌جایی تصویر
    let currentScale = 1;
    let translateX = 0;
    let translateY = 0;

    // متغیرهای موقت محاسباتی لمس/ماوس
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let pinchStartDist = 0;
    let startScale = 1;

    // اعمال پیوسته ترنسفورم به عکس
    function applyTransform() {
        if (lbImg) {
            lbImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
        }
    }

    // ریست کامل ابعاد عکس لایت‌باکس به مرکز صفحه
    function resetTransform() {
        currentScale = 1;
        translateX = 0;
        translateY = 0;
        if (lbImg) {
            lbImg.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
        }
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

    // باز شدن لایت‌باکس با تپ روی عکس‌های اسلاید
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

    // دکمه‌های کنترل پنل پایین لایت‌باکس
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => {
        lbImg.style.transition = 'transform 0.2s ease-out';
        currentScale = Math.min(currentScale * 1.4, 5);
        applyTransform();
    });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => {
        lbImg.style.transition = 'transform 0.2s ease-out';
        currentScale = Math.max(currentScale / 1.4, 0.6);
        applyTransform();
    });
    if (resetBtn) resetBtn.addEventListener('click', resetTransform);

    // بستن لایت‌باکس با کلیک بر روی ناحیه بیرونی عکس
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    // دکمه ESC کیبورد برای بستن لایت‌باکس
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });

    // ==========================================
    // 📱 بخش اول لمسی (Mobile Multi-Touch)
    // ==========================================
    if (lbImg) {
        lbImg.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // شروع پینچ زوم (دو انگشتی)
                isDragging = false;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchStartDist = Math.sqrt(dx * dx + dy * dy);
                startScale = currentScale;
            } else if (e.touches.length === 1) {
                // شروع حرکت و کشیدن عکس (تک انگشتی)
                isDragging = true;
                startX = e.touches[0].clientX - translateX;
                startY = e.touches[0].clientY - translateY;
                lbImg.style.transition = 'none'; // غیرفعال کردن افکت ترنزیشن برای درگ کاملاً روان
            }
        }, { passive: false });

        lbImg.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && pinchStartDist) {
                e.preventDefault();
                // اعمال زوم همزمان دو انگشت
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const ratio = dist / pinchStartDist;
                currentScale = Math.max(0.6, Math.min(5, startScale * ratio));
                applyTransform();
            } else if (e.touches.length === 1 && isDragging) {
                e.preventDefault();
                // کشیدن و تغییر موقعیت عکس
                translateX = e.touches[0].clientX - startX;
                translateY = e.touches[0].clientY - startY;
                applyTransform();
            }
        }, { passive: false });

        lbImg.addEventListener('touchend', (e) => {
            isDragging = false;
            pinchStartDist = 0;
            // در صورتی که کاربر زوم را به حالت عادی برگرداند ترنزیشن به نرمی برگردد
            lbImg.style.transition = 'transform 0.15s ease-out';
        });
    }

    // ==========================================
    // 💻 بخش دوم ماوس دسکتاپ (Desktop Mouse Drag/Pan)
    // ==========================================
    if (lbImg) {
        lbImg.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            lbImg.style.transition = 'none'; // کشیدن بدون تاخیر
            lbImg.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            applyTransform();
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                lbImg.style.transition = 'transform 0.15s ease-out';
                lbImg.style.cursor = 'grab';
            }
        });
    }

    // ==========================================
    // ⚡ دابل تپ / دابل کلیک روی عکس برای تغییر حالت زوم زودهنگام
    // ==========================================
    if (lbImg) {
        let lastTap = 0;
        lbImg.addEventListener('click', (e) => {
            e.stopPropagation();
            const now = Date.now();
            if (now - lastTap < 300) {
                // اگر قبلاً زوم بوده ریست شود، در غیر این صورت زوم دوبرابر شود
                if (currentScale > 1.1) {
                    resetTransform();
                } else {
                    lbImg.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
                    currentScale = 2;
                    translateX = 0;
                    translateY = 0;
                    applyTransform();
                }
                lastTap = 0;
            } else {
                lastTap = now;
            }
        });
    }

    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;
})();