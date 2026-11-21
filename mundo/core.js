// Core: renderer, scene, sky, clouds, lights, utilities shared by every module.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';

export const params = new URLSearchParams(location.search);

// ---------- seeded random ----------
let _seed = 1337;
export function rand() {
  _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rr = (a, b) => a + (b - a) * rand();
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];
export const simplex = new SimplexNoise({ random: rand });
export const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// ---------- renderer ----------
export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
export const LOW = matchMedia('(pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.25 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xc77a7a, 0.0026);

export const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 2600);
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3;
controls.maxDistance = 400;
controls.maxPolarAngle = Math.PI * 0.6;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;

// ---------- glsl noise ----------
export const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// ---------- time of day ----------
export const PAL = {
  dusk:  { top: new THREE.Color(0x2a0f52), mid: new THREE.Color(0xb8467a), hor: new THREE.Color(0xffa060), low: new THREE.Color(0x3a1440),
           fog: new THREE.Color(0xc77a7a), sun: 3.0, sunCol: new THREE.Color(0xffb27a), hemi: 0.95,
           cloudLit: new THREE.Color(0xe8a3a8), cloudShadow: new THREE.Color(0x5a2f68) },
  night: { top: new THREE.Color(0x02030c), mid: new THREE.Color(0x0b0f33), hor: new THREE.Color(0x30245e), low: new THREE.Color(0x05030c),
           fog: new THREE.Color(0x1c1840), sun: 0.55, sunCol: new THREE.Color(0x8aa6ff), hemi: 0.4,
           cloudLit: new THREE.Color(0x6a73b8), cloudShadow: new THREE.Color(0x14123a) },
};
export const world = { mode: params.has('night') ? 1 : 0, modeTarget: params.has('night') ? 1 : 0, time: 0 };

// ---------- sky ----------
const skyU = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() },
  low: { value: new THREE.Color() }, stars: { value: 0 }, time: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform vec3 top, mid, hor, low; uniform float stars, time; varying vec3 vDir;
    float hash(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    void main(){
      float y = vDir.y;
      vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, y));
      c = mix(c, top, smoothstep(0.15, 0.7, y));
      c = mix(c, low, smoothstep(0.0, -0.25, y));
      vec3 sunDir = normalize(vec3(-0.95, 0.1, -0.1));
      float s = max(dot(vDir, sunDir), 0.0);
      c += vec3(1.0,0.55,0.3) * (pow(s, 12.0)*0.6 + pow(s, 400.0)*2.0) * (1.0 - stars);
      vec3 g = floor(vDir * 260.0); float h = hash(g);
      float st = step(0.9965, h) * smoothstep(0.02, 0.35, y);
      c += vec3(1.0,0.95,0.9) * st * (0.6 + 0.4*sin(time*2.0 + h*80.0)) * (0.25 + stars*2.2);
      // aurora at night
      float au = smoothstep(0.15, 0.45, y) * smoothstep(0.85, 0.45, y);
      float band = sin(vDir.x*6.0 + time*0.15 + sin(vDir.z*4.0 + time*0.1)*2.0)*0.5+0.5;
      c += mix(vec3(0.1,1.0,0.6), vec3(0.6,0.2,1.0), band) * au * pow(band, 3.0) * stars * 0.35;
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
scene.add(sky);

// ---------- lights ----------
export const hemi = new THREE.HemisphereLight(0xffc0d8, 0x40204a, 0.95);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xffb27a, 3.0);
export const SUN_OFFSET = new THREE.Vector3(-40, 16, -4);
sun.castShadow = true;
sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0x7a8cff, 0.6);
rim.position.set(30, 12, 25);
scene.add(rim);

// ---------- cloud sea ----------
const cloudU = { time: { value: 0 }, lit: { value: new THREE.Color() }, shadow: { value: new THREE.Color() },
  fogC: { value: new THREE.Color() }, fogD: { value: 0.0026 }, sunDir: { value: SUN_OFFSET.clone().normalize() } };
