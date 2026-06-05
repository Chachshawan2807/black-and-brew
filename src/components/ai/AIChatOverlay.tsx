'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, User, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const QUICK_ACTIONS = [
  { id: 'shift', label: '👥 ตารางงานพรุ่งนี้', query: 'ขอตารางงานของพนักงานทุกคนที่เข้ากะในวันพรุ่งนี้' },
  { id: 'weather', label: '🌦️ สภาพอากาศ & วันหยุด', query: 'ตรวจสอบสภาพอากาศในพื้นที่ร้านวันนี้และเช็กว่ามีวันหยุดนักขัตฤกษ์ใกล้ๆ นี้ไหม' },
  { id: 'inventory', label: '📦 สต็อกต่ำกว่าจุดสั่งซื้อ', query: 'สรุปสินค้าที่สต็อกต่ำกว่าจุดสั่งซื้อ พร้อมจำนวนที่ควรสั่งเติม' },
  { id: 'maintenance', label: '🧰 แจ้งงานซ่อมบำรุง', query: 'ขอรายการงานซ่อมบำรุงที่ควรทำในอนาคตอันใกล้ และคำแนะนำเบื้องต้น' },
];

// Actual chat component containing useChat (only runs on client)
export default function AIChatOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI SDK v6 useChat API
  const { messages, setMessages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  // Hydration guard + load chat history once after mount
  useEffect(() => {
    setIsMounted(true);
    const savedHistory = localStorage.getItem('bb-chat-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        const sanitizeString = (str: string) => {
          // Remove dangerous tags and attributes
          return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/on\w+='[^']*'/gi, '')
            .replace(/javascript:/gi, '');
        };

        const sanitized = parsed.map((msg: any) => {
          const newMsg = { ...msg };
          if (typeof newMsg.content === 'string') {
            newMsg.content = sanitizeString(newMsg.content);
          }
          if (newMsg.parts && Array.isArray(newMsg.parts)) {
            newMsg.parts = newMsg.parts.map((part: any) => {
              if (part.type === 'text' && typeof part.text === 'string') {
                return { ...part, text: sanitizeString(part.text) };
              }
              return part;
            });
          }
          return newMsg;
        });
        setMessages(sanitized);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
  }, []);

  const isLoading = status === 'streaming' || status === 'submitted';

  // Persist chat history after mount (debounced, skip during streaming)
  useEffect(() => {
    if (!isMounted || isLoading) return;

    const t = window.setTimeout(() => {
      localStorage.setItem('bb-chat-history', JSON.stringify(messages));
    }, 300);

    return () => window.clearTimeout(t);
  }, [messages, isMounted, isLoading]);

  // Auto-scroll when messages update
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
        className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-[200] w-14 h-14 rounded-full bg-[#000000] text-white flex items-center justify-center shadow-lg"
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
              className="fixed bottom-20 left-4 right-4 md:bottom-24 md:left-auto md:right-6 md:w-[650px] z-[199] bg-white rounded-xl shadow-2xl border-2 border-black flex flex-col overflow-hidden"
              style={{ maxHeight: '75vh' }}
            >
              {/* Header */}
              <div className="px-4 py-3 md:px-5 md:py-4 border-b-2 border-black flex items-center justify-between gap-3 bg-[#fdfcf0]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-2xl bg-black/5 flex items-center justify-center shrink-0 overflow-hidden">
                    <Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={24} height={24} className="w-6 h-6 object-contain" />
                  </div>
                  <div>
                    <p className="text-[14px] font-normal text-black leading-tight">บรู</p>
                    <p className="text-[11px] font-normal text-black leading-tight">
                      AI ผู้ช่วยร้าน BLACKANDBREW
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMessages([]);
                    localStorage.removeItem('bb-chat-history');
                  }}
                  className="text-black hover:opacity-70 transition-opacity"
                  title="ล้างประวัติ"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-3 py-3 md:px-4 md:py-4 flex flex-col gap-3 min-h-[200px]">


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
                      <Loader2 size={13} className="animate-spin text-black" />
                      <span className="text-[12px] font-normal text-black">กำลังคิด...</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="text-[12px] font-normal text-black px-1">
                    เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              <div className="px-3 md:px-4 flex flex-wrap gap-2 items-center justify-start mb-3">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      const liveScreenContext = getActiveWindowContext();
                      sendMessage(
                        { role: 'user', parts: [{ type: 'text', text: action.query }] },
                        { body: { clientContext: liveScreenContext } }
                      );
                    }}
                    className="border-2 border-black px-3 py-1.5 rounded-full text-[11px] md:text-xs text-black bg-white hover:bg-black hover:text-white transition cursor-pointer whitespace-nowrap"
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <form
                onSubmit={handleSubmit}
                className="px-3 md:px-4 py-3 border-t-2 border-black flex items-center gap-2 bg-[#fdfcf0]"
              >
                <input
                  id="ai-chat-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="ถามบรู..."
                  disabled={isLoading}
                  autoComplete="off"
                  className="flex-1 bg-white border-2 border-black rounded-2xl px-3 md:px-4 py-2.5 text-[13px] font-normal text-black placeholder:text-black placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-black transition-all disabled:opacity-50"
                />
                <motion.button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="w-9 h-9 rounded-3xl bg-[#000000] text-white flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity"
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
  
  // Sanitize content for XSS protection
  const sanitizeContent = (str: string) => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  };

  const safeContent = sanitizeContent(content);

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-2xl flex items-center justify-center shrink-0 ${isUser ? 'bg-[#000000]' : 'bg-black/5'}`}
      >
        {isUser ? (
          <User size={13} className="text-white" />
        ) : (
          <Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={20} height={20} className="w-5 h-5 object-contain" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-3xl text-[15px] font-normal antialiased leading-relaxed whitespace-pre-line ${isUser
          ? 'bg-[#fdfcf0] text-black border-2 border-black rounded-br-md'
          : 'bg-white text-black border-2 border-black rounded-bl-md'
          }`}
      >
        {safeContent}
      </div>
    </div>
  );
}
