// Rideable dragons: a segmented body that follows its head's trail, wings that flap with
// speed, a resting behaviour around the nests and a player-controlled flight mode.
import * as THREE from 'three';
import { scene, rand, rr } from './core.js';
import { mat } from './npc.js';

const PALETTES = [
  { name: 'Ignis',  body: 0xc0302a, belly: 0xf0c060, wing: 0xe0503a, horn: 0xffd060, eye: 0xffe040 },
  { name: 'Zafiro', body: 0x2a5ac8, belly: 0xa0e0ff, wing: 0x3a8aff, horn: 0xe0f0ff, eye: 0x80ffff },
  { name: 'Esmeralda', body: 0x2a9a5a, belly: 0xe0f0a0, wing: 0x40c080, horn: 0xffe8a0, eye: 0xb0ff60 },
];
export const DRAGONS = [];

function buildBody(p, scale = 1) {
  const N = 20, segs = [];
  const sc = mat(p.body, { roughness: 0.45, metalness: 0.25, flatShading: true });
  const be = mat(p.belly, { roughness: 0.6 }), sp = mat(p.horn, { metalness: 0.6, roughness: 0.3 });
  const ell = (rx, ry, rz) => new THREE.SphereGeometry(1, 12, 8).scale(rx, ry, rz);
  const add = (par, g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; par.add(o); return o; };
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const r = (i < 3 ? 0.45 + i * 0.12 : Math.max(0.09, 0.78 * Math.pow(1 - (t - 0.1) / 0.9, 1.25))) * scale;
    const s = new THREE.Group(); scene.add(s);
    const b = add(s, new THREE.IcosahedronGeometry(1, 1), sc); b.scale.set(r, r * 0.9, Math.max(r * 1.6, 0.42 * scale));
    if (i > 2) add(s, ell(r * 0.7, r * 0.5, r * 1.3), be, 0, -r * 0.45, 0);
    if (i > 1 && i < N - 1) add(s, new THREE.ConeGeometry(r * 0.35, r * 0.9, 4), sp, 0, r * 1.05, 0).rotation.x = -0.4;
    segs.push({ s, r });
  }
  const head = segs[0].s;
  add(head, ell(0.35 * scale, 0.28 * scale, 0.6 * scale), sc, 0, -0.05 * scale, 0.55 * scale);
  const jaw = add(head, ell(0.3 * scale, 0.12 * scale, 0.5 * scale), be, 0, -0.25 * scale, 0.45 * scale);
  for (const sx of [-1, 1]) {
    add(head, new THREE.ConeGeometry(0.1 * scale, 0.7 * scale, 6), sp, sx * 0.25 * scale, 0.45 * scale, -0.25 * scale).rotation.set(-0.9, 0, -sx * 0.3);
    add(head, new THREE.SphereGeometry(0.09 * scale, 8, 6), mat(p.eye, { emissive: p.eye, emissiveIntensity: 4 }), sx * 0.28 * scale, 0.16 * scale, 0.42 * scale);
  }
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(3.6, 0.9); shape.lineTo(4.4, -0.2); shape.quadraticCurveTo(3.4, -0.6, 3.0, -1.6);
  shape.quadraticCurveTo(2.2, -1.0, 1.8, -2.2); shape.quadraticCurveTo(1.0, -1.2, 0, -1.2); shape.lineTo(0, 0);
  const wg = new THREE.ShapeGeometry(shape, 8); wg.rotateX(-Math.PI / 2); wg.scale(scale, scale, scale);
  const memb = new THREE.MeshStandardMaterial({ color: p.wing, side: THREE.DoubleSide, roughness: 0.5, emissive: new THREE.Color(p.wing).multiplyScalar(0.15), transparent: true, opacity: 0.95 });
  const wings = [];
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.6 * scale, 0.35 * scale, 0.2 * scale); segs[4].s.add(piv);
    const w = new THREE.Mesh(wg, memb); w.scale.x = sx; w.castShadow = true; piv.add(w);
    add(piv, new THREE.CylinderGeometry(0.05 * scale, 0.08 * scale, 3.7 * scale, 5), sp, sx * 1.8 * scale, 0.02, 0.45 * scale).rotation.set(0, -sx * 0.24, Math.PI / 2);
    wings.push({ piv, sx });
  }
  for (const i of [5, 10]) for (const sx of [-1, 1]) add(segs[i].s, new THREE.CapsuleGeometry(0.1 * scale, 0.4 * scale, 2, 6), sc, sx * 0.45 * scale, -0.45 * scale, 0).rotation.x = 1.0;
  add(segs[N - 1].s, new THREE.OctahedronGeometry(0.3 * scale, 0), sp, 0, 0, -0.3 * scale).scale.set(1, 0.3, 1.6);
  // saddle on segment 4
  const saddle = add(segs[4].s, new THREE.BoxGeometry(0.7 * scale, 0.15, 0.8 * scale), mat(0x6a3a1a, { roughness: 0.8 }), 0, 0.62 * scale, 0.1);
  add(saddle, new THREE.BoxGeometry(0.75 * scale, 0.05, 0.85 * scale), mat(0xd0a040, { metalness: 0.6 }), 0, 0.08, 0);
  return { segs, wings, jaw, N, spacing: 0.62 * scale, scale };
}

