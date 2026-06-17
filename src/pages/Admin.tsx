import { useNavigate, Link } from "react-router-dom";
import { authClient } from "../lib/auth-client";

export function Admin() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-xs text-gray-400">{session?.user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/admin/products"
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md hover:border-blue-200 transition-all"
        >
          <p className="text-2xl mb-2">📦</p>
          <h2 className="font-semibold text-gray-900">สินค้า</h2>
          <p className="text-sm text-gray-500 mt-1">จัดการสินค้าและราคา</p>
        </Link>

        <Link
          to="/admin/products"
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md hover:border-blue-200 transition-all"
        >
          <p className="text-2xl mb-2">🎮</p>
          <h2 className="font-semibold text-gray-900">คลังไอดี</h2>
          <p className="text-sm text-gray-500 mt-1">เพิ่ม/ดูสต็อกบัญชีเกม</p>
        </Link>

        <Link
          to="/admin/orders"
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md hover:border-blue-200 transition-all"
        >
          <p className="text-2xl mb-2">📋</p>
          <h2 className="font-semibold text-gray-900">ออเดอร์</h2>
          <p className="text-sm text-gray-500 mt-1">ดูรายการซื้อขาย</p>
        </Link>
      </main>
    </div>
  );
}
