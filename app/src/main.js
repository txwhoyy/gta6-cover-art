// Vice Panels editor: wires the page controls to the poster renderer.
// Photos are read locally with object URLs and never leave the machine.
// A ?shot= query builds a fixed scene for screenshots instead (./shots.js).
import { drawCover, panelAt, LAYOUTS, GRADES, TITLE_STYLES } from './cover.js';
import { runShot } from './shots.js';

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const stripEl = document.getElementById('photo-strip');
const zoomEl = document.getElementById('zoom');
const panelLabel = document.getElementById('panel-label');

const state = {
  layout: 'diagonal',
  grade: 'sunset',
  titleStyle: 'classic',
  title: 'Vice Heat',
  subtitle: 'Leonida Nights',
  tagline: 'One city · One score',
  size: '1080x1080',
  photos: [], // [{ img, name }]
  panels: [],
  selected: 0,
};

function freshPanel(photoIndex) {
  return { photoIndex, panX: 0, panY: 0, zoom: 1 };
}

function syncPanelCount() {
  const count = LAYOUTS[state.layout].panels(1, 1).length;
  while (state.panels.length < count) {
    const next = state.photos.length ? state.panels.length % state.photos.length : -1;
    state.panels.push(freshPanel(next));
  }
  state.panels.length = count;
  if (state.selected >= count) state.selected = 0;
}

function renderState(forExport = false) {
  return {
    layout: state.layout,
    grade: state.grade,
    titleStyle: state.titleStyle,
    highlight: forExport || state.shotMode ? null : state.selected,
    title: state.title,
    subtitle: state.subtitle,
    tagline: state.tagline,
    panels: state.panels.map((p) => ({
      photo: p.photoIndex >= 0 && state.photos[p.photoIndex] ? state.photos[p.photoIndex].img : null,
      panX: p.panX,
      panY: p.panY,
      zoom: p.zoom,
    })),
  };
}

function redraw() {
  syncPanelCount();
  const [w, h] = SIZES[state.size];
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas, renderState());
  canvas.style.aspectRatio = `${w} / ${h}`;
  panelLabel.textContent = `Panel ${state.selected + 1} of ${state.panels.length}`;
  zoomEl.value = String(state.panels[state.selected]?.zoom ?? 1);
  markActiveButtons();
  renderStrip();
}

function markActiveButtons() {
  for (const btn of document.querySelectorAll('[data-layout]')) {
    btn.classList.toggle('active', btn.dataset.layout === state.layout);
  }
  for (const btn of document.querySelectorAll('[data-grade]')) {
    btn.classList.toggle('active', btn.dataset.grade === state.grade);
  }
  for (const btn of document.querySelectorAll('[data-size]')) {
    btn.classList.toggle('active', btn.dataset.size === state.size);
  }
  for (const btn of document.querySelectorAll('[data-tstyle]')) {
    btn.classList.toggle('active', btn.dataset.tstyle === state.titleStyle);
  }
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhotoFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(file));
    state.photos.push({ img, name: file.name });
  }
  assignPhotosRoundRobin();
  statusEl.textContent = `${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} loaded — drag a panel to reposition it.`;
  redraw();
}

function assignPhotosRoundRobin() {
  if (!state.photos.length) return;
  state.panels.forEach((p, i) => { p.photoIndex = i % state.photos.length; });
}

function renderStrip() {
  stripEl.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = `${photo.name} — click to put in panel ${state.selected + 1}`;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    btn.appendChild(img);
    btn.addEventListener('click', () => {
      state.panels[state.selected].photoIndex = i;
      redraw();
    });
    stripEl.appendChild(btn);
  });
  const hint = document.createElement('span');
  hint.className = 'strip-hint';
  hint.textContent = state.photos.length
    ? `Click a photo to fill panel ${state.selected + 1}`
    : 'Try the two demo photos, or drop your own above.';
  stripEl.appendChild(hint);
}

// --- Controls -------------------------------------------------------------
document.getElementById('photo-input').addEventListener('change', (e) => {
  addPhotoFiles([...e.target.files]);
  e.target.value = '';
});
const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('over');
  addPhotoFiles([...e.dataTransfer.files]);
});
dropZone.addEventListener('click', () => document.getElementById('photo-input').click());