class Dragon {
  constructor(palette, home, scale = 1) {
    Object.assign(this, buildBody(palette, scale));
    this.name = palette.name; this.home = home.clone(); this.palette = palette;
    this.head = new THREE.Vector3(home.x + 3, home.y + 3, home.z);
    this.dir = new THREE.Vector3(1, 0, 0); this.speed = 0; this.flap = rand() * 6;
    this.trail = []; for (let k = 0; k < 200; k++) this.trail.push(this.head.clone().addScaledVector(this.dir, -k * 0.2));
    this.state = 'rest'; this.restA = rand() * 6.28; this.fireT = 0;
    DRAGONS.push(this);
  }
  // keep a trail of head positions; segments are laid along it
  layout(t) {
    const last = this.trail[0];
    if (last.distanceToSquared(this.head) > 0.0025) { this.trail.unshift(this.head.clone()); if (this.trail.length > 400) this.trail.pop(); }
    let seg = 0, acc = 0, prev = this.head;
    const place = (i, p, q) => { const s = this.segs[i].s; s.position.copy(p); s.lookAt(q); };
    this.segs[0].s.position.copy(this.head); this.segs[0].s.lookAt(_q.copy(this.head).add(this.dir));
    seg = 1;
    for (let k = 0; k < this.trail.length && seg < this.N; k++) {
      const p = this.trail[k], d = prev.distanceTo(p);
      if (acc + d >= this.spacing) {
        const f = (this.spacing - acc) / Math.max(d, 1e-5);
        const pos = _p.copy(prev).lerp(p, f);
        place(seg, pos, prev === this.head ? this.head : this.segs[seg - 1].s.position);
        prev = this.segs[seg].s.position; acc = 0; seg++; k--; continue;
      }
      acc += d; prev = p;
    }
    for (; seg < this.N; seg++) place(seg, _p.copy(this.segs[seg - 1].s.position).addScaledVector(this.dir, -this.spacing), this.segs[seg - 1].s.position);
    // wings
    this.flap += (0.8 + Math.min(this.speed, 30) * 0.08) * 0.05 * 60 * this._dt;
    const amp = this.state === 'glide' ? 0.15 : 0.75;
    for (const w of this.wings) w.piv.rotation.z = w.sx * (Math.sin(this.flap) * amp + 0.1);
    this.jaw.rotation.x = this.fireT > 0 ? 0.4 : 0;
  }
  update(dt, t) {
    this._dt = dt;
    if (this.state === 'rest') {           // lazy circles above the nest
      this.restA += dt * 0.35;
      const target = _t.set(this.home.x + Math.cos(this.restA) * 6, this.home.y + 4 + Math.sin(t * 0.6 + this.restA) * 1.2, this.home.z + Math.sin(this.restA) * 6);
      const want = target.sub(this.head).normalize();
      this.dir.lerp(want, Math.min(1, dt * 2)).normalize();
      this.speed = 4; this.head.addScaledVector(this.dir, this.speed * dt);
    } else if (this.state === 'return') {
      const to = _t.copy(this.home).add(_v.set(0, 5, 0)).sub(this.head); const d = to.length();
      this.dir.lerp(to.normalize(), Math.min(1, dt * 1.5)).normalize(); this.speed = 14;
      this.head.addScaledVector(this.dir, this.speed * dt);
      if (d < 4) this.state = 'rest';
    }
    if (this.fireT > 0) this.fireT -= dt;
    this.layout(t);
  }
  seat(out) { const s = this.segs[4].s; return out.copy(s.position).add(_v.set(0, 0.7 * this.scale, 0).applyQuaternion(s.quaternion)); }
  seatQuat() { return this.segs[4].s.quaternion; }
}
const _p = new THREE.Vector3(), _q = new THREE.Vector3(), _t = new THREE.Vector3(), _v = new THREE.Vector3();

