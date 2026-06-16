import { ChevronLeft, Check } from 'lucide-react';
import { useState } from 'react';

const initialOrders = [
  { id: 101, name: 'Truffle Fries', status: 'ready' },
  { id: 102, name: 'Wagyu Burger', status: 'preparing' },
  { id: 103, name: 'Margherita Pizza', status: 'preparing' }
];

export default function TableDetail({ table, onBack }) {
  const [orders, setOrders] = useState(initialOrders);

  const handleServe = (id) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'served' } : o));
  };

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto">
      <header className="px-4 py-4 flex items-center gap-4 bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50">
        <button onClick={onBack} className="p-2 bg-surface shadow-soft rounded-full active:shadow-inset">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Table {table.number}</h1>
          <p className="text-sm text-secondary font-medium capitalize">{table.status} • {table.capacity} Guests</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h2 className="font-semibold text-lg px-2">Active Orders</h2>
        
        {orders.map(order => (
          <div key={order.id} className="card p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{order.name}</h3>
              <p className={`text-xs font-bold mt-1 capitalize ${
                order.status === 'ready' ? 'text-green-600' : 
                order.status === 'preparing' ? 'text-amber-600' : 'text-slate-500'
              }`}>
                {order.status}
              </p>
            </div>
            
            {order.status === 'ready' && (
              <button 
                onClick={() => handleServe(order.id)}
                className="btn-accent px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md active:shadow-inset"
              >
                <Check size={16} />
                Serve
              </button>
            )}
            {order.status === 'served' && (
              <span className="text-green-600 bg-green-50 p-2 rounded-full shadow-inset-sm">
                <Check size={20} />
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="p-6 bg-surface shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-3xl pb-8">
        <button className="btn btn-primary w-full">
          Add to Order
        </button>
      </div>
    </div>
  );
}
