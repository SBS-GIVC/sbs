/**
 * AI Copilot - DeepSeek Powered Healthcare Assistant
 * Provides real-time AI assistance for claims, coding, and clinical decisions
 */

import React, { useState, useRef, useEffect } from 'react';
import { callGemini } from '../services/geminiService';

const SYSTEM_CONTEXT = `You are an expert Saudi healthcare AI assistant named "GIVC-SBS Copilot" powered by DeepSeek. You help with:
- SBS (Saudi Billing System) code lookups and explanations
- NPHIES eligibility and prior authorization guidance
- Healthcare claim validation and optimization
- ICD-10, CPT, and SNOMED-CT code mapping
- CHI (Council of Health Insurance) compliance questions
- Clinical documentation best practices

Always be concise, professional, and cite relevant Saudi healthcare regulations when applicable.
Format responses with markdown for readability. Use bullet points and headers for clarity.`;

const LOCALE_TEXT = {
  en: {
    greeting: `👋 **Hello!** I'm your **GIVC-SBS Copilot** - powered by DeepSeek AI.

I can help you with:
- 🔍 Finding and explaining SBS codes
- ✅ Validating claims before submission
- 📋 Prior authorization guidance
- 🔄 Code mapping (ICD-10, CPT → SBS)
- 💡 Claim optimization tips

How can I assist you today?`,
    clearChat: 'Clear chat',
    cleared: '🔄 Chat cleared. How can I help you?',
    placeholder: 'Ask about SBS codes, claims, or compliance...',
    voiceInput: 'Voice input',
    thinking: 'DeepSeek is thinking...',
    retryHint: 'DeepSeek connection paused. Retry your last message?',
    retry: 'Retry',
    footer: 'Powered by DeepSeek AI • SBS V3.1 Compliant',
    fallbackHeader: '⚠️ **Live DeepSeek service is temporarily unavailable.**',
    fallbackBody: 'Here is a fast local guidance draft while the connection recovers:',
    fallbackStep: '**Suggested next step:** Provide the diagnosis, procedure, and payer contract details for a precise SBS mapping.',
    fallbackChecks: '**Quick safety checks:**',
    fallbackFoot: 'Use **Retry** to re-run this with DeepSeek as soon as connectivity is restored.'
  },
  ar: {
    greeting: `👋 **مرحباً!** أنا **مساعد GIVC-SBS** المدعوم بـ DeepSeek.

أستطيع مساعدتك في:
- 🔍 البحث عن أكواد SBS وشرحها
- ✅ التحقق من المطالبات قبل الإرسال
- 📋 إرشادات الموافقات المسبقة
- 🔄 مواءمة الأكواد (ICD-10, CPT ← SBS)
- 💡 تحسين جودة المطالبات

كيف يمكنني مساعدتك اليوم؟`,
    clearChat: 'مسح المحادثة',
    cleared: '🔄 تم مسح المحادثة. كيف يمكنني مساعدتك؟',
    placeholder: 'اسأل عن أكواد SBS أو المطالبات أو الامتثال...',
    voiceInput: 'إدخال صوتي',
    thinking: 'DeepSeek يقوم بالتحليل...',
    retryHint: 'تم إيقاف الاتصال مؤقتًا مع DeepSeek. إعادة المحاولة لآخر رسالة؟',
    retry: 'إعادة المحاولة',
    footer: 'مدعوم بـ DeepSeek AI • متوافق مع SBS V3.1',
    fallbackHeader: '⚠️ **خدمة DeepSeek غير متاحة مؤقتًا.**',
    fallbackBody: 'إليك مسودة إرشادية سريعة لحين استعادة الاتصال:',
    fallbackStep: '**الخطوة التالية المقترحة:** زودنا بالتشخيص والإجراء وتفاصيل عقد شركة التأمين للحصول على مواءمة أدق.',
    fallbackChecks: '**فحوصات سريعة:**',
    fallbackFoot: 'استخدم **إعادة المحاولة** لإعادة تشغيل الطلب عند عودة الاتصال.'
  }
};

const QUICK_PROMPTS = {
  en: [
    { icon: '🔍', label: 'Find SBS Code', prompt: 'Help me find the SBS code for' },
    { icon: '✅', label: 'Validate Claim', prompt: 'Validate this claim for NPHIES submission:' },
    { icon: '📋', label: 'Prior Auth', prompt: 'Help me prepare prior authorization for' },
    { icon: '🔄', label: 'Map Code', prompt: 'Map this internal code to SBS:' },
    { icon: '🧠', label: 'Crosswalk', prompt: 'Crosswalk ICD-10, DRG, SNOMED, and DICOM context for:' },
    { icon: '💡', label: 'Optimize', prompt: 'How can I optimize this claim:' },
  ],
  ar: [
    { icon: '🔍', label: 'بحث SBS', prompt: 'ساعدني في العثور على كود SBS لـ' },
    { icon: '✅', label: 'تحقق المطالبة', prompt: 'تحقق من هذه المطالبة قبل إرسالها إلى نفيس:' },
    { icon: '📋', label: 'موافقة مسبقة', prompt: 'ساعدني في إعداد موافقة مسبقة لـ' },
    { icon: '🔄', label: 'مواءمة كود', prompt: 'قم بمواءمة هذا الكود الداخلي إلى SBS:' },
    { icon: '🧠', label: 'Crosswalk', prompt: 'قم بمواءمة سياق ICD-10 و DRG و SNOMED و DICOM لـ:' },
    { icon: '💡', label: 'تحسين', prompt: 'كيف يمكنني تحسين هذه المطالبة:' },
  ]
};

