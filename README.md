# ☕ BLACK-AND-BREW ERP

> ระบบจัดการร้านกาแฟครบวงจร — ตารางงาน คลังสินค้า ยอดขาย ซ่อมบำรุง และผู้ช่วย AI (บรู) ในแอปเดียว

**เวอร์ชัน 9.2** · ภาษาไทย/อังกฤษ · เข้าเว็บแล้วไปหน้า `/th` อัตโนมัติ

---

## 🛠 Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-Testing-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-6-000000?style=for-the-badge&logo=vercel&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

---

## ✨ Features

> ออกแบบให้พนักงานใช้บนมือถือได้จริง — ไม่ใช่แดชบอร์ดทั่วไป แต่ผูกกับงานร้านกาแฟโดยตรง

### สรุปโมดูล

| หมวด | โมดูล | เส้นทาง |
| --- | --- | --- |
| งานประจำวัน | Command Center, Staff Dashboard | `/[locale]`, `/[locale]/dashboard` |
| ตารางงาน | Schedule | `/[locale]/schedule` |
| คลังสินค้า | Inventory, Stock Count, Accuracy, Branch Withdraw | `/[locale]/inventory/*` |
| ข้อมูลร้าน | Sales, Maintenance | `/[locale]/sales`, `/[locale]/maintenance` |
| ระบบและ AI | Settings, AI Chat (บรู) | `/[locale]/settings`, เปิดได้ทุกหน้า |

---

### 🏠 งานประจำวัน

#### Command Center

`/[locale]` · หน้าแรกหลังเข้าระบบ

**ใช้ทำอะไร:** ดูว่าวันนี้และพรุ่งนี้ใครอยู่กะอะไร มีกี่คนที่เคาน์เตอร์กาแฟ และใครหยุด — ในหน้าเดียว

**ทำงานอย่างไร:**

- อัปเดตทันทีเมื่อมีคนแก้ตาราง (Supabase Realtime)
- สีการ์ดกะขึ้นตามเวลาเริ่มงาน อ่านง่ายแม้ไม่จำชื่อกะ
- นับพนักงานหน้าร้าน (FOH Coffee) แยกจากกะอื่น

**จุดเด่น:** แดชบอร์ดทั่วไปชอบโชว์กราฟย้อนหลัง — หน้านี้ตอบคำถามเดียวตอนเปิดร้าน: *"วันนี้มีใครอยู่บ้าง?"*

---

#### Staff Dashboard

`/[locale]/dashboard` · ลงเวลาและดูตารางรายเดือน

**ใช้ทำอะไร:** พนักงานดูกะของตัวเอง ลงเวลาเข้า-ออก และดูตารางทั้งเดือน

**ทำงานอย่างไร:**

- โหลดข้อมูลกะครั้งเดียว แม้ต้องใช้ทั้งรายสัปดาห์และรายเดือน
- ข้อมูลมาจากแหล่งเดียวกับหน้า Schedule

**จุดเด่น:** ลงเวลากับดูตารางอยู่ในระบบเดียวกัน ไม่ขัดกันระหว่างหน้า

---

### 📅 ตารางงาน

#### Schedule

`/[locale]/schedule` · จัดกะแบบลากวาง

**ใช้ทำอะไร:** ลากวางกะพนักงาน กำหนดวันหยุด/ลา และดึงวันหยุดราชการไทยอัตโนมัติ

**ทำงานอย่างไร:**

- ลากวางได้บนแท็บเล็ต
- วันหยุดราชการดึงจาก Google Calendar แล้วรวมกับข้อมูลในระบบ
- แก้แล้วหน้าอื่นเห็นทันที

**จุดเด่น:** สีกะตามเวลาเริ่มงาน ไม่ใช่ป้ายสีตายตัว — มองแล้วรู้กะได้เร็ว

---

### 📦 คลังสินค้า

#### Inventory

`/[locale]/inventory` · ตารางคลังแบบ Excel

**ใช้ทำอะไร:** แก้สต็อก จุดสั่งซื้อ และเป้าหมายคลังในตารางโดยตรง มีปุ่มรับ-จ่ายสินค้าเร็ว

**ทำงานอย่างไร:**

- แก้ในช่องตาราง บันทึกอัตโนมัติเมื่อออกจากช่องหรือกด Enter
- อัปเดตสต็อกผ่านฐานข้อมูลแบบปลอดภัย (ล็อกแถวก่อนแก้)
- ยกเลิก/ทำซ้ำได้คลิกเดียว
- แก้ได้แม้ไม่มีเน็ต แล้วส่งขึ้นระบบเมื่อกลับมาออนไลน์
- แจ้งเตือนมือถือเครื่องอื่นเมื่อมีคนแก้สต็อก

