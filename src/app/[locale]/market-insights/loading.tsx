import React from 'react';

/**
 * Loading State สำหรับหน้า Market Insights
 */
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdfcf0] p-6 text-black antialiased">
      <div className="w-12 h-12 border-4 border-black/5 border-t-black rounded-full animate-spin mb-4" />
      <p className="font-normal text-sm text-black">บรู กำลังวิเคราะห์ข้อมูลตลาดให้สักครู่นะคะ...</p>
    </div>
  );
}