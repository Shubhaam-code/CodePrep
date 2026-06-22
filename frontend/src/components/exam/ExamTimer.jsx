import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

/**
 * ExamTimer component that runs a visual countdown.
 *
 * Props:
 * @param {number} timeLimit - The initial time remaining in seconds
 * @param {function} onExpire - Callback function triggered when timer hits 0
 */
export default function ExamTimer({ timeLimit, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  // Synchronize internal time state when timeLimit prop changes
  useEffect(() => {
    setTimeLeft(timeLimit);
  }, [timeLimit]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onExpire]);

  // Formats time in MM:SS
  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Style thresholds: White (Normal) -> Yellow (Under 10min) -> Red (Under 5min)
  let styleClasses = 'text-white border-white/10 bg-white/5';
  let pulseClass = '';

  if (timeLeft < 300) {
    // Under 5 minutes: red + fast pulse
    styleClasses = 'text-red-500 border-red-500/20 bg-red-500/10';
    pulseClass = 'animate-[pulse_0.75s_infinite]';
  } else if (timeLeft < 600) {
    // Under 10 minutes: yellow + standard pulse
    styleClasses = 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10';
    pulseClass = 'animate-[pulse_1.5s_infinite]';
  }

  return (
    <div 
      className={`flex items-center gap-2 border px-4 py-1.5 rounded-full font-mono font-bold text-sm transition-all duration-300 ${styleClasses} ${pulseClass}`}
      title={`${Math.floor(timeLeft / 60)} minutes remaining`}
    >
      <Timer size={14} className={timeLeft < 600 ? 'animate-spin-slow' : ''} />
      <span>{formatTimer(timeLeft)}</span>
    </div>
  );
}
