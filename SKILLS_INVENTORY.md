# SKILLS INVENTORY

> Version: 6.9 | Last Updated: 2026-06-07 | Format: Zero-Bold Policy Active
เอกสารฉบับนี้รวบรวมทักษะระบบ (System Skills) และความสามารถเชิงเทคนิคของโปรเจกต์ BLACKANDBREW ERP โดยจัดกลุ่มเป็น 4 โมดูลหลัก เพื่อลด Context Tax ขจัดข้อความซ้ำซ้อน และเพิ่มความแม่นยำในการเรียกใช้เครื่องมือของ Agent

---

## MODULE 1: MOBILE_UX_ARCHITECT

Description: ทักษะสถาปัตยกรรมจัดระเบียบเลย์เอาท์ การปรับสัดส่วน Element และระบบควบคุมสำหรับหน้าจอ Mobile View รวมถึงตารางและการแสดงผล

| Skill Specification | Trigger Criteria | Technical Implementation |
| --- | --- | --- |
| Layout Compactness & Single-Row Grid | เมื่อต้องปรับปรุง UI สำหรับ Mobile View หรือต้องการลดพื้นที่หน้าจอ | ยุบรวมอินพุตและปุ่มคำสั่งหลักด้วย Flexbox (flex-row) หรือ Grid คงที่แถวเดียวเสมอ |
| Segmented Controls & Action Switches | เมื่อต้องสร้างปุ่มสลับสถานะคู่ (เช่น รับเข้า/นำออก) | ใช้ Container ขอบมนกลม (rounded-full) สลับสีพื้นหลังสว่างเพื่อแสดงสถานะที่เลือก |
| Resizable Tables & LocalStorage | เมื่อผู้ใช้ต้องปรับความกว้างคอลัมน์ในตาราง เช่น หน้า Maintenance | โหลดความกว้างตอน SSR จากนั้นใช้ useEffect ดึงจาก localStorage และดักจับ Mouse Event เพื่อปรับขนาด |
| Sticky Freezing & Layer Isolation | เมื่อสร้างหน้าต่างย่อย (Modal) ที่มีข้อมูลตารางยาว | ใช้คลาส sticky top-0 ตรึงส่วนหัว จำกัดความสูงกล่องข้อมูลหลักด้วย max-h และเปิด overflow-y-auto |

## MODULE 2: HYBRID_CONTEXT_ENGINE

Description: ทักษะระบบดักจับพิกัด การทำงานร่วมกับ UI และสแกนข้อความบนหน้าต่างย่อย เพื่อส่งต่อเป็น clientContext เข้าสู่สมอง AI แบบ Real-time

| Skill Specification | Trigger Criteria | Technical Implementation |
| --- | --- | --- |
| Live Screen Extraction (Modal Context) | เมื่อ AI ต้องการบริบทสิ่งที่ผู้ใช้กำลังดูอยู่บนหน้าต่างย่อย | สแกน DOM ดึงข้อความจาก [role="dialog"] ส่งเข้า Request Payload (body: { clientContext }) สู่ AI |
| Coordinate & Interaction Tracking | เมื่อต้องตรวจสอบพิกัดการลากวาง (Drag-and-Drop) | อ้างอิง Sensor และ Physics Profile (Stiffness: 300, Damping: 30) จัดการ DOM Separation ให้เคลื่อนไหวลื่นไหล |
| Context Bootstrapping | เมื่อเริ่มต้นเซสชันใหม่กับ Agent | บังคับสแกน RepoMap เพื่อล็อกพิกัดไฟล์ ลดการอ่านไฟล์ขยะ และยึดโยงบริบทระบบอัตโนมัติก่อนลงมือแก้ไขรหัส |

## MODULE 3: SYSTEM_SECURITY_HARDENING

Description: ทักษะระบบรักษาความปลอดภัย การกรองคำสั่ง การตรวจสอบประเภทข้อมูล และการล็อกสิทธิ์การเข้าถึงผ่าน Server Actions

