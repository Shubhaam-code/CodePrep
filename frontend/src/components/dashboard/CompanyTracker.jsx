import { motion } from 'framer-motion';
import { FaArrowRight as ArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const companyColors = {
  google: '#4285F4',
  amazon: '#FF9900',
  microsoft: '#00A4EF',
  meta: '#1877F2',
  apple: '#A2AAAD',
  netflix: '#E50914',
  adobe: '#FF0000',
  uber: '#FFFFFF',
  goldman_sachs: '#FFB800',
  atlassian: '#0052CC',
};

export default function CompanyTracker({ solvedByCompany = [] }) {
  // Sort companies by total questions descending, take top 5
  const displayList = [...solvedByCompany]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-bold text-sm">Company Progress</h3>
        <span className="text-[10px] text-gray-500 font-medium">Real-time stats</span>
      </div>

      {displayList.length === 0 ? (
        <div className="text-xs text-gray-500 py-6 text-center">
          No practice history found.
        </div>
      ) : (
        <div className="space-y-4">
          {displayList.map((c, i) => {
            const companyKey = c.company.toLowerCase()
                   .replace(/[\s-]+/g, '_')
            const color = companyColors[companyKey] || '#FF7A00';
            const pct = c.total > 0 ? Math.round((c.solved / c.total) * 100) : 0;
            return (
              <motion.div key={c.company}
                initial={{ opacity:0, x:-10 }}
                animate={{ opacity:1, x:0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-semibold text-gray-300 capitalize">{c.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{c.solved}/{c.total}</span>
                    <span className="text-[10px] font-bold text-white bg-white/5 px-1.5 py-0.5 rounded">{pct}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${color}90, ${color})` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {displayList.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/5">
          <Link to={`/company/${displayList[0].company.toLowerCase()}`}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 hover:text-[#FF7A00] transition-colors py-1.5">
            Practice {displayList[0].company} Questions <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
