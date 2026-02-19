/** @odoo-module **/

import { WebClient } from "@web/webclient/webclient";
import { patch } from "@web/core/utils/patch";

/**
 * Patch the WebClient to:
 * 1. Remove the skeleton loading screen with a smooth two-phase transition
 * 2. Override jQuery BlockUI to use Nova's glassmorphism spinner
 */
patch(WebClient.prototype, "nova_theme.WebClientLoading", {
    setup() {
        this._super(...arguments);
        const { onMounted } = owl;
        onMounted(() => {
            this._novaRemoveSkeleton();
            this._novaOverrideBlockUI();
        });
    },

    _novaRemoveSkeleton() {
        const skeleton = document.getElementById("nova-skeleton");
        if (!skeleton) return;

        // Phase 1: Stop shimmer animation (freeze skeleton in place)
        skeleton.classList.add("nova-skeleton--ready");

        // Phase 2: After a micro-delay (let OWL paint underneath), fade out
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                skeleton.classList.add("nova-skeleton--hidden");

                // Remove from DOM after CSS transition ends
                skeleton.addEventListener("transitionend", () => {
                    skeleton.remove();
                }, { once: true });

                // Safety fallback
                setTimeout(() => {
                    if (skeleton.parentNode) {
                        skeleton.remove();
                    }
                }, 400);
            });
        });
    },

    _novaOverrideBlockUI() {
        // Override BlockUI message to use Nova spinner
        if ($.blockUI) {
            $.blockUI.defaults.message =
                '<div class="nova-blockui">' +
                    '<div class="nova-blockui__spinner"></div>' +
                    '<span class="nova-blockui__text">Chargement en cours\u2026</span>' +
                '</div>';
            $.blockUI.defaults.css = {
                border: 'none',
                padding: '0',
                backgroundColor: 'transparent',
                cursor: 'wait',
            };
            $.blockUI.defaults.overlayCSS = {
                backgroundColor: 'transparent',
                cursor: 'wait',
            };
        }
    },
});
