const detailsRoot = document.getElementById("property-details-root");
const toCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const getImageDocuments = (property = {}) => {
  const docs = Array.isArray(property.documents) ? property.documents : [];
  return docs.filter((doc) => String(doc?.mimeType || "").toLowerCase().startsWith("image/") && doc?.filePath);
};

const getDocumentTypeLabel = (doc = {}) => {
  const mime = String(doc.mimeType || "").toLowerCase();
  const kind = String(doc.kind || "").toUpperCase();

  if (kind === "CERTIFICATE") return "CERT";
  if (mime.includes("pdf")) return "PDF";
  if (mime.startsWith("image/")) return "";
  return "DOC";
};

const getPropertyStatusClass = (status = "") => {
  const normalized = String(status).toLowerCase();
  if (normalized === "sold") return "sold";
  if (normalized === "pending request") return "pending";
  return "available";
};

const resolveImageUrl = (image) => {
  if (!image) return "";
  if (typeof image === "string") {
    return image.startsWith("http") ? image : `${SERVER_URL}${image}`;
  }

  const path = image.filePath || image.url || image.src;
  if (!path) return "";
  return path.startsWith("http") ? path : `${SERVER_URL}${path}`;
};

const renderDetailsSlider = (property) => {
  const images = Array.isArray(property?.images) ? property.images : [];

  const isVerified = property?.approval?.status === "Approved";
  const verificationBadge = `
    <span class="badge overlay-badge ${isVerified ? "verified" : ""}" style="margin-bottom: 5px; display: inline-block;">
      ${isVerified ? "✓ Verified" : property?.approval?.status || "Pending Verification"}
    </span>
  `;

  const marketBadge = property?.isOpenForSale
    ? `<span class="badge" style="background: var(--success); color: white; border: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">🟢 For Sale</span>`
    : `<span class="badge" style="background: #64748b; color: white; border: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">🔴 Off Market</span>`;

  const badgesHtml = `
    <div class="property-badge-overlay" style="top: 16px; left: 16px; display: flex; flex-direction: column; align-items: flex-start;">
      ${verificationBadge}
      ${marketBadge}
    </div>
  `;

  if (!images || images.length === 0) {
    return `<div class="details-slider-container" style="display:flex; align-items:center; justify-content:center; background:#f1f5f9;">
              ${badgesHtml}
              <span style="color:var(--muted); font-weight:600;">No Images Available</span>
            </div>`;
  }

  // Track + clone for seamless looping
  return `
    <div class="details-slider-container" id="property-slider" data-index="0" data-total="${images.length}" data-animating="false">
      ${badgesHtml}

      <div class="details-slider-track" id="slider-track" style="transform: translateX(0%);">
        ${images.map((url) => `<img class="details-slide" src="${url}" alt="Property View" loading="lazy" />`).join("")}
        <img class="details-slide" src="${images[0]}" aria-hidden="true" loading="lazy" />
      </div>

      <button class="slider-btn slider-prev" type="button" aria-label="Previous image">&#10094;</button>
      <button class="slider-btn slider-next" type="button" aria-label="Next image">&#10095;</button>

      <div class="details-dots" id="slider-dots">
        ${images
          .map((_, i) => `<div class="details-dot ${i === 0 ? "active" : ""}" data-slide-to="${i}"></div>`)
          .join("")}
      </div>
    </div>
  `;
};

const initDetailsSlider = () => {
  const slider = document.getElementById("property-slider");
  if (!slider) return;

  const track = document.getElementById("slider-track");
  if (!track) return;

  const dots = slider.querySelectorAll(".details-dot");
  const prevBtn = slider.querySelector(".slider-prev");
  const nextBtn = slider.querySelector(".slider-next");
  const totalRealImages = parseInt(slider.dataset.total || "0", 10);

  const setSlide = (targetIndex) => {
    if (slider.dataset.animating === "true") return;

    track.style.transition = "transform 0.5s ease-in-out";

    let actualTransformIndex = targetIndex;
    if (targetIndex < 0) {
      actualTransformIndex = totalRealImages - 1;
    }

    track.style.transform = `translateX(-${actualTransformIndex * 100}%)`;
    slider.dataset.index = String(actualTransformIndex);

    const displayIndex = actualTransformIndex === totalRealImages ? 0 : actualTransformIndex;
    dots.forEach((dot, idx) => {
      dot.classList.toggle("active", idx === displayIndex);
    });

    if (actualTransformIndex === totalRealImages) {
      slider.dataset.animating = "true";

      window.setTimeout(() => {
        track.style.transition = "none";
        track.style.transform = "translateX(0%)";
        slider.dataset.index = "0";
        track.offsetHeight;
        slider.dataset.animating = "false";
      }, 500);
    }
  };

  prevBtn?.addEventListener("click", () => {
    setSlide(parseInt(slider.dataset.index || "0", 10) - 1);
  });

  nextBtn?.addEventListener("click", () => {
    setSlide(parseInt(slider.dataset.index || "0", 10) + 1);
  });

  dots.forEach((dot) => {
    dot.addEventListener("click", (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLElement)) return;
      setSlide(parseInt(target.dataset.slideTo || "0", 10));
    });
  });
};