export function buildDragons(nido) {
  nido.nests.forEach((n, i) => new Dragon(PALETTES[i % PALETTES.length], n, 1.15));
}
export function updateDragons(dt, t) { for (const d of DRAGONS) if (d.state !== 'ridden' && !d.pet) d.update(dt, t); }

// ---------- baby dragon pet ----------
export let PET = null;
const PET_PAL = { name: 'Chispa', body: 0xff8a2a, belly: 0xfff0a0, wing: 0xffb040, horn: 0xffffff, eye: 0x60ffff };
export function spawnPet(at) {
  if (PET) return PET;
  PET = new Dragon(PET_PAL, at, 0.32); PET.pet = true; PET.state = 'pet'; PET.cool = 0; PET.orbit = 0;
  PET.head.copy(at).add(new THREE.Vector3(0, 2, 0));
  for (const p of PET.trail) p.copy(PET.head);
  return PET;
}
// follow the hero, hover near enemies and spit small fireballs at them
export function updatePet(dt, t, heroPos, enemies, fire) {
  const d = PET; if (!d) return;
  d._dt = dt; d.orbit += dt * 0.9; d.cool -= dt;
  let target = null, td = 10;
  for (const e of enemies) { if (!e.alive) continue; const dd = e.pos.distanceTo(heroPos); if (dd < td) { td = dd; target = e; } }
  const goal = _t.copy(heroPos);
  if (target) goal.lerp(target.pos, 0.55).add(_v.set(Math.cos(d.orbit * 2) * 1.5, 2.4, Math.sin(d.orbit * 2) * 1.5));
  else goal.add(_v.set(Math.cos(d.orbit) * 1.6, 2.1 + Math.sin(t * 2) * 0.25, Math.sin(d.orbit) * 1.6));
  const to = _p.copy(goal).sub(d.head), dist = to.length();
  if (dist > 40) { d.head.copy(goal); for (const p of d.trail) p.copy(goal); }       // teleported with the hero
  const sp = Math.min(14, 2 + dist * 2.2);
  d.dir.lerp(to.normalize(), Math.min(1, dt * 4)).normalize(); d.speed = sp;
  d.head.addScaledVector(d.dir, Math.min(dist, sp * dt));
  if (target && d.cool <= 0 && td < 9) {
    d.cool = 1.4; d.fireT = 0.35;
    const aim = _q.copy(target.pos).add(_v.set(0, 0.8, 0)).sub(d.head).normalize();
    d.dir.copy(aim); fire(d.head.clone(), aim.clone(), target);
  }
  if (d.fireT > 0) d.fireT -= dt;
  d.layout(t);
}
export function nearestDragon(p, maxD = 6) {
  let best = null, bd = maxD;
  for (const d of DRAGONS) { if (d.state === 'ridden' || d.pet) continue; for (const s of d.segs.slice(0, 8)) { const dd = s.s.position.distanceTo(p); if (dd < bd) { bd = dd; best = d; } } }
  return best;
}
export { Dragon };
