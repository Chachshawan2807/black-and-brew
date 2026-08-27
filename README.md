# ☕ BLACK-AND-BREW ERP

> เว็บแอปจัดการร้าน **BLACK AND BREW** — ตารางงาน คลังสินค้า ออเดอร์เมล็ด และการซ่อมบำรุง อยู่ในที่เดียว เปิดจากมือถือหรือแท็บเล็ตในร้านได้ทันที

| | |
| --- | --- |
| **เวอร์ชัน** | 9.4 |
| **ภาษา** | ไทย (หลัก) · อังกฤษ — เข้าเว็บแล้วไป `/th` อัตโนมัติ |
| **การเข้าใช้** | PIN 6 หลักก่อนใช้งาน (แก้ไขได้ / ดูอย่างเดียว) |
| **ติดตั้งแอป** | รองรับ PWA — เพิ่มไปหน้าจอโฮมได้ |

---

## 📱 เปิดแอปแล้วเห็นอะไร

หลังใส่ PIN จะเข้าหน้าหลักพร้อม **แถบเมนูด้านข้าง** (มือถือเป็นเมนูแบบเลื่อนออก) แต่ละหน้าโหลดเร็ว ออกแบบให้ใช้นิ้วบนแท็บเล็ตได้สะดวก

- **สีการ์ดกะ** — เปลี่ยนตามเวลาเริ่มงาน (เช่น กะ 6:30 โทนเขียวอ่อน) มองแล้วแยกกะได้เร็ว
- **ธีมสว่าง/มืด** — สลับได้ที่เมนูหรือหน้าตั้งค่า
- **อัปเดตทันที** — แก้ตารางงานหรือสต็อกแล้วเครื่องอื่นเห็นผลโดยไม่ต้องรีเฟรช
- **แจ้งเตือน** — ปุ่มกระดิ่งมุมล่าง แสดงข้อความและเวลา (ดูอย่างเดียว ไม่มีลิงก์ไปหน้าอื่น)

---

## 🗂️ เมนูในแอป

| | หน้า | ทำอะไร |
| --- | --- | --- |
| 🏠 | **หน้าหลัก** `/th` | สรุปกะวันนี้–พรุ่งนี้ ใครอยู่หน้าร้าน งานค้างจากคลัง/ซ่อม/ออเดอร์เมล็ด |
| 📊 | **แดชบอร์ดพนักงาน** `/th/dashboard` | ดูกะของตัวเอง ลงเวลา เปิดปฏิทินรายเดือน |
| 📅 | **ตารางงาน** `/th/schedule` | ลากวางกะ วันหยุด วันลา ดึงวันหยุดราชการไทยอัตโนมัติ |
| 🔧 | **บันทึกการซ่อม** `/th/maintenance` | บันทึกประวัติซ่อมเครื่องและอุปกรณ์ในตาราง |
| 📦 | **คลังสินค้า** `/th/inventory` | แก้สต็อกในตารางเหมือน Excel บันทึกอัตโนมัติ ยกเลิก/ทำซ้ำได้ |
| 📋 | **ตรวจนับคลัง** `/th/inventory/count` | นับสต็อกจริง หรือเช็คแค่ว่าพอใช้ (ตั้งนโยบายต่อรายการ) |
| 📈 | **รายงานความแม่นยำ** `/th/inventory/accuracy` | คะแนนความแม่นยำจากรายการที่นับตัวเลขจริง |
| 🚚 | **เบิกของสาขา 2** `/th/inventory/branch-withdraw` | เลือกหลายรายการเบิกครั้งเดียว สต็อกหลักลดทันที |
| ☕ | **ออเดอร์เมล็ดกาแฟ** `/th/bean-orders` | สร้างออเดอร์ อัปโหลดสลิป ติดตามชำระเงินและจัดส่ง |
| ⚙️ | **ตั้งค่า** `/th/settings` | ธีม ประวัติเข้าใช้ ลายนิ้วมือ/ใบหน้า การแจ้งเตือน ตัดเซสชันอุปกรณ์อื่น |

> เปลี่ยน `th` เป็น `en` สำหรับภาษาอังกฤษ · ผู้จัดการลากจัดลำดับเมนูในแถบข้างได้ (เฉพาะ PIN แก้ไขได้)

---

## ✨ สิ่งที่ทำงานจริงในร้าน

### 📅 ตารางงาน

- ลากกะบนปฏิทินได้บนแท็บเล็ต
- สีกะตามเวลาเริ่ม ไม่ใช่แค่ชื่อตำแหน่ง
- แก้แล้วหน้าหลักและแดชบอร์ดพนักงานอัปเดตพร้อมกัน

### 📦 คลังสินค้า

- แก้ตัวเลขในช่องตารางเลย — ออกจากช่องหรือกด Enter แล้วบันทึก
- หลายคนเปิดพร้อมกันได้ มีแจ้งเตือนเมื่อมีคนแก้สต็อก
- เน็ตหลุดยังแก้บางอย่างได้ พอกลับมาออนไลน์ระบบส่งขึ้นให้เอง
- ปุ่มลัดรับ–จ่ายสินค้า (FAB) มุมล่างขวา

### ☕ ออเดอร์เมล็ด

