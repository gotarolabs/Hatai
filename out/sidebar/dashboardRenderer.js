"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDashboardHtml = renderDashboardHtml;
const fs = require("fs");
function parseXmlString(xml) {
    const root = { tag: 'root', attributes: {}, children: [], text: '' };
    const stack = [root];
    const tagPattern = /<(\/?)([a-zA-Z-]+)((?:\s+[a-zA-Z-]+="[^"]*")*)\s*(\/?)>/g;
    let lastIndex = 0;
    let match;
    while ((match = tagPattern.exec(xml)) !== null) {
        const textBefore = xml.substring(lastIndex, match.index).trim();
        if (textBefore && stack.length > 0) {
            stack[stack.length - 1].text += textBefore;
        }
        const isClosing = match[1] === '/';
        const tagName = match[2];
        const attrsStr = match[3];
        const isSelfClosing = match[4] === '/';
        if (isClosing) {
            if (stack.length > 1) {
                stack.pop();
            }
        }
        else {
            const attrs = {};
            const attrPattern = /([a-zA-Z-]+)="([^"]*)"/g;
            let attrMatch;
            while ((attrMatch = attrPattern.exec(attrsStr)) !== null) {
                attrs[attrMatch[1]] = attrMatch[2];
            }
            const node = {
                tag: tagName,
                attributes: attrs,
                children: [],
                text: '',
            };
            stack[stack.length - 1].children.push(node);
            if (!isSelfClosing) {
                stack.push(node);
            }
        }
        lastIndex = match.index + match[0].length;
    }
    return root.children[0] || root;
}
function findNodes(node, tag) {
    const results = [];
    if (node.tag === tag) {
        results.push(node);
    }
    for (const child of node.children) {
        results.push(...findNodes(child, tag));
    }
    return results;
}
function findNode(node, tag) {
    if (node.tag === tag) {
        return node;
    }
    for (const child of node.children) {
        const found = findNode(child, tag);
        if (found) {
            return found;
        }
    }
    return undefined;
}
function renderDashboardHtml(xmlPath, cssUri, jsUri, fontUri, nonce, data) {
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const tree = parseXmlString(xmlContent);
    const headerNode = findNode(tree, 'header');
    const titleText = headerNode ? findNode(headerNode, 'title')?.text || 'Hatai' : 'Hatai';
    const subtitleText = headerNode ? findNode(headerNode, 'subtitle')?.text || '' : '';
    const toggleNode = findNode(tree, 'toggle');
    const toggleId = toggleNode?.attributes['id'] || 'secureCopyToggle';
    const toggleDefault = toggleNode?.attributes['default'] === 'true';
    const toggleChecked = data.secureCopyEnabled ? 'checked' : '';
    const descriptionNode = findNode(tree, 'description');
    const descText = descriptionNode?.text || '';
    const metrics = findNodes(tree, 'metric');
    const metricValues = {};
    for (const m of metrics) {
        const id = m.attributes['id'];
        if (id === 'totalSecrets') {
            metricValues[id] = String(data.totalSecrets);
        }
        else if (id === 'protectedCopies') {
            metricValues[id] = String(data.protectedCopies);
        }
        else if (id === 'avgEntropy') {
            metricValues[id] = data.avgEntropy.toFixed(2);
        }
        else if (id === 'lastScanTime') {
            metricValues[id] = data.lastScanTime || 'Never';
        }
    }
    const cards = findNodes(tree, 'card');
    let statsHtml = '';
    for (const card of cards) {
        const variant = card.attributes['variant'] || '';
        const cardTitleNode = findNode(card, 'card-title');
        const metricNode = findNode(card, 'metric');
        if (!metricNode) {
            continue;
        }
        const metricId = metricNode.attributes['id'] || '';
        const metricVal = metricValues[metricId] || metricNode.text;
        const cardTitle = cardTitleNode?.text || '';
        const isSmall = metricId === 'lastScanTime' || metricId === 'avgEntropy';
        statsHtml += `
            <div class="card ${variant}">
                <div class="card-title">${escapeHtml(cardTitle)}</div>
                <div class="metric${isSmall ? ' metric-small' : ''}" id="${escapeHtml(metricId)}">${escapeHtml(metricVal)}</div>
            </div>`;
    }
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${fontUri}; style-src ${cssUri} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${cssUri}">
    <title>Hatai Dashboard</title>
</head>
<body>
    <div class="dashboard-header">
        <h1>${escapeHtml(titleText)}</h1>
        <p>${escapeHtml(subtitleText)}</p>
    </div>

    <div class="section">
        <div class="card secure-copy-card">
            <div class="secure-copy-info">
                <div class="card-title">Secure Copy Protection</div>
                <div class="description">${escapeHtml(descText)}</div>
            </div>
            <div class="toggle-container">
                <input type="checkbox" id="${escapeHtml(toggleId)}" class="toggle-input" ${toggleChecked}>
                <label for="${escapeHtml(toggleId)}" class="toggle-slider"></label>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="stats-grid">
            ${statsHtml}
        </div>
    </div>

    <div class="section">
        <div class="card dark">
            <div class="card-title">Recent Activity</div>
            <ul class="timeline" id="activityTimeline">
                <div class="empty-state">No activity yet</div>
            </ul>
        </div>
    </div>

    <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
}
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
//# sourceMappingURL=dashboardRenderer.js.map