import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Heart,
  Minus,
  PackageOpen,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import MarketplaceLayout from "../components/MarketplaceLayout";
import { API_URL } from "../lib/api";
import {
  addProductToCart,
  clearGuestCart,
  commerceRequest,
  formatPrice,
  readGuestCart,
  writeGuestCart,
} from "../lib/commerce";

const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#641E32] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#53192B] disabled:cursor-not-allowed disabled:opacity-50";
const quietButtonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8DFD0] bg-white px-4 py-3 text-sm font-semibold text-[#641E32] transition hover:border-[#A3B18A]";

function ProductCard({ product, onCartUpdate }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const add = async () => {
    setBusy(true);
    setMessage("");
    try {
      const session = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      await addProductToCart(product, 1, session.ok);
      setMessage("Added to cart");
      onCartUpdate?.();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      const session = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      if (!session.ok) throw new Error("Sign in to save products to your wishlist.");
      await commerceRequest(`/wishlist/${product._id}`, { method: "PUT", body: JSON.stringify({}) });
      setMessage("Saved to wishlist");
    } catch (error) {
      setMessage(error.message);
    } finally { setSaving(false); }
  };

  const discount = product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#E8DFD0] bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/shop/${product._id}`} className="relative block aspect-[4/3] overflow-hidden bg-[#F1ECE3]">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-[#A3B18A]"><PackageOpen size={42} /></div>
        )}
        {discount > 0 && <span className="absolute left-3 top-3 rounded-full bg-[#641E32] px-3 py-1 text-[11px] font-bold text-white">{discount}% off</span>}
      </Link>
      <button type="button" aria-label={`Add ${product.name} to wishlist`} disabled={saving} onClick={save} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[#641E32] shadow transition hover:scale-105 disabled:opacity-50"><Heart size={17} /></button>
      <div className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#7D8976]">{product.category}</p>
        <Link to={`/shop/${product._id}`} className="mt-1 block min-h-11 font-semibold leading-5 text-[#292725] hover:text-[#641E32]">{product.name}</Link>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-[#641E32]">{formatPrice(product.price)}</span>
          {product.originalPrice > product.price && <span className="text-xs text-[#7D8976] line-through">{formatPrice(product.originalPrice)}</span>}
        </div>
        <p className={`mt-1 text-xs ${product.stock > 0 ? "text-[#66705F]" : "font-semibold text-[#9F3144]"}`}>
          {product.stock > 0 ? `${product.stock} in stock` : "Currently out of stock"}
        </p>
        <button type="button" className={`${buttonClass} mt-3 w-full py-2.5`} disabled={busy || product.stock < 1} onClick={add}>
          <ShoppingBag size={16} /> {busy ? "Adding…" : "Add to cart"}
        </button>
        {message && <p role="status" className="mt-2 text-xs text-[#66705F]">{message}</p>}
      </div>
    </article>
  );
}

function Loading({ label = "Loading ShareBox…" }) {
  return <div className="grid min-h-64 place-items-center text-sm font-medium text-[#7D8976]"><span>{label}</span></div>;
}

