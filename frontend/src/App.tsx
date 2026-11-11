import { Route, Routes } from "react-router-dom";
import { StoreLayout } from "@/components/layout/StoreLayout";
import Home from "@/pages/Home";
import Listing from "@/pages/Listing";
import ProductDetail from "@/pages/ProductDetail";
import CartPage from "@/pages/Cart";
import Checkout, { OrderConfirmation } from "@/pages/Checkout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AccountOverview, Addresses, Invoice, OrderDetail, Orders, Profile, SecurityPage, Wishlist } from "@/pages/account/Account";
import { SellerOrders, SellerOverview, SellerProducts, SellerReviews } from "@/pages/seller/Seller";
import { AdminConfig, AdminLabs, AdminOrders, AdminOverview, AdminProducts, AdminReviews, AdminUsers } from "@/pages/admin/Admin";
import { LabPortal, LabWorkspace } from "@/pages/labs/Labs";
import { ForgotPassword, Login, Register, ResetPassword } from "@/pages/Auth";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<StoreLayout />}>
        <Route index element={<Home />} />
        <Route path="/category/:slug" element={<Listing mode="category" />} />
        <Route path="/search" element={<Listing mode="search" />} />
        <Route path="/deals" element={<Listing mode="deals" />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
      </Route>
      <Route path="/account" element={<DashboardLayout area="account" />}>
        <Route index element={<AccountOverview />} /><Route path="orders" element={<Orders />} /><Route path="orders/:id" element={<OrderDetail />} />
        <Route path="invoices/:id" element={<Invoice />} /><Route path="wishlist" element={<Wishlist />} /><Route path="addresses" element={<Addresses />} />
        <Route path="profile" element={<Profile />} /><Route path="security" element={<SecurityPage />} />
      </Route>
      <Route path="/seller" element={<DashboardLayout area="seller" roles={["seller", "admin"]} />}>
        <Route index element={<SellerOverview />} /><Route path="products" element={<SellerProducts />} /><Route path="orders" element={<SellerOrders />} /><Route path="reviews" element={<SellerReviews />} />
      </Route>
      <Route path="/admin" element={<DashboardLayout area="admin" roles={["admin"]} />}>
        <Route index element={<AdminOverview />} /><Route path="users" element={<AdminUsers />} /><Route path="orders" element={<AdminOrders />} /><Route path="products" element={<AdminProducts />} />
        <Route path="reviews" element={<AdminReviews />} /><Route path="labs" element={<AdminLabs />} /><Route path="config" element={<AdminConfig />} />
      </Route>
      <Route path="/labs" element={<DashboardLayout area="labs" />}>
        <Route index element={<LabPortal />} /><Route path=":id" element={<LabWorkspace />} />
      </Route>
    </Routes>
  );
}
