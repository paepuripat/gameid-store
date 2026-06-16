# ระบบหลังร้าน: จัดการสินค้า/สต็อก/ออเดอร์ ด้วย Better Auth (EP.3)

> ต่อจาก EP.2 ที่ส่งไอดีเข้าอีเมลได้แล้ว — EP นี้เราจะเลิก seed สินค้าด้วยมือ แล้วทำ **ระบบหลังร้าน (admin)** ที่ login ได้: เพิ่ม/แก้สินค้า, เติมสต็อกไอดี, ดูออเดอร์ ใช้ **Better Auth** แบบ admin คนเดียว แล้ว deploy ขึ้น Cloudflare เหมือนเดิม — กลายเป็น full-stack Tier 3 เต็มตัว

<!--
📸 SCREENSHOT GUIDE (สำหรับคนเขียน blog — ลบทิ้งก่อน publish)
- บล็อก `[SCREENSHOT-NN-name]` คือจุดใส่ภาพ ถ่าย 16:9 อย่างน้อย 1920x1080
-->

📸 **`[SCREENSHOT-01-hero]`**
- **What:** หน้า admin dashboard บน URL จริง ตอนเพิ่งกดเพิ่มไอดีใหม่
- **Filename:** `01-hero-admin.png`

---

## สิ่งที่เราจะสร้าง (ต่อยอดจาก EP.2)

- **Login หลังร้าน** ด้วย Better Auth (admin คนเดียว — ปิดสมัครสมาชิกสาธารณะ)
- หน้า **จัดการสินค้า** (เพิ่ม/แก้/เปิด-ปิดขาย, รูปใส่เป็น URL)
- หน้า **เติมสต็อก** (วางไอดีทีละหลายบรรทัด → กลายเป็น row ใน inventory)
- หน้า **ดูออเดอร์** (สถานะ, ยอด, อีเมล, ไอดีที่ส่ง, transRef)

### Demo สุดท้าย
Login เข้า admin บน URL จริง → เพิ่มไอดีเกมใหม่ → เห็นมันโผล่ในร้าน → ซื้อจนจบ end-to-end

### สิ่งที่ตัดทิ้งโดยตั้งใจ
- ❌ **บัญชีลูกค้า** — auth นี้สำหรับ admin เท่านั้น
- ❌ **อัปโหลดรูปสินค้า (R2)** — ใช้วาง URL รูปเอาก่อน
- ❌ สมัครสมาชิกสาธารณะ — seed admin คนเดียว ปิด sign-up

> 💡 **ทำไม auth เพิ่งมา EP.3:** เพราะ flow ลูกค้า (ซื้อ/จ่าย/รับไอดี) ไม่ต้องรู้จักว่าใครเป็นใคร เลยไม่ลาก auth มาตั้งแต่ EP.1 — มาเพิ่มตอนที่ "หลังร้าน" ต้องการจริงๆ

---

## Stack ที่เพิ่มเข้ามา

| Tool | ทำไมเลือก | หมายเหตุ |
|------|-----------|----------|
| **Better Auth (v1.5+)** | auth library ที่ทำงานกับ Cloudflare D1 ได้ดี ใช้ Drizzle adapter ให้ตาราง auth ไป migrate รวมกับของเดิม | v1.5 รองรับ D1 แบบ native ด้วย แต่เราเลือก Drizzle adapter เพื่อให้ migration เป็นชุดเดียว |

ของเดิมจาก EP.1/EP.2 ใช้ต่อทั้งหมด เพิ่ม secret `BETTER_AUTH_SECRET` + config `BETTER_AUTH_URL`

> ⚠️ **กับดักใหญ่สุดของ Workers:** Worker เป็น stateless ต่อ request และ D1 เข้าถึงได้ผ่าน `c.env` ต่อ request เท่านั้น → ต้องสร้าง Better Auth (และ Drizzle client) **ใหม่ทุก request ใน Hono middleware** ห้ามทำเป็น singleton ระดับ module เด็ดขาด ไม่งั้นจะเจอ hang ยาวๆ, 503 มั่ว, session หลุด

---

## เตรียมตัวก่อนเริ่ม (Prebuild)

- โค้ด EP.2 ที่ deploy แล้ว (ส่งอีเมลไอดีได้)
- ติดตั้ง Better Auth + gen schema ของ auth เข้า Drizzle schema

```bash
pnpm add better-auth
# gen ตาราง auth (user/session/account/verification) เข้า schema เดิม
pnpm dlx @better-auth/cli generate
# แล้ว migrate ตามชุดเดิม
pnpm drizzle-kit generate
wrangler d1 migrations apply gameid-store-db --local
```

ตั้ง secret/config ตอน dev:
```bash
echo 'BETTER_AUTH_SECRET=<random-long-string>' >> .dev.vars
echo 'BETTER_AUTH_URL=http://localhost:5173' >> .dev.vars
```

