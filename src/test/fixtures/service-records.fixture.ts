/** Snapshot from Supabase public.service_records (BLACK-AND-BREW). */
import type { MaintenanceServiceRecord } from '@/lib/maintenance/types';

export const REAL_SERVICE_RECORD_REFERENCE_DATE = '2026-09-01';

export const REAL_EQUIPMENT_NAMES = [
  "เครื่องกรองน้ำเครื่องทำน้ำแข็ง",
  "เครื่องทำน้ำแข็ง",
  "เครื่องบดกาแฟคั่วกลาง",
  "เครื่องบดกาแฟคั่วเข้ม",
  "ซิงค์ล้างจานในครัว",
  "ซิงค์ล้างจานบาร์ชง",
  "ตู้แช่แข็ง",
  "ท่อระบายน้ำเครื่องชงกาแฟ",
  "ท่อระบายน้ำเครื่องล้างแก้ว",
  "ยางรองหัวชง",
  "ไส้กรอง Carbon เครื่องชง",
  "ไส้กรอง Carbon เครื่องทำน้ำแข็ง",
  "ไส้กรอง PP เครื่องชง",
  "ไส้กรอง PP เครื่องทำน้ำแข็ง",
  "ไส้กรอง Resin เครื่องชง",
  "ไส้กรอง Resin เครื่องทำน้ำแข็ง",
  "แอร์ 1 หน้าครัว",
  "แอร์ 2 ตู้เย็น",
  "แอร์ 3 ห้องคั่ว"
] as const;

