import { useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import MenuPage from './components/MenuPage';
import CartPage from './components/CartPage';
import OrderStatusBadge from './components/OrderStatusBadge';

function CustomerView() {
  const { tableId } = useParams();
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);

  const handleAddToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handlePlaceOrder = () => {
    setHasActiveOrder(true);
    setCart([]);
    setIsCartOpen(false);
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen relative font-sans bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-slate-200/50 px-4 py-4 flex justify-between items-center max-w-md mx-auto">
        <div>
          <div className="font-bold text-xl tracking-tight text-primary">TableNet</div>
          {tableId && <div className="text-xs font-semibold text-secondary uppercase tracking-widest mt-0.5">Table {tableId}</div>}
        </div>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative p-2 bg-surface shadow-soft rounded-full active:shadow-inset transition-all"
        >
          <ShoppingBag size={20} className="text-secondary" />
          {cartItemsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-surface">
              {cartItemsCount}
            </span>
          )}
        </button>
      </header>

      <main>
        <MenuPage onAddToCart={handleAddToCart} />
      </main>

      <CartPage 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={cart}
        updateQuantity={updateQuantity}
        onPlaceOrder={handlePlaceOrder}
      />

      {hasActiveOrder && <OrderStatusBadge />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/t/:tableId" element={<CustomerView />} />
        <Route path="*" element={<Navigate to="/t/1" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
