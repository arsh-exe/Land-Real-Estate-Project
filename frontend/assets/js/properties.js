const propertyList = document.getElementById("property-list");
const propertyFilterForm = document.getElementById("property-filter-form");
const addPropertyForm = document.getElementById("add-property-form");
const CAROUSEL_INTERVAL_MS = 2000;

const parsePropertiesPageMode = () => {
  const user = getUser();
  const role = roleKey(user?.role);
  const params = new URLSearchParams(window.location.search);
  const view = (params.get("view") || "").trim().toLowerCase();
  const action = (params.get("action") || "").trim().toLowerCase();
  const mine = (params.get("mine") || "").trim().toLowerCase();

  const isSeller = role === "seller" || role === "user" || role === "buyer";
  const isAdmin = role === "admin";
  const isBuyer = role === "buyer" || role === "user";

  if ((isSeller || isAdmin) && (view === "add" || action === "add")) {
    return "add";
  }

  if ((isSeller || isBuyer) && (view === "mine" || mine === "1" || mine === "true")) {
    return "mine";
  }

  if (isSeller && view === "selling") {
    return "selling";
  }

  return "all";
};

const updatePropertiesPageLayout = () => {
  const user = getUser();
  const role = roleKey(user?.role);
  const mode = parsePropertiesPageMode();

  const titleEl = document.getElementById("properties-title");
  const subtitleEl = document.getElementById("properties-subtitle");
  const addBlock = document.getElementById("add-property-block");
  const filterBlock = document.getElementById("filter-block");
  const listingBlock = document.getElementById("listing-block");

  if (addBlock) {
    const canAdd = user && ["user", "seller", "buyer", "admin"].includes(role);
    addBlock.classList.toggle("hidden", !canAdd);
  }

  if (mode === "add") {
    if (titleEl) titleEl.textContent = "Add Property";
    if (subtitleEl) subtitleEl.textContent = "Create a new property listing for registration and management.";
    filterBlock?.classList.add("hidden");
    listingBlock?.classList.add("hidden");
    addBlock?.classList.remove("hidden");
    return;
  }

  if (mode === "mine") {
    if (titleEl) titleEl.textContent = "My Properties";
    if (subtitleEl) subtitleEl.textContent = "View and manage properties registered under your account.";
    filterBlock?.classList.add("hidden");
    addBlock?.classList.add("hidden");
    listingBlock?.classList.remove("hidden");
    return;
  }

  if (mode === "selling") {
    if (titleEl) titleEl.textContent = "Currently Selling";
    if (subtitleEl) subtitleEl.textContent = "Properties you currently have in active transfer requests.";
    filterBlock?.classList.add("hidden");
    addBlock?.classList.add("hidden");
    listingBlock?.classList.remove("hidden");
    return;
  }

  if (titleEl) titleEl.textContent = "Property Registry";
  if (subtitleEl)
    subtitleEl.textContent = "Search listings, apply filters, manage submissions, and register your properties securely.";
  filterBlock?.classList.remove("hidden");
  // In search/list mode, hide the add form and keep focus on discovery.
  addBlock?.classList.add("hidden");
  listingBlock?.classList.remove("hidden");
};

const toCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(amount || 0)
  );

const getPropertyStatusClass = (status = "") => {
  const normalized = String(status).toLowerCase();
  if (normalized === "sold") return "sold";
  if (normalized === "pending request") return "pending";
  return "available";
};

const buildPropertyStatusMap = (registrations = []) => {
  const map = new Map();

  registrations.forEach((registration) => {
    const propertyId =
      registration?.property?._id ||
      registration?.property?.id ||
      registration?.property;
    if (!propertyId) return;

    const status = String(registration.finalStatus || "Pending").toLowerCase();
    const previous = map.get(String(propertyId)) || "available";

    // Priority: sold > pending request > available
    if (status === "approved") {
      map.set(String(propertyId), "sold");
      return;
    }

    if (status === "pending" && previous !== "sold") {
      map.set(String(propertyId), "pending request");
      return;
    }

    if (!map.has(String(propertyId))) {
      map.set(String(propertyId), "available");
    }
  });

  return map;
};

