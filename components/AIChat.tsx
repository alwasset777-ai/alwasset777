
import React, { useState, useRef, useEffect } from 'react';
import { getAIResponse } from '../services/gemini';
import { Language } from '../types';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const CHAT_UI: Record<Language, any> = {
  ar: { welcome: "سلام! أنا مدربك 777. كيف يمكنني مساعدتك؟", placeholder: "اسأل مدربك...", title: "المدرب 777", loading: "تحليل..." },
  fr: { welcome: "Salut ! Je suis ton Coach 777. Comment puis-je t'aider ?", placeholder: "Pose ta question...", title: "Coach 777", loading: "Analyse..." },
  en: { welcome: "Hi! I'm your 777 Coach. How can I help you?", placeholder: "Ask your question...", title: "777 Coach", loading: "Analyzing..." }
};

interface Props {
  language: Language;
}

const AIChat: React.FC<Props> = ({ language }) => {
  const ui = CHAT_UI[language];
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: ui.welcome }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: 'assistant', text: ui.welcome }]);
  }, [language]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model' as 'user' | 'model',
      parts: [{ text: m.text }]
    }));

    const response = await getAIResponse(userMsg, language, history as any);
    setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-8 left-8 z-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {isOpen ? (
        <div className="bg-white w-[350px] h-[500px] rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
            <span className="font-black text-sm">{ui.title}</span>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white">✕</button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-xs ${m.role === 'user' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-700 border shadow-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t bg-white flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder={ui.placeholder} className="flex-1 bg-slate-100 rounded-xl px-4 py-2 text-xs outline-none" />
            <button onClick={handleSend} disabled={isLoading} className="bg-red-600 text-white p-2 rounded-xl">➤</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="bg-slate-900 text-white w-14 h-14 rounded-2xl shadow-2xl flex flex-col items-center justify-center hover:scale-110 transition-all">
          <span className="font-black text-[10px]">777</span>
        </button>
      )}
    </div>
  );
};

export default AIChat;
