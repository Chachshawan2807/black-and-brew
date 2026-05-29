/**
 * EXECUTIVE RULES MODULE
 * This module defines the business logic and thresholds for the AI Agent.
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
  scheduling_integrity: {
    atomic_weekly_flush_protocol:
      'เมื่อดำเนินการ "คัดลอกสัปดาห์ก่อนหน้า" ระบบต้อง (1) คำนวณช่วงวันที่แบบ Zoned Time (Asia/Bangkok) (2) ลบกะงานเดิมในสัปดาห์เป้าหมายทั้งหมด 7 วันทิ้งก่อนเสมอ เพื่อป้องกันการชนกันของข้อมูล (Conflict) (3) ใช้ delay 500ms ก่อนดึงข้อมูลใหม่เพื่อป้องกัน Latency Sync',
    timezone_anchor: 'Asia/Bangkok (GMT+7) เท่านั้น'
  },
  scheduling: {
    min_staff_per_shift: 2,
    peak_hours: ['08:00', '12:00', '15:00'],
    shift_readiness_criteria: 'ต้องมีพนักงานระดับ Senior อย่างน้อย 1 คนในทุกกะ'
  },
  thai_response_templates: {
    low_stock_summary: {
      trigger: 'เมื่อตรวจพบสินค้าที่ stock < order_point จากการประเมิน in-memory',
      header: '📦 สรุปรายการสินค้าที่ต้องสั่งเติม',
      format_rules: [
        'แสดงเป็นรายการ (list) โดยเรียงจากสินค้าที่ขาดมากที่สุดก่อน',
        'แต่ละรายการต้องแสดงครบ 4 ฟิลด์ตามลำดับนี้:',
        '  1) ชื่อสินค้า (name)',
        '  2) สต็อกปัจจุบัน (stock) พร้อมหน่วย (unit)',
        '  3) จุดสั่งซื้อ (order_point)',
        '  4) จำนวนแนะนำให้สั่งเติม = order_qty ถ้า order_qty > 0 มิฉะนั้นใช้ max(target_stock - stock, 0)',
      ],
      example_format:
        '• ชื่อสินค้า — สต็อก: X หน่วย | จุดสั่งซื้อ: Y | แนะนำสั่ง: Z หน่วย',
      footer: 'ปิดท้ายด้วยจำนวนรวมของรายการที่ต้องสั่ง เช่น "รวม N รายการที่ต้องเติมสต็อก"',
      empty_case: 'ถ้าไม่มีสินค้าใดต่ำกว่า order_point ให้ตอบว่า "สต็อกทุกรายการอยู่ในระดับปกติ ไม่มีรายการใดต้องสั่งเติมในขณะนี้"',
    },
    upcoming_maintenance_summary: {
      trigger: 'เมื่อผู้ใช้ถามเกี่ยวกับสถานะซ่อมบำรุงหรือความเร่งด่วนของอุปกรณ์',
      header: '🔧 สรุปสถานะการซ่อมบำรุงอุปกรณ์',
      format_rules: [
        'แสดงเป็นรายการ (list) โดยเรียงจากอุปกรณ์ที่เร่งด่วนที่สุดก่อน',
        'แต่ละรายการต้องแสดงครบ 3 ฟิลด์ตามลำดับนี้:',
        '  1) ชื่ออุปกรณ์ (equipment)',
        '  2) อาการ/ปัญหาล่าสุด (detected_problem)',
        '  3) คำแนะนำการซ่อมบำรุงเบื้องต้น — สรุปจาก work_details, recommended_frequency, และ status',
      ],
      urgency_logic: [
        'จัดลำดับความเร่งด่วนโดยใช้กฎต่อไปนี้:',
        '  - status = "pending" หรือ "in_progress" ถือว่ายังไม่เสร็จ → เร่งด่วนกว่า "completed"',
        '  - ถ้ามี recommended_frequency ให้คำนวณจาก start_date + frequency ว่าเกินวันปัจจุบันหรือยัง',
        '  - ถ้าไม่มี recommended_frequency ให้ประเมินจากความรุนแรงของ detected_problem',
      ],
      example_format:
        '• ชื่ออุปกรณ์ — ปัญหา: [detected_problem] | แนะนำ: [คำแนะนำสั้น ๆ จาก work_details]',
      empty_case: 'ถ้าไม่มีรายการซ่อมบำรุงค้างอยู่ ให้ตอบว่า "ไม่มีรายการซ่อมบำรุงที่ค้างอยู่ในขณะนี้ อุปกรณ์ทุกรายการอยู่ในสถานะปกติ"',
    },
  },
  business_goals: {
    focus: 'เน้นความรวดเร็วในการให้บริการและรักษาคุณภาพของวัตถุดิบ',
    slogan: 'Black-and-Brew: The Perfect Balance'
  }
};

export type ExecutiveRules = typeof EXECUTIVE_RULES;