function generateLocalFallback(messageText, copy) {
  return `${copy.fallbackHeader}

${copy.fallbackBody}

- **Request received:** ${messageText}
- ${copy.fallbackStep}
- ${copy.fallbackChecks}
  - Verify ICD-10 principal + secondary diagnosis pairing.
  - Confirm DRG grouping and medical necessity narrative.
  - Align SNOMED concepts to clinical notes before claim submission.
  - Ensure DICOM/radiology metadata matches billed services.

${copy.fallbackFoot}`;
}

export function AICopilot({ isOpen, onClose, context = {} }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: LOCALE_TEXT.en.greeting,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const locale = typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? 'ar' : 'en';
  const copy = LOCALE_TEXT[locale] || LOCALE_TEXT.en;
  const quickPrompts = QUICK_PROMPTS[locale] || QUICK_PROMPTS.en;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Voice recognition setup
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + ' ' + transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSend = async (customPrompt = null) => {
    const messageText = customPrompt || input.trim();
    if (!messageText || isLoading) return;

    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context-aware prompt
      let contextInfo = '';
      if (context.currentPage) {
        contextInfo += `\nUser is currently on: ${context.currentPage}`;
      }
      if (context.selectedCode) {
        contextInfo += `\nSelected SBS Code: ${context.selectedCode}`;
      }
      if (context.claimData) {
        contextInfo += `\nCurrent Claim Data: ${JSON.stringify(context.claimData)}`;
      }

      // Build conversation history (last 6 messages for context)
      const recentHistory = messages.slice(-6).map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n\n');

      const fullPrompt = `${SYSTEM_CONTEXT}

${contextInfo ? `Current Context:${contextInfo}\n` : ''}
Conversation History:
${recentHistory}

User: ${messageText}

Provide a helpful, concise response. Use markdown formatting for readability.`;

      const response = await callGemini(fullPrompt, SYSTEM_CONTEXT);

      const assistantMessage = {
        role: 'assistant',
        content: response || 'I apologize, but I encountered an issue. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setLastFailedPrompt('');
    } catch (error) {
      console.error('AI Copilot error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: generateLocalFallback(messageText, copy),
        timestamp: new Date(),
        isError: true
      }]);
      setLastFailedPrompt(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: copy.cleared,
      timestamp: new Date()
    }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] z-50 flex flex-col bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-primary/5 via-blue-500/5 to-purple-500/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="size-11 rounded-xl bg-gradient-to-br from-primary via-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="material-symbols-outlined text-white text-xl">psychology</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
            </div>
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              GIVC-SBS Copilot
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md">
                AI
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Powered by DeepSeek · BrainSAIT</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
            title={copy.clearChat}
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => setInput(qp.prompt + ' ')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 transition-all whitespace-nowrap"
            >
              <span>{qp.icon}</span>
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-primary to-blue-600 text-white rounded-br-md shadow-lg shadow-primary/20'
                  : msg.isError
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-bl-md'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-md border border-slate-100 dark:border-slate-700'
              }`}
            >
              <div className="text-sm prose-ai whitespace-pre-wrap">
                {msg.content}
              </div>
              <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="size-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="size-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="size-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-xs text-slate-500">{copy.thinking}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        {lastFailedPrompt && (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <span>{copy.retryHint}</span>
            <button
              onClick={() => handleSend(lastFailedPrompt)}
              className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 transition"
            >
              {copy.retry}
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={copy.placeholder}
              className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none text-sm transition-all"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              onClick={startListening}
              className={`absolute right-3 bottom-3 p-1.5 rounded-lg transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                  : 'text-slate-400 hover:text-primary hover:bg-primary/10'
              }`}
              title={copy.voiceInput}
            >
              <span className="material-symbols-outlined text-lg">
                {isListening ? 'mic' : 'mic_none'}
              </span>
            </button>
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center size-12 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-3 flex items-center justify-center gap-2">
          <span className="size-1.5 bg-emerald-500 rounded-full"></span>
          {copy.footer}
        </p>
      </div>
    </div>
  );
}

// Floating action button to open copilot
export function AICopilotFAB({ onClick, hasNotification = false }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 group"
      title="Open AI Copilot"
    >
      <div className="relative">
        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-blue-500 to-purple-600 blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>

        {/* Button */}
        <div className="relative size-14 rounded-full bg-gradient-to-br from-primary via-blue-500 to-purple-600 shadow-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-2xl">
          <span className="material-symbols-outlined text-white text-2xl group-hover:scale-110 transition-transform">
            psychology
          </span>
        </div>

        {/* Notification Dot */}
        {hasNotification && (
          <span className="absolute -top-1 -right-1 size-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </div>
    </button>
  );
}
