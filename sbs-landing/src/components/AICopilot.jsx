/**
 * AI Copilot - Intelligent Healthcare Assistant
 * Provides real-time AI assistance for claims, coding, and clinical decisions
 */

import React, { useState, useRef, useEffect } from 'react';
import { callGemini } from '../services/geminiService';

const SYSTEM_CONTEXT = `You are an expert Saudi healthcare AI assistant named "SBS Copilot". You help with:
- SBS (Saudi Billing System) code lookups and explanations
- NPHIES eligibility and prior authorization guidance
- Healthcare claim validation and optimization
- ICD-10, CPT, and SNOMED-CT code mapping
- CHI (Council of Health Insurance) compliance questions
- Clinical documentation best practices

Always be concise, professional, and cite relevant Saudi healthcare regulations when applicable.
Format responses with markdown for readability.`;

const QUICK_PROMPTS = [
  { icon: '🔍', label: 'Find SBS Code', prompt: 'Help me find the SBS code for' },
  { icon: '✅', label: 'Validate Claim', prompt: 'Validate this claim for NPHIES submission:' },
  { icon: '📋', label: 'Prior Auth Help', prompt: 'Help me prepare prior authorization for' },
  { icon: '🔄', label: 'Map Code', prompt: 'Map this internal code to SBS:' },
  { icon: '💡', label: 'Optimize Claim', prompt: 'How can I optimize this claim for better reimbursement:' },
];

export function AICopilot({ isOpen, onClose, context = {} }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 Hello! I'm your **SBS Copilot** - your AI-powered healthcare billing assistant.

I can help you with:
- 🔍 Finding and explaining SBS codes
- ✅ Validating claims before submission
- 📋 Prior authorization guidance
- 🔄 Code mapping (ICD-10, CPT → SBS)
- 💡 Claim optimization tips

How can I assist you today?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

Provide a helpful, concise response. Use markdown formatting.`;

      const response = await callGemini(fullPrompt, SYSTEM_CONTEXT);

      const assistantMessage = {
        role: 'assistant',
        content: response || 'I apologize, but I encountered an issue. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Copilot error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ I encountered an error. Please check your connection and try again.',
        timestamp: new Date(),
        isError: true
      }]);
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
      content: '🔄 Chat cleared. How can I help you?',
      timestamp: new Date()
    }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] z-50 flex flex-col bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-primary/10 to-blue-500/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-xl">psychology</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></div>
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">SBS Copilot</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">AI Healthcare Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title="Clear chat"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        <div className="flex gap-2">
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => setInput(qp.prompt + ' ')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-all whitespace-nowrap"
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
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-primary to-blue-600 text-white rounded-br-md'
                  : msg.isError
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-bl-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-md'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                {msg.content}
              </div>
              <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="size-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="size-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="size-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-xs text-slate-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about SBS, claims, or coding..."
              className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-sm"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              onClick={startListening}
              className={`absolute right-3 bottom-3 p-1.5 rounded-lg transition-colors ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'text-slate-400 hover:text-primary hover:bg-primary/10'
              }`}
              title="Voice input"
            >
              <span className="material-symbols-outlined text-lg">
                {isListening ? 'mic' : 'mic_none'}
              </span>
            </button>
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center size-12 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2">
          Powered by Google Gemini AI • SBS V3.1 Compliant
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
        <div className="size-14 rounded-full bg-gradient-to-br from-primary via-blue-600 to-purple-600 shadow-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-primary/30">
          <span className="material-symbols-outlined text-white text-2xl group-hover:animate-pulse">
            psychology
          </span>
        </div>
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30"></div>
        {/* Notification dot */}
        {hasNotification && (
          <div className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">!</span>
          </div>
        )}
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        AI Copilot
        <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></div>
      </div>
    </button>
  );
}