export const REAL_SERVICE_RECORDS: MaintenanceServiceRecord[] = [
  {
    "id": "db718e9c-38d5-4fe5-8848-0e05a11b26b1",
    "start_date": "2026-08-23",
    "equipment": "ไส้กรอง PP เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-08-25"
  },
  {
    "id": "54c2f82c-4764-48a5-8a74-d77e5bf243b1",
    "start_date": "2026-08-23",
    "equipment": "ไส้กรอง PP เครื่องทำน้ำแข็ง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-08-25"
  },
  {
    "id": "f680e7f0-4d97-49db-9b3b-e673bc66ea4f",
    "start_date": "2026-08-14",
    "equipment": "ท่อระบายน้ำเครื่องชงกาแฟ",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": null,
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-08-25"
  },
  {
    "id": "2a45b75c-7e35-4f54-8cde-09648161c996",
    "start_date": "2026-08-02",
    "equipment": "ยางรองหัวชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": "เปลี่ยนยางรองหัวชง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-08-25"
  },
  {
    "id": "9439a81e-520c-466d-862b-6535746bf06d",
    "start_date": "2026-07-26",
    "equipment": "ซิงค์ล้างจานในครัว",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยโซดาไฟ",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-26"
  },
  {
    "id": "8f5dc540-5802-4f55-b980-374852a94ab1",
    "start_date": "2026-07-26",
    "equipment": "ท่อระบายน้ำเครื่องชงกาแฟ",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยโซดาไฟ",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-26"
  },
  {
    "id": "89b09400-ab37-4a11-83b2-8d1aa98eee9c",
    "start_date": "2026-07-26",
    "equipment": "ซิงค์ล้างจานบาร์ชง",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยโซดาไฟ",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-26"
  },
  {
    "id": "4d65398d-6f4f-48a1-a01d-a1497463572c",
    "start_date": "2026-07-26",
    "equipment": "ท่อระบายน้ำเครื่องล้างแก้ว",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยโซดาไฟ",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-26"
  },
  {
    "id": "fc5c0648-7ab9-44a0-8bc3-bf79689dd91f",
    "start_date": "2026-07-06",
    "equipment": "แอร์ 1 หน้าครัว",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยช่าง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "b8401c66-1d63-4670-b557-1b75f9d2622a",
    "start_date": "2026-07-06",
    "equipment": "แอร์ 3 ห้องคั่ว",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยช่าง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-07-26"
  },
  {
    "id": "998e4272-d8a1-48e5-b4c0-b2e60c07a858",
    "start_date": "2026-07-06",
    "equipment": "แอร์ 2 ตู้เย็น",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยช่าง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "b6020422-1eab-43f6-9773-2d46ab750d60",
    "start_date": "2026-06-26",
    "equipment": "ไส้กรอง Resin เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 6 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "7bc7bf79-6a5d-42e9-b767-f30a7b1adeff",
    "start_date": "2026-06-26",
    "equipment": "ไส้กรอง PP เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "75b31699-7851-4b6a-a8b9-af43fc175c14",
    "start_date": "2026-06-26",
    "equipment": "ไส้กรอง Carbon เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 6 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "cf8d0ccb-5858-4a92-8bff-06676593ace5",
    "start_date": "2026-06-11",
    "equipment": "ไส้กรอง Carbon เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 6 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "a8f4962c-ad61-4766-b35e-49147af94552",
    "start_date": "2026-06-11",
    "equipment": "ไส้กรอง Resin เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 6 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "1186bad7-800b-4449-9ade-ab211a465e9f",
    "start_date": "2026-06-11",
    "equipment": "ไส้กรอง Resin เครื่องทำน้ำแข็ง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 6 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "0b5fcf18-0a78-443f-a00a-200f15cd25a2",
    "start_date": "2026-06-11",
    "equipment": "ไส้กรอง Carbon เครื่องทำน้ำแข็ง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 6 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "f8b6e35b-d2a1-4c4f-9cde-83bf1f6a5aaf",
    "start_date": "2026-06-10",
    "equipment": "เครื่องกรองน้ำเครื่องทำน้ำแข็ง",
    "detected_problem": "ไส้กรองใหญ่ด้านบนแตก",
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": "เปลี่ยนไส้กรองใหญ่ด้านบนเครื่อง",
    "recommended_frequency": "ตามความเหมาะสม",
    "completion_date": "2026-07-16"
  },
  {
    "id": "f0ace712-4a7a-4869-ae0a-5776c8a689c9",
    "start_date": "2026-05-14",
    "equipment": "ไส้กรอง PP เครื่องทำน้ำแข็ง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "0c78be51-8de7-4656-821f-e677c03d42e8",
    "start_date": "2026-05-14",
    "equipment": "ไส้กรอง PP เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "5064f215-30ad-429c-8c51-0cdff97d6033",
    "start_date": "2026-04-19",
    "equipment": "เครื่องทำน้ำแข็ง",
    "detected_problem": "มีคราบตะไคร่",
    "task_type": "บำรุงรักษา",
    "work_details": "ถอดล้างทำความสะอาดอย่างละเอียด",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "2b68b1c3-409e-4ab3-906e-2f302e7f6601",
    "start_date": "2026-04-08",
    "equipment": "ตู้แช่แข็ง",
    "detected_problem": "ตู้แช่แข็งไม่เย็น",
    "task_type": "ซ่อมแซม",
    "work_details": "เชื่อมระบบน้ำยาใหม่",
    "recommended_frequency": "ตามความเหมาะสม",
    "completion_date": "2026-07-16"
  },
  {
    "id": "f4c227af-bcb4-4ec2-9a56-582f92c27115",
    "start_date": "2026-03-31",
    "equipment": "แอร์ 1 หน้าครัว",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยช่าง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "e9acfdd1-b571-48cb-a136-378c5c84deda",
    "start_date": "2026-03-31",
    "equipment": "แอร์ 2 ตู้เย็น",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยช่าง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "34be4a4b-1583-485c-9c95-a14a3f1a51d3",
    "start_date": "2026-03-31",
    "equipment": "แอร์ 3 ห้องคั่ว",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยช่าง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "ac570820-5931-4bde-8741-ea34ba1e400a",
    "start_date": "2026-03-07",
    "equipment": "ไส้กรอง PP เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "30f28515-672e-448e-b0f3-8f4712cc156b",
    "start_date": "2026-03-07",
    "equipment": "ไส้กรอง PP เครื่องทำน้ำแข็ง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "d0e8a47b-3452-46f4-8cfb-78f029374a5d",
    "start_date": "2026-02-26",
    "equipment": "ท่อระบายน้ำเครื่องชงกาแฟ",
    "detected_problem": "น้ำระบายช้า",
    "task_type": "บำรุงรักษา",
    "work_details": "ทำความสะอาดด้วยโซดาไฟและล้วงท่อ",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "53b7f716-a753-4b58-914c-c5abfdfeab04",
    "start_date": "2026-02-26",
    "equipment": "ท่อระบายน้ำเครื่องล้างแก้ว",
    "detected_problem": "น้ำระบายช้า",
    "task_type": "บำรุงรักษา",
    "work_details": "ทำความสะอาดด้วยโซดาไฟและล้วงท่อ",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "c8c0237a-8ddc-495e-bd6d-415df1277d5a",
    "start_date": "2026-01-06",
    "equipment": "ไส้กรอง Resin เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": "เปลี่ยนไส้กรองเครื่องกรองน้ำใต้บาร์ชงทั้งหมด",
    "recommended_frequency": "ทุก 6 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "7a25a2b9-6973-4c31-902e-6af9c6d9edce",
    "start_date": "2026-01-06",
    "equipment": "ไส้กรอง Carbon เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": "เปลี่ยนไส้กรองเครื่องกรองน้ำใต้บาร์ชงทั้งหมด",
    "recommended_frequency": "ทุก 6 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "60afa33e-4f33-4111-978a-22808ac9e639",
    "start_date": "2026-01-06",
    "equipment": "ท่อระบายน้ำเครื่องล้างแก้ว",
    "detected_problem": "ท่ออุดตันและน้ำล้น",
    "task_type": "ซ่อมแซม",
    "work_details": "ล้างทำความสะอาดสิ่งอุดตันที่ท่อระบายด้านนอก",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "463d7f13-48ef-4dca-9306-1cb95d9eff64",
    "start_date": "2026-01-06",
    "equipment": "ไส้กรอง PP เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": "เปลี่ยนไส้กรองเครื่องกรองน้ำใต้บาร์ชงทั้งหมด",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "126bf297-8c17-42ea-bb86-edc33d0a2327",
    "start_date": "2026-01-06",
    "equipment": "ท่อระบายน้ำเครื่องชงกาแฟ",
    "detected_problem": "ท่ออุดตันและน้ำล้น",
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดสิ่งอุดตันที่ท่อระบายด้านนอก",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "d008856a-1650-4a59-9fc8-c3e1f86e8b4a",
    "start_date": "2026-01-05",
    "equipment": "เครื่องบดกาแฟคั่วกลาง",
    "detected_problem": "ใช้เวลาบดนานเกินไป",
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": "เปลี่ยนเฟืองบดใหม่",
    "recommended_frequency": "ตามความเหมาะสม",
    "completion_date": "2026-07-15"
  },
  {
    "id": "c30eb501-ca7f-4d8b-90ad-3d550a1ea960",
    "start_date": "2026-01-05",
    "equipment": "เครื่องบดกาแฟคั่วเข้ม",
    "detected_problem": "ใช้เวลาบดนานเกินไป",
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": "เปลี่ยนเฟืองบดใหม่",
    "recommended_frequency": "ตามความเหมาะสม",
    "completion_date": "2026-07-15"
  },
  {
    "id": "d3c49204-9918-4342-bb7b-b6b663cb8602",
    "start_date": "2025-12-23",
    "equipment": "เครื่องทำน้ำแข็ง",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดถังพักน้ำแข็ง",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-05-27"
  },
  {
    "id": "7c9f1d8d-7ca4-46be-a3f8-703893945948",
    "start_date": "2025-11-18",
    "equipment": "ท่อระบายน้ำเครื่องล้างแก้ว",
    "detected_problem": "น้ำระบายช้าและล้นออก",
    "task_type": "บำรุงรักษา",
    "work_details": "ทำความสะอาดด้วยโซดาไฟและล้วงท่อ",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "6495ddf3-d2b3-487c-a16c-dcfed51fb08a",
    "start_date": "2025-11-18",
    "equipment": "เครื่องบดกาแฟคั่วเข้ม",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ถอดทำความสะอาดเฟืองบด",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "0bc96008-9f5a-47da-840c-60bab5838f76",
    "start_date": "2025-11-18",
    "equipment": "ท่อระบายน้ำเครื่องชงกาแฟ",
    "detected_problem": "น้ำระบายช้าและล้นออก",
    "task_type": "บำรุงรักษา",
    "work_details": "ทำความสะอาดด้วยโซดาไฟและล้วงท่อ",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "91b41271-1a38-45b3-b7da-dd5a34d72cf7",
    "start_date": "2025-11-12",
    "equipment": "ยางรองหัวชง",
    "detected_problem": "เก่าและมีสภาพแข็ง",
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": "เปลี่ยนยางรองหัวชงใหม่ทั้ง 2 หัวชง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-08-25"
  },
  {
    "id": "d8cfd800-5165-4be6-a876-8cbc11e8d5c6",
    "start_date": "2025-10-31",
    "equipment": "แอร์ 3 ห้องคั่ว",
    "detected_problem": "คอยล์เย็นรั่ว",
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": "เปลี่ยนแอร์เครื่องใหม่",
    "recommended_frequency": "ตามความเหมาะสม",
    "completion_date": "2026-07-15"
  },
  {
    "id": "b5c0ab5c-30b2-456d-8bf2-552172d784a0",
    "start_date": "2025-10-30",
    "equipment": "แอร์ 3 ห้องคั่ว",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยช่าง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "7923621d-cd01-4070-9363-4089d81e7dfb",
    "start_date": "2025-10-30",
    "equipment": "แอร์ 1 หน้าครัว",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยช่าง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "6bf77e9c-78ff-4049-8f17-3db5ae362907",
    "start_date": "2025-10-30",
    "equipment": "แอร์ 2 ตู้เย็น",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยช่าง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "298e27b9-0562-48d1-8456-d25735e46d3a",
    "start_date": "2025-10-29",
    "equipment": "ตู้แช่แข็ง",
    "detected_problem": "น้ำแข็งเกาะหนาที่ด้านล่างตู้",
    "task_type": "บำรุงรักษา",
    "work_details": "ละลายน้ำแข็งและทำความสะอาดทั้งหมด",
    "recommended_frequency": "ตามความเหมาะสม",
    "completion_date": "2026-05-16"
  },
  {
    "id": "a0c4cae2-607f-42c7-9bf0-41e58bd95740",
    "start_date": "2025-08-17",
    "equipment": "ไส้กรอง PP เครื่องทำน้ำแข็ง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": "เปลี่ยนไส้กรองเครื่องกรองน้ำเครื่องทำน้ำแข็งทั้งหมด",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "91148834-1f38-421c-94c0-99ae983e8783",
    "start_date": "2025-08-17",
    "equipment": "ไส้กรอง Carbon เครื่องทำน้ำแข็ง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": "เปลี่ยนไส้กรองเครื่องกรองน้ำเครื่องทำน้ำแข็งทั้งหมด",
    "recommended_frequency": "ทุก 6 เดือน",
    "completion_date": "2026-07-15"
  },
  {
    "id": "653dca58-7981-46d5-a174-3cddda0bd561",
    "start_date": "2025-08-17",
    "equipment": "ไส้กรอง Resin เครื่องทำน้ำแข็ง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": "เปลี่ยนไส้กรองเครื่องกรองน้ำเครื่องทำน้ำแข็งทั้งหมด",
    "recommended_frequency": "ทุก 6 เดือน",
    "completion_date": "2026-07-15"
  }
];

