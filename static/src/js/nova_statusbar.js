/** @odoo-module **/

/**
 * Nova Statusbar — horizontal scroll, auto-scroll to active, scroll indicators.
 *
 * The statusbar uses overflow-x with a hidden scrollbar (scrollbar-width: none).
 * Since drag-scroll ignores buttons (interactive elements), we need:
 *   1. Wheel → horizontal scroll on .o_statusbar_status
 *   2. Auto-scroll to the active state on form load
 *   3. Toggle .nova-scroll-left / .nova-scroll-right for edge fade indicators
 */

const STATUS_SEL = ".o_statusbar_status";
const ACTIVE_SEL = ".o_arrow_button_current";
const SCROLL_THRESHOLD = 2; // px tolerance for "at edge" detection

// ── 1. Wheel → horizontal scroll ──────────────────────────────────────
document.addEventListener("wheel", (e) => {
    const status = e.target.closest(STATUS_SEL);
    if (!status || status.scrollWidth <= status.clientWidth) return;
    e.preventDefault();
    status.scrollLeft += e.deltaY;
}, { passive: false });

// ── 2. Auto-scroll to active state on form load ───────────────────────
function scrollToActive() {
    const status = document.querySelector(STATUS_SEL);
    if (!status || status.scrollWidth <= status.clientWidth) return;
    const active = status.querySelector(ACTIVE_SEL);
    if (!active) return;
    // row-reverse makes offsetLeft unreliable — use visual coordinates.
    const sr = status.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    // Scroll so the active arrow is fully visible with 8px breathing room
    const delta = ar.left - sr.left - 8;
    if (delta < 0) {
        status.scrollLeft += delta;
    }
}

// ── 3. Scroll indicators ──────────────────────────────────────────────
// row-reverse: scrollLeft = 0 is rightmost, negative = scrolled left.
// "can scroll left" = scrollLeft > minScrollLeft (more negative possible)
// "can scroll right" = scrollLeft < 0 (can go back toward 0)
function updateScrollIndicators(status) {
    // Classes go on .o_field_statusbar (the non-scrolling parent) for fixed overlays
    const wrapper = status ? status.closest(".o_field_statusbar") : null;
    if (!status || !wrapper || status.scrollWidth <= status.clientWidth) {
        if (wrapper) {
            wrapper.classList.remove("nova-scroll-left", "nova-scroll-right");
        }
        return;
    }
    const minScroll = status.clientWidth - status.scrollWidth; // most negative value
    const sl = status.scrollLeft;

    wrapper.classList.toggle("nova-scroll-left", sl > minScroll + SCROLL_THRESHOLD);
    wrapper.classList.toggle("nova-scroll-right", sl < -SCROLL_THRESHOLD);
}

// Listen to scroll events on any .o_statusbar_status
document.addEventListener("scroll", (e) => {
    if (e.target.matches && e.target.matches(STATUS_SEL)) {
        updateScrollIndicators(e.target);
    }
}, true); // capture phase to catch scroll on non-window elements

// ── Observer: trigger on form load ────────────────────────────────────
let raf = null;
const observer = new MutationObserver(() => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
        raf = null;
        scrollToActive();
        updateScrollIndicators(document.querySelector(STATUS_SEL));
    });
});

function startObserver() {
    const target = document.querySelector(".o_action_manager") || document.body;
    if (target) {
        observer.observe(target, { childList: true, subtree: true });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
} else {
    startObserver();
}
