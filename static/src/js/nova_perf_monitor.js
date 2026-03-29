/** @odoo-module **/

import { Component, useState, onMounted, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { registry } from "@web/core/registry";
import { session } from "@web/session";

/**
 * Narrow no-break space (\u202F) before "ms" prevents Inter font contextual
 * alternates from rendering "ms" as the "Mme"-looking millisecond glyph.
 */
function fmtMs(val) {
    return `${val}\u202Fms`;
}

function fmtReqKb(req, kb) {
    return `${req} req \u00B7 ${kb} KB`;
}

/** Shorten a URL to just the pathname (e.g. "/web/dataset/call_kw") */
function shortUrl(url) {
    try {
        const u = new URL(url, window.location.origin);
        return u.pathname;
    } catch {
        return url;
    }
}

// ── Module-level singleton guards for monkey-patches ────────────────────────
// Prevents corruption when OWL re-mounts the component (hot reload, etc.)

let _networkPatched = false;
let _networkOrigXHROpen = null;
let _networkOrigXHRSend = null;
let _networkOrigFetch = null;
let _activeMonitor = null; // reference to the active component instance
const _requestLog = [];    // shared across mounts — module-level

const ACTION_ORIG_KEY = Symbol("novaPerfOrigDoAction");

// Monotonic ID counter for history entries (stable t-key)
let _navIdCounter = 0;

export class NovaPerfMonitor extends Component {
    setup() {
        this.actionService = useService("action");

        this.state = useState({
            open: false,
            fps: 0,
            domNodes: 0,
            heapMB: null,
            cls: 0,
            lastNavDisplay: null,
            lastNavDetail: null,
            lastNavMs: null,
            lastNavRequests: null,
            recording: false,
            recordingEntries: [],
            history: [],
            expandedEntry: null,
        });

        this._navStartTime = null;
        this._navPending = false;
        this._responseBytes = 0;

        this._clsValue = 0;
        this._clsObserver = null;

        this._rafId = null;
        this._lastFrameTime = 0;
        this._frameCount = 0;
        this._fpsInterval = null;
        this._pollInterval = null;

        this._onUiUpdated = () => this._onNavigationEnd();

        onMounted(() => {
            _activeMonitor = this;
            this._patchNetwork();
            this._patchActionService();
            this._setupCLSObserver();
            this.env.bus.addEventListener("ACTION_MANAGER:UI-UPDATED", this._onUiUpdated);
        });

        onWillUnmount(() => {
            this.env.bus.removeEventListener("ACTION_MANAGER:UI-UPDATED", this._onUiUpdated);
            this._stopMetricsLoop();
            this._unpatchNetwork();
            this._unpatchActionService();
            if (this._clsObserver) {
                this._clsObserver.disconnect();
            }
            if (_activeMonitor === this) {
                _activeMonitor = null;
            }
        });
    }

    // ── Action service patch (singleton-safe via Symbol key) ────────────

    _patchActionService() {
        const svc = this.actionService;
        if (svc[ACTION_ORIG_KEY]) return; // already patched
        svc[ACTION_ORIG_KEY] = svc.doAction;
        const self = this;
        svc.doAction = function (...args) {
            if (_activeMonitor) {
                _activeMonitor._onNavigationStart();
            }
            return svc[ACTION_ORIG_KEY].apply(svc, args);
        };
    }

    _unpatchActionService() {
        const svc = this.actionService;
        if (svc[ACTION_ORIG_KEY]) {
            svc.doAction = svc[ACTION_ORIG_KEY];
            delete svc[ACTION_ORIG_KEY];
        }
    }

    // ── Network monkey-patching (singleton-safe) ────────────────────────

    _patchNetwork() {
        if (_networkPatched) return; // already patched at module level
        _networkPatched = true;

        _networkOrigXHROpen = XMLHttpRequest.prototype.open;
        _networkOrigXHRSend = XMLHttpRequest.prototype.send;
        _networkOrigFetch = window.fetch;

        XMLHttpRequest.prototype.open = function (method, url) {
            this._novaPerfMonitored = true;
            this._novaMethod = (method || "GET").toUpperCase();
            this._novaUrl = url;
            return _networkOrigXHROpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function () {
            if (this._novaPerfMonitored) {
                const startTime = performance.now();
                const reqUrl = this._novaUrl;
                const reqMethod = this._novaMethod;

                this.addEventListener("loadend", function () {
                    const duration = Math.round(performance.now() - startTime);
                    let bytes = 0;
                    try {
                        const len = this.getResponseHeader("content-length");
                        if (len) {
                            bytes = parseInt(len, 10);
                        } else if (this.response) {
                            const r = this.response;
                            if (typeof r === "string") bytes = r.length;
                            else if (r instanceof ArrayBuffer) bytes = r.byteLength;
                        }
                    } catch { /* ignore */ }
                    _requestLog.push({
                        url: shortUrl(reqUrl),
                        method: reqMethod,
                        startedAt: startTime,
                        duration,
                        durationDisplay: fmtMs(duration),
                        bytes,
                        status: this.status,
                    });
                });
            }
            return _networkOrigXHRSend.apply(this, arguments);
        };

        window.fetch = function (input, init) {
            const startTime = performance.now();
            const reqUrl = typeof input === "string" ? input : (input.url || "");
            const reqMethod = ((init && init.method) || "GET").toUpperCase();

            return _networkOrigFetch.apply(window, arguments).then((response) => {
                const duration = Math.round(performance.now() - startTime);
                let bytes = 0;
                try {
                    const len = response.headers.get("content-length");
                    if (len) bytes = parseInt(len, 10);
                } catch { /* ignore */ }
                _requestLog.push({
                    url: shortUrl(reqUrl),
                    method: reqMethod,
                    startedAt: startTime,
                    duration,
                    durationDisplay: fmtMs(duration),
                    bytes,
                    status: response.status,
                });
                return response;
            }).catch((err) => {
                const duration = Math.round(performance.now() - startTime);
                _requestLog.push({
                    url: shortUrl(reqUrl),
                    method: reqMethod,
                    startedAt: startTime,
                    duration,
                    durationDisplay: fmtMs(duration),
                    bytes: 0,
                    status: 0,
                });
                throw err;
            });
        };
    }

    _unpatchNetwork() {
        if (!_networkPatched) return;
        _networkPatched = false;
        if (_networkOrigXHROpen) XMLHttpRequest.prototype.open = _networkOrigXHROpen;
        if (_networkOrigXHRSend) XMLHttpRequest.prototype.send = _networkOrigXHRSend;
        if (_networkOrigFetch) window.fetch = _networkOrigFetch;
    }

    // ── CLS observer ────────────────────────────────────────────────────

    _setupCLSObserver() {
        try {
            this._clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput && typeof entry.value === "number" && isFinite(entry.value)) {
                        this._clsValue += entry.value;
                    }
                }
                const rounded = Math.round(this._clsValue * 1000) / 1000;
                this.state.cls = isFinite(rounded) ? rounded : 0;
            });
            this._clsObserver.observe({ type: "layout-shift", buffered: true });
        } catch {
            this._clsObserver = null;
        }
    }

    // ── Navigation timing ───────────────────────────────────────────────

    _onNavigationStart() {
        this._navStartTime = performance.now();
        this._navPending = true;
    }

    _onNavigationEnd() {
        if (!this._navPending || this._navStartTime === null) return;

        const ms = Math.round(performance.now() - this._navStartTime);
        if (ms > 15000) {
            this._navPending = false;
            this._navStartTime = null;
            return;
        }

        const navStart = this._navStartTime;
        const navRequests = _requestLog
            .filter((r) => r.startedAt >= navStart)
            .map((r) => ({
                ...r,
                offset: Math.round(r.startedAt - navStart),
                offsetDisplay: `+${fmtMs(Math.round(r.startedAt - navStart))}`,
            }));
        const totalBytes = navRequests.reduce((sum, r) => sum + r.bytes, 0);
        const kb = Math.round(totalBytes / 1024);

        this.state.lastNavMs = ms;
        this.state.lastNavDisplay = fmtMs(ms);
        this.state.lastNavDetail = fmtReqKb(navRequests.length, kb);
        this.state.lastNavRequests = navRequests;

        const entry = {
            id: `nav-${++_navIdCounter}`,
            timestamp: new Date().toLocaleTimeString(),
            ms,
            msDisplay: fmtMs(ms),
            detailDisplay: `${navRequests.length} req / ${kb} KB`,
            requests: navRequests.length,
            kb,
            requestDetails: navRequests,
        };

        this.state.history = [entry, ...this.state.history].slice(0, 20);
        this.state.expandedEntry = null;

        if (this.state.recording) {
            this.state.recordingEntries = [...this.state.recordingEntries, entry];
        }

        this._navPending = false;
        this._navStartTime = null;

        // Trim log to avoid unbounded growth
        if (_requestLog.length > 500) {
            _requestLog.splice(0, _requestLog.length - 250);
        }
    }

    // ── Metrics loop (only when panel open) ─────────────────────────────

    _startMetricsLoop() {
        this._frameCount = 0;
        this._lastFrameTime = performance.now();

        const rafLoop = () => {
            this._frameCount++;
            this._rafId = requestAnimationFrame(rafLoop);
        };
        this._rafId = requestAnimationFrame(rafLoop);

        this._fpsInterval = setInterval(() => {
            const now = performance.now();
            const elapsed = now - this._lastFrameTime;
            this.state.fps = Math.round((this._frameCount * 1000) / elapsed);
            this._frameCount = 0;
            this._lastFrameTime = now;
        }, 1000);

        this._pollInterval = setInterval(() => {
            this.state.domNodes = document.querySelectorAll("*").length;
            if (performance.memory) {
                this.state.heapMB = Math.round(
                    performance.memory.usedJSHeapSize / (1024 * 1024)
                );
            }
        }, 2000);

        this.state.domNodes = document.querySelectorAll("*").length;
        if (performance.memory) {
            this.state.heapMB = Math.round(
                performance.memory.usedJSHeapSize / (1024 * 1024)
            );
        }
    }

    _stopMetricsLoop() {
        if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
        if (this._fpsInterval) { clearInterval(this._fpsInterval); this._fpsInterval = null; }
        if (this._pollInterval) { clearInterval(this._pollInterval); this._pollInterval = null; }
    }

    // ── UI actions ──────────────────────────────────────────────────────

    togglePanel() {
        this.state.open = !this.state.open;
        if (this.state.open) {
            this._startMetricsLoop();
        } else {
            this._stopMetricsLoop();
        }
    }

    clearHistory() {
        this.state.history = [];
        this.state.expandedEntry = null;
    }

    toggleRequestDetail(key) {
        this.state.expandedEntry = this.state.expandedEntry === key ? null : key;
    }

    startRecording() {
        this.state.recording = true;
        this.state.recordingEntries = [];
    }

    stopRecording() {
        this.state.recording = false;
    }

    exportJSON() {
        const data = {
            exportedAt: new Date().toISOString(),
            userAgent: navigator.userAgent,
            entries: this.state.recordingEntries,
            summary: this._computeSummary(this.state.recordingEntries),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nova-perf-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    _computeSummary(entries) {
        if (!entries.length) return null;
        const msArr = entries.map((e) => e.ms);
        const reqArr = entries.map((e) => e.requests);
        const kbArr = entries.map((e) => e.kb);
        const sorted = [...msArr].sort((a, b) => a - b);
        const p90Index = Math.min(Math.ceil(sorted.length * 0.9) - 1, sorted.length - 1);
        return {
            count: entries.length,
            avgMs: Math.round(msArr.reduce((a, b) => a + b, 0) / msArr.length),
            minMs: Math.min(...msArr),
            maxMs: Math.max(...msArr),
            p90Ms: sorted[p90Index],
            avgRequests: Math.round(reqArr.reduce((a, b) => a + b, 0) / reqArr.length),
            avgKB: Math.round(kbArr.reduce((a, b) => a + b, 0) / kbArr.length),
        };
    }

    // ── Template helpers ────────────────────────────────────────────────

    get navColor() {
        if (this.state.lastNavMs === null) return "";
        if (this.state.lastNavMs < 500) return "nova-perf-good";
        if (this.state.lastNavMs < 1500) return "nova-perf-ok";
        return "nova-perf-bad";
    }

    get fpsColor() {
        if (this.state.fps >= 50) return "nova-perf-good";
        if (this.state.fps >= 30) return "nova-perf-ok";
        return "nova-perf-bad";
    }

    get heapDisplay() {
        return this.state.heapMB !== null ? `${this.state.heapMB} MB` : "N/A";
    }

    get clsColor() {
        if (this.state.cls < 0.1) return "nova-perf-good";
        if (this.state.cls < 0.25) return "nova-perf-ok";
        return "nova-perf-bad";
    }

    getRequestDetails(key) {
        if (key === "last") return this.state.lastNavRequests || [];
        const entry = this.state.history.find((e) => e.id === key);
        return entry ? entry.requestDetails || [] : [];
    }

    reqLatencyColor(duration) {
        if (duration < 200) return "nova-perf-good";
        if (duration < 500) return "nova-perf-ok";
        return "nova-perf-bad";
    }
}

NovaPerfMonitor.template = "nova_theme.PerfMonitor";
NovaPerfMonitor.props = {};

if (session.debug) {
    registry.category("systray").add("nova_theme.PerfMonitor", {
        Component: NovaPerfMonitor,
    }, { sequence: 100 });
}
