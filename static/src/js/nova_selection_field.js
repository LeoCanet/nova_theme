/** @odoo-module **/

/**
 * Theme Nova — Custom Selection Field
 * Replaces the native <select> with a styled dropdown matching the Nova theme.
 */

import { SelectionField } from "@web/views/fields/selection/selection_field";
import { registry } from "@web/core/registry";

const { useState, useRef, useEffect } = owl;

export class NovaSelectionField extends SelectionField {
    setup() {
        super.setup();
        this.state = useState({ isOpen: false });
        this.containerRef = useRef("container");

        this._onClickAway = this._onClickAway.bind(this);
        useEffect(
            () => {
                document.addEventListener("pointerdown", this._onClickAway, true);
                return () => {
                    document.removeEventListener("pointerdown", this._onClickAway, true);
                };
            },
            () => []
        );
    }

    _onClickAway(ev) {
        if (this.containerRef.el && !this.containerRef.el.contains(ev.target)) {
            this.state.isOpen = false;
        }
    }

    get currentLabel() {
        if (this.props.value === false) {
            return this.props.placeholder || "";
        }
        const opt = this.options.find(([v]) => v === this.props.value);
        return opt ? opt[1] : "";
    }

    get isEmpty() {
        return this.props.value === false;
    }

    toggleDropdown() {
        this.state.isOpen = !this.state.isOpen;
    }

    selectOption(value) {
        switch (this.props.type) {
            case "many2one":
                if (value === false) {
                    this.props.update(false);
                } else {
                    this.props.update(
                        this.options.find((option) => option[0] === value)
                    );
                }
                break;
            case "selection":
                this.props.update(value);
                break;
        }
        this.state.isOpen = false;
    }
}

NovaSelectionField.template = "nova_theme.SelectionField";

registry.category("fields").add("selection", NovaSelectionField, { force: true });
