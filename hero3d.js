import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

export async function mountObjectScene({ container, canvas, rotationInput }) {
  if (!container || !canvas || !rotationInput) {
    throw new Error("Falta el contenedor o uno de los controles del modelo 3D.");
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  const isSmallScreen = window.matchMedia("(max-width: 640px)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmallScreen ? 1 : 1.35));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 50);
  camera.position.set(0, 0, 4.4);
  scene.add(new THREE.HemisphereLight("#e3f5cb", "#233521", 2.2));

  const keyLight = new THREE.DirectionalLight("#f4ffdf", 3.2);
  keyLight.position.set(-2.2, 3, 3.6);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight("#b2f457", 4.2, 10);
  rimLight.position.set(1.4, -0.5, -1.7);
  scene.add(rimLight);

  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  try {
    await MeshoptDecoder.ready;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync("./clubbb/assets/cogollo_chunks_opt.glb");
    const model = gltf.scene;

    const texture = await new THREE.TextureLoader().loadAsync("./clubbb/assets/cogollo_basecolor_2k.webp");
    texture.colorSpace = THREE.SRGBColorSpace;
    model.traverse((part) => {
      if (part.isMesh) {
        part.material = new THREE.MeshStandardMaterial({
          color: "#e7f1cf",
          map: texture,
          roughness: 0.44,
          metalness: 0.015,
        });
        part.castShadow = false;
        part.receiveShadow = false;
      }
    });

    modelGroup.add(model);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 2.5 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    model.rotation.x = -0.15;
    container.classList.add("model-ready");
    objectLoadLabel();
  } catch (error) {
    renderer.dispose();
    throw error;
  }

  function objectLoadLabel() {
    const loadButton = container.querySelector("#object-load");
    if (loadButton) loadButton.hidden = true;
  }

  let targetRotation = Math.PI;
  let pointerDown = false;
  let lastPointerX = 0;
  let scrollTarget = 0;
  let isVisible = true;
  let isPageActive = !document.hidden;
  const clock = new THREE.Clock();

  function updateSize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function renderFrame() {
    if (!isVisible || !isPageActive || document.hidden) return;
    requestAnimationFrame(renderFrame);

    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.elapsedTime;
    const easing = 1 - Math.exp(-4.3 * delta);
    modelGroup.rotation.y += (targetRotation + scrollTarget - modelGroup.rotation.y) * easing;
    modelGroup.rotation.x += ((pointerDown ? 0.1 : Math.sin(elapsed * 0.35) * 0.035) - modelGroup.rotation.x) * easing;
    const breathing = 1 + Math.sin(elapsed * 0.7) * 0.008;
    modelGroup.scale.setScalar(breathing);
    renderer.render(scene, camera);
  }

  function syncRotationFromSlider() {
    targetRotation = (Number(rotationInput.value) / 100) * Math.PI * 2;
  }

  function startDragging(event) {
    if (event.button !== undefined && event.button !== 0) return;
    pointerDown = true;
    lastPointerX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  }

  function dragModel(event) {
    if (!pointerDown) return;
    const movement = event.clientX - lastPointerX;
    lastPointerX = event.clientX;
    targetRotation += movement * 0.009;
    rotationInput.value = String(Math.round((((targetRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 100));
  }

  function stopDragging() {
    pointerDown = false;
  }

  function updateScrollRotation() {
    const bounds = container.getBoundingClientRect();
    const visibility = 1 - Math.min(1, Math.max(0, bounds.top) / Math.max(window.innerHeight, 1));
    scrollTarget = visibility * 0.2;
  }

  const sceneObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible) requestAnimationFrame(renderFrame);
  });
  sceneObserver.observe(container);

  const resizeObserver = new ResizeObserver(updateSize);
  resizeObserver.observe(container);
  document.addEventListener("visibilitychange", () => {
    isPageActive = !document.hidden;
    if (isPageActive && isVisible) requestAnimationFrame(renderFrame);
  });
  rotationInput.addEventListener("input", syncRotationFromSlider);
  canvas.addEventListener("pointerdown", startDragging);
  canvas.addEventListener("pointermove", dragModel);
  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointercancel", stopDragging);
  window.addEventListener("scroll", updateScrollRotation, { passive: true });
  window.addEventListener("resize", updateSize);

  syncRotationFromSlider();
  updateSize();
  updateScrollRotation();
  requestAnimationFrame(renderFrame);
}
