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

const updateHeroImage = (container, imageUrls, nextIndex) => {
  const heroImage = container.querySelector(".pd-hero-image");
  if (!heroImage || !imageUrls.length) return;

  const safeIndex = ((nextIndex % imageUrls.length) + imageUrls.length) % imageUrls.length;
  const nextSrc = imageUrls[safeIndex];
  if (!nextSrc || heroImage.src === nextSrc) return;

  container.dataset.index = String(safeIndex);
  heroImage.classList.add("is-fading");

  const preload = new Image();
  preload.onload = () => {
    heroImage.src = nextSrc;
    window.requestAnimationFrame(() => {
      heroImage.classList.remove("is-fading");
    });
  };
  preload.onerror = () => {
    heroImage.classList.remove("is-fading");
  };
  preload.src = nextSrc;

  container.querySelectorAll(".pd-thumb").forEach((thumb, idx) => {
    thumb.classList.toggle("active", idx === safeIndex);
    thumb.setAttribute("aria-pressed", idx === safeIndex ? "true" : "false");
  });
};

const bindHeroGallery = () => {
  const container = detailsRoot?.querySelector(".pd-hero-gallery");
  if (!container) return;

  let imageUrls = [];
  try {
    imageUrls = JSON.parse(decodeURIComponent(container.dataset.images || "%5B%5D"));
  } catch (_error) {
    imageUrls = [];
  }

  const heroStage = container.querySelector(".pd-hero-stage");
  const heroImage = container.querySelector(".pd-hero-image");
  const lightbox = detailsRoot?.querySelector(".pd-lightbox");
  const lightboxImage = lightbox?.querySelector(".pd-lightbox-image");
  const closeBtn = lightbox?.querySelector("[data-lightbox-close]");

  const openLightbox = () => {
    if (!heroImage || !lightbox || !lightboxImage) return;
    lightboxImage.src = heroImage.src;
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

  if (imageUrls.length >= 2) {
    heroStage?.addEventListener("click", (event) => {
      const rect = heroStage.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const direction = x < rect.width / 2 ? -1 : 1;
      const currentIndex = Number(container.dataset.index || "0");
      updateHeroImage(container, imageUrls, currentIndex + direction);
    });
  }

  // Amazon-like: direct image interaction without a separate enlarge button.
  heroImage?.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openLightbox();
  });

  // For single-image properties, one click opens full view.
  if (imageUrls.length < 2) {
    heroStage?.addEventListener("click", () => {
      openLightbox();
    });
  }

  container.querySelectorAll(".pd-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const nextIndex = Number(thumb.dataset.index || "0");
      updateHeroImage(container, imageUrls, nextIndex);
    });
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
};

const renderPropertyDetails = (property, propertyStatus = "Available") => {
  const currentUser = getUser();
  const currentRole = roleKey(currentUser?.role);
  const currentUserId = currentUser?._id || currentUser?.id;
  const ownerId = property?.owner?._id || property?.owner?.id || property?.owner;
  const isOwner = Boolean(currentUserId) && String(ownerId) === String(currentUserId);
  const imageDocs = getImageDocuments(property);
  const imageUrls = imageDocs.map((doc) => `${SERVER_URL}${doc.filePath}`);
  const hasImages = imageUrls.length > 0;
  const encodedImages = encodeURIComponent(JSON.stringify(imageUrls));

  const documents = Array.isArray(property.documents) ? property.documents : [];
  const propertyDocuments = documents.filter((doc) => {
    const mime = String(doc?.mimeType || "").toLowerCase();
    return !mime.startsWith("image/");
  });
  const ownershipHistory = Array.isArray(property.ownershipHistory) ? property.ownershipHistory : [];
  const statusClass = getPropertyStatusClass(propertyStatus);

  detailsRoot.innerHTML = `
    <section class="pd-layout">
      <section class="pd-main">
        <article class="card pd-hero-card">
          <div class="pd-hero-gallery" ${hasImages ? `data-images="${encodedImages}" data-index="0"` : ""}>
            <div class="pd-hero-stage ${hasImages ? "split-click" : ""}">
              ${
                hasImages
                  ? `<img class="pd-hero-image" src="${imageUrls[0]}" alt="${property.title} image" loading="lazy" />`
                  : `<div class="pd-hero-empty">No property images uploaded yet</div>`
              }
            </div>
            ${
              hasImages
                ? `<div class="pd-thumb-row">
                    ${imageUrls
                      .map(
                        (url, index) => `
                          <button class="pd-thumb ${index === 0 ? "active" : ""}" type="button" data-index="${index}" aria-pressed="${index === 0 ? "true" : "false"}">
                            <img src="${url}" alt="Property thumbnail ${index + 1}" loading="lazy" />
                          </button>
                        `
                      )
                      .join("")}
                  </div>`
                : ""
            }
          </div>
        </article>

        <article class="card mt-1">
          <h3>Property Overview</h3>
          <p class="pd-subtitle">${property.location || "Location not provided"} • ${property.type || "Property type not provided"}</p>
          <p>This official record includes document references, chain of title history, and timeline of ownership activity for this property.</p>
        </article>

        <article class="card mt-1">
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
      </section>

      ${
        hasImages
          ? `<div class="pd-lightbox" aria-hidden="true">
               <button class="pd-lightbox-close" type="button" data-lightbox-close aria-label="Close enlarged view">×</button>
               <img class="pd-lightbox-image" src="" alt="Enlarged property view" />
             </div>`
          : ""
      }

      <aside class="pd-sidebar">
        <article class="card">
          <h3>Property Overview</h3>
          <p><span class="badge ${statusClass}">${propertyStatus}</span></p>
          <div class="pd-action-row">
            ${
              ["user", "buyer"].includes(currentRole) && !isOwner
                ? `<button class="btn btn-primary" data-request-registration="${property._id}">Request Registration</button>`
                : ""
            }
            ${
              ["user", "buyer"].includes(currentRole) && isOwner
                ? `<button class="btn btn-outline" disabled style="border-color: var(--success); color: var(--success); cursor: default;">✓ Owned by You</button>`
                : ""
            }
          </div>
          <p class="pd-price">${toCurrency(property.price)}</p>
          <ul class="pd-facts">
            <li><span>Area</span><strong>${property.area || "N/A"} sq.ft</strong></li>
            <li><span>Location</span><strong>${property.location || "N/A"}</strong></li>
            <li><span>Type</span><strong>${property.type || "N/A"}</strong></li>
            <li><span>Current Owner</span><strong>${property.owner?.fullName || "N/A"}</strong></li>
            <li><span>Title</span><strong>${property.title || "N/A"}</strong></li>
          </ul>
        </article>

        <article class="card mt-1">
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
      </aside>
    </section>
  `;

  bindHeroGallery();

  detailsRoot.querySelectorAll("[data-request-registration]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await apiRequest("/registrations", {
          method: "POST",
          body: JSON.stringify({ propertyId: button.dataset.requestRegistration }),
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
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    detailsRoot.innerHTML = "<p>Property id is missing</p>";
    return;
  }

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
