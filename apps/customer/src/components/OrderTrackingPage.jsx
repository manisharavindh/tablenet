import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

const Timer = ({ createdAt }) => {
  const [elapsed, setElapsed] = useState('');
  
  useEffect(() => {
    const update = () => {
       const diff = Math.floor((new Date() - new Date(createdAt)) / 1000);
       if (diff < 0) {
         setElapsed('0:00');
         return;
       }
       const mins = Math.floor(diff / 60);
       const secs = diff % 60;
       setElapsed(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const int = setInterval(update, 1000);
    return () => clearInterval(int);
  }, [createdAt]);
  
  return <>{elapsed}</>;
};

export default function OrderTrackingPage({ orders, onClose }) {
  if (!orders || orders.length === 0) return null;

  // Flatten items
  const flatItems = [];
  orders.forEach(order => {
    order.items.forEach(item => {
      flatItems.push({
        ...item,
        orderStatus: order.status,
        orderCreatedAt: order.created_at
      });
    });
  });

  const getStatusDisplay = (status) => {
    switch(status) {
      case 'placed':
        return { text: 'ORDERED', bg: 'bg-amber-100', textCol: 'text-amber-700' };
      case 'preparing':
        return { text: 'PREPARING', bg: 'bg-orange-100', textCol: 'text-orange-700' };
      case 'ready':
        return { text: 'READY', bg: 'bg-green-100', textCol: 'text-green-700' };
      case 'served':
        return { text: 'SERVED', bg: 'bg-slate-100', textCol: 'text-slate-600' };
      default:
        return { text: 'CONFIRMED', bg: 'bg-amber-100', textCol: 'text-amber-700' };
    }
  };

  const total = flatItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-[#FDFCF7] pb-24 font-sans animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <header className="px-4 py-6 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={onClose} className="w-10 h-10 bg-[#FDFCF7] rounded-full flex items-center justify-center shadow-sm">
          <ArrowLeft size={20} className="text-slate-800" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Orders</h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      <div className="p-4 space-y-4">
        {flatItems.map((item, idx) => {
          const statusStyle = getStatusDisplay(item.orderStatus);
          
          return (
            <div key={idx} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-50 relative">
              <div className="flex justify-between items-start">
                
                {/* Left Side: Name, Veg, Status, Timer */}
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-3">
                    <div className={`mt-1 w-4 h-4 border-2 flex items-center justify-center shrink-0 rounded-sm ${item.is_veg !== false ? 'border-green-600' : 'border-[#8B4513]'}`}>
                      <div className={`w-2 h-2 rounded-full ${item.is_veg !== false ? 'bg-green-600' : 'bg-[#8B4513]'}`}></div>
                    </div>
                    <h3 className="font-bold text-[16px] leading-tight text-slate-900 uppercase">
                      {item.name}
                    </h3>
                  </div>

                  <div className="flex items-start gap-4 ml-6">
                    {/* Status Pill */}
                    <div className={`px-3 py-1.5 rounded-full font-bold text-[11px] tracking-wide ${statusStyle.bg} ${statusStyle.textCol}`}>
                      {statusStyle.text}
                    </div>

                    {/* Timer */}
                    {item.orderStatus !== 'served' ? (
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                          Preparation Time
                        </span>
                        <span className="text-lg font-bold text-red-500 leading-none mt-1">
                          <Timer createdAt={item.orderCreatedAt} />
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Completed
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Quantity, Price */}
                <div className="shrink-0 flex flex-col items-end justify-between h-full min-h-[5rem]">
                  {/* Quantity Box */}
                  <div className="border-2 border-slate-200 rounded-2xl w-14 h-10 flex items-center justify-center">
                    <span className="font-bold text-lg text-slate-900">{item.quantity}</span>
                  </div>

                  {/* Price */}
                  <div className="mt-6 text-right">
                    <div className="font-bold text-slate-900 text-lg leading-none">
                      ₹{Math.round(item.price * item.quantity)} <span className="text-[11px] font-bold text-slate-500 tracking-wider inline-block ml-0.5">+5% GST</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })}

        {/* Total Summary */}
        <div className="mt-8 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
           <span className="font-bold text-slate-500 uppercase tracking-wider text-sm">Total Amount</span>
           <span className="font-black text-2xl text-slate-900">₹{Math.round(total)}</span>
        </div>
      </div>
    </div>
  );
}