**จุดเด่น:** ไม่ต้องเปิดฟอร์มทีละรายการ — นับสต็อกบนมือถือได้เร็ว ปลอดภัย และใช้ offline ได้

---

#### Stock Count

`/[locale]/inventory/count` · ตรวจนับสต็อกจริง

**ใช้ทำอะไร:** กรอกจำนวนที่นับได้ ระบบเทียบกับในคลังแล้วบันทึกผล

**ทำงานอย่างไร:**

- สินค้าแต่ละชนิดตั้งนโยบายนับได้ 2 แบบ:
  - **นับตัวเลขจริง** — มีผลต่อคะแนนความแม่นยำ
  - **เช็คแค่ว่าพอใช้** — ไม่นับตัวเลข ไม่คิดคะแนน
- เก็บประวัติการตรวจนับทุกครั้ง

**จุดเด่น:** กาแฟต้องนับจริง ถุงกระดาษแค่เช็คว่าพอ — ไม่บังคับทุกอย่างแบบเดียวกัน

---

#### Inventory Accuracy

`/[locale]/inventory/accuracy` · รายงานความแม่นยำ

**ใช้ทำอะไร:** ดูคะแนนความแม่นยำการนับ เฉพาะสินค้าที่ตั้งให้นับตัวเลขจริง

**ทำงานอย่างไร:**

- คำนวณจากประวัติการตรวจนับ
- ไม่รวมสินค้าแบบ "เช็คพอใช้" ในคะแนน

**จุดเด่น:** ตัวเลข accuracy ไม่ถูกบิดเพราะสินค้าที่ไม่ได้นับจริง

---

#### Branch Withdraw

`/[locale]/inventory/branch-withdraw` · เบิกของไปสาขา 2

**ใช้ทำอะไร:** บันทึกเบิกของจากคลังหลักไปสาขา 2 หลายรายการครั้งเดียว พร้อมดูประวัติ

**ทำงานอย่างไร:**

- บันทึกทีละชุดในฐานข้อมูล สต็อกหลักอัปเดตทันที
- เก็บแบบร่างไว้ก่อนบันทึก กันข้อมูลหาย
- แจ้งเตือนคลังข้ามอุปกรณ์เมื่อเบิกเสร็จ

**จุดเด่น:** ไม่ต้องทำใน Excel หรือกระดาษ — มีประวัติและสต็อกตรงทันที

---

### 📊 ข้อมูลร้าน

#### Sales

`/[locale]/sales` · วิเคราะห์ยอดขาย

**ใช้ทำอะไร:** อัปโหลดไฟล์ Excel จาก POS แล้วดูยอดขายตามหมวดและช่วงเวลา

**ทำงานอย่างไร:**

- อ่านไฟล์ Excel บนเซิร์ฟเวอร์ เก็บข้อมูลในฐานข้อมูล
- จัดหมวดสินค้าได้

**จุดเด่น:** ไม่ต้องต่อ API กับ POS — อัปโหลดไฟล์ที่มีอยู่แล้วใช้ได้เลย

---

#### Maintenance

`/[locale]/maintenance` · บันทึกการซ่อม

**ใช้ทำอะไร:** บันทึกประวัติซ่อมเครื่องชง อุปกรณ์ และค่าใช้จ่าย

**ทำงานอย่างไร:**

- บันทึกผ่านระบบหลังบ้านที่ปลอดภัย
- หน้าตาใกล้เคียงตารางคลัง ใช้คุ้นมือ

**จุดเด่น:** อยู่ในระบบเดียวกับตารางงานและคลัง — บรูช่วยตอบเรื่องเครื่องจักรได้

---

### 🤖 ระบบและ AI

#### Settings

`/[locale]/settings` · ตั้งค่าและความปลอดภัย

**ใช้ทำอะไร:** เปลี่ยนธีม ดูประวัติเข้าใช้ ลงทะเบียนลายนิ้วมือ/ใบหน้า จัดการแจ้งเตือน และตัด session เครื่องอื่น

**ทำงานอย่างไร:**

- ธีมสว่าง/มืด/ตามระบบ
- บันทึกทุกครั้งที่เข้าใช้ พร้อมระบุอุปกรณ์
- บังคับออกจากระบบเครื่องที่เลือกได้จากระยะไกล

**จุดเด่น:** ไม่ใช่แค่หน้าตั้งค่า — เป็นศูนย์ควบคุมความปลอดภัยสำหรับทีมที่ใช้ PIN ร่วมกัน

---

#### AI Chat — บรู

เปิดได้ทุกหน้า · ผู้ช่วย AI ของร้าน

**ใช้ทำอะไร:** ถามเรื่องตารางงาน สต็อกต่ำ ยอดขาย วันหยุด หรือสถานะร้านเป็นภาษาพูด — บรูดึงข้อมูลจริงมาตอบ

