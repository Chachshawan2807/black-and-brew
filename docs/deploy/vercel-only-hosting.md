# Hosting: Vercel only (ถอด Netlify)

BLACKANDBREW ERP deploy บน **Vercel** เท่านั้น (`vercel.json`, `docs/architecture.md`). ใน repo **ไม่มี** `netlify.toml` หรือ config Netlify การเชื่อม Netlify มาจาก **GitHub App / Netlify site ที่สร้างแยก**

## ทำไม PR ถึงมี Netlify Deploy Preview

ถ้าเห็น check `netlify/blackandbrew/deploy-preview` บน GitHub แปลว่า Netlify ยังติดตั้งเป็น GitHub App อยู่ ไม่ได้มาจากไฟล์ config ใน repo นี้

## ถอด Netlify (ทำครั้งเดียว)

1. **Netlify Dashboard** → Site **blackandbrew** → **Site configuration** → **Build & deploy** → **Continuous deployment** → **Link repository** → **Unlink** (หรือลบ site)
2. **GitHub** → **Settings** → **Integrations** → **Applications** → **Netlify** → **Configure** → ถอดสิทธิ์ repo `Chachshawan2807/black-and-brew` หรือ **Uninstall**
3. ตรวจ PR ใหม่ ควรเหลือแค่ Vercel (ถ้า Vercel Git ยังผูกอยู่)

## Vercel Production หลัง merge

เมื่อ Vercel ผูก GitHub และ Production Branch = `main` การ merge PR ควร trigger deploy อัตโนมัติ

ถ้า Vercel Deployments ยังชี้ commit เก่า (เช่น `6afc854`) แต่ GitHub `main` ใหม่กว่า:

1. Vercel → Project → **Deployments** → **Deploy** → เลือก branch **`main`** (Redeploy)
2. **Settings** → **Git** → ตรวจ **Production Branch** = `main`, repo ถูกต้อง, ไม่ Pause deployments
3. หลัง deploy สำเร็จ เปิด Production URL แล้ว hard refresh (มือถือ: ปิดแท็บ PWA แล้วเปิดใหม่)

## ตรวจว่า fix ขึ้น Production แล้ว

ใน Vercel deployment ล่าสุดของ Production ควรเห็น commit message ที่มี `fix(schedule): make mgmt modal pickers clickable` หรือ commit ใหม่กว่านั้น
