# ส่งไอดีเกมเข้าอีเมลอัตโนมัติด้วย Resend + กันออเดอร์หลุด (EP.2)

> ต่อจาก EP.1 ที่สลิปผ่านแล้วโชว์ไอดีบนจอ — EP นี้เราจะให้ระบบ **ส่งไอดีเข้าอีเมลลูกค้าอัตโนมัติ** หลังจ่ายเงิน และทำ lifecycle ของออเดอร์ให้แน่น (pending → paid → delivered) เผื่ออีเมลส่งไม่ออกก็ต้องส่งซ้ำได้ ไม่ทำออเดอร์หลุด — แล้ว deploy ขึ้น Cloudflare เหมือนเดิม

<!--
📸 SCREENSHOT GUIDE (สำหรับคนเขียน blog — ลบทิ้งก่อน publish)
- บล็อก `[SCREENSHOT-NN-name]` คือจุดใส่ภาพ ถ่าย 16:9 อย่างน้อย 1920x1080
- ก่อน publish แทนด้วย `![alt](./screenshots/NN-name.png)`
-->

📸 **`[SCREENSHOT-01-hero]`**
- **What:** หน้าจอ inbox ของลูกค้าที่เพิ่งได้อีเมลไอดีเกม คู่กับหน้าร้านบน URL จริง
- **Filename:** `01-hero-email.png`

---

## สิ่งที่เราจะสร้าง (ต่อยอดจาก EP.1)

- หลังสลิปผ่าน + เคลมไอดีแล้ว ระบบ **ยิงอีเมลไอดีเกมหาลูกค้าอัตโนมัติ** ด้วย Resend
- เพิ่มสถานะออเดอร์ `delivered` (จาก `pending → paid → delivered`) เก็บเวลา `delivered_at`
- ปุ่ม **"ส่งอีเมลซ้ำ"** เผื่ออีเมลไม่ถึง — ส่งไอดี **ตัวเดิม** ซ้ำ ไม่เคลม stock ใหม่

### Demo สุดท้าย
จ่ายเงินบน URL จริง → อัปสลิป → ไม่กี่วินาทีอีเมลไอดีเกมเด้งเข้า inbox

### สิ่งที่ตัดทิ้ง (ยังเหมือน EP.1)
- ❌ ระบบหลังร้าน (admin) + login — ยัง seed สินค้า/stock ผ่าน `seed.sql` (ไปอยู่ EP.3)
- ❌ บัญชีลูกค้า, ตะกร้าหลายชิ้น, เก็บรูปสลิป

> 💡 **ทำไมแยก EP:** การส่งอีเมลมีเรื่อง **verify domain (DNS)** ของมันเอง เลยควรเป็น beat ของตัวเอง ไม่ยัดรวม EP.1

---

## Stack ที่เพิ่มเข้ามา

| Tool | ทำไมเลือก | ทำไมไม่ใช่ตัวอื่น |
|------|-----------|------------------|
| **Resend** | เรียกผ่าน REST API ด้วย `fetch` จาก Worker ตรงๆ ไม่ต้องลง SDK, free tier ~3,000 ฉบับ/เดือน | ไม่ใช้ MailChannels (free path สำหรับ Cloudflare ปิดไปแล้ว) / Cloudflare Email Service ส่งหาคนนอกต้องเสียเงิน plan paid |

ของเดิมจาก EP.1 (Workers, Vite+React, Hono, D1+Drizzle, SlipOK, promptpay-qr) ใช้ต่อทั้งหมด ไม่มี dependency npm ใหม่

> ⚠️ **เรื่อง domain ที่ต้องรู้:** จะส่งอีเมลหา "อีเมลลูกค้าทั่วไป" ได้ ต้อง verify domain กับ Resend (ใส่ DNS: DKIM/SPF/DMARC) ก่อน ถ้ายังไม่ได้ verify โหมดทดสอบของ Resend จะส่งได้แค่อีเมลของเจ้าของบัญชีเอง — เดโมรอบแรกส่งหาอีเมลตัวเองไปก่อนได้

---

## เตรียมตัวก่อนเริ่ม (Prebuild)

- โค้ด EP.1 ที่ deploy ขึ้นแล้ว (ร้าน + ตรวจสลิป + เคลมไอดี ทำงานครบ)
- บัญชี Resend → สร้าง **API key** (`RESEND_API_KEY`)
- ตั้งค่า sender `RESEND_FROM` เช่น `ร้านไอดีเกม <noreply@yourdomain.com>` (ใช้ domain ที่ verify แล้ว)

```bash
# ไม่มี lib ใหม่ — แค่เพิ่ม secret/config ตอน dev
echo 'RESEND_API_KEY=re_xxx' >> .dev.vars
# RESEND_FROM ตั้งใน .dev.vars หรือ env ตอน deploy
```

