import { Clock, X } from 'lucide-react';

export default function ExtendSessionModal({
  isOpen,
  onClose,
  onExtend,
  extendingSession,
  tableNumber,
  sessionRemainingMins,
  customerExtendedTime,
  isCustomer = false,
  isClosing
}) {
  if (!isOpen && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end pointer-events-none">
      <div 
        className={`absolute inset-0 bg-black/40 pointer-events-auto ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`} 
        onClick={onClose}
      ></div>
      <div className={`bg-white w-full max-w-md mx-auto rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative z-10 pointer-events-auto ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
        <div className="px-6 py-6 pb-10">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-1.5 rounded-full border-2 border-red-500 text-red-500">
                <Clock size={22} strokeWidth={2.5} />
              </div>
              Extend Session
            </h2>
            <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <p className="text-slate-500 text-[15px] font-medium mb-8">
            {isCustomer 
              ? `You have ${sessionRemainingMins} minutes left in your portal session. This extends your access to the menu and ordering, not your overall time at the hotel.`
              : `Add 30 more minutes to Table ${tableNumber}'s portal session.`
            }
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => onExtend(30)}
              disabled={extendingSession}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-[1.25rem] transition-all disabled:opacity-50 text-lg active:scale-95"
            >
              Extend Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
