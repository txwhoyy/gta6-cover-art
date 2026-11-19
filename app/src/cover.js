// Poster renderer for Vice Panels: draws a multi-panel GTA-style cover onto any
// canvas 2D context. Panels are clipped shapes filled with user photos (each with
// its own pan and zoom), a colour grade washes over the whole composition, and a
// bold title block sits on top in the classic cover position.
//
// A panel is { photo, panX, panY, zoom } where photo is an image or null and the
// pan values run -1..1 (0 = centred). Layouts return panel rectangles in unit
// space (0..1) plus a slant used to shear the panel dividers.

export const LAYOUTS = {
  diagonal: {
    label: 'Diagonal Trio',
    panels(w, h) {
      // Three tall panels split by slanted dividers, like a comic splash page.
      const slant = 0.16;
      return [0, 1, 2].map((i) => ({
        poly: panelQuad(i / 3, (i + 1) / 3, slant, i === 0, i === 2),
      }));
    },
  },
  grid: {
    label: 'Grid Four',
    panels() {
      return [
        { rect: [0, 0, 0.5, 0.52] },
        { rect: [0.5, 0, 0.5, 0.52] },
        { rect: [0, 0.52, 0.5, 0.48] },
        { rect: [0.5, 0.52, 0.5, 0.48] },
      ];
    },
  },
  hero: {
    label: 'Hero + Strips',
    panels() {
      return [
        { rect: [0, 0, 1, 0.62] },
        { rect: [0, 0.62, 1 / 3, 0.38] },
        { rect: [1 / 3, 0.62, 1 / 3, 0.38] },
        { rect: [2 / 3, 0.62, 1 / 3, 0.38] },
      ];
    },
  },
  duo: {
    label: 'Split Duo',
    panels() {
      const slant = 0.1;
      return [
        { poly: panelQuad(0, 0.55, slant, true, false) },
        { poly: panelQuad(0.45, 1, slant, false, true) },
      ];
    },
  },
};

function panelQuad(x0, x1, slant, isFirst, isLast) {
  // A vertical band whose left and right edges lean by `slant` of the height.
  const topL = isFirst ? 0 : x0 - slant * 0.4;
  const botL = isFirst ? 0 : x0 + slant * 0.4;
  const topR = isLast ? 1 : x1 - slant * 0.4;
  const botR = isLast ? 1 : x1 + slant * 0.4;
  return [
    [topL, 0], [topR, 0], [botR, 1], [botL, 1],
  ];
}

export const GRADES = {
  sunset: { label: 'Vice Sunset' },
  neon: { label: 'Neon Night' },
  golden: { label: 'Golden Hour' },
  clean: { label: 'Clean' },
};

export const TITLE_STYLES = {
  classic: { label: 'Classic White', fill: '#ffffff', edge: '#14101f', accent: '#ffcf3f' },
  vice: { label: 'Vice Pink', fill: '#ff5da2', edge: '#2a0a2e', accent: '#37e0d8' },
  gold: { label: 'Gold Rush', fill: '#ffd94d', edge: '#3a2403', accent: '#ffffff' },
  mint: { label: 'Mint Pop', fill: '#5cf2c0', edge: '#06231a', accent: '#ff5da2' },
};

const DISPLAY_FONT = '"Arial Black", "Archivo Black", Impact, "Segoe UI", system-ui, sans-serif';