const getImageDocuments = (property = {}) => {
  const docs = Array.isArray(property.documents) ? property.documents : [];
  return docs.filter((doc) => (doc?.mimeType || "").toLowerCase().startsWith("image/"));
};

const normalizeProperty = (property = {}) => {
  const title = property.title || property.name || "Untitled property";
  const location = property.location || property.address || "Location not provided";
  const type = property.type || property.propertyType || "Other";
  const area = property.area ?? property.size ?? null;
  const price = property.price ?? property.amount ?? 0;

  return {
    ...property,
    title,
    location,
    type,
    area,
    price,
  };
};

const queryStringFromForm = (formData) => {
  const params = new URLSearchParams();
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.append(key, value);
    }
  });
  return params.toString();
};

const parseCarouselImages = (carousel) => {
  try {
    return JSON.parse(decodeURIComponent(carousel.dataset.images || "%5B%5D"));
  } catch (_error) {
    return [];
  }
};

const setCarouselFrame = (carousel, nextIndex) => {
  const track = carousel.querySelector(".carousel-track");
  if (!track) return;

  const images = parseCarouselImages(carousel);
  const totalRealImages = images.length;
  
  if (totalRealImages <= 1) return;

  // 1. Ensure transitions are ON
  track.style.transition = "transform 0.5s ease-in-out";

  let targetIndex = nextIndex;

  // If going backwards from the first image, loop to the last real image
  if (targetIndex < 0) {
    targetIndex = totalRealImages - 1;
  }

  // 2. Perform the slide
  const slideWidth = carousel.clientWidth;
  track.style.transform = `translateX(-${targetIndex * slideWidth}px)`;
  carousel.dataset.index = String(targetIndex);

  // 3. Update the dot indicators
  const dotsContainer = carousel.querySelector("[data-carousel-dots]");
  if (dotsContainer) {
    const displayIndex = targetIndex === totalRealImages ? 0 : targetIndex;
    const dots = dotsContainer.querySelectorAll(".carousel-dot");
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === displayIndex);
    });
  }

  // 4. The Seamless Loop Magic!
  // If we just slid to the clone at the end of the track...
  if (targetIndex === totalRealImages) {
    carousel.dataset.isAnimating = "true"; // Lock navigation briefly

    // Wait exactly 500ms for the CSS sliding animation to finish
    window.setTimeout(() => {
      // Turn off animation
      track.style.transition = "none";

      // Instantly teleport back to the real Image 1
      track.style.transform = `translateX(0px)`;
      carousel.dataset.index = "0";

      // Force the browser to register the teleport before unlocking
      track.offsetHeight;
      carousel.dataset.isAnimating = "false";
    }, 500);
  }
};

const moveCarousel = (carousel, direction) => {
  // Prevent rapid clicking while the teleport is happening
  if (carousel.dataset.isAnimating === "true") return;

  const currentIndex = parseInt(carousel.dataset.index || "0", 10);
  setCarouselFrame(carousel, currentIndex + direction);
};

const startCarouselAutoplay = (carousel) => {
  const images = parseCarouselImages(carousel);
  if (images.length < 2) return;

  let timer = null;

  const startTimer = () => {
    if (timer) return;
    timer = window.setInterval(() => {
      if (!carousel.isConnected) {
        stopTimer();
        return;
      }

      moveCarousel(carousel, 1);
    }, CAROUSEL_INTERVAL_MS);
  };

  const stopTimer = () => {
    if (!timer) return;
    window.clearInterval(timer);
    timer = null;
  };

  startTimer();
};

