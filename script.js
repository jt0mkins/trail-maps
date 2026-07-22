(() => {
  const storageKey = "trail-maps-cart";
  const cartButtons = document.querySelectorAll("[data-cart-add]");
  const productCards = document.querySelectorAll(".product-card[data-product-page]");
  const customGpxForm = document.querySelector("[data-custom-gpx-form]");
  const customGpxFileInput = document.querySelector("[data-custom-gpx-file]");
  const customRunTitleInput = document.querySelector("[data-custom-run-title]");
  const customGpxPreview = document.querySelector("[data-custom-gpx-preview]");
  const header = document.querySelector(".site-header");

  if (header && !document.getElementById("header-cart-toggle")) {
    header.querySelector(".header-inner")?.insertAdjacentHTML(
      "beforeend",
      `
        <div class="header-cart">
          <button
            type="button"
            class="header-cart-toggle"
            id="header-cart-toggle"
            aria-expanded="false"
            aria-controls="header-cart-panel"
          >
            <span>Cart</span>
            <span class="header-cart-badge" id="cart-count-badge">0</span>
          </button>

          <div class="header-cart-panel" id="header-cart-panel" aria-live="polite" hidden>
            <div class="cart-panel-header">
              <strong>Cart summary</strong>
              <span id="cart-count-label">0 items</span>
            </div>
            <div id="cart-empty" class="cart-empty">Your cart is empty. Add a trail map to get started.</div>
            <div id="cart-items" class="cart-items header-cart-items" hidden></div>
            <div class="cart-totals header-cart-totals">
              <div><span>Subtotal</span><strong id="cart-subtotal">NZ$0</strong></div>
              <div><span>Shipping</span><strong>Calculated at checkout</strong></div>
            </div>
            <div class="cart-actions">
              <button type="button" class="button button-primary" id="cart-checkout">Checkout</button>
              <button type="button" class="button button-secondary" id="cart-clear">Clear cart</button>
            </div>
          </div>
        </div>
      `
    );
  }

  const cartItems = document.getElementById("cart-items");
  const cartEmpty = document.getElementById("cart-empty");
  const cartCountLabel = document.getElementById("cart-count-label");
  const cartCountBadge = document.getElementById("cart-count-badge");
  const cartSubtotal = document.getElementById("cart-subtotal");
  const cartClear = document.getElementById("cart-clear");
  const cartCheckout = document.getElementById("cart-checkout");
  const headerCartToggle = document.getElementById("header-cart-toggle");
  const headerCartPanel = document.getElementById("header-cart-panel");

  if (!cartItems || !cartEmpty || !cartCountLabel || !cartCountBadge || !cartSubtotal || !cartClear || !cartCheckout) {
    return;
  }

  const formatCurrency = (value) => `NZ$${Math.round(value).toLocaleString("en-NZ")}`;

  const catalogProducts = [
    { title: "Milford Track Relief", description: "Classic fjord-to-alpine route artwork.", price: 179, swatchClass: "milford", sizes: { "8x10": 179, "A4": 209, "A3": 249 } },
    { title: "Routeburn Track Relief", description: "Alpine ridgelines and dramatic elevation shifts.", price: 169, swatchClass: "routeburn", sizes: { "8x10": 169, "A4": 199, "A3": 239 } },
    { title: "Abel Tasman Coast Track", description: "Coastal contours and beach-inspired styling.", price: 159, swatchClass: "abel", sizes: { "8x10": 159, "A4": 189, "A3": 229 } },
    { title: "Tongariro Alpine Crossing", description: "Volcanic terrain in a striking silhouette.", price: 149, swatchClass: "tongariro", sizes: { "8x10": 149, "A4": 179, "A3": 219 } },
    { title: "Kepler Track", description: "Fiordland forests, passes, and lakes.", price: 169, swatchClass: "kepler", sizes: { "8x10": 169, "A4": 199, "A3": 239 } },
    { title: "Heaphy Track", description: "West coast route with lush terrain styling.", price: 159, swatchClass: "heaphy", sizes: { "8x10": 159, "A4": 189, "A3": 229 } },
    { title: "Rakiura Track", description: "Remote island contours and a minimalist finish.", price: 149, swatchClass: "rangi", sizes: { "8x10": 149, "A4": 179, "A3": 219 } },
    { title: "Paparoa Track", description: "Rugged ridges and limestone country.", price: 159, swatchClass: "paparoa", sizes: { "8x10": 159, "A4": 189, "A3": 229 } },
    { title: "Whanganui Journey", description: "River-inspired contours and a warm neutral palette.", price: 149, swatchClass: "whanganui", sizes: { "8x10": 149, "A4": 179, "A3": 219 } },
    { title: "Great Walks Collection Set", description: "A curated trio of trail maps.", price: 449, swatchClass: "route-alternates", sizes: { "Set (3pcs)": 449 } },
  ];

  const products = [
    ...Array.from(document.querySelectorAll(".product-card")).map((card) => {
      const title = card.querySelector("h2")?.textContent?.trim() || "Trail Map";
      const description = card.querySelector(".product-content p")?.textContent?.trim() || "";
      const priceText = card.querySelector(".product-meta span")?.textContent?.trim() || "NZ$0";
      const price = Number(priceText.replace(/[^\d.]/g, "")) || 0;
      const swatchClass = Array.from(card.querySelector(".product-image")?.classList || []).find((className) => className !== "product-image");

      return { title, description, price, swatchClass };
    }),
    ...catalogProducts.filter((item) => !Array.from(document.querySelectorAll(".product-card")).some((card) => card.querySelector("h2")?.textContent?.trim() === item.title)),
  ];

  const getStartingPrice = (product) => {
    if (product?.sizes) {
      const values = Object.values(product.sizes).map((value) => Number(value) || 0);
      return values.length ? Math.min(...values) : Number(product.price) || 0;
    }

    return Number(product?.price) || 0;
  };

  const getSelectedPrice = (product, selectedSize) => {
    if (product?.sizes && selectedSize && product.sizes[selectedSize] != null) {
      return product.sizes[selectedSize];
    }

    return Number(product?.price) || 0;
  };

  const formatPriceLabel = (product, selectedSize, isCard = false) => {
    const price = getSelectedPrice(product, selectedSize);
    if (isCard) {
      return `Starting from ${formatCurrency(price)}`;
    }

    return `${formatCurrency(price)}`;
  };

  Array.from(document.querySelectorAll(".product-card")).forEach((card) => {
    const title = card.querySelector("h2")?.textContent?.trim();
    const product = products.find((item) => item.title === title);
    const priceSpan = card.querySelector(".product-meta span");

    if (priceSpan && product) {
      priceSpan.textContent = formatPriceLabel(product, null, true);
    }
  });

  // Inject size selector UI into product cards and product detail pages
  Array.from(document.querySelectorAll(".product-card, .product-detail")).forEach((container) => {
    const title = container.querySelector("h1, h2")?.textContent?.trim();
    const product = products.find((p) => p.title === title);
    if (!product) return;

    if (title === "Custom GPX Run" || container.querySelector("[data-custom-gpx-form]")) {
      return;
    }

    const sizes = product.sizes || (product.price ? { "8x10": product.price } : { "8x10": 0 });

    const priceSpan = container.querySelector(".product-meta span, .product-detail-meta span");

    // If a selector already exists (radios or select), wire it up instead of injecting another
    const existingSelector = container.querySelector(".size-selector");
    if (existingSelector) {
      if (existingSelector.tagName === "SELECT") {
        // update options to reflect sizes (replace existing options)
        existingSelector.innerHTML = "";
        Object.keys(sizes).forEach((sizeKey, idx) => {
          const option = document.createElement("option");
          option.value = sizeKey;
          option.textContent = `${sizeKey} — NZ$${sizes[sizeKey]}`;
          if (idx === 0) option.selected = true;
          existingSelector.appendChild(option);
        });

        if (priceSpan) priceSpan.textContent = formatPriceLabel(product, existingSelector.value, false);
        existingSelector.addEventListener("change", () => {
          if (priceSpan) priceSpan.textContent = formatPriceLabel(product, existingSelector.value, false);
        });
      } else {
        // assume a radio group; wire change handlers and set initial price
        const radios = existingSelector.querySelectorAll("input[type='radio']");
        radios.forEach((r) => {
          r.addEventListener("change", () => {
            if (r.checked && priceSpan) priceSpan.textContent = formatPriceLabel(product, r.value, false);
          });
        });

        const checked = existingSelector.querySelector("input[type='radio']:checked");
        if (checked && priceSpan) priceSpan.textContent = formatPriceLabel(product, checked.value, false);
      }

      return;
    }

    // create select element when no selector exists
    const select = document.createElement("select");
    select.className = "size-selector";

    Object.keys(sizes).forEach((sizeKey, idx) => {
      const option = document.createElement("option");
      option.value = sizeKey;
      option.textContent = `${sizeKey} — NZ$${sizes[sizeKey]}`;
      if (idx === 0) option.selected = true;
      select.appendChild(option);
    });

    if (priceSpan) priceSpan.textContent = formatPriceLabel(product, Object.keys(sizes)[0], false);

    const btn = container.querySelector("[data-cart-add]");
    if (btn) btn.insertAdjacentElement("beforebegin", select);

    select.addEventListener("change", () => {
      if (priceSpan) priceSpan.textContent = formatPriceLabel(product, select.value, false);
    });
  });

  const cart = loadCart();

  if (productCards.length) {
    productCards.forEach((card) => {
    const goToProductPage = (event) => {
      if (event.target.closest("[data-cart-add]")) {
        return;
      }

      const productPage = card.getAttribute("data-product-page");
      if (productPage) {
        window.location.href = productPage;
      }
    };

      card.addEventListener("click", goToProductPage);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToProductPage(event);
        }
      });
    });
  }

  cartButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const detailContainer = event.currentTarget.closest(".product-detail") || event.currentTarget.closest(".product-card");
      const titleElement = detailContainer?.querySelector("h1, h2");
      const title = titleElement?.textContent?.trim();
      const product = products.find((item) => item.title === title);
      let selectedSize = "8x10";
      if (detailContainer?.matches("[data-custom-gpx-product]")) {
        selectedSize = "Custom";
      } else {
        const sizeSelect = detailContainer?.querySelector(".size-selector");
        if (sizeSelect) {
          selectedSize = sizeSelect.value || selectedSize;
        } else {
          const checked = detailContainer?.querySelector(".size-selector input[type='radio']:checked");
          if (checked) selectedSize = checked.value;
        }
      }

      if (!product) return;

      const unitPrice = (product.sizes && product.sizes[selectedSize]) ? product.sizes[selectedSize] : product.price;
      addItem(product.title, selectedSize, unitPrice);
    });
  });

  if (customGpxForm && customGpxFileInput && customRunTitleInput && customGpxPreview) {
    const updateCustomGpxPreview = () => {
      const file = customGpxFileInput.files?.[0];
      const title = customRunTitleInput.value.trim();

      if (!file && !title) {
        customGpxPreview.textContent = "Choose a GPX file to preview it here.";
        return;
      }

      const fileLabel = file ? `Uploaded file: ${file.name}` : "No file selected yet.";
      const titleLabel = title ? `Run title: ${title}` : "Add a run title to personalise the order.";
      customGpxPreview.innerHTML = `<strong>Custom route ready</strong><br />${fileLabel}<br />${titleLabel}`;
    };

    customGpxFileInput.addEventListener("change", updateCustomGpxPreview);
    customRunTitleInput.addEventListener("input", updateCustomGpxPreview);

    const customButton = document.querySelector("[data-custom-gpx-product] [data-cart-add]");
    if (customButton) {
      customButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const runTitle = customRunTitleInput.value.trim();
        const file = customGpxFileInput.files?.[0];

        if (!runTitle || !file) {
          window.alert("Please add a run title and choose a GPX file before adding this custom map to your cart.");
          return;
        }

        addItem("Custom GPX Run", "Custom", 129, {
          runTitle,
          gpxFileName: file.name,
        });
      });
    }
  }

  cartClear.addEventListener("click", () => {
    cart.length = 0;
    saveCart();
    renderCart();
  });

  if (headerCartToggle && headerCartPanel) {
    headerCartToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = headerCartToggle.getAttribute("aria-expanded") === "true";
      headerCartToggle.setAttribute("aria-expanded", String(!isOpen));
      headerCartPanel.hidden = isOpen;
    });

    document.addEventListener("click", (event) => {
      if (!headerCartPanel.contains(event.target) && !headerCartToggle.contains(event.target)) {
        headerCartToggle.setAttribute("aria-expanded", "false");
        headerCartPanel.hidden = true;
      }
    });
  }

  cartCheckout.addEventListener("click", async () => {
    if (!cart.length) {
      window.alert("Your cart is empty. Add a trail map first.");
      return;
    }

    const subtotal = getSubtotal();
    const summary = cart
      .map((item) => `${item.quantity} x ${item.title} (${item.size || "8x10"})`)
      .join("\n");

    try {
      const response = await fetch("/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          cart: JSON.stringify(cart),
          subtotal: String(subtotal),
          summary,
        }),
      });

      const data = await response.json();

      if (data.checkoutUrl && data.checkoutUrl !== "#") {
        window.location.href = data.checkoutUrl;
        return;
      }

      window.alert(`Checkout is ready.\n\n${summary}\n\nSubtotal: ${formatCurrency(subtotal)}\n\n${data.message || "Stripe checkout has not been configured yet."}`);
    } catch (error) {
      window.alert(`Checkout could not be started. ${error.message}`);
    }
  });

  function addItem(title, size, price, metadata = {}) {
    const normalizedMetadata = metadata && typeof metadata === "object" ? metadata : {};
    const existingItem = cart.find((item) => item.title === title && item.size === size && JSON.stringify(item.metadata || {}) === JSON.stringify(normalizedMetadata));

    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.price = price || existingItem.price || 0;
      existingItem.metadata = normalizedMetadata;
    } else {
      cart.push({
        title,
        size: size || "8x10",
        quantity: 1,
        price: Number(price) || 0,
        metadata: Object.keys(normalizedMetadata).length ? normalizedMetadata : undefined,
      });
    }

    saveCart();
    renderCart();
  }

  function removeItem(title, size, metadata = {}) {
    const normalizedMetadata = metadata && typeof metadata === "object" ? metadata : {};
    const index = cart.findIndex((item) => item.title === title && item.size === size && JSON.stringify(item.metadata || {}) === JSON.stringify(normalizedMetadata));

    if (index >= 0) {
      cart.splice(index, 1);
      saveCart();
      renderCart();
    }
  }

  function changeQuantity(title, size, delta, metadata = {}) {
    const normalizedMetadata = metadata && typeof metadata === "object" ? metadata : {};
    const item = cart.find((entry) => entry.title === title && entry.size === size && JSON.stringify(entry.metadata || {}) === JSON.stringify(normalizedMetadata));

    if (!item) {
      return;
    }

    item.quantity += delta;

    if (item.quantity <= 0) {
      removeItem(title, size, normalizedMetadata);
      return;
    }

    saveCart();
    renderCart();
  }

  function getProduct(title) {
    return products.find((item) => item.title === title);
  }

  function getSubtotal() {
    return cart.reduce((total, item) => {
      const unitPrice = Number(item.price) || 0;
      return total + unitPrice * item.quantity;
    }, 0);
  }

  function renderCart() {
    const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = getSubtotal();

    cartCountLabel.textContent = `${totalQuantity} ${totalQuantity === 1 ? "item" : "items"}`;
    cartCountBadge.textContent = String(totalQuantity);
    cartSubtotal.textContent = formatCurrency(subtotal);

    cartItems.innerHTML = "";

    if (!cart.length) {
      cartEmpty.hidden = false;
      cartItems.hidden = true;
      return;
    }

    cartEmpty.hidden = true;
    cartItems.hidden = false;

    cart.forEach((item) => {
      const product = getProduct(item.title);
      const row = document.createElement("article");
      row.className = "cart-item";
      const metadataLines = [];

      if (item.metadata?.runTitle) {
        metadataLines.push(`Run: ${item.metadata.runTitle}`);
      }

      if (item.metadata?.gpxFileName) {
        metadataLines.push(`GPX: ${item.metadata.gpxFileName}`);
      }

      row.innerHTML = `
        <div class="cart-item-swatch ${product?.swatchClass || ""}" aria-hidden="true"></div>
        <div>
          <h3>${item.title}</h3>
          <p>${item.size || "8x10"} • ${formatCurrency(item.price || 0)} each</p>
          ${metadataLines.length ? `<p class="cart-item-meta">${metadataLines.join(" • ")}</p>` : ""}
        </div>
        <div class="cart-item-controls">
          <div class="cart-quantity" aria-label="Quantity controls for ${item.title}">
            <button type="button" data-action="decrease" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-action="increase" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="cart-remove" data-action="remove">Remove</button>
        </div>
      `;

      row.querySelector('[data-action="decrease"]').addEventListener("click", () => changeQuantity(item.title, item.size || "8x10", -1, item.metadata));
      row.querySelector('[data-action="increase"]').addEventListener("click", () => changeQuantity(item.title, item.size || "8x10", 1, item.metadata));
      row.querySelector('[data-action="remove"]').addEventListener("click", () => removeItem(item.title, item.size || "8x10", item.metadata));

      cartItems.appendChild(row);
    });
  }

  function saveCart() {
    window.localStorage.setItem(storageKey, JSON.stringify(cart));
  }

  function loadCart() {
    try {
      const saved = window.localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => ({
          title: typeof item.title === "string" ? item.title : "",
          size: typeof item.size === "string" && item.size ? item.size : "8x10",
          quantity: Number(item.quantity) || 0,
          price: Number(item.price) || 0,
          metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : undefined,
        }))
        .filter((item) => item.title && item.quantity > 0);
    } catch {
      return [];
    }
  }

  renderCart();
})();
