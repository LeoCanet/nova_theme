/** @odoo-module */

import { GraphRenderer } from "@web/views/graph/graph_renderer";
import { patch } from "@web/core/utils/patch";

/**
 * Patch the GraphRenderer to inject Nova-aware grid line colors.
 * We patch renderChart to modify the Chart.js config right before
 * the chart is instantiated, ensuring our colors always apply.
 */
patch(GraphRenderer.prototype, "nova_theme.GraphRenderer", {

    /**
     * @override
     */
    renderChart() {
        // Destroy previous chart if any
        if (this.chart) {
            this.chart.destroy();
        }

        const config = this.getChartConfig();
        const isDark = document.documentElement.classList.contains("nova-dark");

        const gridColor = isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.1)";
        const zeroLineColor = isDark
            ? "rgba(255, 255, 255, 0.25)"
            : "rgba(0, 0, 0, 0.2)";

        // Inject gridLines into scales
        if (config.options && config.options.scales) {
            const scales = config.options.scales;
            if (scales.xAxes) {
                for (const axis of scales.xAxes) {
                    axis.gridLines = Object.assign(axis.gridLines || {}, {
                        color: gridColor,
                        zeroLineColor: zeroLineColor,
                    });
                }
            }
            if (scales.yAxes) {
                for (const axis of scales.yAxes) {
                    axis.gridLines = Object.assign(axis.gridLines || {}, {
                        color: gridColor,
                        zeroLineColor: zeroLineColor,
                    });
                }
            }
        }

        this.chart = new Chart(this.canvasRef.el, config);
        Chart.animationService.advance();
    },
});