- แยกสถานะ **ชำระเงิน** และ **จัดส่ง**
- อัปโหลดสลิปชำระเงิน
- ยืนยันจัดส่งสำเร็จด้วยตนเอง — ไม่หักสต็อกคลังอัตโนมัติ

### 🔐 ความปลอดภัย

| ฟีเจอร์ | รายละเอียด |
| --- | --- |
| 🔢 PIN | 6 หลัก — แก้ไขได้ทุกอย่าง หรือดูอย่างเดียว |
| 👆 Passkeys | ลงทะเบียนหลังใส่ PIN ครั้งแรก — เข้าครั้งถัดไปเร็วขึ้น |
| 🔔 Web Push | แจ้งเตือนสต็อก รายงานกะประจำวัน งานค้างข้ามโมดูล |
| 📲 PWA | ติดตั้งบนหน้าจอโฮม ใช้ offline บางส่วนได้ |

---

## 🛠 เทคโนโลยีที่ใช้

![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

| เทคโนโลยี | หน้าที่ |
| --- | --- |
| Next.js + React | โครงหลักเว็บแอป |
| Supabase | ฐานข้อมูล + ซิงก์แบบเรียลไทม์ |
| Tailwind CSS | หน้าตาสม่ำเสมอ อ่านง่ายบนมือถือ |
| PWA | ติดตั้งเป็นแอป + ทำงาน offline บางส่วน |

---

## 🚀 สำหรับนักพัฒนา

### ติดตั้ง

```bash
git clone <repo-url>
cd black-and-brew
npm install
cp .env.example .env.local   # กรอกค่าตาม .env.example
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) → ไป `/th` → ใส่ PIN จาก `APP_PIN`

**ต้องมี:** Node.js 24 · npm · โปรเจกต์ Supabase · Git

### คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | รันโหมดพัฒนา |
| `npm run build` | สร้าง production |
| `npm test` | รันชุดทดสอบ |
| `npm run lint` | ตรวจโค้ด |
| `npm run docs:links` | ตรวจลิงก์ในเอกสาร |
| `npm run db:verify` | ตรวจ migration ฐานข้อมูล |

### 🔑 ตัวแปรสำคัญ

คัดลอกจาก [.env.example](.env.example) → `.env.local` (เครื่องตัวเอง) หรือ Vercel Dashboard (production)

| กลุ่ม | ตัวแปร | จำเป็น |
| --- | --- | --- |
| 🗄 ฐานข้อมูล | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| 🔒 เข้าใช้ | `APP_PIN`, `APP_READ_ONLY_PIN` | ✅ |
| 📍 ร้าน | `NEXT_PUBLIC_STORE_LAT`, `NEXT_PUBLIC_STORE_LON` | แนะนำ |
| 🔔 แจ้งเตือน | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | ถ้าใช้ push |
| ⏰ รายงานอัตโนมัติ | `CRON_SECRET` | ถ้าใช้ cron |
| 📅 วันหยุดราชการ | `GOOGLE_CALENDAR_API_KEY` | ไม่บังคับ |

รายละเอียดครบทุกตัวแปร → [.env.example](.env.example)

### 🏗 โครงสร้างโปรเจกต์

```text
src/
├── app/[locale]/          # หน้าเว็บ (th / en)
├── app/actions/           # Server Actions
├── app/api/               # API routes (รายงาน, แจ้งเตือน, offline)
├── components/            # UI ร่วม (sidebar, auth, notifications)
├── lib/                   # โค้ดช่วย (คลัง, ตารางงาน, สีกะ, …)
└── test/                  # Vitest
```

→ รายละเอียดเชิงลึก: [docs/architecture.md](docs/architecture.md) · [PROJECT_MAP.md](PROJECT_MAP.md) · [AGENTS.md](AGENTS.md)

---

## 📚 เอกสารเพิ่มเติม

| เอกสาร | อ่านเมื่อ |
| --- | --- |
| [docs/context.md](docs/context.md) | เริ่มงานใหม่ / onboard |
| [docs/prd.md](docs/prd.md) | ข้อกำหนดฟีเจอร์ |
| [docs/design.md](docs/design.md) | มาตรฐาน UI (สี, ธีม, pastel) |
| [docs/database.md](docs/database.md) | ตารางและสิทธิ์ฐานข้อมูล |
| [docs/api.md](docs/api.md) | Server Actions และ API |
| [docs/SOP.md](docs/SOP.md) | ขั้นตอนพัฒนา |
| [docs/changelog.md](docs/changelog.md) | สิ่งที่เปลี่ยนแต่ละเวอร์ชัน |

---

## 🤝 การมีส่วนร่วม

1. อ่าน [docs/SOP.md](docs/SOP.md) และ [docs/design.md](docs/design.md) ก่อนแก้โค้ด
2. ใช้ `font-normal` เท่านั้น (Zero-Bold Policy)
3. รัน `npm test` และ `npm run build` ก่อนส่ง PR
4. แก้เฉพาะส่วนที่เกี่ยวกับงาน — อย่าย้ายไฟล์ที่ไม่จำเป็น

---

## 📄 License

สงวนลิขสิทธิ์ — ซอฟต์แวร์ภายในองค์กร **BLACK AND BREW** ห้ามนำไปใช้ แจกจ่าย หรือเผยแพร่โดยไม่ได้รับอนุญาต
