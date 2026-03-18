/** @odoo-module **/

/**
 * Theme Nova — Patch CustomFilterItem & CustomGroupByItem to use NovaFilterSelect
 */

import { CustomFilterItem } from "@web/search/filter_menu/custom_filter_item";
import { CustomGroupByItem } from "@web/search/group_by_menu/custom_group_by_item";
import { NovaFilterSelect } from "./nova_custom_filter_select";

// Register NovaFilterSelect as a sub-component of CustomFilterItem
const filterComponents = CustomFilterItem.components || {};
CustomFilterItem.components = {
    ...filterComponents,
    NovaFilterSelect,
};

// Register NovaFilterSelect as a sub-component of CustomGroupByItem
const groupComponents = CustomGroupByItem.components || {};
CustomGroupByItem.components = {
    ...groupComponents,
    NovaFilterSelect,
};

// Patch CustomGroupByItem to handle NovaFilterSelect selection
const originalSetup = CustomGroupByItem.prototype.setup;
CustomGroupByItem.prototype.setup = function () {
    originalSetup.call(this);
    this.onFieldSelect = (index) => {
        this.state.fieldName = this.props.fields[index].name;
    };
};
