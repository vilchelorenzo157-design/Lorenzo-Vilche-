/* Hero 3D — cogollo que se ensambla desde 1.282 piezas siguiendo el scroll.
   Port vanilla de la experiencia premium (React Three Fiber → Three.js puro).

   Sistemas: chunks con vertex shader inyectado (DataTexture 3×1282, motas
   que se encogen hacia su pivot), tricomas instanciados que heredan la
   transformación de su chunk, rotación de reposo + respiración, drag limitado
   con resorte, parallax de cursor, entorno de estudio horneado y AgX.

   Fuente de verdad de la coreografía: export_web/README_HANDOFF.md.
   main.js escribe el objetivo de scroll en window.__cogolloEstado.objetivo. */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ============================================================
   ESTADO COMPARTIDO CON main.js
   ============================================================ */
const estado = { objetivo: 0 };
window.__cogolloEstado = estado;

/* ============================================================
   CALIBRACIÓN (un punto más oscura que la aprobada, pedido del cliente)
   ============================================================ */
const EXPOSICION = 0.94;
const AMBIENTE = 0.022;
const LUCES = [
  { pos: [-1.2616, 1.3971,  0.5591], color: [1.0, 0.975, 0.93], intensidad: 6.5, ancho: 1.8, alto: 1.8 }, // key
  { pos: [ 0.9366, 0.6434,  0.4335], color: [0.94, 0.96, 0.95], intensidad: 0.42, ancho: 2.6, alto: 2.6 }, // fill
  { pos: [ 0.1201, 1.2715, -1.1995], color: [1.0, 1.0, 1.0],    intensidad: 8,   ancho: 1.2, alto: 1.2 }, // rim
  { pos: [-0.5079, 0.3294, -1.3251], color: [0.55, 1.0, 0.62],  intensidad: 4,   ancho: 1.8, alto: 1.8 }, // contra verde
];
const CENTRO = new THREE.Vector3(0.0576, 0.5686, 0.1701);
const DAMPING_K = 2.2;
const ROT_RAD_S = 0.032;
const FACTOR_NORM = 0.0314027; // fragmentos.glb viene en escala Blender

/* ============================================================
   GLSL — idéntico al proyecto premium (chunkShader.ts)
   ============================================================ */
const SIMPLEX_3D = /* glsl */ `
vec3 cg_mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 cg_mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 cg_permute(vec4 x){ return cg_mod289(((x*34.0)+10.0)*x); }
vec4 cg_taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float cg_snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = cg_mod289(i);
  vec4 p = cg_permute(cg_permute(cg_permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = cg_taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const CHUNK_HELPERS = /* glsl */ `
#define CG_RADIO_DISPERSION 1.318914
#define CG_ANGULO_VOLTEO 2.2
#define CG_VENTANA 0.72
#define CG_DERIVA_AMP 0.081647
#define CG_DERIVA_ESC 1.432997
#define CG_DERIVA_VEL 0.1
#define CG_ESCALA_MOTA 0.15

