// ==========================================================================
// Master Presentation Runtime: Canvas Scaler, Navigation, Roles & Presenter HUD
// ==========================================================================

// === ۱. سیستم مقیاس‌پذیری حرفه‌ای استیج (FHD Canvas Scaler) ===
const wrapper = document.getElementById('presentation-wrapper');
const stage = document.getElementById('stage');
const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;

function resizeStage() {
    if (!wrapper || !stage) return;
    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;
    const scale = Math.min(wrapperWidth / STAGE_WIDTH, wrapperHeight / STAGE_HEIGHT);
    stage.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', resizeStage);
const resizeObserver = new ResizeObserver(() => resizeStage());
if (wrapper) {
    resizeObserver.observe(wrapper);
}
resizeStage();

// === ۲. متغیرهای ناوبری و وضعیت ===
let currentIndex = 0;
let slides = document.querySelectorAll('.slide');
const progressBar = document.getElementById('progress');
let currentRole = 'admin'; // پیش‌فرض: حالت ارائه‌دهنده برای راحتی کاربر

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

    // نشانگر اسلاید در نوار نقش
    const badge = document.getElementById('slide-counter-badge');
    if (badge) {
        badge.textContent = `${currentIndex + 1} / ${slides.length}`;
    }

    // همگام‌سازی پنل ارائه‌دهنده (Presenter HUD)
    syncPresenterHud();

    // رندر مجدد فرمول‌های ریاضی MathJax ۳
    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise().catch(err => console.debug('MathJax typeset:', err));
    }
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

    // پیش‌نمایش اسلاید بعدی
    const nextPreview = document.getElementById('hud-next-title');
    if (nextPreview) {
        if (currentIndex < slides.length - 1) {
            const nextSlide = slides[currentIndex + 1];
            const nextTitle = nextSlide.querySelector('.title-main');
            nextPreview.textContent = nextTitle ? nextTitle.textContent : `اسلاید ${currentIndex + 2}`;
        } else {
            nextPreview.textContent = '— پایان ارائه رساله —';
        }
    }

    // عنوان اسلاید فعلی در هدر HUD
    const hudSlideNum = document.getElementById('hud-slide-indicator');
    if (hudSlideNum) {
        hudSlideNum.textContent = `اسلاید ${currentIndex + 1} از ${slides.length}`;
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
    // تنظیم خودکار نقش اولیه
    setRole(currentRole);

    // تبدیل ارجاعات علمی [cite: ...]
    const citeRegex = /\[cite:\s*([\d,\s]+)\]/g;
    document.querySelectorAll('.layout-content').forEach(container => {
        container.innerHTML = container.innerHTML.replace(
            citeRegex,
            (_, refs) => `<sup class="academic-cite" title="ارجاع به منبع ${refs}">[${refs}]</sup>`
        );
    });

    updateUI();

    // شروع خودکار ملایم کرنومتر در حالت ارائه‌دهنده
    startTimer();
});

// Initial call
updateUI();

// === ۸. کلیدهای میانبر پیشرفته (Keyboard Navigation & Role Shortcuts) ===
document.addEventListener('keydown', (e) => {
    // جلوگیری از تداخل هنگام تایپ
    const isTyping = e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (isTyping) return;

    // تغییر نقش با کلیدهای میانبر
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
    if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        toggleFullscreen();
        return;
    }

    // ناوبری اسلایدها
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