> 🎬 เริ่มถ่ายตรงที่ EP.2 ครบแล้ว ต่อด้วยการวาง auth

---

## โครงเรื่อง: 6 Checkpoint

1. ✅ **วาง Better Auth + seed admin** — middleware per-request, login ได้
2. ✅ **ป้องกัน route หลังร้าน** — `/api/admin/*` + `/admin/*` ต้อง login
3. ✅ **จัดการสินค้า** — เพิ่ม/แก้/เปิด-ปิดขาย
4. ✅ **เติมสต็อก** — วางไอดีหลายบรรทัด
5. ✅ **ดูออเดอร์** — ตารางออเดอร์ทั้งหมด
6. ✅ **Deploy** — admin บน URL จริง เพิ่มไอดี → ซื้อจริง (🎬 the money shot)

---

## Checkpoint 1: วาง Better Auth + seed admin

### เป้าหมาย
สร้าง auth instance **ต่อ request** ใน middleware, migrate ตาราง auth, มีหน้า `/login` (email + password), seed admin หนึ่งคน, ปิดสมัครสมาชิก

### ขั้นตอน

**1.1 prompt ให้ Claude Code**
> ทำ **EP.3 Checkpoint 1** ตาม pattern ใน CLAUDE.md: สร้าง `createAuth(env, db)` เป็น factory ไม่ใช่ singleton, ใน `worker/index.ts` ทำ middleware สร้าง `drizzle(c.env.DB)` + `createAuth` ใหม่ทุก request เก็บลง context route `/api/auth/*` ไปที่ `auth.handler(c.req.raw)` เปิด `emailAndPassword` ตั้ง `disableSignUp: true` ปิด cookieCache (เก็บ session ใน DB) ทำหน้า login แล้ว seed admin หนึ่งคน

โครง factory (ห้าม singleton):
```ts
export function createAuth(env: Env, db: DrizzleD1) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: "sqlite" }),
    emailAndPassword: { enabled: true, disableSignUp: true },
    session: { storeSessionInDatabase: true }, // ปิด cookieCache เลี่ยงบั๊ก logout 5 นาที
  });
}
```
```ts
app.use("*", async (c, next) => {
  const db = drizzle(c.env.DB);          // ต่อ request
  c.set("auth", createAuth(c.env, db));  // ต่อ request
  c.set("db", db);
  await next();
});
app.on(["GET", "POST"], "/api/auth/*", (c) => c.get("auth").handler(c.req.raw));
```

### ✅ วิธีทดสอบ
1. Login ด้วย admin ที่ seed → ผ่าน
2. refresh แล้ว session ยังอยู่
3. ยิงรัวๆ ไม่เจอ hang/503 (พิสูจน์ว่าไม่ได้ทำ singleton)

📸 **`[SCREENSHOT-02-login]`** — หน้า login + login สำเร็จ

### ❌ ถ้าพัง
- hang นานหรือ 503 มั่ว → แปลว่าทำ auth/Drizzle เป็น singleton ระดับ module ต้องย้ายมาสร้างใน middleware ต่อ request
- โดน logout เองหลัง ~5 นาที → cookieCache + secondary storage บั๊ก ปิด cookieCache เก็บ session ใน DB

---

## Checkpoint 2: ป้องกัน route หลังร้าน

### เป้าหมาย
middleware เช็ค session บน `/api/admin/*` (ไม่มี session → 401) และฝั่ง client ให้ `/admin/*` redirect ไป `/login` เมื่อยังไม่ login

### ขั้นตอน
**2.1 prompt**
> ทำ **EP.3 Checkpoint 2**: เพิ่ม middleware ที่ดึง session จาก auth ถ้าไม่มีให้ตอบ 401 ครอบ `/api/admin/*` ฝั่ง React ทำ guard ให้ route `/admin/*` redirect ไป `/login` ถ้าไม่มี session

### ✅ วิธีทดสอบ
1. ยังไม่ login → เข้า `/admin` เด้งไป `/login`, ยิง `/api/admin/*` ได้ 401
2. login แล้ว → เข้าได้ทั้งคู่

📸 **`[SCREENSHOT-03-guard]`** — โดน redirect ตอนยังไม่ login

---

## Checkpoint 3: จัดการสินค้า

### เป้าหมาย
`/admin/products` — list + เพิ่ม + แก้ + toggle `active` รูปสินค้าวางเป็น URL

### ขั้นตอน
**3.1 prompt**
> ทำ **EP.3 Checkpoint 3**: หน้า `/admin/products` + endpoint admin สำหรับ list/create/update/toggle active ของ products (รูปเป็น URL) ทั้งหมดอยู่หลัง auth

### ✅ วิธีทดสอบ
- เพิ่มสินค้าใน admin → ไปเห็นในหน้าร้านจริง

