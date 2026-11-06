const progressBar = document.querySelector(".scroll-progress");
const yearLabel = document.querySelector("#current-year");
const revealItems = document.querySelectorAll(".reveal");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const thisYear = new Date().getFullYear();

yearLabel.textContent = thisYear;
document.querySelector("#current-year-short").textContent = String(thisYear).slice(-2);

function updateScrollProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = `${maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0}%`;
}

window.addEventListener("scroll", updateScrollProgress, { passive: true });
window.addEventListener("resize", updateScrollProgress);
updateScrollProgress();

if ("IntersectionObserver" in window && !reduceMotion.matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -24px 0px" });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

if (finePointer.matches && !reduceMotion.matches) {
  const glow = document.querySelector(".cursor-glow");
  let pointerFrame = 0;
  document.body.classList.add("has-cursor");

  window.addEventListener("pointermove", (event) => {
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
      pointerFrame = 0;
    });
  }, { passive: true });
}

const objectContainer = document.querySelector("#hero-object");
const objectCanvas = document.querySelector("#object-canvas");
const rotationSlider = document.querySelector("#object-rotation");
const objectLoadButton = document.querySelector("#object-load");
let startObjectScene;

function loadObjectScene() {
  if (!startObjectScene) {
    startObjectScene = import("./hero3d.js")
      .then(({ mountObjectScene }) => mountObjectScene({
        container: objectContainer,
        canvas: objectCanvas,
        rotationInput: rotationSlider,
      }))
      .catch((error) => {
        console.error("No se pudo cargar el modelo 3D; se mantiene la imagen de respaldo.", error);
        startObjectScene = undefined;
        objectContainer.classList.add("model-unavailable");
        objectContainer.querySelector(".object-rotation").hidden = true;
        objectLoadButton.hidden = !(canRender3d && "WebGL2RenderingContext" in window);
      });
  }
  return startObjectScene;
}

const supportsWebGL2 = (() => {
  try {
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
})();

const canRender3d = (() => {
  if (reduceMotion.matches || navigator.connection?.saveData) return false;
  const connectionType = navigator.connection?.effectiveType;
  return supportsWebGL2 && connectionType !== "slow-2g" && connectionType !== "2g";
})();

objectLoadButton.addEventListener("click", () => {
  objectLoadButton.hidden = true;
  objectContainer.classList.remove("model-unavailable");
  objectContainer.querySelector(".object-rotation").hidden = false;
  loadObjectScene();
});

if (canRender3d && "IntersectionObserver" in window) {
  const heroObserver = new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      loadObjectScene();
    }
  }, { rootMargin: "140px 0px" });
  heroObserver.observe(objectContainer);
} else if (supportsWebGL2 && !reduceMotion.matches) {
  objectLoadButton.hidden = false;
} else {
  objectContainer.classList.add("model-unavailable");
  objectContainer.querySelector(".object-rotation").hidden = true;
}
