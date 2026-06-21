import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  { name:'Free', price:'0', period:'forever', description:'Perfect for getting started', highlight:false,
    features:[
      {text:'Browse all questions',included:true},{text:'5 Mock Assessments / month',included:true},
      {text:'Basic progress tracking',included:true},{text:'Unlimited Assessments',included:false},
      {text:'Resume Analyzer',included:false},{text:'AI Learning Roadmaps',included:false},{text:'Advanced Analytics',included:false},
    ], cta:'Start Free', ctaHref:'/dashboard' },
  { name:'Pro', price:'9', period:'/month', description:'For serious interview prep', badge:'Most Popular', highlight:true,
    features:[
      {text:'Unlimited Questions',included:true},{text:'Unlimited Mock Assessments',included:true},
      {text:'Resume Analyzer',included:true},{text:'Company-wise Analytics',included:true},
      {text:'Performance Reports',included:true},{text:'AI Learning Roadmaps',included:false},{text:'Personal AI Mentor',included:false},
    ], cta:'Get Pro', ctaHref:'/dashboard' },
  { name:'Premium', price:'19', period:'/month', description:'For maximum success rate', highlight:false,
    features:[
      {text:'Everything in Pro',included:true},{text:'AI Learning Roadmaps',included:true},
      {text:'Advanced Analytics',included:true},{text:'Personal AI Mentor',included:true},
      {text:'Priority Support',included:true},{text:'Custom Study Plans',included:true},{text:'Interview Coaching',included:true},
    ], cta:'Go Premium', ctaHref:'/dashboard' },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4">
      <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
        className="text-center mb-16">
        <p className="text-xs font-bold uppercase tracking-widest text-[#FF7A00] mb-3">Pricing</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
          Simple,{' '}
          <span className="bg-gradient-to-r from-[#FF7A00] to-[#FFD700] bg-clip-text text-transparent">Transparent Pricing</span>
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto">Start free. Upgrade when you're ready to accelerate.</p>
      </motion.div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {plans.map((plan, i) => (
          <motion.div key={plan.name} initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }} transition={{ delay:i*0.1 }}
            className={`relative rounded-2xl p-6 border ${plan.highlight
              ? 'bg-gradient-to-b from-[#FF7A00]/10 to-[#FFD700]/5 border-[#FF7A00]/50 shadow-[0_0_60px_rgba(255,122,0,0.15)]'
              : 'bg-white/[0.02] border-white/8'}`}>
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF7A00] to-[#FFD700] text-black text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                {plan.badge}
              </div>
            )}
            <div className="mb-6">
              <h3 className={`text-base font-bold mb-1 ${plan.highlight ? 'text-[#FFB800]' : 'text-gray-300'}`}>{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-extrabold text-white">${plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>
              <p className="text-gray-500 text-xs">{plan.description}</p>
            </div>
            <div className="space-y-2.5 mb-8">
              {plan.features.map(f => (
                <div key={f.text} className="flex items-center gap-2.5">
                  {f.included ? <Check size={14} className={plan.highlight ? 'text-[#FF7A00]' : 'text-green-500'} /> : <X size={14} className="text-gray-700" />}
                  <span className={`text-xs ${f.included ? 'text-gray-300' : 'text-gray-600'}`}>{f.text}</span>
                </div>
              ))}
            </div>
            <Link to={plan.ctaHref}
              className={`block text-center text-sm font-bold py-2.5 rounded-xl transition-all ${plan.highlight
                ? 'bg-gradient-to-r from-[#FF7A00] to-[#FFD700] text-black hover:opacity-90'
                : 'border border-white/10 text-gray-300 hover:border-white/20 hover:text-white hover:bg-white/5'}`}>
              {plan.cta}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
