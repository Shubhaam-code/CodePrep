import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import apiClient from '../api/axios';

function Strip({ companies, reverse = false }) {
  const doubled = [...companies, ...companies];
  return (
    <div className="overflow-hidden relative">
      <div className={`flex gap-3 w-max ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}>
        {doubled.map((c, i) => (
          <span key={i}
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-gray-400 bg-white/5 border border-white/8 hover:border-[#FF7A00]/40 hover:text-[#FFB800] transition-all duration-300 rounded-full px-4 py-2 cursor-default capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]/60" />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

const FALLBACK = [
  'Google','Amazon','Microsoft','Meta','Apple',
  'Uber','Adobe','Flipkart','Goldman Sachs','Atlassian',
  'Netflix','LinkedIn','ByteDance','Walmart','Bloomberg',
];

export default function CompaniesStrip() {
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await apiClient.get('/api/companies');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const list = companies && companies.length > 0 ? companies : FALLBACK;
  const half = Math.ceil(list.length / 2);
  const row1 = list.slice(0, half);
  const row2 = list.slice(half);

  return (
    <section id="companies" className="py-20 relative overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-[#0B0B0F] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-[#0B0B0F] to-transparent pointer-events-none" />

      <motion.div initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
        transition={{ duration:0.6 }} className="text-center mb-10 px-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[#FF7A00] mb-2">Questions From</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Top Tech Companies</h2>
        <p className="text-gray-500 text-sm max-w-lg mx-auto">
          Curated questions from real interview experiences and online assessments.
        </p>
      </motion.div>

      <div className="space-y-3">
        <Strip companies={row1} reverse={false} />
        <Strip companies={row2} reverse={true} />
      </div>
    </section>
  );
}