> 🎬 เริ่มถ่ายตรงที่ EP.1 ทำงานครบแล้ว เราจะต่อยอดเฉพาะส่วน "ส่งของ"

---

## โครงเรื่อง: 4 Checkpoint

1. ✅ **Email helper + template** — ฟังก์ชันยิง Resend + เทมเพลตอีเมลภาษาไทย
2. ✅ **ผูกอีเมลเข้ากับ flow จ่ายเงิน** — สลิปผ่าน → เคลมไอดี → ส่งอีเมล → `delivered`
3. ✅ **ส่งซ้ำได้** — endpoint + ปุ่ม "ส่งอีเมลซ้ำ" (ส่งไอดีเดิม ไม่เคลมใหม่)
4. ✅ **Deploy** — แอปขึ้น URL จริง + อีเมลเด้งเข้า inbox (🎬 the money shot)

---

## Checkpoint 1: Email helper + template

### เป้าหมาย
มีฟังก์ชัน `sendCredentialEmail` ใน Worker ที่ POST ไป Resend พร้อมเทมเพลตอีเมลภาษาไทย (ชื่อสินค้า, username/password/notes, ข้อความเตือนให้เก็บเป็นความลับ)

### ขั้นตอน

**1.1 prompt ให้ Claude Code**
> ทำ **EP.2 Checkpoint 1**: สร้าง `sendCredentialEmail(env, { to, productName, credential })` ใน Worker ยิงไป `https://api.resend.com/emails` ด้วย header `Authorization: Bearer ${env.RESEND_API_KEY}` body JSON `{ from, to, subject, html }` ทำเทมเพลต html ภาษาไทย ถ้า response ไม่ ok ให้ throw พร้อมข้อความ error

โค้ดหัวใจ:
```ts
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
```

### ✅ วิธีทดสอบ
- เรียกฟังก์ชันนี้ครั้งเดียวด้วย `to` เป็นอีเมลตัวเอง → อีเมลเข้า inbox จริง

📸 **`[SCREENSHOT-02-first-email]`** — อีเมลทดสอบที่ได้รับ

### ❌ ถ้าพัง
- 422 จาก Resend → `from` ไม่ตรงกับ domain ที่ verify
- 401 → `RESEND_API_KEY` ผิด/ยังไม่ใส่ใน `.dev.vars`

---

## Checkpoint 2: ผูกอีเมลเข้ากับ flow จ่ายเงิน

### เป้าหมาย
ต่อจากจุดที่เคลมไอดีสำเร็จ (EP.1 Checkpoint 4): ยิงอีเมล ถ้าสำเร็จ → `status = 'delivered'`, set `delivered_at` ถ้าไม่สำเร็จ → คง `status = 'paid'` เก็บ `delivery_error` ไว้ แต่ **ยังโชว์ไอดีบนจอเป็น fallback** เสมอ

### ขั้นตอน

**2.1 เพิ่ม column ใน schema แล้ว migrate**
```bash
pnpm drizzle-kit generate
wrangler d1 migrations apply gameid-store-db --local
```
เพิ่มใน `orders`: `deliveredAt` (integer), `deliveryError` (text) และ `status` รองรับค่า `'delivered'`

**2.2 prompt ให้ Claude Code**
> ทำ **EP.2 Checkpoint 2**: หลังเคลมไอดีใน `/api/verify-slip` เรียก `sendCredentialEmail` ถ้าสำเร็จ set order `delivered` + `deliveredAt` ถ้า fail คง `paid` เก็บ `deliveryError` แล้ว **ยังคืน credential ให้ frontend โชว์บนจอเสมอ** หน้า success โชว์ "ส่งไอดีไปที่อีเมลแล้ว" เมื่อ delivered

### ✅ วิธีทดสอบ
1. จ่ายด้วยสลิปถูกต้อง → อีเมลเข้า + ใน D1 ออเดอร์เป็น `delivered` มี `delivered_at`
2. แกล้งให้ส่ง fail (ตั้ง `RESEND_FROM` ผิด) → ออเดอร์ยัง `paid`, ไอดียังโชว์บนจอ, มี `delivery_error`

📸 **`[SCREENSHOT-03-delivered]`** — หน้า success ขึ้น "ส่งไอดีไปที่อีเมลแล้ว"

> 🎬 **Camera moment:** กดยืนยัน → หน้าจอเขียว → สลับไปหน้า inbox มืออีกข้างเห็นอีเมลเด้ง

### ❌ ถ้าพัง
- ออเดอร์ค้าง `paid` ทั้งที่อีเมลน่าจะส่งได้ → เช็ค log ของ `deliveryError`
- ห้ามให้ทั้งออเดอร์ fail เพราะอีเมล — เงินจ่ายแล้ว สลิปผ่านแล้ว ต้องเก็บ `paid` + ให้ส่งซ้ำได้

