import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getSwahiliResponse, QUICK_QUESTIONS } from '@/lib/swahili-ai';
import type { ChatMessage } from '@/types';
import { Spinner } from './ui';

export function SwahiliChat({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  async function loadMessages() {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data && data.length > 0) {
      setMessages(data as ChatMessage[]);
    } else {
      const greeting: ChatMessage = {
        id: 'welcome',
        session_id: sessionId,
        role: 'assistant',
        message: 'Jambo! Karibu kwenye AfyaApp. Mimi ni msaidizi wako wa afya kwa Kiswahili. Niambie unahisi vipi au uliza swali lolote kuhusu afya.',
        language: 'sw',
        created_at: new Date().toISOString(),
      };
      setMessages([greeting]);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: 'user',
      message: text.trim(),
      language: 'sw',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      message: text.trim(),
      language: 'sw',
    });

    setThinking(true);
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
    const response = getSwahiliResponse(text);
    setThinking(false);

    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: 'assistant',
      message: response,
      language: 'sw',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, aiMsg]);

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      message: response,
      language: 'sw',
    });

    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  async function resetChat() {
    await supabase.from('chat_messages').delete().eq('session_id', sessionId);
    setMessages([]);
    await loadMessages();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-primary-50 to-secondary-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Msaidizi wa Afya AI</h3>
            <p className="text-xs text-slate-500">Zungumza kwa Kiswahili</p>
          </div>
        </div>
        <button onClick={resetChat} className="btn-ghost text-xs" title="Anza upya">
          <RotateCcw size={14} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-secondary-100 text-secondary-600' : 'bg-primary-100 text-primary-600'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-secondary-600 text-white rounded-tr-sm'
                : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm'
            }`}>
              {msg.message}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-slate-200 bg-white">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-full px-3 py-1.5 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Andika ujumbe wako hapa..."
            className="input flex-1"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="btn-primary !px-3"
          >
            {loading ? <Spinner size={18} /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          Maelezo haya ni ya kijumla tu. Kwa matibabu, muone daktari.
        </p>
      </div>
    </div>
  );
}
