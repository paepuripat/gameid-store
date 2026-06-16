# สร้างร้านขายไอดีเกม + ตรวจสลิปจริงด้วย SlipOK บน Cloudflare (EP.1)

> EP นี้เราจะสร้าง digital product store ขายไอดีเกม ที่ลูกค้าจ่ายผ่าน PromptPay QR แล้ว "อัปโหลดสลิป" เพื่อให้ระบบ **ตรวจสลิปจริง** ด้วย SlipOK ถ้าผ่าน ระบบจะปล่อยไอดีเกม (username / password / notes) ให้ทันทีบนหน้าจอ — แล้ว deploy ขึ้น Cloudflare จริงใน episode เดียว

<!--
📸 SCREENSHOT GUIDE (สำหรับคนเขียน blog ไม่ใช่ผู้อ่าน — ลบทิ้งก่อน publish)
- บล็อก `[SCREENSHOT-NN-name]` แต่ละอันคือจุดที่ต้องใส่ภาพ
- ถ่ายให้ครบทุก placeholder ระหว่างทำ
- ก่อน publish: แทนด้วย `![alt](./screenshots/NN-name.png)`
- ✨ ถ่าย 16:9 อย่างน้อย 1920x1080
-->

📸 **`[SCREENSHOT-01-hero]`**
- **What:** หน้าร้านรันอยู่บน URL จริง `*.workers.dev` ตอนสลิปผ่านแล้วโชว์ไอดีเกม
- **When:** ถ่ายหลัง deploy เสร็จ (ใช้เป็น cover + thumbnail)
- **Filename:** `01-hero-live.png`

---

## สิ่งที่เราจะสร้าง

- หน้าร้านโชว์สินค้า (ไอดีเกม) ดึงจาก D1 database
- หน้า checkout สร้าง **PromptPay QR ตามยอดของออเดอร์** ให้ลูกค้าสแกนจ่าย
- ลูกค้าอัปโหลดสลิป → Worker ส่งต่อให้ **SlipOK** ตรวจว่าสลิปจริงไหม ยอดตรงไหม สลิปซ้ำหรือเปล่า → ถ้าผ่าน ระบบดึงไอดีเกมจาก stock มาโชว์ และตัด stock ทันที

### Demo สุดท้าย
อัปโหลดสลิปโอนเงินจริงบนหน้าร้านที่รันบน URL จริงของ Cloudflare → ขึ้น "✅ ยืนยันการชำระเงินสำเร็จ" → โชว์ username / password / notes ของไอดีเกมบนหน้าจอ

### สิ่งที่เราตัดทิ้งโดยตั้งใจ (สำคัญ — ต้องเข้าใจ scope)
- ❌ **ส่งอีเมล** — EP นี้โชว์ไอดีบนหน้าจอก่อน การส่งอีเมลอัตโนมัติเก็บไว้ EP.2 (มันมีเรื่อง verify domain / DNS ของมันเอง)
- ❌ **ระบบหลังร้าน (admin) + login** — EP นี้ seed สินค้ากับ stock ลง D1 ตรงๆ ส่วน admin panel + auth ไปอยู่ EP.3
- ❌ **ตะกร้าหลายชิ้น / โปรไฟล์ลูกค้า / เก็บรูปสลิป** — ซื้อทีละชิ้น จบในรอบเดียว ไม่เก็บรูปสลิป (ส่งให้ SlipOK แล้วทิ้ง)

> 💡 **ทำไมต้องตัด:** EP นี้โฟกัสที่หัวใจของร้าน — **การตรวจสลิปจริง** กับการ deploy ขึ้นใช้งานจริง ไม่ใช่การมานั่งทำ auth หรือ admin ที่ยังไม่จำเป็นในวันแรก

---

## Stack ที่ใช้ และเหตุผล

