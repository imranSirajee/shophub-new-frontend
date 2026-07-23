import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  ShoppingCart,
  Heart,
  Search,
  Menu,
  X,
  Star,
  ChevronRight,
  ChevronLeft,
  Home as HomeIcon,
  User,
  Package,
  MapPin,
  CreditCard,
  Check,
  Minus,
  Plus,
  SlidersHorizontal,
  ArrowLeft,
  Truck,
  ShieldCheck,
  RotateCcw,
  Zap,
  Store,
  Smartphone,
  Shirt,
  Sofa,
  Sparkles,
  Gamepad2,
  Book,
  Baby,
  Gift,
  LogOut,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import AuthModal from "./AuthModal";
import { productsApi, cartApi, ordersApi, paymentsApi, settingsApi, } from "./api";
import AdminDashboard from "./AdminDashboard";


const CATEGORIES = [
  { name: "Fashion", icon: Shirt },
  { name: "Mobile & Tech", icon: Smartphone },
  { name: "Home & Living", icon: Sofa },
  { name: "Beauty & Health", icon: Sparkles },
  { name: "Sports & Outdoor", icon: Gamepad2 },
  { name: "Books & Stationery", icon: Book },
  { name: "Baby & Kids", icon: Baby },
  { name: "Gifts", icon: Gift },
];

const money = (n) => `৳${(n ?? 0).toLocaleString()}`;

function normalizeProduct(p) {
  return { ...p, id: p._id || p.id };
}


function Stars({ rating, size = 13 }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i < Math.round(rating) ? "var(--marigold)" : "none"}
          stroke={i < Math.round(rating) ? "var(--marigold)" : "#c9c0ae"}
        />
      ))}
    </div>
  );
}

