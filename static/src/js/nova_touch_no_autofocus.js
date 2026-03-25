/** @odoo-module **/
///============================================================================
/// Theme Nova — Prevent search input autofocus on touch devices
///============================================================================
/// On tablets and phones, autofocus on search bars opens the virtual keyboard
/// immediately, which is disruptive. This script blocks programmatic focus on
/// search inputs while still allowing user-initiated taps.

const IS_TOUCH = window.matchMedia("(pointer: coarse)").matches;

if (IS_TOUCH) {
    const SELECTORS = ".o_searchview_input, .nova-launcher-search__input";

    // Track genuine user gestures (touch/click)
    let userGesture = false;

    for (const evt of ["touchstart", "mousedown", "pointerdown"]) {
        document.addEventListener(evt, (e) => {
            if (e.target && e.target.closest && e.target.closest(SELECTORS)) {
                userGesture = true;
                setTimeout(() => { userGesture = false; }, 300);
            }
        }, { capture: true, passive: true });
    }

    // Intercept focus — blur if not from a user gesture
    document.addEventListener("focusin", (ev) => {
        if (userGesture) return;
        const el = ev.target;
        if (el && el.matches && el.matches(SELECTORS)) {
            requestAnimationFrame(() => el.blur());
        }
    }, true);
}