const renderPropertyDetails = (property, propertyStatus = "Available") => {
  const currentUser = getUser();
  const currentRole = roleKey(currentUser?.role);
  const currentUserId = currentUser?._id || currentUser?.id;
  const ownerId = property?.owner?._id || property?.owner?.id || property?.owner;
  const isOwner = Boolean(currentUserId) && String(ownerId) === String(currentUserId);
  const imageDocs = getImageDocuments(property);
  const imageUrls = [
    ...(Array.isArray(property.images) ? property.images.map(resolveImageUrl) : []),
    ...imageDocs.map((doc) => `${SERVER_URL}${doc.filePath}`),
  ].filter(Boolean);
  const hasImages = imageUrls.length > 0;

  const documents = Array.isArray(property.documents) ? property.documents : [];
  const propertyDocuments = documents.filter((doc) => {
    const mime = String(doc?.mimeType || "").toLowerCase();
    return !mime.startsWith("image/");
  });
  const ownershipHistory = Array.isArray(property.ownershipHistory) ? property.ownershipHistory : [];
  const legalStatus = property?.approval?.status || propertyStatus || "Pending";
  const sliderProperty = {
    ...property,
    images: imageUrls,
  };

  let actionButtonsHtml = "";

  if (currentRole === "user" && !isOwner) {
    if (property.isOpenForSale) {
      actionButtonsHtml += `<button class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 1.1rem;" data-request="${property._id}">Request to Buy</button>`;
    } else {
      actionButtonsHtml += `<button class="btn btn-secondary" style="width: 100%; padding: 12px; cursor: not-allowed;" disabled>Not Currently For Sale</button>`;
    }
  } else if (isOwner) {
    actionButtonsHtml += `<button class="btn btn-outline" disabled style="border-color: var(--success); color: var(--success); cursor: default;">✓ Owned by You</button>`;
  }

  detailsRoot.innerHTML = `
    <div class="property-details-layout">
      <div class="property-main-content">
        ${renderDetailsSlider(sliderProperty)}

        <div class="property-header">
          <h1>${property.title}</h1>
          <p class="property-location-copy">📍 ${property.location || "Location not provided"}</p>
          <h3>About this Property</h3>
          <p class="property-description">
            ${property.description || "No specific description has been provided for this asset."}
          </p>
        </div>

        <article class="card property-documents">
          <h3>Documents</h3>
          <div class="pd-doc-grid">
            ${
              propertyDocuments.length
                ? propertyDocuments
                    .map(
                      (doc) => `
                        <article class="pd-doc-card">
                          <div class="pd-doc-top">
                            ${
                              getDocumentTypeLabel(doc)
                                ? `<span class="pd-doc-icon">${getDocumentTypeLabel(doc)}</span>`
                                : ""
                            }
                            <span class="pd-doc-kind">${doc.kind || "PROPERTY_DOC"}</span>
                          </div>
                          <p class="pd-doc-name" title="${doc.originalName}">${doc.originalName}</p>
                          <p class="pd-doc-meta">${doc.mimeType || "Unknown type"}</p>
                          <a class="btn btn-outline" href="${SERVER_URL}${doc.filePath}" target="_blank" rel="noopener noreferrer">Open</a>
                        </article>
                      `
                    )
                    .join("")
                : "<p>No property documents uploaded.</p>"
            }
          </div>
        </article>

        <article class="card property-history">
          <h3>Ownership History</h3>
          <div class="pd-timeline">
            ${
              ownershipHistory.length
                ? ownershipHistory
                    .map(
                      (entry) => `
                        <article class="pd-timeline-item">
                          <strong>${entry.owner?.fullName || "Owner"}</strong>
                          <p>${new Date(entry.transferredAt).toLocaleString()}</p>
                          <span class="badge pending">${entry.note || "Record"}</span>
                        </article>
                      `
                    )
                    .join("")
                : "<p>No ownership history recorded.</p>"
            }
          </div>
        </article>
      </div>

      <aside class="property-sidebar">
        <div class="sticky-sidebar">
          <div class="sidebar-price">${toCurrency(property.price)}</div>

          <div class="sidebar-meta">
            <div class="sidebar-meta-item">
              <span>Property Type</span>
              <strong>${property.type || "Land Asset"}</strong>
            </div>
            <div class="sidebar-meta-item">
              <span>Area Size</span>
              <strong>${property.area ? `${property.area} Sq Ft` : "Size N/A"}</strong>
            </div>
            <div class="sidebar-meta-item">
              <span>Current Owner</span>
              <strong>${property.owner?.fullName || "Private"}</strong>
            </div>
            <div class="sidebar-meta-item">
              <span>Market Status</span>
              <strong style="color: ${property.isOpenForSale ? "var(--success)" : "#64748b"};">
                ${property.isOpenForSale ? "Available to Buy" : "Off Market"}
              </strong>
            </div>
            <div class="sidebar-meta-item" style="border-bottom: none;">
              <span>Gov. Verification</span>
              <strong style="color: ${legalStatus === "Approved" ? "var(--success)" : "inherit"};">
                ${legalStatus === "Approved" ? "✓ Verified" : legalStatus}
              </strong>
            </div>
          </div>

          <div class="sidebar-actions">
            ${actionButtonsHtml}
          </div>
        </div>
      </aside>
    </div>

    ${
      hasImages
        ? `<div class="pd-lightbox" aria-hidden="true">
             <button class="pd-lightbox-close" type="button" data-lightbox-close aria-label="Close enlarged view">×</button>
             <img class="pd-lightbox-image" src="" alt="Enlarged property view" />
           </div>`
        : ""
    }
  `;

  initDetailsSlider();

  const lightbox = detailsRoot.querySelector(".pd-lightbox");
  const lightboxImage = lightbox?.querySelector(".pd-lightbox-image");
  const closeBtn = lightbox?.querySelector("[data-lightbox-close]");

  const openLightbox = (src) => {
    if (!lightbox || !lightboxImage || !src) return;
    lightboxImage.src = src;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  detailsRoot.querySelectorAll(".details-slide").forEach((image) => {
    image.addEventListener("click", () => openLightbox(image.src));
  });

  closeBtn?.addEventListener("click", closeLightbox);

  if (lightbox) {
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && lightbox.classList.contains("open")) {
        closeLightbox();
      }
    });
  }

  detailsRoot.querySelectorAll("[data-request]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await apiRequest("/registrations", {
          method: "POST",
          body: JSON.stringify({ propertyId: button.dataset.request }),
        });
        showToast("Request submitted successfully", "success");
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
};

