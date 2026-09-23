// ==========================================================================
// High-Fidelity PDF Engine:
// 1. Instant True Vector Print (Zero Quality Loss, Zero Stretch)
// 2. Proportional High-DPI Canvas Fallback (16:9 Aspect Preserved)
// ==========================================================================

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
    if (opts && !opts.classList.contains('pdf-options-hidden')) {
        if (!opts.contains(e.target) && (!btn || !btn.contains(e.target))) {
            closePdfOptions();
        }
    }
});

/**
 * 1. Vector Direct Print (Crispest Possible, 100% Vector Quality, Instant)
 */
function printDeckToPdf() {
    closePdfOptions();

    const includeNotes = document.getElementById('includeNotes')?.checked ?? false;
    if (includeNotes) {
        document.body.classList.add('print-with-notes');
    } else {
        document.body.classList.remove('print-with-notes');
    }

    if (typeof clearEditorSelection === 'function') {
        clearEditorSelection();
    }

    const stage = document.getElementById('stage');
    let origTransform = '';
    if (stage) {
        origTransform = stage.style.transform;
        stage.style.transform = 'none';
    }

    setTimeout(() => {
        try {
            window.focus();
            window.print();
        } catch (err) {
            console.error('Print Error:', err);
            alert('لطفاً کلید میانبر Ctrl + P (یا Cmd + P) را جهت ذخیره PDF انتخاب کنید.');
        } finally {
            if (stage && origTransform) {
                stage.style.transform = origTransform;
            }
            document.body.classList.remove('print-with-notes');
        }
    }, 100);
}

/**
 * 2. High-DPI 16:9 Proportional Rasterizer (No Stretch, High Sharpness)
 */
async function exportToPdfRaster() {
    closePdfOptions();

    const includeNotes = document.getElementById('includeNotes')?.checked ?? false;
    const loading = document.getElementById('pdf-loading');
    const progress = document.getElementById('pdf-progress');

    if (loading) loading.classList.remove('pdf-loading-hidden');
    if (progress) progress.textContent = 'شروع ساخت PDF شفاف (0%)';
    document.body.classList.add('pdf-exporting');

    let isAborted = false;
    const timeoutHandle = setTimeout(() => {
        isAborted = true;
        if (loading) loading.classList.add('pdf-loading-hidden');
        document.body.classList.remove('pdf-exporting');
        alert('زمان پردازش طولانی شد. پیشنهاد می‌شود از دکمه «چاپ مستقیم (برداری/سریع)» استفاده فرمایید.');
    }, 1200000);

    try {
        if (!window.jspdf || !window.html2canvas) {
            throw new Error('کتابخانه‌های jsPDF یا html2canvas در دسترس نیستند.');
        }

        const { jsPDF } = window.jspdf;
        // Landscape A4 Page: 297mm x 210mm
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
        const a4W = 297;
        const a4H = 210;

        // Strict 16:9 Aspect Calculation:
        // Height for 297mm width at 16:9 is 297 / (16/9) = 167.0625mm
        const slideW = a4W;
        const slideH = (a4W * 9) / 16; // 167.0625mm
        const offsetY = (a4H - slideH) / 2; // 21.46875mm top/bottom margin for clean centering

        const slides = Array.from(document.querySelectorAll('.slide'));
        const stage = document.getElementById('stage');
        const origTransform = stage ? stage.style.transform : '';

        if (stage) stage.style.transform = 'none';

        for (let i = 0; i < slides.length; i++) {
            if (isAborted) break;

            const slide = slides[i];
            slides.forEach(s => {
                s.style.display = 'none';
                s.classList.remove('active');
            });
            slide.style.display = 'flex';
            slide.classList.add('active');

            const notes = slide.querySelector('.presenter-notes');
            if (notes && !includeNotes) {
                notes.style.display = 'none';
            }

            await new Promise(r => setTimeout(r, 20));

            // scale: 1.5 provides high DPI sharpness without killing browser memory
            const canvas = await window.html2canvas(slide, {
                width: 1920,
                height: 1080,
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#FAF7EE',
                logging: false,
                imageTimeout: 0
            });

            if (i > 0) pdf.addPage('a4', 'landscape');

            // High-quality JPEG 0.95 (crisp text, no compression blur)
            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            // Exactly placed with letterboxing to prevent ANY vertical stretching
            pdf.addImage(imgData, 'JPEG', 0, offsetY, slideW, slideH, undefined, 'FAST');

            if (notes) notes.style.display = '';

            const pct = Math.round(((i + 1) / slides.length) * 100);
            if (progress) progress.textContent = `${pct}٪ (${i + 1} از ${slides.length})`;
        }

        clearTimeout(timeoutHandle);

        if (!isAborted) {
            pdf.save('Defense_Presentation_Ezafe_Razavi.pdf');
        }

        if (stage) stage.style.transform = origTransform;
        if (typeof updateUI === 'function') updateUI();

    } catch (err) {
        clearTimeout(timeoutHandle);
        console.error('PDF Export Error:', err);
        alert('خطا در صدور فایل: ' + err.message);
    } finally {
        document.body.classList.remove('pdf-exporting');
        if (loading) loading.classList.add('pdf-loading-hidden');
    }
}

window.exportToPdf = printDeckToPdf;
window.printDeckToPdf = printDeckToPdf;
window.exportToPdfRaster = exportToPdfRaster;
window.openPdfOptions = openPdfOptions;
window.closePdfOptions = closePdfOptions;