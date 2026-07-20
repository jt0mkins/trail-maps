(() => {
  const storageKey = "trail-maps-cart";
  const cartButtons = document.querySelectorAll("[data-cart-add]");
  const cartItems = document.getElementById("cart-items");
  const cartEmpty = document.getElementById("cart-empty");
  const cartCount = document.getElementById("cart-count");
  const cartSubtotal = document.getElementById("cart-subtotal");
  const cartClear = document.getElementById("cart-clear");
  const cartCheckout = document.getElementById("cart-checkout");

  if (!cartButtons.length || !cartItems || !cartEmpty || !cartCount || !cartSubtotal || !cartClear || !cartCheckout) {
    return;
  }

  const formatCurrency = (value) => `NZ$${Math.round(value).toLocaleString("en-NZ")}`;

  const products = Array.from(document.querySelectorAll(".product-card")).map((card) => {
    const title = card.querySelector("h2")?.textContent?.trim() || "Trail Map";
    const description = card.querySelector(".product-content p")?.textContent?.trim() || "";
    const priceText = card.querySelector(".product-meta span")?.textContent?.trim() || "NZ$0";
    const price = Number(priceText.replace(/[^\d.]/g, "")) || 0;
    const swatchClass = Array.from(card.querySelector(".product-image")?.classList || []).find((className) => className !== "product-image");

    return { title, description, price, swatchClass };
  });

  const cart = loadCart();

  cartButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const productCard = event.currentTarget.closest(".product-card");
      const title = productCard?.querySelector("h2")?.textContent?.trim();
      const product = products.find((item) => item.title === title);

      if (!product) {
        return;
      }

      addItem(product.title);
    });
  });

  cartClear.addEventListener("click", () => {
    cart.length = 0;
    saveCart();
    renderCart();
  });

  cartCheckout.addEventListener("click", () => {
    if (!cart.length) {
      window.alert("Your cart is empty. Add a trail map first.");
      return;
    }

    const summary = cart
      .map((item) => `${item.quantity} x ${item.title}`)
      .join("\n");

    window.alert(`Demo checkout\n\n${summary}\n\nSubtotal: ${formatCurrency(getSubtotal())}`);
  });

  function addItem(title) {
    const existingItem = cart.find((item) => item.title === title);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ title, quantity: 1 });
    }

    saveCart();
    renderCart();
  }

  function removeItem(title) {
    const index = cart.findIndex((item) => item.title === title);

    if (index >= 0) {
      cart.splice(index, 1);
      saveCart();
      renderCart();
    }
  }

  function changeQuantity(title, delta) {
    const item = cart.find((entry) => entry.title === title);

    if (!item) {
      return;
    }

    item.quantity += delta;

    if (item.quantity <= 0) {
      removeItem(title);
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
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  }

  function renderCart() {
    const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = getSubtotal();

    cartCount.textContent = `${totalQuantity} ${totalQuantity === 1 ? "item" : "items"}`;
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
          <p>${formatCurrency(product?.price || 0)} each</p>
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

      row.querySelector('[data-action="decrease"]').addEventListener("click", () => changeQuantity(item.title, -1));
      row.querySelector('[data-action="increase"]').addEventListener("click", () => changeQuantity(item.title, 1));
      row.querySelector('[data-action="remove"]').addEventListener("click", () => removeItem(item.title));

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
          quantity: Number(item.quantity) || 0,
        }))
        .filter((item) => item.title && item.quantity > 0);
    } catch {
      return [];
    }
  }

  renderCart();
})();
