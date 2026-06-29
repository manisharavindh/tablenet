import { useState, useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

export default function SlideToConfirm({ onConfirm, text = "Place order", subtext = "Swipe to Confirm", variant = "primary" }) {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const swipeContainerRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);

  useEffect(() => {
    setSwipeProgress(0);
    setTimeout(() => {
      if (swipeContainerRef.current) {
        setContainerWidth(swipeContainerRef.current.offsetWidth);
      }
    }, 50);
  }, []);

  const handlePointerDown = (e) => {
    isDragging.current = true;
    startX.current = e.clientX;
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current || !swipeContainerRef.current) return;

    const knobWidth = 56;
    const maxSwipe = containerWidth - knobWidth - 16;

    let currentX = e.clientX - startX.current;
    if (currentX < 0) currentX = 0;
    if (currentX > maxSwipe) currentX = maxSwipe;

    const progress = (currentX / maxSwipe) * 100;
    setSwipeProgress(progress);
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;
    try {
      if (e.target.hasPointerCapture(e.pointerId)) {
        e.target.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
    if (swipeProgress > 85) {
      setSwipeProgress(100);
      setTimeout(() => onConfirm(), 200);
    } else {
      setSwipeProgress(0);
    }
  };

  const maxTranslate = Math.max(0, containerWidth - 72);
  const translateX = (swipeProgress / 100) * maxTranslate;

  const wrapperClass = variant === 'success'
    ? "bg-[#1AA147] rounded-2xl p-[6px] relative h-[68px] flex items-center shadow-lg shadow-green-600/30 overflow-hidden select-none border border-[#1AA147] w-full"
    : "bg-theme-primary rounded-2xl p-[6px] relative h-[68px] flex items-center shadow-lg shadow-theme-primary/30 overflow-hidden select-none border border-theme-primary w-full";

  const iconClass = variant === 'success' ? "text-[#1AA147]" : "text-theme-primary";

  return (
    <div
      ref={swipeContainerRef}
      className={wrapperClass}
    >
      {/* Track Text */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pl-[15px] transition-opacity duration-300"
        style={{ opacity: Math.max(0, 1 - (swipeProgress / 50)) }}
      >
        <div className="flex items-center gap-2 text-white font-bold text-lg tracking-wide drop-shadow-md">
          {text}
        </div>
        <div className="text-[10px] text-white/90 font-extrabold uppercase tracking-widest mt-0.5 animate-pulse">
          {subtext}
        </div>
      </div>

      {/* Swipeable Knob */}
      <div
        className="w-[56px] h-[56px] bg-white rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-10 touch-none absolute left-[6px] transition-transform"
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
        <ArrowRight size={22} className={iconClass} strokeWidth={3.5} />
      </div>
    </div>
  );
}
