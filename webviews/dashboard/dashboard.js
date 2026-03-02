(function () {
    const vscode = acquireVsCodeApi();

    const toggle = document.getElementById("secureCopyToggle");
    if (toggle) {
        toggle.addEventListener("change", function (e) {
            const checked = e.target.checked;
            vscode.postMessage({
                command: "toggleSecureCopy",
                value: checked
            });
        });
    }

    window.addEventListener("message", function (event) {
        const message = event.data;
        if (!message) { return; }

        if (message.command === "updateStats") {
            const data = message.data;

            const totalEl = document.getElementById("totalSecrets");
            if (totalEl) { totalEl.textContent = String(data.totalSecrets); }

            const copiesEl = document.getElementById("protectedCopies");
            if (copiesEl) { copiesEl.textContent = String(data.protectedCopies); }

            const entropyEl = document.getElementById("avgEntropy");
            if (entropyEl) { entropyEl.textContent = data.avgEntropy.toFixed(2); }

            const lastScanEl = document.getElementById("lastScanTime");
            if (lastScanEl) { lastScanEl.textContent = data.lastScanTime || "Never"; }
        }

        if (message.command === "updateTimeline") {
            const timeline = document.getElementById("activityTimeline");
            if (!timeline) { return; }

            const items = message.entries;
            if (!items || items.length === 0) {
                timeline.innerHTML = '<div class="empty-state">No activity yet</div>';
                return;
            }

            let html = "";
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const time = new Date(item.timestamp).toLocaleTimeString();
                const basename = item.fileName.split(/[\\/]/).pop() || item.fileName;
                html += '<li class="timeline-item">' +
                    '<span class="timeline-dot ' + item.action + '"></span>' +
                    '<span class="timeline-text">' + item.action + ' — ' + basename + ' (' + item.secretCount + ')</span>' +
                    '<span class="timeline-time">' + time + '</span>' +
                    '</li>';
            }
            timeline.innerHTML = html;
        }

        if (message.command === "setToggle") {
            const toggleEl = document.getElementById("secureCopyToggle");
            if (toggleEl) { toggleEl.checked = message.value; }
        }
    });

    vscode.postMessage({ command: "ready" });
})();