const renderProperties = (properties = [], propertyStatusMap = new Map()) => {
  if (!propertyList) return;
  const currentUser = getUser();
  const currentRole = roleKey(currentUser?.role);
  const currentUserId = currentUser?._id || currentUser?.id;
  const pageMode = parsePropertiesPageMode();
  const normalizedProperties = properties
    .map(normalizeProperty)
    .filter((property) => {
      if (["mine", "selling"].includes(pageMode)) return true;

      if (!["user", "buyer", "seller"].includes(currentRole)) return true;

      const ownerId = property?.owner?._id || property?.owner?.id || property?.owner;
      if (!currentUserId || !ownerId) return true;

      return String(ownerId) !== String(currentUserId);
    });

  if (normalizedProperties.length === 0) {
    propertyList.innerHTML = '<p style="color:#617189;">No properties found for the selected filters.</p>';
    return;
  }

  propertyList.innerHTML = normalizedProperties
    .map(
      (property) => {
        const ownerId = property?.owner?._id || property?.owner?.id || property?.owner;
        const isOwner = Boolean(currentUserId) && String(ownerId) === String(currentUserId);
        const isAdmin = currentRole === "admin";
        const imageDocs = getImageDocuments(property).filter((doc) => Boolean(doc?.filePath));
        const imageUrls = imageDocs.map((doc) => `${SERVER_URL}${doc.filePath}`);
        const hasImage = imageUrls.length > 0;
        const encodedImages = encodeURIComponent(JSON.stringify(imageUrls));
        const status = propertyStatusMap.get(String(property._id)) || "available";
        const statusClass = getPropertyStatusClass(status);
        const actionButtons = `
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:1rem;">
            <a href="/pages/property-details?id=${property._id}" class="btn btn-outline btn-sm">View Details</a>
            ${
              currentRole === "user" && !isOwner
                ? `<button class="btn btn-primary btn-sm" data-request="${property._id}">Request Registration</button>`
                : ""
            }
            ${
              isAdmin
                ? `<button class="btn btn-secondary btn-sm" data-edit="${property._id}">Update</button>
                   <button class="btn btn-danger btn-sm" data-delete="${property._id}">Delete</button>`
                : ""
            }
          </div>
        `;
        const imageMarkup = hasImage
          ? `<div class="carousel-track" style="transform: translateX(0px);">
               ${imageUrls
                 .map(
                   (url) => `<img class="property-image" src="${url}" alt="${property.title} image" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'property-image-placeholder\\'>Image failed to load</div>'" />`
                 )
                 .join("")}
               ${imageUrls.length > 1 ? `<img class="property-image" src="${imageUrls[0]}" aria-hidden="true" loading="lazy" />` : ""}
             </div>
             ${
               imageUrls.length > 1
                 ? `<div class="carousel-dots" data-carousel-dots>
                      ${imageUrls.map((_, i) => `<div class="carousel-dot ${i === 0 ? "active" : ""}"></div>`).join("")}
                    </div>`
                 : ""
             }`
          : `<div class="property-image-placeholder">No image found</div>`;

        return `
      <article class="property-item">
        <div class="property-media ${hasImage ? "property-carousel" : ""}" ${
          hasImage ? `data-images="${encodedImages}" data-index="0"` : ""
        }>
          ${imageMarkup}
        </div>
        <h3>${property.title}</h3>
        ${pageMode === "mine" && status === "sold" ? "" : `<p><span class="badge ${statusClass}">${status}</span></p>`}
        <p>${property.location} • ${property.type}</p>
        <p><strong>${toCurrency(property.price)}</strong> • ${property.area ?? "Area not specified"}${
        property.area !== null && property.area !== undefined ? " sq.ft" : ""
      }</p>
        ${actionButtons}
      </article>
    `;
      }
    )
    .join("");

  propertyList.querySelectorAll(".property-media").forEach((media, index) => {
    const propertyCard = media.closest(".property-item");
    const detailLink = propertyCard?.querySelector('a[href^="/pages/property-details?id="]');
    if (!detailLink) return;

    media.addEventListener("click", (event) => {
      if (event.target.closest("a") || event.target.closest("button") || event.target.closest("input")) {
        return;
      }

      window.location.href = detailLink.getAttribute("href");
    });

    if (media.classList.contains("property-carousel")) {
      startCarouselAutoplay(media);
    }
  });

  propertyList.querySelectorAll("[data-request]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await apiRequest("/registrations", {
          method: "POST",
          body: JSON.stringify({ propertyId: button.dataset.request }),
        });
        alert("Request submitted successfully");
      } catch (error) {
        alert(error.message);
      }
    });
  });

  propertyList.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const title = prompt("New title (leave blank to keep current):") || undefined;
      const priceInput = prompt("New price (leave blank to keep current):");
      const price = priceInput ? Number(priceInput) : undefined;

      try {
        await apiRequest(`/properties/${button.dataset.edit}`, {
          method: "PUT",
          body: JSON.stringify({ title, price }),
        });
        await loadProperties();
      } catch (error) {
        alert(error.message);
      }
    });
  });

  propertyList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this property record?")) return;

      try {
        await apiRequest(`/properties/${button.dataset.delete}`, {
          method: "DELETE",
        });
        await loadProperties();
      } catch (error) {
        if ((error.message || "").toLowerCase().includes("forbidden")) {
          alert("You can only delete your own properties.");
        } else {
          alert(error.message);
        }
      }
    });
  });

  propertyList.querySelectorAll("[data-upload-image]").forEach((input) => {
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;

      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));

      try {
        await apiRequest(`/properties/${input.dataset.uploadImage}`, {
          method: "PUT",
          body: formData,
        });
        showToast("Property images uploaded successfully", "success");
        await loadProperties();
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        input.value = "";
      }
    });
  });
};

const loadProperties = async (query = "") => {
  if (!propertyList) return;
  
  // Show skeleton loading state
  propertyList.innerHTML = Array(3).fill(`
    <article class="property-item skeleton" style="border: none; box-shadow: none;">
      <div class="skeleton-title"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>
      <div style="display:flex; gap:0.5rem; margin-top:1rem;">
        <div class="skeleton-text" style="width: 100px; height: 36px; border-radius: 8px;"></div>
        <div class="skeleton-text" style="width: 150px; height: 36px; border-radius: 8px;"></div>
      </div>
    </article>
  `).join("");

  try {
    const user = getUser();
    const role = roleKey(user?.role);
    const mode = parsePropertiesPageMode();
    const shouldLoadMine = ["user", "seller", "buyer"].includes(role) && mode === "mine";
    const shouldLoadSelling = ["user", "seller", "buyer"].includes(role) && mode === "selling";
    const endpoint = shouldLoadSelling
      ? "/properties/selling/current"
      : shouldLoadMine
      ? "/properties/my"
      : `/properties${query ? `?${query}` : ""}`;
    const [propertyData, registrationData] = await Promise.all([
      apiRequest(endpoint),
      apiRequest("/registrations").catch(() => ({ registrations: [] })),
    ]);

    const statusMap = buildPropertyStatusMap(registrationData.registrations || []);
    renderProperties(propertyData.properties || [], statusMap);
  } catch (error) {
    propertyList.innerHTML = `<p style="color:var(--danger);">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

propertyFilterForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = Object.fromEntries(new FormData(propertyFilterForm).entries());
  const query = queryStringFromForm(formData);
  await loadProperties(query);
});

addPropertyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const output = document.getElementById("property-form-message");

  try {
    const formData = new FormData(addPropertyForm);
    await apiRequest("/properties", {
      method: "POST",
      body: formData,
    });

    addPropertyForm.reset();
    output.textContent = "Property added successfully";
    output.style.color = "#067647";
    // Send sellers/admins to a listing view after creation so they can verify the new record.
    const role = roleKey(getUser()?.role);
    if (["user", "seller"].includes(role)) {
      window.location.href = "/pages/properties?view=mine";
      return;
    }
    if (role === "admin") {
      window.location.href = "/pages/properties.html";
      return;
    }

    await loadProperties();
  } catch (error) {
    output.textContent = error.message;
    output.style.color = "#b42318";
  }
});

window.addEventListener("DOMContentLoaded", () => {
  updatePropertiesPageLayout();
  if (parsePropertiesPageMode() !== "add") {
    loadProperties();
  }
});
