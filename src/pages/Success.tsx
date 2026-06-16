import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import type { RevealedCredential } from "../types";

type ResendState = "idle" | "loading" | "success" | "error";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono text-gray-900 break-all">
          {value}
        </code>
        <button
          className="shrink-0 text-xs px-3 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors text-gray-600"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "✓" : "คัดลอก"}
        </button>
      </div>
    </div>
  );
}

export function Success() {
  const location = useLocation();
  const state = location.state as {
    credential: RevealedCredential;
    emailDelivered?: boolean;
    orderId?: string;
    email?: string | null;
  } | null;
  const credential = state?.credential;
  const emailDelivered = state?.emailDelivered ?? false;
  const orderId = state?.orderId;

  const [resendEmail, setResendEmail] = useState(state?.email ?? "");
  const [resendState, setResendState] = useState<ResendState>("idle");
  const [resendError, setResendError] = useState<string | null>(null);

  if (!credential) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen gap-4 text-gray-500">
        <p>ไม่พบข้อมูล</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm">
          ← กลับหน้าร้าน
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">ชำระเงินสำเร็จ</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-3xl mb-2">✓</p>
          <p className="font-semibold text-green-800">ยืนยันการชำระเงินแล้ว</p>
          <p className="text-sm text-green-700 mt-1">บันทึกข้อมูลบัญชีด้านล่างไว้ให้ดี</p>
        </div>

        {emailDelivered && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-xl">📧</span>
            <p className="text-sm text-blue-800">เราส่งไอดีไปที่อีเมลของคุณแล้ว</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-5">
          <h2 className="font-semibold text-gray-900">ข้อมูลบัญชีเกม</h2>

          <CopyField label="Username / Email" value={credential.username} />
          <CopyField label="Password" value={credential.password} />

          {credential.notes && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">หมายเหตุ</p>
              <p className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700">
                {credential.notes}
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-gray-400">
          โปรดบันทึกข้อมูลนี้ทันที — หน้านี้จะไม่สามารถเข้าถึงได้อีกเมื่อปิด
        </p>

        {orderId && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-3">
            <p className="text-sm font-medium text-gray-700">ส่งไอดีไปที่อีเมลซ้ำ</p>
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="example@email.com"
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
            />
            {resendState === "success" && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                ส่งอีเมลสำเร็จแล้ว
              </p>
            )}
            {resendState === "error" && resendError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                {resendError}
              </p>
            )}
            <button
              disabled={!resendEmail || resendState === "loading"}
              className="w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              onClick={async () => {
                setResendState("loading");
                setResendError(null);
                try {
                  const res = await fetch(`/api/orders/${orderId}/resend`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: resendEmail }),
                  });
                  const data = (await res.json()) as { ok: boolean; message?: string };
                  if (data.ok) {
                    setResendState("success");
                  } else {
                    setResendError(data.message ?? "เกิดข้อผิดพลาด");
                    setResendState("error");
                  }
                } catch {
                  setResendError("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่");
                  setResendState("error");
                }
              }}
            >
              {resendState === "loading" ? "กำลังส่ง..." : "ส่งอีเมลซ้ำ"}
            </button>
          </div>
        )}

        <Link
          to="/"
          className="text-center text-sm text-blue-600 hover:underline"
        >
          ← กลับหน้าร้าน
        </Link>
      </main>
    </div>
  );
}
