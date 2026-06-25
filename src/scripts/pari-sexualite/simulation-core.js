// Wright-Fisher population genetics simulation
// Source de vérité — importée par interactive.html et PopulationSim.astro

export const L = 20;
export const G = 100;
export const DOT_BASE = 55;
export const DOT_SCALE = 55;

export function mkRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function simulate(N, MU) {
  const rng = mkRng(42);
  let A = new Uint8Array(N * L);
  let S = new Uint8Array(N * L);
  const buf = new Uint8Array(N * L);
  const statesA = [A.slice()];
  const statesS = [S.slice()];

  for (let g = 0; g < G; g++) {
    for (let i = 0; i < N; i++) {
      const p = (rng() * N) | 0;
      for (let j = 0; j < L; j++)
        buf[i*L+j] = A[p*L+j] ^ (rng() < MU ? 1 : 0);
    }
    A = buf.slice(); statesA.push(A);

    for (let i = 0; i < N; i++) {
      const p1 = (rng() * N) | 0, p2 = (rng() * N) | 0;
      for (let j = 0; j < L; j++) {
        const al = rng() < 0.5 ? S[p1*L+j] : S[p2*L+j];
        buf[i*L+j] = al ^ (rng() < MU ? 1 : 0);
      }
    }
    S = buf.slice(); statesS.push(S);
  }
  return { statesA, statesS };
}

export function fitPCA(flat, N2) {
  const mu = new Float64Array(L);
  for (let i = 0; i < N2; i++)
    for (let j = 0; j < L; j++) mu[j] += flat[i*L+j];
  for (let j = 0; j < L; j++) mu[j] /= N2;

  const X = new Float64Array(N2 * L);
  for (let i = 0; i < N2; i++)
    for (let j = 0; j < L; j++) X[i*L+j] = flat[i*L+j] - mu[j];

  const cov = new Float64Array(L * L);
  for (let i = 0; i < N2; i++)
    for (let j = 0; j < L; j++)
      for (let k = j; k < L; k++) {
        const v = X[i*L+j] * X[i*L+k];
        cov[j*L+k] += v;
        if (k !== j) cov[k*L+j] += v;
      }
  for (let jk = 0; jk < L*L; jk++) cov[jk] /= N2;

  function eigenvec(excl) {
    let v = new Float64Array(L).fill(1 / Math.sqrt(L));
    for (let it = 0; it < 120; it++) {
      const w = new Float64Array(L);
      for (let j = 0; j < L; j++)
        for (let k = 0; k < L; k++) w[j] += cov[j*L+k] * v[k];
      if (excl) {
        const d = excl.reduce((s, e, j) => s + e * w[j], 0);
        for (let j = 0; j < L; j++) w[j] -= d * excl[j];
      }
      let norm = 0;
      for (let j = 0; j < L; j++) norm += w[j] * w[j];
      norm = Math.sqrt(norm);
      if (norm < 1e-12) break;
      const nv = w.map(x => x / norm);
      let diff = 0;
      for (let j = 0; j < L; j++) diff += (nv[j] - v[j]) ** 2;
      v = nv;
      if (diff < 1e-15) break;
    }
    return v;
  }

  const v1 = eigenvec(null);
  const v2 = eigenvec(v1);
  return { mu, v1, v2 };
}

export function project(flat, N, W) {
  const out = new Float64Array(N * 2);
  for (let i = 0; i < N; i++) {
    let x = 0, y = 0;
    for (let j = 0; j < L; j++) {
      const c = flat[i*L+j] - W.mu[j];
      x += c * W.v1[j]; y += c * W.v2[j];
    }
    out[i*2] = x; out[i*2+1] = y;
  }
  return out;
}

export function toMap(flat, N, proj) {
  const map = new Map();
  for (let i = 0; i < N; i++) {
    let k = 0;
    for (let j = 0; j < L; j++) k |= flat[i*L+j] << j;
    if (!map.has(k)) map.set(k, { x: proj[i*2], y: proj[i*2+1], n: 0 });
    map.get(k).n++;
  }
  return map;
}

