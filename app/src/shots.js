// Fixed scenes for screenshots: ?shot=cover shows the finished cover alone,
// ?shot=editor shows the editor with a scene loaded. Query params:
//   photos=boulevard,pier  sample names assigned to panels in order
//   layout=diagonal|grid|hero|duo, grade=sunset|neon|golden|clean
//   title, sub, tag, style=classic|vice|gold|mint, size=1080x1080 etc.
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const names = (query.get('photos') || 'boulevard,pier').split(',').map((s) => s.trim()).filter(Boolean);
  const images = [];
  for (const name of names) images.push(await api.loadSample(name));
  api.applyScene({
    images,
    layout: query.get('layout') || 'diagonal',
    grade: query.get('grade') || 'sunset',
    titleStyle: query.get('style') || 'classic',
    title: query.get('title') ?? 'Vice Heat',
    subtitle: query.get('sub') ?? 'Leonida Nights',
    tagline: query.get('tag') ?? 'One city · One score',
    size: query.get('size') || '',
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
