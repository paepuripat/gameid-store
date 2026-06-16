import type { RevealedCredential } from "../src/types";

interface EmailEnv {
  RESEND_API_KEY: string;
  RESEND_FROM: string;
}

interface SendCredentialEmailParams {
  to: string;
  productName: string;
  credential: RevealedCredential;
}

function buildHtml(productName: string, credential: RevealedCredential): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ไอดีเกม: ${productName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 32px 24px; text-align: center; }
    .header h1 { color: #facc15; margin: 0; font-size: 22px; }
    .header p { color: #94a3b8; margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .value { font-size: 18px; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; word-break: break-all; }
    .notice { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 14px 16px; margin-top: 8px; }
    .notice p { margin: 0; color: #92400e; font-size: 13px; line-height: 1.5; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; }
    .footer p { margin: 0; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎮 ร้านไอดีเกม</h1>
      <p>ขอบคุณที่ซื้อสินค้ากับเรา!</p>
    </div>
    <div class="body">
      <p style="color:#475569;margin-top:0;">สินค้า: <strong>${productName}</strong></p>

      <div class="label">ชื่อผู้ใช้ (Username)</div>
      <div class="value">${credential.username}</div>

      <div class="label">รหัสผ่าน (Password)</div>
      <div class="value">${credential.password}</div>

      ${
        credential.notes
          ? `<div class="label">หมายเหตุ</div>
      <div class="value" style="font-size:14px;">${credential.notes}</div>`
          : ""
      }

      <div class="notice">
        <p>🔐 <strong>เก็บข้อมูลนี้ไว้เป็นความลับ</strong> — อย่าแชร์ให้ผู้อื่น และเปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบ</p>
      </div>
    </div>
    <div class="footer">
      <p>หากมีปัญหากรุณาติดต่อเรา • ร้านไอดีเกม</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendCredentialEmail(
  env: EmailEnv,
  { to, productName, credential }: SendCredentialEmailParams,
): Promise<void> {
  const html = buildHtml(productName, credential);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to,
      subject: `ไอดีเกม: ${productName}`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}
