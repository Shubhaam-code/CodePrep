import React from 'react';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FF7A00]"></div>
    </div>
  );
}

export default LoadingSpinner;
