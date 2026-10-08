(() => {
  const storageKey = "trail-maps-cart";
  const cartButtons = document.querySelectorAll("[data-cart-add]");
  const productCards = document.querySelectorAll(".product-card[data-product-page]");
  const customGpxForm = document.querySelector("[data-custom-gpx-form]");
  const customGpxFileInput = document.querySelector("[data-custom-gpx-file]");
  const customRunTitleInput = document.querySelector("[data-custom-run-title]");
  const customGpxPreview = document.querySelector("[data-custom-gpx-preview]");
  const header = document.querySelector(".site-header");
  const siteNav = document.querySelector(".site-header .nav");

  // The success page is reached after Stripe payment, so the order is done.
  if (document.body.hasAttribute("data-clear-cart")) {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
  }

  // The walk-date and custom route forms have no submit button; stop Enter
  // in a text field from reloading the page.
  document.querySelectorAll("form:not(#contact-form)").forEach((form) => {
    form.addEventListener("submit", (event) => event.preventDefault());
  });

  if (siteNav && !document.querySelector(".nav-toggle")) {
    const navToggle = document.createElement("button");
    navToggle.className = "nav-toggle";
    navToggle.type = "button";
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-controls", "site-nav");
    navToggle.innerHTML = '<span class="nav-toggle-label">Menu</span><span class="nav-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span>';
    siteNav.id = "site-nav";
    siteNav.insertAdjacentElement("beforebegin", navToggle);

    const toggleMenu = () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      siteNav.classList.toggle("is-open", !isOpen);
    };

    navToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu();
    });

    document.addEventListener("click", (event) => {
      if (!siteNav.contains(event.target) && !navToggle.contains(event.target)) {
        navToggle.setAttribute("aria-expanded", "false");
        siteNav.classList.remove("is-open");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        navToggle.setAttribute("aria-expanded", "false");
        siteNav.classList.remove("is-open");
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 780) {
        navToggle.setAttribute("aria-expanded", "false");
        siteNav.classList.remove("is-open");
      }
    });
  }

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
            <svg class="header-cart-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1"></circle><circle cx="18" cy="20" r="1"></circle><path d="M2.5 3h2l2.4 12.2a1.5 1.5 0 0 0 1.48 1.3h8.24a1.5 1.5 0 0 0 1.47-1.18L20.5 7H6"></path></svg>
            <span class="header-cart-label">Cart</span>
            <span class="header-cart-badge" id="cart-count-badge">0</span>
          </button>

          <div class="header-cart-panel" id="header-cart-panel" aria-live="polite" hidden>
            <div class="cart-panel-header">
              <div class="cart-panel-title">
                <strong>Cart summary</strong>
                <span id="cart-count-label">0 items</span>
              </div>
              <button type="button" class="cart-panel-close" id="cart-panel-close" aria-label="Close cart">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"></path></svg>
              </button>
            </div>
            <div id="cart-empty" class="cart-empty">
              <svg class="cart-empty-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1"></circle><circle cx="18" cy="20" r="1"></circle><path d="M2.5 3h2l2.4 12.2a1.5 1.5 0 0 0 1.48 1.3h8.24a1.5 1.5 0 0 0 1.47-1.18L20.5 7H6"></path></svg>
              <p>Your cart is empty.</p>
              <a href="store.html" class="cart-empty-link">Browse trail maps →</a>
            </div>
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

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));

  const itemDomKey = (title, size, metadata) => `${title}__${size}__${JSON.stringify(metadata || {})}`;

  const catalogProducts = [
    { title: "Milford Track", description: "Classic fjord-to-alpine route artwork.", price: 45, swatchClass: "milford", sizes: { "8x10": 45, "A4": 65, "A3": 85 } },
    { title: "Routeburn Track", description: "Alpine ridgelines and dramatic elevation shifts.", price: 45, swatchClass: "routeburn", sizes: { "8x10": 45, "A4": 65, "A3": 85 } },
    { title: "Abel Tasman Coast Track", description: "Coastal contours and beach-inspired styling.", price: 45, swatchClass: "abel", sizes: { "8x10": 45, "A4": 65, "A3": 85 } },
    { title: "Tongariro Alpine Crossing", description: "Volcanic terrain in a striking silhouette.", price: 45, swatchClass: "tongariro", sizes: { "8x10": 45, "A4": 65, "A3": 85 } },
    { title: "Kepler Track", description: "Fiordland forests, passes, and lakes.", price: 45, swatchClass: "kepler", sizes: { "8x10": 45, "A4": 65, "A3": 85 } },
    { title: "Heaphy Track", description: "West coast route with lush terrain styling.", price: 45, swatchClass: "heaphy", sizes: { "8x10": 45, "A4": 65, "A3": 85 } },
    { title: "Rakiura Track", description: "Remote island contours and a minimalist finish.", price: 45, swatchClass: "rangi", sizes: { "8x10": 45, "A4": 65, "A3": 85 } },
    { title: "Paparoa Track", description: "Rugged ridges and limestone country.", price: 45, swatchClass: "paparoa", sizes: { "8x10": 45, "A4": 65, "A3": 85 } },
    { title: "Whanganui Journey", description: "River-inspired contours and a warm neutral palette.", price: 45, swatchClass: "whanganui", sizes: { "8x10": 45, "A4": 65, "A3": 85 } },
  ];

  const customRouteTitle = "Custom GPX Run";
  const customRouteSizes = { "8x10": 55, "A4": 75, "A3": 95 };

  // Current price for a cart line, or null if the product/size no longer exists.
  const lookupPrice = (title, size) => {
    const sizes = title === customRouteTitle ? customRouteSizes : catalogProducts.find((item) => item.title === title)?.sizes;
    return sizes && sizes[size] != null ? sizes[size] : null;
  };

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
      return `From ${formatCurrency(price)}`;
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

  // Inject size selector UI into product detail pages only (store cards keep
  // their "From $X" summary price and pick a size after clicking through).
  Array.from(document.querySelectorAll(".product-detail")).forEach((container) => {
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
        // Only the card itself; let Enter/Space on the inner button work normally.
        if (event.target !== card) return;
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
      const card = event.currentTarget.closest(".product-card");
      if (card) {
        toggleSizePicker(event.currentTarget, card);
        return;
      }

      const detailContainer = event.currentTarget.closest(".product-detail");
      const titleElement = detailContainer?.querySelector("h1, h2");
      const title = titleElement?.textContent?.trim();
      const product = products.find((item) => item.title === title);
      let selectedSize = "8x10";
      if (detailContainer?.matches("[data-custom-gpx-product]")) {
        selectedSize = "Custom";
      } else {
        const sizeSelect = detailContainer?.querySelector("select.size-selector");
        if (sizeSelect) {
          selectedSize = sizeSelect.value || selectedSize;
        } else {
          const checked = detailContainer?.querySelector(".size-selector input[type='radio']:checked");
          if (checked) selectedSize = checked.value;
        }
      }

      if (!product) return;

      const unitPrice = (product.sizes && product.sizes[selectedSize]) ? product.sizes[selectedSize] : product.price;
      const walkDatesInput = detailContainer?.querySelector("[data-custom-run-title]");
      const walkDates = walkDatesInput?.value.trim();
      const metadata = walkDates ? { walkDates } : {};

      addItem(product.title, selectedSize, unitPrice, metadata);
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

      // Escaped: a file name or title like "<img onerror=…>" must not become HTML.
      const fileLabel = file ? `Uploaded file: ${escapeHtml(file.name)}` : "No file selected yet.";
      const titleLabel = title ? `Run title: ${escapeHtml(title)}` : "Add a run title to personalise the order.";
      customGpxPreview.innerHTML = `<strong>Custom route ready</strong><br />${fileLabel}<br />${titleLabel}`;
    };

    const maxGpxBytes = 10 * 1024 * 1024;
    customGpxFileInput.addEventListener("change", () => {
      const file = customGpxFileInput.files?.[0];
      if (file && (!/\.gpx$/i.test(file.name) || file.size > maxGpxBytes)) {
        window.alert("Please choose a .gpx file that is 10 MB or smaller.");
        customGpxFileInput.value = "";
      }
      updateCustomGpxPreview();
    });
    customRunTitleInput.addEventListener("input", updateCustomGpxPreview);

    const customPriceSpan = document.querySelector("[data-custom-gpx-product] .product-detail-meta span");
    const getCustomSize = () => document.querySelector("[data-custom-gpx-product] .size-selector input[type='radio']:checked")?.value || "8x10";
    const updateCustomPrice = () => {
      if (customPriceSpan) customPriceSpan.textContent = formatCurrency(customRouteSizes[getCustomSize()]);
    };

    document.querySelectorAll("[data-custom-gpx-product] .size-selector input[type='radio']").forEach((radio) => {
      radio.addEventListener("change", updateCustomPrice);
    });
    updateCustomPrice();

    const customButton = document.querySelector("[data-custom-gpx-product] [data-cart-add]");
    if (customButton) {
      customButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const runTitle = customRunTitleInput.value.trim();
        const file = customGpxFileInput.files?.[0];
        const fieldValue = (selector) => customGpxForm.querySelector(selector)?.value.trim() || "";
        const runDistance = fieldValue("[data-custom-run-distance]");
        const runElevation = fieldValue("[data-custom-run-elevation]");
        const runDates = fieldValue("[data-custom-run-dates]");

        if (!runTitle || !runDistance || !runElevation || !runDates || !file) {
          customGpxForm.reportValidity();
          return;
        }

        const size = getCustomSize();
        addItem(customRouteTitle, size, customRouteSizes[size], {
          runTitle,
          runDistance,
          runElevation,
          runDates,
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

  const cartPanelClose = document.getElementById("cart-panel-close");

  if (headerCartToggle && headerCartPanel) {
    headerCartToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = headerCartToggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeCartPanel();
      } else {
        openCartPanel();
      }
    });

    cartPanelClose?.addEventListener("click", (event) => {
      event.stopPropagation();
      closeCartPanel();
    });

    document.addEventListener("click", (event) => {
      // composedPath() still includes the panel when the clicked button was
      // removed by a re-render (e.g. the quantity +/− and remove buttons).
      const path = event.composedPath();
      if (!path.includes(headerCartPanel) && !path.includes(headerCartToggle)) {
        closeCartPanel();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeCartPanel();
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

    const originalLabel = cartCheckout.textContent;
    cartCheckout.disabled = true;
    cartCheckout.textContent = "Starting checkout…";

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

      // On a static host (e.g. GitHub Pages) there is no /checkout endpoint,
      // so the response is a 404 page rather than JSON.
      let data = null;
      try {
        data = await response.json();
      } catch {}

      if (!data) {
        window.alert("Online checkout isn't available on this site yet. Please get in touch through the Contact page to place your order.");
        return;
      }

      // Only ever redirect to Stripe's hosted checkout page.
      if (response.ok && isStripeCheckoutUrl(data.checkoutUrl)) {
        window.location.href = data.checkoutUrl;
        return;
      }

      window.alert(`${response.ok ? "Checkout is not available yet." : "Checkout could not be started."}\n\n${summary}\n\nSubtotal: ${formatCurrency(subtotal)}\n\n${data.message || ""}`);
    } catch (error) {
      window.alert(`Checkout could not be started. ${error.message}`);
    } finally {
      cartCheckout.disabled = false;
      cartCheckout.textContent = originalLabel;
    }
  });

  function isStripeCheckoutUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "checkout.stripe.com";
    } catch {
      return false;
    }
  }

  function addItem(title, size, price, metadata = {}) {
    const normalizedMetadata = metadata && typeof metadata === "object" ? metadata : {};
    const existingItem = cart.find((item) => item.title === title && item.size === size && JSON.stringify(item.metadata || {}) === JSON.stringify(normalizedMetadata));

    if (existingItem) {
      existingItem.quantity = Math.min(99, existingItem.quantity + 1);
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
    openCartPanel();
    bumpCartBadge();
    flashCartRow(itemDomKey(title, size || "8x10", normalizedMetadata));
  }

  function openCartPanel() {
    if (!headerCartToggle || !headerCartPanel) return;
    headerCartToggle.setAttribute("aria-expanded", "true");
    headerCartPanel.hidden = false;
  }

  function closeCartPanel() {
    if (!headerCartToggle || !headerCartPanel) return;
    headerCartToggle.setAttribute("aria-expanded", "false");
    headerCartPanel.hidden = true;
  }

  function bumpCartBadge() {
    if (!cartCountBadge) return;
    cartCountBadge.classList.remove("bump");
    void cartCountBadge.offsetWidth;
    cartCountBadge.classList.add("bump");
  }

  function flashCartRow(key) {
    if (!cartItems) return;
    const row = Array.from(cartItems.children).find((el) => el.dataset.itemKey === key);
    row?.classList.add("just-added");
  }

  let activeSizePicker = null;
  let activeSizePickerButton = null;

  function closeSizePicker() {
    activeSizePicker?.remove();
    activeSizePicker = null;
    activeSizePickerButton = null;
  }

  function toggleSizePicker(button, card) {
    if (activeSizePickerButton === button) {
      closeSizePicker();
      return;
    }

    closeSizePicker();

    const title = card.querySelector("h2")?.textContent?.trim();
    if (!title) return;

    const catalogMatch = catalogProducts.find((item) => item.title === title);
    if (!catalogMatch) {
      // Products like the custom route need details (GPX file etc.) that are
      // only collected on their own page.
      const productPage = card.getAttribute("data-product-page");
      if (productPage) window.location.href = productPage;
      return;
    }
    const sizes = catalogMatch.sizes;

    const picker = document.createElement("div");
    picker.className = "size-picker";
    picker.setAttribute("role", "menu");
    picker.setAttribute("aria-label", `Choose a size for ${title}`);

    Object.entries(sizes).forEach(([sizeKey, price]) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "size-picker-option";
      option.setAttribute("role", "menuitem");

      const sizeLabel = document.createElement("span");
      sizeLabel.textContent = sizeKey;
      const priceLabel = document.createElement("span");
      priceLabel.textContent = formatCurrency(price);
      option.append(sizeLabel, priceLabel);

      option.addEventListener("click", (event) => {
        event.stopPropagation();
        addItem(title, sizeKey, price, {});
        closeSizePicker();
      });

      picker.appendChild(option);
    });

    document.body.appendChild(picker);

    const buttonRect = button.getBoundingClientRect();
    const pickerRect = picker.getBoundingClientRect();
    const left = Math.max(8, Math.min(buttonRect.right - pickerRect.width, window.innerWidth - pickerRect.width - 8));
    picker.style.top = `${buttonRect.bottom + 8}px`;
    picker.style.left = `${left}px`;

    activeSizePicker = picker;
    activeSizePickerButton = button;
    // preventScroll: a focus-triggered scroll would fire the scroll listener
    // below and close the picker straight away (common on phones).
    picker.querySelector(".size-picker-option")?.focus({ preventScroll: true });
  }

  document.addEventListener("click", (event) => {
    if (activeSizePicker && !activeSizePicker.contains(event.target) && !activeSizePickerButton?.contains(event.target)) {
      closeSizePicker();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSizePicker();
    }
  });

  window.addEventListener("scroll", () => closeSizePicker(), true);
  window.addEventListener("resize", () => closeSizePicker());

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

    item.quantity = Math.min(99, item.quantity + delta);

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
      row.dataset.itemKey = itemDomKey(item.title, item.size || "8x10", item.metadata);
      const metadataLines = [];

      if (item.metadata?.runTitle) {
        metadataLines.push(`Run: ${escapeHtml(item.metadata.runTitle)}`);
      }

      if (item.metadata?.runDistance) {
        metadataLines.push(`Distance: ${escapeHtml(item.metadata.runDistance)}`);
      }

      if (item.metadata?.runElevation) {
        metadataLines.push(`Elevation: ${escapeHtml(item.metadata.runElevation)}`);
      }

      if (item.metadata?.runDates) {
        metadataLines.push(`Date: ${escapeHtml(item.metadata.runDates)}`);
      }

      if (item.metadata?.gpxFileName) {
        metadataLines.push(`GPX: ${escapeHtml(item.metadata.gpxFileName)}`);
      }

      if (item.metadata?.walkDates) {
        metadataLines.push(`Dates: ${escapeHtml(item.metadata.walkDates)}`);
      }

      const safeTitle = escapeHtml(item.title);

      row.innerHTML = `
        <div class="cart-item-swatch ${product?.swatchClass || ""}" aria-hidden="true"></div>
        <div>
          <h3>${safeTitle}</h3>
          <p>${escapeHtml(item.size || "8x10")} • ${formatCurrency(item.price || 0)} each</p>
          ${metadataLines.length ? `<p class="cart-item-meta">${metadataLines.join(" • ")}</p>` : ""}
        </div>
        <div class="cart-item-controls">
          <div class="cart-quantity" aria-label="Quantity controls for ${safeTitle}">
            <button type="button" data-action="decrease" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-action="increase" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="cart-remove" data-action="remove" aria-label="Remove ${safeTitle} from cart">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"></path></svg>
          </button>
        </div>
      `;

      row.querySelector('[data-action="decrease"]').addEventListener("click", () => changeQuantity(item.title, item.size || "8x10", -1, item.metadata));
      row.querySelector('[data-action="increase"]').addEventListener("click", () => changeQuantity(item.title, item.size || "8x10", 1, item.metadata));
      row.querySelector('[data-action="remove"]').addEventListener("click", () => removeItem(item.title, item.size || "8x10", item.metadata));

      cartItems.appendChild(row);
    });
  }

  function saveCart() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {}
  }

  // Keep only the order details the site collects, as short strings.
  function cleanMetadata(metadata) {
    if (!metadata || typeof metadata !== "object") return undefined;
    const allowedKeys = ["walkDates", "runTitle", "runDistance", "runElevation", "runDates", "gpxFileName"];
    const cleaned = {};
    allowedKeys.forEach((key) => {
      if (typeof metadata[key] === "string" && metadata[key].trim()) {
        cleaned[key] = metadata[key].trim().slice(0, 200);
      }
    });
    return Object.keys(cleaned).length ? cleaned : undefined;
  }

  function loadCart() {
    try {
      const saved = window.localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(parsed)) {
        return [];
      }

      // Re-price saved items from the current price list so old prices don't
      // linger, and drop anything no longer sold (e.g. the collection set).
      return parsed
        .map((item) => {
          const title = typeof item.title === "string" ? item.title : "";
          const size = typeof item.size === "string" && item.size ? item.size : "8x10";
          return {
            title,
            size,
            quantity: Math.min(99, Math.floor(Number(item.quantity)) || 0),
            price: lookupPrice(title, size),
            metadata: cleanMetadata(item.metadata),
          };
        })
        .filter((item) => item.title && item.quantity > 0 && item.price != null);
    } catch {
      return [];
    }
  }

  renderCart();
})();
