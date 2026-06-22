import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

/**
 * CodeEditor component using Monaco Editor.
 * Auto-saves and restores code state per question.
 *
 * Props:
 * @param {string} language - The selected language (javascript, python, java, cpp)
 * @param {function} onChange - Callback function on code change (value => void)
 * @param {string} defaultCode - The default starter code for the selected language
 * @param {string} examId - The active exam ID for autosave keying
 * @param {number} questionIndex - The active question index for autosave keying
 */
export default function CodeEditor({ 
  language, 
  onChange, 
  defaultCode, 
  examId, 
  questionIndex 
}) {
  const editorRef = useRef(null);
  const storageKey = `exam_code_${examId}_${questionIndex}`;

  // Map editor language identifiers
  const getEditorLanguage = (lang) => {
    const l = lang ? lang.toLowerCase() : 'javascript';
    if (l === 'cpp') return 'cpp';
    if (l === 'python') return 'python';
    if (l === 'java') return 'java';
    return 'javascript';
  };

  // Restore saved code on mount or when switching questions
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      onChange(saved);
    } else {
      onChange(defaultCode || '');
    }
  }, [storageKey, defaultCode]);

  // Handle editor values changing
  const handleEditorChange = (value) => {
    const codeVal = value || '';
    localStorage.setItem(storageKey, codeVal);
    onChange(codeVal);
  };

  return (
    <div className="w-full h-full bg-[#0E0E12] rounded-2xl border border-white/5 overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 relative">
        <Editor
          height="100%"
          language={getEditorLanguage(language)}
          value={localStorage.getItem(storageKey) ?? (defaultCode || '')}
          onChange={handleEditorChange}
          theme="vs-dark"
          loading={
            <div className="absolute inset-0 flex items-center justify-center bg-[#09090C] text-xs text-gray-500 font-mono">
              Loading Editor...
            </div>
          }
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            tabSize: 4,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            padding: { top: 12, bottom: 12 },
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>
    </div>
  );
}
