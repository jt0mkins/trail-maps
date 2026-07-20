(() => {
  const storageKey = "trail-maps-cart";
  const cartButtons = document.querySelectorAll("[data-cart-add]");
  const productCards = document.querySelectorAll(".product-card[data-product-page]");
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
    { title: "Milford Track Relief", description: "Classic fjord-to-alpine route artwork.", price: 179, swatchClass: "milford" },
    { title: "Routeburn Track Relief", description: "Alpine ridgelines and dramatic elevation shifts.", price: 169, swatchClass: "routeburn" },
    { title: "Abel Tasman Coast Track", description: "Coastal contours and beach-inspired styling.", price: 159, swatchClass: "abel" },
    { title: "Tongariro Alpine Crossing", description: "Volcanic terrain in a striking silhouette.", price: 149, swatchClass: "tongariro" },
    { title: "Kepler Track", description: "Fiordland forests, passes, and lakes.", price: 169, swatchClass: "kepler" },
    { title: "Heaphy Track", description: "West coast route with lush terrain styling.", price: 159, swatchClass: "heaphy" },
    { title: "Rakiura Track", description: "Remote island contours and a minimalist finish.", price: 149, swatchClass: "rangi" },
    { title: "Paparoa Track", description: "Rugged ridges and limestone country.", price: 159, swatchClass: "paparoa" },
    { title: "Whanganui Journey", description: "River-inspired contours and a warm neutral palette.", price: 149, swatchClass: "whanganui" },
    { title: "Great Walks Collection Set", description: "A curated trio of trail maps.", price: 449, swatchClass: "route-alternates" },
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
      const selectedSize = detailContainer?.querySelector(".size-selector input[type='radio']:checked")?.value || "8x10";

      if (!product) {
        return;
      }

      addItem(product.title, selectedSize, product.price);
    });
  });

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

  function addItem(title, size, price) {
    const existingItem = cart.find((item) => item.title === title && item.size === size);

    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.price = price || existingItem.price || 0;
    } else {
      cart.push({ title, size: size || "8x10", quantity: 1, price: Number(price) || 0 });
    }

    saveCart();
    renderCart();
  }

  function removeItem(title, size) {
    const index = cart.findIndex((item) => item.title === title && item.size === size);

    if (index >= 0) {
      cart.splice(index, 1);
      saveCart();
      renderCart();
    }
  }

  function changeQuantity(title, size, delta) {
    const item = cart.find((entry) => entry.title === title && entry.size === size);

    if (!item) {
      return;
    }

    item.quantity += delta;

    if (item.quantity <= 0) {
      removeItem(title, size);
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
      const product = getProduct(item.title);
      const unitPrice = Number(item.price) || product?.price || 0;
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

      row.innerHTML = `
        <div class="cart-item-swatch ${product?.swatchClass || ""}" aria-hidden="true"></div>
        <div>
          <h3>${item.title}</h3>
          <p>${item.size || "8x10"} • ${formatCurrency(product?.price || 0)} each</p>
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

      row.querySelector('[data-action="decrease"]').addEventListener("click", () => changeQuantity(item.title, item.size || "8x10", -1));
      row.querySelector('[data-action="increase"]').addEventListener("click", () => changeQuantity(item.title, item.size || "8x10", 1));
      row.querySelector('[data-action="remove"]').addEventListener("click", () => removeItem(item.title, item.size || "8x10"));

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
        }))
        .filter((item) => item.title && item.quantity > 0);
    } catch {
      return [];
    }
  }

  renderCart();
})();
