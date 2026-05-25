/**
 * EXECUTIVE RULES MODULE
 * * This module defines the business logic and thresholds for the AI Agent.
 * It provides context for decision making and analysis.
 */

export const EXECUTIVE_RULES = {
  database_map: {
    inventory_items: "ตารางหลักเก็บรายการสินค้าคงคลัง (ใช้ดู stock ปัจจุบัน, order_point จุดสั่งซื้อ, และ target_stock เป้าหมาย)",
    inventory_transactions: "ตารางประวัติการเคลื่อนไหวสต็อก (ใช้ดูการรับเข้า IN และการเบิกจ่าย OUT ย้อนหลัง)",
    profiles: "ตารางรายชื่อพนักงานทั้งหมดในร้าน (ใช้เชื่อมโยงกับ employee_id เพื่อหาชื่อพนักงาน)",
    shifts: "ตารางกะการทำงานและวันลาของพนักงาน (ใช้ดูตารางงานล่วงหน้า โดยเช็กจาก start_time และ end_time)",
    service_records: "ตารางประวัติการซ่อมบำรุง (ใช้ดูรอบล้างแอร์ เช็คอุปกรณ์ หรือค่าใช้จ่ายงานช่าง)",
    holidays: "ตารางบันทึกวันหยุดนักขัตฤกษ์ล่วงหน้า (ใช้ประกอบการประเมินความหนาแน่นของลูกค้า)"
  },
  inventory: {
    low_stock_threshold: 10, // Default threshold if not specified per item
    critical_stock_threshold: 5,
    unit_recommendations: {
      'beans': 'ควรสั่งเพิ่มเมื่อเหลือต่ำกว่า 5kg',
      'milk': 'ควรสั่งเพิ่มเมื่อเหลือต่ำกว่า 10 ลิตร',
    }
  },
  scheduling: {
    min_staff_per_shift: 2,
    peak_hours: ['08:00', '12:00', '15:00'],
    shift_readiness_criteria: 'ต้องมีพนักงานระดับ Senior อย่างน้อย 1 คนในทุกกะ'
  },
  business_goals: {
    focus: 'เน้นความรวดเร็วในการให้บริการและรักษาคุณภาพของวัตถุดิบ',
    slogan: 'Black-and-Brew: The Perfect Balance'
  }
};

export type ExecutiveRules = typeof EXECUTIVE_RULES;