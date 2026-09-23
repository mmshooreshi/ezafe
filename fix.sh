#!/usr/bin/env bash
# ==============================================================================
# 🎯 Script: fix_thesis_slides.sh
# توضیحات: اصلاح جراحی و دقیق اسلایدهای ارائه بر اساس متن و جداول رسمی رساله
# ==============================================================================

set -e

echo "🚀 در حال اعمال اصلاحات دقیق بر روی فایل‌های HTML اسلایدها..."

# ۱. اصلاح اسلاید 15: تصحیح آستانه تصمیم‌گیری به 0.65
if [ -f "15-approach-edge-formulation.html" ]; then
    sed -i 's/\\tau = 0.52/\\tau = 0.65/g' 15-approach-edge-formulation.html
    sed -i 's/آستانه کالیبره‌شده.*۰٫۵۲/آستانه کالیبره‌شده ۰٫۶۵/g' 15-approach-edge-formulation.html
    echo "✅ اسلاید 15 (آستانه تصمیم‌گیری 0.65) اصلاح شد."
fi

# ۲. اصلاح اسلاید 21: تصحیح مقادیر آستانه و F1 در متن
if [ -f "21-threshold-tuning-calibration.html" ]; then
    sed -i 's/\\tau = 0.52/\\tau = 0.65/g' 21-threshold-tuning-calibration.html
    echo "✅ اسلاید 21 (کالیبراسیون آستانه) اصلاح شد."
fi

# ۳. اصلاح اسلاید 23: تصحیح مقادیر WHA و CCA طبق جدول 4-9
if [ -f "23-structural-innovation-wha-cca.html" ]; then
    sed -i 's/۹۶٫۲۴٪/۹۴٫۵۱٪/g' 23-structural-innovation-wha-cca.html
    echo "✅ اسلاید 23 (مقادیر WHA و CCA) اصلاح شد."
fi

echo "✨ تمامی اصلاحات با موفقیت بر روی فایل‌های اسلاید اعمال گردید."