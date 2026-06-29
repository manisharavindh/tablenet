import { ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@tablenet/supabase';

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

export default function OrderTrackingPage({ orders, onClose, restaurantId, hideTotal }) {
  if (!orders || orders.length === 0) return null;

  return (
    <div className="pt-6 px-4 pb-4 space-y-4">
      {orders.map((order) => {
        const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return (
          <div key={order.id} className="bg-theme-surface p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-theme-text-sec uppercase tracking-widest text-sm">
                Order #{order.id.substring(0, 6).toUpperCase()}
              </span>
              {!hideTotal && (
                <span className="font-bold text-theme-primary text-lg">
                  ₹{Math.round(orderTotal)}
                </span>
              )}
            </div>

            {/* Timeline */}
            <div className="flex items-center justify-between mb-6 bg-theme-bg p-3 rounded-xl border border-slate-100">
              <div className={`font-bold text-[10px] uppercase tracking-wider ${['placed', 'preparing', 'ready', 'served'].includes(order.status) ? 'text-theme-primary' : 'text-theme-text-sec'}`}>
                Placed
              </div>
              <ArrowRight size={14} className="text-slate-200" />
              <div className={`font-bold text-[10px] uppercase tracking-wider ${['preparing', 'ready', 'served'].includes(order.status) ? 'text-theme-primary' : 'text-theme-text-sec'}`}>
                Preparing
              </div>
              <ArrowRight size={14} className="text-slate-200" />
              <div className={`font-bold text-[10px] uppercase tracking-wider ${['ready', 'served'].includes(order.status) ? 'text-theme-primary' : 'text-theme-text-sec'}`}>
                Ready
              </div>
            </div>

            <div className="space-y-1.5 mt-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[13px] font-medium">
                  <span className="text-theme-text-sec">
                    <span className="font-bold text-theme-text-main mr-2">{item.quantity}x</span> 
                    {item.name}
                  </span>
                  <span className="text-theme-text-main font-bold">
                    ₹{Math.round(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {!hideTotal && (
        <div className="bg-theme-primary text-theme-surface p-5 rounded-2xl shadow-md mt-6 flex justify-between items-center">
          <div className="font-bold text-lg">Grand Total</div>
          <div className="font-bold text-2xl">
            ₹{Math.round(orders.reduce((total, order) => total + order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0), 0))}
          </div>
        </div>
      )}

      <div className="text-center text-theme-text-sec text-xs font-medium px-8 pt-6 pb-6 leading-relaxed">
        Take your time and enjoy your meal! You can settle the bill at the front desk whenever you're ready to leave.
      </div>
    </div>
  );
}
