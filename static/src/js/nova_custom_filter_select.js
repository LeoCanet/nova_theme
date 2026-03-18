/** @odoo-module **/

/**
 * Theme Nova — Custom Filter Select
 * Replaces native <select> elements in the CustomFilterItem
 * with the Nova-styled dropdown (matching .nova-select).
 * Uses position:fixed so the dropdown escapes overflow:hidden parents.
 */

const { Component, useState, useRef, useEffect } = owl;

export class NovaFilterSelect extends Component {
    setup() {
        this.state = useState({ isOpen: false, style: "" });
        this.containerRef = useRef("container");
        this.triggerRef = useRef("trigger");

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
        const container = this.containerRef.el;
        if (!container) return;
        // Also check if click is inside the portal dropdown
        const dropdown = document.querySelector(".nova-filter-select-portal");
        if (container.contains(ev.target)) return;
        if (dropdown && dropdown.contains(ev.target)) return;
        this.state.isOpen = false;
    }

    get currentLabel() {
        const opt = this.props.options.find((o) => o.selected);
        return opt ? opt.label : "";
    }

    toggleDropdown() {
        if (!this.state.isOpen) {
            // Calculate position from the trigger
            const trigger = this.triggerRef.el;
            if (trigger) {
                const rect = trigger.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const dropdownHeight = Math.min(260, this.props.options.length * 36 + 8);
                const openAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

                if (openAbove) {
                    this.state.style = `position:fixed; bottom:${window.innerHeight - rect.top + 4}px; left:${rect.left}px; min-width:${rect.width}px;`;
                } else {
                    this.state.style = `position:fixed; top:${rect.bottom + 4}px; left:${rect.left}px; min-width:${rect.width}px;`;
                }
            }
        }
        this.state.isOpen = !this.state.isOpen;
    }

    selectOption(index) {
        this.state.isOpen = false;
        this.props.onSelect(index);
    }
}

NovaFilterSelect.template = "nova_theme.NovaFilterSelect";
NovaFilterSelect.props = {
    options: Array,
    onSelect: Function,
};
