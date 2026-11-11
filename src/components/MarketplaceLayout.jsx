import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Heart,
  Menu,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import ShareBoxLogo from "./ShareboxLogo";
import { API_URL } from "../lib/api";
import {
  clearGuestCart,
  commerceRequest,
  readGuestCart,
} from "../lib/commerce";

function MarketplaceLayout({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartSyncError, setCartSyncError] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const userRef = useRef(null);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
      if (!response.ok) {
        userRef.current = null;
        setCartSyncError("");
        setUser(null);
        setCartCount(readGuestCart().reduce((sum, line) => sum + line.quantity, 0));
        return;
      }
      const { user: currentUser } = await response.json();
      userRef.current = currentUser;
      setUser(currentUser);
      try {
        const guestCart = readGuestCart();
        if (guestCart.length) {
          await commerceRequest("/cart/sync", {
            method: "POST",
            body: JSON.stringify({ items: guestCart }),
          });
          clearGuestCart();
        }
        setCartSyncError("");
        const cart = await commerceRequest("/cart");
        setCartCount(cart.items.reduce((sum, line) => sum + line.quantity, 0));
      } catch (error) {
        console.error("Could not synchronize marketplace cart:", error);
        setCartSyncError(error.message);
        setCartCount(readGuestCart().reduce((sum, line) => sum + line.quantity, 0));
      }
    } catch (error) {
      console.error("Marketplace session check failed:", error);
      userRef.current = null;
      setCartSyncError("The marketplace API could not be reached. Check the backend connection.");
      setUser(null);
      setCartCount(readGuestCart().reduce((sum, line) => sum + line.quantity, 0));
    }
  }, []);

  useEffect(() => {
    const initialSessionCheck = window.setTimeout(refreshSession, 0);
    window.addEventListener("sharebox-auth-changed", refreshSession);
    const updateCartCount = async () => {
      if (userRef.current) {
        try {
          const cart = await commerceRequest("/cart");
          setCartCount(cart.items.reduce((sum, line) => sum + line.quantity, 0));
          return;
        } catch (error) {
          console.error("Could not refresh cart count:", error);
        }
      }
      setCartCount(readGuestCart().reduce((sum, line) => sum + line.quantity, 0));
    };
    window.addEventListener("sharebox-cart-changed", updateCartCount);
    return () => {
      window.clearTimeout(initialSessionCheck);
      window.removeEventListener("sharebox-auth-changed", refreshSession);
      window.removeEventListener("sharebox-cart-changed", updateCartCount);
    };
  }, [refreshSession]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      try {
        const data = await commerceRequest(`/products?q=${encodeURIComponent(term)}&limit=5`);
        setSuggestions(data.products);
      } catch (error) {
        console.error("Product suggestions failed:", error);
        setSuggestions([]);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  const submitSearch = (event) => {
    event.preventDefault();
    setSearchOpen(false);
    setSuggestions([]);
    navigate(`/?q=${encodeURIComponent(query.trim())}#products`);
  };

  const logout = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Unable to log out. Please try again.");
      setUser(null);
      userRef.current = null;
      setCartSyncError("");
      window.dispatchEvent(new Event("sharebox-auth-changed"));
      setAccountOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Marketplace logout failed:", error);
      window.alert(error.message);
    }
  };

  const accountMenu = (
    <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-[#E8DFD0] bg-white p-2 shadow-xl">
      {user ? (
        <>
          <div className="border-b border-[#E8DFD0] px-3 py-3">
            <p className="font-semibold">{user.name}</p>
            <p className="truncate text-xs text-[#7D8976]">{user.email}</p>
          </div>
          <Link className="market-menu-link" to="/account">My account</Link>
          <Link className="market-menu-link" to="/orders">My orders</Link>
          <Link className="market-menu-link" to="/wishlist">Wishlist</Link>
          {user.role === "admin" && (
            <Link className="market-menu-link" to="/admin/marketplace">Admin dashboard</Link>
          )}
          <button className="market-menu-link w-full text-left" onClick={logout}>Sign out</button>
        </>
      ) : (
        <div className="p-3">
          <p className="font-semibold">Welcome to ShareBox</p>
          <p className="mt-1 text-xs text-[#7D8976]">Sign in to sync your cart and orders.</p>
          <Link className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#641E32] px-4 py-2 text-sm font-semibold text-white" to="/login">
            Sign in <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F3EB] text-[#292725]">
      <header className="sticky top-0 z-40 border-b border-[#E8DFD0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:gap-6">
          <Link to="/" aria-label="ShareBox home" className="shrink-0">
            <ShareBoxLogo />
          </Link>
          <form onSubmit={submitSearch} className="relative hidden min-w-0 flex-1 md:block">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7D8976]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
              placeholder="Search products, brands and more"
              aria-label="Search products"
              className="w-full rounded-xl border border-[#E8DFD0] bg-[#F7F3EB] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#A3B18A] focus:ring-2 focus:ring-[#A3B18A]/30"
            />
            {searchOpen && query.trim().length >= 2 && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-[#E8DFD0] bg-white shadow-xl">
                {suggestions.map((product) => (
                  <Link key={product._id} to={`/shop/${product._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F7F3EB]">
                    <span className="line-clamp-1 flex-1 text-sm font-medium">{product.name}</span>
                    <span className="text-sm font-bold text-[#641E32]">{`₹${product.price}`}</span>
                  </Link>
                ))}
                <button type="submit" className="w-full border-t border-[#E8DFD0] px-4 py-3 text-left text-sm font-semibold text-[#641E32]">
                  See all results
                </button>
              </div>
            )}
          </form>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link to="/wishlist" className="market-icon-link hidden sm:flex" aria-label="Wishlist"><Heart size={20} /></Link>
            <Link to="/cart" className="market-icon-link relative inline-flex" aria-label={`Cart, ${cartCount} items`}>
              <ShoppingBag size={20} />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#641E32] px-1 text-[10px] font-bold text-white">{cartCount}</span>}
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-expanded={accountOpen}
                className="market-icon-link inline-flex"
              >
                {user?.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full object-cover" /> : <UserRound size={20} />}
                <span className="hidden lg:inline">{user ? "Account" : "Sign in"}</span>
                <ChevronDown size={14} className="hidden lg:inline" />
              </button>
              {accountOpen && accountMenu}
            </div>
            <button type="button" className="market-icon-link inline-flex md:hidden" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </nav>
        </div>
        <div className="border-t border-[#E8DFD0] px-4 py-2 md:hidden">
          <form onSubmit={submitSearch} className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7D8976]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ShareBox" aria-label="Search products" className="w-full rounded-lg bg-[#F7F3EB] py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#A3B18A]" />
          </form>
        </div>
        {mobileOpen && (
          <div className="grid gap-1 border-t border-[#E8DFD0] bg-white px-4 py-3 md:hidden">
            <Link className="market-menu-link" to="/orders"><PackageCheck size={17} /> My orders</Link>
            <Link className="market-menu-link" to="/wishlist"><Heart size={17} /> Wishlist</Link>
            <Link className="market-menu-link" to="/community"><UserRound size={17} /> Community sharing</Link>
            {user?.role === "admin" && <Link className="market-menu-link" to="/admin/marketplace"><ShieldCheck size={17} /> Admin</Link>}
          </div>
        )}
        <div className="hidden border-t border-[#E8DFD0] bg-[#F7F3EB] sm:block">
          <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-6 py-2 text-xs font-semibold text-[#66705F]">
            <Link to="/?category=Electronics#products">Electronics</Link>
            <Link to="/?category=Home%20%26%20Kitchen#products">Home &amp; Kitchen</Link>
            <Link to="/?category=Clothing#products">Fashion</Link>
            <Link to="/?category=Books%20%26%20Study#products">Books</Link>
            <Link to="/?sort=newest#products">New arrivals</Link>
            <Link to="/community" className="ml-auto text-[#641E32]">Give &amp; exchange</Link>
          </div>
        </div>
      </header>
      {cartSyncError && (
        <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          Cart sync needs attention: {cartSyncError} <Link to="/cart" className="ml-1 font-bold underline">Review your cart</Link>
        </div>
      )}
      {children}
      <footer className="mt-16 border-t border-[#E8DFD0] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-[#7D8976] sm:flex-row sm:items-center sm:justify-between">
          <p>© ShareBox · A thoughtful marketplace. Mock payments only; no money is transferred.</p>
          <Link className="font-semibold text-[#641E32]" to="/community">Explore community sharing</Link>
        </div>
      </footer>
    </div>
  );
}

export default MarketplaceLayout;
