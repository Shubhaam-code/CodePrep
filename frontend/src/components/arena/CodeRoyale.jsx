import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
  Swords, Copy, Check, Users, ArrowLeft, Trophy, Skull, 
  UserCheck, Timer, RefreshCw, Send, ShieldAlert, AlertCircle 
} from 'lucide-react';
import { useAppSelector } from '../../store/store';
import apiClient from '../../api/axios';
import MonacoEditorWorkspace from '../shared/MonacoEditorWorkspace';

const socketUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function CodeRoyale({ onBack }) {
  const { user } = useAppSelector(s => s.auth);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Socket reference
  const socketRef = useRef(null);

  // States
  const [roomCode, setRoomCode] = useState(searchParams.get('room') || '');
  const [room, setRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Game loops
  const [gameState, setGameState] = useState('lobby'); // 'lobby' | 'countdown' | 'active' | 'victory' | 'defeat'
  const [countdown, setCountdown] = useState(5);
  const [question, setQuestion] = useState(null);
  const [difficulty, setDifficulty] = useState('Medium');

  // Coding states
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  // Opponent notification status
  const [opponentSubmittingStatus, setOpponentSubmittingStatus] = useState('');

  // Re-evaluation stats for winner / loser
  const [battleResults, setBattleResults] = useState(null); // { winnerUsername, runtime, memory, duration }

  // Auto connect and join if room query param exists
  useEffect(() => {
    const urlRoom = searchParams.get('room');
    if (urlRoom && user) {
      setRoomCode(urlRoom);
      joinLobbyRoom(urlRoom);
    }
  }, [searchParams, user]);

  // Setup WebSocket connection
  const initSocketConnection = (code) => {
    if (socketRef.current) return;

    const socket = io(socketUrl, {
      transports: ['websocket'],
      forceNew: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket client connected:', socket.id);
      socket.emit('join_room', {
        roomCode: code,
        userId: user._id,
        username: user.name
      });
    });

    socket.on('room_updated', (updatedRoom) => {
      setRoom(updatedRoom);
      if (updatedRoom.status === 'countdown') {
        setGameState('countdown');
      } else if (updatedRoom.status === 'active') {
        setQuestion(updatedRoom.questionId);
        setGameState('active');
      } else if (updatedRoom.status === 'finished') {
        // Resolve victory or defeat
        const isWinner = updatedRoom.winnerId === user._id;
        const winnerSubmission = updatedRoom.playersSubmitted.find(sub => sub.userId === updatedRoom.winnerId);
        
        setBattleResults({
          winnerUsername: updatedRoom.winnerId === updatedRoom.player1.userId ? updatedRoom.player1.username : updatedRoom.player2.username,
          runtime: winnerSubmission ? winnerSubmission.runtime : 0,
          memory: winnerSubmission ? winnerSubmission.memory : 0,
          duration: updatedRoom.startedAt ? Math.floor((new Date(updatedRoom.updatedAt) - new Date(updatedRoom.startedAt)) / 1000) : 0
        });

        setGameState(isWinner ? 'victory' : 'defeat');
      }
    });

    socket.on('countdown_tick', (tick) => {
      setCountdown(tick);
    });

    socket.on('game_start', (startedRoom) => {
      setRoom(startedRoom);
      setQuestion(startedRoom.questionId);
      setGameState('active');
    });

    socket.on('opponent_submitted', ({ userId }) => {
      setOpponentSubmittingStatus('Opponent submitted code (incorrect output)');
      setTimeout(() => setOpponentSubmittingStatus(''), 4000);
    });

    socket.on('game_over', ({ room: finishedRoom, winnerId, winnerUsername, runtime, memory, duration }) => {
      setRoom(finishedRoom);
      setBattleResults({
        winnerUsername,
        runtime,
        memory,
        duration
      });
      const isWinner = winnerId === user._id;
      setGameState(isWinner ? 'victory' : 'defeat');
    });

    socket.on('error_message', (msg) => {
      setErrorMsg(msg);
      // Revert states
      setRoomCode('');
      setSearchParams({});
    });
  };

  const cleanupSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupSocket();
    };
  }, []);

  const handleCreateRoom = async () => {
    try {
      setErrorMsg('');
      const res = await apiClient.post('/api/arena/create', { difficulty });
      const newRoom = res.data;
      setRoom(newRoom);
      setRoomCode(newRoom.roomCode);
      setSearchParams({ room: newRoom.roomCode });
      initSocketConnection(newRoom.roomCode);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to create private room.');
    }
  };

  const joinLobbyRoom = async (code) => {
    try {
      setErrorMsg('');
      const res = await apiClient.get(`/api/arena/room/${code}`);
      setRoom(res.data);
      initSocketConnection(code);
    } catch (err) {
      console.error(err);
      setErrorMsg('Invalid lobby code or room expired.');
    }
  };

  const handleToggleReady = () => {
    if (socketRef.current && roomCode) {
      socketRef.current.emit('toggle_ready', {
        roomCode,
        userId: user._id
      });
    }
  };

  const handleRun = async (code, language, customInput) => {
    if (!question) return;
    try {
      setRunning(true);
      setResults(null);
      const res = await apiClient.post('/api/judge/run', {
        code,
        language,
        questionId: question._id,
        input: customInput
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
      setResults({
        status: 'Compilation Error',
        error: err.response?.data?.message || 'Connection failed.'
      });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async (code, language) => {
    if (!question) return;
    try {
      setSubmitting(true);
      setResults(null);
      const res = await apiClient.post('/api/judge/submit', {
        code,
        language,
        questionId: question._id
      });
      setResults(res.data);

      const isPassed = res.data.status === 'Accepted';
      
      // Notify server of submission outcomes
      if (socketRef.current) {
        socketRef.current.emit('submit_solution', {
          roomCode,
          userId: user._id,
          code,
          language,
          runtime: res.data.runtime || 0,
          memory: res.data.memory || 0,
          isCorrect: isPassed
        });
      }
    } catch (err) {
      console.error(err);
      setResults({
        status: 'Compilation Error',
        error: err.response?.data?.message || 'Submission failed.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/dashboard/arena?room=${roomCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    cleanupSocket();
    setRoom(null);
    setRoomCode('');
    setSearchParams({});
    setGameState('lobby');
    if (onBack) onBack();
  };

  const isPlayer1 = room?.player1 && room.player1.userId === user._id;
  const isPlayer2 = room?.player2 && room.player2.userId === user._id;

  return (
    <div className="flex-1 flex flex-col min-h-[600px] w-full">
      {/* 1. LOBBY setup/creation screen */}
      {gameState === 'lobby' && !room && (
        <div className="max-w-2xl mx-auto w-full bg-[#0D0D12] border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl relative my-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-[#FF7A00]">
              <Swords size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Private Duel Lobbies</h2>
              <p className="text-gray-500 text-xs font-semibold">Challenge a friend to a real-time coding race</p>
            </div>
            <button 
              onClick={onBack} 
              className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors border border-white/5 hover:border-white/10 px-3 py-1.5 rounded-xl cursor-pointer"
            >
              <ArrowLeft size={12} /> Exit Hub
            </button>
          </div>

          {errorMsg && (
            <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl flex items-center gap-2 text-xs text-red-400">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            {/* Create Room box */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-56 space-y-4">
              <div>
                <h3 className="text-white font-bold text-sm">Create Arena Room</h3>
                <p className="text-gray-500 text-xs leading-relaxed mt-1 font-semibold">
                  Generate a private room and set your preferred challenge difficulty level.
                </p>

                {/* Difficulty options */}
                <div className="flex gap-1.5 mt-4">
                  {['Easy', 'Medium', 'Hard'].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`cursor-pointer px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                        difficulty === diff 
                          ? 'bg-[#FF7A00] text-black font-extrabold shadow'
                          : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleCreateRoom}
                className="w-full py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl shadow-lg hover:opacity-95 transition-all cursor-pointer"
              >
                Create Room Link
              </button>
            </div>

            {/* Join Room box */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-56 space-y-4">
              <div>
                <h3 className="text-white font-bold text-sm">Enter Battle Room</h3>
                <p className="text-gray-500 text-xs leading-relaxed mt-1 font-semibold">
                  Paste the invite lobby code shared by your friend to join the duel.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="ARENA-ROYALE-XXXX"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-black border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-700 outline-none text-center font-mono focus:border-[#FF7A00]"
                />
                <button 
                  onClick={() => joinLobbyRoom(roomCode)}
                  className="w-full py-2.5 bg-[#111115] text-white border border-white/10 hover:bg-white/5 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Join Battle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. WAITING ROOM SCREEN */}
      {gameState === 'lobby' && room && (
        <div className="max-w-md mx-auto w-full bg-[#0D0D12] border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl my-8 relative">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#FF7A00]" />
              <h3 className="text-white font-bold text-sm">Duel Waiting Room</h3>
            </div>
            <button 
              onClick={handleLeaveRoom}
              className="text-xs text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              Leave Room
            </button>
          </div>

          {/* Invite Code block */}
          <div className="bg-black/50 border border-white/5 rounded-2xl p-4 text-center space-y-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block">Invite Your Friend</span>
            <div className="flex items-center justify-between bg-black border border-white/5 px-3 py-2 rounded-xl text-xs text-gray-400 font-mono">
              <span>{room.roomCode}</span>
              <button 
                onClick={handleCopyLink} 
                className="text-[#FF7A00] font-bold hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Players status */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block">Players status</span>
            
            {/* Player 1 */}
            <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-white">{room.player1.username}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                room.player1.ready 
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                  : 'text-gray-500 bg-white/5 border-white/10'
              }`}>
                {room.player1.ready ? 'Ready' : 'Not Ready'}
              </span>
            </div>

            {/* Player 2 */}
            {room.player2 && room.player2.userId ? (
              <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${room.player2.connected ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                  <span className="text-xs font-bold text-white">{room.player2.username}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                  room.player2.ready 
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                    : 'text-gray-500 bg-white/5 border-white/10'
                }`}>
                  {room.player2.ready ? 'Ready' : 'Not Ready'}
                </span>
              </div>
            ) : (
              <div className="border border-dashed border-white/10 p-5 rounded-2xl text-center text-xs text-gray-500 italic">
                Waiting for opponent to connect...
              </div>
            )}
          </div>

          {/* Ready Action */}
          {room.player1 && room.player2 && room.player2.userId && (
            <button
              onClick={handleToggleReady}
              className={`w-full py-2.5 rounded-xl font-extrabold text-xs transition-all shadow-md cursor-pointer ${
                ((isPlayer1 && room.player1.ready) || (isPlayer2 && room.player2.ready))
                  ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  : 'bg-[#FF7A00] text-black hover:opacity-95 shadow-[#FF7A00]/10'
              }`}
            >
              {((isPlayer1 && room.player1.ready) || (isPlayer2 && room.player2.ready)) ? 'Cancel Ready' : 'Set Ready'}
            </button>
          )}
        </div>
      )}

      {/* 3. COUNTDOWN SCREEN */}
      {gameState === 'countdown' && (
        <div className="max-w-md mx-auto w-full bg-[#0D0D12] border border-[#FF7A00]/30 p-12 rounded-3xl text-center shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[300px] my-12">
          <div className="absolute inset-0 bg-[#FF7A00]/5 animate-pulse" />
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black block mb-4">Duel begins in</span>
          <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FFD700]">
            {countdown}
          </span>
        </div>
      )}

      {/* 4. ACTIVE GAME SCREEN */}
      {gameState === 'active' && question && (
        <div className="flex-1 flex flex-col overflow-hidden h-full">
          <MonacoEditorWorkspace
            question={question}
            onRun={handleRun}
            onSubmit={handleSubmit}
            running={running}
            submitting={submitting}
            results={results}
            sidebarContent={
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                {/* Connection/Matchup labels */}
                <div className="flex items-center gap-4 text-gray-400 font-bold">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${room?.player1?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span>{room?.player1?.username || 'P1'}</span>
                  </div>
                  <span className="text-gray-600">vs</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${room?.player2?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span>{room?.player2?.username || 'P2'}</span>
                  </div>
                </div>

                {/* Toast status alert */}
                {opponentSubmittingStatus && (
                  <div className="bg-[#FFB800]/10 border border-[#FFB800]/25 px-2.5 py-1 rounded-lg text-[10px] text-[#FFB800] font-bold animate-pulse">
                    ⚠️ {opponentSubmittingStatus}
                  </div>
                )}
              </div>
            }
          />
        </div>
      )}

      {/* 5. VICTORY MODAL */}
      {gameState === 'victory' && battleResults && (
        <div className="max-w-md mx-auto w-full bg-[#0D0D12] border border-green-500/30 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden my-8">
          <div className="absolute inset-0 bg-green-500/5 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center mx-auto text-green-400">
            <Trophy size={28} className="animate-bounce" />
          </div>
          
          <div className="space-y-1.5 relative">
            <h2 className="text-white font-black text-2xl">🏆 Battle Victory!</h2>
            <p className="text-gray-400 text-xs leading-relaxed">
              Your solution passed all visible and hidden assertions first!
            </p>

            {/* Duel Stats breakdown */}
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 mt-4 space-y-2 text-xs font-mono text-left max-w-xs mx-auto">
              <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                <span className="text-gray-500">Winner:</span>
                <span className="text-white font-bold">{battleResults.winnerUsername}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                <span className="text-gray-500">Runtime:</span>
                <span className="text-white font-bold">{battleResults.runtime} ms</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                <span className="text-gray-500">Memory:</span>
                <span className="text-white font-bold">{battleResults.memory} KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Solving Time:</span>
                <span className="text-white font-bold">{battleResults.duration} seconds</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 relative">
            <button 
              onClick={() => setGameState('active')}
              className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Keep Coding
            </button>
            <button 
              onClick={handleLeaveRoom}
              className="flex-1 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              Exit Battle
            </button>
          </div>
        </div>
      )}

      {/* 6. DEFEAT SCREEN */}
      {gameState === 'defeat' && battleResults && (
        <div className="max-w-md mx-auto w-full bg-[#0D0D12] border border-red-500/30 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden my-8">
          <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto text-red-400">
            <Skull size={28} className="animate-pulse" />
          </div>
          
          <div className="space-y-1.5 relative">
            <h2 className="text-white font-black text-2xl">💀 Defeated!</h2>
            <p className="text-gray-400 text-xs leading-relaxed">
              Your opponent solved the problem first.
            </p>

            {/* Duel Stats breakdown */}
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 mt-4 space-y-2 text-xs font-mono text-left max-w-xs mx-auto">
              <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                <span className="text-gray-500">Winner:</span>
                <span className="text-white font-bold">{battleResults.winnerUsername}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                <span className="text-gray-500">Opponent Runtime:</span>
                <span className="text-white font-bold">{battleResults.runtime} ms</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                <span className="text-gray-500">Opponent Memory:</span>
                <span className="text-white font-bold">{battleResults.memory} KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Solving Time:</span>
                <span className="text-white font-bold">{battleResults.duration} seconds</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 relative">
            <button 
              onClick={() => setGameState('active')}
              className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Keep Coding
            </button>
            <button 
              onClick={handleLeaveRoom}
              className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-[#FF7A00] text-white font-extrabold text-xs rounded-xl shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              Exit Battle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
