import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "../types";

export function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Product[]>;
      })
      .then(setProducts)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500">
        กำลังโหลด...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        เกิดข้อผิดพลาด: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Game ID Store</h1>
          <p className="text-sm text-gray-500">บัญชีเกมราคาถูก จัดส่งทันที</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {products.length === 0 ? (
          <p className="text-center text-gray-400 py-16">ยังไม่มีสินค้า</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-blue-200 transition-all"
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                    <span className="text-4xl text-indigo-300">Game</span>
                  </div>
                )}

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h2 className="font-semibold text-gray-900">{product.name}</h2>
                  {product.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 flex-1">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xl font-bold text-blue-600">
                      ฿{product.price.toLocaleString()}
                    </p>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      product.stockCount === 1
                        ? "bg-orange-100 text-orange-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {product.stockCount === 1 ? "เหลือชิ้นสุดท้าย!" : `เหลือ ${product.stockCount} ชิ้น`}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
