import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../lib/api";
import { formatPrice } from "../lib/commerce";
import MarketplaceLayout from "../components/MarketplaceLayout";

const tabs = ["Overview", "Active products", "Removed products", "Orders", "Payments", "Coupons", "Categories"];
const statuses = ["Order Placed", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Return Requested", "Returned"];

async function adminRequest(path, options = {}) {
  const response = await fetch(`${API_URL}/admin/marketplace${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "Admin request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function Stat({ label, value, note }) {
  return <article className="rounded-xl border border-[#E8DFD0] bg-white p-4"><p className="text-xs font-semibold text-[#7D8976]">{label}</p><p className="mt-2 text-2xl font-bold text-[#641E32]">{value}</p>{note && <p className="mt-1 text-[11px] text-[#7D8976]">{note}</p>}</article>;
}

function ProductEditor({ product, categories, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: product.name,
    description: product.description,
    images: product.images.join("\n"),
    price: String(product.price),
    originalPrice: String(product.originalPrice),
    category: product.category,
    subcategory: product.subcategory || "",
    stock: String(product.stock),
  });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      onSave({
        ...form,
        images: form.images.split(/\r?\n/).map((image) => image.trim()).filter(Boolean),
        price: Number(form.price),
        originalPrice: Number(form.originalPrice),
        stock: Number(form.stock),
      });
    }} className="mt-4 grid gap-3 rounded-xl bg-[#F7F3EB] p-4 sm:grid-cols-2">
      <label className="grid gap-1 text-xs font-semibold">Name<input required value={form.name} onChange={(event) => update("name", event.target.value)} className="rounded-lg border border-[#E8DFD0] bg-white px-3 py-2" /></label>
      <label className="grid gap-1 text-xs font-semibold">Category<select required value={form.category} onChange={(event) => update("category", event.target.value)} className="rounded-lg border border-[#E8DFD0] bg-white px-3 py-2">{categories.filter((category) => category.isActive).map((category) => <option key={category._id} value={category.name}>{category.name}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-semibold">Current price<input required type="number" min="0" value={form.price} onChange={(event) => update("price", event.target.value)} className="rounded-lg border border-[#E8DFD0] bg-white px-3 py-2" /></label>
      <label className="grid gap-1 text-xs font-semibold">Original price<input required type="number" min="0" value={form.originalPrice} onChange={(event) => update("originalPrice", event.target.value)} className="rounded-lg border border-[#E8DFD0] bg-white px-3 py-2" /></label>
      <label className="grid gap-1 text-xs font-semibold">Stock<input required type="number" min="0" value={form.stock} onChange={(event) => update("stock", event.target.value)} className="rounded-lg border border-[#E8DFD0] bg-white px-3 py-2" /></label>
      <label className="grid gap-1 text-xs font-semibold">Subcategory<input value={form.subcategory} onChange={(event) => update("subcategory", event.target.value)} className="rounded-lg border border-[#E8DFD0] bg-white px-3 py-2" /></label>
      <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Description<textarea required maxLength={5000} value={form.description} onChange={(event) => update("description", event.target.value)} className="min-h-20 rounded-lg border border-[#E8DFD0] bg-white px-3 py-2" /></label>
      <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Secure image URLs, one per line<textarea required value={form.images} onChange={(event) => update("images", event.target.value)} className="min-h-20 rounded-lg border border-[#E8DFD0] bg-white px-3 py-2" /></label>
      <div className="flex gap-2 sm:col-span-2"><button className="rounded-lg bg-[#641E32] px-4 py-2 text-sm font-bold text-white">Save changes</button><button type="button" onClick={onCancel} className="rounded-lg border border-[#E8DFD0] bg-white px-4 py-2 text-sm font-semibold">Cancel</button></div>
    </form>
  );
}

export default function MarketplaceAdmin() {
  const [tab, setTab] = useState("Overview");
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState("");
  const [productForm, setProductForm] = useState({ name: "", description: "", images: "", price: "", originalPrice: "", category: "", subcategory: "", stock: "" });
  const [couponForm, setCouponForm] = useState({ code: "", type: "percentage", value: "", minimumPurchase: "0", expiresAt: "", usageLimit: "" });
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "" });

  const load = useCallback(async (targetTab = tab) => {
    setLoading(true);
    setError("");
    try {
      if (targetTab === "Overview") setStats(await adminRequest("/dashboard"));
      if (targetTab === "Active products" || targetTab === "Removed products") {
        const [data, taxonomy] = await Promise.all([
          adminRequest(`/products?removed=${targetTab === "Removed products"}`),
          adminRequest("/categories"),
        ]);
        setProducts(data.products);
        setCategories(taxonomy.categories);
        setSelected([]);
      }
      if (targetTab === "Orders") setOrders((await adminRequest("/orders")).orders);
      if (targetTab === "Payments") setPayments((await adminRequest("/payments")).payments);
      if (targetTab === "Coupons") setCoupons((await adminRequest("/coupons")).coupons);
      if (targetTab === "Categories") setCategories((await adminRequest("/categories")).categories);
    } catch (cause) {
      setError(cause.status === 401 || cause.status === 403 ? "Administrator access is required." : cause.message);
    } finally { setLoading(false); }
  }, [tab]);
  useEffect(() => {
    const timer = window.setTimeout(() => load(tab), 0);
    return () => window.clearTimeout(timer);
  }, [tab, load]);

  const removeProduct = async (product) => {
    const reason = window.prompt(`Why are you removing “${product.name}”?`);
    if (reason === null) return;
    if (!reason.trim()) { setError("Enter a reason to remove this product."); return; }
    try {
      await adminRequest(`/products/${product._id}/removal`, { method: "PATCH", body: JSON.stringify({ removed: true, reason }) });
      setNotice("Product removed from public listings. It can be restored.");
      await load(tab);
    } catch (cause) { setError(cause.message); }
  };

  const restoreProduct = async (product) => {
    if (!window.confirm(`Restore “${product.name}” to public listings?`)) return;
    try {
      await adminRequest(`/products/${product._id}/removal`, { method: "PATCH", body: JSON.stringify({ removed: false }) });
      setNotice("Product restored.");
      await load(tab);
    } catch (cause) { setError(cause.message); }
  };

  const permanentlyDelete = async (ids) => {
    if (!window.confirm(`Permanently delete ${ids.length} selected product(s)? Their cart, wishlist, and review references will be removed; order snapshots will be retained. This cannot be undone.`)) return;
    try {
      const result = await adminRequest("/products", { method: "DELETE", body: JSON.stringify({ productIds: ids }) });
      setNotice(result.message);
      await load(tab);
    } catch (cause) { setError(cause.message); }
  };

  const createProduct = async (event) => {
    event.preventDefault();
    try {
      const body = {
        ...productForm,
        images: productForm.images.split(/\r?\n/).map((image) => image.trim()).filter(Boolean),
        price: Number(productForm.price),
        originalPrice: Number(productForm.originalPrice),
        stock: Number(productForm.stock),
      };
      await adminRequest("/products", { method: "POST", body: JSON.stringify(body) });
      setProductForm({ name: "", description: "", images: "", price: "", originalPrice: "", category: "", subcategory: "", stock: "" });
      setShowProductForm(false);
      setNotice("Product created and published.");
      setTab("Active products");
      await load("Active products");
    } catch (cause) { setError(cause.message); }
  };

  const saveProduct = async (id, body) => {
    try {
      await adminRequest(`/products/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      setEditingProductId("");
      setNotice("Product updated.");
      await load(tab);
    } catch (cause) { setError(cause.message); }
  };

  const updateOrder = async (id, status) => {
    try {
      await adminRequest(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setNotice("Order status updated.");
      await load("Orders");
    } catch (cause) { setError(cause.message); }
  };

  const createCoupon = async (event) => {
    event.preventDefault();
    try {
      const body = {
        ...couponForm,
        value: Number(couponForm.value),
        minimumPurchase: Number(couponForm.minimumPurchase),
        usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : null,
        expiresAt: new Date(couponForm.expiresAt).toISOString(),
      };
      await adminRequest("/coupons", { method: "POST", body: JSON.stringify(body) });
      setCouponForm({ code: "", type: "percentage", value: "", minimumPurchase: "0", expiresAt: "", usageLimit: "" });
      setNotice("Coupon created.");
      await load("Coupons");
    } catch (cause) { setError(cause.message); }
  };

  const createCategory = async (event) => {
    event.preventDefault();
    try {
      await adminRequest("/categories", { method: "POST", body: JSON.stringify(categoryForm) });
      setCategoryForm({ name: "", slug: "" });
      setNotice("Category created.");
      await load("Categories");
    } catch (cause) { setError(cause.message); }
  };

  return (
    <MarketplaceLayout>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-widest text-[#7D8976]">ShareBox operations</p><h1 className="mt-1 text-3xl font-bold">Marketplace admin</h1></div>
          <Link to="/admin" className="text-sm font-semibold text-[#641E32]">Community moderation →</Link>
        </div>
        {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="mt-4 rounded-xl border border-[#D9E1D2] bg-[#F1F4ED] p-3 text-sm text-[#44513F]">{notice}<button className="ml-3 font-bold" onClick={() => setNotice("")}>Dismiss</button></div>}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">{tabs.map((name) => <button key={name} onClick={() => setTab(name)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === name ? "bg-[#641E32] text-white" : "border border-[#E8DFD0] bg-white text-[#66705F]"}`}>{name}</button>)}</div>
        {loading ? <div className="py-16 text-center text-sm text-[#7D8976]">Loading admin data…</div> : null}
        {!loading && tab === "Overview" && stats && <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <Stat label="Users" value={stats.users} /><Stat label="All products" value={stats.products} /><Stat label="Active products" value={stats.activeProducts} /><Stat label="Removed products" value={stats.removedProducts} /><Stat label="Orders" value={stats.orders} /><Stat label="Pending orders" value={stats.pendingOrders} /><Stat label="Cancelled orders" value={stats.cancelledOrders} /><Stat label="Pending payments" value={stats.pendingPayments} /><Stat label="Simulated payments" value={stats.simulatedPayments} note="Development test transactions only" /><Stat label="Actual revenue" value={formatPrice(stats.actualRevenue)} note="No real payment processor enabled" /><Stat label="Simulated order value" value={formatPrice(stats.simulatedOrderValue)} note="Not actual revenue" />
        </section>}
        {!loading && (tab === "Active products" || tab === "Removed products") && <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#7D8976]">{products.length} product(s) · Removal history is retained on each listing.</p>
            <div className="flex gap-2">
              {tab === "Active products" && <button className="rounded-lg bg-[#641E32] px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowProductForm((open) => !open)}>{showProductForm ? "Close form" : "Add product"}</button>}
              {tab === "Removed products" && selected.length > 0 && <button className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700" onClick={() => permanentlyDelete(selected)}>Permanently delete ({selected.length})</button>}
            </div>
          </div>
          {showProductForm && <form onSubmit={createProduct} className="mt-4 grid gap-3 rounded-2xl border border-[#E8DFD0] bg-white p-5 sm:grid-cols-2">
            <h2 className="font-bold sm:col-span-2">New product</h2>
            {[["name", "Product name"], ["subcategory", "Subcategory (optional)"], ["price", "Current price (INR)"], ["originalPrice", "Original price (INR)"], ["stock", "Stock quantity"]].map(([key, label]) => <label key={key} className="grid gap-1 text-xs font-semibold text-[#66705F]">{label}<input required={!["subcategory"].includes(key)} type={["price", "originalPrice", "stock"].includes(key) ? "number" : "text"} min={["price", "originalPrice", "stock"].includes(key) ? "0" : undefined} value={productForm[key]} onChange={(event) => setProductForm({ ...productForm, [key]: event.target.value })} className="rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm" /></label>)}
            <label className="grid gap-1 text-xs font-semibold text-[#66705F]">Category<select required value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} className="rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm"><option value="">Select category</option>{categories.filter((category) => category.isActive).map((category) => <option key={category._id} value={category.name}>{category.name}</option>)}</select>{categories.length === 0 && <span className="font-normal">Create a category in the Categories tab first.</span>}</label>
            <label className="grid gap-1 text-xs font-semibold text-[#66705F] sm:col-span-2">Description<textarea required maxLength={5000} value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} className="min-h-24 rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm" /></label>
            <label className="grid gap-1 text-xs font-semibold text-[#66705F] sm:col-span-2">Image URLs (one secure HTTPS URL per line)<textarea required value={productForm.images} onChange={(event) => setProductForm({ ...productForm, images: event.target.value })} className="min-h-20 rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm" /></label>
            <button className="rounded-xl bg-[#641E32] px-4 py-3 text-sm font-bold text-white sm:col-span-2">Publish product</button>
          </form>}
          <div className="mt-4 space-y-3">{products.map((product) => <article key={product._id} className="rounded-xl border border-[#E8DFD0] bg-white p-4">
            {editingProductId === product._id ? <ProductEditor product={product} categories={categories} onSave={(body) => saveProduct(product._id, body)} onCancel={() => setEditingProductId("")} /> : <>
            <div className="flex items-start gap-3">
              <input type="checkbox" disabled={tab !== "Removed products"} checked={selected.includes(product._id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, product._id] : current.filter((id) => id !== product._id))} aria-label={`Select ${product.name}`} className="mt-1 accent-[#641E32] disabled:opacity-30" />
              {product.images?.[0] && <img src={product.images[0]} alt="" className="h-16 w-16 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1"><h2 className="font-bold">{product.name}</h2><p className="mt-1 text-xs text-[#66705F]">{product.category} · Stock {product.stock} · {formatPrice(product.price)}{product.originalPrice > product.price ? ` (was ${formatPrice(product.originalPrice)})` : ""}</p>{product.removalHistory?.length > 0 && <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-[#641E32]">Removal history ({product.removalHistory.length})</summary>{product.removalHistory.map((entry, index) => <p key={`${entry.removedAt}-${index}`} className="mt-1 text-[#66705F]">Removed {new Date(entry.removedAt).toLocaleString()}: {entry.reason || "No reason recorded"}{entry.restoredAt ? ` · Restored ${new Date(entry.restoredAt).toLocaleString()}` : ""}</p>)}</details>}</div>
              <div className="flex flex-col gap-2">{product.isActive ? <><button onClick={() => setEditingProductId(product._id)} className="rounded-lg border border-[#E8DFD0] px-3 py-2 text-xs font-semibold text-[#641E32]">Edit</button><button onClick={() => removeProduct(product)} className="rounded-lg border border-[#E8DFD0] px-3 py-2 text-xs font-semibold text-[#641E32]">Remove</button></> : <><button onClick={() => restoreProduct(product)} className="rounded-lg border border-[#E8DFD0] px-3 py-2 text-xs font-semibold text-[#53664C]">Restore</button><button onClick={() => permanentlyDelete([product._id])} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete forever</button></>}</div>
            </div>
            </>}
          </article>)}</div>
        </>}
        {!loading && tab === "Orders" && <div className="mt-4 space-y-3">{orders.map((order) => <article key={order._id} className="rounded-xl border border-[#E8DFD0] bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">#{order._id.slice(-8).toUpperCase()} · {order.user?.name || "Customer"}</p><p className="text-xs text-[#7D8976]">{order.user?.email} · {new Date(order.createdAt).toLocaleString()}</p></div><p className="font-bold text-[#641E32]">{formatPrice(order.total)}</p></div><p className="mt-2 text-xs">Payment: {order.paymentStatus === "simulated_success" ? "Simulated (not real)" : order.paymentStatus}</p><label className="mt-3 flex items-center gap-2 text-xs font-semibold">Order status<select value={order.status} onChange={(event) => updateOrder(order._id, event.target.value)} className="rounded-lg border border-[#E8DFD0] px-2 py-2">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label></article>)}</div>}
        {!loading && tab === "Payments" && <div className="mt-4 space-y-3">{payments.map((payment) => <article key={payment._id} className="rounded-xl border border-[#E8DFD0] bg-white p-4"><p className="font-bold">{formatPrice(payment.amount)} · {payment.status}</p><p className="mt-1 text-xs text-[#7D8976]">{payment.user?.name} · {payment.user?.email} · Order #{payment.order?._id?.slice(-8)} · {payment.simulated ? "Simulated; no money transferred" : payment.provider}</p>{payment.reference && <p className="mt-1 font-mono text-xs">{payment.reference}</p>}</article>)}</div>}
        {!loading && tab === "Coupons" && <><form onSubmit={createCoupon} className="mt-4 grid gap-3 rounded-xl border border-[#E8DFD0] bg-white p-4 sm:grid-cols-3"><input required placeholder="Code" value={couponForm.code} onChange={(event) => setCouponForm({ ...couponForm, code: event.target.value.toUpperCase() })} className="rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm" /><select value={couponForm.type} onChange={(event) => setCouponForm({ ...couponForm, type: event.target.value })} className="rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm"><option value="percentage">Percent off</option><option value="fixed">Fixed INR off</option></select><input required type="number" min="1" placeholder="Discount value" value={couponForm.value} onChange={(event) => setCouponForm({ ...couponForm, value: event.target.value })} className="rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm" /><input required type="number" min="0" placeholder="Minimum purchase" value={couponForm.minimumPurchase} onChange={(event) => setCouponForm({ ...couponForm, minimumPurchase: event.target.value })} className="rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm" /><input required type="datetime-local" value={couponForm.expiresAt} onChange={(event) => setCouponForm({ ...couponForm, expiresAt: event.target.value })} className="rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm" /><input type="number" min="1" placeholder="Usage limit (optional)" value={couponForm.usageLimit} onChange={(event) => setCouponForm({ ...couponForm, usageLimit: event.target.value })} className="rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm" /><button className="rounded-lg bg-[#641E32] px-3 py-2 text-sm font-bold text-white sm:col-span-3">Create coupon</button></form><div className="mt-4 space-y-2">{coupons.map((coupon) => <article key={coupon._id} className="flex items-center justify-between rounded-xl border border-[#E8DFD0] bg-white p-4"><div><p className="font-bold">{coupon.code} · {coupon.type === "percentage" ? `${coupon.value}%` : formatPrice(coupon.value)}</p><p className="text-xs text-[#7D8976]">Minimum {formatPrice(coupon.minimumPurchase)} · expires {new Date(coupon.expiresAt).toLocaleDateString()} · used {coupon.usedCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ""}</p></div><button onClick={async () => { try { await adminRequest(`/coupons/${coupon._id}`, { method: "PATCH", body: JSON.stringify({ isActive: !coupon.isActive }) }); await load("Coupons"); } catch (cause) { setError(cause.message); } }} className="text-xs font-bold text-[#641E32]">{coupon.isActive ? "Deactivate" : "Activate"}</button></article>)}</div></>}
        {!loading && tab === "Categories" && <><form onSubmit={createCategory} className="mt-4 flex flex-wrap gap-2 rounded-xl border border-[#E8DFD0] bg-white p-4"><input required placeholder="Category name" value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} className="min-w-40 flex-1 rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm" /><input required placeholder="slug-like-this" value={categoryForm.slug} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })} className="min-w-40 flex-1 rounded-lg border border-[#E8DFD0] px-3 py-2 text-sm" /><button className="rounded-lg bg-[#641E32] px-4 py-2 text-sm font-bold text-white">Add category</button></form><div className="mt-4 space-y-2">{categories.map((category) => <article key={category._id} className="flex items-center justify-between rounded-xl border border-[#E8DFD0] bg-white p-4"><p className="font-semibold">{category.name} <span className="text-xs text-[#7D8976]">/{category.slug}</span></p><button onClick={async () => { try { await adminRequest(`/categories/${category._id}`, { method: "PATCH", body: JSON.stringify({ isActive: !category.isActive }) }); await load("Categories"); } catch (cause) { setError(cause.message); } }} className="text-xs font-bold text-[#641E32]">{category.isActive ? "Deactivate" : "Activate"}</button></article>)}</div></>}
      </main>
    </MarketplaceLayout>
  );
}
