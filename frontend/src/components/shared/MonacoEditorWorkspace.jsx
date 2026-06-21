import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, Send, Terminal, RotateCcw, ChevronDown, ChevronUp, AlertCircle, 
  CheckCircle, XCircle, Info, Lightbulb, Clock, Cpu
} from 'lucide-react';

const defaultStarter = {
  javascript: 'function solve(input) {\n    // Write your solution here\n    return input;\n}',
  python: 'class Solution:\n    def solve(self, input):\n        # Write your solution here\n        return input',
  cpp: 'class Solution {\npublic:\n    int solve(int input) {\n        // Write your solution here\n        return input;\n    }\n};',
  java: 'class Solution {\n    public int solve(int input) {\n        // Write your solution here\n        return input;\n    }\n}'
};

export default function MonacoEditorWorkspace({
  question,
  onRun,
  onSubmit,
  running = false,
  submitting = false,
  results = null,
  sidebarContent = null
}) {
  const [lang, setLang] = useState('javascript');
  const [code, setCode] = useState('');
  const [leftWidth, setLeftWidth] = useState(45); // percentage
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleTab, setConsoleTab] = useState('testcase'); // 'testcase' | 'result'
  const [customInput, setCustomInput] = useState('');
  const [activeHint, setActiveHint] = useState(null);

  const containerRef = useRef(null);
  const isDragging = useRef(false);

  // Set initial starter code when question or language changes
  useEffect(() => {
    if (question) {
      const qStarter = question.starterCode || {};
      setCode(qStarter[lang] || defaultStarter[lang] || '');
      // Set initial custom input to the first testcase input
      if (question.testCases && question.testCases.length > 0) {
        setCustomInput(question.testCases[0].input);
      } else {
        setCustomInput('1');
      }
    }
  }, [question, lang]);

  // Handle panel resizing
  const startResize = (e) => {
    isDragging.current = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResize = (e) => {
    if (!isDragging.current || !containerRef.current) return;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const newLeftWidth = (e.clientX / containerWidth) * 100;
    if (newLeftWidth > 20 && newLeftWidth < 80) {
      setLeftWidth(newLeftWidth);
    }
  };

  const stopResize = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  // Define custom LeetCode-style dark theme
  const handleEditorBeforeMount = (monaco) => {
    monaco.editor.defineTheme('leetcode-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '7A869A', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'FF7A00', fontStyle: 'bold' },
        { token: 'storage.type', foreground: '00D2FF' },
        { token: 'type', foreground: '00D2FF' },
        { token: 'class', foreground: 'FFD700' },
        { token: 'function', foreground: '00FF87' },
        { token: 'string', foreground: '36E2B2' },
        { token: 'number', foreground: 'FF85A0' },
        { token: 'variable', foreground: 'E2E8F0' },
        { token: 'operator', foreground: 'FFB800' },
      ],
      colors: {
        'editor.background': '#0F1117',
        'editor.foreground': '#E2E8F0',
        'editor.lineHighlightBackground': '#1A1D27',
        'editorLineNumber.foreground': '#4E536A',
        'editorLineNumber.activeForeground': '#FF7A00',
        'editorCursor.foreground': '#FF7A00',
      }
    });
  };

  // Run and Submit handlers
  const handleRunClick = () => {
    setConsoleTab('result');
    setConsoleOpen(true);
    if (onRun) onRun(code, lang, customInput);
  };

  const handleSubmitClick = () => {
    setConsoleTab('result');
    setConsoleOpen(true);
    if (onSubmit) onSubmit(code, lang);
  };

  const handleResetCode = () => {
    if (window.confirm('Are you sure you want to reset your code to the starter template?')) {
      const qStarter = question?.starterCode || {};
      setCode(qStarter[lang] || defaultStarter[lang] || '');
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleSubmitClick();
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleRunClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, lang, customInput, onRun, onSubmit]);

  const difficultyColor = (diff) => {
    if (diff === 'Easy') return 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20';
    if (diff === 'Medium') return 'text-amber-400 bg-amber-400/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-400/10 border-rose-500/20';
  };

  return (
    <div 
      ref={containerRef} 
      className="flex-1 flex overflow-hidden w-full h-[calc(100vh-64px)] relative bg-[#0B0B0F]"
    >
      {/* LEFT PANEL: Problem description */}
      <div 
        style={{ width: `${leftWidth}%` }} 
        className="flex flex-col border-r border-white/5 bg-[#0D0D12]/40 overflow-y-auto"
      >
        {/* Dynamic Sidebar Slot (e.g. Lobby panel, Opponent status, etc.) */}
        {sidebarContent && (
          <div className="border-b border-white/5 p-4 bg-[#111116]/80 backdrop-blur">
            {sidebarContent}
          </div>
        )}

        <div className="p-6 space-y-6 flex-1">
          {/* Header Row */}
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${difficultyColor(question?.difficulty)}`}>
              {question?.difficulty || 'Medium'}
            </span>
            <span className="text-xs text-gray-500 font-semibold">
              Acceptance: <span className="text-gray-300 font-bold">{question?.acceptance || '50%'}</span>
            </span>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-black text-white">
              {question?.title || 'Loading Question...'}
            </h1>
          </div>

          {/* Description */}
          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
            {question?.description || 'Problem statement details are loading from the database...'}
          </div>

          {/* Examples */}
          {question?.examples && question.examples.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Examples</h3>
              {question.examples.map((ex, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-xs">
                  <div className="text-[#FF7A00] font-bold">Example {i + 1}:</div>
                  <div>
                    <span className="text-gray-500 font-bold">Input: </span>
                    <span className="text-gray-300">{ex.input}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-bold">Output: </span>
                    <span className="text-[#FFB800]">{ex.output}</span>
                  </div>
                  {ex.explanation && (
                    <div>
                      <span className="text-gray-500 font-bold">Explanation: </span>
                      <span className="text-gray-400 font-sans italic">{ex.explanation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Constraints */}
          {question?.constraints && question.constraints.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Constraints</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-400 font-mono">
                {question.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Hints Section */}
          {question?.constraints && (
            <div className="space-y-2 pt-4 border-t border-white/5">
              <button 
                onClick={() => setActiveHint(activeHint === 1 ? null : 1)}
                className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <Lightbulb size={14} className="text-[#FF7A00]" />
                {activeHint === 1 ? 'Hide Hint' : 'Show Hint'}
              </button>
              {activeHint === 1 && (
                <div className="p-3 bg-[#FF7A00]/5 border border-[#FF7A00]/20 rounded-xl text-xs text-gray-400 leading-relaxed font-sans">
                  Optimize your space/time complexity by keeping a registry/seen map of elements as you traverse.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DRAG HANDLER */}
      <div 
        onMouseDown={startResize}
        className="w-1.5 h-full cursor-col-resize hover:bg-[#FF7A00]/40 transition-colors shrink-0 bg-transparent flex items-center justify-center z-10"
      >
        <div className="w-[1px] h-20 bg-white/10" />
      </div>

      {/* RIGHT PANEL: Editor & Console */}
      <div 
        style={{ width: `${100 - leftWidth}%` }} 
        className="flex flex-col overflow-hidden h-full bg-[#08080C]"
      >
        {/* Editor Toolbar */}
        <div className="h-12 border-b border-white/5 px-4 flex items-center justify-between shrink-0 bg-[#0D0D12]/60">
          <div className="flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-white/5 border border-white/8 rounded-xl px-3 py-1.5 text-xs text-gray-300 outline-none cursor-pointer focus:border-[#FF7A00]"
            >
              <option value="javascript" className="bg-[#0D0D12]">JavaScript</option>
              <option value="python" className="bg-[#0D0D12]">Python</option>
              <option value="cpp" className="bg-[#0D0D12]">C++</option>
              <option value="java" className="bg-[#0D0D12]">Java</option>
            </select>
          </div>

          <button 
            onClick={handleResetCode}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-white transition-colors cursor-pointer"
            title="Reset code to default"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>

        {/* Monaco Editor Component */}
        <div className="flex-1 min-h-0 relative font-sans text-sm">
          <Editor
            height="100%"
            language={lang === 'cpp' ? 'cpp' : lang === 'python' ? 'python' : lang === 'java' ? 'java' : 'javascript'}
            theme="leetcode-dark"
            beforeMount={handleEditorBeforeMount}
            value={code}
            onChange={(val) => setCode(val || '')}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              lineHeight: 22,
              minimap: { enabled: false },
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 4,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              lineNumbersMinChars: 3,
              padding: { top: 12 },
              autoIndent: 'advanced',
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              formatOnType: true,
              formatOnPaste: true,
              folding: true,
              bracketPairColorization: { enabled: true },
              renderLineHighlight: 'all',
            }}
          />
        </div>

        {/* BOTTOM CONSOLE DRAWER */}
        <div className={`border-t border-white/5 bg-[#0D0D12] flex flex-col shrink-0 transition-all duration-300 ${consoleOpen ? 'h-64' : 'h-10'}`}>
          {/* Header row */}
          <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between shrink-0 bg-[#0E0E14] select-none">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setConsoleTab('testcase'); setConsoleOpen(true); }}
                className={`px-3 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  consoleOpen && consoleTab === 'testcase' 
                    ? 'border-[#FF7A00] text-[#FF7A00]' 
                    : 'border-transparent text-gray-500 hover:text-white'
                }`}
              >
                Testcase
              </button>
              <button 
                onClick={() => { setConsoleTab('result'); setConsoleOpen(true); }}
                className={`px-3 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  consoleOpen && consoleTab === 'result' 
                    ? 'border-[#FF7A00] text-[#FF7A00]' 
                    : 'border-transparent text-gray-500 hover:text-white'
                }`}
              >
                Result
              </button>
            </div>

            <button 
              onClick={() => setConsoleOpen(!consoleOpen)}
              className="text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              {consoleOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>

          {/* Console Content Box */}
          {consoleOpen && (
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-gray-300">
              {/* TAB 1: Testcase inputs */}
              {consoleTab === 'testcase' && (
                <div className="space-y-3 h-full flex flex-col">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Custom Testcase Input:</div>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter testcase inputs (newline separated for multiple parameters)"
                    className="w-full flex-1 bg-[#09090C] border border-white/5 rounded-xl p-3 text-green-400 font-mono text-xs focus:outline-none focus:border-[#FF7A00] resize-none h-28"
                  />
                </div>
              )}

              {/* TAB 2: Compilation results */}
              {consoleTab === 'result' && (
                <div className="space-y-4">
                  {running || submitting ? (
                    <div className="flex items-center gap-2 text-gray-400 p-2">
                      <Terminal className="animate-spin text-[#FF7A00]" size={16} />
                      <span>{submitting ? 'Running all assertions...' : 'Compiling code & running assertions...'}</span>
                    </div>
                  ) : results ? (
                    <div className="space-y-3">
                      {/* Verdict banner */}
                      <div className="flex items-center gap-2">
                        {results.status === 'Accepted' ? (
                          <div className="flex items-center gap-1.5 text-green-400 font-bold text-sm bg-green-500/10 px-3 py-1 rounded-xl border border-green-500/25">
                            <CheckCircle size={14} /> Accepted
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-red-400 font-bold text-sm bg-red-500/10 px-3 py-1 rounded-xl border border-red-500/25">
                            <XCircle size={14} /> {results.status}
                          </div>
                        )}

                        <span className="text-gray-500">|</span>
                        
                        {results.passedCases !== undefined && (
                          <span className="text-xs text-gray-400 font-bold">
                            Passed: {results.passedCases} / {results.totalCases} cases
                          </span>
                        )}
                      </div>

                      {/* Performance row */}
                      <div className="flex items-center gap-4 text-[10px] text-gray-500 bg-white/[0.01] border border-white/5 px-3 py-1.5 rounded-xl">
                        <div className="flex items-center gap-1">
                          <Clock size={11} className="text-[#FF7A00]" />
                          <span>Runtime: <strong className="text-white">{results.runtime || 0} ms</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Cpu size={11} className="text-[#FFB800]" />
                          <span>Memory: <strong className="text-white">{results.memory || 0} KB</strong></span>
                        </div>
                      </div>

                      {/* Detail inputs/outputs */}
                      <div className="space-y-2 bg-[#09090C] border border-white/5 p-3.5 rounded-xl">
                        {results.failedCase ? (
                          <div className="space-y-1.5 text-xs">
                            <div className="text-red-400 font-bold">Failed on Testcase {results.failedCase.caseNumber}:</div>
                            <div>
                              <span className="text-gray-500 font-bold">Input:</span>
                              <pre className="text-gray-300 mt-0.5">{results.failedCase.input}</pre>
                            </div>
                            <div>
                              <span className="text-gray-500 font-bold">Expected Output:</span>
                              <pre className="text-green-400 mt-0.5">{results.failedCase.expectedOutput}</pre>
                            </div>
                            <div>
                              <span className="text-gray-500 font-bold">Your Output:</span>
                              <pre className="text-red-400 mt-0.5">{results.failedCase.actualOutput || 'N/A'}</pre>
                            </div>
                            {results.failedCase.error && (
                              <div>
                                <span className="text-red-500 font-bold">Error Logs:</span>
                                <pre className="text-red-400/80 bg-red-950/20 p-2 rounded-xl mt-1 border border-red-900/30 overflow-x-auto whitespace-pre-wrap">{results.failedCase.error}</pre>
                              </div>
                            )}
                          </div>
                        ) : results.error ? (
                          <div>
                            <span className="text-red-500 font-bold block mb-1">Execution Output / Errors:</span>
                            <pre className="text-red-400/80 bg-red-950/20 p-2.5 rounded-xl border border-red-900/30 overflow-x-auto whitespace-pre-wrap">{results.error}</pre>
                          </div>
                        ) : (
                          <div className="space-y-1.5 text-xs">
                            <div>
                              <span className="text-gray-500 font-bold">Expected Output:</span>
                              <pre className="text-green-400 mt-0.5">{results.expectedOutput || results.output}</pre>
                            </div>
                            <div>
                              <span className="text-gray-500 font-bold">Your Output:</span>
                              <pre className="text-gray-300 mt-0.5">{results.output}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-600 italic">No execution result logs yet. Click "Run Code" or "Submit".</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Console control footer */}
        <div className="h-12 border-t border-white/5 px-6 flex items-center justify-between shrink-0 bg-[#0B0B0F]">
          <button 
            onClick={() => setConsoleOpen(!consoleOpen)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            <Terminal size={13} />
            <span>Console</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunClick}
              disabled={running || submitting}
              className="cursor-pointer px-4.5 py-1.5 border border-white/10 hover:border-white/20 hover:bg-white/5 text-xs font-bold text-gray-300 rounded-xl transition-all disabled:opacity-40"
              title="Run against visible sample cases (Ctrl + Enter)"
            >
              Run Code
            </button>
            <button
              onClick={handleSubmitClick}
              disabled={running || submitting}
              className="cursor-pointer px-5 py-1.5 bg-gradient-to-r from-[#FF7A00] to-[#FFB800] text-black font-extrabold text-xs rounded-xl flex items-center gap-1 hover:opacity-95 shadow-md shadow-[#FF7A00]/10 disabled:opacity-40"
              title="Submit against all testcases (Ctrl + Shift + Enter)"
            >
              <Send size={11} className="fill-black" />
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
