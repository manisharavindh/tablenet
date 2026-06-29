import { ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@tablenet/supabase';
import SuggestedDesserts from './SuggestedDesserts';

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

export default function OrderTrackingPage({ orders, onClose, restaurantId, hideTotal, onAddToCart, cart, isReadOnly, suggestedItems, updateQuantity }) {
  if (!orders || orders.length === 0) return null;

  return (
    <div className="pt-6 px-4 pb-4 space-y-4">
      <SuggestedDesserts
        suggestedItems={suggestedItems}
        onAddToCart={onAddToCart}
        cart={cart}
        isReadOnly={isReadOnly}
        updateQuantity={updateQuantity}
      />

      {orders.map((order) => {
        const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return (
          <div key={order.id} className="bg-theme-surface rounded-xl shadow-sm border border-slate-100 mb-4 overflow-hidden">
            <div className="flex justify-between items-center bg-theme-surface py-3.5 px-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-slate-600 uppercase tracking-widest text-[14px]">
                  Order #{order.id.substring(0, 6).toUpperCase()}
                </span>
                <div className="w-px h-3.5 bg-slate-300"></div>
                <div className="flex items-center gap-2">
                  <div className={`font-bold text-[12px] uppercase tracking-wider ${order.status === 'placed' ? 'text-theme-primary' : 'text-slate-400'}`}>
                    Placed
                  </div>
                  <ArrowRight size={12} className="text-slate-300" />
                  <div className={`font-bold text-[12px] uppercase tracking-wider ${['preparing', 'ready', 'served'].includes(order.status) ? 'text-theme-primary' : 'text-slate-400'}`}>
                    Preparing
                  </div>
                </div>
              </div>

              {!hideTotal && (
                <span className="font-bold text-slate-800 text-[15px]">
                  ₹{Math.round(orderTotal)}
                </span>
              )}
            </div>

            <div className="p-5 space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[14px]">
                  <span className="text-slate-600 font-medium">
                    <span className="font-bold text-slate-900 mr-3">{item.quantity}x</span>
                    {item.name}
                  </span>
                  <span className="text-slate-800 font-bold">
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
