const landingImages = [
  "/assets/images/vu-anh-TiVPTYCG_3E-unsplash.jpg",
  "/assets/images/abby-rurenko-uOYak90r4L0-unsplash.jpg",
  "/assets/images/breno-assis-r3WAWU5Fi5Q-unsplash.jpg",
  "/assets/images/pexels-chris-pennes-2148746480-32802992.jpg",
  "/assets/images/pexels-henry-c-wong-877975-15413617.jpg",
  "/assets/images/todd-kent-178j8tJrNlc-unsplash.jpg",
];

const SLIDE_INTERVAL_MS = 3800;

const initLandingHero = () => {
  if (!document.body.classList.contains("landing-page")) return;

  const layers = Array.from(document.querySelectorAll("[data-hero-layer]"));
  if (layers.length < 2 || landingImages.length === 0) return;

  landingImages.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  let currentImageIndex = 0;
  let activeLayer = 0;

  const setLayerImage = (layerIndex, imageIndex) => {
    const layer = layers[layerIndex];
    if (!layer) return;
    layer.src = landingImages[imageIndex];
  };

  setLayerImage(0, currentImageIndex);

  if (landingImages.length === 1) {
    layers[0].classList.add("is-active");
    layers[1].classList.remove("is-active");
    return;
  }

  setLayerImage(1, (currentImageIndex + 1) % landingImages.length);

  window.setInterval(() => {
    const nextImageIndex = (currentImageIndex + 1) % landingImages.length;
    const nextLayer = activeLayer === 0 ? 1 : 0;

    setLayerImage(nextLayer, nextImageIndex);
    layers[activeLayer].classList.remove("is-active");
    layers[nextLayer].classList.add("is-active");

    currentImageIndex = nextImageIndex;
    activeLayer = nextLayer;
  }, SLIDE_INTERVAL_MS);
};

window.addEventListener("DOMContentLoaded", initLandingHero);
