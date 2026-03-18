/** @odoo-module **/

/**
 * Nova Drag-to-Scroll — click-and-drag horizontal scrolling.
 * Direct 1:1 movement, no inertia.
 *
 * Only activates on containers with meaningful horizontal overflow (> 20px).
 * Ignores interactive elements and POS page wrappers.
 */

const INTERACTIVE =
    "a, button, input, select, textarea, .btn, .dropdown-toggle, " +
    ".o_kanban_quick_add, .o_kanban_config, .product, .orderline, " +
    ".numpad, .pay-order-button, .control-button";

const MIN_OVERFLOW = 20;

const IGNORE_CONTAINERS =
    ".pos, .pos-content, .pos-rightheader, .o_action_manager, " +
    ".o_main_navbar, body, html";

let isDragging = false;
let startX = 0;
let scrollLeft = 0;
let scrollContainer = null;
let lastX = 0;
let prevX = 0;
let lastTime = 0;
let animationId = null;

function findScrollableContainer(target) {
    let el = target;
    while (el && el !== document.documentElement) {
        if (el === document.body || el.matches(IGNORE_CONTAINERS)) {
            el = el.parentElement;
            continue;
        }
        const style = window.getComputedStyle(el);
        const overflowX = style.overflowX;
        if (
            (overflowX === "auto" || overflowX === "scroll") &&
            el.scrollWidth - el.clientWidth > MIN_OVERFLOW
        ) {
            return el;
        }
        el = el.parentElement;
    }
    return null;
}

document.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(INTERACTIVE)) return;

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    const container = findScrollableContainer(e.target);
    if (!container) return;

    isDragging = true;
    scrollContainer = container;
    startX = e.pageX;
    lastX = e.pageX;
    lastTime = Date.now();
    scrollLeft = container.scrollLeft;
    container.style.userSelect = "none";
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging || !scrollContainer) return;
    e.preventDefault();

    const now = Date.now();
    prevX = lastX;
    lastX = e.pageX;
    lastTime = now;

    if (Math.abs(e.pageX - startX) > 3) {
        scrollContainer.style.cursor = "grabbing";
    }
    scrollContainer.scrollLeft = scrollLeft - (e.pageX - startX);
});

document.addEventListener("mouseup", () => {
    if (!isDragging || !scrollContainer) return;
    scrollContainer.style.cursor = "";
    scrollContainer.style.userSelect = "";
    isDragging = false;

    const container = scrollContainer;
    scrollContainer = null;

    // Subtle inertia — just a gentle glide
    const dt = Date.now() - lastTime;
    if (dt > 100) return; // finger stayed still before release, no inertia

    const v = (lastX - prevX) / Math.max(dt, 1);
    let momentum = v * 2; // very light amplification
    const MAX = 10;
    momentum = Math.max(-MAX, Math.min(MAX, momentum));

    if (Math.abs(momentum) < 0.5) return;

    function glide() {
        container.scrollLeft -= momentum;
        momentum *= 0.85; // heavy friction = stops fast
        if (Math.abs(momentum) < 0.3) {
            animationId = null;
            return;
        }
        animationId = requestAnimationFrame(glide);
    }
    animationId = requestAnimationFrame(glide);
});
