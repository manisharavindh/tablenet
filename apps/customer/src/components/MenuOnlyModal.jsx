import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';

export default function MenuOnlyModal({ isOpen, onClose, reason = 'default' }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
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

  let message = "You are currently viewing the menu in read-only mode. To place an order, please scan the QR code located on your table.";

  if (reason === 'geofence_out_of_bounds') {
    message = "You appear to be too far from the restaurant. You can browse the menu, but ordering requires you to be on-site.";
  } else if (reason === 'geofence_denied') {
    message = "Location access was denied. We require location access to verify you are at the restaurant before placing an order. You can still browse the menu.";
  } else if (reason === 'geofence_unsupported') {
    message = "Your device does not support location services. You can browse the menu, but ordering requires location verification.";
  } else if (reason === 'session_ended') {
    message = "Your dining session has ended. You can continue browsing the menu in read-only mode.";
  } else if (reason === 'invalid_qr') {
    message = "The QR code you scanned is invalid or expired. You can browse the menu, but please scan a valid table QR code to order.";
  }

  return (
    <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[100] flex flex-col justify-end pointer-events-none">
      <div
        className={`absolute inset-0 bg-black/40 pointer-events-auto ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
        onClick={handleClose}
      ></div>

      <div className={`bg-theme-surface w-full rounded-t-[2.5rem] rounded-b-none p-6 pb-10 relative z-10 shadow-2xl pointer-events-auto flex flex-col items-center text-center ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>

        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-6 border border-amber-100 shadow-sm mt-2">
          <Info className="text-amber-500" size={32} strokeWidth={2.5} />
        </div>
        <h2 className="text-[24px] font-black text-theme-text-main tracking-tight mb-3">View Only Mode</h2>
        <p className="text-theme-text-sec text-[16px] font-medium leading-relaxed mb-8 px-2">
          {message}
        </p>
        <button
          onClick={handleClose}
          className="w-full py-4 rounded-2xl font-bold text-white bg-theme-text-main shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all active:scale-[0.98] hover:bg-black text-[15px]"
        >
          Got it, thanks
        </button>
      </div>
    </div>
  );
}
