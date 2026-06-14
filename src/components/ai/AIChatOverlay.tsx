'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, User, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { sanitizePromptInput, sanitizeScreenContext, sanitizeXssPayload } from '@/lib/security/sanitize';
import { cn } from '@/lib/utils';
import {
  FAB_BASE_CLASS,
  FAB_BOTTOM_AI_CLASS,
  FAB_PANEL_ABOVE_AI_CLASS,
} from '@/lib/floating-action-layout';
import { getFabPanelKeyboardAwareStyle } from '@/lib/keyboard-aware-panel-style';
import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';
import { useFloatingOverlay } from '@/components/floating/FloatingOverlayContext';
import { HintTooltip } from '@/components/ui/hint-tooltip';

const QUICK_ACTIONS = [
  { id: 'shift', label: '👥 ตารางงานพรุ่งนี้', query: 'ขอตารางงานของพนักงานทุกคนที่เข้ากะในวันพรุ่งนี้' },
  { id: 'weather', label: '🌦️ สภาพอากาศ & วันหยุด', query: 'ตรวจสอบสภาพอากาศในพื้นที่ร้านวันนี้และเช็กว่ามีวันหยุดนักขัตฤกษ์ใกล้ๆ นี้ไหม' },
  { id: 'inventory', label: '📦 สต็อกต่ำกว่าจุดสั่งซื้อ', query: 'สรุปสินค้าที่สต็อกต่ำกว่าจุดสั่งซื้อ พร้อมจำนวนที่ควรสั่งเติม' },
  { id: 'maintenance', label: '🧰 แจ้งงานซ่อมบำรุง', query: 'ขอรายการงานซ่อมบำรุงที่ควรทำในอนาคตอันใกล้ และคำแนะนำเบื้องต้น' },
];