/** Latest scheduled rows used in compute/filter integration tests. */
export const REAL_SCHEDULED_SAMPLE_RECORDS: MaintenanceServiceRecord[] = [
  {
    "id": "f680e7f0-4d97-49db-9b3b-e673bc66ea4f",
    "start_date": "2026-08-14",
    "equipment": "ท่อระบายน้ำเครื่องชงกาแฟ",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": null,
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-08-25"
  },
  {
    "id": "db718e9c-38d5-4fe5-8848-0e05a11b26b1",
    "start_date": "2026-08-23",
    "equipment": "ไส้กรอง PP เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-08-25"
  },
  {
    "id": "b8401c66-1d63-4670-b557-1b75f9d2622a",
    "start_date": "2026-07-06",
    "equipment": "แอร์ 3 ห้องคั่ว",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยช่าง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-07-26"
  }
];

/** Overdue + horizon mix for month/week filter tests. */
export const REAL_MONTH_FILTER_SAMPLE_RECORDS: MaintenanceServiceRecord[] = [
  {
    "id": "89b09400-ab37-4a11-83b2-8d1aa98eee9c",
    "start_date": "2026-07-26",
    "equipment": "ซิงค์ล้างจานบาร์ชง",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยโซดาไฟ",
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-26"
  },
  {
    "id": "b8401c66-1d63-4670-b557-1b75f9d2622a",
    "start_date": "2026-07-06",
    "equipment": "แอร์ 3 ห้องคั่ว",
    "detected_problem": null,
    "task_type": "บำรุงรักษา",
    "work_details": "ล้างทำความสะอาดด้วยช่าง",
    "recommended_frequency": "ทุก 3 เดือน",
    "completion_date": "2026-07-26"
  }
];

