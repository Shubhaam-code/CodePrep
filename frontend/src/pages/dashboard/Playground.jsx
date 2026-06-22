import Sidebar from '../../components/dashboard/Sidebar';
import { useNavigate } from 'react-router-dom';
import { Terminal } from 'lucide-react';

const SIDEBAR_W = 220;

export default function Playground() {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary, #07070F)' }}>
      <Sidebar />
      <main
        className="flex-1 flex items-center justify-center"
        style={{ marginLeft: SIDEBAR_W }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--orange-dim, rgba(249,115,22,0.12))', border: '1px solid var(--orange-glow, rgba(249,115,22,0.2))' }}
          >
            <Terminal size={32} style={{ color: 'var(--orange, #F97316)' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-1, #F1F5F9)' }}>
            Playground Coming Soon
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-3, #475569)' }}>
            The coding playground is under construction. Try Mock Exam in the meantime!
          </p>
          <button
            onClick={() => navigate('/dashboard/mock')}
            className="cursor-pointer px-6 py-2.5 rounded-xl font-semibold text-black text-sm hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #F97316, #FFB800)' }}
          >
            Go to Mock Exam →
          </button>
        </div>
      </main>
    </div>
  );
}