| Tool | ทำไมเลือก | ทำไมไม่ใช่ตัวอื่น |
|------|-----------|------------------|
| **Cloudflare Workers** | deploy ง่าย, free tier ใจดี, ทุก episode ใช้ตัวเดียวกัน | ไม่ใช้ Pages เพราะ Cloudflare ดัน Workers (static assets) สำหรับโปรเจกต์ใหม่หมดแล้ว |
| **Vite + React + TS** | dev เร็ว, มาตรฐาน SPA | — |
| **`@cloudflare/vite-plugin`** | รัน Worker ใน Vite dev server ตัวเดียว → front + API origin เดียวกัน ไม่เจอ CORS | ไม่รัน wrangler แยกพอร์ตให้ปวดหัวเรื่อง CORS |
| **Hono** | API framework เล็กๆ บน Worker โตไป full-stack ได้ | ไม่เขียน `fetch` handler ดิบ เพราะ routing จะรก |
| **D1 + Drizzle ORM** | เก็บสินค้า / stock ไอดี / ออเดอร์ แบบ type-safe บน SQLite ของ Cloudflare | ไม่ใช้ Supabase/Postgres — D1 อยู่ใน Cloudflare ตัวเดียวจบ free tier |
| **SlipOK API** | ตรวจสลิปจริงตามมาตรฐานธนาคารไทย เช็คยอด + กันสลิปซ้ำให้ | จะ OCR เองมันพังง่ายและปลอมง่าย — ใช้บริการที่อ่าน QR ในสลิปได้จริง |
| **promptpay-qr + qrcode.react** | สร้าง payload PromptPay มาตรฐาน ธปท. ฝัง "ยอดเงิน" ได้ แล้ว render เป็น QR | — |

**ที่เราข้าม:** ❌ Better Auth, ❌ admin UI, ❌ email — ไปอยู่ EP ถัดไป

> ⚠️ **เรื่องค่าใช้จ่ายที่ต้องรู้ก่อน:** Cloudflare ฟรี แต่ **SlipOK เป็นบริการแบบเสียเงิน** (มี quota / มีให้ทดลอง) เพราะการตรวจสลิปจริงต้องพึ่งบริการจริง — นี่คือต้นทุนเดียวที่เลี่ยงไม่ได้ของร้านแบบนี้

---

## เตรียมตัวก่อนเริ่ม (และ Prebuild)

