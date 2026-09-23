// ==========================================================================
// Master Presentation Runtime: Canvas Scaler, Navigation, Roles & Presenter HUD
// ==========================================================================

// === ۱. سیستم مقیاس‌پذیری حرفه‌ای استیج (Responsive FHD Canvas Scaler) ===
const wrapper = document.getElementById('presentation-wrapper');
const stage = document.getElementById('stage');
const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;

function resizeStage() {
    if (!wrapper || !stage) return;
    const wrapperWidth = window.innerWidth;
    const wrapperHeight = window.innerHeight;
    
    // Scale smoothly with padding buffer on mobile screens
    const isMobile = wrapperWidth <= 1024;
    const horizontalMargin = isMobile ? 12 : 0;
    const verticalMargin = isMobile ? 70 : 0; // leaves space for bottom touch bar

    const availableW = Math.max(wrapperWidth - horizontalMargin, 320);
    const availableH = Math.max(wrapperHeight - verticalMargin, 240);

    const scale = Math.min(availableW / STAGE_WIDTH, availableH / STAGE_HEIGHT);
    stage.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', resizeStage);
window.addEventListener('orientationchange', () => setTimeout(resizeStage, 100));
const resizeObserver = new ResizeObserver(() => resizeStage());
if (wrapper) {
    resizeObserver.observe(wrapper);
}
resizeStage();

// === ۲. متغیرهای ناوبری و وضعیت ===
let currentIndex = 0;
let slides = document.querySelectorAll('.slide');
const progressBar = document.getElementById('progress');
let currentRole = 'audience'; // پیش‌فرض: حالت کاملاً تمیز مشاهده

// === ۲.۵. سیستم امنیتی و قفل ادمین (۵ بار Enter + کد ۶۵۱۹) ===
let enterCount = 0;
let enterTimer = null;

function openPasscodeModal() {
    const modal = document.getElementById('passcode-modal');
    const input = document.getElementById('passcode-input');
    const err = document.getElementById('passcode-error');
    if (err) err.classList.add('passcode-error-hidden');
    if (input) input.value = '';
    if (modal) {
        modal.classList.remove('passcode-modal-hidden');
        setTimeout(() => { if (input) input.focus(); }, 60);
    }
}

function closePasscodeModal() {
    const modal = document.getElementById('passcode-modal');
    if (modal) modal.classList.add('passcode-modal-hidden');
}

function handlePasscodeSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('passcode-input');
    const err = document.getElementById('passcode-error');
    const code = input ? input.value.trim() : '';

    if (code === '6519') {
        unlockAdminMode();
        closePasscodeModal();
    } else {
        if (err) {
            err.textContent = 'کد عبور نادرست است!';
            err.classList.remove('passcode-error-hidden');
        }
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

function unlockAdminMode() {
    localStorage.setItem('admin_unlocked', 'true');
    document.body.classList.add('admin-unlocked');
    setRole('admin');
    console.log('🔓 [Security] Admin mode unlocked and saved to session');
}

function lockAdminMode() {
    localStorage.removeItem('admin_unlocked');
    document.body.classList.remove('admin-unlocked');
    setRole('audience');
    console.log('🔒 [Security] Admin mode logged out');
}

window.openPasscodeModal = openPasscodeModal;
window.closePasscodeModal = closePasscodeModal;
window.handlePasscodeSubmit = handlePasscodeSubmit;
window.unlockAdminMode = unlockAdminMode;
window.lockAdminMode = lockAdminMode;

// === ۳. سیستم نقش‌ها (Role Switcher Engine) ===
function setRole(role) {
    currentRole = role;
    document.body.setAttribute('data-role', role);

    // به‌روزرسانی تب‌های نوار نقش
    document.querySelectorAll('.role-tab-btn').forEach(btn => {
        const targetRole = btn.getAttribute('data-role-target');
        btn.classList.toggle('active', targetRole === role);
    });

    // در حالت ادمین ادیتور را فعال یا غیرفعال کن
    if (typeof toggleEditMode === 'function') {
        if (role === 'admin') {
            toggleEditMode(true);
        } else {
            toggleEditMode(false);
        }
    }

    console.log(`[Role Engine] Active role set to: ${role}`);
    updateUI();
}

// === ۴. کرنومتر دفاع زنده (Presenter Defense Stopwatch) ===
let timerSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;

function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('hud-timer-digits');
    if (timerEl) {
        timerEl.textContent = formatTime(timerSeconds);
    }
}

function startTimer() {
    if (!isTimerRunning) {
        isTimerRunning = true;
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimerDisplay();
        }, 1000);
        const playBtn = document.getElementById('btn-timer-play');
        if (playBtn) playBtn.textContent = '⏸';
    } else {
        pauseTimer();
    }
}

