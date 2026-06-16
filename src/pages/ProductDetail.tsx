import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { Product, CreatedOrder } from "../types";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/products/${id}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Product>;
      })
      .then((data) => {
        if (data) setProduct(data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500">
        กำลังโหลด...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen gap-4 text-gray-500">
        <p>ไม่พบสินค้านี้</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm">
          ← กลับหน้าร้าน
        </Link>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        เกิดข้อผิดพลาด: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <Link to="/" className="text-blue-600 text-sm hover:underline">
            ← กลับหน้าร้าน
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className="w-full h-64 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
              <span className="text-5xl text-indigo-300">Game</span>
            </div>
          )}

          <div className="p-6 flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

            {product.description && (
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            )}

            {product.stockCount === 1 && (
              <p className="text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                เหลือชิ้นสุดท้าย — รีบซื้อก่อนหมด!
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex flex-col gap-0.5">
                <span className="text-3xl font-bold text-blue-600">
                  ฿{product.price.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400">มีสินค้า {product.stockCount} ชิ้น</span>
              </div>
              <button
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
                disabled={buying}
                onClick={async () => {
                  if (!product) return;
                  setBuying(true);
                  try {
                    const res = await fetch("/api/orders", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ productId: product.id }),
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const order = (await res.json()) as CreatedOrder;
                    navigate("/checkout", { state: { order } });
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
                    setBuying(false);
                  }
                }}
              >
                {buying ? "กำลังสร้างออเดอร์..." : "ซื้อ"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
