import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface AdminOrder {
  id: string;
  productName: string | null;
  amount: number;
  email: string | null;
  status: string;
  slipTransRef: string | null;
  createdAt: number;
  deliveredAt: number | null;
  deliveryError: string | null;
  claimedUsername: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "รอชำระ",
  paid: "ชำระแล้ว",
  delivered: "ส่งแล้ว",
};

function fmt(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}

export function AdminOrders() {
  const [list, setList] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => r.json() as Promise<AdminOrder[]>)
      .then((data) => { setList(data); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/admin" className="text-blue-600 text-sm hover:underline">← Dashboard</Link>
          <h1 className="text-xl font-bold text-gray-900">ออเดอร์ทั้งหมด</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">สินค้า</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">ยอด</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">อีเมล</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">บัญชีที่ขาย</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Slip Ref</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">วันที่สั่ง</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ส่งอีเมลเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">กำลังโหลด...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">ยังไม่มีออเดอร์</td></tr>
              ) : list.map((o) => (
                <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{o.productName ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600">฿{o.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{o.email ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{o.claimedUsername ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-[120px] truncate" title={o.slipTransRef ?? ""}>
                    {o.slipTransRef ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(o.createdAt)}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {o.deliveredAt ? (
                      <span className="text-green-600">{fmt(o.deliveredAt)}</span>
                    ) : o.deliveryError ? (
                      <span className="text-red-500" title={o.deliveryError}>ส่งไม่สำเร็จ</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