function pauseTimer() {
    isTimerRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    const playBtn = document.getElementById('btn-timer-play');
    if (playBtn) playBtn.textContent = '▶';
}

function resetTimer() {
    pauseTimer();
    timerSeconds = 0;
    updateTimerDisplay();
}

function toggleHudMinimize() {
    const hud = document.getElementById('presenter-hud');
    if (hud) {
        hud.classList.toggle('hud-minimized');
    }
}

// === ۵. به‌روزرسانی رابط کاربری، اسلایدها و پنل ارائه‌دهنده ===
function updateUI() {
    slides = document.querySelectorAll('.slide');
    if (!slides.length) return;

    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= slides.length) currentIndex = slides.length - 1;

    // فعال‌سازی اسلاید جاری
    slides.forEach((slide, index) => {
        if (index === currentIndex) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });

    // نوار پیشرفت
    if (progressBar && slides.length > 1) {
        const progressPercent = (currentIndex / (slides.length - 1)) * 100;
        progressBar.style.width = `${progressPercent}%`;
    }

    // نشانگر اسلاید در نوار نقش و کنترل لمسی موبایل
    const badge = document.getElementById('slide-counter-badge');
    if (badge) {
        badge.textContent = `${currentIndex + 1} / ${slides.length}`;
    }
    const mobileCounter = document.getElementById('mobile-counter-badge');
    if (mobileCounter) {
        mobileCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
    }

    // همگام‌سازی پنل ارائه‌دهنده (Presenter HUD)
    syncPresenterHud();

    // رندر مجدد فرمول‌های ریاضی MathJax ۳
    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise().catch(err => console.debug('MathJax typeset:', err));
    }
}

function toPersianDigits(str) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(str).replace(/[0-9]/g, (w) => persianDigits[+w]);
}

function syncPresenterHud() {
    const activeSlide = slides[currentIndex];
    if (!activeSlide) return;

    // یادداشت‌های ارائه‌دهنده
    const notesBox = document.getElementById('hud-notes-text');
    const noteEl = activeSlide.querySelector('.presenter-notes');
    if (notesBox) {
        if (noteEl && noteEl.innerHTML.trim()) {
            notesBox.innerHTML = noteEl.innerHTML;
        } else {
            notesBox.innerHTML = '<em>یادداشتی برای این اسلاید ثبت نشده است.</em>';
        }
    }

    // پیش‌نمایش اسلاید بعدی با شماره اسلاید فارسی
    const nextPreview = document.getElementById('hud-next-title');
    if (nextPreview) {
        if (currentIndex < slides.length - 1) {
            const nextSlide = slides[currentIndex + 1];
            const nextTitle = nextSlide.querySelector('.title-main');
            const faNextNum = toPersianDigits(currentIndex + 2);
            nextPreview.textContent = nextTitle ? nextTitle.textContent : `اسلاید ${faNextNum}`;
        } else {
            nextPreview.textContent = '— پایان ارائه رساله —';
        }
    }

    // عنوان اسلاید فعلی در هدر HUD با ارقام کاملاً فارسی
    const hudSlideNum = document.getElementById('hud-slide-indicator');
    if (hudSlideNum) {
        const curFa = toPersianDigits(currentIndex + 1);
        const totalFa = toPersianDigits(slides.length);
        hudSlideNum.textContent = `اسلاید ${curFa} از ${totalFa}`;
    }
}

function nextSlide() {
    slides = document.querySelectorAll('.slide');
    if (currentIndex < slides.length - 1) {
        currentIndex++;
        updateUI();
    }
}

function prevSlide() {
    if (currentIndex > 0) {
        currentIndex--;
        updateUI();
    }
}

