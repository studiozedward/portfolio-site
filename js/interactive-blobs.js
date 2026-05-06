import { Blob } from './verlet.js';
import { step, resolveBlobCollisions } from './blob-physics.js';

const PROJECTS = [
  { name: 'Pip-Token', url: 'pip-token.html', color: '#E86A5C' },
  { name: 'Meowify',   url: 'meowify.html',   color: '#D94F3D' },
  { name: 'Commbini',  url: 'commbini.html',  color: '#A83729' },
];

const DEFAULTS = {
  perimStiffness:  0.85,
  spokeStiffness:  0.22,
  crossStiffness:  0.04,
  damping:         0.998,
  driftChance:     0.5,
  driftForce:      0.24,
  iterations:      2,
  bulkRange:       2.0,
  bulkStrength:    0.55,
  dentRange:       1.05,
  dentStrength:    6.75,
  clickRange:      220,
  clickCentre:     0.8,
  clickPerim:      5,
  hoverScale:      1.05,
};

const PANEL_GROUPS = [
  { title: 'Springs', items: [
    { key: 'perimStiffness',  label: 'Perimeter',     min: 0.1, max: 1.0, step: 0.01 },
    { key: 'spokeStiffness',  label: 'Spoke',         min: 0.0, max: 1.0, step: 0.01 },
    { key: 'crossStiffness',  label: 'Cross',         min: 0.0, max: 0.5, step: 0.01 },
  ]},
  { title: 'Motion', items: [
    { key: 'damping',         label: 'Damping',       min: 0.95, max: 1.0, step: 0.001 },
    { key: 'driftChance',     label: 'Drift chance',  min: 0.0, max: 1.0, step: 0.01 },
    { key: 'driftForce',      label: 'Drift force',   min: 0.0, max: 0.3, step: 0.005 },
    { key: 'iterations',      label: 'Iterations',    min: 1,   max: 12,  step: 1 },
  ]},
  { title: 'Inter-blob forces', items: [
    { key: 'bulkRange',       label: 'Bulk range ×',  min: 1.0, max: 4.0, step: 0.05 },
    { key: 'bulkStrength',    label: 'Bulk strength', min: 0.0, max: 3.0, step: 0.05 },
    { key: 'dentRange',       label: 'Dent range ×',  min: 1.0, max: 2.0, step: 0.01 },
    { key: 'dentStrength',    label: 'Dent strength', min: 0.0, max: 20,  step: 0.25 },
  ]},
  { title: 'Click interaction', items: [
    { key: 'clickRange',      label: 'Range (px)',    min: 50,  max: 500, step: 10 },
    { key: 'clickCentre',     label: 'Centre push',   min: 0.0, max: 3.0, step: 0.05 },
    { key: 'clickPerim',      label: 'Perim push',    min: 0.0, max: 15,  step: 0.25 },
  ]},
  { title: 'Visual', items: [
    { key: 'hoverScale',      label: 'Hover scale',   min: 1.0, max: 1.3, step: 0.01 },
  ]},
];