function ProductCard({ p, onOpen, onAdd, wished, onWish }) {
  const off = p.was ? Math.round((1 - p.price / p.was) * 100) : 0;
  return (
    <div className="pcard" onClick={() => onOpen(p)}>
      <div className="imgwrap">
        {off > 0 && <span className="discount-tag">-{off}%</span>}
        <button
          className={`wish ${wished ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onWish(p.id);
          }}
        >
          <Heart
            size={15}
            fill={wished ? "var(--terracotta)" : "none"}
            stroke={wished ? "var(--terracotta)" : "var(--forest-deep)"}
          />
        </button>
        <img src={p.img} alt={p.name} loading="lazy" />
      </div>
      <div className="info">
        <span className="cat">{p.cat}</span>
        <h4>{p.name}</h4>
        <div className="rating">
          <Stars rating={p.rating} />
          <span>({p.reviews})</span>
        </div>
        <div className="price-row">
          <span className="now">{money(p.price)}</span>
          {p.was ? <span className="was">{money(p.was)}</span> : null}
        </div>
        <div className="stockbar">
          <i style={{ width: `${Math.min(p.stock, 100)}%` }} />
        </div>
        <span className="stocktxt">{p.stock} left in stock</span>
        <button
          className="addbtn"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(p);
          }}
        >
          <ShoppingCart size={14} /> Add to Cart
        </button>
      </div>
    </div>
  );
}

// app

export default function ShopHubApp() {
  const { user, loading: authLoading, logout } = useAuth();

  const [page, setPage] = useState("home");
  const [selected, setSelected] = useState(null);
  const [related, setRelated] = useState([]);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");

  const [cart, setCart] = useState({ items: [], total: 0, count: 0 });
  const [wishlist, setWishlist] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [sort, setSort] = useState("popular");
  const [maxPrice, setMaxPrice] = useState(6000);
  const [toast, setToast] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  useEffect(() => {
    settingsApi
      .get()
      .then(({ settings }) => setSettings(settings))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (path.startsWith("/checkout/success")) {
      setOrderResult({ orderNumber: params.get("order") });
      setPage("order-success");
      window.history.replaceState(null, "", "/");
    } else if (path.startsWith("/checkout/failed")) {
      setOrderResult({ reason: params.get("reason") });
      setPage("order-failed");
      window.history.replaceState(null, "", "/");
    }
  }, []);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(window._t);
    window._t = setTimeout(() => setToast(null), 2200);
  }

  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    setProductsError("");
    productsApi
      .list({ category: activeCat, maxPrice, q: query, sort })
      .then((data) => {
        if (!cancelled)
          setProducts((data.products || []).map(normalizeProduct));
      })
      .catch((err) => {
        if (!cancelled) setProductsError(err.message);
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCat, maxPrice, query, sort]);

  const refreshCart = useCallback(async () => {
    if (!user) return;
    try {
      const { cart } = await cartApi.get();
      setCart(cart);
    } catch (err) {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    if (user) refreshCart();
    else setCart({ items: [], total: 0, count: 0 });
  }, [user, refreshCart]);

  async function addToCart(p, qty = 1, color, size) {
    if (!user) {
      showToast("Please log in to add items to your cart");
      setAuthModalOpen(true);
      return;
    }
    try {
      const { cart } = await cartApi.addItem(p.id, qty, color, size);
      setCart(cart);
      showToast(`${p.name} added to cart`);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function changeQty(productId, delta) {
    const item = cart.items.find((i) => i.productId === productId);
    if (!item) return;
    const newQty = item.qty + delta;
    try {
      if (newQty < 1) {
        const { cart } = await cartApi.removeItem(productId);
        setCart(cart);
      } else {
        const { cart } = await cartApi.updateQty(productId, newQty);
        setCart(cart);
      }
    } catch (err) {
      showToast(err.message);
    }
  }

  async function removeFromCart(productId) {
    try {
      const { cart } = await cartApi.removeItem(productId);
      setCart(cart);
    } catch (err) {
      showToast(err.message);
    }
  }

  function toggleWish(id) {
    setWishlist((w) =>
      w.includes(id) ? w.filter((x) => x !== id) : [...w, id],
    );
  }

  async function openProduct(p) {
    setSelected(p);
    setPage("product");
    setMenuOpen(false);
    setRelated([]);
    try {
      const { products } = await productsApi.related(p.id);
      setRelated((products || []).map(normalizeProduct));
    } catch {
      
    }
  }

  function goShop(cat) {
    setActiveCat(cat || "All");
    setPage("shop");
    setMenuOpen(false);
  }

  async function handleLogout() {
    await logout();
    setCart({ items: [], total: 0, count: 0 });
    showToast("Logged out");
  }

  async function placeOrder({ shippingAddress, paymentMethod }) {
    const { order } = await ordersApi.create({
      shippingAddress,
      paymentMethod,
    });

    if (paymentMethod === "cod") {
      setCart({ items: [], total: 0, count: 0 });
      showToast("🎉 Order placed successfully!");
      setPage("home");
      return;
    }

    if (paymentMethod === "bkash") {
      const { bkashURL } = await paymentsApi.initiateBkash(
        order._id || order.id,
      );
      window.location.href = bkashURL;
      return;
    }

    const { gatewayUrl } = await paymentsApi.initiateSslcommerz(
      order._id || order.id,
    );
    window.location.href = gatewayUrl;
  }

  return (
    <div className="app">
      <GlobalStyle />
      <TopUtility />
      <Header
        cartCount={cart.count}
        wishCount={wishlist.length}
        query={query}
        setQuery={setQuery}
        onSearchSubmit={() => goShop("All")}
        onLogo={() => setPage("home")}
        onCart={() => setCartOpen(true)}
        onMenu={() => setMenuOpen(true)}
        onShop={() => goShop("All")}
        user={user}
        authLoading={authLoading}
        onLoginClick={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onAdmin={() => setPage("admin")}
        settings={settings}
      />
      <CategoryNav
        active={page === "shop" ? activeCat : null}
        onSelect={goShop}
      />

      {page === "home" && (
        <Home
          products={products}
          loading={productsLoading}
          error={productsError}
          onOpen={openProduct}
          onAdd={addToCart}
          wishlist={wishlist}
          onWish={toggleWish}
          onShop={goShop}
          onSeeAll={() => goShop("All")}
          settings={settings}
        />
      )}
      {page === "shop" && (
        <Shop
          products={products}
          loading={productsLoading}
          error={productsError}
          activeCat={activeCat}
          setActiveCat={setActiveCat}
          sort={sort}
          setSort={setSort}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          query={query}
          onOpen={openProduct}
          onAdd={addToCart}
          wishlist={wishlist}
          onWish={toggleWish}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
        />
      )}
      {page === "product" && selected && (
        <ProductDetail
          product={selected}
          onAdd={addToCart}
          onBack={() => setPage("shop")}
          wished={wishlist.includes(selected.id)}
          onWish={toggleWish}
          related={related}
          onOpen={openProduct}
        />
      )}
      {page === "checkout" && (
        <Checkout
          cart={cart}
          onBack={() => setCartOpen(true)}
          onPlace={placeOrder}
        />
      )}
      {page === "order-success" && (
        <OrderResultPage
          success
          orderNumber={orderResult?.orderNumber}
          onContinue={() => setPage("home")}
        />
      )}
      {page === "order-failed" && (
        <OrderResultPage
          success={false}
          reason={orderResult?.reason}
          onContinue={() => setPage("checkout")}
        />
      )}
      {page === "admin" && <AdminDashboard onBack={() => setPage("home")} />}

      <Footer onShop={goShop} />
      <MobileNav
        page={page}
        cartCount={cart.count}
        onHome={() => setPage("home")}
        onShop={() => goShop("All")}
        onCart={() => setCartOpen(true)}
        onMenu={() => setMenuOpen(true)}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onQty={changeQty}
        onRemove={removeFromCart}
        onCheckout={() => {
          if (!user) {
            setCartOpen(false);
            setAuthModalOpen(true);
            return;
          }
          setCartOpen(false);
          setPage("checkout");
        }}
      />
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onShop={goShop}
      />
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {toast && (
        <div className="toast show">
          <Check size={16} color="var(--marigold)" /> {toast}
        </div>
      )}
    </div>
  );
}

// header
function TopUtility() {
  return (
    <div className="utility">
      <div className="wrap">
        <span>
          <MapPin size={13} style={{ verticalAlign: -2 }} /> Deliver to{" "}
          <strong>Dhaka</strong>
        </span>
        <div className="right">
          <a>Track Order</a>
          <a>Sell on ShopHub</a>
          <a>বাংলা / EN</a>
        </div>
      </div>
    </div>
  );
}

function Header({
  cartCount,
  wishCount,
  query,
  setQuery,
  onSearchSubmit,
  onLogo,
  onCart,
  onMenu,
  onShop,
  user,
  authLoading,
  onLoginClick,
  onLogout,
  onAdmin,
  settings,
}) {
  return (
    <header>
      <div className="wrap header-main">
        <button className="hamburger" onClick={onMenu}>
          <Menu size={22} />
        </button>
        <a className="logo" onClick={onLogo}>
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.siteName || "logo"}
              style={{ height: 32 }}
            />
          ) : (
            <span className="mark">S</span>
          )}
          <span className="name">
            {settings?.siteName ? (
              settings.siteName
            ) : (
              <>
                Shop<span>Hub</span>
              </>
            )}
          </span>
        </a>
        <form
          className="searchbar"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for products, brands and more..."
          />
          <button type="submit" aria-label="search">
            <Search size={17} color="white" />
          </button>
        </form>
        <div className="header-actions">
          {!authLoading && user?.role === "admin" && (
            <a className="h-action" onClick={onAdmin}>
              <ShieldCheck size={21} />
              <span>Admin</span>
            </a>
          )}
          {!authLoading &&
            (user ? (
              <a className="h-action" onClick={onLogout} title={user.name}>
                <LogOut size={21} />
                <span>Logout</span>
              </a>
            ) : (
              <a className="h-action" onClick={onLoginClick}>
                <User size={21} />
                <span>Login</span>
              </a>
            ))}
          <a className="h-action">
            <Heart size={21} />
            <span>Wishlist</span>
            {wishCount > 0 && <span className="badge">{wishCount}</span>}
          </a>
          <a className="h-action" onClick={onCart}>
            <ShoppingCart size={21} />
            <span>Cart</span>
            {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </a>
        </div>
      </div>
    </header>
  );
}

function CategoryNav({ active, onSelect }) {
  return (
    <nav className="catnav">
      <div className="wrap">
        <a className="all" onClick={() => onSelect("All")}>
          ☰ All Categories
        </a>
        <a
          className={active === "All" ? "active" : ""}
          onClick={() => onSelect("All")}
        >
          Flash Sale 🔥
        </a>
        {CATEGORIES.map((c) => (
          <a
            key={c.name}
            className={active === c.name ? "active" : ""}
            onClick={() => onSelect(c.name)}
          >
            {c.name}
          </a>
        ))}
      </div>
    </nav>
  );
}

function MobileMenu({ open, onClose, onShop }) {
  return (
    <div className={`mobile-menu ${open ? "open" : ""}`}>
      <div className="mm-head">
        <span className="logo">
          <span className="mark">S</span>
          <span className="name">
            Shop<span>Hub</span>
          </span>
        </span>
        <button onClick={onClose}>
          <X size={22} />
        </button>
      </div>
      <div className="mm-list">
        <a onClick={() => onShop("All")}>All Categories</a>
        {CATEGORIES.map((c) => (
          <a key={c.name} onClick={() => onShop(c.name)}>
            <c.icon size={17} /> {c.name}
          </a>
        ))}
      </div>
      <div className="mm-foot">
        <a>Track Order</a>
        <a>Sell on ShopHub</a>
        <a>Help Center</a>
      </div>
    </div>
  );
}

function MobileNav({ page, cartCount, onHome, onShop, onCart, onMenu }) {
  return (
    <div className="mobilenav">
      <button className={page === "home" ? "on" : ""} onClick={onHome}>
        <HomeIcon size={20} />
        <span>Home</span>
      </button>
      <button className={page === "shop" ? "on" : ""} onClick={onShop}>
        <Search size={20} />
        <span>Shop</span>
      </button>
      <button onClick={onCart} style={{ position: "relative" }}>
        <ShoppingCart size={20} />
        {cartCount > 0 && <span className="mnbadge">{cartCount}</span>}
        <span>Cart</span>
      </button>
      <button onClick={onMenu}>
        <Menu size={20} />
        <span>Menu</span>
      </button>
    </div>
  );
}

// home
function Home({
  products,
  loading,
  error,
  onOpen,
  onAdd,
  wishlist,
  onWish,
  onShop,
  onSeeAll,
  settings,
}) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!settings?.flashSaleEndTime) return;
    function tick() {
      const diff = Math.max(
        0,
        Math.floor((new Date(settings.flashSaleEndTime) - new Date()) / 1000),
      );
      setT(diff);
    }
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [settings?.flashSaleEndTime]);
  const h = String(Math.floor(t / 3600)).padStart(2, "0");
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
  const s = String(t % 60).padStart(2, "0");

  const flashItems = products.slice(0, 5);
  const trendingItems = products.slice(5, 10);

  return (
    <main>
      <section className="hero wrap">
        <div className="hero-grid">
          <div className="hero-banner">
            <div className="hero-copy">
              <span className="hero-eyebrow">
                {settings?.heroEyebrow || "Eid Collection · Live Now"}
              </span>
              <h1>
                {settings?.heroTitle || "Style your Eid, the ShopHub way."}
              </h1>
              <p>
                {settings?.heroSubtitle ||
                  "Curated fashion, electronics & home essentials from 12,000+ trusted local sellers — delivered nationwide in 48 hours."}
              </p>
              <div className="hero-ctas">
                <a className="btn-primary" onClick={onSeeAll}>
                  Shop the Collection
                </a>
                <a className="btn-ghost" onClick={onSeeAll}>
                  Explore deals <ChevronRight size={16} />
                </a>
              </div>
            </div>
          </div>
          <div className="hero-side">
            <div
              className="promo-card c1"
              onClick={() => onShop("Mobile & Tech")}
            >
              <span className="tag">{settings?.promo1Tag || "Mega Deal"}</span>
              <h3>{settings?.promo1Title || "Up to 60% off Electronics"}</h3>
              <span className="go">Shop now →</span>
            </div>
            <div className="promo-card c2" onClick={() => onShop("Fashion")}>
              <span className="tag">
                {settings?.promo2Tag || "New Sellers"}
              </span>
              <h3>{settings?.promo2Title || "Handmade Jamdani & Craft"}</h3>
              <span className="go">Discover →</span>
            </div>
          </div>
        </div>
      </section>

      <div className="trust">
        <div className="wrap">
          <div className="trust-item">
            <Truck size={20} /> Free delivery over ৳1000
          </div>
          <div className="trust-item">
            <RotateCcw size={20} /> 7-day easy return
          </div>
          <div className="trust-item">
            <ShieldCheck size={20} /> 100% genuine products
          </div>
          <div className="trust-item">
            Cash on Delivery &amp; secure pay
            <span className="pay-icons">
              <span className="pay-pill pk">bKash</span>
              <span className="pay-pill nk">Nagad</span>
              <span className="pay-pill rk">Rocket</span>
              <span className="pay-pill ssl">SSL</span>
            </span>
          </div>
        </div>
      </div>

      <section className="section wrap">
        <div className="sec-head">
          <div>
            <span className="tag">Browse</span>
            <h2>Shop by Category</h2>
          </div>
          <a className="sec-link" onClick={onSeeAll}>
            View all categories <ChevronRight size={14} />
          </a>
        </div>
        <div className="catgrid">
          {CATEGORIES.map((c) => (
            <div
              className="catcard"
              key={c.name}
              onClick={() => onShop(c.name)}
            >
              <div className="ic">
                <c.icon size={24} />
              </div>
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: 52 }}>
        <div className="flash">
          <div className="flash-top">
            <h2 className="flash-h">
              <Zap size={22} color="var(--marigold)" fill="var(--marigold)" />{" "}
              Flash Sale
            </h2>
            {settings?.flashSaleEndTime && (
              <div className="timer">
                <div className="t">
                  <b>{h}</b>
                  <span>Hrs</span>
                </div>
                <div className="t">
                  <b>{m}</b>
                  <span>Min</span>
                </div>
                <div className="t">
                  <b>{s}</b>
                  <span>Sec</span>
                </div>
              </div>
            )}
            <a className="sec-link flash-link" onClick={onSeeAll}>
              See all deals <ChevronRight size={14} />
            </a>
          </div>
          {loading && (
            <div className="empty-state" style={{ color: "white" }}>
              Loading products...
            </div>
          )}
          {error && (
            <div className="empty-state" style={{ color: "white" }}>
              Couldn't load products: {error}
            </div>
          )}
          {!loading && !error && (
            <div className="pgrid flash-grid">
              {flashItems.map((p) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  onOpen={onOpen}
                  onAdd={onAdd}
                  wished={wishlist.includes(p.id)}
                  onWish={onWish}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section wrap" style={{ paddingTop: 0 }}>
        <div className="midbanner">
          <div>
            <span className="hero-eyebrow light">Vendor Spotlight</span>
            <h3>Bring your business online with ShopHub Seller Hub</h3>
            <p>
              Zero setup fee for your first 3 months. Reach millions of buyers
              across Bangladesh.
            </p>
            <a className="btn-primary dark">
              <Store size={16} style={{ marginRight: 8, verticalAlign: -3 }} />
              Start Selling Today
            </a>
          </div>
        </div>
      </section>

      <section className="section wrap">
        <div className="sec-head">
          <div>
            <span className="tag">Handpicked</span>
            <h2>Trending This Week</h2>
          </div>
          <a className="sec-link" onClick={onSeeAll}>
            View all <ChevronRight size={14} />
          </a>
        </div>
        {!loading && !error && (
          <div className="pgrid">
            {trendingItems.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                onOpen={onOpen}
                onAdd={onAdd}
                wished={wishlist.includes(p.id)}
                onWish={onWish}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// shop
function Shop({
  products,
  loading,
  error,
  activeCat,
  setActiveCat,
  sort,
  setSort,
  maxPrice,
  setMaxPrice,
  query,
  onOpen,
  onAdd,
  wishlist,
  onWish,
  filtersOpen,
  setFiltersOpen,
}) {
  return (
    <main className="wrap shop-page">
      <div className="breadcrumb">
        Home <ChevronRight size={12} />{" "}
        {activeCat === "All" ? "All Products" : activeCat}
      </div>
      <div className="shop-grid">
        <aside className={`filters ${filtersOpen ? "open" : ""}`}>
          <div className="filters-head">
            <h4>Filters</h4>
            <button
              className="close-filters"
              onClick={() => setFiltersOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="filter-block">
            <h5>Category</h5>
            <a
              className={activeCat === "All" ? "on" : ""}
              onClick={() => setActiveCat("All")}
            >
              All Products
            </a>
            {CATEGORIES.map((c) => (
              <a
                key={c.name}
                className={activeCat === c.name ? "on" : ""}
                onClick={() => setActiveCat(c.name)}
              >
                <c.icon size={15} /> {c.name}
              </a>
            ))}
          </div>
          <div className="filter-block">
            <h5>Max Price: {money(maxPrice)}</h5>
            <input
              type="range"
              min="500"
              max="6000"
              step="100"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
            />
          </div>
        </aside>

        <div className="shop-main">
          <div className="shop-toolbar">
            <span>
              {loading
                ? "Loading..."
                : `${products.length} products${query ? ` for "${query}"` : ""}`}
            </span>
            <div className="toolbar-right">
              <button
                className="filter-toggle"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={15} /> Filters
              </button>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="popular">Sort: Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>
          {error ? (
            <div className="empty-state">Couldn't load products: {error}</div>
          ) : loading ? (
            <div className="empty-state">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              No products match your filters. Try widening your search.
            </div>
          ) : (
            <div className="pgrid shop-pgrid">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  p={p}
                  onOpen={onOpen}
                  onAdd={onAdd}
                  wished={wishlist.includes(p.id)}
                  onWish={onWish}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// details
function ProductDetail({
  product: p,
  onAdd,
  onBack,
  wished,
  onWish,
  related,
  onOpen,
}) {
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState(p.colors?.[0]);
  const [size, setSize] = useState(p.sizes?.[0]);
  const off = p.was ? Math.round((1 - p.price / p.was) * 100) : 0;

  return (
    <main className="wrap pd-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} /> Back to results
      </button>
      <div className="pd-grid">
        <div className="pd-img">
          {off > 0 && <span className="discount-tag big">-{off}%</span>}
          <img src={p.img} alt={p.name} />
        </div>
        <div className="pd-info">
          <span className="cat">{p.cat}</span>
          <h1>{p.name}</h1>
          <div className="rating">
            <Stars rating={p.rating} size={16} />
            <span>
              {p.rating} · {p.reviews} reviews
            </span>
          </div>
          <div className="price-row big">
            <span className="now">{money(p.price)}</span>
            {p.was ? <span className="was">{money(p.was)}</span> : null}
            {off > 0 && <span className="save">Save {off}%</span>}
          </div>
          <p className="pd-desc">{p.desc}</p>

          {p.colors?.length > 0 && (
            <div className="opt-block">
              <h5>Color</h5>
              <div className="swatches">
                {p.colors.map((c) => (
                  <button
                    key={c}
                    className={`swatch ${color === c ? "on" : ""}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          )}
          {p.sizes?.length > 0 && (
            <div className="opt-block">
              <h5>Size</h5>
              <div className="sizes">
                {p.sizes.map((s) => (
                  <button
                    key={s}
                    className={`size-pill ${size === s ? "on" : ""}`}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="opt-block">
            <h5>Quantity</h5>
            <div className="qty-control">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Minus size={14} />
              </button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(p.stock, q + 1))}>
                <Plus size={14} />
              </button>
              <span className="stocktxt" style={{ marginLeft: 12 }}>
                {p.stock} in stock
              </span>
            </div>
          </div>

          <div className="pd-actions">
            <button
              className="addbtn big"
              onClick={() => onAdd(p, qty, color, size)}
            >
              <ShoppingCart size={16} /> Add to Cart
            </button>
            <button
              className={`wishbtn ${wished ? "active" : ""}`}
              onClick={() => onWish(p.id)}
            >
              <Heart
                size={18}
                fill={wished ? "var(--terracotta)" : "none"}
                stroke={wished ? "var(--terracotta)" : "var(--forest-deep)"}
              />
            </button>
          </div>

          <div className="pd-trust">
            <span>
              <Truck size={16} /> Free delivery over ৳1000
            </span>
            <span>
              <RotateCcw size={16} /> 7-day easy return
            </span>
            <span>
              <ShieldCheck size={16} /> Genuine product guarantee
            </span>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="sec-head">
            <div>
              <span className="tag">You may also like</span>
              <h2>Related Products</h2>
            </div>
          </div>
          <div className="pgrid">
            {related.map((r) => (
              <ProductCard
                key={r.id}
                p={r}
                onOpen={onOpen}
                onAdd={onAdd}
                wished={false}
                onWish={() => {}}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

// cart
function CartDrawer({ open, onClose, cart, onQty, onRemove, onCheckout }) {
  const items = cart.items || [];
  const total = cart.total || 0;
  return (
    <>
      <div className={`overlay ${open ? "show" : ""}`} onClick={onClose} />
      <div className={`cart-drawer ${open ? "open" : ""}`}>
        <div className="cd-head">
          <h3>
            <ShoppingCart size={18} /> Your Cart ({items.length})
          </h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="cd-body">
          {items.length === 0 ? (
            <div className="empty-state">
              Your cart is empty. Start adding some great products!
            </div>
          ) : (
            items.map((i) => (
              <div className="cd-item" key={i.productId}>
                <img src={i.img} alt={i.name} />
                <div className="cd-item-info">
                  <h5>{i.name}</h5>
                  <span className="now">{money(i.price)}</span>
                  <div className="qty-control small">
                    <button onClick={() => onQty(i.productId, -1)}>
                      <Minus size={12} />
                    </button>
                    <span>{i.qty}</span>
                    <button onClick={() => onQty(i.productId, 1)}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <button
                  className="cd-remove"
                  onClick={() => onRemove(i.productId)}
                >
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="cd-foot">
            <div className="cd-row">
              <span>Subtotal</span>
              <span>{money(total)}</span>
            </div>
            <div className="cd-row">
              <span>Delivery</span>
              <span>{total >= 1000 ? "Free" : money(60)}</span>
            </div>
            <div className="cd-row total">
              <span>Total</span>
              <span>{money(total >= 1000 ? total : total + 60)}</span>
            </div>
            <button className="btn-primary full" onClick={onCheckout}>
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// checkout
function Checkout({ cart, onBack, onPlace }) {
  const items = cart.items || [];
  const total = cart.total || 0;
  const delivery = total >= 1000 ? 0 : 60;

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    street: "",
    city: "Dhaka",
    postalCode: "",
  });
  const [payMethod, setPayMethod] = useState("bkash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (items.length === 0) {
      onBack();
    }
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handlePlaceOrder() {
    if (busy) return; 
    setError("");
    if (!form.fullName || !form.phone || !form.street) {
      setError("Please fill in your name, phone, and street address.");
      return;
    }
    if (items.length === 0) {
     
      setError("Your cart is empty — nothing to order.");
      return;
    }
    setBusy(true);
    try {
      await onPlace({ shippingAddress: form, paymentMethod: payMethod });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="wrap checkout-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} /> Back to cart
      </button>
      <h1 className="co-title">Checkout</h1>
      <div className="co-grid">
        <div className="co-form">
          <div className="co-block">
            <h4>
              <MapPin size={16} /> Delivery Address
            </h4>
            <div className="form-row two">
              <input
                placeholder="Full Name"
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
              />
              <input
                placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <input
              placeholder="Street Address, House/Flat No."
              value={form.street}
              onChange={(e) => update("street", e.target.value)}
            />
            <div className="form-row two">
              <select
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              >
                <option>Dhaka</option>
                <option>Chattogram</option>
                <option>Khulna</option>
                <option>Rajshahi</option>
                <option>Sylhet</option>
              </select>
              <input
                placeholder="Postal Code"
                value={form.postalCode}
                onChange={(e) => update("postalCode", e.target.value)}
              />
            </div>
          </div>
          <div className="co-block">
            <h4>
              <CreditCard size={16} /> Payment Method
            </h4>
            <div className="pay-options">
              {[
                { id: "bkash", label: "bKash", cls: "pk" },
                { id: "nagad", label: "Nagad", cls: "nk" },
                { id: "rocket", label: "Rocket", cls: "rk" },
                { id: "cod", label: "Cash on Delivery", cls: "" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`pay-option ${payMethod === opt.id ? "on" : ""}`}
                >
                  <input
                    type="radio"
                    name="pay"
                    checked={payMethod === opt.id}
                    onChange={() => setPayMethod(opt.id)}
                  />
                  {opt.cls ? (
                    <span className={`pay-pill ${opt.cls}`}>{opt.label}</span>
                  ) : (
                    <span className="cod-label">{opt.label}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="co-summary">
          <h4>Order Summary</h4>
          {items.map((i) => (
            <div className="co-line" key={i.productId}>
              <span>
                {i.name} × {i.qty}
              </span>
              <span>{money(i.price * i.qty)}</span>
            </div>
          ))}
          <div className="co-line">
            <span>Delivery</span>
            <span>{delivery === 0 ? "Free" : money(delivery)}</span>
          </div>
          <div className="co-line total">
            <span>Total</span>
            <span>{money(total + delivery)}</span>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button
            className="btn-primary full"
            onClick={handlePlaceOrder}
            disabled={busy || items.length === 0}
          >
            {busy ? "Placing order..." : "Place Order"}
          </button>
          <p className="co-note">
            By placing your order you agree to ShopHub's Terms & Conditions.
          </p>
        </div>
      </div>
    </main>
  );
}


function OrderResultPage({ success, orderNumber, reason, onContinue }) {
  return (
    <main
      className="wrap"
      style={{ padding: "60px 24px", textAlign: "center" }}
    >
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, marginBottom: 12 }}>
          {success ? "🎉 Payment Successful!" : "Payment Not Completed"}
        </h1>
        <p style={{ color: "#5c6f68", marginBottom: 20 }}>
          {success
            ? `Your order ${orderNumber ? `#${orderNumber} ` : ""}has been confirmed. Thank you for shopping with ShopHub!`
            : `Something went wrong${reason ? ` (${reason})` : ""}. Your order was not charged — you can try again.`}
        </p>
        <a className="btn-primary" onClick={onContinue}>
          {success ? "Continue Shopping" : "Back to Checkout"}
        </a>
      </div>
    </main>
  );
}


/* FOOTER                                                               */
/* ------------------------------------------------------------------ */
function Footer({ onShop }) {
  return (
    <footer>
      <div className="wrap foot-grid">
        <div>
          <span className="logo foot-logo">
            <span className="mark">S</span>
            <span className="name">
              Shop<span>Hub</span>
            </span>
          </span>
          <p className="desc">
            Bangladesh's fastest-growing online marketplace — connecting local
            sellers with millions of buyers nationwide.
          </p>
        </div>
        <div className="foot-col">
          <h5>Shop</h5>
          <a onClick={() => onShop("All")}>Flash Sale</a>
          <a onClick={() => onShop("Fashion")}>Fashion</a>
          <a onClick={() => onShop("Mobile & Tech")}>Electronics</a>
        </div>
        <div className="foot-col">
          <h5>Customer Care</h5>
          <a>Track My Order</a>
          <a>Returns &amp; Refunds</a>
          <a>FAQs</a>
        </div>
        <div className="foot-col">
          <h5>Sell on ShopHub</h5>
          <a>Become a Vendor</a>
          <a>Seller Dashboard</a>
        </div>
        <div className="foot-col">
          <h5>Company</h5>
          <a>About Us</a>
          <a>Careers</a>
          <a>Privacy Policy</a>
        </div>
      </div>
      <div className="wrap foot-bottom">
        <span>© 2026 ShopHub Bangladesh. All rights reserved.</span>
        <div className="foot-pay">
          <span className="pay-pill pk">bKash</span>
          <span className="pay-pill nk">Nagad</span>
          <span className="pay-pill rk">Rocket</span>
          <span className="pay-pill ssl">SSLCommerz</span>
        </div>
      </div>
    </footer>
  );
}


function GlobalStyle() {
  return (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,900&family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@500;700&display=swap');
    :root{
      --ink:#0B2B24; --forest:#0F4A3B; --forest-deep:#0A3529;
      --cream:#FBF4E7; --cream-2:#F5EBD8; --paper:#FFFDF8;
      --marigold:#F0A202; --marigold-deep:#D4890A;
      --terracotta:#D14B32; --terracotta-deep:#B33A24;
      --line:rgba(11,43,36,0.12); --shadow:0 10px 30px -12px rgba(11,43,36,0.25); --radius:14px;
    }
    .app *{box-sizing:border-box;}
    .app{font-family:'Manrope',sans-serif; background:var(--cream); color:var(--ink); line-height:1.5;}
    .app h1,.app h2,.app h3,.app h4{font-family:'Fraunces',serif; font-weight:600; letter-spacing:-0.01em; margin:0;}
    .app a{color:inherit; text-decoration:none; cursor:pointer;}
    .app img{max-width:100%; display:block;}
    .app button{font-family:inherit; cursor:pointer; border:none; background:none;}
    .app input,.app select{font-family:inherit;}
    .wrap{max-width:1280px; margin:0 auto; padding:0 24px;}

    .utility{background:var(--forest-deep); color:rgba(255,255,255,0.85); font-size:12.5px; padding:7px 0;}
    .utility .wrap{display:flex; justify-content:space-between; align-items:center;}
    .utility .right{display:flex; gap:16px;}
    .utility .right a:hover{text-decoration:underline;}

    header{position:sticky; top:0; z-index:100; background:var(--paper); border-bottom:1px solid var(--line);}
    .header-main{padding:14px 0; display:flex; align-items:center; gap:20px;}
    .hamburger{display:none; flex-shrink:0;}
    .logo{display:flex; align-items:center; flex-shrink:0;}
    .logo .mark{width:36px; height:36px; border-radius:10px; background:linear-gradient(145deg,var(--marigold),var(--terracotta)); display:flex; align-items:center; justify-content:center; color:white; font-family:'Fraunces',serif; font-weight:700; font-size:19px; margin-right:8px; box-shadow:0 6px 14px -4px rgba(209,75,50,0.5);}
    .logo .name{font-family:'Fraunces',serif; font-size:24px; font-weight:700; color:var(--forest-deep);}
    .logo .name span{color:var(--terracotta);}
    .foot-logo .name{color:white; font-size:22px;}
    .foot-logo .name span{color:var(--marigold);}

    .searchbar{flex:1; display:flex; align-items:center; background:var(--cream-2); border:1.5px solid transparent; border-radius:999px; padding:4px 4px 4px 18px; transition:.2s;}
    .searchbar:focus-within{border-color:var(--marigold); background:var(--paper);}
    .searchbar input{flex:1; border:none; background:transparent; outline:none; font-size:14px; padding:9px 0; min-width:0;}
    .searchbar button{background:var(--forest); border-radius:999px; width:38px; height:38px; display:flex; align-items:center; justify-content:center; flex-shrink:0;}

    .header-actions{display:flex; align-items:center; gap:22px; flex-shrink:0;}
    .h-action{display:flex; flex-direction:column; align-items:center; gap:3px; font-size:11px; color:var(--forest-deep); position:relative;}
    .h-action .badge{position:absolute; top:-5px; right:-10px; background:var(--terracotta); color:white; font-size:10px; font-weight:800; width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center;}

    .catnav{background:var(--forest);}
    .catnav .wrap{display:flex; align-items:center; gap:2px; overflow-x:auto;}
    .catnav a{color:rgba(255,255,255,0.85); font-size:13px; font-weight:600; padding:12px 14px; white-space:nowrap; border-bottom:2.5px solid transparent; transition:.2s;}
    .catnav a:hover, .catnav a.active{color:white; border-bottom-color:var(--marigold);}
    .catnav a.all{background:var(--marigold-deep); color:white;}

    .hero{padding:28px 0 36px;}
    .hero-grid{display:grid; grid-template-columns:2.1fr 1fr; gap:18px;}
    .hero-banner{position:relative; border-radius:20px; overflow:hidden; min-height:340px; background:linear-gradient(120deg,#123D31,#0B2B24 60%); display:flex; align-items:center; padding:0 40px;}
    .hero-banner::before{content:''; position:absolute; inset:0; background:radial-gradient(circle at 85% 20%, rgba(240,162,2,0.35), transparent 45%), radial-gradient(circle at 95% 85%, rgba(209,75,50,0.3), transparent 40%);}
    .hero-copy{max-width:460px; position:relative;}
    .hero-eyebrow{display:inline-flex; align-items:center; gap:8px; background:rgba(240,162,2,0.16); color:var(--marigold); font-size:12px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; padding:6px 14px; border-radius:999px; margin-bottom:16px;}
    .hero-eyebrow.light{background:rgba(255,255,255,0.2); color:white;}
    .hero-eyebrow::before{content:''; width:6px; height:6px; border-radius:50%; background:var(--marigold);}
    .hero-copy h1{color:var(--paper); font-size:38px; line-height:1.1; margin-bottom:14px;}
    .hero-copy h1 em{font-style:italic; color:var(--marigold); font-weight:500;}
    .hero-copy p{color:rgba(251,244,231,0.75); font-size:14.5px; margin-bottom:24px; max-width:380px;}
    .hero-ctas{display:flex; gap:10px; align-items:center; flex-wrap:wrap;}
    .btn-primary{background:var(--marigold); color:var(--forest-deep); font-weight:800; font-size:14px; padding:13px 24px; border-radius:999px; display:inline-flex; align-items:center; box-shadow:0 10px 24px -8px rgba(240,162,2,0.6); transition:.2s;}
    .btn-primary:hover{transform:translateY(-2px);}
    .btn-primary.dark{background:var(--ink); color:white; box-shadow:none;}
    .btn-primary.full{width:100%; justify-content:center; margin-top:14px;}
    .btn-primary:disabled{opacity:0.6; cursor:not-allowed; transform:none;}
    .btn-ghost{color:var(--paper); font-weight:700; font-size:14px; display:flex; align-items:center; gap:5px;}

    .hero-side{display:flex; flex-direction:column; gap:18px;}
    .promo-card{border-radius:18px; padding:22px; flex:1; display:flex; flex-direction:column; justify-content:space-between; min-height:150px; cursor:pointer;}
    .promo-card.c1{background:linear-gradient(135deg,#F0A202,#D14B32); color:white;}
    .promo-card.c2{background:var(--paper); border:1px solid var(--line);}
    .promo-card .tag{font-size:11px; font-weight:800; text-transform:uppercase; opacity:0.85;}
    .promo-card h3{font-size:19px; margin-top:6px;}
    .promo-card .go{font-size:12px; font-weight:700; margin-top:12px; display:inline-block;}
    .promo-card.c2 h3{color:var(--forest-deep);}
    .promo-card.c2 .go{color:var(--forest);}

    .trust{background:var(--paper); border-top:1px solid var(--line); border-bottom:1px solid var(--line);}
    .trust .wrap{display:flex; justify-content:space-between; padding:16px 24px; flex-wrap:wrap; gap:12px;}
    .trust-item{display:flex; align-items:center; gap:8px; font-size:12.5px; color:#4a5951; font-weight:600;}
    .pay-icons{display:flex; gap:8px; margin-left:6px;}
    .pay-pill{font-size:11px; font-weight:800; padding:4px 10px; border-radius:6px; color:white;}
    .pk{background:#E2136E;} .nk{background:#F6921E;} .rk{background:#7A2E8E;} .ssl{background:#0B4DA1;}

    .section{padding:44px 0;}
    .sec-head{display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:22px; gap:12px; flex-wrap:wrap;}
    .sec-head .tag{color:var(--terracotta); font-weight:800; font-size:12px; letter-spacing:0.06em; text-transform:uppercase; display:block; margin-bottom:5px;}
    .sec-head h2{font-size:26px; color:var(--forest-deep);}
    .sec-link{font-size:13px; font-weight:700; color:var(--forest); display:flex; align-items:center; gap:4px; border-bottom:2px solid var(--marigold); padding-bottom:2px; white-space:nowrap;}

    .flash{background:var(--forest-deep); border-radius:22px; padding:28px 24px;}
    .flash-top{display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; flex-wrap:wrap; gap:14px;}
    .flash-h{color:white; font-size:24px; display:flex; align-items:center; gap:8px;}
    .flash-link{color:var(--marigold); border-color:var(--marigold);}
    .timer{display:flex; gap:8px;}
    .timer .t{background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:7px 10px; text-align:center; min-width:46px;}
    .timer .t b{display:block; color:white; font-size:17px; font-family:'Fraunces',serif;}
    .timer .t span{color:rgba(255,255,255,0.55); font-size:9px; text-transform:uppercase;}

    .pgrid{display:grid; grid-template-columns:repeat(5,1fr); gap:16px;}
    .pcard{background:var(--paper); border-radius:16px; overflow:hidden; border:1px solid var(--line); transition:.25s; cursor:pointer;}
    .pcard:hover{transform:translateY(-4px); box-shadow:var(--shadow);}
    .pcard .imgwrap{position:relative; aspect-ratio:1/1; overflow:hidden; background:var(--cream-2);}
    .pcard .imgwrap img{width:100%; height:100%; object-fit:cover; transition:.4s;}
    .pcard:hover .imgwrap img{transform:scale(1.06);}
    .discount-tag{position:absolute; top:9px; left:9px; background:var(--terracotta); color:white; font-size:10.5px; font-weight:800; padding:3px 7px; border-radius:6px; z-index:2;}
    .discount-tag.big{position:static; display:inline-block; margin-bottom:10px;}
    .wish{position:absolute; top:9px; right:9px; width:30px; height:30px; border-radius:50%; background:rgba(255,255,255,0.9); display:flex; align-items:center; justify-content:center; z-index:2;}
    .info{padding:13px;}
    .cat{font-size:10px; color:#8a8378; font-weight:700; text-transform:uppercase;}
    .pcard h4{font-size:13.5px; font-weight:600; margin:5px 0 7px; line-height:1.3; min-height:34px; font-family:'Manrope';}
    .rating{display:flex; align-items:center; gap:5px; margin-bottom:7px;}
    .rating span{font-size:11px; color:#8a8378;}
    .price-row{display:flex; align-items:baseline; gap:7px; margin-bottom:9px; flex-wrap:wrap;}
    .price-row .now{font-size:16px; font-weight:800; color:var(--terracotta); font-family:'Fraunces',serif;}
    .price-row .was{font-size:12px; color:#a39a8b; text-decoration:line-through;}
    .price-row.big .now{font-size:26px;}
    .price-row.big .was{font-size:15px;}
    .price-row .save{background:var(--cream-2); color:var(--forest); font-size:11px; font-weight:700; padding:3px 8px; border-radius:6px;}
    .stockbar{height:5px; background:var(--cream-2); border-radius:3px; overflow:hidden; margin-bottom:5px;}
    .stockbar i{display:block; height:100%; background:linear-gradient(90deg,var(--marigold),var(--terracotta));}
    .stocktxt{font-size:10px; color:#a39a8b; font-weight:600;}
    .addbtn{width:100%; margin-top:9px; background:var(--forest); color:white; padding:9px; border-radius:9px; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;}
    .addbtn:hover{background:var(--forest-deep);}
    .addbtn.big{width:auto; padding:13px 24px; font-size:14px; flex:1;}

    .catgrid{display:grid; grid-template-columns:repeat(8,1fr); gap:14px;}
    .catcard{background:var(--paper); border:1px solid var(--line); border-radius:16px; padding:18px 10px; text-align:center; transition:.25s; cursor:pointer;}
    .catcard:hover{transform:translateY(-3px); border-color:var(--marigold); box-shadow:var(--shadow);}
    .catcard .ic{width:46px; height:46px; margin:0 auto 10px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:var(--cream-2); color:var(--forest-deep);}
    .catcard span{font-size:11.5px; font-weight:700;}

    .midbanner{border-radius:20px; overflow:hidden; min-height:190px; background:linear-gradient(115deg,#D14B32,#F0A202); display:flex; align-items:center; padding:30px 36px; color:white;}
    .midbanner h3{font-size:24px; max-width:400px; line-height:1.2; margin:10px 0 10px;}
    .midbanner p{opacity:0.9; font-size:13.5px; margin-bottom:16px;}

    .toast{position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:var(--forest-deep); color:white; padding:12px 20px; border-radius:12px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:9px; box-shadow:0 12px 30px -8px rgba(0,0,0,0.4); z-index:999;}

    .shop-page{padding:24px 24px 50px;}
    .breadcrumb{display:flex; align-items:center; gap:5px; font-size:12.5px; color:#8a8378; margin-bottom:18px;}
    .shop-grid{display:grid; grid-template-columns:220px 1fr; gap:26px; align-items:start;}
    .filters{background:var(--paper); border:1px solid var(--line); border-radius:14px; padding:18px; position:sticky; top:130px;}
    .filters-head{display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;}
    .filters-head h4{font-size:15px;}
    .close-filters{display:none;}
    .filter-block{margin-bottom:20px;}
    .filter-block h5{font-size:12px; text-transform:uppercase; letter-spacing:0.04em; color:#8a8378; margin-bottom:10px;}
    .filter-block a{display:flex; align-items:center; gap:8px; font-size:13px; padding:7px 0; color:var(--ink);}
    .filter-block a.on{color:var(--terracotta); font-weight:700;}
    .filter-block input[type=range]{width:100%; accent-color:var(--terracotta);}
    .shop-toolbar{display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; font-size:13px; color:#5c6f68; flex-wrap:wrap; gap:10px;}
    .toolbar-right{display:flex; align-items:center; gap:10px;}
    .filter-toggle{display:none; align-items:center; gap:6px; font-size:13px; font-weight:700; background:var(--paper); border:1px solid var(--line); padding:8px 12px; border-radius:8px;}
    .shop-toolbar select{border:1px solid var(--line); border-radius:8px; padding:8px 10px; font-size:13px; background:var(--paper);}
    .empty-state{padding:60px 20px; text-align:center; color:#8a8378; font-size:14px;}

    .pd-page{padding:24px 24px 40px;}
    .back-link{display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:var(--forest); margin-bottom:20px;}
    .pd-grid{display:grid; grid-template-columns:1fr 1fr; gap:40px;}
    .pd-img{position:relative; border-radius:18px; overflow:hidden; background:var(--cream-2); aspect-ratio:1/1;}
    .pd-img img{width:100%; height:100%; object-fit:cover;}
    .pd-img .discount-tag.big{position:absolute; top:16px; left:16px; margin:0; font-size:13px; padding:5px 10px;}
    .pd-info h1{font-size:26px; margin:8px 0 10px; line-height:1.25;}
    .pd-desc{font-size:14px; color:#5c6f68; margin:16px 0; line-height:1.7;}
    .opt-block{margin-bottom:18px;}
    .opt-block h5{font-size:12px; text-transform:uppercase; color:#8a8378; margin-bottom:8px; letter-spacing:0.04em;}
    .swatches{display:flex; gap:8px;}
    .swatch{width:30px; height:30px; border-radius:50%; border:2px solid transparent; cursor:pointer;}
    .swatch.on{border-color:var(--terracotta); box-shadow:0 0 0 2px white inset;}
    .sizes{display:flex; gap:8px; flex-wrap:wrap;}
    .size-pill{border:1.5px solid var(--line); padding:8px 14px; border-radius:8px; font-size:13px; font-weight:600;}
    .size-pill.on{background:var(--forest); color:white; border-color:var(--forest);}
    .qty-control{display:flex; align-items:center; gap:12px;}
    .qty-control button{width:32px; height:32px; border:1.5px solid var(--line); border-radius:8px; display:flex; align-items:center; justify-content:center;}
    .qty-control span{font-weight:700; min-width:16px; text-align:center;}
    .qty-control.small button{width:24px; height:24px;}
    .pd-actions{display:flex; gap:10px; margin:22px 0;}
    .wishbtn{width:48px; height:48px; border:1.5px solid var(--line); border-radius:12px; display:flex; align-items:center; justify-content:center;}
    .wishbtn.active{border-color:var(--terracotta); background:#fdf1ee;}
    .pd-trust{display:flex; flex-direction:column; gap:10px; padding-top:16px; border-top:1px solid var(--line);}
    .pd-trust span{display:flex; align-items:center; gap:8px; font-size:13px; color:#5c6f68;}

    .overlay{position:fixed; inset:0; background:rgba(11,43,36,0.4); opacity:0; pointer-events:none; transition:.25s; z-index:200;}
    .overlay.show{opacity:1; pointer-events:auto;}
    .cart-drawer{position:fixed; top:0; right:-420px; width:400px; max-width:92vw; height:100%; background:var(--paper); z-index:201; display:flex; flex-direction:column; transition:right .3s cubic-bezier(.2,.9,.3,1); box-shadow:-10px 0 30px rgba(0,0,0,0.15);}
    .cart-drawer.open{right:0;}
    .cd-head{display:flex; justify-content:space-between; align-items:center; padding:18px 20px; border-bottom:1px solid var(--line);}
    .cd-head h3{display:flex; align-items:center; gap:8px; font-size:17px;}
    .cd-body{flex:1; overflow-y:auto; padding:14px 20px;}
    .cd-item{display:flex; gap:12px; padding:14px 0; border-bottom:1px solid var(--line); align-items:center;}
    .cd-item img{width:60px; height:60px; border-radius:10px; object-fit:cover; flex-shrink:0;}
    .cd-item-info{flex:1; min-width:0;}
    .cd-item-info h5{font-size:13px; font-weight:600; margin-bottom:4px; font-family:'Manrope'; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
    .cd-remove{color:#a39a8b; flex-shrink:0;}
    .cd-foot{padding:16px 20px 22px; border-top:1px solid var(--line);}
    .cd-row{display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:8px; color:#5c6f68;}
    .cd-row.total{font-weight:800; font-size:15px; color:var(--ink); margin-top:10px; padding-top:10px; border-top:1px dashed var(--line);}

    .mobile-menu{position:fixed; top:0; left:-320px; width:300px; height:100%; background:var(--paper); z-index:201; transition:left .3s cubic-bezier(.2,.9,.3,1); box-shadow:10px 0 30px rgba(0,0,0,0.15); display:flex; flex-direction:column;}
    .mobile-menu.open{left:0;}
    .mm-head{display:flex; justify-content:space-between; align-items:center; padding:18px 20px; border-bottom:1px solid var(--line);}
    .mm-list{flex:1; overflow-y:auto; padding:10px 20px;}
    .mm-list a{display:flex; align-items:center; gap:10px; padding:12px 0; font-size:14px; font-weight:600; border-bottom:1px solid var(--line);}
    .mm-foot{padding:16px 20px; border-top:1px solid var(--line);}
    .mm-foot a{display:block; padding:8px 0; font-size:13px; color:#5c6f68;}

    .mobilenav{display:none; position:fixed; bottom:0; left:0; right:0; background:var(--paper); border-top:1px solid var(--line); z-index:150; justify-content:space-around; padding:8px 0 calc(8px + env(safe-area-inset-bottom));}
    .mobilenav button{display:flex; flex-direction:column; align-items:center; gap:3px; font-size:10px; color:#8a8378; font-weight:600; position:relative;}
    .mobilenav button.on{color:var(--terracotta);}
    .mnbadge{position:absolute; top:-4px; right:2px; background:var(--terracotta); color:white; font-size:9px; font-weight:800; width:14px; height:14px; border-radius:50%; display:flex; align-items:center; justify-content:center;}

    .checkout-page{padding:24px 24px 60px;}
    .co-title{font-size:28px; margin-bottom:22px;}
    .co-grid{display:grid; grid-template-columns:1.6fr 1fr; gap:30px; align-items:start;}
    .co-block{background:var(--paper); border:1px solid var(--line); border-radius:16px; padding:22px; margin-bottom:18px;}
    .co-block h4{display:flex; align-items:center; gap:8px; font-size:15px; margin-bottom:16px;}
    .co-block input, .co-block select{width:100%; border:1.5px solid var(--line); border-radius:9px; padding:11px 14px; font-size:13.5px; margin-bottom:12px; background:var(--cream);}
    .form-row.two{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
    .pay-options{display:grid; grid-template-columns:1fr 1fr; gap:10px;}
    .pay-option{display:flex; align-items:center; gap:10px; border:1.5px solid var(--line); border-radius:10px; padding:12px 14px; cursor:pointer;}
    .pay-option.on{border-color:var(--terracotta); background:#fdf6f4;}
    .cod-label{font-size:13px; font-weight:700;}
    .co-summary{background:var(--paper); border:1px solid var(--line); border-radius:16px; padding:22px; position:sticky; top:130px;}
    .co-summary h4{font-size:15px; margin-bottom:16px;}
    .co-line{display:flex; justify-content:space-between; font-size:13px; color:#5c6f68; margin-bottom:10px;}
    .co-line.total{font-weight:800; font-size:15px; color:var(--ink); padding-top:10px; border-top:1px dashed var(--line);}
    .co-note{font-size:11px; color:#a39a8b; text-align:center; margin-top:12px;}
    .auth-error{color:var(--terracotta); font-size:13px; margin:8px 0 0;}

    footer{background:var(--forest-deep); color:rgba(251,244,231,0.7); padding:44px 0 0; margin-top:40px;}
    .foot-grid{display:grid; grid-template-columns:1.6fr repeat(4,1fr); gap:26px; padding-bottom:32px; border-bottom:1px solid rgba(255,255,255,0.1);}
    footer .desc{font-size:12.5px; max-width:250px; line-height:1.6; margin-top:12px;}
    .foot-col h5{color:white; font-size:13px; margin-bottom:14px;}
    .foot-col a{display:block; font-size:12.5px; margin-bottom:9px;}
    .foot-col a:hover{color:var(--marigold);}
    .foot-bottom{display:flex; justify-content:space-between; align-items:center; padding:18px 0 90px; font-size:12px; flex-wrap:wrap; gap:10px;}
    .foot-pay{display:flex; gap:8px;}

    @media(max-width:1100px){
      .catgrid{grid-template-columns:repeat(4,1fr);}
      .pgrid{grid-template-columns:repeat(3,1fr);}
      .shop-grid{grid-template-columns:1fr;}
      .filters{position:fixed; top:0; left:-300px; width:280px; height:100%; z-index:250; border-radius:0; overflow-y:auto; transition:left .3s;}
      .filters.open{left:0; box-shadow:10px 0 30px rgba(0,0,0,0.2);}
      .close-filters{display:block;}
      .filter-toggle{display:flex;}
      .co-grid{grid-template-columns:1fr;}
    }
    @media(max-width:860px){
      .hero-grid{grid-template-columns:1fr;}
      .header-actions .h-action span{display:none;}
      .header-actions{gap:16px;}
      .pd-grid{grid-template-columns:1fr; gap:24px;}
    }
    @media(max-width:680px){
      .utility .right a:not(:last-child){display:none;}
      .hamburger{display:block;}
      .logo .name{font-size:20px;}
      .header-main{gap:12px; padding:10px 0;}
      .header-actions{display:none;}
      .catnav{display:none;}
      .wrap{padding:0 16px;}
      .hero{padding:18px 0 24px;}
      .hero-banner{padding:0 22px; min-height:300px;}
      .hero-copy h1{font-size:28px;}
      .catgrid{grid-template-columns:repeat(3,1fr); gap:10px;}
      .catcard{padding:14px 6px;}
      .pgrid{grid-template-columns:repeat(2,1fr); gap:12px;}
      .flash{padding:20px 16px; border-radius:16px;}
      .flash-top{flex-direction:column; align-items:flex-start;}
      .section{padding:32px 0;}
      .sec-head h2{font-size:21px;}
      .midbanner{padding:24px 22px; text-align:left;}
      .midbanner h3{font-size:20px;}
      .mobilenav{display:flex;}
      footer{padding-bottom:0;}
      .foot-grid{grid-template-columns:1fr 1fr; padding-bottom:24px;}
      .foot-bottom{justify-content:center; text-align:center; padding-bottom:100px;}
      .pd-page, .shop-page, .checkout-page{padding:16px 16px 40px;}
      .co-summary{position:static;}
    }
    @media(max-width:420px){
      .pgrid{grid-template-columns:repeat(2,1fr); gap:10px;}
      .catgrid{grid-template-columns:repeat(3,1fr);}
      .cart-drawer{width:100%; max-width:100%;}
    }
    `}</style>
  );
}