| Skill Specification | Trigger Criteria | Technical Implementation |
| --- | --- | --- |
| Input Sanitization & Prompt Injection Guard | เมื่อมีการรับข้อมูลจากผู้ใช้ภายนอกเข้าสู่ระบบ AI หรือ Database | ทำการกรองข้อความและอักขระพิเศษ ป้องกันคำสั่งแทรกซ้อน (Prompt Injection) อย่างเคร่งครัด |
| Type Validation Engine | เมื่อรับส่งข้อมูลผ่าน API หรือบันทึกข้อมูลเข้าฐานข้อมูล | ตรวจสอบโครงสร้างข้อมูลด้วย Zod Schema เพื่อบังคับชนิดตัวแปรให้ตรงตามมาตรฐานอย่างเคร่งครัด |
| Service Role & Privilege Escalation | เมื่อมีการอ่าน/เขียนข้อมูลสำคัญที่ข้ามข้อจำกัด RLS | ทำงานผ่าน Server Actions เท่านั้น และล็อกสิทธิ์ผู้ใช้ด้วย supabase.auth.getUser() ก่อนเริ่มดำเนินการ |
| Zero-Cache Data Integrity | เมื่อต้องการความถูกต้องของข้อมูลสต็อกและประวัติธุรกรรม | บังคับใช้ unstable_noStore() ป้องกัน Next.js จำค่าเก่า และจัดการ Transaction ด้วย Row Lock (FOR UPDATE) |
| Secure Server Auth Gate, sessionStorage Isolation & Anti-Brute Force | เมื่อเข้าสู่แอปพลิเคชันหรือมีการตรวจสอบสิทธิ์บาริสต้า | `verifyPin()` Server Action + httpOnly cookies; sessionStorage tab isolation; read-only PIN `111222` via `assertWritableSession()`; brute-force lockout 5 attempts / 15 min in localStorage |
| Inventory Stock Single Source of Truth | เมื่อแก้ไข stock ในคลังหรือหน้าตรวจนับ | RPC `set_inventory_stock` + `mergeInventoryRealtimeUpdate()` — ห้ามแทนที่ทั้งแถวจาก partial realtime payload |
| Premium Motion System (v6.9) | เมื่อสร้าง modal, route transition, toast | ใช้ `motion-presets.ts`, `PageTransition`, CSS `.bb-modal-*` — animate opacity/transform เท่านั้น |

## MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY

Description: ทักษะการเพิ่มประสิทธิภาพการทำงานของระบบ การลดการใช้ Token และการจัดการหน่วยความจำของแอปพลิเคชัน

| Skill Specification | Trigger Criteria | Technical Implementation |
| --- | --- | --- |
| Thai Token Optimizer (String Truncation) | เมื่อต้องการประมวลผลข้อความภาษาไทยเข้าสู่ AI Context | ใช้งานระบบ thaiTokenOptimizer ยุบรวมคำและตัดคำเยิ่นเย้อเพื่อประหยัด Token ใน Prompt |
| Render Caching & Reference Stability | เมื่อพบปัญหา React Re-render ซ้ำซ้อนจากการส่ง Props | บังคับใช้ useMemo สำหรับออบเจกต์ และ useCallback สำหรับฟังก์ชัน เพื่อล็อก Reference ใน Memory |
| Restricted Query Fetching | เมื่อดึงข้อมูลจากฐานข้อมูล Supabase เข้าสู่ระบบ | ระบุชื่อฟิลด์แบบเจาะจง (เช่น select('id, name')) ห้ามดึงทุกฟิลด์เพื่อลด Payload และการใช้ RAM |
| Persistent Zero & Numeric Sanitization | เมื่อรับค่าตัวเลขจากฟอร์ม | ป้องกันค่าว่างเข้าสู่ฐานข้อมูล ตัดเลข 0 นำหน้า และแปลงเป็นตัวเลขโดยสมบูรณ์ |
| Sliding Window Memory | เมื่อส่งประวัติแชทให้ AI | ตัดประวัติแชทเหลือเฉพาะ 4 ข้อความล่าสุด (messages.slice(-4)) ป้องกัน Token บวมสะสม |
| Ultra-Minimalist System Prompt | เมื่อกำหนดคำสั่งหลักให้ AI | ลดขนาด System Prompt เหลือเฉพาะกฎเหล็ก และแนบ Context แบบมีเงื่อนไข |
| AI Output Token Capping | เมื่อเรียกใช้ AI Model | กำหนด maxOutputTokens: 600 และ temperature: 0.1 เพื่อประหยัดโควตา |
| Surgical Tools Partitioning | เมื่อพัฒนา AI Tools | สร้างเครื่องมือเฉพาะกิจ (เช่น getTodaySchedule) ดึงเฉพาะตารางที่จำเป็น แทนการดึงข้อมูลภาพรวม |
| Computed Auto-Ordering Logic | เมื่อคำนวณจำนวนที่ต้องสั่งซื้อในตารางสต็อก | ใช้ React Math State คำนวณ (target_stock - stock) แบบ Real-time |
