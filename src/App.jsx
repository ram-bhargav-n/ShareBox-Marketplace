import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Products from "./components/Products";
import ActivityMarquee from "./components/ActivityMarquee";

import ProductDetails from "./pages/ProductDetails";
import About from "./pages/About";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/adminDashboard";
import EditProduct from "./pages/EditProduct";
import MyProducts from "./pages/MyProducts";
import Requests from "./pages/Requests";
import {
  AccountPage,
  CartPage,
  CheckoutPage,
  MarketplaceHome,
  OrdersPage,
  ShopProduct,
  WishlistPage,
} from "./pages/Marketplace";
import MarketplaceAdmin from "./pages/MarketplaceAdmin";

import OfferItem from "./components/OfferItem";

function CommunityHome() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sharingType, setSharingType] = useState("");
  const [category, setCategory] = useState("");

  return (
    <>
      <Navbar searchValue={searchQuery} onSearchChange={setSearchQuery} />
      <ActivityMarquee />
      <Products
        searchQuery={searchQuery}
        sharingType={sharingType}
        onSharingTypeChange={setSharingType}
        category={category}
        onCategoryChange={setCategory}
      />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Homepage */}
        <Route path="/" element={<CommunityHome />} />
        <Route path="/community" element={<CommunityHome />} />
        <Route path="/marketplace" element={<MarketplaceHome />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Marketplace */}
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/shop/:id" element={<ShopProduct />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/offer-item" element={<OfferItem />} />
        <Route path="/edit-product/:id" element={<EditProduct />} />

        {/* User pages */}
        <Route path="/my-products" element={<MyProducts />} />
        <Route path="/requests" element={<Requests />} />

        {/* Information */}
        <Route path="/about" element={<About />} />

        {/* Administration */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/marketplace" element={<MarketplaceAdmin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;