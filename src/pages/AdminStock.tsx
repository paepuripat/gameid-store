import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface StockItem {
  id: string;
  username: string;
  status: string;
}

interface StockData {
  product: { id: string; name: string; price: number };
  available: number;
  sold: number;
  items: StockItem[];
}

export function AdminStock() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StockData | null>(null);
  const [lines, setLines] = useState("");
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/products/${id}/stock`);
    if (res.ok) setData(await res.json());
  }

  useEffect(() => { load(); }, [id]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setResult(null);
    const res = await fetch(`/api/admin/products/${id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
    const json = await res.json() as { added?: number; error?: string };
    if (res.ok) {
      setResult(`เพิ่ม ${json.added} รายการสำเร็จ`);
      setLines("");
      load();
    } else {
      setResult(`เกิดข้อผิดพลาด: ${json.error}`);
    }
    setAdding(false);
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500">กำลังโหลด...</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/admin/products" className="text-blue-600 text-sm hover:underline">← สินค้า</Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{data.product.name}</h1>
            <p className="text-xs text-gray-400">จัดการคลังไอดี</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Stock summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="text-3xl font-bold text-green-600">{data.available}</p>
            <p className="text-sm text-gray-500 mt-1">พร้อมขาย</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="text-3xl font-bold text-gray-400">{data.sold}</p>
            <p className="text-sm text-gray-500 mt-1">ขายแล้ว</p>
          </div>
        </div>

        {/* Add stock form */}
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">เพิ่มไอดีใหม่</h2>
            <p className="text-xs text-gray-400 mt-0.5">หนึ่งบรรทัดต่อหนึ่งบัญชี รูปแบบ: <code className="bg-gray-100 px-1 rounded">username,password,notes</code></p>
          </div>
          <textarea
            required
            value={lines}
            onChange={(e) => setLines(e.target.value)}
            rows={6}
            placeholder={"user1@gmail.com,Pass#001,Server SEA\nuser2@gmail.com,Pass#002,Server SEA"}
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-300 resize-y"
          />
          {result && (
            <p className={`text-sm px-4 py-2.5 rounded-lg border ${result.startsWith("เพิ่ม") ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600"}`}>
              {result}
            </p>
          )}
          <button type="submit" disabled={adding || !lines.trim()}
            className="self-start bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
            {adding ? "กำลังเพิ่ม..." : "เพิ่มไอดี"}
          </button>
        </form>

        {/* Inventory list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-medium text-gray-700">รายการทั้งหมด ({data.items.length})</p>
          </div>
          {data.items.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">ยังไม่มีไอดีในคลัง</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm font-mono text-gray-700">{item.username}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.status === "available" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {item.status === "available" ? "พร้อมขาย" : "ขายแล้ว"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