ก่อนเริ่ม ให้แน่ใจว่ามี:
- Node.js 20+ (`node -v`)
- pnpm
- Cloudflare account (free ก็พอ) + `wrangler login` แล้ว
- บัญชี SlipOK — สมัครและผูกบัญชีธนาคารร้านใน LINE LIFF ของ SlipOK เพื่อเอา **API key** + **Branch ID** (เอกสาร: https://slipok.com/api-documentation/)
- เบอร์/เลขบัญชี PromptPay ของร้าน (ไว้สร้าง QR)

**Prebuild — สิ่งที่ทำไว้ก่อนหน้าแล้ว (นอกกล้อง):**

```bash
# 1) scaffold React + Vite + @cloudflare/vite-plugin + wrangler
pnpm create cloudflare@latest gameid-store -- --framework=react
cd gameid-store

# 2) lib ที่ใช้
pnpm add hono drizzle-orm promptpay-qr qrcode.react
pnpm add -D drizzle-kit
# (ตั้ง Tailwind ตามปกติของ Vite + React ไว้ด้วย เพื่อความเร็วตอนทำ UI)

# 3) สร้าง D1 database แล้วเอา binding ไปใส่ wrangler.jsonc (binding name = DB)
wrangler d1 create gameid-store-db

# 4) เขียน schema (products / inventory / orders), generate + apply migration ที่ local
pnpm drizzle-kit generate
wrangler d1 migrations apply gameid-store-db --local

# 5) seed สินค้าตัวอย่าง + ไอดีเกมใน stock ลง D1 (local) ด้วยไฟล์ seed.sql
wrangler d1 execute gameid-store-db --local --file=./seed.sql

# 6) deploy ทิ้งครั้งแรกเพื่อเช็คว่า toolchain ใช้ได้
pnpm run deploy
```

> 🎬 เราเริ่มถ่ายตรงจุดที่ scaffold + D1 + seed เสร็จแล้ว เพราะการ `pnpm create` กับตั้ง Tailwind มันไม่มีอะไรให้ดู ใครอยากตามให้รันคำสั่งข้างบนก่อน แล้วมาเริ่มที่ Checkpoint 1 พร้อมกัน (โค้ด schema + seed.sql อยู่ใน repo)

---

## โครงเรื่อง: 5 Checkpoint

ทุก checkpoint จบด้วย "ของที่เห็นได้" และทดสอบได้ ถ้า checkpoint ไหนพัง ห้ามข้าม

1. ✅ **หน้าร้าน + รายละเอียดสินค้า** — ดึงสินค้าจาก D1 มาโชว์เป็น grid → คลิกไปหน้า detail
2. ✅ **Checkout + PromptPay QR** — กดซื้อ → สร้างออเดอร์ → โชว์ QR ตามยอด + ช่องอัปโหลดสลิป
3. ✅ **Endpoint ตรวจสลิป** — Worker ส่งสลิปต่อให้ SlipOK เช็คยอด/กันซ้ำ
4. ✅ **ปล่อยไอดี + โชว์บนจอ** — สลิปผ่าน → ตัด stock → โชว์ username/password/notes
5. ✅ **Deploy** — แอปขึ้น URL จริง + ยิงสลิปจริงให้ดู (🎬 the money shot)

---

## Checkpoint 1: หน้าร้าน + รายละเอียดสินค้า (ดึงจาก D1)

### เป้าหมาย
มี endpoint `GET /api/products` และ `GET /api/products/:id` ที่อ่านสินค้าจาก D1 — หน้าร้านโชว์ grid, คลิกการ์ดไปหน้า **Product Detail** ที่โชว์ข้อมูลครบและมีปุ่ม "ซื้อ" (routing ด้วย React Router)

### ขั้นตอน

**1.1 เปิด Claude Code แล้วให้มันทำงาน**

ใน Claude Code prompt:
> อ่าน `CLAUDE.md` ก่อน แล้วทำ **Checkpoint 1** ให้จบ: ตั้ง Hono ใน `worker/index.ts` ต่อ Drizzle เข้ากับ D1 binding `DB` ทำ `GET /api/products` และ `GET /api/products/:id` ตั้ง React Router ใน `App.tsx` สำหรับ route `/`, `/product/:id`, `/checkout`, `/success` หน้า Storefront คลิกการ์ดไป `/product/:id` — หน้า ProductDetail ดึง `/api/products/:id` มาโชว์ครบ ใช้ Tailwind ห้ามทำเกินขอบเขต checkpoint นี้

**1.2 สิ่งที่ Claude Code จะสร้าง**
- `GET /api/products` — คืน array สินค้าที่ `active = 1`
- `GET /api/products/:id` — คืน object สินค้าชิ้นเดียว (404 ถ้าไม่เจอหรือ inactive)
- `src/App.tsx` — React Router พร้อม 4 routes
- `src/pages/Storefront.tsx` — grid ไม่มีปุ่มซื้อ, คลิกการ์ด → detail
- `src/pages/ProductDetail.tsx` — รูปใหญ่, ชื่อ, คำอธิบายเต็ม, ราคา, ปุ่ม "ซื้อ" (จะ wire ใน CP2)

### ✅ วิธีทดสอบ Checkpoint 1
1. `pnpm run dev` แล้วเปิด `http://localhost:5173` → เห็น product grid
2. คลิกการ์ดสินค้า → นำทางไป `/product/prod-001` เห็นชื่อ/ราคา/คำอธิบายถูกต้อง
3. กด refresh ที่หน้า detail → ยังโหลดได้ (SPA fallback ทำงาน)
4. เปิด `/api/products` และ `/api/products/prod-001` → เห็น JSON ทั้งคู่

📸 **`[SCREENSHOT-02-storefront]`**
- **What:** หน้าร้านโชว์ product grid จาก D1
- **Filename:** `02-storefront.png`

📸 **`[SCREENSHOT-03-product-detail]`**
- **What:** หน้า Product Detail — รูป, ชื่อ, คำอธิบาย, ราคา, ปุ่ม "ซื้อ"
- **Filename:** `03-product-detail.png`

### ❌ ถ้าพัง — debug ตามลำดับ
- `/api/products` ขึ้น 404 ตอน dev → ลืมใส่ `cloudflare()` ใน `vite.config.ts` plugins
- `/api/products/:id` ขึ้น 404 → เช็คว่า route ใน Hono ใช้ `c.req.param("id")` ถูกต้อง
- Refresh หน้า detail แล้ว 404 → เช็ค `not_found_handling: "single-page-application"` ใน `wrangler.jsonc`
- query ขึ้น error เรื่อง binding → ชื่อ binding ใน `wrangler.jsonc` ต้องเป็น `DB` ตรงกับในโค้ด
- ตารางว่าง → ยังไม่ได้ apply migration / seed ที่ local

---

## Checkpoint 2: Checkout + PromptPay QR

### เป้าหมาย
กดปุ่ม "ซื้อ" → สร้างออเดอร์สถานะ `pending` (`POST /api/orders`) → ไปหน้า checkout ที่โชว์ยอด, ช่องกรอกอีเมล, **PromptPay QR ตามยอดของออเดอร์**, และโซนอัปโหลดสลิป

### ขั้นตอน

**2.1 prompt ให้ Claude Code**
> ทำ **Checkpoint 2**: เพิ่ม `POST /api/orders` (รับ `productId` คืน `orderId` + `amount` หลังเช็คราคาฝั่ง server) หน้า checkout สร้าง PromptPay payload ด้วย `promptpay-qr` จาก `VITE_PROMPTPAY_ID` + ยอดออเดอร์ แล้ว render ด้วย `QRCodeSVG` จาก `qrcode.react` พร้อมช่องอัปโหลดสลิป (ยังไม่ต้องยิงไป verify) อ้างอิงสัญญา type ใน `src/types.ts`

โค้ดหัวใจของการสร้าง QR (ฝั่ง client):
```tsx
import generatePayload from "promptpay-qr";
import { QRCodeSVG } from "qrcode.react";

const payload = generatePayload(import.meta.env.VITE_PROMPTPAY_ID, {
  amount: order.amount, // ยอดเป็นบาท เช่น 199
});

<QRCodeSVG value={payload} size={256} />
```

> หมายเหตุ: PromptPay ID **ไม่ใช่ความลับ** (มันถูกฝังอยู่ใน QR อยู่แล้ว) เลยใส่เป็น `VITE_` ได้ ต่างจาก API key ของ SlipOK ที่ห้ามหลุดมา client เด็ดขาด

### ✅ วิธีทดสอบ Checkpoint 2
1. กด "ซื้อ" → เด้งไปหน้า checkout เห็นยอดถูกต้อง
2. เปิดแอปธนาคารในมือถือ สแกน QR → ต้องขึ้น **ชื่อบัญชีร้าน + ยอดตรง** (อย่าเพิ่งโอนจริงก็ได้)
3. ลากรูปสลิปใส่โซนอัปโหลด → เห็น preview

📸 **`[SCREENSHOT-04-checkout-qr]`**
- **What:** หน้า checkout มี QR + ยอด + ช่องอัปโหลด
- **Filename:** `04-checkout-qr.png`

📸 **`[SCREENSHOT-05-scan]`**
- **What:** มือถือสแกน QR แล้วแอปธนาคารขึ้นยอดตรง
- **Filename:** `05-scan.png`

### ❌ ถ้าพัง — debug ตามลำดับ
- QR สแกนแล้วยอดเป็น 0 / ว่าง → ส่ง `amount` เป็น number (บาท) ไม่ใช่ string
- สแกนไม่ขึ้น → เช็คว่า `VITE_PROMPTPAY_ID` ใส่รูปแบบถูก (เบอร์โทร หรือเลขบัตร ปชช.)

---

## Checkpoint 3: Endpoint ตรวจสลิป (ส่งต่อให้ SlipOK)

### เป้าหมาย
`POST /api/verify-slip` รับ `orderId` + ไฟล์สลิป (multipart) → Worker ดึงยอดของออเดอร์จาก D1 → ส่งต่อให้ SlipOK พร้อม `amount` (เช็คยอด) และ `log: true` (กันสลิปซ้ำ) → แปลผลลัพธ์/error code

### ขั้นตอน

**3.1 prompt ให้ Claude Code**
> ทำ **Checkpoint 3**: เพิ่ม `POST /api/verify-slip` ใน Hono Worker รับ multipart (`orderId`, `slip`) อ่านออเดอร์จาก D1 เอา `amount` ไป cross-check แล้ว `fetch` ไป SlipOK ตาม pattern ใน CLAUDE.md จัดการ error code 1012/1013/1014 ให้ครบ API key + Branch ID ต้องมาจาก Worker `env` เท่านั้น

โค้ดหัวใจฝั่ง Worker:
```ts
// worker/index.ts (ตัดมาเฉพาะส่วนยิง SlipOK)
const form = await c.req.formData();
const slip = form.get("slip") as File;

const slipForm = new FormData();
slipForm.append("files", slip);          // ชื่อ field ต้องเป็น "files"
slipForm.append("amount", String(order.amount)); // ให้ SlipOK เช็คยอด
slipForm.append("log", "true");           // เปิด log เพื่อกันสลิปซ้ำ (error 1012)

const res = await fetch(
  `https://api.slipok.com/api/line/apikey/${c.env.SLIPOK_BRANCH_ID}`,
  {
    method: "POST",
    headers: { "x-authorization": c.env.SLIPOK_API_KEY }, // ห้ามตั้ง Content-Type เอง
    body: slipForm,
  },
);
const result = await res.json();
```

### ✅ วิธีทดสอบ Checkpoint 3
1. ตั้ง `SLIPOK_API_KEY` กับ `SLIPOK_BRANCH_ID` ใน `.dev.vars`
2. อัปโหลด **สลิปจริง** ที่ยอดตรงกับออเดอร์ → ดู Network tab: response `success: true` + `data.transRef`
3. ลองสลิปยอดไม่ตรง → ได้ error 1013, สลิปเดิมซ้ำ → 1014/1012

📸 **`[SCREENSHOT-06-verify-network]`**
- **What:** Network tab โชว์ response จาก `/api/verify-slip` ที่ success
- **Filename:** `06-verify-network.png`

### ❌ ถ้าพัง — debug ตามลำดับ
- 401/403 จาก SlipOK → header ต้องเป็น `x-authorization` และ Branch ID ใน URL ถูกต้อง
- ขึ้น error ว่าหา QR ในรูปไม่เจอ → สลิปต้องเป็นภาพชัด (รองรับ JPG/PNG/WEBP) เห็น QR มุมขวาล่าง
- **อย่าตั้ง `Content-Type` เอง** ตอนส่ง `FormData` — ปล่อยให้ runtime ใส่ boundary ให้

---

## Checkpoint 4: ปล่อยไอดี + โชว์บนหน้าจอ

### เป้าหมาย
ถ้าสลิปผ่าน: ภายใน transaction เดียว → mark ออเดอร์เป็น `paid` (เก็บ `transRef`), **ดึงไอดี 1 ตัวที่ว่างของสินค้านั้นแบบ atomic** มาตัด stock, แล้วคืน username/password/notes ให้ SPA โชว์หน้า success จัดการเคส "ของหมด" และ "สลิปซ้ำ" ด้วย

### ขั้นตอน

**4.1 prompt ให้ Claude Code**
> ทำ **Checkpoint 4**: ต่อจาก verify ถ้า SlipOK ผ่าน ให้ "เคลม" inventory แบบกันแย่งด้วย `UPDATE ... WHERE id = (SELECT id ... WHERE status='available' LIMIT 1) RETURNING *` แล้ว set order = paid เก็บ transRef ถ้าไม่มีของว่าง คืน 409 "สินค้าหมด" ถ้า transRef เคยใช้แล้ว คืน "สลิปนี้ถูกใช้ไปแล้ว" หน้า React โชว์ไอดีบน success screen

หัวใจของการเคลม stock แบบกันแย่ง (atomic):
```sql
UPDATE inventory
SET status = 'sold', order_id = ?
WHERE id = (
  SELECT id FROM inventory
  WHERE product_id = ? AND status = 'available'
  LIMIT 1
)
RETURNING username, password, notes;
```

### ✅ วิธีทดสอบ Checkpoint 4
1. ยิงสลิปจริงที่ยอดตรง → เห็น "✅ ยืนยันสำเร็จ" + ไอดีเกมโผล่บนจอ
2. เช็ค D1: inventory ตัวนั้น `status = 'sold'`, order = `paid`
3. ใช้สลิปเดิมซ้ำ → ขึ้น "สลิปนี้ถูกใช้ไปแล้ว" (ไม่ปล่อยไอดีซ้ำ)
4. ทำ stock สินค้าให้หมด แล้วลองซื้อ → ขึ้น "สินค้าหมด"

📸 **`[SCREENSHOT-07-reveal]`**
- **What:** success screen โชว์ username/password/notes
- **Filename:** `07-reveal.png`

> 🎬 **Camera moment:** จังหวะกดยืนยัน → หน้าจอเปลี่ยนเป็นเขียว → ไอดีเกมโผล่

### ❌ ถ้าพัง — debug ตามลำดับ
- ปล่อยไอดีซ้ำให้ 2 คน → การเคลมไม่ atomic ต้องใช้ `UPDATE ... (SELECT ... LIMIT 1) RETURNING` ก้อนเดียว ไม่ใช่ select แล้วค่อย update แยก
- ไอดีโดนปล่อยทั้งที่สลิปไม่ผ่าน → เช็ค `result.success` (และ field `data.success`) ให้ผ่านก่อนเคลมเสมอ

---

## Checkpoint 5: Deploy — 🏆 The Money Shot

ถึงจุดที่ทุก episode สร้างมาเพื่อสิ่งนี้: เอาแอปขึ้น internet จริง

### ขั้นตอน
```bash
# 1) ใส่ secret ของ production (คนละชุดกับ .dev.vars)
wrangler secret put SLIPOK_API_KEY
wrangler secret put SLIPOK_BRANCH_ID

