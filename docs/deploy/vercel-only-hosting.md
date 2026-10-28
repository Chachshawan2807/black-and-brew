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

ใน Vercel deployment ล่าสุดของ Production ควรเห็น commit message ที่ตรงกับ GitHub `main` ล่าสุด (เปรียบ SHA 7 ตัวแรก)

## ป้องกัน GitHub นำหน้า Vercel (production drift)

อาการ: push/merge ไป `main` แล้ว GitHub มี commit ใหม่ แต่ Vercel Production ยังเป็น commit เก่า (ไม่มี deployment ใหม่)

### ตรวจด้วย Vercel MCP / Dashboard (มนุษย์หรือ agent)

1. GitHub `main` HEAD (เช่น `gh api repos/.../commits/main --jq .sha`)
2. Vercel `list_deployments` ของ project `black-and-brew`, `target=production`, ดู `meta.githubCommitSha`
3. ต้อง **ตรงกัน** และ state **READY**

การเชื่อม Git ที่ถูกต้อง (ตรวจเมื่อ 2026-10-28):

| รายการ | ค่า |
| ------ | --- |
| Vercel project | `black-and-brew` (`prj_o9g154ROglqxrcfrPpW3CScEN1e2`) |
| Git link | GitHub `Chachshawan2807/black-and-brew`, branch `main` |
| Team | `chachshawan2807s-projects` |

### สคริปต์ใน repo

```powershell
# ต้องมี VERCEL_TOKEN (Account Settings → Tokens)
$env:VERCEL_TOKEN = "<token>"
npm run deploy:verify-production
```

รอให้ Vercel deploy จบหลัง push:

```powershell
npm run deploy:verify-production -- --wait-minutes 20
```

### GitHub Actions (แนะนำ)

Workflow `.github/workflows/vercel-production-sync.yml` รันหลัง push `main` แล้ว poll Vercel จน production SHA = `github.sha` หรือ fail

ตั้ง secret ครั้งเดียว:

1. Vercel → Account Settings → **Tokens** → สร้าง token (scope อ่าน deployments)
2. GitHub repo → **Settings → Secrets and variables → Actions** → `VERCEL_TOKEN`

ถ้ายังไม่ตั้ง secret workflow จะขึ้น warning อย่างเดียว ไม่ fail build

