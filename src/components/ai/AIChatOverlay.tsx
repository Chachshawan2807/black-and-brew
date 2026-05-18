'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, User, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

// Actual chat component containing useChat (only runs on client)
export default function AIChatOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI SDK v6 useChat API
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  // Hydration guard: prevent Math.random / browser-only globals during SSR
  useEffect(() => { setIsMounted(true); }, []);
  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const getActiveWindowContext = () => {
    if (typeof window === 'undefined') return "Current View: Main Dashboard";
    // Scans for active dialogs/modals
    const activeModal = document.querySelector('[role="dialog"]') || document.querySelector('.modal') || document.querySelector('[class*="Modal"]');
    if (!activeModal) return "Current View: Main Dashboard";

    const textContent = activeModal.textContent || "";
    // Clean up excessive whitespace/newlines to optimize tokens
    const cleanedText = textContent
      .replace(/\s+/g, ' ')
      .trim();

    // MODULE 3: SYSTEM_SECURITY_HARDENING (Input Sanitization)
    const sanitized = cleanedText
      .replace(/```[\s\S]*?```/g, '') // ลบ code blocks
      .replace(/\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>|###\s*(system|user|assistant)/gi, '') // ลบ injection tokens
      .replace(/ignore previous instructions?|forget (all|your|prior)|you are now|act as|jailbreak/gi, '') // ลบ jailbreak patterns
      .slice(0, 800); // จำกัดความยาวสูงสุด 800 ตัวอักษรเพื่อป้องกัน Token flooding

    return `Active Window Data:\n${sanitized}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    
    const liveScreenContext = getActiveWindowContext();
    sendMessage(
      { role: 'user', parts: [{ type: 'text', text: trimmed }] },
      { body: { clientContext: liveScreenContext } }
    );
    setInputValue('');
  };

  if (!isMounted) return null;

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-[200] w-14 h-14 rounded-full bg-[#000000] text-white flex items-center justify-center shadow-lg"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label="เปิดผู้ช่วย AI บรู"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={22} />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={26} height={26} className="w-[26px] h-[26px] object-contain invert" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click Outside Backdrop */}
            <motion.div
              key="chat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[198] bg-black/0"
            />
            <motion.div
              key="chat-window"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
              className="fixed bottom-24 right-6 z-[199] w-[340px] max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-xl border border-black/5 flex flex-col overflow-hidden"
              style={{ maxHeight: '70vh' }}
            >
            {/* Header */}
            <div className="px-5 py-4 border-b border-black/5 flex items-center gap-3 bg-[#fdfcf0]">
              <div className="w-8 h-8 rounded-2xl bg-black/5 flex items-center justify-center shrink-0 overflow-hidden">
                <Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={24} height={24} className="w-6 h-6 object-contain" />
              </div>
              <div>
                <p className="text-[14px] font-normal text-[#000000] leading-tight">บรู</p>
                <p className="text-[11px] font-normal text-[#1a1a1a] leading-tight">
                  AI ผู้ช่วยร้าน BLACKANDBREW
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-[200px]">
              {/* Welcome message */}
              {messages.length === 0 && (
                <ChatBubble
                  role="assistant"
                  content={`สวัสดีครับ ผมบรู ผู้ช่วย AI ของร้าน BLACKANDBREW 👋\n\nสามารถถามผมได้เลยครับ เช่น:\n• สต็อกวันนี้เป็นยังไงบ้าง?\n• มีสินค้าไหนที่ต้องสั่งซื้อ?\n• วันนี้ใครทำงานบ้าง?`}
                />
              )}

              {messages.map((msg) => {
                let textContent = (msg as any).content;
                if (!textContent && msg.parts && Array.isArray(msg.parts)) {
                  textContent = msg.parts
                    .filter((p: any) => p.type === 'text')
                    .map((p: any) => p.text)
                    .join('');
                }
                if (!textContent) return null;
                return <ChatBubble key={msg.id} role={msg.role} content={textContent} />;
              })}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 px-1">
                  <div className="w-7 h-7 rounded-2xl bg-black/5 flex items-center justify-center shrink-0 overflow-hidden">
                    <Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={20} height={20} className="w-5 h-5 object-contain" />
                  </div>
                  <div className="flex gap-1 items-center">
                    <Loader2 size={13} className="animate-spin text-[#1a1a1a]" />
                    <span className="text-[12px] font-normal text-[#1a1a1a]">กำลังคิด...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-[12px] font-normal text-red-500 px-1">
                  เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSubmit}
              className="px-4 py-3 border-t border-black/5 flex items-center gap-2 bg-[#fdfcf0]"
            >
              <input
                id="ai-chat-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="ถามบรู..."
                disabled={isLoading}
                autoComplete="off"
                className="flex-1 bg-white border border-black/5 rounded-2xl px-4 py-2.5 text-[13px] font-normal text-[#000000] placeholder:text-[#000000]/30 focus:outline-none focus:ring-1 focus:ring-black/10 transition-all disabled:opacity-50"
              />
              <motion.button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="w-9 h-9 rounded-2xl bg-[#000000] text-white flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity"
                whileTap={{ scale: 0.9 }}
                aria-label="ส่งข้อความ"
              >
                <Send size={15} />
              </motion.button>
            </form>
          </motion.div>
        </>
      )}
      </AnimatePresence>
    </>
  );
}

// Chat Bubble Sub-component
function ChatBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === 'user';

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-2xl flex items-center justify-center shrink-0 ${
          isUser ? 'bg-[#000000]' : 'bg-black/5'
        }`}
      >
        {isUser ? (
          <User size={13} className="text-white" />
        ) : (
          <Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={20} height={20} className="w-5 h-5 object-contain" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-3xl text-[15px] font-light antialiased leading-relaxed whitespace-pre-line ${
          isUser
            ? 'bg-[#000000] text-white rounded-br-md'
            : 'bg-black/5 text-[#000000] rounded-bl-md'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