export function initInteractiveBlobs(canvas) {
  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('tooltip');
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
  const baseR = minDim * 0.13;
  for (let i = 0; i < 3; i++) {
    const r = baseR + Math.random() * (baseR * 0.25);
    const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.3;
    const spread = minDim * 0.22;
    const x = W / 2 + Math.cos(angle) * spread;
    const y = H / 2 + Math.sin(angle) * spread;
    const blob = new Blob(x, y, r, PROJECTS[i].color, params);
    blob.project = PROJECTS[i];
    blobs.push(blob);
  }

  function pushPointsOut(points, blob) {
    const c = blob.getCentre();
    for (const p of points) {
      if (!blob.contains(p.x, p.y)) continue;
      let nearestDist = Infinity;
      let nearestPoint = null;
      for (const bp of blob.perim) {
        const ddx = bp.x - p.x;
        const ddy = bp.y - p.y;
        const dd = ddx * ddx + ddy * ddy;
        if (dd < nearestDist) { nearestDist = dd; nearestPoint = bp; }
      }
      if (!nearestPoint) continue;
      const ndx = p.x - c.x;
      const ndy = p.y - c.y;
      const nd = Math.sqrt(ndx * ndx + ndy * ndy) || 0.0001;
      const nx = ndx / nd;
      const ny = ndy / nd;
      const targetX = c.x + nx * (blob.radius * 0.95);
      const targetY = c.y + ny * (blob.radius * 0.95);
      const moveX = (targetX - p.x) * 0.5;
      const moveY = (targetY - p.y) * 0.5;
      p.x += moveX;
      p.y += moveY;
      nearestPoint.x -= moveX * 0.5;
      nearestPoint.y -= moveY * 0.5;
    }
  }

  function resolveHardCollisions() {
    for (let i = 0; i < blobs.length; i++) {
      for (let j = i + 1; j < blobs.length; j++) {
        const A = blobs[i], B = blobs[j];
        const ac = A.getCentre(), bc = B.getCentre();
        const dx = bc.x - ac.x, dy = bc.y - ac.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        if (d > A.radius + B.radius + 10) continue;
        pushPointsOut(A.perim, B);
        pushPointsOut(B.perim, A);
      }
    }
  }

  function getEventPos(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function handleMove(e) {
    const { x, y } = getEventPos(e);
    let hit = null;
    for (let i = blobs.length - 1; i >= 0; i--) {
      if (blobs[i].contains(x, y)) { hit = blobs[i]; break; }
    }
    blobs.forEach(b => { b.hovered = false; b.targetScale = 1; });
    if (hit) {
      hit.hovered = true;
      hit.targetScale = params.hoverScale;
      canvas.style.cursor = 'pointer';
      tooltip.style.opacity = '1';
      tooltip.style.left = (x + 18) + 'px';
      tooltip.style.top = (y - 12) + 'px';
      tooltip.textContent = hit.project.name;
    } else {
      canvas.style.cursor = 'default';
      tooltip.style.opacity = '0';
    }
  }

  function handleClick(e) {
    const { x, y } = getEventPos(e);
    let hit = null;
    for (let i = blobs.length - 1; i >= 0; i--) {
      if (blobs[i].contains(x, y)) { hit = blobs[i]; break; }
    }
    if (hit) {
      hit.perim.forEach(p => {
        const dx = p.x - x;
        const dy = p.y - y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 8 / (d * 0.05 + 1);
        p.x += (dx / d) * force;
        p.y += (dy / d) * force;
      });
      setTimeout(() => { window.location.href = hit.project.url; }, 220);
      return;
    }

    blobs.forEach(blob => {
      const c = blob.getCentre();
      const dx = c.x - x;
      const dy = c.y - y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < params.clickRange) {
        const strength = (1 - d / params.clickRange) * params.clickCentre;
        blob.centre.addForce(dx / d * strength, dy / d * strength);
        blob.perim.forEach(p => {
          const pdx = p.x - x;
          const pdy = p.y - y;
          const pd = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
          if (pd < params.clickRange) {
            const ps = (1 - pd / params.clickRange) * params.clickPerim;
            p.x += pdx / pd * ps;
            p.y += pdy / pd * ps;
          }
        });
      }
    });
  }

  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleMove, { passive: true });
  canvas.addEventListener('touchend', handleClick);
  canvas.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0';
    blobs.forEach(b => { b.hovered = false; b.targetScale = 1; });
  });

  function loop() {
    if (document.hidden) {
      requestAnimationFrame(loop);
      return;
    }
    step(blobs, params, W, H);
    resolveHardCollisions();
    ctx.clearRect(0, 0, W, H);
    blobs.forEach(b => {
      b.scale += (b.targetScale - b.scale) * 0.12;
      b.draw(ctx);
    });
    requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) requestAnimationFrame(loop);
  });
  loop();

  // Tweak panel
  const panel = document.getElementById('panel');
  const sliders = {};

  function formatVal(v, s) {
    if (s >= 1) return Math.round(v).toString();
    const decimals = Math.max(0, -Math.floor(Math.log10(s)));
    return v.toFixed(decimals);
  }

  function updateConstraintStiffness() {
    blobs.forEach(b => {
      b.constraints.forEach(c => {
        if (c.kind === 'perim') c.stiffness = params.perimStiffness;
        else if (c.kind === 'spoke') c.stiffness = params.spokeStiffness;
        else if (c.kind === 'cross') c.stiffness = params.crossStiffness;
      });
    });
  }

  function buildPanel() {
    panel.innerHTML = '';
    PANEL_GROUPS.forEach(group => {
      const h = document.createElement('h3');
      h.textContent = group.title;
      panel.appendChild(h);
      group.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'row';
        const label = document.createElement('div');
        label.className = 'row-label';
        label.innerHTML = `<span>${item.label}</span><span class="val" id="val-${item.key}">${formatVal(params[item.key], item.step)}</span>`;
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = item.min;
        slider.max = item.max;
        slider.step = item.step;
        slider.value = params[item.key];
        slider.addEventListener('input', e => {
          const v = parseFloat(e.target.value);
          params[item.key] = v;
          document.getElementById('val-' + item.key).textContent = formatVal(v, item.step);
          if (item.key === 'perimStiffness' || item.key === 'spokeStiffness' || item.key === 'crossStiffness') {
            updateConstraintStiffness();
          }
        });
        row.appendChild(label);
        row.appendChild(slider);
        panel.appendChild(row);
        sliders[item.key] = slider;
      });
    });

    const reset = document.createElement('button');
    reset.className = 'reset';
    reset.textContent = 'Reset to defaults';
    reset.addEventListener('click', () => {
      Object.assign(params, DEFAULTS);
      Object.keys(sliders).forEach(k => {
        sliders[k].value = params[k];
        const item = PANEL_GROUPS.flatMap(g => g.items).find(i => i.key === k);
        document.getElementById('val-' + k).textContent = formatVal(params[k], item.step);
      });
      updateConstraintStiffness();
    });
    panel.appendChild(reset);
  }

  buildPanel();

  document.getElementById('panel-toggle').addEventListener('click', () => {
    panel.classList.toggle('open');
  });
}