float cg_smootherstep(float a, float b, float x){
  float t = clamp((x - a) / (b - a), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
mat3 cg_rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
mat3 cg_rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
mat3 cg_rotZ(float a){ float c=cos(a), s=sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }
vec3 cg_noise3(vec3 p){
  return vec3(
    cg_snoise(p),
    cg_snoise(p + vec3(31.7, 58.3, 12.9)),
    cg_snoise(p + vec3(74.1, 26.5, 89.2))
  );
}
void cg_chunkTransform(
  in float chunkId, in float uFactorV, in float uTimeV, in sampler2D tex,
  out mat3 outR, out vec3 outPivot, out vec3 outOff, out float outInv, out float outEsc
){
  int cid = int(chunkId + 0.5);
  vec4 t0 = texelFetch(tex, ivec2(0, cid), 0);
  vec4 t1 = texelFetch(tex, ivec2(1, cid), 0);
  vec4 t2 = texelFetch(tex, ivec2(2, cid), 0);
  float easeGlobal = cg_smootherstep(0.0, 1.0, uFactorV);
  float facChunk   = cg_smootherstep(t1.w, t1.w + CG_VENTANA, easeGlobal);
  float inv        = 1.0 - facChunk;
  vec3 e = t2.xyz * CG_ANGULO_VOLTEO * inv;
  mat3 Re = cg_rotZ(e.z) * cg_rotY(e.y) * cg_rotX(e.x);
  mat3 C  = cg_rotX(-1.57079632679);
  mat3 R  = C * Re * transpose(C);
  vec3 drift = cg_noise3(t0.xyz * CG_DERIVA_ESC + uTimeV * CG_DERIVA_VEL)
             * CG_DERIVA_AMP * inv;
  vec3 off = t1.xyz * (t0.w * CG_RADIO_DISPERSION) * inv + drift;
  outR = R; outPivot = t0.xyz; outOff = off; outInv = inv;
  outEsc = mix(1.0, CG_ESCALA_MOTA, inv);
}
`;

const INJECT_DECL = `
attribute float _chunkid;
uniform sampler2D uChunkTex;
uniform float uFactor;
uniform float uTime;
${SIMPLEX_3D}
${CHUNK_HELPERS}
`;

const INJECT_NORMAL = `
mat3 cgR; vec3 cgPivot; vec3 cgOff; float cgInv; float cgEsc;
cg_chunkTransform(_chunkid, uFactor, uTime, uChunkTex, cgR, cgPivot, cgOff, cgInv, cgEsc);
objectNormal = cgR * objectNormal;
`;

const INJECT_POSITION = `
transformed = cgR * ((transformed - cgPivot) * cgEsc) + cgPivot + cgOff;
`;

const TRICOMA_VERT = `
${SIMPLEX_3D}
${CHUNK_HELPERS}
attribute vec3 aPos;
attribute vec3 aNrm;
attribute vec2 aDatos;
uniform sampler2D uChunkTex;
uniform float uFactor;
uniform float uTime;
uniform float uEscala;
varying vec3 vN;
varying vec3 vView;
varying float vFogDepth;
void main() {
  vec3 N = normalize(aNrm);
  vec3 ref = abs(N.y) < 0.98 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 T = normalize(cross(ref, N));
  vec3 B = cross(N, T);
  mat3 TBN = mat3(T, N, B);
  vec3 local = TBN * (position * aDatos.y * uEscala);
  vec3 p = aPos + local;
  vec3 n = TBN * normal;
  mat3 R; vec3 pivot; vec3 off; float inv; float esc;
  cg_chunkTransform(aDatos.x, uFactor, uTime, uChunkTex, R, pivot, off, inv, esc);
  p = R * ((p - pivot) * esc) + pivot + off;
  n = R * n;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * n);
  vView = -mv.xyz;
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const TRICOMA_FRAG = `
uniform vec3 uColor;
uniform vec3 uKeyDir;
uniform vec3 fogColor;
uniform float fogDensity;
varying vec3 vN;
varying vec3 vView;
varying float vFogDepth;
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(vView);
  float lambert = 0.3 + 0.7 * max(dot(N, uKeyDir), 0.0);
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 col = uColor * lambert + vec3(0.9, 0.95, 0.9) * fresnel * 0.35;
  gl_FragColor = vec4(col, 1.0);
  float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, clamp(fogFactor, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/* ============================================================
   ARRANQUE
   ============================================================ */
const contenedor = document.getElementById('escena');
const hero = document.getElementById('inicio');
const pantallaCarga = document.getElementById('carga');
const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const movil = window.matchMedia('(pointer: coarse)').matches;

function usarFallback() {
  hero.classList.add('sin-webgl');
  pantallaCarga.classList.add('listo');
  const video = document.getElementById('escena-video');
  if (video && !video.src) {
    video.src = video.dataset.src;
    video.play().catch(() => {});
  }
}

if (reducirMovimiento) {
  usarFallback();
} else {
  iniciar().catch((err) => {
    console.error('hero 3D:', err);
    usarFallback();
  });
}

/* RNG determinístico (seed 21, spec del handoff) */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Fronteras de chunk: triángulos con vértices de chunks distintos se
   estiran al dispersarse → des-indexar y forzar chunkid por triángulo. */
function repararFronteras(geo) {
  const noIdx = geo.index ? geo.toNonIndexed() : geo;
  const cid = noIdx.attributes._chunkid;
  if (!cid) return noIdx;
  const arr = cid.array;
  for (let t = 0; t < arr.length; t += 3) {
    const a = arr[t], b = arr[t + 1], c = arr[t + 2];
    if (a !== b || b !== c) arr[t] = arr[t + 1] = arr[t + 2] = b === c ? b : a;
  }
  cid.needsUpdate = true;
  return noIdx;
}

async function iniciar() {
  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, movil ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = EXPOSICION;
  contenedor.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(new THREE.Color('#061009'), 0.05);

  const camera = new THREE.PerspectiveCamera(16, innerWidth / innerHeight, 0.01, 100);

  /* ---------- entorno de estudio (replica las áreas del render) ---------- */
  {
    const estudio = new THREE.Scene();
    estudio.background = new THREE.Color('#020302');
    const panel = (color, intensidad, escala, pos) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(escala[0], escala[1]),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensidad), side: THREE.DoubleSide }),
      );
      m.position.set(...pos);
      m.lookAt(0.06, 0.57, 0.17);
      estudio.add(m);
    };
    panel('#fff2e0', 5,    [3.2, 3.2], [-2.6, 2.8, 1.4]);  // key cálida
    panel('#ffffff', 3,    [2.4, 2.4], [0.3, 2.6, -2.8]);  // rim
    panel('#7dff96', 1.6,  [2.6, 2.0], [-1.2, 0.5, -2.8]); // contraluz verde
    panel('#dfe9ff', 0.4,  [3.0, 3.0], [2.6, 1.0, 1.2]);   // relleno tenue
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(estudio, 0.04).texture;
    pmrem.dispose();
  }

  /* ---------- luces de área ---------- */
  RectAreaLightUniformsLib.init();
  scene.add(new THREE.AmbientLight(0x16301f, AMBIENTE));
  for (const l of LUCES) {
    const luz = new THREE.RectAreaLight(
      new THREE.Color(l.color[0], l.color[1], l.color[2]), l.intensidad, l.ancho, l.alto,
    );
    luz.position.set(...l.pos);
    luz.lookAt(CENTRO.x, CENTRO.y, CENTRO.z);
    scene.add(luz);
  }

  /* ---------- datos de chunks → DataTexture ---------- */
  const meta = await fetch('assets/chunks_meta.json').then((r) => {
    if (!r.ok) throw new Error('chunks_meta HTTP ' + r.status);
    return r.json();
  });
  const n = meta.num_chunks;
  const datos = new Float32Array(3 * n * 4);
  for (let i = 0; i < n; i++) {
    const o = i * 12;
    const p = meta.pivots[i], d = meta.dirs[i], e = meta.eulers_blender[i];
    datos[o] = p[0]; datos[o + 1] = p[1]; datos[o + 2] = p[2]; datos[o + 3] = meta.radios[i];
    datos[o + 4] = d[0]; datos[o + 5] = d[1]; datos[o + 6] = d[2]; datos[o + 7] = meta.delays[i];
    datos[o + 8] = e[0]; datos[o + 9] = e[1]; datos[o + 10] = e[2]; datos[o + 11] = 0;
  }
  const chunkTex = new THREE.DataTexture(datos, 3, n, THREE.RGBAFormat, THREE.FloatType);
  chunkTex.minFilter = chunkTex.magFilter = THREE.NearestFilter;
  chunkTex.generateMipmaps = false;
  chunkTex.needsUpdate = true;

  const uniforms = {
    uFactor: { value: 0 },
    uTime: { value: 0 },
    uChunkTex: { value: chunkTex },
  };

  /* ---------- texturas ---------- */
  const tl = new THREE.TextureLoader();
  const [basecolor, normalMap, roughMap, aoMap] = await Promise.all([
    tl.loadAsync('assets/cogollo_basecolor_2k.webp'),
    tl.loadAsync('assets/cogollo_normal_1k.webp'),
    tl.loadAsync('assets/cogollo_roughness_1k.webp'),
    tl.loadAsync('assets/cogollo_ao_1k.webp'),
  ]);
  for (const t of [basecolor, normalMap, roughMap, aoMap]) {
    t.flipY = false;
    t.anisotropy = 8;
  }
  basecolor.colorSpace = THREE.SRGBColorSpace;

  /* ---------- GLB (meshopt) con barra de progreso ---------- */
  const barra = document.getElementById('progreso');
  const pct = document.getElementById('porcentaje');
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await new Promise((res, rej) => {
    loader.load('assets/cogollo_chunks_opt.glb', res, (e) => {
      if (!e.lengthComputable) return;
      const p = Math.round((e.loaded / e.total) * 100);
      if (barra) barra.style.right = 100 - p + '%';
      if (pct) pct.textContent = p + '%';
    }, rej);
  });
  const frag = await new Promise((res, rej) => loader.load('assets/fragmentos.glb', res, undefined, rej));

  let geoCruda = null;
  gltf.scene.traverse((o) => { if (o.isMesh && !geoCruda) geoCruda = o.geometry; });
  const geometria = repararFronteras(geoCruda);
  if (geometria.attributes.uv && !geometria.attributes.uv1) {
    geometria.setAttribute('uv1', geometria.attributes.uv);
  }
  geometria.computeBoundingSphere();

  /* ---------- material del cogollo (physical + inyección) ---------- */
  const material = new THREE.MeshPhysicalMaterial({
    map: basecolor,
    normalMap,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: roughMap,
    aoMap,
    aoMapIntensity: 1,
    metalness: 0,
    roughness: 1,
    clearcoat: 0.22,
    clearcoatRoughness: 0.55,
    envMapIntensity: 0.5,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFactor = uniforms.uFactor;
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uChunkTex = uniforms.uChunkTex;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + INJECT_DECL)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + INJECT_NORMAL)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + INJECT_POSITION);
  };
  material.customProgramCacheKey = () => 'cogollo-chunks-web';

  const mesh = new THREE.Mesh(geometria, material);
  mesh.frustumCulled = false;

  /* ---------- tricomas instanciados ---------- */
  let triMesh = null;
  {
    let triGeo = null;
    let triColor = new THREE.Color('#dfe5d8');
    frag.scene.traverse((o) => {
      if (o.isMesh && o.name.includes('Tricoma')) {
        triGeo = o.geometry;
        if (o.material && o.material.color) triColor = o.material.color.clone();
      }
    });
    if (triGeo) {
      const cantidad = movil ? 2000 : 5859;
      const pos = geometria.attributes.position;
      const nrm = geometria.attributes.normal;
      const cid = geometria.attributes._chunkid;
      const rng = mulberry32(21);
      const aPos = new Float32Array(cantidad * 3);
      const aNrm = new Float32Array(cantidad * 3);
      const aDatos = new Float32Array(cantidad * 2);
      for (let i = 0; i < cantidad; i++) {
        const v = Math.floor(rng() * pos.count);
        aPos[i * 3] = pos.getX(v); aPos[i * 3 + 1] = pos.getY(v); aPos[i * 3 + 2] = pos.getZ(v);
        aNrm[i * 3] = nrm.getX(v); aNrm[i * 3 + 1] = nrm.getY(v); aNrm[i * 3 + 2] = nrm.getZ(v);
        aDatos[i * 2] = cid.getX(v);
        aDatos[i * 2 + 1] = 0.45 + rng() * 0.5;
      }
      const geoInst = new THREE.InstancedBufferGeometry();
      geoInst.index = triGeo.index;
      geoInst.setAttribute('position', triGeo.attributes.position);
      geoInst.setAttribute('normal', triGeo.attributes.normal);
      geoInst.instanceCount = cantidad;
      geoInst.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3));
      geoInst.setAttribute('aNrm', new THREE.InstancedBufferAttribute(aNrm, 3));
      geoInst.setAttribute('aDatos', new THREE.InstancedBufferAttribute(aDatos, 2));
      const matTri = new THREE.ShaderMaterial({
        vertexShader: TRICOMA_VERT,
        fragmentShader: TRICOMA_FRAG,
        uniforms: {
          uChunkTex: uniforms.uChunkTex,
          uFactor: uniforms.uFactor,
          uTime: uniforms.uTime,
          uEscala: { value: FACTOR_NORM },
          uColor: { value: triColor },
          uKeyDir: { value: new THREE.Vector3(-0.6, 0.5, 0.35).normalize() },
          fogColor: { value: new THREE.Color('#061009') },
          fogDensity: { value: 0.05 },
        },
      });
      triMesh = new THREE.Mesh(geoInst, matTri);
      triMesh.frustumCulled = false;
    }
  }

  /* ---------- jerarquía: rotación/respiración alrededor del centro ---------- */
  const gParallax = new THREE.Group();
  const gRotacion = new THREE.Group();
  const gRespira = new THREE.Group();
  const gOffset = new THREE.Group();
  gOffset.position.copy(CENTRO).negate();
  gOffset.add(mesh);
  if (triMesh) gOffset.add(triMesh);
  gRespira.add(gOffset);
  gRotacion.add(gRespira);
  gParallax.add(gRotacion);
  gParallax.position.copy(CENTRO);
  scene.add(gParallax);

  /* ---------- cámara: encuadre sobre la dirección art-dirigida ---------- */
  const radio = geometria.boundingSphere.radius;
  const dirCam = new THREE.Vector3(-2.0435, -0.0147, 9.9595).normalize();
  const dist = (radio / Math.sin((16 * Math.PI) / 180 / 2)) * 1.3;
  camera.position.copy(CENTRO).addScaledVector(dirCam, dist);
  camera.lookAt(CENTRO);

  /* ---------- interacción: drag limitado + parallax ---------- */
  const drag = { activo: false, objX: 0, objY: 0, actX: 0, actY: 0, parX: 0, parY: 0 };
  const puedeArrastrar = () => uniforms.uFactor.value > 0.85;
  const lienzo = renderer.domElement;
  lienzo.style.touchAction = 'pan-y';

  lienzo.addEventListener('pointerdown', (e) => {
    if (!puedeArrastrar()) return;
    drag.activo = true;
    lienzo.setPointerCapture(e.pointerId);
    lienzo.style.cursor = 'grabbing';
  });
  window.addEventListener('pointermove', (e) => {
    drag.parY = (e.clientX / innerWidth - 0.5) * 2 * 0.018;
    drag.parX = (e.clientY / innerHeight - 0.5) * 2 * 0.018;
    if (!drag.activo) {
      lienzo.style.cursor = puedeArrastrar() ? 'grab' : '';
      return;
    }
    drag.objY = THREE.MathUtils.clamp(drag.objY + e.movementX * 0.0035, -0.55, 0.55);
    drag.objX = THREE.MathUtils.clamp(drag.objX + e.movementY * 0.002, -0.22, 0.22);
  });
  window.addEventListener('pointerup', (e) => {
    drag.activo = false;
    try { lienzo.releasePointerCapture(e.pointerId); } catch {}
    lienzo.style.cursor = puedeArrastrar() ? 'grab' : '';
  });

  /* ---------- post: bloom sutil + AgX en OutputPass ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight), 0.26, 0.8, 0.86,
  ));
  composer.addPass(new OutputPass());

  pantallaCarga.classList.add('listo');

  /* ---------- solo renderizar con el hero a la vista ---------- */
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 }).observe(hero);

  /* ---------- ruido 1D barato para la respiración ---------- */
  const ruido1D = (t) =>
    Math.sin(t * 2.1) * 0.55 + Math.sin(t * 0.73 + 1.7) * 0.3 + Math.sin(t * 3.7 + 4.1) * 0.15;

  const reloj = new THREE.Clock();
  function animar() {
    requestAnimationFrame(animar);
    if (!visible) return;
    const delta = Math.min(reloj.getDelta(), 0.1);
    const t = reloj.elapsedTime;

    uniforms.uTime.value = t;
    const f = uniforms.uFactor.value;
    uniforms.uFactor.value = f + (estado.objetivo - f) * (1 - Math.exp(-DAMPING_K * delta));

    // drag con resorte; al soltar vuelve muy lento al reposo
    if (!drag.activo) {
      const volver = 1 - Math.exp(-0.5 * delta);
      drag.objX -= drag.objX * volver;
      drag.objY -= drag.objY * volver;
    }
    const seguir = 1 - Math.exp(-5 * delta);
    drag.actX += (drag.objX - drag.actX) * seguir;
    drag.actY += (drag.objY - drag.actY) * seguir;

    gRotacion.rotation.y = ROT_RAD_S * t + drag.actY;
    gRotacion.rotation.x = drag.actX;

    const kPar = 1 - Math.exp(-2.5 * delta);
    gParallax.rotation.y += (drag.parY - gParallax.rotation.y) * kPar;
    gParallax.rotation.x += (drag.parX - gParallax.rotation.x) * kPar;

    const s = gRespira.scale;
    s.x = 1 + 0.012 * ruido1D(t / 2.3);
    s.y = 1 + 0.012 * ruido1D(t / 2.3 + 7.3);
    s.z = 1 + 0.012 * ruido1D(t / 2.3 + 14.6);

    composer.render();
  }
  animar();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });
}