**ทำงานอย่างไร:**

- ใช้ Gemini ผ่าน Vercel AI SDK
- อ่านข้อมูลร้านผ่านช่องทางเดียวที่ควบคุมได้ ป้องกันการดึงข้อมูลเกินจำเป็น
- ตอบแบบ streaming ปลอดภัยจาก XSS
- ต้องใช้ PIN แบบแก้ไขได้ — โหมดดูอย่างเดียวใช้บรูไม่ได้

**จุดเด่น:** ไม่ตอบจากความรู้ทั่วไป — ตอบจากข้อมูลร้านจริง แบบ real-time

---

### 🔐 ความสามารถของแพลตฟอร์ม

ฟีเจอร์ที่ทำให้ใช้งานบนมือถือในร้านได้จริง

| ฟีเจอร์ | ใช้ทำอะไร | ทำงานอย่างไร (ย่อ) |
| --- | --- | --- |
| **PIN Gateway** | ใส่ PIN 6 หลักก่อนเข้าแอป | แยกสิทธิ์แก้ไข/ดูอย่างเดียว |
| **Passkeys** | ล็อกอินด้วยลายนิ้วมือหรือใบหน้า | หลังลงทะเบียนบนเครื่องที่เชื่อถือ |
| **Web Push** | แจ้งเตือนสต็อกและรายงานกะ | ส่งข้ามมือถือ/แท็บเล็ต |
| **PWA** | ติดตั้งเป็นแอปบนหน้าจอโฮม | ใช้ offline บางส่วนได้ |
| **ธีมสว่าง/มืด** | เลือกโทนสีตามชอบ | การ์ดกะยังอ่านง่ายทั้งสองธีม |
| **สองภาษา** | ไทย (หลัก) และอังกฤษ | สลับได้ทั้งระบบ |

#### ระบบความปลอดภัย

```text
ใส่ PIN → เก็บ session ปลอดภัย → เข้าฐานข้อมูลด้วยสิทธิ์ที่กำหนด
→ ทุกการแก้ไขตรวจสิทธิ์ก่อนเสมอ
```

เหมาะกับทีมเล็ก: ไม่ต้องสร้างบัญชีรายคน แต่ยังมีประวัติเข้าใช้ ตัด session ระยะไกล และสิทธิ์เข้าถึงข้อมูลครบ

---

## 🚀 Installation

### สิ่งที่ต้องมี

- **Node.js** 20 ขึ้นไป
- **npm**
- โปรเจกต์ **Supabase** (ฐานข้อมูล + ระบบล็อกอิน)

### ขั้นตอน

