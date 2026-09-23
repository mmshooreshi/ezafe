// ==========================================================================
// 🎨 Auto Header Enhancer — Uniform Logo + Slide Counter on Every Slide
// ==========================================================================
(function() {
    'use strict';

    const CONFIG = {
        logoPath: 'images/ut_logo.png',
        logoFallback: 'images/university_tehran_logo.png',
        institution: 'دانشگاه تهران — دانشکدگان علوم و فناوری‌های میان‌رشته‌ای',
        thesis: 'شناسایی حوزه اضافه در زبان فارسی — رویکرد ترکیبی',
        year: 'شهریور ۱۴۰۵',
        author: 'سید محسن رضوی خسروشاهی'
    };

    function toPersianNum(n) {
        return n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
    }

    function enhanceHeaders() {
        const slides = document.querySelectorAll('.slide');
        const total = slides.length;

        slides.forEach((slide, idx) => {
            const slideNum = idx + 1;

            // ---- HEADER: force-rewrite header-top-bar with logo + counter ----
            const bar = slide.querySelector('.header-top-bar');
            if (bar) {
                bar.innerHTML = `
                    <div class="hdr-left">
                        <img src="${CONFIG.logoPath}" class="header-logo" alt="لوگو دانشگاه تهران"
                             onerror="this.onerror=null;this.src='${CONFIG.logoFallback}';">
                        <div class="hdr-institution">
                            <div class="hdr-inst-line">${CONFIG.institution}</div>
                            <div class="hdr-thesis-line">${CONFIG.thesis}</div>
                        </div>
                    </div>
                    <div class="hdr-counter">
                        <span class="hdr-counter-num">${toPersianNum(slideNum)}</span>
                        <span class="hdr-counter-slash">/</span>
                        <span class="hdr-counter-total">${toPersianNum(total)}</span>
                    </div>
                `;
                bar.classList.add('header-enhanced');
            }

            // ---- FOOTER: ensure consistent footer if missing ----
            let footer = slide.querySelector('.layout-footer');
            if (!footer && slideNum > 1) {  // skip cover
                footer = document.createElement('div');
                footer.className = 'layout-footer';
                footer.innerHTML = `
                    <span>${CONFIG.author} | راهنما: دکتر صالحی، دکتر بیجن‌خان</span>
                    <span class="footer-badge">اسلاید ${toPersianNum(slideNum)} از ${toPersianNum(total)}</span>
                    <span>دانشگاه تهران — ${CONFIG.year}</span>
                `;
                slide.appendChild(footer);
            } else if (footer) {
                // Update slide counter in existing footer if it has a badge
                const badge = footer.querySelector('.footer-badge');
                if (badge && !badge.dataset.custom) {
                    // preserve original text but add slide num prefix if absent
                }
            }
        });

        console.log(`🎨 [Header] Enhanced ${total} slides with logo + counter`);
    }

    // Run on load AND when slides change (e.g. after imports)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enhanceHeaders);
    } else {
        enhanceHeaders();
    }

    // Expose globally in case editor needs to re-run after import
    window.enhanceHeaders = enhanceHeaders;
})();