/** Draws one photo into the current clip path, honouring pan and zoom. */
function paintPhoto(ctx, photo, box, panel) {
  const [bx, by, bw, bh] = box;
  if (!photo) {
    const g = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    g.addColorStop(0, '#3b2358');
    g.addColorStop(1, '#150d26');
    ctx.fillStyle = g;
    ctx.fillRect(bx, by, bw, bh);
    return;
  }
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(bw / iw, bh / ih);
  const scale = base * (panel.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const slackX = Math.max(0, (dw - bw) / 2);
  const slackY = Math.max(0, (dh - bh) / 2);
  const dx = bx + (bw - dw) / 2 + (panel.panX || 0) * slackX;
  const dy = by + (bh - dh) / 2 + (panel.panY || 0) * slackY;
  ctx.drawImage(photo, dx, dy, dw, dh);
}

/** Bounding box of a panel shape in pixels. */
function panelBox(shape, w, h) {
  if (shape.rect) {
    const [x, y, pw, ph] = shape.rect;
    return [x * w, y * h, pw * w, ph * h];
  }
  const xs = shape.poly.map((p) => p[0] * w);
  const ys = shape.poly.map((p) => p[1] * h);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
}

function traceShape(ctx, shape, w, h) {
  ctx.beginPath();
  if (shape.rect) {
    const [x, y, pw, ph] = shape.rect;
    ctx.rect(x * w, y * h, pw * w, ph * h);
    return;
  }
  shape.poly.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px * w, py * h);
    else ctx.lineTo(px * w, py * h);
  });
  ctx.closePath();
}