export function matchFrames(map0, map1) {
  const d0 = [...map0.values()];
  const d1 = [...map1.values()];
  const used1 = new Uint8Array(d1.length);
  const matched = [], fadeOut = [];

  for (let i = 0; i < d0.length; i++) {
    let bestJ = -1, bestD = Infinity;
    for (let j = 0; j < d1.length; j++) {
      if (used1[j]) continue;
      const dx = d0[i].x - d1[j].x, dy = d0[i].y - d1[j].y;
      const dist = dx*dx + dy*dy;
      if (dist < bestD) { bestD = dist; bestJ = j; }
    }
    if (bestJ >= 0) { matched.push({ a: d0[i], b: d1[bestJ] }); used1[bestJ] = 1; }
    else fadeOut.push(d0[i]);
  }
  return { matched, fadeOut, fadeIn: d1.filter((_, j) => !used1[j]) };
}

export function precompute(N, MU) {
  const { statesA, statesS } = simulate(N, MU);
  const fin = new Uint8Array(2 * N * L);
  fin.set(statesA[G]); fin.set(statesS[G], N * L);
  const W = fitPCA(fin, 2 * N);

  let xmin=Infinity, xmax=-Infinity, ymin=Infinity, ymax=-Infinity;
  for (let g = 0; g <= G; g++) {
    for (const pop of [statesA[g], statesS[g]]) {
      const pr = project(pop, N, W);
      for (let i = 0; i < N; i++) {
        if (pr[i*2]   < xmin) xmin = pr[i*2];
        if (pr[i*2]   > xmax) xmax = pr[i*2];
        if (pr[i*2+1] < ymin) ymin = pr[i*2+1];
        if (pr[i*2+1] > ymax) ymax = pr[i*2+1];
      }
    }
  }
  const pad = 0.07 * Math.max(xmax-xmin, ymax-ymin, 0.01);
  const xlim = [xmin-pad, xmax+pad];
  const ylim = [ymin-pad, ymax+pad];

  const frames = [];
  for (let g = 0; g <= G; g++) {
    const prA = project(statesA[g], N, W);
    const prS = project(statesS[g], N, W);
    frames.push({ mA: toMap(statesA[g], N, prA), mS: toMap(statesS[g], N, prS) });
  }
  const transitions = [];
  for (let g = 0; g < G; g++) {
    transitions.push({
      tA: matchFrames(frames[g].mA, frames[g+1].mA),
      tS: matchFrames(frames[g].mS, frames[g+1].mS),
    });
  }
  return { frames, transitions, xlim, ylim };
}

export function renderTrans(canvas, trans, t, xlim, ylim, fade) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const toX = v => ((v-xlim[0])/(xlim[1]-xlim[0])) * (W-56) + 28;
  const toY = v => H - (((v-ylim[0])/(ylim[1]-ylim[0])) * (H-56) + 28);

  function dot(x, y, n, alpha) {
    if (alpha < 0.01) return;
    const r = Math.sqrt((DOT_BASE + DOT_SCALE * (n-1)) / Math.PI);
    ctx.fillStyle = `rgba(10,10,10,${Math.min(alpha, 1)})`;
    ctx.beginPath(); ctx.arc(toX(x), toY(y), r, 0, 2*Math.PI); ctx.fill();
  }

  for (const { a, b } of trans.matched)
    dot(a.x+(b.x-a.x)*t, a.y+(b.y-a.y)*t, a.n+(b.n-a.n)*t, 0.88*fade);
  for (const a of trans.fadeOut) dot(a.x, a.y, a.n, 0.88*(1-t)*fade);
  for (const b of trans.fadeIn)  dot(b.x, b.y, b.n, 0.88*t*fade);
}

export function renderMap(canvas, map, xlim, ylim, fade) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const toX = v => ((v-xlim[0])/(xlim[1]-xlim[0])) * (W-56) + 28;
  const toY = v => H - (((v-ylim[0])/(ylim[1]-ylim[0])) * (H-56) + 28);
  ctx.fillStyle = `rgba(10,10,10,${0.88*fade})`;
  for (const { x, y, n } of map.values()) {
    const r = Math.sqrt((DOT_BASE + DOT_SCALE*(n-1)) / Math.PI);
    ctx.beginPath(); ctx.arc(toX(x), toY(y), r, 0, 2*Math.PI); ctx.fill();
  }
}
