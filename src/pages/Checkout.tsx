import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import generatePayload from "promptpay-qr";
import { QRCodeSVG } from "qrcode.react";
import type { CreatedOrder, VerifyResult } from "../types";

export function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const order = (location.state as { order: CreatedOrder } | null)?.order;

  const [email, setEmail] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  if (!order) {
    navigate("/", { replace: true });
    return null;
  }

  const payload = generatePayload(import.meta.env.VITE_PROMPTPAY_ID as string, {
    amount: order.amount,
  });

  function handleFile(file: File) {
    if (file.type.startsWith("image/")) {
      setSlip(file);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">ชำระเงิน</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Amount */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">ยอดชำระ</p>
          <p className="text-4xl font-bold text-blue-600">
            ฿{order.amount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">Order: {order.orderId}</p>
        </div>

        {/* QR */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-gray-700">สแกน QR พร้อมเพย์</p>
          <div className="p-3 bg-white border border-gray-100 rounded-lg">
            <QRCodeSVG value={payload} size={220} />
          </div>
          <p className="text-xs text-gray-400">โอนจากแอปธนาคารใดก็ได้</p>
        </div>

        {/* Email */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="email">
            อีเมล <span className="text-gray-400 font-normal">(สำหรับรับสลิปยืนยัน EP.2)</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
          />
        </div>

        {/* Slip upload */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-700">อัปโหลดสลิป</p>
          <div
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer ${
              dragOver
                ? "border-blue-400 bg-blue-50"
                : slip
                ? "border-green-400 bg-green-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => document.getElementById("slip-input")?.click()}
          >
            {slip ? (
              <>
                <span className="text-3xl">✓</span>
                <p className="text-sm font-medium text-green-700">{slip.name}</p>
                <p className="text-xs text-gray-400">
                  {(slip.size / 1024).toFixed(0)} KB — คลิกเพื่อเปลี่ยน
                </p>
              </>
            ) : (
              <>
                <span className="text-3xl text-gray-300">↑</span>
                <p className="text-sm text-gray-500">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</p>
                <p className="text-xs text-gray-400">JPG / PNG / WEBP</p>
              </>
            )}
          </div>
          <input
            id="slip-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {verifyError && (
            <p className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {verifyError}
            </p>
          )}

          <button
            disabled={!slip || submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors"
            onClick={async () => {
              if (!slip || !order) return;
              setSubmitting(true);
              setVerifyError(null);
              try {
                const fd = new FormData();
                fd.append("orderId", order.orderId);
                fd.append("slip", slip);
                if (email) fd.append("email", email);

                const res = await fetch("/api/verify-slip", { method: "POST", body: fd });
                const result = (await res.json()) as VerifyResult;

                if (result.ok) {
                  navigate("/success", {
                    state: {
                      credential: result.credential,
                      emailDelivered: result.emailDelivered,
                      orderId: order.orderId,
                      email: email || null,
                    },
                  });
                } else {
                  setVerifyError(result.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
                  setSubmitting(false);
                }
              } catch {
                setVerifyError("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่");
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "กำลังตรวจสอบ..." : "ยืนยันการชำระเงิน"}
          </button>
        </div>
      </main>
    </div>
  );
}
