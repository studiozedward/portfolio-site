import { Blob } from './verlet.js';
import { step } from './blob-physics.js';

const DEFAULTS = {
  perimStiffness: 0.85,
  spokeStiffness: 0.22,
  crossStiffness: 0.04,
  damping:        0.998,
  driftChance:    0.5,
  driftForce:     0.24,
  iterations:     2,
  bulkRange:      2.0,
  bulkStrength:   0.55,
  dentRange:      1.05,
  dentStrength:   6.75,
};

export function initDecorativeBlobs(canvas, options = {}) {
  const colors = options.colors || ['#E86A5C', '#D94F3D', '#A83729', '#C44131', '#B83C2D'];
  const count = options.count || 5;
  const ctx = canvas.getContext('2d');
  const params = { ...DEFAULTS };

  let W, H;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const blobs = [];
  const minDim = Math.min(W, H);
  const baseR = minDim * 0.11;
  for (let i = 0; i < count; i++) {
    const r = baseR + Math.random() * (baseR * 0.4);
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const spread = minDim * 0.32;
    const x = W / 2 + Math.cos(angle) * spread;
    const y = H / 2 + Math.sin(angle) * spread;
    blobs.push(new Blob(x, y, r, colors[i % colors.length], params));
  }

  function loop() {
    if (document.hidden) {
      requestAnimationFrame(loop);
      return;
    }
    step(blobs, params, W, H);
    ctx.clearRect(0, 0, W, H);
    blobs.forEach(b => b.draw(ctx));
    requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) requestAnimationFrame(loop);
  });
  loop();
}
