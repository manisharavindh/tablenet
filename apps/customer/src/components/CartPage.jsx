import { ChevronLeft, Bell, Minus, Plus } from 'lucide-react';

export default function CartPage({ isOpen, onClose, cart, tableNumber, updateQuantity, onPlaceOrder }) {
  if (!isOpen) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFCF7] pb-24 font-sans animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <header className="px-4 py-6 flex items-center justify-between">
        <button onClick={onClose} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
          <ChevronLeft size={20} className="text-slate-800" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Customer</h1>
        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
          <Bell size={18} className="text-slate-800" />
        </button>
      </header>

      <div className="px-4 space-y-6">
        {/* Table Pill */}
        <div className="bg-white rounded-2xl py-4 flex items-center justify-center gap-2 shadow-sm border border-slate-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
            <path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"></path>
            <path d="M4 8h16"></path>
            <path d="M2 14h20"></path>
            <path d="M5 14v5a1 1 0 0 0 1 1h0a1 1 0 0 0 1-1v-5"></path>
            <path d="M17 14v5a1 1 0 0 0 1 1h0a1 1 0 0 0 1-1v-5"></path>
            <path d="M12 14v3"></path>
          </svg>
          <span className="font-bold text-slate-900">Table {tableNumber || 'Unknown'}</span>
        </div>

        {/* Current Order Container */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-50">
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900 whitespace-nowrap">Current Order</h2>
            <div className="h-px bg-slate-200 w-full"></div>
          </div>

          {cart.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Your cart is empty.</p>
          ) : (
            <div className="space-y-6">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center gap-4">
                  <div className="flex-1">
                    {/* Item Header */}
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${item.is_veg !== false ? 'border-green-600' : 'border-[#8B4513]'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.is_veg !== false ? 'bg-green-600' : 'bg-[#8B4513]'}`}></div>
                      </div>
                      <h3 className="font-bold text-[14px] leading-tight text-slate-900 uppercase">{item.name}</h3>
                    </div>
                  </div>

                  {/* Stepper & Price */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="flex items-center justify-between w-20 border border-slate-200 rounded-full py-1.5 px-1 bg-white">
                      <button onClick={() => updateQuantity(item.id, -1)} className="text-green-600 px-2 font-bold hover:scale-110 active:scale-95 transition-transform"><Minus size={12} strokeWidth={3} /></button>
                      <span className="font-bold text-sm text-slate-900">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="text-green-600 px-2 font-bold hover:scale-110 active:scale-95 transition-transform"><Plus size={12} strokeWidth={3} /></button>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-slate-900 text-[15px] leading-none">₹{Math.round(item.price * item.quantity)}</div>
                      <div className="text-[9px] font-bold text-slate-500 mt-0.5 tracking-wider">+5% GST</div>
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={onClose} className="w-full bg-[#1AA147] hover:bg-[#168e3d] active:bg-[#147a35] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors mt-6">
                <Plus size={18} strokeWidth={2.5} />
                Add More Items
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fixed ORDER Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-[4.5rem] left-0 right-0 px-4 max-w-md mx-auto z-40">
          <button 
            onClick={onPlaceOrder}
            className="w-full bg-[#F24E5B] hover:bg-[#e04552] active:bg-[#cc3e49] text-white font-bold text-lg py-4 rounded-3xl shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] flex justify-center items-center"
          >
            ORDER
          </button>
        </div>
      )}
    </div>
  );
}