function Notice({ children, error = false }) {
  return <div role={error ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-[#D9E1D2] bg-[#F1F4ED] text-[#44513F]"}`}>{children}</div>;
}

function ProductSection({ title, description, products }) {
  if (!products.length) return null;
  return (
    <section className="mt-10">
      <div className="mb-4"><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-[#7D8976]">{description}</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {products.slice(0, 4).map((product) => <ProductCard key={product._id} product={product} />)}
      </div>
    </section>
  );
}

export function MarketplaceHome() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "newest";
  const [result, setResult] = useState({ key: "", products: [], categories: [], trending: [], newest: [], recent: [], error: "" });
  const navigate = useNavigate();
  const requestKey = JSON.stringify([query, category, sort]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ limit: "48", sort });
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    let recentIds = [];
    try {
      recentIds = JSON.parse(localStorage.getItem("sharebox_recent_products") || "[]");
      if (!Array.isArray(recentIds)) recentIds = [];
    } catch (cause) {
      console.error("Could not load recently viewed products:", cause);
    }
    Promise.all([
      commerceRequest(`/products?${params}`),
      commerceRequest("/categories"),
      commerceRequest("/products?sort=popular&limit=8"),
      commerceRequest("/products?sort=newest&limit=8"),
      Promise.all(recentIds.slice(0, 4).map((id) =>
        commerceRequest(`/products/${id}`).then((data) => data.product).catch(() => null)
      )),
    ])
      .then(([listing, taxonomy, popular, recent, viewed]) => {
        if (!active) return;
        setResult({
          key: requestKey,
          products: listing.products,
          categories: taxonomy.categories,
          trending: popular.products,
          newest: recent.products,
          recent: viewed.filter(Boolean),
          error: "",
        });
      })
      .catch((cause) => {
        if (active) setResult({ key: requestKey, products: [], categories: [], trending: [], newest: [], recent: [], error: cause.message });
      });
    return () => { active = false; };
  }, [query, category, sort, requestKey]);

  const loading = result.key !== requestKey;
  const products = loading ? [] : result.products;
  const categories = result.categories;
  const trending = result.trending;
  const newest = result.newest;
  const recentlyViewed = result.recent;
  const error = loading ? "" : result.error;
  const featureProduct = products[0];
  const selectedSort = sort;
  const discountedCount = products.filter(
    (product) => product.originalPrice > product.price
  ).length;

  return (
    <MarketplaceLayout>
      <main>
        <section className="mx-auto max-w-7xl px-4 pb-8 pt-7 sm:px-6 lg:pt-10">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#641E32] px-6 py-10 text-white sm:px-10 sm:py-14 lg:px-14">
            <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-4 -top-16 h-72 w-72 rounded-full border border-white/10" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_0.7fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-[#E8DFD0]"><ShieldCheck size={14} /> Thoughtful finds, fair prices</span>
                <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Good things,<br /><span className="font-serif italic text-[#DCE3D2]">found here.</span></h1>
                <p className="mt-4 max-w-lg text-sm leading-6 text-white/75 sm:text-base">Discover useful everyday finds from ShareBox. Browse new arrivals, explore by category, and shop with confidence.</p>
                <a href="#products" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#F7F3EB] px-5 py-3 text-sm font-bold text-[#641E32] transition hover:bg-white">Explore products <ArrowRight size={17} /></a>
                <p className="mt-4 text-xs text-white/60">Development checkout uses simulated payments only. No money is transferred.</p>
              </div>
              <div className="hidden justify-self-end lg:block">
                {featureProduct && (
                  <Link to={`/shop/${featureProduct._id}`} className="block w-64 rotate-2 overflow-hidden rounded-3xl border-4 border-white/15 bg-white shadow-2xl transition hover:rotate-0">
                    {featureProduct.images?.[0] ? <img src={featureProduct.images[0]} alt={featureProduct.name} className="h-52 w-full object-cover" /> : <div className="grid h-52 place-items-center bg-[#E8DFD0] text-[#641E32]"><PackageOpen size={48} /></div>}
                    <div className="px-4 py-3 text-[#292725]"><p className="truncate text-sm font-semibold">{featureProduct.name}</p><p className="mt-1 font-bold text-[#641E32]">{formatPrice(featureProduct.price)}</p></div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6" aria-label="Shop categories">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Shop by category</h2>
            {category && <Link to="/#products" className="text-xs font-semibold text-[#641E32]">Clear category</Link>}
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            <Link to="/#products" className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${!category ? "border-[#641E32] bg-[#641E32] text-white" : "border-[#E8DFD0] bg-white text-[#66705F]"}`}>Everything</Link>
            {categories.map((name) => (
              <Link key={name} to={`/?category=${encodeURIComponent(name)}#products`} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${category === name ? "border-[#641E32] bg-[#641E32] text-white" : "border-[#E8DFD0] bg-white text-[#66705F] hover:border-[#A3B18A]"}`}>{name}</Link>
            ))}
          </div>
        </section>

        <section id="products" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-8 sm:px-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7D8976]">{query ? "Search results" : "Made for everyday"}</p>
              <h2 className="mt-1 text-2xl font-bold">{query ? `Results for “${query}”` : category || "Discover ShareBox"}</h2>
              {!loading && <p className="mt-1 text-sm text-[#7D8976]">{products.length} items · {discountedCount} offers</p>}
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#66705F]">
              Sort
              <select value={selectedSort} onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                next.set("sort", event.target.value);
                navigate(`/?${next.toString()}#products`);
              }} className="rounded-lg border border-[#E8DFD0] bg-white px-3 py-2 text-sm outline-none focus:border-[#641E32]">
                <option value="newest">Newest arrivals</option>
                <option value="popular">Popular</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </label>
          </div>
          {error ? <Notice error>{error}</Notice> : loading ? <Loading label="Finding your next great find…" /> : products.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {products.map((product) => <ProductCard key={product._id} product={product} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D1C8B9] bg-white px-6 py-16 text-center">
              <PackageOpen className="mx-auto text-[#A3B18A]" size={38} />
              <h3 className="mt-4 text-lg font-bold">No products listed yet</h3>
              <p className="mt-2 text-sm text-[#7D8976]">The ShareBox marketplace is ready for its first products. Please check back soon.</p>
            </div>
          )}
          {!loading && !error && !query && !category && (
            <>
              <ProductSection title="Today's offers" description="Only products with an administrator-set price reduction are shown." products={newest.filter((product) => product.originalPrice > product.price)} />
              <ProductSection title="Trending now" description="Ranked by product page views." products={trending} />
              <ProductSection title="Recently added" description="The latest products from the ShareBox catalog." products={newest} />
              <ProductSection title="Recently viewed" description="Pick up where you left off on this device." products={recentlyViewed} />
            </>
          )}
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
          <Link to="/community" className="flex flex-col gap-3 rounded-2xl border border-[#E8DFD0] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div><p className="text-xs font-bold uppercase tracking-widest text-[#7D8976]">Share more than a purchase</p><p className="mt-1 text-lg font-bold">Give away or exchange useful things in your community.</p></div>
            <span className="inline-flex items-center gap-2 text-sm font-bold text-[#641E32]">Visit community <ArrowRight size={16} /></span>
          </Link>
        </section>
      </main>
    </MarketplaceLayout>
  );
}