for (const btn of document.querySelectorAll('[data-sample]')) {
  btn.addEventListener('click', async () => {
    const img = await loadImage(`samples/${btn.dataset.sample}.jpg`);
    state.photos.push({ img, name: `${btn.dataset.sample} (demo)` });
    assignPhotosRoundRobin();
    statusEl.textContent = 'Demo photo loaded. Add your own any time — nothing is uploaded.';
    redraw();
  });
}
for (const btn of document.querySelectorAll('[data-layout]')) {
  btn.addEventListener('click', () => { state.layout = btn.dataset.layout; state.selected = 0; redraw(); });
}
for (const btn of document.querySelectorAll('[data-grade]')) {
  btn.addEventListener('click', () => { state.grade = btn.dataset.grade; redraw(); });
}
for (const btn of document.querySelectorAll('[data-tstyle]')) {
  btn.addEventListener('click', () => { state.titleStyle = btn.dataset.tstyle; redraw(); });
}
for (const btn of document.querySelectorAll('[data-size]')) {
  btn.addEventListener('click', () => { state.size = btn.dataset.size; redraw(); });
}
for (const [id, key] of [['title-input', 'title'], ['sub-input', 'subtitle'], ['tag-input', 'tagline']]) {
  document.getElementById(id).addEventListener('input', (e) => { state[key] = e.target.value; redraw(); });
}
zoomEl.addEventListener('input', () => {
  const panel = state.panels[state.selected];
  if (panel) { panel.zoom = Number(zoomEl.value); redraw(); }
});
document.getElementById('center-btn').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  if (panel) { panel.panX = 0; panel.panY = 0; panel.zoom = 1; redraw(); }
});
document.getElementById('shuffle-btn').addEventListener('click', () => {
  if (state.photos.length < 2) return;
  state.panels.forEach((p) => { p.photoIndex = Math.floor(Math.random() * state.photos.length); });
  redraw();
});

// Drag on the canvas: pick the panel under the pointer and pan its photo.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const ux = (e.clientX - rect.left) / rect.width;
  const uy = (e.clientY - rect.top) / rect.height;
  const idx = panelAt(state.layout, ux, uy);
  if (idx < 0) return;
  state.selected = idx;
  drag = { x: e.clientX, y: e.clientY, panX: state.panels[idx].panX, panY: state.panels[idx].panY, rect };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const panel = state.panels[state.selected];
  const clamp = (v) => Math.max(-1, Math.min(1, v));
  panel.panX = clamp(drag.panX + ((e.clientX - drag.x) / drag.rect.width) * 2.4);
  panel.panY = clamp(drag.panY + ((e.clientY - drag.y) / drag.rect.height) * 2.4);
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.07 : 0.93)));
  redraw();
}, { passive: false });

document.getElementById('export-btn').addEventListener('click', () => {
  // Re-render without the editor's selection outline so exports stay clean.
  drawCover(canvas, renderState(true));
  canvas.toBlob((blob) => {
    redraw();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    statusEl.textContent = `Saved vice-panels-${state.size}.png — post it anywhere.`;
  }, 'image/png');
});

// --- Screenshot scenes ------------------------------------------------------
const api = {
  async loadSample(name) { return loadImage(`samples/${name}.jpg`); },
  applyScene(scene) {
    state.shotMode = true;
    state.photos = scene.images.map((img, i) => ({ img, name: `sample ${i + 1}` }));
    state.layout = LAYOUTS[scene.layout] ? scene.layout : 'diagonal';
    state.grade = GRADES[scene.grade] ? scene.grade : 'sunset';
    state.titleStyle = TITLE_STYLES[scene.titleStyle] ? scene.titleStyle : 'classic';
    state.title = scene.title;
    state.subtitle = scene.subtitle;
    state.tagline = scene.tagline;
    if (SIZES[scene.size]) state.size = scene.size;
    syncPanelCount();
    assignPhotosRoundRobin();
    document.getElementById('title-input').value = state.title;
    document.getElementById('sub-input').value = state.subtitle;
    document.getElementById('tag-input').value = state.tagline;
    redraw();
  },
};

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), api);
} else {
  // Open with both demo photos already placed so the first paint is a cover.
  (async () => {
    const boulevard = await loadImage('samples/boulevard.jpg');
    const pier = await loadImage('samples/pier.jpg');
    state.photos = [
      { img: boulevard, name: 'boulevard (demo)' },
      { img: pier, name: 'pier (demo)' },
    ];
    syncPanelCount();
    assignPhotosRoundRobin();
    redraw();
  })();
}