```bash
# 1. โคลนโปรเจกต์
git clone <repo-url>
cd black-and-brew

# 2. ติดตั้งแพ็กเกจ
npm install

# 3. ตั้งค่าตัวแปรสภาพแวดล้อม
cp .env.example .env.local
# แก้ไข .env.local ตามหัวข้อด้านล่าง

# 4. รันเซิร์ฟเวอร์พัฒนา
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) — จะไปหน้า `/th` และขอใส่ PIN

### 📜 คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | รันโหมดพัฒนา |
| `npm run build` | สร้างเวอร์ชัน production |
| `npm run start` | รัน production |
| `npm run lint` | ตรวจโค้ด |
| `npm run lint:md` | ตรวจไฟล์ Markdown |
| `npm test` | รันเทส |
| `npm run db:verify` | ตรวจสถานะ migration ของ Supabase |

---

## 🔑 Environment Variables

คัดลอกจาก [.env.example](.env.example) ไป `.env.local` (รันบนเครื่องตัวเอง) หรือตั้งใน **Vercel Dashboard** (ขึ้น production)

> **คำอธิบาย:** `PUBLIC` = เห็นได้ในเบราว์เซอร์ · `SECRET` = เก็บฝั่งเซิร์ฟเวอร์เท่านั้น · `OPTION` = ไม่บังคับ

### 🗄 Supabase (จำเป็น)

| ตัวแปร | ประเภท |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | PUBLIC |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PUBLIC |
| `SUPABASE_SERVICE_ROLE_KEY` | SECRET — ห้ามใส่ `NEXT_PUBLIC_` |

### 🔒 ล็อกอินและตำแหน่งร้าน

| ตัวแปร | ประเภท | หมายเหตุ |
| --- | --- | --- |
| `APP_PIN` | SECRET | PIN 6 หลัก — แก้ไขได้ทุกอย่าง |
| `APP_READ_ONLY_PIN` | SECRET | PIN 6 หลัก — ดูอย่างเดียว |
| `NEXT_PUBLIC_STORE_LAT` | PUBLIC | ละติจูดร้าน |
| `NEXT_PUBLIC_STORE_LON` | PUBLIC | ลองจิจูดร้าน |
| `WEBAUTHN_RP_ID` | SECRET | OPTION — สำหรับ passkeys บน production |
| `WEBAUTHN_ORIGIN` | SECRET | OPTION — สำหรับ passkeys บน production |

### 🤖 AI และ API ภายนอก

| ตัวแปร | ประเภท | หมายเหตุ |
| --- | --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | SECRET | ใช้กับ AI Chat (Gemini) |
| `TAVILY_API_KEY` | SECRET | ค้นหาข้อมูลบนอินเทอร์เน็ตให้ AI |
| `GOOGLE_CALENDAR_API_KEY` | SECRET | OPTION — ดึงวันหยุดราชการ |

### ⏰ Cron และการแจ้งเตือน

| ตัวแปร | ประเภท | หมายเหตุ |
| --- | --- | --- |
| `CRON_SECRET` | SECRET | ป้องกัน API รายงานประจำวัน |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | PUBLIC | รับการแจ้งเตือน push |
| `VAPID_PRIVATE_KEY` | SECRET | ส่งการแจ้งเตือน push |
| `VAPID_SUBJECT` | SECRET | อีเมลหรือ URL ติดต่อ |
| `PUSH_WEBHOOK_SECRET` | SECRET | OPTION — webhook สำรอง |

```bash
# สร้างคีย์ VAPID สำหรับ Web Push
npx web-push generate-vapid-keys
```

รายละเอียดเพิ่ม → [.env.example](.env.example)

---

## 🏗 Architecture

```text
src/
├── app/
│   ├── page.tsx              # ไปหน้า /th
│   ├── manifest.ts           # ตั้งค่า PWA
│   ├── actions/              # ฟังก์ชันแก้ไขข้อมูล (คลัง, ตารางงาน, ล็อกอิน, …)
│   ├── api/                  # chat, รายงานประจำวัน, push, offline
│   └── [locale]/             # หน้าเว็บ (ไทย/อังกฤษ)
│       ├── <feature>/page.tsx, *Client.tsx
│       └── <feature>/_components/   # คอมโพเนนต์เฉพาะฟีเจอร์
├── components/               # UI ใช้ร่วมกัน
├── lib/                      # โค้ดช่วย (supabase, ตารางงาน, คลัง, …)
├── i18n/                     # ระบบสองภาษา
└── proxy.ts                  # middleware ภาษา
```

### จุดสำคัญด้านเทคนิค

- 🗃 **ฐานข้อมูล** — Supabase PostgreSQL (เซิร์ฟเวอร์ไทย)
- 🔄 **อัปเดตสต็อก** — ผ่าน RPC `set_inventory_stock` แบบปลอดภัย
- 📋 **นโยบายนับสินค้า** — นับตัวเลขจริง vs เช็คพอใช้
- 🛡 **สิทธิ์ข้อมูล** — เฉพาะผู้ล็อกอินเท่านั้น
- 📱 **PWA** — ติดตั้งเป็นแอป + ทำงาน offline บางส่วน

เอกสารสถาปัตยกรรมเต็ม → [docs/architecture.md](docs/architecture.md) · กฎสำหรับนักพัฒนา → [AGENTS.md](AGENTS.md)

---

## 📚 Documentation

| เอกสาร | เนื้อหา |
| --- | --- |
| [docs/changelog.md](docs/changelog.md) | สิ่งที่เปลี่ยนล่าสุด |
| [PROJECT_MAP.md](PROJECT_MAP.md) | แผนที่ route และโฟลเดอร์ |
| [docs/architecture.md](docs/architecture.md) | โครงสร้างระบบและการไหลของข้อมูล |
| [docs/database.md](docs/database.md) | ฐานข้อมูล, สิทธิ์, RPC |
| [docs/api.md](docs/api.md) | รายการ Server Actions |
| [docs/design.md](docs/design.md) | มาตรฐาน UI/UX |
| [docs/rules.md](docs/rules.md) | กฎการเขียนโค้ด |
| [docs/SOP.md](docs/SOP.md) | ขั้นตอนพัฒนา (TDD) |
| [AGENTS.md](AGENTS.md) | กฎสำหรับ AI agents |

---

## 🤝 Contributing

1. อ่าน [docs/SOP.md](docs/SOP.md) และ [docs/design.md](docs/design.md)
2. ใช้ `font-normal` เท่านั้น (ห้ามตัวหนา)
3. รัน `npm test` และ `npm run build` ก่อนส่ง PR

---

## 📄 License

สงวนลิขสิทธิ์ — ใช้ภายในองค์กรเท่านั้น
