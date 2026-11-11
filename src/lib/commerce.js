import { API_URL, readApiResponse } from "./api";

const GUEST_CART_KEY = "sharebox_guest_cart";

export async function commerceRequest(path, options = {}) {
  const response = await fetch(`${API_URL}/marketplace${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await readApiResponse(response);
  if (!response.ok) {
    const error = new Error(data.message || "The request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export function readGuestCart() {
  try {
    const value = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
    return Array.isArray(value)
      ? value.filter(
          (line) =>
            typeof line.productId === "string" &&
            Number.isInteger(line.quantity) &&
            line.quantity > 0
        )
      : [];
  } catch {
    return [];
  }
}

export function writeGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("sharebox-cart-changed"));
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
  window.dispatchEvent(new Event("sharebox-cart-changed"));
}

export async function addProductToCart(product, quantity = 1, authenticated = false) {
  if (!product?._id || !Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Choose a valid product quantity.");
  }
  if (authenticated) {
    const result = await commerceRequest(`/cart/items/${product._id}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
    window.dispatchEvent(new Event("sharebox-cart-changed"));
    return result;
  }
  const cart = readGuestCart();
  const current = cart.find((line) => line.productId === product._id);
  const nextQuantity = (current?.quantity || 0) + quantity;
  if (nextQuantity > product.stock) {
    throw new Error(`Only ${product.stock} item(s) are currently available.`);
  }
  if (current) current.quantity = nextQuantity;
  else cart.push({ productId: product._id, quantity });
  writeGuestCart(cart);
  return { items: cart };
}

export function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}
