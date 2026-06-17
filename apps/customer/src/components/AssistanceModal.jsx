import { useState, useRef, useEffect } from 'react';
import { X, Droplet, Wind, UtensilsCrossed, Flame, Bell, ArrowRight } from 'lucide-react';

export default function AssistanceModal({ isOpen, onClose, onNotify }) {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  const swipeContainerRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);

  // Reset state when opened and measure container
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setSwipeProgress(0);
      // Slight delay to ensure DOM is rendered before measuring
      setTimeout(() => {
        if (swipeContainerRef.current) {
          setContainerWidth(swipeContainerRef.current.offsetWidth);
        }
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Matches animation duration
  };

  const handleOptionClick = (optionId) => {
    // Send request immediately
    setTimeout(() => {
      if (onNotify) onNotify(optionId);
      handleClose();
    }, 100);
  };

  const handlePointerDown = (e) => {
    isDragging.current = true;
    startX.current = e.clientX;
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current || !swipeContainerRef.current) return;

    const knobWidth = 56; // approximate width of the bell circle
    const maxSwipe = containerWidth - knobWidth - 16; // 8px left and right padding

    let currentX = e.clientX - startX.current;
    if (currentX < 0) currentX = 0;
    if (currentX > maxSwipe) currentX = maxSwipe;

    const progress = (currentX / maxSwipe) * 100;
    setSwipeProgress(progress);
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;
    e.target.releasePointerCapture(e.pointerId);
    if (swipeProgress > 85) {
      // Confirmed
      setSwipeProgress(100);
      handleConfirm();
    } else {
      // Snap back
      setSwipeProgress(0);
    }
  };

  const handleConfirm = () => {
    // Mock the submission
    setTimeout(() => {
      if (onNotify) onNotify(`Waiter`);
      handleClose();
    }, 300);
  };

  const options = [
    { id: 'Water', label: 'Water', icon: Droplet },
    { id: 'Napkins', label: 'Napkins', icon: Wind },
    { id: 'Cutlery', label: 'Cutlery', icon: UtensilsCrossed },
    { id: 'Condiments', label: 'Condiments', icon: Flame },
  ];

  const maxTranslate = Math.max(0, containerWidth - 72); // 56 width + 16 padding
  const translateX = (swipeProgress / 100) * maxTranslate;

  return (
    <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[60] flex flex-col justify-end pointer-events-none">
      <div className={`absolute inset-0 bg-black/40 pointer-events-auto ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`} onClick={handleClose}></div>

      <div className={`bg-theme-bg w-full rounded-t-[2.5rem] rounded-b-none p-6 pb-10 relative z-10 shadow-2xl pointer-events-auto ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-[22px] font-bold text-theme-text-main tracking-tight ml-2">Request Assistance</h2>
          <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 text-theme-text-sec bg-theme-surface shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {options.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => handleOptionClick(opt.label)}
                className="flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-slate-50 bg-theme-surface shadow-sm hover:border-theme-primary hover:bg-theme-bg transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors shadow-sm bg-theme-bg">
                  <Icon size={20} className="text-theme-primary" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-[14px] text-theme-text-main">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Swipe to Confirm Button */}
        <div
          ref={swipeContainerRef}
          className="bg-theme-primary rounded-2xl p-[6px] relative h-[68px] flex items-center shadow-lg shadow-theme-primary/30 overflow-hidden select-none border border-theme-primary"
        >
          {/* Track Text */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-300 pl-[15px]"
            style={{ opacity: Math.max(0, 1 - (swipeProgress / 50)) }}
          >
            <div className="flex items-center gap-2 text-white font-bold text-lg tracking-wide drop-shadow-md">
              Call Waiter
            </div>
            <div className="text-[10px] text-theme-surface/90 font-extrabold uppercase tracking-widest mt-0.5 animate-pulse">
              Swipe to Confirm
            </div>
          </div>

          {/* Swipeable Knob */}
          <div
            className="w-[56px] h-[56px] bg-theme-surface rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-10 touch-none absolute left-[6px] transition-transform"
            style={{
              transform: `translateX(${translateX}px)`,
              transitionDuration: isDragging.current ? '0ms' : '300ms',
              transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <ArrowRight size={22} className="text-theme-primary" strokeWidth={3.5} />
          </div>
        </div>

      </div>
    </div>
  );
}
