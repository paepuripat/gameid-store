import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Storefront } from "./pages/Storefront";
import { ProductDetail } from "./pages/ProductDetail";
import { Checkout } from "./pages/Checkout";

function SuccessStub() {
  return (
    <div className="flex justify-center items-center min-h-screen text-gray-400">
      Success — Checkpoint 4
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/success" element={<SuccessStub />} />
      </Routes>
    </BrowserRouter>
  );
}
