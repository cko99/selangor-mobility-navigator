import { relativeAge } from './utils/dateTime.js';
import { statusLabel } from './utils/dataFreshness.js';
import { escapeHtml } from './utils/escape.js';

export function toast(message, icon = 'info') {
  const host = document.getElementById('toastWrap'); if (!host) return;
  const node = document.createElement('div'); node.className = 'toast';
  node.innerHTML = `<i data-lucide="${escapeHtml(icon)}" style="width:16px;height:16px;color:var(--accent)"></i><span>${escapeHtml(message)}</span>`;
  host.append(node); window.lucide?.createIcons();
  setTimeout(() => node.remove(), 3600);
}

export function sourceMeta(meta) {
  if (!meta) return '<div class="source-meta">Source unavailable · Status: Offline</div>';
  return `<div class="source-meta">Source: ${escapeHtml(meta.source)} · ${escapeHtml(statusLabel(meta.status))}<br>Updated: ${escapeHtml(relativeAge(meta.sourceUpdatedAt || meta.fetchedAt))}${meta.isStale ? ' · Stale' : ''}</div>`;
}

export function badge(status) { return `<span class="pill ${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>`; }

export function setText(selector, text) { const node = document.querySelector(selector); if (node) node.textContent = text; }

export function unavailableCard(title, reason) {
  return `<div class="data-empty"><strong>${escapeHtml(title)}</strong><div style="margin-top:6px">${escapeHtml(reason)}</div>${badge('unavailable')}</div>`;
}

export function comingSoon({ title, explanation, features = [], phase = '', roadmapView = 'status' }) {
  const items = features.map(feature => `<li>${escapeHtml(feature)}</li>`).join('');
  return `<article class="card centered-card fade-in"><div class="coming-icon"><i data-lucide="construction"></i></div><div class="eyebrow">Coming Soon</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(explanation)}</p>${items ? `<ul class="planned-list">${items}</ul>` : ''}${phase ? `<div class="phase-label">Target phase · ${escapeHtml(phase)}</div>` : ''}<div class="action-row centered-actions"><button class="btn-ghost" onclick="switchView('dashboard')"><i data-lucide="arrow-left"></i>Back to Dashboard</button>${roadmapView ? `<button class="btn-primary" onclick="switchView('${escapeHtml(roadmapView)}')"><i data-lucide="milestone"></i>View Roadmap</button>` : ''}</div></article>`;
}
