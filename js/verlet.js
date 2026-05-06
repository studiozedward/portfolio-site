export class Point {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.px = x; this.py = y;
    this.ax = 0; this.ay = 0;
  }
  update(damping) {
    const vx = (this.x - this.px) * damping;
    const vy = (this.y - this.py) * damping;
    this.px = this.x; this.py = this.y;
    this.x += vx + this.ax;
    this.y += vy + this.ay;
    this.ax = 0; this.ay = 0;
  }
  addForce(fx, fy) {
    this.ax += fx;
    this.ay += fy;
  }
}

export class Constraint {
  constructor(a, b, length, stiffness = 1, kind = '') {
    this.a = a; this.b = b;
    this.length = length;
    this.stiffness = stiffness;
    this.kind = kind;
  }
  solve() {
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    const diff = (dist - this.length) / dist * this.stiffness;
    const ox = dx * 0.5 * diff;
    const oy = dy * 0.5 * diff;
    this.a.x += ox; this.a.y += oy;
    this.b.x -= ox; this.b.y -= oy;
  }
}

export class Blob {
  constructor(cx, cy, radius, color, params) {
    this.radius = radius;
    this.color = color;
    this.points = [];
    this.constraints = [];
    this.targetScale = 1;
    this.scale = 1;
    this.hovered = false;

    const NUM_POINTS = 16;

    this.centre = new Point(cx, cy);
    this.points.push(this.centre);

    const perim = [];
    for (let i = 0; i < NUM_POINTS; i++) {
      const a = (i / NUM_POINTS) * Math.PI * 2;
      const p = new Point(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      this.points.push(p);
      perim.push(p);
    }
    this.perim = perim;

    const perimDist = 2 * radius * Math.sin(Math.PI / NUM_POINTS);
    for (let i = 0; i < NUM_POINTS; i++) {
      this.constraints.push(new Constraint(perim[i], perim[(i + 1) % NUM_POINTS], perimDist, params.perimStiffness, 'perim'));
    }
    for (let i = 0; i < NUM_POINTS; i++) {
      this.constraints.push(new Constraint(this.centre, perim[i], radius, params.spokeStiffness, 'spoke'));
    }
    for (let i = 0; i < NUM_POINTS / 2; i++) {
      this.constraints.push(new Constraint(perim[i], perim[i + NUM_POINTS / 2], radius * 2, params.crossStiffness, 'cross'));
    }

    const initAngle = Math.random() * Math.PI * 2;
    const initSpeed = 1.2 + Math.random() * 0.8;
    const dx = Math.cos(initAngle) * initSpeed;
    const dy = Math.sin(initAngle) * initSpeed;
    this.points.forEach(p => { p.px = p.x - dx; p.py = p.y - dy; });
  }

  getCentre() {
    let sx = 0, sy = 0;
    for (const p of this.perim) { sx += p.x; sy += p.y; }
    return { x: sx / this.perim.length, y: sy / this.perim.length };
  }

  constrainBounds(W, H) {
    const margin = 4;
    for (const p of this.points) {
      if (p.x < margin) { p.px = p.x + (p.x - p.px) * 0.5; p.x = margin; }
      if (p.x > W - margin) { p.px = p.x + (p.x - p.px) * 0.5; p.x = W - margin; }
      if (p.y < margin) { p.py = p.y + (p.y - p.py) * 0.5; p.y = margin; }
      if (p.y > H - margin) { p.py = p.y + (p.y - p.py) * 0.5; p.y = H - margin; }
    }
  }

  applyDrift(params) {
    if (Math.random() < params.driftChance) {
      const a = Math.random() * Math.PI * 2;
      const f = params.driftForce;
      this.centre.addForce(Math.cos(a) * f, Math.sin(a) * f);
    }
  }

  draw(ctx) {
    const c = this.getCentre();
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-c.x, -c.y);

    const pts = this.perim;
    const n = pts.length;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const curr = pts[i];
      const next = pts[(i + 1) % n];
      const mx = (curr.x + next.x) / 2;
      const my = (curr.y + next.y) / 2;
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
    }
    const last = pts[n - 1], first = pts[0];
    ctx.quadraticCurveTo(last.x, last.y, (last.x + first.x) / 2, (last.y + first.y) / 2);
    ctx.closePath();

    if (this.hovered) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 30;
    }
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    const grad = ctx.createRadialGradient(
      c.x - this.radius * 0.25, c.y - this.radius * 0.3, this.radius * 0.05,
      c.x, c.y, this.radius * 1.1
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.32)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.05)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.65;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  contains(x, y) {
    const pts = this.perim;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi + 0.0001) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
