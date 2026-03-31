/** @odoo-module */

import { ButtonBox } from "@web/views/form/button_box/button_box";
import { patch } from "@web/core/utils/patch";

const { onMounted, onWillUnmount, useState } = owl;

/**
 * Patch ButtonBox so it dynamically adapts the number of visible buttons
 * to the actual container width, not just the ui.size breakpoint.
 *
 * Uses a window resize listener to trigger OWL re-render via useState,
 * and overrides getMaxButtons to compute from actual sheet width.
 */

const BUTTON_MIN_WIDTH = 140;
const MORE_BUTTON_WIDTH = 75;

patch(ButtonBox.prototype, "nova_theme.ButtonBox", {
    setup() {
        this._super(...arguments);

        // Reactive counter to force re-render on resize
        this._novaResize = useState({ tick: 0 });
        this._onResize = null;

        const _origGetMaxButtons = this.getMaxButtons;

        this.getMaxButtons = () => {
            // Read tick to subscribe OWL to changes (triggers re-render)
            void this._novaResize.tick;

            const orig = _origGetMaxButtons();
            const el = document.querySelector(".nova-button-box, .o-form-buttonbox");
            if (!el) return orig;

            const sheet = el.closest(".o_form_sheet");
            const width = sheet ? sheet.clientWidth : el.clientWidth;
            if (!width) return orig;

            const totalVisible = Object.values(this.props.slots)
                .filter(s => !("isVisible" in s) || s.isVisible).length;

            let fits = Math.floor(width / BUTTON_MIN_WIDTH);
            if (fits >= totalVisible) return totalVisible;

            fits = Math.floor((width - MORE_BUTTON_WIDTH) / BUTTON_MIN_WIDTH);
            return Math.max(Math.min(fits, orig), 1);
        };

        onMounted(() => {
            this._onResize = () => {
                this._novaResize.tick++;
            };
            window.addEventListener("resize", this._onResize);
        });

        onWillUnmount(() => {
            if (this._onResize) {
                window.removeEventListener("resize", this._onResize);
                this._onResize = null;
            }
        });
    },
});