const cloudGeo = new THREE.PlaneGeometry(1600, 1600, 280, 280);
cloudGeo.rotateX(-Math.PI / 2);
const clouds = new THREE.Mesh(cloudGeo, new THREE.ShaderMaterial({
  uniforms: cloudU, fog: false,
  vertexShader: NOISE + `
    uniform float time; varying vec3 vWorld; varying vec3 vN; varying float vH;
    float hgt(vec2 p){
      vec2 q = p*0.03 + vec2(time*0.008, time*0.004);
      float h = snoise(vec3(q, time*0.008))*0.6 + snoise(vec3(q*2.3, 1.7))*0.28 + snoise(vec3(q*5.1, 3.1))*0.12;
      return pow(max(h*0.5+0.55, 0.0), 1.8) * 12.0;
    }
    void main(){
      vec3 p = position; float h = hgt(p.xz); p.y += h; vH = h/12.0;
      float e = 1.0;
      vec3 dx = vec3(e, hgt(p.xz+vec2(e,0.0))-h, 0.0); vec3 dz = vec3(0.0, hgt(p.xz+vec2(0.0,e))-h, e);
      vN = normalize(cross(dz, dx));
      vec4 w = modelMatrix*vec4(p,1.0); vWorld = w.xyz; gl_Position = projectionMatrix*viewMatrix*w;
    }`,
  fragmentShader: `
    uniform vec3 lit, shadow, fogC, sunDir; uniform float fogD; varying vec3 vWorld; varying vec3 vN; varying float vH;
    void main(){
      float d = max(dot(normalize(vN), normalize(sunDir)), 0.0);
      vec3 c = mix(shadow, lit, clamp(d*0.85 + vH*0.45, 0.0, 1.0));
      c *= 0.85 + 0.3*smoothstep(0.2, 0.9, vH);
      vec3 V = normalize(cameraPosition - vWorld);
      c += lit * pow(1.0 - max(dot(V, normalize(vN)), 0.0), 3.0) * 0.25;
      float dist = length(cameraPosition - vWorld);
      gl_FragColor = vec4(mix(c, fogC, 1.0 - exp(-pow(dist*fogD, 2.0))), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
clouds.position.y = -26;
scene.add(clouds);

// ---------- post ----------
const msaaTarget = new THREE.WebGLRenderTarget(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: 4 });
export const composer = new EffectComposer(renderer, msaaTarget);
composer.addPass(new RenderPass(scene, camera));
export const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.5, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());
// cinematic grade: gentle S-curve, warm highlights / cool shadows, vignette, fine grain
export const gradePass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, night: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, night; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299,0.587,0.114));
      c = mix(c, c*c*(3.0-2.0*c), 0.35);                                   // contrast curve
      c += mix(vec3(0.03,0.0,0.05), vec3(-0.01,0.01,0.05), night) * (1.0-l); // tinted shadows
      c += vec3(0.04,0.02,-0.02) * l * (1.0-night);                         // warm highlights
      c = mix(vec3(l), c, 1.12);                                            // a bit more saturation
      vec2 d = vUv - 0.5; c *= 1.0 - dot(d,d)*0.75;                         // vignette
      c += (rnd(vUv*vec2(1920.0,1080.0)) - 0.5) * 0.025;                    // grain
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(gradePass);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// ---------- per-frame environment update ----------
const lc = (out, a, b, t) => out.copy(a).lerp(b, t);
export function updateEnvironment(dt, t) {
  world.mode += (world.modeTarget - world.mode) * Math.min(1, dt * 1.0);
  const m = world.mode, A = PAL.dusk, B = PAL.night;
  lc(skyU.top.value, A.top, B.top, m); lc(skyU.mid.value, A.mid, B.mid, m);
  lc(skyU.hor.value, A.hor, B.hor, m); lc(skyU.low.value, A.low, B.low, m);
  skyU.stars.value = m; skyU.time.value = t;
  lc(scene.fog.color, A.fog, B.fog, m); cloudU.fogC.value.copy(scene.fog.color);
  lc(cloudU.lit.value, A.cloudLit, B.cloudLit, m); lc(cloudU.shadow.value, A.cloudShadow, B.cloudShadow, m);
  sun.intensity = THREE.MathUtils.lerp(A.sun, B.sun, m); lc(sun.color, A.sunCol, B.sunCol, m);
  hemi.intensity = THREE.MathUtils.lerp(A.hemi, B.hemi, m);
  cloudU.time.value = t;
  WIND.time.value = t;
  gradePass.uniforms.time.value = t % 100; gradePass.uniforms.night.value = m;
  updatePuffs(dt, t, m);
  // shadows follow what we look at
  sun.target.position.copy(controls.target);
  sun.position.copy(controls.target).add(SUN_OFFSET);
}

// ---------- instancing helper ----------
const buckets = new Map();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export function mat4(x, y, z, ry = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _s.set(sx, sy, sz); _p.set(x, y, z);
  return _m.compose(_p, _q, _s).clone();
}
export function inst(key, geo, mat, matrix, color = null, cast = true) {
  let b = buckets.get(key);
  if (!b) { b = { geo, mat, list: [], cast }; buckets.set(key, b); }
  b.list.push({ m: matrix, c: color });
}
export function flushInstances() {
  const white = new THREE.Color(1, 1, 1);
  for (const b of buckets.values()) {
    const im = new THREE.InstancedMesh(b.geo, b.mat, b.list.length);
    const anyColor = b.list.some(e => e.c);
    b.list.forEach((e, i) => { im.setMatrixAt(i, e.m); if (anyColor) im.setColorAt(i, e.c || white); });
    im.castShadow = b.cast; im.receiveShadow = true;
    scene.add(im);
  }
  buckets.clear();
}

// ---------- shared materials ----------
export const MAT = {
  std: (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }),
};
export const windowMat = new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffb84d, emissiveIntensity: 0.6 });
export const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffaa44, emissiveIntensity: 1.2 });

// ---------- wind: makes any material sway (grass, leaves, crops) ----------
export const WIND = { time: { value: 0 } };
export function addWind(material, strength = 0.5, heightScale = 1) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WIND.time; sh.uniforms.uWind = { value: strength };
    sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec4 wOrigin = modelMatrix * instanceMatrix * vec4(0.0,0.0,0.0,1.0);
      #else
        vec4 wOrigin = modelMatrix * vec4(0.0,0.0,0.0,1.0);
      #endif
      float wh = max(position.y * ${heightScale.toFixed(3)}, 0.0);
      float gust = 0.6 + 0.4 * sin(uTime*0.35 + wOrigin.x*0.05);
      transformed.x += (sin(uTime*1.7 + wOrigin.x*0.35 + wOrigin.z*0.27) + 0.5*sin(uTime*3.1 + wOrigin.z*0.9)) * wh * wh * uWind * gust;
      transformed.z += cos(uTime*1.3 + wOrigin.z*0.4 + wOrigin.x*0.2) * 0.6 * wh * wh * uWind * gust;`);
  };
  material.customProgramCacheKey = () => 'wind' + strength + '_' + heightScale;
  return material;
}

// ---------- soft cloud puffs drifting between the islands ----------
const puffs = [];
export function buildPuffs(texture) {
  for (let i = 0; i < 55; i++) {
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: rr(0.25, 0.55), fog: true });
    const s = new THREE.Sprite(mat);
    const a = rand() * Math.PI * 2, r = rr(50, 240);
    s.position.set(Math.cos(a) * r, rr(-18, -3), Math.sin(a) * r);
    const sc = rr(10, 26); s.scale.set(sc * 1.6, sc, 1);
    s.userData = { a, r, sp: rr(0.004, 0.012) * (rand() < 0.5 ? 1 : -1), y: s.position.y, ph: rand() * 6 };
    scene.add(s); puffs.push(s);
  }
}
const puffDusk = new THREE.Color(0xffd6d0), puffNight = new THREE.Color(0x6a70b0);
function updatePuffs(dt, t, m) {
  for (const p of puffs) {
    const u = p.userData; u.a += u.sp * dt;
    p.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 0.1 + u.ph) * 0.8, Math.sin(u.a) * u.r);
    p.material.color.copy(puffDusk).lerp(puffNight, m);
  }
}
