import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Minimize2, Send, Sparkles } from 'lucide-react';

const chips = ['Explain DP','Binary Search tips','Mock interview','System design','Time complexity'];

const presetMessages = [
  { role:'ai', text:"Hi! I'm your AI Mentor 🤖 What would you like to work on today?" },
];

export default function AIMentor() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(presetMessages);
  const [input, setInput] = useState('');

  const send = (text) => {
    if (!text.trim()) return;
    setMessages(m => [
      ...m,
      { role:'user', text },
      { role:'ai', text:`Great question! Let me help you with "${text}". Focus on breaking down the problem into smaller sub-problems. Would you like a step-by-step walkthrough? 🚀` },
    ]);
    setInput('');
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale:1.1 }}
        whileTap={{ scale:0.95 }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ background:'linear-gradient(135deg, #FF7A00, #FFD700)', boxShadow:'0 0 30px rgba(255,122,0,0.5)' }}
      >
        <Bot size={24} className="text-black" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0B0B0F] animate-pulse" />
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity:0, y:40, scale:0.95 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:40, scale:0.95 }}
            transition={{ type:'spring', stiffness:300, damping:25 }}
            className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 flex flex-col"
            style={{ height:'480px' }}
          >
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-2xl blur-xl bg-[#FF7A00]/20 -z-10" />

            <div className="flex flex-col h-full bg-[#0D0D12] border border-[#FF7A00]/30 rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5"
                style={{ background:'linear-gradient(135deg, rgba(255,122,0,0.15), rgba(255,215,0,0.05))' }}>
                <div className="relative">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FFD700] flex items-center justify-center">
                    <Sparkles size={14} className="text-black" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0D0D12]" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-xs font-bold">AI Mentor</p>
                  <p className="text-green-400 text-[10px]">Online — Ask me anything</p>
                </div>
                <button onClick={() => setOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
                  <X size={14} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((m, i) => (
                  <motion.div key={i} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                    className={`flex ${m.role==='user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] text-xs px-3 py-2 rounded-2xl leading-relaxed ${
                      m.role==='user'
                        ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-medium rounded-br-sm'
                        : 'bg-white/5 border border-white/8 text-gray-300 rounded-bl-sm'
                    }`}>
                      {m.text}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chip suggestions */}
              <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-t border-white/5">
                {chips.map(c => (
                  <button key={c} onClick={() => send(c)}
                    className="shrink-0 text-[10px] font-semibold text-[#FFB800] bg-[#FF7A00]/10 border border-[#FF7A00]/20 hover:border-[#FF7A00]/50 px-2.5 py-1 rounded-full transition-all whitespace-nowrap">
                    {c}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="px-3 pb-3 pt-1">
                <form onSubmit={e => { e.preventDefault(); send(input); }}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything..."
                    className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 outline-none" />
                  <button type="submit"
                    className="w-6 h-6 rounded-lg bg-gradient-to-r from-[#FF7A00] to-[#FFD700] flex items-center justify-center hover:opacity-90 transition-opacity">
                    <Send size={10} className="text-black" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
