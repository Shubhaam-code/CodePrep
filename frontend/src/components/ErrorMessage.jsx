import React from 'react';

function ErrorMessage({ message }) {
  return (
    <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-4 text-center max-w-md mx-auto my-6">
      <p className="text-red-400 font-semibold text-sm">Error Occurred</p>
      <p className="text-xs text-red-500/80 mt-1">{message || 'An unexpected error occurred. Please try again.'}</p>
    </div>
  );
}

export default ErrorMessage;