📸 **`[SCREENSHOT-04-products]`** — ตารางจัดการสินค้า

---

## Checkpoint 4: เติมสต็อก (วางไอดีหลายบรรทัด)

### เป้าหมาย
`/admin/products/:id/stock` — textarea วางไอดีทีละหลายบรรทัด (`username,password,notes` ต่อบรรทัด) → insert เป็น row ใน `inventory` โชว์จำนวนสต็อกที่ว่าง

### ขั้นตอน
**4.1 prompt**
> ทำ **EP.3 Checkpoint 4**: หน้าเติมสต็อก รับ textarea แตกเป็นบรรทัด parse `username,password,notes` insert ลง inventory (status available) โชว์ available count

### ✅ วิธีทดสอบ
- วางไอดี 3 บรรทัด → สต็อกเพิ่ม 3, สินค้ากลับมาซื้อได้

📸 **`[SCREENSHOT-05-stock]`** — วางไอดีแล้วสต็อกขึ้น

### ❌ ถ้าพัง
- บรรทัดว่าง/ช่องว่างเกินทำพัง → trim และข้ามบรรทัดว่างก่อน insert

---

## Checkpoint 5: ดูออเดอร์

### เป้าหมาย
`/admin/orders` — ตารางออเดอร์ (status, ยอด, อีเมล, ไอดีที่เคลม, `slipTransRef`, `deliveredAt`)

### ขั้นตอน
**5.1 prompt**
> ทำ **EP.3 Checkpoint 5**: หน้า `/admin/orders` ดึงออเดอร์ทั้งหมด join ไอดีที่เคลม โชว์เป็นตาราง เรียงใหม่สุดก่อน

### ✅ วิธีทดสอบ
- ออเดอร์ที่ซื้อจบใน EP.2 โผล่เป็น `delivered` พร้อมไอดีที่ถูกต้อง

📸 **`[SCREENSHOT-06-orders]`** — ตารางออเดอร์

---

## Checkpoint 6: Deploy — 🏆 The Money Shot

### ขั้นตอน
```bash
# 1) secret/config production
wrangler secret put BETTER_AUTH_SECRET
# ตั้ง BETTER_AUTH_URL = origin ที่ deploy จริง (เช่น https://gameid-store.xxx.workers.dev)

# 2) migrate ตาราง auth ขึ้น remote + seed admin ที่ remote (พลาดบ่อย!)
wrangler d1 migrations apply gameid-store-db --remote

# 3) deploy
pnpm run deploy
```

### ✅ วิธีทดสอบ
1. เปิด URL จริง → `/login` → login admin
2. เพิ่มไอดีเกมใหม่ใน admin
3. กลับไปหน้าร้าน → เห็นสินค้า → ซื้อจริง → ได้อีเมลไอดี ครบ loop

📸 **`[SCREENSHOT-07-live]`** ⭐
- **What:** admin บน URL จริงตอนเพิ่มไอดี → ตามด้วยหน้าร้านที่ซื้อได้
- **Filename:** `07-live-admin.png`

> 🎬 **The money shot:** "Login หลังร้าน เพิ่มไอดีใหม่ เด้งไปเห็นในร้าน แล้วซื้อจนจบ — ทั้งหมดบนเน็ตจริง"

---

## สรุป ก้าวต่อไป และค่าใช้จ่าย

ปิดซีรีส์ด้วยระบบหลังร้านครบใน 6 checkpoint:
- ✅ Login admin-only ด้วย Better Auth (pattern per-request บน Workers)
- ✅ จัดการสินค้า/สต็อก/ออเดอร์จาก UI ไม่ต้อง seed มือ
- ✅ ครบ loop: admin เพิ่มไอดี → ลูกค้าซื้อ → จ่าย → รับอีเมล

**ค่าใช้จ่าย / การดูแล:**
- ยังอยู่บน Cloudflare free tier (Workers + D1), SlipOK ตาม quota, Resend free tier
- Better Auth ไม่มีค่าใช้จ่ายเพิ่ม (รันบน Worker + D1 ของเราเอง)

**สิ่งที่ได้เรียน:**
- pattern auth ที่ปลอดภัยบน Workers: สร้าง instance ต่อ request ไม่ทำ singleton
- จัดการ session บน D1 (เลี่ยงบั๊ก cookieCache)
- การปิด sign-up สาธารณะ + seed admin สำหรับระบบหลังร้านจริง

### Resources
- 🔗 Code: github.com/cqsol/gameid-store
- 🔗 Better Auth บน Cloudflare/Hono: https://hono.dev/examples/better-auth-on-cloudflare
- 🔗 Better Auth docs: https://better-auth.com

---

> 💬 ถ้ามีคำถาม comment ใต้วิดีโอ หรือเปิด issue ใน GitHub repo ครับ
