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

  const isSeller = role === "seller";
  const isAdmin = role === "admin";
  const isBuyer = role === "buyer";

  if ((isSeller || isAdmin) && (view === "add" || action === "add")) {
    return "add";
  }

  if ((isSeller || isBuyer) && (view === "mine" || mine === "1" || mine === "true")) {
    return "mine";
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
    const canAdd = user && ["seller", "admin"].includes(role);
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
    if (subtitleEl) subtitleEl.textContent = "View and manage properties registered under your seller account.";
    filterBlock?.classList.add("hidden");
    addBlock?.classList.add("hidden");
    listingBlock?.classList.remove("hidden");
    return;
  }

  if (titleEl) titleEl.textContent = "Property Registry";
  if (subtitleEl)
    subtitleEl.textContent = "Search listings, apply filters, manage submissions, and register your properties securely.";
  filterBlock?.classList.remove("hidden");
  // Keep add form available as a fallback for seller/admin so users can always add from this page.
  if (user && ["seller", "admin"].includes(role)) {
    addBlock?.classList.remove("hidden");
  } else {
    addBlock?.classList.add("hidden");
  }
  listingBlock?.classList.remove("hidden");
};

const toCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(amount || 0)
  );

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
  const imageEl = carousel.querySelector(".property-image");
  if (!imageEl) return;

  const images = parseCarouselImages(carousel);
  if (images.length === 0) return;

  const safeIndex = ((nextIndex % images.length) + images.length) % images.length;
  const nextSrc = images[safeIndex];
  if (!nextSrc || imageEl.src === nextSrc) {
    return;
  }

  carousel.dataset.index = String(safeIndex);
  imageEl.classList.add("is-fading");

  // Preload next image before swap to avoid abrupt flashing during transitions.
  const preload = new Image();
  preload.onload = () => {
    imageEl.src = nextSrc;
    window.requestAnimationFrame(() => {
      imageEl.classList.remove("is-fading");
    });
  };
  preload.onerror = () => {
    imageEl.classList.remove("is-fading");
  };
  preload.src = nextSrc;
};

const moveCarousel = (carousel, direction) => {
  const images = parseCarouselImages(carousel);
  if (images.length < 2) return;
  const currentIndex = Number(carousel.dataset.index || "0");
  setCarouselFrame(carousel, currentIndex + direction);
};

const startCarouselAutoplay = (carousel) => {
  const images = parseCarouselImages(carousel);
  if (images.length < 2) return;

  const timer = window.setInterval(() => {
    if (!carousel.isConnected) {
      window.clearInterval(timer);
      return;
    }

    moveCarousel(carousel, 1);
  }, CAROUSEL_INTERVAL_MS);
};

const renderProperties = (properties = []) => {
  if (!propertyList) return;
  const currentUser = getUser();
  const currentRole = roleKey(currentUser?.role);
  const currentUserId = currentUser?._id || currentUser?.id;
  const normalizedProperties = properties.map(normalizeProperty);

  if (normalizedProperties.length === 0) {
    propertyList.innerHTML = '<p style="color:#617189;">No properties found for the selected filters.</p>';
    return;
  }

  propertyList.innerHTML = normalizedProperties
    .map(
      (property) => {
        const ownerId = property?.owner?._id || property?.owner?.id || property?.owner;
        const isOwner = Boolean(currentUserId) && String(ownerId) === String(currentUserId);
        const canManage =
          currentRole === "admin" ||
          (currentRole === "seller" && isOwner);
        const imageDocs = getImageDocuments(property).filter((doc) => Boolean(doc?.filePath));
        const imageUrls = imageDocs.map((doc) => `${SERVER_URL}${doc.filePath}`);
        const hasImage = imageUrls.length > 0;
        const encodedImages = encodeURIComponent(JSON.stringify(imageUrls));

        return `
      <article class="property-item">
        <div class="property-media ${hasImage ? "property-carousel" : ""}" style="cursor:pointer;" ${
          hasImage ? `data-images="${encodedImages}" data-index="0"` : ""
        }>
          ${
            hasImage
              ? `<img class="property-image" src="${imageUrls[0]}" alt="${property.title} image" loading="lazy" />`
              : `<div class="property-image-placeholder">No image found</div>`
          }
        </div>
        <h3>${property.title}</h3>
        <p>${property.location} • ${property.type}</p>
        <p><strong>${toCurrency(property.price)}</strong> • ${property.area ?? "Area not specified"}${
        property.area !== null && property.area !== undefined ? " sq.ft" : ""
      }</p>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <a class="btn btn-outline" href="/pages/property-details?id=${property._id}">View Details</a>
          ${
            currentRole === "buyer" && !isOwner
              ? `<button class="btn btn-primary" data-request="${property._id}">Request Registration</button>`
              : ""
          }
          ${
            currentRole === "buyer" && isOwner
              ? `<button class="btn btn-outline" disabled style="border-color: var(--success); color: var(--success); cursor: default;">✓ Owned by You</button>`
              : ""
          }
          ${
            canManage
              ? `<button class="btn btn-outline" data-edit="${property._id}">Update</button>
                 ${
                   hasImage
                     ? ""
                     : `<label class="btn btn-outline" for="upload-image-${property._id}">Add Images</label>
                        <input id="upload-image-${property._id}" type="file" accept="image/*" multiple class="hidden" data-upload-image="${property._id}" />`
                 }
                 <button class="btn btn-danger" data-delete="${property._id}">Delete</button>`
              : ""
          }
        </div>
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
    const shouldLoadMine = ["seller", "buyer"].includes(role) && mode === "mine";
    const endpoint = shouldLoadMine
      ? "/properties/my"
      : `/properties${query ? `?${query}` : ""}`;
    const data = await apiRequest(endpoint);
    renderProperties(data.properties || []);
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
    if (role === "seller") {
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
