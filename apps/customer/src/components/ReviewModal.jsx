import { useState } from 'react';
import { X, Star } from 'lucide-react';

export default function ReviewModal({ isOpen, onClose, googleMapsUrl }) {
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen && !isClosing) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Matches animation duration
  };

  const handleGoogleMapsClick = () => {
    // We delay closing slightly so the user can be redirected first
    setTimeout(() => {
      handleClose();
    }, 100);
  };

  return (
    <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[60] flex flex-col justify-end pointer-events-none">
      <div className={`absolute inset-0 bg-black/40 pointer-events-auto ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`} onClick={handleClose}></div>

      <div className={`bg-theme-bg w-full rounded-t-[2.5rem] rounded-b-none p-6 pb-10 relative z-10 shadow-2xl pointer-events-auto ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center shadow-sm">
              <Star size={24} fill="currentColor" />
            </div>
            <h2 className="text-[22px] font-bold text-theme-text-main tracking-tight">How was your meal?</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 flex flex-shrink-0 items-center justify-center rounded-full border border-slate-200 text-theme-text-sec bg-theme-surface shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {googleMapsUrl ? (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleGoogleMapsClick}
            className="w-full bg-theme-primary text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-theme-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2 mb-4"
          >
            {/* <Star size={18} fill="currentColor" /> */}
            Leave a Review on Google
          </a>
        ) : (
          <button
            onClick={handleClose}
            className="w-full bg-theme-primary text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-theme-primary/30 active:scale-95 transition-all mb-4"
          >
            Close
          </button>
        )}

        {/* <div className="flex justify-center w-full">
          <button
            onClick={handleClose}
            className="text-theme-text-sec font-bold text-xs uppercase tracking-wider hover:text-theme-text-main transition-colors py-2"
          >
            Maybe Later
          </button>
        </div> */}
      </div>
    </div>
  );
}
