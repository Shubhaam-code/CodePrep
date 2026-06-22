import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../store/store';

const perks = [
  { icon: <Zap size={13} />,      label: 'No subscription',    color: '#FF7A00' },
  { icon: <Shield size={13} />,   label: 'No credit card',     color: '#22C55E' },
  { icon: <Sparkles size={13} />, label: 'All features free',  color: '#8B5CF6' },
];

export default function FreeBanner() {
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Outer glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,122,0,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-4xl mx-auto relative">
        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,122,0,0.08) 0%, rgba(139,92,246,0.06) 50%, rgba(255,184,0,0.06) 100%)',
            border: '1px solid rgba(255,122,0,0.2)',
          }}
        >
          {/* Animated gradient border shimmer */}
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, transparent 30%, rgba(255,122,0,0.08) 50%, transparent 70%)',
            }}
          />

          {/* Top highlight line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,122,0,0.6), rgba(255,184,0,0.4), transparent)' }}
          />

          {/* Decorative orbs */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,122,0,0.15) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />

          {/* Content */}
          <div className="relative z-10 px-8 py-14 sm:py-16 text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,122,0,0.12)',
                border: '1px solid rgba(255,122,0,0.3)',
              }}
            >
              <span className="text-sm">🎉</span>
              <span className="text-xs font-bold text-[#FFB800] tracking-wide uppercase">
                Forever Free
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-5"
            >
              Start Practicing Today.{' '}
              <br className="hidden sm:block" />
              <span
                style={{
                  background: 'linear-gradient(135deg, #FF7A00, #FFB800, #FFD700)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Zero Cost, Always.
              </span>
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed"
            >
              Full access to 3,500+ company-wise questions, mock exams, progress
              tracking, and more — completely free, no strings attached.
            </motion.p>

            {/* Perks row */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="flex flex-wrap items-center justify-center gap-3 mb-10"
            >
              {perks.map((perk) => (
                <div
                  key={perk.label}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium"
                  style={{
                    background: `${perk.color}10`,
                    border: `1px solid ${perk.color}25`,
                    color: perk.color,
                  }}
                >
                  {perk.icon}
                  <span>{perk.label}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA */}
            {!isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="flex flex-col sm:flex-row gap-3 justify-center items-center"
              >
                <Link to="/register"
                  className="group relative inline-flex items-center gap-2 text-base font-bold text-black px-8 py-3.5 rounded-xl overflow-hidden shadow-2xl shadow-[#FF7A00]/30 transition-transform hover:-translate-y-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00] via-[#FFB800] to-[#FFD700]" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-[#FF9500] to-[#FFD700] transition-opacity duration-300" />
                  <span className="relative">Create Free Account</span>
                  <ArrowRight size={16} className="relative transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors font-medium"
                >
                  Already have an account? Sign in →
                </Link>
              </motion.div>
            )}

            {isAuthenticated && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <Link to="/dashboard/companies"
                  className="group relative inline-flex items-center gap-2 text-base font-bold text-black px-8 py-3.5 rounded-xl overflow-hidden shadow-2xl shadow-[#FF7A00]/30 transition-transform hover:-translate-y-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00] via-[#FFB800] to-[#FFD700]" />
                  <span className="relative">Browse Companies</span>
                  <ArrowRight size={16} className="relative transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