const loadPropertyDetails = async () => {
  if (!detailsRoot) return;
  const params = new URLSearchParams(window.location.search);
  const pathMatch = window.location.pathname.match(/property-details\/(.+)$/);
  const idFromPath = pathMatch?.[1] ? decodeURIComponent(pathMatch[1]) : "";
  const id = params.get("id") || idFromPath || sessionStorage.getItem("selectedPropertyId");

  if (!id) {
    detailsRoot.innerHTML = `
      <article class="card" style="max-width: 560px;">
        <h3 style="margin-top: 0;">Property id is missing</h3>
        <p>Please open a property from the listings page to view full details.</p>
        <a href="/pages/properties.html" class="btn btn-primary">Go to Properties</a>
      </article>
    `;
    return;
  }

  sessionStorage.setItem("selectedPropertyId", id);

  // Show skeleton loading state
  detailsRoot.innerHTML = `
    <section class="pd-layout">
      <section class="pd-main">
        <article class="card skeleton" style="border: none; box-shadow: none; height: 320px; margin-bottom: 1rem;"></article>
        <article class="card skeleton" style="border: none; box-shadow: none; height: 140px; margin-bottom: 1rem;"></article>
        <article class="card skeleton" style="border: none; box-shadow: none; height: 220px;"></article>
      </section>
      <aside class="pd-sidebar">
        <article class="card skeleton" style="border: none; box-shadow: none; height: 240px; margin-bottom: 1rem;"></article>
        <article class="card skeleton" style="border: none; box-shadow: none; height: 240px;"></article>
      </aside>
    </section>
  `;

  try {
    const data = await apiRequest(`/properties/${id}`);
    renderPropertyDetails(data.property, data.propertyStatus || "Available");
  } catch (error) {
    detailsRoot.innerHTML = `<p style="color:var(--danger);">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

window.addEventListener("DOMContentLoaded", loadPropertyDetails);
