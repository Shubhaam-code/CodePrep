import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Swords, Copy, Check, Users, ShieldAlert, Play, RotateCcw, 
  Flame, Calendar, AlertCircle, ArrowLeft, Trophy, Skull, RefreshCw
} from 'lucide-react';
import { useAppSelector } from '../../store/store';
import { QuestionService } from '../../services/QuestionService';
import { JudgeService } from '../../services/JudgeService';
import { RoomService } from '../../services/RoomService';
import apiClient from '../../api/axios';

const sampleCodes = {
  python: 'def solve(nums, target):\n    # Write your optimal solution here...\n    pass\n',
  javascript: 'function solve(nums, target) {\n    // Write your optimal solution here...\n    return [];\n}\n',
  java: 'class Solution {\n    public int[] solve(int[] nums, int target) {\n        // Write your optimal solution here...\n        return new int[0];\n    }\n}\n',
  cpp: '#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        // Write your optimal solution here...\n        return {};\n    }\n};\n'
};

export default function CodeRoyale({ onBack }) {
  const { user } = useAppSelector(s => s.auth);

  // States
  const [gameState, setGameState] = useState('lobby'); // 'lobby' | 'matching' | 'countdown' | 'active' | 'victory' | 'defeat'
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [opponent, setOpponent] = useState(null); // { name, avatarColor, status }
  const [countdown, setCountdown] = useState(5);
  const [question, setQuestion] = useState(null);
  
  // Game editor states
  const [lang, setLang] = useState('javascript');
  const [code, setCode] = useState(sampleCodes.javascript);
  const [output, setOutput] = useState('Type your code and submit. First to get all test cases accepted wins.');
  const [running, setRunning] = useState(false);
  const [opponentProgress, setOpponentProgress] = useState('Joined');
  const [battleLogs, setBattleLogs] = useState([]);
  
  const opponentTimer = useRef(null);

  // Initialize room if private
  const handleCreateRoom = () => {
    const code = RoomService.createRoom();
    setRoomCode(code);
    setGameState('lobby');
  };

  // Simulate friend joining private lobby
  const handleSimulateFriendJoin = () => {
    setOpponent({
      name: 'AlexCoder',
      avatarColor: 'bg-emerald-500',
      status: 'Not Ready'
    });
    addBattleLog('AlexCoder joined the lobby.');
  };

  // Start matchmaking search for Royale
  const handleStartMatchmaking = () => {
    setGameState('matching');
    addBattleLog('Searching for an active opponent in queue...');

    setTimeout(() => {
      setOpponent({
        name: 'ByteWarrior',
        avatarColor: 'bg-rose-500',
        status: 'Ready'
      });
      addBattleLog('Opponent found: ByteWarrior (Rating 1840)');
      
      setTimeout(() => {
        setGameState('countdown');
        startCountdown();
      }, 1500);
    }, 3000);
  };

  const startCountdown = () => {
    let tick = 5;
    setCountdown(tick);
    const interval = setInterval(() => {
      tick--;
      setCountdown(tick);
      if (tick === 0) {
        clearInterval(interval);
        // Start game
        loadGameData();
      }
    }, 1000);
  };

  const loadGameData = async () => {
    const q = await QuestionService.getRandomQuestion('Medium');
    setQuestion(q);
    setCode(sampleCodes[lang]);
    setGameState('active');
    addBattleLog('Match started! Question: ' + q.title);
    
    // Start opponent simulation typing
    simulateOpponentCoding();
  };

  // Simulate opponent moves to create real competitive tension
  const simulateOpponentCoding = () => {
    let step = 0;
    opponentTimer.current = setInterval(() => {
      step++;
      if (step === 1) {
        setOpponentProgress('Typing...');
        addBattleLog('Opponent is writing solution structure...');
      } else if (step === 2) {
        addBattleLog('Opponent compiling... 5/12 test cases passed.');
        setOpponentProgress('Refactoring...');
      } else if (step === 3) {
        addBattleLog('Opponent is optimizing space complexity...');
        setOpponentProgress('Typing fast...');
      } else if (step === 4) {
        addBattleLog('Opponent submitted solution... 10/12 test cases passed.');
        setOpponentProgress('Debugging...');
      } else if (step === 5) {
        // Opponent solves it at 75 seconds if player hasn't won yet
        clearInterval(opponentTimer.current);
        setOpponentProgress('Accepted');
        addBattleLog('Opponent solution Accepted (12/12 passed)!');
        setGameState('defeat');
      }
    }, 15000); // Trigger opponent logs every 15 seconds
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/dashboard/arena?room=${roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newValue);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const handleRunSubmit = async () => {
    if (!question) return;
    setRunning(true);
    setOutput('Compiling code...\nLinking standard libraries...\nExecuting sandboxed test suite...');

    const res = await JudgeService.validateSolution(code, lang, question);
    
    setTimeout(() => {
      setRunning(false);
      setOutput(res.logs);

      if (res.status === 'passed') {
        // Player wins! Clear opponent timer
        if (opponentTimer.current) clearInterval(opponentTimer.current);
        setGameState('victory');
        
        // Log submission to database history as type 'playground' / 'arena'
        apiClient.post('/api/playground/submit', {
          questionId: question._id,
          code,
          language: lang
        }).catch(err => console.error('Error saving arena solve:', err));
      }
    }, 1200);
  };

  const addBattleLog = (text) => {
    setBattleLogs(prev => [...prev, { text, time: new Date().toLocaleTimeString() }].slice(-5));
  };

  useEffect(() => {
    return () => {
      if (opponentTimer.current) clearInterval(opponentTimer.current);
    };
  }, []);

  return (
    <div className="min-h-[600px] flex flex-col justify-between">
      
      {/* 1. LOBBY STATE */}
      {gameState === 'lobby' && (
        <div className="max-w-2xl mx-auto w-full bg-[#0D0D12] border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-[#FF7A00]">
              <Swords size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Code Royale 1v1</h2>
              <p className="text-gray-500 text-xs">Join queue or invite a friend to a coding sprint</p>
            </div>
            <button onClick={onBack} className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-xl cursor-pointer">
              <ArrowLeft size={12} /> Back
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            {/* Matchmaking side */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-48 space-y-4">
              <div>
                <h3 className="text-white font-bold text-sm">Quick Match Lobby</h3>
                <p className="text-gray-500 text-xs leading-relaxed mt-1">
                  Queue up to match with online developers. Solve challenges to climb the rank leaderboard.
                </p>
              </div>
              <button 
                onClick={handleStartMatchmaking}
                className="w-full py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl shadow-lg hover:opacity-95 transition-all cursor-pointer"
              >
                Match Online Opponent
              </button>
            </div>

            {/* Private Match side */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-48 space-y-4">
              <div>
                <h3 className="text-white font-bold text-sm">Private Duel Arena</h3>
                <p className="text-gray-500 text-xs leading-relaxed mt-1">
                  Generate a room invitation link to practice or challenge your teammates.
                </p>
              </div>
              
              {roomCode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 bg-black border border-white/5 px-2 py-1.5 rounded-xl text-[10px] text-gray-400 justify-between">
                    <span className="font-mono">{roomCode}</span>
                    <button onClick={handleCopyLink} className="text-[#FF7A00] font-bold hover:text-white flex items-center gap-1 cursor-pointer">
                      {copied ? <Check size={10} /> : <Copy size={10} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  
                  {opponent ? (
                    <button 
                      onClick={() => {
                        setGameState('countdown');
                        startCountdown();
                      }}
                      className="w-full py-2 bg-green-500 text-black font-extrabold text-xs rounded-xl cursor-pointer"
                    >
                      Start Duel Fight!
                    </button>
                  ) : (
                    <button 
                      onClick={handleSimulateFriendJoin}
                      className="w-full py-2 bg-white/5 text-white border border-white/10 font-bold text-xs rounded-xl hover:bg-white/10 cursor-pointer"
                    >
                      Simulate Friend Join
                    </button>
                  )}
                </div>
              ) : (
                <button 
                  onClick={handleCreateRoom}
                  className="w-full py-2.5 bg-[#111115] text-white border border-white/10 hover:bg-white/5 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Create Custom Room
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. MATCHMAKING QUEUE STATE */}
      {gameState === 'matching' && (
        <div className="max-w-md mx-auto w-full bg-[#0D0D12] border border-white/5 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 bg-[#FF7A00]/20 rounded-full blur-md" />
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#FF7A00] flex items-center justify-center animate-spin">
              <Swords size={24} className="text-[#FFB800] rotate-45" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-white font-bold text-base">Matchmaking in Progress</h3>
            <p className="text-gray-500 text-xs">Waiting for a worthy rival to enter the lobby...</p>
          </div>
          <button 
            onClick={() => setGameState('lobby')}
            className="px-6 py-2 border border-white/10 text-gray-500 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel Queue
          </button>
        </div>
      )}

      {/* 3. COUNTDOWN SCREEN */}
      {gameState === 'countdown' && (
        <div className="max-w-md mx-auto w-full bg-[#0D0D12] border border-[#FF7A00]/30 p-12 rounded-3xl text-center shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
          <div className="absolute inset-0 bg-[#FF7A00]/5 animate-pulse" />
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block mb-4">Duel begins in</span>
          <motion.span 
            key={countdown}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FFD700]"
          >
            {countdown}
          </motion.span>
        </div>
      )}

      {/* 4. ACTIVE GAME SCREEN */}
      {gameState === 'active' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[500px]">
          {/* Left panel Question details */}
          <div className="w-full lg:w-[40%] border-r border-white/5 overflow-y-auto p-5 space-y-5 flex flex-col justify-between bg-[#0B0B0F]">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border text-yellow-400 bg-yellow-400/10 border-yellow-500/25">
                  {question?.difficulty}
                </span>
                <span className="text-xs text-gray-500 font-bold flex items-center gap-1">
                  ⚔️ Dueling: {opponent?.name}
                </span>
              </div>
              
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-white">{question?.title}</h1>
                <p className="text-xs text-slate-500">Acceptance Rate: {question?.acceptance}</p>
              </div>

              <div className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
                {question?.description || 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.'}
              </div>
            </div>

            {/* Duel Ticker */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider">Live Battle Logs</span>
              <div className="space-y-2 max-h-24 overflow-y-auto font-mono text-[10px] text-gray-500">
                {battleLogs.map((log, i) => (
                  <div key={i} className="flex justify-between border-b border-white/[0.02] pb-1">
                    <span>{log.text}</span>
                    <span className="text-gray-700">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel Code Editor */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#09090C] border-l border-white/5">
            {/* Toolbar header */}
            <div className="bg-[#0B0B0F] border-b border-white/5 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <select 
                  value={lang} 
                  onChange={(e) => setLang(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none cursor-pointer"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>

                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <span>Opponent progress:</span>
                  <span className="text-[#FF7A00] font-bold">{opponentProgress}</span>
                </div>
              </div>
            </div>

            {/* Custom Monospace textarea */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs flex leading-relaxed min-h-0">
              <div className="text-gray-600 text-right pr-3 select-none border-r border-white/5 w-8 space-y-0.5 font-mono">
                {code.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-green-400 p-0 pl-3 focus:outline-none resize-none h-full outline-none font-mono placeholder-gray-800 leading-relaxed overflow-y-auto"
                spellCheck="false"
                style={{ tabSize: 4 }}
              />
            </div>

            {/* Actions */}
            <div className="bg-[#0B0B0F] border-t border-white/5 px-6 py-3 flex items-center justify-between shrink-0">
              <button 
                onClick={() => setCode(sampleCodes[lang])}
                className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw size={13} /> Reset Code
              </button>

              <button
                onClick={handleRunSubmit}
                disabled={running}
                className="cursor-pointer px-6 py-2 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl flex items-center gap-1"
              >
                {running ? 'Running assertions...' : 'Submit Solution'}
              </button>
            </div>

            {/* Compile logs output */}
            <div className="h-28 bg-[#08080C] border-t border-white/5 p-4 overflow-y-auto font-mono text-[10px] text-gray-500 leading-relaxed">
              <span className="text-[8px] uppercase tracking-wider font-extrabold text-gray-600 block mb-1">Sandbox Evaluation logs</span>
              <pre className="whitespace-pre-wrap">{output}</pre>
            </div>
          </div>
        </div>
      )}

      {/* 5. VICTORY SCREEN */}
      {gameState === 'victory' && (
        <div className="max-w-md mx-auto w-full bg-[#0D0D12] border border-green-500/30 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-green-500/5 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center mx-auto text-green-400">
            <Trophy size={28} className="animate-bounce" />
          </div>
          
          <div className="space-y-1 relative">
            <h2 className="text-white font-black text-2xl">🏆 Code Royale Victory!</h2>
            <p className="text-gray-400 text-xs">Your code solved all test cases first, securing the win.</p>
            <p className="text-[#FFB800] font-extrabold text-sm pt-2">🔥 Streak Maintained! +20 Arena Points</p>
          </div>

          <button 
            onClick={() => setGameState('lobby')}
            className="w-full py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl shadow-lg hover:opacity-90 transition-opacity cursor-pointer relative"
          >
            Play Again
          </button>
        </div>
      )}

      {/* 6. DEFEAT SCREEN */}
      {gameState === 'defeat' && (
        <div className="max-w-md mx-auto w-full bg-[#0D0D12] border border-red-500/30 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto text-red-400">
            <Skull size={28} className="animate-pulse" />
          </div>
          
          <div className="space-y-1 relative">
            <h2 className="text-white font-black text-2xl">💀 Defeated!</h2>
            <p className="text-gray-400 text-xs">Your rival got their solution accepted before you.</p>
            <p className="text-red-400 font-extrabold text-sm pt-2">Score lost: -10 Arena Points</p>
          </div>

          <button 
            onClick={() => setGameState('lobby')}
            className="w-full py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs rounded-xl cursor-pointer relative"
          >
            Back to Arena Lobby
          </button>
        </div>
      )}

    </div>
  );
}
