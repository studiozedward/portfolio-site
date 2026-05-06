export function applyBulkRepulsion(A, B, range, params) {
  const ac = A.getCentre();
  const bc = B.getCentre();
  const dx = bc.x - ac.x;
  const dy = bc.y - ac.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
  const proximity = 1 - (d / range);
  const force = proximity * proximity * params.bulkStrength;
  const fx = (dx / d) * force;
  const fy = (dy / d) * force;
  A.centre.addForce(-fx, -fy);
  B.centre.addForce(fx, fy);
}

export function applyDentForce(target, source, range, params) {
  const sc = source.getCentre();
  for (const p of target.perim) {
    const dx = p.x - sc.x;
    const dy = p.y - sc.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    if (d >= range) continue;
    const proximity = 1 - (d / range);
    const intensity = proximity * proximity * proximity;
    const push = intensity * params.dentStrength;
    p.x += (dx / d) * push;
    p.y += (dy / d) * push;
  }
}

export function resolveBlobCollisions(blobs, params) {
  for (let i = 0; i < blobs.length; i++) {
    for (let j = i + 1; j < blobs.length; j++) {
      const A = blobs[i], B = blobs[j];
      const ac = A.getCentre(), bc = B.getCentre();
      const dx = bc.x - ac.x, dy = bc.y - ac.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const bulkRange = (A.radius + B.radius) * params.bulkRange;
      const dentRange = (A.radius + B.radius) * params.dentRange;
      if (d < bulkRange) applyBulkRepulsion(A, B, bulkRange, params);
      if (d < dentRange) {
        applyDentForce(A, B, dentRange, params);
        applyDentForce(B, A, dentRange, params);
      }
    }
  }
}

export function step(blobs, params, W, H) {
  blobs.forEach(b => b.applyDrift(params));
  blobs.forEach(b => b.points.forEach(p => p.update(params.damping)));
  for (let iter = 0; iter < params.iterations; iter++) {
    blobs.forEach(b => b.constraints.forEach(c => c.solve()));
    resolveBlobCollisions(blobs, params);
    blobs.forEach(b => b.constrainBounds(W, H));
  }
}