function goToSlide(index) {
    slides = document.querySelectorAll('.slide');
    if (index >= 0 && index < slides.length) {
        currentIndex = index;
        updateUI();
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn(`Fullscreen error: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// === ۶. متغیرها و توابع عمومی در پنجره ویندوز ===
window.updateUI = updateUI;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.goToSlide = goToSlide;
window.setRole = setRole;
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resetTimer = resetTimer;
window.toggleHudMinimize = toggleHudMinimize;
window.toggleFullscreen = toggleFullscreen;
window.resizeStage = resizeStage;
window.slides = slides;

Object.defineProperty(window, 'currentIndex', {
    get: () => currentIndex,
    set: (val) => {
        currentIndex = val;
        updateUI();
    }
});

// === ۷. تبدیل خودکار ارجاعات و لود اولیه ===
document.addEventListener("DOMContentLoaded", () => {
    // Restore admin state if previously logged in
    const wasAdmin = localStorage.getItem('admin_unlocked') === 'true';
    if (wasAdmin) {
        document.body.classList.add('admin-unlocked');
        setRole('admin');
    } else {
        lockAdminMode();
    }

    // تبدیل ارجاعات علمی [cite: ...]
    const citeRegex = /\[cite:\s*([\d,\s]+)\]/g;
    document.querySelectorAll('.layout-content').forEach(container => {
        container.innerHTML = container.innerHTML.replace(
            citeRegex,
            (_, refs) => `<sup class="academic-cite" title="ارجاع به منبع ${refs}">[${refs}]</sup>`
        );
    });

    updateUI();
});

// Initial call
updateUI();

// === ۸. کلیدهای میانبر پیشرفته (Keyboard Navigation & Role Shortcuts) ===
document.addEventListener('keydown', (e) => {
    // مودال رمز عبور
    const modal = document.getElementById('passcode-modal');
    const isModalOpen = modal && !modal.classList.contains('passcode-modal-hidden');

    if (isModalOpen) {
        if (e.key === 'Escape') {
            closePasscodeModal();
            return;
        }
        return; // وقتی مودال باز است سایر کلیدها غیرفعال باشند
    }

    // بررسی ۵ بار زدن متوالی کلید Enter برای باز کردن قفل
    const isTyping = e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (!isTyping) {
        if (e.key === 'Enter') {
            enterCount++;
            clearTimeout(enterTimer);
            enterTimer = setTimeout(() => {
                enterCount = 0;
            }, 2200);

            if (enterCount >= 5) {
                enterCount = 0;
                const isCurrentlyUnlocked = document.body.classList.contains('admin-unlocked');
                if (isCurrentlyUnlocked) {
                    lockAdminMode();
                    alert('🔒 از حالت مدیریت خارج شدید.');
                } else {
                    openPasscodeModal();
                }
                return;
            }
        } else {
            enterCount = 0;
        }
    }

    if (isTyping) return;

    const isUnlocked = document.body.classList.contains('admin-unlocked');

    // تغییر نقش با کلیدهای میانبر فقط و فقط پس از وارد کردن کد عبور فعال می‌شود
    if (isUnlocked) {
        if (e.key === '1' || (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey)) {
            setRole('audience');
            return;
        }
        if (e.key === '2' || (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey) || (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey)) {
            setRole('presenter');
            return;
        }
        if (e.key === '3' || (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey)) {
            setRole('admin');
            return;
        }
    }

    if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        toggleFullscreen();
        return;
    }

    // ناوبری اسلایدها (همیشه فعال برای ارائه روان)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Backspace') {
        e.preventDefault();
        prevSlide();
    } else if (e.key === 'Home') {
        e.preventDefault();
        currentIndex = 0;
        updateUI();
    } else if (e.key === 'End') {
        e.preventDefault();
        slides = document.querySelectorAll('.slide');
        currentIndex = slides.length - 1;
        updateUI();
    }
});


// === ۹. موتور لمسی پیوسته ریاضی: پینچ زوم دقیق روی انگشت + پن آزاد (سوایپ صفحه غیرفعال) ===
(function initTouchEngine() {
    let scale = 1;
    let panX = 0;
    let panY = 0;

    let isDragging = false;
    let isPinching = false;
    
    let dragStartX = 0;
    let dragStartY = 0;
    let initialPinchDist = 0;
    let startScale = 1;
    let pinchMidX = 0;
    let pinchMidY = 0;

    let lastTapTime = 0;
    const DOUBLE_TAP_DELAY = 300;

    const wrapperEl = document.getElementById('presentation-wrapper');
    const stageEl = document.getElementById('stage');
    const touchTarget = wrapperEl || document.body;

    function getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function applyTransform(animate = false) {
        if (!stageEl) return;
        stageEl.style.transition = animate ? 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
        stageEl.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        
        if (scale > 1.05) {
            stageEl.classList.add('slide-zoomed');
        } else {
            stageEl.classList.remove('slide-zoomed');
        }
    }

    // بازگرداندن اسلاید به مرکز و اسکیل ۱
    function resetZoom(animate = true) {
        scale = 1;
        panX = 0;
        panY = 0;
        applyTransform(animate);
        setTimeout(() => {
            if (scale <= 1.05 && typeof window.resizeStage === 'function') {
                window.resizeStage();
            }
        }, animate ? 300 : 0);
    }

    // محاسبات متمرکز زوم روی مفاصل لمس انگشتان یا تپ
    function zoomToPoint(targetScale, clientX, clientY) {
        if (!stageEl || !wrapperEl) return;
        
        const wrapperRect = wrapperEl.getBoundingClientRect();
        // یافتن مرکز استیج (پایدار و بدون تغییر ابعاد)
        const centerX = wrapperRect.left + wrapperRect.width / 2;
        const centerY = wrapperRect.top + wrapperRect.height / 2;

        const s1 = scale;
        const s2 = Math.max(1, Math.min(4, targetScale)); // کلمپ ابعاد زوم بین ۱ تا ۴ برابر

        // محاسبه آفست نقطه کلیک شده نسبت به مرکز اسلاید در اسکیل فعلی
        const offsetX = (clientX - centerX - panX) / s1;
        const offsetY = (clientY - centerY - panY) / s1;

        // مابه التفاوت اختلاف ابعاد اسکیل برای قفل کردن پیکسل زیر انگشت
        panX = panX - offsetX * (s2 - s1);
        panY = panY - offsetY * (s2 - s1);
        scale = s2;

        applyTransform(false);
    }

    // هندل دابل تپ
    function handleDoubleTap(e) {
        if (e.target.closest('.slide img')) return;
        if (e.target.closest('#mobile-nav-bar, #presenter-hud, #editor-toolbar, #role-switcher-bar, #passcode-modal')) return;

        const now = Date.now();
        if (now - lastTapTime < DOUBLE_TAP_DELAY && now - lastTapTime > 50) {
            e.preventDefault();
            if (scale > 1.05) {
                resetZoom(true);
            } else {
                const touch = e.changedTouches[0];
                zoomToPoint(2.2, touch.clientX, touch.clientY);
                applyTransform(true);
            }
            lastTapTime = 0;
        } else {
            lastTapTime = now;
        }
    }

    // === touchstart ===
    touchTarget.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            isPinching = true;
            isDragging = false;
            initialPinchDist = getPinchDistance(e.touches);
            startScale = scale;

            // ثبت دقیق نقطه مرکزی مابین دو انگشت در شروع پینچ
            pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            pinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        } else if (e.touches.length === 1) {
            if (scale > 1.05) {
                isDragging = true;
                dragStartX = e.touches[0].clientX - panX;
                dragStartY = e.touches[0].clientY - panY;
            }
        }
    }, { passive: false });

    // === touchmove ===
    touchTarget.addEventListener('touchmove', (e) => {
        if (isPinching && e.touches.length === 2) {
            e.preventDefault();
            const currentDist = getPinchDistance(e.touches);
            if (currentDist > 5 && initialPinchDist > 5) {
                const ratio = currentDist / initialPinchDist;
                const targetScale = startScale * ratio;
                
                // پینچ زوم پویا، پیوسته و آنی روی نقطه مرکزی انگشتان
                zoomToPoint(targetScale, pinchMidX, pinchMidY);
            }
        } else if (isDragging && e.touches.length === 1 && scale > 1.05) {
            e.preventDefault();
            // پن کردن و کشیدن آزاد صفحه در وضعیت زوم
            panX = e.touches[0].clientX - dragStartX;
            panY = e.touches[0].clientY - dragStartY;
            
            // قفل کردن محدوده پن برای جلوگیری از پرت شدن اسلاید از کادر صفحه
            const maxPanLimit = (scale - 1) * (stageEl.clientWidth / 2);
            panX = Math.max(-maxPanLimit, Math.min(maxPanLimit, panX));
            panY = Math.max(-maxPanLimit * 0.6, Math.min(maxPanLimit * 0.6, panY));
            
            applyTransform(false);
        }
    }, { passive: false });

    // === touchend ===
    touchTarget.addEventListener('touchend', (e) => {
        if (isPinching) {
            isPinching = false;
            initialPinchDist = 0;
            // اگر اسکیل به نزدیک ۱ بازگشت، ریست کامل شود
            if (scale < 1.05) {
                resetZoom(true);
            } else {
                applyTransform(true);
            }
            return;
        }

        if (isDragging) {
            isDragging = false;
            applyTransform(true);
            return;
        }

        handleDoubleTap(e);
    }, { passive: false });

    // غیرفعال کردن زوم سیستمی مرورگرها
    let lastPreventTap = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastPreventTap <= 350) {
            e.preventDefault();
        }
        lastPreventTap = now;
    }, { passive: false });

    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
})();