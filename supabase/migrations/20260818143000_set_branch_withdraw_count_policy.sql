-- Set branch-withdraw count policy: only listed items are ต้องเบิก (exact_count).
-- All other inventory items become ไม่ต้องเบิก (sufficiency_check).

UPDATE public.inventory_items
SET count_policy = 'sufficiency_check';

UPDATE public.inventory_items
SET count_policy = 'exact_count'
WHERE name IN (
  'มัทฉะ บลูคอฟ',
  'นมข้นหวาน',
  'นมโอ๊ต',
  'ชาตรามือ',
  'น้ำมะพร้าว',
  'ถุงหิ้ว 7*15',
  'ถุงหิ้วแก้วเดี่ยว 4*14',
  'ถุงหิ้วแก้วคู่',
  'แก้วร้อน 8 ออนซ์',
  'ฝาแก้วร้อน 8 ออนซ์',
  'กล่องเค้ก 130x83x91 มม.',
  'ถ้วยแยกกาแฟ',
  'ขนมมอลคิสท์ แครกเกอร์'
);