export function ShopProduct() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [rating, setRating] = useState({ average: 0, count: 0 });

  useEffect(() => {
    commerceRequest(`/products/${id}`)
      .then((data) => {
        setProduct(data.product);
        setReviews(data.reviews);
        setRating(data.rating);
        commerceRequest(`/products?category=${encodeURIComponent(data.product.category)}&limit=5`)
          .then((listing) => setRelatedProducts(listing.products.filter((item) => item._id !== data.product._id)))
          .catch((cause) => console.error("Could not load related products:", cause));
        try {
          const previous = JSON.parse(localStorage.getItem("sharebox_recent_products") || "[]");
          const ids = Array.isArray(previous) ? previous.filter((itemId) => itemId !== data.product._id) : [];
          localStorage.setItem("sharebox_recent_products", JSON.stringify([data.product._id, ...ids].slice(0, 8)));
        } catch (cause) {
          console.error("Could not save recently viewed product:", cause);
        }
      })
      .catch((cause) => setError(cause.message));
  }, [id]);

  const add = async () => {
    try {
      const session = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      await addProductToCart(product, quantity, session.ok);
      setNotice("Added to your cart.");
    } catch (cause) {
      setNotice(cause.message);
    }
  };
  const saveToWishlist = async () => {
    try {
      const session = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      if (!session.ok) throw new Error("Sign in to save products to your wishlist.");
      await commerceRequest(`/wishlist/${product._id}`, { method: "PUT", body: JSON.stringify({}) });
      setNotice("Saved to your wishlist.");
    } catch (cause) {
      setNotice(cause.message);
    }
  };

  return (
    <MarketplaceLayout>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error ? <Notice error>{error} <Link to="/" className="ml-2 underline">Back to products</Link></Notice> : !product ? <Loading /> : (
          <>
            <Link to="/" className="text-sm font-semibold text-[#641E32]">← Continue shopping</Link>
            <div className="mt-5 grid gap-8 rounded-3xl border border-[#E8DFD0] bg-white p-4 sm:p-7 lg:grid-cols-2 lg:p-10">
              <div>
                <div className="aspect-square overflow-hidden rounded-2xl bg-[#F1ECE3]">
                  {product.images?.[selectedImage] ? <img src={product.images[selectedImage]} alt={product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[#A3B18A]"><PackageOpen size={60} /></div>}
                </div>
                {product.images?.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{product.images.map((image, index) => <button key={image} type="button" onClick={() => setSelectedImage(index)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${selectedImage === index ? "border-[#641E32]" : "border-transparent"}`}><img src={image} alt={`${product.name} view ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}
              </div>
              <div className="py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[#7D8976]">{product.category}{product.subcategory ? ` · ${product.subcategory}` : ""}</p>
                <h1 className="mt-2 text-3xl font-bold leading-tight">{product.name}</h1>
                <p className="mt-2 text-sm text-[#66705F]">{rating.count ? `${rating.average.toFixed(1)} ★ · ${rating.count} verified ${rating.count === 1 ? "review" : "reviews"}` : "No reviews yet"}</p>
                <div className="mt-5 flex items-center gap-3"><span className="text-3xl font-bold text-[#641E32]">{formatPrice(product.price)}</span>{product.originalPrice > product.price && <><span className="text-sm text-[#7D8976] line-through">{formatPrice(product.originalPrice)}</span><span className="rounded-full bg-[#EAF0E5] px-2.5 py-1 text-xs font-bold text-[#44513F]">{Math.round((1 - product.price / product.originalPrice) * 100)}% off</span></>}</div>
                <p className={`mt-3 text-sm font-semibold ${product.stock > 0 ? "text-[#53664C]" : "text-red-700"}`}>{product.stock > 0 ? `In stock · ${product.stock} available` : "Currently out of stock"}</p>
                <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#66705F]">{product.description}</p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <div className="flex items-center rounded-xl border border-[#E8DFD0]">
                    <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => value - 1)} className="p-3 disabled:opacity-40"><Minus size={16} /></button>
                    <span className="min-w-8 text-center text-sm font-bold">{quantity}</span>
                    <button type="button" aria-label="Increase quantity" disabled={quantity >= Math.min(product.stock, 99)} onClick={() => setQuantity((value) => value + 1)} className="p-3 disabled:opacity-40"><Plus size={16} /></button>
                  </div>
                  <button type="button" onClick={add} disabled={!product.stock} className={`${buttonClass} flex-1`}><ShoppingBag size={17} /> Add to cart</button>
                  <button type="button" onClick={saveToWishlist} className={quietButtonClass} aria-label="Save to wishlist"><Heart size={18} /></button>
                </div>
                {notice && <p role="status" className="mt-3 text-sm text-[#53664C]">{notice}</p>}
                <div className="mt-7 grid gap-3 border-t border-[#E8DFD0] pt-5 text-xs text-[#66705F] sm:grid-cols-2">
                  <p className="flex items-center gap-2"><Truck size={16} className="text-[#641E32]" /> Delivery charges calculated at checkout</p>
                  <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#641E32]" /> Secure checkout · mock payments only</p>
                </div>
              </div>
            </div>
            <section className="mt-10"><h2 className="text-xl font-bold">Ratings &amp; reviews</h2>{reviews.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{reviews.map((review) => <article key={review._id} className="rounded-xl border border-[#E8DFD0] bg-white p-4"><p className="font-semibold">{review.user?.name || "ShareBox shopper"} <span className="ml-2 text-[#641E32]">{review.rating} ★</span></p><p className="mt-2 text-sm text-[#66705F]">{review.comment}</p></article>)}</div> : <p className="mt-3 text-sm text-[#7D8976]">Reviews from verified delivered orders will appear here.</p>}</section>
            <ProductSection title="Related finds" description={`More products in ${product.category}.`} products={relatedProducts} />
          </>
        )}
      </main>
    </MarketplaceLayout>
  );
}

async function getVisibleCart() {
  const session = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
  if (session.ok) {
    const guestCart = readGuestCart();
    if (guestCart.length) {
      try {
        await commerceRequest("/cart/sync", {
          method: "POST",
          body: JSON.stringify({ items: guestCart }),
        });
        clearGuestCart();
      } catch (cause) {
        throw new Error(
          `${cause.message} Your guest cart is still saved in this browser.`,
          { cause }
        );
      }
    }
    const cart = await commerceRequest("/cart");
    return { authenticated: true, items: cart.items };
  }
  const guestCart = readGuestCart();
  const lines = await Promise.all(guestCart.map(async (line) => {
    try {
      const data = await commerceRequest(`/products/${line.productId}`);
      return { product: data.product, quantity: line.quantity, lineTotal: data.product.price * line.quantity, available: data.product.stock >= line.quantity };
    } catch {
      return { product: { _id: line.productId, name: "Unavailable product", images: [] }, quantity: line.quantity, lineTotal: 0, available: false };
    }
  }));
  return { authenticated: false, items: lines };
}

export function CartPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const refresh = async () => {
    try {
      const cart = await getVisibleCart();
      setItems(cart.items);
      setError("");
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    getVisibleCart()
      .then((cart) => active && setItems(cart.items))
      .catch((cause) => active && setError(cause.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const setQuantity = async (item, quantity) => {
    try {
      const session = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      if (session.ok) {
        await commerceRequest(`/cart/items/${item.product._id}`, { method: "PUT", body: JSON.stringify({ quantity }) });
      } else {
        const cart = readGuestCart().filter((line) => line.productId !== item.product._id);
        if (quantity > 0) cart.push({ productId: item.product._id, quantity });
        writeGuestCart(cart);
      }
      await refresh();
    } catch (cause) {
      setError(cause.message);
    }
  };
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <MarketplaceLayout>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold">Your cart <span className="text-base font-medium text-[#7D8976]">({items.reduce((sum, item) => sum + item.quantity, 0)} items)</span></h1>
        {error && <div className="mt-4"><Notice error>{error}</Notice></div>}
        {loading ? <Loading label="Loading your cart…" /> : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[#E8DFD0] bg-white px-6 py-16 text-center"><ShoppingBag className="mx-auto text-[#A3B18A]" size={42} /><h2 className="mt-4 text-xl font-bold">Your cart is waiting for something good</h2><p className="mt-2 text-sm text-[#7D8976]">Explore the marketplace and add products you love.</p><Link to="/" className={`${buttonClass} mt-5`}>Browse products <ArrowRight size={16} /></Link></div>
        ) : (
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_340px]">
            <section className="divide-y divide-[#E8DFD0] rounded-2xl border border-[#E8DFD0] bg-white px-4 sm:px-6">
              {items.map((item) => <article key={item.product._id} className="flex gap-4 py-5">
                <Link to={`/shop/${item.product._id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F1ECE3] sm:h-28 sm:w-28">{item.product.images?.[0] && <img src={item.product.images[0]} alt={item.product.name} className="h-full w-full object-cover" />}</Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/shop/${item.product._id}`} className="line-clamp-2 font-semibold hover:text-[#641E32]">{item.product.name}</Link>
                  <p className="mt-1 text-xs text-[#66705F]">{item.available ? `${item.product.stock} available` : "Availability needs review"}</p>
                  <p className="mt-2 font-bold text-[#641E32]">{formatPrice(item.lineTotal)}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={() => setQuantity(item, item.quantity - 1)} className="rounded-md border border-[#E8DFD0] p-1.5" aria-label="Decrease quantity"><Minus size={14} /></button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button type="button" onClick={() => setQuantity(item, item.quantity + 1)} disabled={item.quantity >= Math.min(item.product.stock || 99, 99)} className="rounded-md border border-[#E8DFD0] p-1.5 disabled:opacity-40" aria-label="Increase quantity"><Plus size={14} /></button>
                    <button type="button" onClick={() => setQuantity(item, 0)} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#7D8976] hover:text-red-700"><Trash2 size={14} /> Remove</button>
                  </div>
                </div>
              </article>)}
              <button type="button" onClick={async () => {
                try {
                  const session = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
                  if (session.ok) await commerceRequest("/cart", { method: "DELETE" });
                  clearGuestCart();
                  setItems([]);
                } catch (cause) { setError(cause.message); }
              }} className="py-4 text-xs font-semibold text-[#7D8976] hover:text-red-700">Clear cart</button>
            </section>
            <aside className="rounded-2xl border border-[#E8DFD0] bg-white p-5">
              <h2 className="text-lg font-bold">Price details</h2>
              <div className="mt-4 space-y-3 border-b border-[#E8DFD0] pb-4 text-sm">
                <p className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></p>
                <p className="flex justify-between"><span>Delivery</span><span>{subtotal >= 999 ? "Free" : formatPrice(subtotal ? 49 : 0)}</span></p>
                <p className="flex justify-between text-[#66705F]"><span>Discounts</span><span>Applied at checkout</span></p>
              </div>
              <p className="mt-4 flex justify-between text-base font-bold"><span>Total</span><span>{formatPrice(subtotal + (subtotal && subtotal < 999 ? 49 : 0))}</span></p>
              <button type="button" className={`${buttonClass} mt-5 w-full`} onClick={() => navigate("/checkout")}>Continue to checkout <ArrowRight size={16} /></button>
              <p className="mt-3 text-center text-[11px] leading-5 text-[#7D8976]">The server verifies product prices and stock at checkout.</p>
            </aside>
          </div>
        )}
      </main>
    </MarketplaceLayout>
  );
}

export function CheckoutPage() {
  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState({ fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "" });
  const [showForm, setShowForm] = useState(false);
  const [cart, setCart] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const idempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => {
    Promise.all([commerceRequest("/addresses"), commerceRequest("/cart")])
      .then(([addressData, cartData]) => {
        setAddresses(addressData.addresses);
        setSelected(addressData.addresses.find((address) => address.isDefault)?._id || addressData.addresses[0]?._id || "");
        setCart(cartData.items);
        if (!addressData.addresses.length) setShowForm(true);
      })
      .catch((cause) => setError(cause.status === 401 ? "Sign in to continue to checkout." : cause.message))
      .finally(() => setLoading(false));
  }, []);

  const saveAddress = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await commerceRequest("/addresses", { method: "POST", body: JSON.stringify(form) });
      setAddresses((current) => [...current, data.address]);
      setSelected(data.address._id);
      setShowForm(false);
    } catch (cause) { setError(cause.message); }
  };

  const placeOrder = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await commerceRequest("/checkout", {
        method: "POST",
        body: JSON.stringify({ addressId: selected, couponCode, idempotencyKey: idempotencyKey.current }),
      });
      setPlacedOrder(data.order);
      setNotice(data.message || "Order placed; no payment has been taken.");
    } catch (cause) {
      setError(cause.message);
    } finally { setBusy(false); }
  };

  const simulatePayment = async () => {
    setBusy(true);
    try {
      const data = await commerceRequest(`/orders/${placedOrder._id}/mock-payment`, { method: "POST", body: JSON.stringify({}) });
      setPlacedOrder(data.order);
      setNotice(data.message);
      window.dispatchEvent(new Event("sharebox-cart-changed"));
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  if (loading) return <MarketplaceLayout><Loading label="Preparing your checkout…" /></MarketplaceLayout>;
  return (
    <MarketplaceLayout>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold">{placedOrder ? "Order placed" : "Secure checkout"}</h1>
        <p className="mt-2 text-sm text-[#7D8976]">Your order totals and stock are verified by ShareBox before the order is created.</p>
        {error && <div className="mt-4"><Notice error>{error} {error.includes("Sign in") && <Link to="/login" className="font-bold underline">Sign in</Link>}</Notice></div>}
        {notice && <div className="mt-4"><Notice>{notice}</Notice></div>}
        {placedOrder ? (
          <section className="mt-6 rounded-2xl border border-[#E8DFD0] bg-white p-6">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#EAF0E5] text-[#53664C]"><Check /></span><div><h2 className="font-bold">Order #{placedOrder._id.slice(-8).toUpperCase()}</h2><p className="text-sm text-[#7D8976]">{placedOrder.status} · {formatPrice(placedOrder.total)}</p></div></div>
            <div className="mt-6 rounded-xl border border-[#E8DFD0] bg-[#F7F3EB] p-4"><p className="font-semibold text-[#641E32]">Development-only mock payment</p><p className="mt-1 text-sm leading-6 text-[#66705F]">This button only records a simulated test result. It does not connect to a payment provider and no real money is charged.</p><button disabled={busy || placedOrder.paymentStatus !== "pending"} onClick={simulatePayment} className={`${buttonClass} mt-4`}>{busy ? "Processing simulation…" : placedOrder.paymentStatus === "simulated_success" ? "Simulation complete — no charge" : "Simulate successful payment"}</button></div>
            <Link to="/orders" className={`${quietButtonClass} mt-5`}>View my orders</Link>
          </section>
        ) : (
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_340px]">
            <section className="space-y-5">
              <div className="rounded-2xl border border-[#E8DFD0] bg-white p-5">
                <div className="flex items-center justify-between"><h2 className="text-lg font-bold">1. Delivery address</h2><button type="button" onClick={() => setShowForm((value) => !value)} className="text-sm font-semibold text-[#641E32]">{showForm ? "Choose saved address" : "Add address"}</button></div>
                {showForm ? (
                  <form onSubmit={saveAddress} className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      ["fullName", "Full name"], ["phone", "10-digit mobile number"], ["line1", "Address line 1"], ["line2", "Address line 2 (optional)"], ["city", "City"], ["state", "State"], ["postalCode", "6-digit PIN code"],
                    ].map(([field, label]) => <label key={field} className={`grid gap-1 text-xs font-semibold text-[#66705F] ${["line1", "line2"].includes(field) ? "sm:col-span-2" : ""}`}>{label}<input required={!["line2"].includes(field)} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className="rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm text-[#292725] outline-none focus:border-[#641E32]" /></label>)}
                    <button className={`${buttonClass} sm:col-span-2`}>Save delivery address</button>
                  </form>
                ) : addresses.length ? <div className="mt-4 grid gap-3">{addresses.map((address) => <label key={address._id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${selected === address._id ? "border-[#641E32] bg-[#F7F3EB]" : "border-[#E8DFD0]"}`}><input type="radio" name="address" checked={selected === address._id} onChange={() => setSelected(address._id)} /><span className="text-sm"><strong>{address.fullName}</strong> · {address.phone}<span className="mt-1 block text-[#66705F]">{address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} - {address.postalCode}</span></span></label>)}</div> : <p className="mt-3 text-sm text-[#7D8976]">Add a delivery address to continue.</p>}
              </div>
              <div className="rounded-2xl border border-[#E8DFD0] bg-white p-5"><h2 className="text-lg font-bold">2. Payment</h2><p className="mt-2 text-sm leading-6 text-[#66705F]">Real payment methods are disabled until a legitimate provider, merchant approval, and server credentials are configured. Checkout will create a pending order; you can choose a clearly marked mock simulation after it is placed.</p></div>
            </section>
            <aside className="rounded-2xl border border-[#E8DFD0] bg-white p-5">
              <h2 className="text-lg font-bold">Order summary</h2>
              {cart.map((item) => <p key={item.product._id} className="mt-3 flex justify-between gap-3 text-sm"><span className="line-clamp-1">{item.product.name} × {item.quantity}</span><span className="shrink-0">{formatPrice(item.lineTotal)}</span></p>)}
              <label className="mt-5 grid gap-1 text-xs font-semibold text-[#66705F]">Coupon code<input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} className="rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm uppercase outline-none focus:border-[#641E32]" /></label>
              <div className="mt-4 space-y-2 border-t border-[#E8DFD0] pt-4 text-sm"><p className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></p><p className="flex justify-between"><span>Delivery</span><span>{subtotal >= 999 ? "Free" : formatPrice(subtotal ? 49 : 0)}</span></p></div>
              <p className="mt-4 flex justify-between font-bold"><span>Total before coupon</span><span>{formatPrice(subtotal + (subtotal && subtotal < 999 ? 49 : 0))}</span></p>
              <button type="button" disabled={busy || !selected || cart.length === 0} onClick={placeOrder} className={`${buttonClass} mt-5 w-full`}>{busy ? "Verifying…" : "Place order"} <ArrowRight size={16} /></button>
              <p className="mt-3 text-center text-[11px] leading-5 text-[#7D8976]">Coupon discounts and payable amount are recalculated by the server.</p>
            </aside>
          </div>
        )}
      </main>
    </MarketplaceLayout>
  );
}

export function WishlistPage() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => commerceRequest("/wishlist").then((data) => setProducts(data.products)).catch((cause) => setError(cause.status === 401 ? "Sign in to access your saved products." : cause.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const remove = async (id) => {
    try { await commerceRequest(`/wishlist/${id}`, { method: "DELETE" }); await load(); }
    catch (cause) { setError(cause.message); }
  };
  const moveToCart = async (product) => {
    try {
      await addProductToCart(product, 1, true);
      await commerceRequest(`/wishlist/${product._id}`, { method: "DELETE" });
      await load();
    } catch (cause) { setError(cause.message); }
  };
  return (
    <MarketplaceLayout><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">Your wishlist</h1>{error && <div className="mt-4"><Notice error>{error} {error.includes("Sign in") && <Link className="underline" to="/login">Sign in</Link>}</Notice></div>}{loading ? <Loading /> : products.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{products.map((product) => <div key={product._id}><ProductCard product={product} /><div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => moveToCart(product)} className={`${buttonClass} py-2 text-xs`} disabled={!product.stock}>Move to cart</button><button onClick={() => remove(product._id)} className={`${quietButtonClass} py-2 text-xs`}>Remove</button></div></div>)}</div> : <p className="mt-6 rounded-xl bg-white p-8 text-center text-sm text-[#7D8976]">No saved products yet.</p>}</main></MarketplaceLayout>
  );
}

function ReviewForm({ orderId, productId, productName }) {
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await commerceRequest("/reviews", {
        method: "POST",
        body: JSON.stringify({ orderId, productId, rating: Number(rating), comment }),
      });
      setMessage("Thanks for your verified review.");
    } catch (cause) {
      setMessage(cause.message);
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="mt-4 rounded-xl bg-[#F7F3EB] p-3">
      <p className="text-sm font-semibold">Review {productName}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`rating-${orderId}-${productId}`}>Rating</label>
        <select id={`rating-${orderId}-${productId}`} value={rating} onChange={(event) => setRating(event.target.value)} className="rounded-lg border border-[#E8DFD0] bg-white px-2 py-2 text-sm"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select>
        <input value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} placeholder="Share your experience (optional)" className="min-w-48 flex-1 rounded-lg border border-[#E8DFD0] bg-white px-3 py-2 text-sm" />
        <button disabled={busy || Boolean(message.startsWith("Thanks"))} className="rounded-lg bg-[#641E32] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "Sending…" : "Submit review"}</button>
      </div>
      {message && <p role="status" className="mt-2 text-xs text-[#66705F]">{message}</p>}
    </form>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => commerceRequest("/orders").then((data) => setOrders(data.orders)).catch((cause) => setError(cause.status === 401 ? "Sign in to view your orders." : cause.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const updateOrder = async (id, action) => {
    try { await commerceRequest(`/orders/${id}/${action === "return" ? "return-request" : "cancellation-request"}`, { method: "POST", body: JSON.stringify({}) }); await load(); }
    catch (cause) { setError(cause.message); }
  };
  return (
    <MarketplaceLayout><main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">My orders</h1>{error && <div className="mt-4"><Notice error>{error} {error.includes("Sign in") && <Link className="underline" to="/login">Sign in</Link>}</Notice></div>}{loading ? <Loading /> : orders.length ? <div className="mt-6 space-y-4">{orders.map((order) => <article key={order._id} className="rounded-2xl border border-[#E8DFD0] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-[#7D8976]">Order #{order._id.slice(-8).toUpperCase()} · {new Date(order.createdAt).toLocaleDateString()}</p><h2 className="mt-1 text-lg font-bold">{order.status}</h2></div><div className="text-right"><p className="font-bold text-[#641E32]">{formatPrice(order.total)}</p><p className="text-xs text-[#7D8976]">{order.paymentStatus === "simulated_success" ? "Simulated payment (no money transferred)" : `Payment ${order.paymentStatus}`}</p></div></div><div className="mt-4 grid gap-3 border-t border-[#E8DFD0] pt-4 sm:grid-cols-2">{order.items.map((item, index) => <p key={`${item.name}-${index}`} className="text-sm">{item.name} × {item.quantity}</p>)}</div>{order.status === "Delivered" && order.items.filter((item) => item.product).map((item) => <ReviewForm key={item.product} orderId={order._id} productId={item.product} productName={item.name} />)}<div className="mt-4 border-t border-[#E8DFD0] pt-4"><h3 className="text-sm font-semibold">Order updates</h3><div className="mt-2 space-y-2">{order.timeline.map((event, index) => <p key={`${event.status}-${index}`} className="text-xs text-[#66705F]"><span className="font-bold text-[#641E32]">{event.status}</span> · {event.note} · {new Date(event.at).toLocaleString()}</p>)}</div></div>{["Order Placed", "Confirmed", "Processing"].includes(order.status) && <button onClick={() => updateOrder(order._id, "cancel")} className="mt-4 text-sm font-semibold text-red-700 underline">Request cancellation</button>}{order.status === "Delivered" && <button onClick={() => updateOrder(order._id, "return")} className="mt-4 text-sm font-semibold text-[#641E32] underline">Request return</button>}</article>)}</div> : <div className="mt-6 rounded-xl bg-white p-10 text-center"><PackageOpen className="mx-auto text-[#A3B18A]" /><p className="mt-3 text-sm text-[#7D8976]">No orders yet.</p><Link to="/" className="mt-4 inline-block text-sm font-bold text-[#641E32]">Explore products</Link></div>}</main></MarketplaceLayout>
  );
}

export function AccountPage() {
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [editingAddressId, setEditingAddressId] = useState("");
  const [addressEdit, setAddressEdit] = useState({});
  const [form, setForm] = useState({ fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    Promise.all([commerceRequest("/account"), commerceRequest("/addresses"), commerceRequest("/notifications")])
      .then(([account, addressData, notificationData]) => {
        setProfile(account.user);
        setAddresses(addressData.addresses);
        setNotifications(notificationData.notifications);
      })
      .catch((cause) => setError(cause.status === 401 ? "Sign in to manage your account." : cause.message));
  }, []);
  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      const data = await commerceRequest("/account", { method: "PATCH", body: JSON.stringify({ name: profile.name, picture: profile.picture, phone: profile.phone || "" }) });
      setProfile(data.user);
      setNotice("Profile updated.");
    } catch (cause) { setError(cause.message); }
  };
  const addAddress = async (event) => {
    event.preventDefault();
    try {
      const data = await commerceRequest("/addresses", { method: "POST", body: JSON.stringify(form) });
      setAddresses((current) => [...current, data.address]);
      setForm({ fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "" });
      setNotice("Address saved.");
    } catch (cause) { setError(cause.message); }
  };
  const deleteAddress = async (id) => {
    try { await commerceRequest(`/addresses/${id}`, { method: "DELETE" }); setAddresses((current) => current.filter((address) => address._id !== id)); }
    catch (cause) { setError(cause.message); }
  };
  const saveAddressEdit = async (event) => {
    event.preventDefault();
    try {
      const data = await commerceRequest(`/addresses/${editingAddressId}`, { method: "PUT", body: JSON.stringify(addressEdit) });
      setAddresses((current) => current.map((address) => address._id === editingAddressId ? data.address : address));
      setEditingAddressId("");
      setNotice("Address updated.");
    } catch (cause) { setError(cause.message); }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update password.");
      setPasswords({ currentPassword: "", newPassword: "" });
      setNotice(data.message);
    } catch (cause) { setError(cause.message); }
  };
  const requestDeletion = async () => {
    if (!window.confirm("Submit an account deletion request for administrator review? Your account will not be deleted immediately.")) return;
    try {
      const data = await commerceRequest("/account/deletion-request", { method: "POST", body: JSON.stringify({}) });
      setNotice(data.message);
    } catch (cause) { setError(cause.message); }
  };
  const markNotificationRead = async (notification) => {
    try {
      const data = await commerceRequest(`/notifications/${notification._id}/read`, { method: "PATCH", body: JSON.stringify({}) });
      setNotifications((current) => current.map((item) => item._id === notification._id ? data.notification : item));
    } catch (cause) { setError(cause.message); }
  };
  const addressFields = [["fullName", "Full name"], ["phone", "Mobile number"], ["line1", "Address line"], ["city", "City"], ["state", "State"], ["postalCode", "PIN code"]];
  return (
    <MarketplaceLayout><main className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">My account</h1>{error && <div className="mt-4"><Notice error>{error} {error.includes("Sign in") && <Link to="/login" className="underline">Sign in</Link>}</Notice></div>}{notice && <div className="mt-4"><Notice>{notice}</Notice></div>}
      {profile && <form onSubmit={saveProfile} className="mt-6 rounded-2xl border border-[#E8DFD0] bg-white p-5"><h2 className="text-lg font-bold">Profile</h2><label className="mt-4 grid gap-1 text-xs font-semibold text-[#66705F]">Name<input required minLength={2} maxLength={60} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm" /></label><label className="mt-3 grid gap-1 text-xs font-semibold text-[#66705F]">Email<input disabled value={profile.email} className="rounded-lg border border-[#E8DFD0] bg-[#F7F3EB] px-3 py-2.5 text-sm" /></label><p className="mt-2 text-xs text-[#7D8976]">Email {profile.emailVerified ? "verified" : "not verified; email verification is not configured"} </p><label className="mt-3 grid gap-1 text-xs font-semibold text-[#66705F]">Mobile number<input inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={profile.phone || ""} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className="rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm" /></label><p className="mt-2 text-xs text-[#7D8976]">Phone {profile.phoneVerified ? "verified" : "not verified"}</p><label className="mt-3 grid gap-1 text-xs font-semibold text-[#66705F]">Profile picture HTTPS URL<input value={profile.picture || ""} onChange={(event) => setProfile({ ...profile, picture: event.target.value })} className="rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm" /></label><button className={`${buttonClass} mt-4`}>Save profile</button></form>}
      <form onSubmit={changePassword} className="mt-5 grid gap-3 rounded-2xl border border-[#E8DFD0] bg-white p-5 sm:grid-cols-2"><h2 className="font-bold sm:col-span-2">Account security</h2><label className="grid gap-1 text-xs font-semibold text-[#66705F]">Current password<input type="password" required autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} className="rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm" /></label><label className="grid gap-1 text-xs font-semibold text-[#66705F]">New password (8–72 characters)<input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} className="rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm" /></label><button className={`${buttonClass} sm:col-span-2`}>Change password</button><button type="button" onClick={requestDeletion} className="text-left text-sm font-semibold text-red-700 underline sm:col-span-2">Request account deletion</button></form>
      <section className="mt-5 rounded-2xl border border-[#E8DFD0] bg-white p-5">
        <h2 className="text-lg font-bold">Saved addresses</h2>
        <div className="mt-3 space-y-2">
          {addresses.map((address) => editingAddressId === address._id ? (
            <form key={address._id} onSubmit={saveAddressEdit} className="grid gap-2 rounded-xl bg-[#F7F3EB] p-3 sm:grid-cols-2">
              {[...addressFields, ["line2", "Address line 2 (optional)"]].map(([key, label]) => <input key={key} required={!["line2"].includes(key)} value={addressEdit[key] || ""} onChange={(event) => setAddressEdit({ ...addressEdit, [key]: event.target.value })} placeholder={label} aria-label={label} className="rounded-lg border border-[#E8DFD0] bg-white px-3 py-2.5 text-sm" />)}
              <button className={`${buttonClass} py-2`}>Save address</button>
              <button type="button" onClick={() => setEditingAddressId("")} className={`${quietButtonClass} py-2`}>Cancel</button>
            </form>
          ) : (
            <div key={address._id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F3EB] p-3 text-sm">
              <p><strong>{address.fullName}</strong><span className="block text-xs text-[#66705F]">{address.line1}, {address.city} · {address.postalCode}</span></p>
              <div className="flex gap-3"><button onClick={() => { setEditingAddressId(address._id); setAddressEdit(address); }} className="text-xs font-semibold text-[#641E32]">Edit</button><button onClick={() => deleteAddress(address._id)} className="text-xs font-semibold text-red-700">Remove</button></div>
            </div>
          ))}
        </div>
        <form onSubmit={addAddress} className="mt-4 grid gap-2 sm:grid-cols-2">
          {addressFields.map(([key, label]) => <input key={key} required value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={label} aria-label={label} className="rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm" />)}
          <input value={form.line2} onChange={(event) => setForm({ ...form, line2: event.target.value })} placeholder="Address line 2 (optional)" aria-label="Address line 2" className="rounded-lg border border-[#E8DFD0] px-3 py-2.5 text-sm" />
          <button className={`${buttonClass} sm:col-span-2`}>Add address</button>
        </form>
      </section>
      <section className="mt-5 rounded-2xl border border-[#E8DFD0] bg-white p-5"><h2 className="text-lg font-bold">Notifications</h2>{notifications.length ? <div className="mt-3 space-y-2">{notifications.map((notification) => <article key={notification._id} className={`rounded-xl p-3 ${notification.readAt ? "bg-[#F7F3EB]" : "bg-[#F1F4ED]"}`}><p className="font-semibold">{notification.title}</p><p className="mt-1 text-sm text-[#66705F]">{notification.message}</p>{!notification.readAt && <button onClick={() => markNotificationRead(notification)} className="mt-2 text-xs font-bold text-[#641E32] underline">Mark as read</button>}</article>)}</div> : <p className="mt-2 text-sm text-[#7D8976]">You’re all caught up.</p>}</section>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><Link className={`${quietButtonClass} justify-start`} to="/orders"><PackageOpen size={17} /> Order history</Link><Link className={`${quietButtonClass} justify-start`} to="/wishlist"><Heart size={17} /> Wishlist</Link></div>
    </main></MarketplaceLayout>
  );
}
