import { motion } from 'framer-motion';
import { ArrowRight, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';

const floatingCards = [
  { icon: '🔍', label: 'Two Sum', tag: 'Easy',   company: 'Google'   },
  { icon: '🌲', label: 'Binary Tree LCA', tag: 'Medium', company: 'Amazon'   },
  { icon: '⚡', label: 'LRU Cache',       tag: 'Hard',   company: 'Meta'     },
];

const tagColors = {
  Easy:   'text-green-400 bg-green-400/10',
  Medium: 'text-yellow-400 bg-yellow-400/10',
  Hard:   'text-red-400 bg-red-400/10',
};

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,122,0,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,122,0,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Animated blobs */}
      <motion.div
        animate={{ scale: [1,1.15,1], x:[0,30,0], y:[0,-20,0] }}
        transition={{ duration:8, repeat:Infinity, ease:'easeInOut' }}
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background:'radial-gradient(circle, #FF7A00, transparent)' }}
      />
      <motion.div
        animate={{ scale:[1,1.2,1], x:[0,-20,0], y:[0,30,0] }}
        transition={{ duration:10, repeat:Infinity, ease:'easeInOut', delay:2 }}
        className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-15"
        style={{ background:'radial-gradient(circle, #FFB800, transparent)' }}
      />

      {/* Floating problem cards — desktop only */}
      {floatingCards.map((card, i) => (
        <motion.div key={card.label}
          animate={{ opacity:[0.6,0.9,0.6], y:[0,-12,0] }}
          transition={{ opacity:{duration:3,repeat:Infinity,delay:i*1.2}, y:{duration:4,repeat:Infinity,ease:'easeInOut',delay:i*0.8} }}
          className={`absolute hidden lg:block bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 ${
            i===0 ? 'top-32 left-8 xl:left-24'
            : i===1 ? 'top-1/2 -translate-y-1/2 left-4 xl:left-16'
            : 'bottom-32 left-8 xl:left-20'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{card.icon}</span>
            <div>
              <p className="text-xs font-medium text-white/80">{card.label}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${tagColors[card.tag]}`}>{card.tag}</span>
                <span className="text-[10px] text-gray-500">{card.company}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Code snippet card — desktop only */}
      <motion.div
        initial={{ opacity:0, x:40 }}
        animate={{ opacity:0.7, x:0, y:[0,-8,0] }}
        transition={{ duration:0.8, delay:0.5, y:{duration:5,repeat:Infinity,ease:'easeInOut'} }}
        className="absolute top-1/3 right-4 xl:right-16 hidden lg:block bg-[#111115]/80 backdrop-blur-md border border-[#FF7A00]/20 rounded-xl p-4 w-56"
      >
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <Terminal size={10} className="ml-auto text-gray-600" />
        </div>
        <div className="space-y-1.5 font-mono text-[10px]">
          <p><span className="text-[#FF7A00]">def</span> <span className="text-yellow-300">twoSum</span><span className="text-gray-400">(nums, target):</span></p>
          <p className="pl-3 text-gray-500">seen = {'{}'}</p>
          <p className="pl-3 text-gray-500">for i, n in</p>
          <p className="pl-5 text-green-400">enumerate(nums):</p>
          <p className="pl-5 text-gray-600">...</p>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-3xl mx-auto px-4">
        {/* Badge */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
          className="inline-flex items-center gap-2 mb-6">
          <div className="relative inline-flex items-center gap-2 bg-[#FF7A00]/10 border border-[#FF7A00]/30 rounded-full px-4 py-1.5">
            <span className="absolute inset-0 rounded-full animate-ping bg-[#FF7A00]/10" />
            <span className="text-xs font-medium text-[#FFB800]">🏢 Company-wise Interview Prep</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1 initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.15 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-5">
          <span className="text-white">Practice Company-Wise</span><br />
          <span className="bg-gradient-to-r from-[#FF7A00] via-[#FFB800] to-[#FFD700] bg-clip-text text-transparent">DSA Questions</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.3 }}
          className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Real questions asked by top companies, sorted by frequency.
        </motion.p>

        {/* CTAs */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.45 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to="/register"
            className="group relative inline-flex items-center gap-2 text-base font-bold text-black px-8 py-3.5 rounded-xl overflow-hidden w-full sm:w-auto justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00] via-[#FFB800] to-[#FFD700]" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-[#FF7A00] via-[#FFB800] to-[#FFD700] blur-lg transition-opacity" />
            <span className="relative">Get Started →</span>
          </Link>
          <Link to="/login"
            className="inline-flex items-center gap-2 text-base font-medium text-gray-300 hover:text-white px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all w-full sm:w-auto justify-center">
            Login
          </Link>
        </motion.div>

        {/* Free Tier Badge Text */}
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="text-gray-500 text-xs mt-6 font-semibold tracking-wide"
        >
          100% Free — No subscription needed
        </motion.p>
      </div>
    </section>
  );
}