/** Old + new history for the same asset (PP filter). */
export const REAL_PP_FILTER_DEDUP_RECORDS: MaintenanceServiceRecord[] = [
  {
    "id": "7bc7bf79-6a5d-42e9-b767-f30a7b1adeff",
    "start_date": "2026-06-26",
    "equipment": "ไส้กรอง PP เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-07-16"
  },
  {
    "id": "db718e9c-38d5-4fe5-8848-0e05a11b26b1",
    "start_date": "2026-08-23",
    "equipment": "ไส้กรอง PP เครื่องชง",
    "detected_problem": null,
    "task_type": "เปลี่ยนอะไหล่",
    "work_details": null,
    "recommended_frequency": "ทุก 1 เดือน",
    "completion_date": "2026-08-25"
  }
];

/** Due within a week vs later for week-filter edge test. */
export const REAL_WEEK_FILTER_SOON_RECORD: MaintenanceServiceRecord = {
  "id": "6495ddf3-d2b3-487c-a16c-dcfed51fb08a",
  "start_date": "2025-11-18",
  "equipment": "เครื่องบดกาแฟคั่วเข้ม",
  "detected_problem": null,
  "task_type": "บำรุงรักษา",
  "work_details": "ถอดทำความสะอาดเฟืองบด",
  "recommended_frequency": "ทุก 1 เดือน",
  "completion_date": "2026-07-15"
};

export const REAL_WEEK_FILTER_LATER_RECORD: MaintenanceServiceRecord = {
  "id": "b8401c66-1d63-4670-b557-1b75f9d2622a",
  "start_date": "2026-07-06",
  "equipment": "แอร์ 3 ห้องคั่ว",
  "detected_problem": null,
  "task_type": "บำรุงรักษา",
  "work_details": "ล้างทำความสะอาดด้วยช่าง",
  "recommended_frequency": "ทุก 3 เดือน",
  "completion_date": "2026-07-26"
};

export function pickServiceRecords(...ids: string[]): MaintenanceServiceRecord[] {
  const byId = new Map(REAL_SERVICE_RECORDS.map((record) => [record.id!, record]));
  return ids.map((id) => {
    const record = byId.get(id);
    if (!record) throw new Error(`Missing fixture service record: ${id}`);
    return record;
  });
}