/** Applies the colour grade as layered washes over the finished panels. */
function applyGrade(ctx, w, h, grade) {
  ctx.save();
  if (grade === 'sunset') {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, 'rgba(64, 20, 110, 0.28)');
    sky.addColorStop(0.45, 'rgba(255, 110, 64, 0.16)');
    sky.addColorStop(1, 'rgba(214, 36, 110, 0.42)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255, 170, 60, 0.18)';
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'neon') {
    const night = ctx.createLinearGradient(0, 0, w, h);
    night.addColorStop(0, 'rgba(10, 8, 60, 0.38)');
    night.addColorStop(0.55, 'rgba(120, 10, 140, 0.22)');
    night.addColorStop(1, 'rgba(0, 190, 220, 0.30)');
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(40, 60, 255, 0.16)';
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'golden') {
    const warm = ctx.createRadialGradient(w / 2, h * 0.3, w * 0.1, w / 2, h * 0.5, w);
    warm.addColorStop(0, 'rgba(255, 210, 110, 0.10)');
    warm.addColorStop(1, 'rgba(120, 50, 10, 0.34)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
  // A soft vignette keeps every grade feeling printed, not filtered.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(5,2,14,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** Strokes the panel dividers with a heavy black keyline and a thin light edge. */
function strokeDividers(ctx, shapes, w, h) {
  const key = Math.max(6, Math.min(w, h) * 0.012);
  ctx.lineJoin = 'round';
  for (const shape of shapes) {
    traceShape(ctx, shape, w, h);
    ctx.strokeStyle = '#0b0714';
    ctx.lineWidth = key;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = Math.max(1.5, key * 0.18);
    ctx.stroke();
  }
  ctx.strokeStyle = '#0b0714';
  ctx.lineWidth = key * 1.4;
  ctx.strokeRect(0, 0, w, h);
}

/** Fits a font size so `text` spans at most `maxWidth`. */
function fitFont(ctx, text, maxWidth, startSize, weight) {
  let size = startSize;
  const set = () => { ctx.font = `${weight} ${size}px ${DISPLAY_FONT}`; };
  set();
  while (ctx.measureText(text).width > maxWidth && size > 14) {
    size *= 0.94;
    set();
  }
  return size;
}

/** Draws the title block: kicker line, huge title, and a coloured rule. */
function drawTitleBlock(ctx, w, h, state) {
  const style = TITLE_STYLES[state.titleStyle] || TITLE_STYLES.classic;
  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim().toUpperCase();
  const cx = w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  let cursorY = h * 0.155;
  if (sub) {
    const subSize = fitFont(ctx, sub, w * 0.7, h * 0.034, '700');
    ctx.font = `700 ${subSize}px ${DISPLAY_FONT}`;
    ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`;
    ctx.lineWidth = subSize * 0.22;
    ctx.strokeStyle = style.edge;
    ctx.strokeText(sub, cx, cursorY);
    ctx.fillStyle = style.accent;
    ctx.fillText(sub, cx, cursorY);
    ctx.letterSpacing = '0px';
    cursorY += h * 0.028;
  }
  if (title) {
    const words = title.split(/\s+/);
    const lines = words.length > 1 && title.length > 10
      ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')]
      : [title];
    const startSize = (lines.length > 1 ? h * 0.105 : h * 0.125);
    let size = startSize;
    for (const line of lines) size = Math.min(size, fitFont(ctx, line, w * 0.92, startSize, '900'));
    ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
    for (const line of lines) {
      cursorY += size * 0.98;
      ctx.lineWidth = size * 0.16;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = style.edge;
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = size * 0.12;
      ctx.shadowOffsetY = size * 0.05;
      ctx.strokeText(line, cx, cursorY);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = style.fill;
      ctx.fillText(line, cx, cursorY);
    }
    // Accent rule under the title, the poster's finishing stamp.
    const ruleW = Math.min(w * 0.52, ctx.measureText(lines[0]).width * 0.9);
    ctx.fillStyle = style.accent;
    ctx.fillRect(cx - ruleW / 2, cursorY + size * 0.22, ruleW, Math.max(4, size * 0.09));
  }
  // Bottom tag strip.
  const tag = (state.tagline || '').trim();
  if (tag) {
    const tagSize = fitFont(ctx, tag.toUpperCase(), w * 0.8, h * 0.03, '700');
    ctx.font = `700 ${tagSize}px ${DISPLAY_FONT}`;
    const tw = ctx.measureText(tag.toUpperCase()).width + tagSize * 1.6;
    const th = tagSize * 1.9;
    const tx = cx - tw / 2;
    const ty = h - th - h * 0.035;
    ctx.fillStyle = 'rgba(8,4,18,0.82)';
    ctx.fillRect(tx, ty, tw, th);
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = Math.max(2, tagSize * 0.09);
    ctx.strokeRect(tx, ty, tw, th);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tag.toUpperCase(), cx, ty + th * 0.68);
  }
}

/**
 * Renders the whole cover described by `state` onto `canvas` at the canvas's
 * own pixel size. state: { layout, grade, titleStyle, title, subtitle, tagline,
 * panels: [{ photo, panX, panY, zoom }] }.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#160d28';
  ctx.fillRect(0, 0, w, h);
  const shapes = LAYOUTS[state.layout].panels(w, h);
  shapes.forEach((shape, i) => {
    const panel = state.panels[i] || { photo: null, panX: 0, panY: 0, zoom: 1 };
    ctx.save();
    traceShape(ctx, shape, w, h);
    ctx.clip();
    // Slight saturation/contrast lift so photos feel posterised before grading.
    ctx.filter = 'saturate(1.22) contrast(1.07)';
    paintPhoto(ctx, panel.photo, panelBox(shape, w, h), panel);
    ctx.filter = 'none';
    ctx.restore();
  });
  applyGrade(ctx, w, h, state.grade);
  strokeDividers(ctx, shapes, w, h);
  // In the editor (never on an export) the selected panel gets a warm outline
  // so it is obvious which photo a drag or the zoom slider will move.
  if (Number.isInteger(state.highlight) && shapes[state.highlight]) {
    traceShape(ctx, shapes[state.highlight], w, h);
    ctx.strokeStyle = '#ffb35c';
    ctx.lineWidth = Math.max(4, Math.min(w, h) * 0.008);
    ctx.setLineDash([Math.min(w, h) * 0.03, Math.min(w, h) * 0.018]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  drawTitleBlock(ctx, w, h, state);
}

/** Which panel index sits under a point given in unit space, or -1. */
export function panelAt(layoutKey, ux, uy) {
  const shapes = LAYOUTS[layoutKey].panels(1, 1);
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (s.rect) {
      const [x, y, pw, ph] = s.rect;
      if (ux >= x && ux <= x + pw && uy >= y && uy <= y + ph) return i;
    } else if (pointInPoly(ux, uy, s.poly)) {
      return i;
    }
  }
  return -1;
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
