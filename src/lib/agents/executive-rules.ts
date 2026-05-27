/**
 * EXECUTIVE RULES MODULE
 * * This module defines the business logic and thresholds for the AI Agent.
 * It provides context for decision making and analysis.
 */

export const EXECUTIVE_RULES = {
  database_map: {
    inventory_items: "ตารางหลักเก็บรายการสินค้าคงคลัง (คอลัมน์: id, name, unit, source, order_point, target_stock, stock, order_qty — ห้ามใช้ item_name, quantity, min_stock)",
    inventory_transactions: "ตารางประวัติการเคลื่อนไหวสต็อก (ใช้ดูการรับเข้า IN และการเบิกจ่าย OUT ย้อนหลัง)",
    profiles: "ตารางรายชื่อพนักงานทั้งหมดในร้าน (ใช้เชื่อมโยงกับ employee_id เพื่อหาชื่อพนักงาน)",
    shifts: "ตารางกะการทำงานและวันลาของพนักงาน (ใช้ดูตารางงานล่วงหน้า โดยเช็กจาก start_time และ end_time)",
    service_records: "ตารางประวัติการซ่อมบำรุง (คอลัมน์: id, start_date, equipment, detected_problem, task_type, work_details, cost, recommended_frequency, person_in_charge, status, completion_date, notes — ห้ามใช้ machine_name, maintenance_date, operator, description, recorded_at)",
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
  ai_processing_rules: {
    in_memory_comparison_policy:
      'เมื่อคำถามต้องใช้การเปรียบเทียบ/อสมการ/คำนวณ (เช่น stock < order_point หรือการประเมินงานซ่อมใกล้ครบกำหนด) ให้ดึงข้อมูลด้วย readTable ตาม preset ก่อน แล้วประมวลผล filter/sort/calculate ในหน่วยความจำของ AI เอง ห้ามคาดหวังให้ readTable filter แบบ <, >, <=, >= ที่ฝั่งฐานข้อมูล',
    inventory_low_stock_evaluation:
      'ขั้นตอนบังคับ: (1) อ่าน inventory_items ตาม preset (2) วนตรวจทุกแถว (3) ถ้า stock < order_point ให้จัดเป็น low stock (4) suggested order quantity ใช้ order_qty ถ้ามีค่ามากกว่า 0 ไม่เช่นนั้นใช้ target_stock - stock (ขั้นต่ำไม่ต่ำกว่า 0)',
    service_records_comparison_evaluation:
      'สำหรับ service_records ที่ต้องเทียบความถี่/วันครบกำหนด ให้คำนวณจากข้อมูลในแถวทั้งหมดแบบ in-memory หลังดึงจาก readTable แล้วค่อยสรุปลำดับความเร่งด่วน',
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