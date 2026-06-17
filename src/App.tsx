import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Storefront } from "./pages/Storefront";
import { ProductDetail } from "./pages/ProductDetail";
import { Checkout } from "./pages/Checkout";
import { Success } from "./pages/Success";
import { Login } from "./pages/Login";
import { Admin } from "./pages/Admin";
import { AdminProducts } from "./pages/AdminProducts";
import { AdminStock } from "./pages/AdminStock";
import { AdminOrders } from "./pages/AdminOrders";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/success" element={<Success />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/admin/products" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
        <Route path="/admin/products/:id/stock" element={<ProtectedRoute><AdminStock /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute><AdminOrders /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
