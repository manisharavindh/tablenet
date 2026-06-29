import { Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import SuggestedDesserts from './SuggestedDesserts';

export default function CartPage({ isOpen, onClose, cart, tableNumber, updateQuantity, onPlaceOrder, hideTotal, instructions, setInstructions, suggestedItems, onAddToCart, isReadOnly }) {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const swipeContainerRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setSwipeProgress(0);
      setTimeout(() => {
        if (swipeContainerRef.current) {
          setContainerWidth(swipeContainerRef.current.offsetWidth);
        }
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
    e.target.releasePointerCapture(e.pointerId);
    if (swipeProgress > 85) {
      setSwipeProgress(100);
      setTimeout(() => onPlaceOrder(instructions), 200);
    } else {
      setSwipeProgress(0);
    }
  };

  const maxTranslate = Math.max(0, containerWidth - 72);
  const translateX = (swipeProgress / 100) * maxTranslate;

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const gst = subtotal * 0.05;
  const total = subtotal + gst;

  return (
    <div className="pt-6 px-4 pb-32 font-sans animate-in slide-in-from-right-4 duration-300">
      {cart.length === 0 ? (
        <div className="bg-theme-surface rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm border border-slate-100">
          <div className="w-16 h-16 rounded-2xl border-2 border-slate-200 flex items-center justify-center mb-6">
            <ShoppingBag size={28} className="text-slate-300" strokeWidth={2} />
          </div>
          <h2 className="text-theme-text-sec font-bold mb-6">Your cart is empty.</h2>
          <button onClick={onClose} className="bg-theme-bg text-theme-primary px-8 py-3 rounded-full font-bold transition-colors border border-theme-primary">
            Browse Menu
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cart Items */}
          {cart.map(item => (
            <div key={item.id} className="bg-theme-surface rounded-2xl p-5 shadow-sm border border-slate-100 flex justify-between items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-[15px] leading-tight text-theme-text-main uppercase tracking-wide">{item.name}</h3>
                <div className="font-bold text-[13px] text-theme-primary mt-1 tracking-wide">₹{Math.round(item.price)} each</div>
              </div>

              <div className="flex items-center justify-between w-[90px] border border-slate-200 rounded-xl py-1.5 px-1 bg-theme-bg">
                <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-700 px-2 font-bold hover:text-theme-primary transition-colors"><Minus size={14} strokeWidth={3} /></button>
                <span className="font-bold text-[15px] text-theme-text-main">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, 1)} className="text-slate-700 px-2 font-bold hover:text-theme-primary transition-colors"><Plus size={14} strokeWidth={3} /></button>
              </div>
            </div>
          ))}

          {/* Bill Summary */}
          {!hideTotal && (
            <div className="bg-theme-surface rounded-2xl p-6 shadow-sm border border-slate-100 mt-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-theme-text-sec font-medium text-[15px]">Subtotal</span>
                <span className="font-bold text-theme-text-main text-[15px]">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-theme-text-sec font-medium text-[15px]">GST (5%)</span>
                <span className="font-bold text-theme-text-main text-[15px]">₹{gst.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-100 mb-4"></div>
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-theme-text-main text-[18px]">Total</span>
                <span className="font-extrabold text-theme-accent text-[24px]">₹{total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Chef Instructions */}
          <div className="mt-6 mb-8">
            <h4 className="text-[11px] font-bold text-theme-text-sec uppercase tracking-widest mb-3">Chef Instructions</h4>
            <textarea
              className="w-full bg-theme-surface border border-slate-200 rounded-2xl p-4 text-[15px] outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary resize-none shadow-sm placeholder:text-theme-text-sec"
              placeholder="e.g., Please keep the spice moderate..."
              rows="3"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            ></textarea>
          </div>

          <SuggestedDesserts 
            suggestedItems={suggestedItems} 
            onAddToCart={onAddToCart} 
            cart={cart} 
            isReadOnly={isReadOnly} 
            updateQuantity={updateQuantity}
          />

          {/* Fixed Swipe to Order Button */}
          <div className="fixed bottom-[4.5rem] left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40">
            <div
              ref={swipeContainerRef}
              className="bg-theme-primary rounded-2xl p-[6px] relative h-[68px] flex items-center shadow-lg shadow-theme-primary/30 overflow-hidden select-none border border-theme-primary mb-4"
            >
              {/* Track Text */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pl-[15px] transition-opacity duration-300"
                style={{ opacity: Math.max(0, 1 - (swipeProgress / 50)) }}
              >
                <div className="flex items-center gap-2 text-white font-bold text-lg tracking-wide drop-shadow-md">
                  Place order
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
      )}
    </div>
  );
}
