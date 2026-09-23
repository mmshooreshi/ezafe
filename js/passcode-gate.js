// ==========================================================================
// 🔒 Loop-Free Administrative Gatekeeper (5x Enter + 6519)
// ==========================================================================
(function() {
    'use strict';

    const SECRET_CODE = "6519";
    const STORAGE_KEY = "presbuilder_admin_authorized";
    let enterCount = 0;
    let lastEnterTime = 0;

    function applyAdminState(isUnlocked) {
        if (isUnlocked) {
            document.body.classList.add('admin-unlocked');
            document.body.setAttribute('data-role', 'admin');
            if (typeof window.setRole === 'function') {
                window.setRole('admin');
            }
        } else {
            document.body.classList.remove('admin-unlocked');
            document.body.setAttribute('data-role', 'audience');
            if (typeof window.setRole === 'function') {
                window.setRole('audience');
            }
            if (window.EditorState) {
                window.EditorState.isEditMode = false;
            }
            if (typeof window.toggleEditMode === 'function') {
                window.toggleEditMode(false);
            }
        }
        if (typeof window.updateToolbarUI === 'function') window.updateToolbarUI();
    }

    function checkAuthOnLoad() {
        try {
            const authorized = localStorage.getItem(STORAGE_KEY) === "true";
            applyAdminState(authorized);
        } catch (e) {
            applyAdminState(false);
        }
    }

    window.openPasscodeModal = function() {
        const modal = document.getElementById('passcode-modal');
        if (modal) {
            modal.classList.remove('passcode-modal-hidden');
            const input = document.getElementById('passcode-input');
            if (input) {
                input.value = "";
                setTimeout(() => input.focus(), 50);
            }
        }
    };

    window.closePasscodeModal = function() {
        const modal = document.getElementById('passcode-modal');
        if (modal) modal.classList.add('passcode-modal-hidden');
        enterCount = 0;
    };

    window.handlePasscodeSubmit = function(e) {
        if (e) e.preventDefault();
        const input = document.getElementById('passcode-input');
        const err = document.getElementById('passcode-error');
        if (!input) return;

        if (input.value.trim() === SECRET_CODE) {
            if (err) err.classList.add('passcode-error-hidden');
            localStorage.setItem(STORAGE_KEY, "true");
            applyAdminState(true);
            closePasscodeModal();
            console.log("🔓 [Security] Admin features unlocked.");
        } else {
            if (err) {
                err.classList.remove('passcode-error-hidden');
                err.textContent = "کد عبور نادرست است!";
            }
            input.value = "";
            input.focus();
        }
    };

    // Strict Lock Mode without location.reload()
    window.lockAdminMode = function() {
        localStorage.removeItem(STORAGE_KEY);
        applyAdminState(false);
        console.log("🔒 [Security] Admin locked.");
    };

    // 5x Enter Keypress Monitor
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const target = e.target;
            const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
            if (isTyping && target.id !== 'passcode-input') return;

            const now = Date.now();
            if (now - lastEnterTime < 1000) {
                enterCount++;
            } else {
                enterCount = 1;
            }
            lastEnterTime = now;

            if (enterCount >= 5) {
                e.preventDefault();
                openPasscodeModal();
            }
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuthOnLoad);
    } else {
        checkAuthOnLoad();
    }
})();