# 2) apply migration กับ seed ขึ้น D1 ตัว remote (พลาดบ่อย!)
wrangler d1 migrations apply gameid-store-db --remote
wrangler d1 execute gameid-store-db --remote --file=./seed.sql

# 3) deploy
pnpm run deploy
```

### ✅ วิธีทดสอบ
1. เปิด URL `*.workers.dev` ที่ deploy ให้
2. เลือกสินค้า → สแกน QR → **โอนเงินจริง** → อัปโหลดสลิป → เห็นไอดีเกมโผล่ ทั้งหมดบน URL จริง
3. เช็คว่า address bar เป็น `workers.dev` ไม่ใช่ `localhost`

📸 **`[SCREENSHOT-08-live]`** ⭐
- **What:** แอปทำงานบน URL จริง (address bar เห็น workers.dev) ตอนไอดีเกมโผล่หลังสลิปผ่าน
- **Filename:** `08-live-shot.png`

> 🎬 **The money shot ของ episode:** "โอนเงินจริง อัปสลิปจริง ระบบเช็คกับธนาคารแล้วปล่อยไอดีให้ — และนี่รันอยู่บนเน็ตจริง ไม่ใช่ localhost"

---

## สรุป ก้าวต่อไป และค่าใช้จ่าย

เราสร้างร้านขายไอดีเกมที่ตรวจสลิปจริงได้ และ deploy ขึ้น Cloudflare ได้ใน 5 checkpoint:
- ✅ หน้าร้าน + checkout + PromptPay QR ตามยอด
- ✅ ตรวจสลิปจริงด้วย SlipOK (เช็คยอด + กันสลิปซ้ำ)
- ✅ ตัด stock แบบ atomic แล้วปล่อยไอดีบนหน้าจอ

**ค่าใช้จ่าย / การดูแล:**
- Cloudflare (Workers + D1) อยู่ใน free tier สบายๆ สำหรับร้านเล็ก
- **SlipOK เสียเงินตาม quota** — นี่คือต้นทุนหลักของระบบนี้ วางแผนยอดเรียกตามจำนวนออเดอร์
- การยิง SlipOK เป็น network I/O (`await fetch`) ไม่กิน CPU time เลยไม่ชน 10ms CPU limit ของ free Workers
- อัปเดต: แก้โค้ด แล้ว `pnpm run deploy` ใหม่ ก็ขึ้นทับเลย

**สิ่งที่ได้เรียนจาก episode นี้:**
- pattern "SPA + Hono Worker + D1" บน origin เดียวด้วย Vite plugin
- การซ่อน secret ของบริการจ่ายเงินไว้ที่ Worker แล้ว proxy ให้ client
- การเคลม stock แบบ atomic กันการขายซ้ำ

### Episode ถัดไป
- 🎯 **EP.2** — ส่งไอดีเข้าอีเมลอัตโนมัติด้วย Resend + จัดการ lifecycle ออเดอร์ (pending → paid → delivered) + ส่งอีเมลซ้ำได้
- 🎯 **EP.3** — ระบบหลังร้าน (admin) เพิ่มสินค้า/สต็อก/ดูออเดอร์ ด้วย Better Auth (ขยับเป็น Tier 3 เต็มตัว)

### Resources
- 🔗 Code: github.com/cqsol/gameid-store
- 🔗 SlipOK API: https://slipok.com/api-documentation/
- 🔗 Cloudflare Vite plugin: https://developers.cloudflare.com/workers/vite-plugin/
- 🔗 Claude Code docs: https://docs.claude.com

---

> 💬 ถ้ามีคำถาม comment ใต้วิดีโอ หรือเปิด issue ใน GitHub repo ครับ