// Actual chat component containing useChat (only runs on client)
export default function AIChatOverlay() {
  const { fabStackHidden, isAnyOtherOpen, setOverlayOpen } = useFloatingOverlay();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI SDK v6 useChat API
  const { messages, setMessages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  // Hydration guard — static dependency only
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setOverlayOpen('ai-chat', isOpen);
  }, [isOpen, setOverlayOpen]);

  const hideAiChatButton = fabStackHidden || isAnyOtherOpen('ai-chat');

  useEffect(() => {
    if (fabStackHidden && isOpen) {
      setIsOpen(false);
    }
  }, [fabStackHidden, isOpen]);

  const viewportInsets = useVisualViewportInsets(isMounted && isOpen);
  const chatPanelStyle = getFabPanelKeyboardAwareStyle({
    insets: viewportInsets,
    defaultMaxHeight: '75vh',
  });

  // Load chat history once after mount — static dependency [isMounted]
  useEffect(() => {
    if (!isMounted) return;

    const savedHistory = localStorage.getItem('bb-chat-history');
    if (!savedHistory) return;

    try {
      const parsed = JSON.parse(savedHistory);
      const sanitized = parsed.map((msg: any) => {
        const newMsg = { ...msg };
        if (typeof newMsg.content === 'string') {
          newMsg.content = sanitizeXssPayload(newMsg.content);
        }
        if (newMsg.parts && Array.isArray(newMsg.parts)) {
          newMsg.parts = newMsg.parts.map((part: any) => {
            if (part.type === 'text' && typeof part.text === 'string') {
              return { ...part, text: sanitizeXssPayload(part.text) };
            }
            return part;
          });
        }
        return newMsg;
      });
      setMessages(sanitized);
    } catch (e) {
      console.error('Failed to parse chat history', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- static mount gate only
  }, [isMounted]);

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

    const textContent = activeModal.textContent || '';
    return `Active Window Data:\n${sanitizeScreenContext(textContent)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = sanitizePromptInput(inputValue.trim());
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
      {!hideAiChatButton && (
        <HintTooltip tip={isOpen ? 'ปิดแชทบรู' : 'ถามบรู AI'} side="left">
          <motion.button
            onClick={() => setIsOpen((prev) => !prev)}
            className={cn(FAB_BASE_CLASS, FAB_BOTTOM_AI_CLASS, isOpen ? 'z-[204]' : 'z-[200]')}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            aria-label={isOpen ? 'ปิดแชทบรู' : 'เปิดผู้ช่วย AI บรู'}
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
        </HintTooltip>
      )}

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
              className="fixed inset-0 z-[202] bg-black/0"
            />
            <motion.div
              key="chat-window"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
              className={cn(
                'fixed z-[203] box-border bg-card rounded-3xl shadow-2xl border-2 border-border flex flex-col overflow-hidden',
                'max-md:left-[calc(1rem+env(safe-area-inset-left,0px))] max-md:right-[calc(1rem+env(safe-area-inset-right,0px))] max-md:w-auto max-md:max-w-none',
                'max-md:transition-[top,max-height,bottom] max-md:duration-200',
                'md:w-full md:max-w-2xl md:left-auto md:right-6',
                FAB_PANEL_ABOVE_AI_CLASS,
              )}
              style={chatPanelStyle}
            >
              {/* Header */}
              <div className="px-4 py-3 md:px-5 md:py-4 border-b-2 border-border flex items-center justify-between gap-3 bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-2xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    <Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={24} height={24} className="w-6 h-6 object-contain dark:invert" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-normal text-foreground leading-tight">บรู</p>
                    <p className="text-[11px] font-normal text-muted-foreground leading-tight">
                      AI ผู้ช่วยร้าน BLACKANDBREW
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <HintTooltip tip="ล้างประวัติแชท">
                    <button
                      type="button"
                      onClick={() => {
                        setMessages([]);
                        localStorage.removeItem('bb-chat-history');
                      }}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                      aria-label="ล้างประวัติแชท"
                    >
                      <Trash2 size={16} />
                    </button>
                  </HintTooltip>
                  <HintTooltip tip="ปิดหน้าต่างแชท">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                      aria-label="ปิดหน้าต่างแชท"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </HintTooltip>
                </div>
              </div>

              {/* Messages Area — min-h-0 lets flex shrink so quick actions + input stay visible */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bb-smooth-scroll px-3 py-3 md:px-4 md:py-4 flex flex-col gap-3 min-w-0">


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
                    <div className="w-7 h-7 rounded-2xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      <Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={20} height={20} className="w-5 h-5 object-contain dark:invert" />
                    </div>
                    <div className="flex gap-1 items-center">
                      <Loader2 size={13} className="animate-spin text-foreground" />
                      <span className="text-[12px] font-normal text-muted-foreground">กำลังคิด...</span>
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

              {/* Quick Actions — shrink-0 keeps chips above the input bar */}
              <div className="shrink-0 px-3 md:px-4 pt-2 pb-1 flex flex-wrap gap-2 items-center justify-start min-w-0 bg-card">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      const liveScreenContext = getActiveWindowContext();
                      sendMessage(
                        { role: 'user', parts: [{ type: 'text', text: sanitizePromptInput(action.query) }] },
                        { body: { clientContext: liveScreenContext } }
                      );
                    }}
                    className="border border-border px-3 py-1.5 rounded-full text-[11px] md:text-xs text-foreground bg-muted hover:bg-foreground hover:text-background transition cursor-pointer whitespace-nowrap"
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <form
                onSubmit={handleSubmit}
                className="shrink-0 px-3 md:px-4 py-3 border-t-2 border-border flex items-center gap-2 bg-card min-w-0"
              >
                <input
                  id="ai-chat-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="ถามบรู..."
                  disabled={isLoading}
                  autoComplete="off"
                  className="thai-chat-readable flex-1 min-w-0 bg-muted border border-border rounded-2xl px-3 md:px-4 py-2.5 text-[13px] font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all disabled:opacity-50"
                />
                <HintTooltip tip="ส่งข้อความ">
                  <motion.button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    className="w-9 h-9 rounded-3xl bg-[#000000] text-white flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity"
                    whileTap={{ scale: 0.9 }}
                    aria-label="ส่งข้อความ"
                  >
                    <Send size={15} />
                  </motion.button>
                </HintTooltip>
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
  const safeContent = sanitizeXssPayload(content);

  return (
    <div className={`flex items-end gap-2 min-w-0 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-2xl flex items-center justify-center shrink-0 ${isUser ? 'bg-foreground' : 'bg-muted'}`}
      >
        {isUser ? (
          <User size={13} className="text-background" />
        ) : (
          <Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={20} height={20} className="w-5 h-5 object-contain dark:invert" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`thai-chat-readable max-w-[80%] min-w-0 break-words px-4 py-2.5 rounded-3xl text-[15px] font-normal antialiased whitespace-pre-line ${isUser
          ? 'bg-muted text-foreground border-2 border-border rounded-br-md'
          : 'bg-card text-foreground border-2 border-border rounded-bl-md'
          }`}
      >
        {safeContent}
      </div>
    </div>
  );
}
