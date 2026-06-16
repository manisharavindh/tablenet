import { X, Minus, Plus } from 'lucide-react';

export default function CartPage({ isOpen, onClose, cart, updateQuantity, onPlaceOrder }) {
  if (!isOpen) return null;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background h-full shadow-[-20px_0_40px_rgba(0,0,0,0.1)] flex flex-col transform transition-transform duration-300">
        <div className="p-6 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-2xl font-bold">Your Order</h2>
          <button onClick={onClose} className="p-2 bg-surface shadow-soft rounded-full active:shadow-inset">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <p className="text-center text-secondary mt-10">Your cart is empty</p>
          ) : (
            cart.map(item => (
              <div key={item.id} className="card p-4 flex items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{item.name}</h3>
                  <p className="text-accent font-medium text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3 bg-background rounded-full p-1 shadow-inset-sm">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1 rounded-full bg-surface shadow-soft active:shadow-inset">
                    <Minus size={14} />
                  </button>
                  <span className="w-4 text-center font-medium text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1 rounded-full bg-surface shadow-soft active:shadow-inset">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-surface shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-3xl">
          <div className="flex justify-between mb-4">
            <span className="text-secondary font-medium">Total</span>
            <span className="text-2xl font-bold">${total.toFixed(2)}</span>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={onPlaceOrder}
            className={`btn btn-primary w-full ${cart.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}
