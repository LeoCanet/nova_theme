/**
 * Nova Theme — Login Wave Effect
 *
 * Pure Canvas 2D — no dependencies.
 * Multiple directional waves at different angles create an organic
 * water-like interference pattern across the entire panel.
 */
(function () {
    "use strict";

    var canvas = document.getElementById("nova-wave-canvas");
    if (!canvas) return;

    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width, height, cols, rows;

    // ── Config ───────────────────────────────────────────────────────────────
    var SPACING = 24;
    var DOT_MIN = 0.4;
    var DOT_MAX = 1.4;
    var ALPHA_MIN = 0.05;
    var ALPHA_MAX = 0.35;
    var WAVE_AMP = 10;          // vertical displacement per wave

    // ── Directional waves — each with its own angle, speed, frequency ────────
    // angle: direction of propagation (radians)
    // freq:  spatial frequency (higher = tighter waves)
    // speed: temporal speed
    // amp:   relative amplitude (0–1)
    var waves = [
        { angle: 0.3,   freq: 0.04,  speed: 0.8,  amp: 1.0  },  // ~17° — gentle diagonal
        { angle: 2.1,   freq: 0.055, speed: 1.1,  amp: 0.7  },  // ~120° — opposing
        { angle: 4.0,   freq: 0.035, speed: 0.6,  amp: 0.85 },  // ~229° — slow broad
        { angle: 5.3,   freq: 0.065, speed: 1.4,  amp: 0.5  },  // ~304° — fast ripples
        { angle: 1.2,   freq: 0.045, speed: 0.9,  amp: 0.6  },  // ~69° — cross wave
    ];

    // Pre-compute direction vectors
    for (var i = 0; i < waves.length; i++) {
        waves[i].dx = Math.cos(waves[i].angle);
        waves[i].dy = Math.sin(waves[i].angle);
    }

    var time = 0;

    // ── Resize ───────────────────────────────────────────────────────────────
    function resize() {
        var rect = canvas.parentElement.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.ceil(width / SPACING) + 2;
        rows = Math.ceil(height / SPACING) + 4;
    }

    // ── Compute wave value at a screen position ─────────────────────────────
    function waveAt(px, py) {
        var val = 0;
        for (var i = 0; i < waves.length; i++) {
            var w = waves[i];
            // Project position onto wave direction
            var d = px * w.dx + py * w.dy;
            val += w.amp * Math.sin(d * w.freq + time * w.speed);
        }
        return val;
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function draw() {
        ctx.clearRect(0, 0, width, height);

        var offX = (width % SPACING) * 0.5;
        var offY = (height % SPACING) * 0.5;

        // Max possible wave value (sum of all amplitudes)
        var maxVal = 0;
        for (var i = 0; i < waves.length; i++) maxVal += waves[i].amp;

        for (var iy = 0; iy < rows; iy++) {
            for (var ix = 0; ix < cols; ix++) {
                var baseX = offX + ix * SPACING;
                var baseY = offY + iy * SPACING;

                // Wave value at this grid position
                var w = waveAt(baseX, baseY);

                // Vertical displacement
                var dy = (w / maxVal) * WAVE_AMP;

                // Normalize to [0, 1]
                var norm = (w / maxVal + 1) * 0.5;

                var sx = baseX;
                var sy = baseY + dy;

                if (sy < -15 || sy > height + 15) continue;

                var dotSize = DOT_MIN + (DOT_MAX - DOT_MIN) * norm;
                var alpha = ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * norm * norm;

                ctx.beginPath();
                ctx.arc(sx, sy, dotSize, 0, 6.2832);
                ctx.fillStyle = "rgba(255,255,255," + alpha.toFixed(3) + ")";
                ctx.fill();
            }
        }
    }

    // ── Loop ─────────────────────────────────────────────────────────────────
    var raf;
    function loop() {
        time += 0.015;
        draw();
        raf = requestAnimationFrame(loop);
    }

    // ── Visibility: pause when tab hidden ────────────────────────────────────
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            cancelAnimationFrame(raf);
        } else {
            raf = requestAnimationFrame(loop);
        }
    });

    // ── Init ─────────────────────────────────────────────────────────────────
    window.addEventListener("resize", resize);
    resize();
    loop();
})();
