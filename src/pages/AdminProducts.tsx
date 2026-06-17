import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface AdminProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  active: number;
  stockCount: number;
}

const empty = { name: "", description: "", imageUrl: "", price: "" };

export function AdminProducts() {
  const [list, setList] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(empty);

  async function load() {
    const res = await fetch("/api/admin/products");
    setList(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        price: Number(form.price),
      }),
    });
    setForm(empty);
    setSaving(false);
    load();
  }

  async function save(id: string) {
    setSaving(true);
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description || null,
        imageUrl: editForm.imageUrl || null,
        price: Number(editForm.price),
      }),
    });
    setEditId(null);
    setSaving(false);
    load();
  }

  async function toggleActive(p: AdminProduct) {
    await fetch(`/api/admin/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: p.active === 1 ? 0 : 1 }),
    });
    load();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/admin" className="text-blue-600 text-sm hover:underline">← Dashboard</Link>
          <h1 className="text-xl font-bold text-gray-900">จัดการสินค้า</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Create form */}
        <form onSubmit={create} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">เพิ่มสินค้าใหม่</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input required placeholder="ชื่อสินค้า *" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 col-span-2" />
            <input placeholder="คำอธิบาย" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 col-span-2" />
            <input placeholder="URL รูปภาพ" value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
            <input required type="number" min="0" step="0.01" placeholder="ราคา (บาท) *" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <button type="submit" disabled={saving}
            className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
            {saving ? "กำลังบันทึก..." : "เพิ่มสินค้า"}
          </button>
        </form>

        {/* Product list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อ</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">ราคา</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">สต็อก</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">สถานะ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">กำลังโหลด...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">ยังไม่มีสินค้า</td></tr>
              ) : list.map((p) => (
                editId === p.id ? (
                  <tr key={p.id} className="border-t border-gray-100 bg-blue-50">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="ชื่อสินค้า" className="border border-gray-300 rounded px-3 py-1.5 text-sm col-span-2" />
                        <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="คำอธิบาย" className="border border-gray-300 rounded px-3 py-1.5 text-sm col-span-2" />
                        <input value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                          placeholder="URL รูปภาพ" className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
                        <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                          placeholder="ราคา" className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => save(p.id)} disabled={saving}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-1.5 rounded transition-colors">บันทึก</button>
                        <button onClick={() => setEditId(null)}
                          className="text-gray-500 hover:text-gray-700 text-xs px-3 py-1.5">ยกเลิก</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-right text-blue-600 font-semibold">฿{p.price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.stockCount > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {p.stockCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(p)}
                        className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${p.active === 1 ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                        {p.active === 1 ? "เปิดขาย" : "ปิดขาย"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => { setEditId(p.id); setEditForm({ name: p.name, description: p.description ?? "", imageUrl: p.imageUrl ?? "", price: String(p.price) }); }}
                          className="text-xs text-blue-600 hover:underline">แก้ไข</button>
                        <Link to={`/admin/products/${p.id}/stock`}
                          className="text-xs text-gray-600 hover:underline">สต็อก</Link>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
