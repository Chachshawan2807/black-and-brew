export function isStoreStatusQuery(text: string): boolean {
  return /วันนี้ร้าน|สถานะร้าน|ภาพรวมร้าน|ร้านเป็นยังไง|store.?status|สรุปวันนี้|น่าเป็นห่วง/i.test(
    text,
  );
}
