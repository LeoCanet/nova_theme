/** @odoo-module **/

/**
 * Nova Drag-to-Scroll with inertia — click-and-drag horizontal scrolling
 * with smooth momentum on release.
 */

const INTERACTIVE = "a, button, input, select, textarea, .btn, .dropdown-toggle, .o_kanban_quick_add, .o_kanban_config";

let isDragging = false;
let startX = 0;
let scrollLeft = 0;
let scrollContainer = null;
let velocity = 0;
let lastX = 0;
let lastTime = 0;
let animationId = null;

document.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(INTERACTIVE)) return;

    // Cancel any ongoing inertia
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // Walk up DOM to find scrollable container
    let el = e.target;
    while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const overflowX = style.overflowX;
        if ((overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") && el.scrollWidth > el.clientWidth) {
            isDragging = true;
            scrollContainer = el;
            startX = e.pageX;
            lastX = e.pageX;
            lastTime = Date.now();
            scrollLeft = el.scrollLeft;
            velocity = 0;
            el.style.userSelect = "none";
            return;
        }
        el = el.parentElement;
    }
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging || !scrollContainer) return;
    e.preventDefault();

    const now = Date.now();
    const dt = now - lastTime;
    const dx = e.pageX - lastX;

    if (dt > 0) {
        velocity = dx / dt;
    }

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

    // Start inertia
    const container = scrollContainer;
    let v = velocity * 15; // amplify for smooth feel
    scrollContainer = null;

    function inertia() {
        if (Math.abs(v) < 0.5) {
            animationId = null;
            return;
        }
        container.scrollLeft -= v;
        v *= 0.92; // friction
        animationId = requestAnimationFrame(inertia);
    }

    animationId = requestAnimationFrame(inertia);
});