---

## Checkpoint 3: ส่งอีเมลซ้ำได้

### เป้าหมาย
`POST /api/orders/:id/resend` หาไอดีที่ **เคลมไปแล้ว** ของออเดอร์นั้น (`inventory WHERE order_id = :id`) แล้วส่งอีเมลซ้ำ — **ห้ามเคลมไอดีใหม่** มีปุ่ม "ส่งอีเมลซ้ำ" บนหน้า success (แก้อีเมลใหม่ได้ด้วย)

### ขั้นตอน

**3.1 prompt ให้ Claude Code**
> ทำ **EP.2 Checkpoint 3**: เพิ่ม `POST /api/orders/:id/resend` โหลดออเดอร์ที่ `paid`/`delivered` หา credential ที่ผูกกับออเดอร์นั้น แล้วยิง `sendCredentialEmail` ซ้ำ update `deliveredAt` รับ `email` ใหม่ใน body ได้ **ย้ำ: ห้าม claim inventory ใหม่** เพิ่มปุ่มบนหน้า success

### ✅ วิธีทดสอบ
1. กด "ส่งอีเมลซ้ำ" → อีเมลเข้าอีกรอบ เป็นไอดี **ตัวเดิม**
2. เช็ค D1: ไม่มี inventory row ใหม่ถูก mark `sold` (stock เท่าเดิม)

📸 **`[SCREENSHOT-04-resend]`** — ปุ่มส่งซ้ำ + อีเมลรอบสอง

### ❌ ถ้าพัง
- ส่งซ้ำแล้ว stock ลดอีก → แปลว่าไป claim ใหม่ ต้องอ่านจาก `inventory WHERE order_id` ไม่ใช่เคลมก้อนใหม่

---

## Checkpoint 4: Deploy — 🏆 The Money Shot

### ขั้นตอน
```bash
# 1) secret/config ของ production
wrangler secret put RESEND_API_KEY
# ตั้ง RESEND_FROM ให้เป็น sender ของ domain ที่ verify แล้ว

# 2) migrate column ใหม่ขึ้น remote (พลาดบ่อย!)
wrangler d1 migrations apply gameid-store-db --remote

# 3) deploy
pnpm run deploy
```

### ✅ วิธีทดสอบ
1. เปิด URL `*.workers.dev`
2. ซื้อจริง → จ่ายจริง → อัปสลิป → อีเมลไอดีเด้งเข้า inbox

📸 **`[SCREENSHOT-05-live-email]`** ⭐
- **What:** inbox ได้อีเมลไอดี ขณะหน้าร้านเป็น URL จริง (เห็น address bar workers.dev)
- **Filename:** `05-live-email.png`

> 🎬 **The money shot:** "จ่ายจริง อัปสลิปจริง แล้วไอดีวิ่งเข้าอีเมลเองอัตโนมัติ — รันบนเน็ตจริง"

---

## สรุป ก้าวต่อไป และค่าใช้จ่าย

ต่อยอด EP.1 ให้ส่งของอัตโนมัติได้ใน 4 checkpoint:
- ✅ ส่งไอดีเข้าอีเมลอัตโนมัติด้วย Resend
- ✅ lifecycle `pending → paid → delivered` + กันออเดอร์หลุดเมื่ออีเมล fail
- ✅ ส่งอีเมลซ้ำได้โดยไม่เคลม stock ใหม่

**ค่าใช้จ่าย / การดูแล:**
- Cloudflare + D1 ยังฟรี, SlipOK เสียตาม quota (เหมือนเดิม)
- Resend free tier ~3,000 ฉบับ/เดือน — ร้านเล็กสบายๆ
- ต้องมี domain ที่ verify แล้ว (DKIM/SPF/DMARC) ถึงจะส่งหาอีเมลลูกค้าทั่วไปได้

**สิ่งที่ได้เรียน:**
- เรียก third-party email API จาก Worker แบบไม่ต้องลง SDK
- ออกแบบ flow ให้ "เงินเข้าแล้วของต้องไม่หาย" — แยกการเคลมของ (ครั้งเดียว) ออกจากการส่ง (ส่งซ้ำได้)

### Episode ถัดไป
- 🎯 **EP.3** — ระบบหลังร้าน (admin) เพิ่มสินค้า/สต็อก/ดูออเดอร์ ด้วย Better Auth (admin-only) ขยับเป็น Tier 3 เต็มตัว

### Resources
- 🔗 Code: github.com/cqsol/gameid-store
- 🔗 Resend send email: https://resend.com/docs/api-reference/emails/send-email
- 🔗 Resend บน Cloudflare Workers: https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/

---

> 💬 ถ้ามีคำถาม comment ใต้วิดีโอ หรือเปิด issue ใน GitHub repo ครับ
