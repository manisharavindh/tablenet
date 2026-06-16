import { Plus, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@tablenet/supabase';

export default function MenuPage({ onAddToCart, restaurantId, cart, updateQuantity }) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;

    fetchMenu();

    const channel = supabase.channel(`customer-menu-${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchMenu()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [restaurantId]);

  const fetchMenu = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('category')
      .order('name');

    if (data) setMenu(data);
    setLoading(false);
  };

  const groupedMenu = menu.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="pt-6 px-4 max-w-md mx-auto space-y-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-2"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-slate-200 rounded-2xl"></div>
          <div className="h-48 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 px-4 pb-4">
      {Object.entries(groupedMenu).map(([category, items]) => (
        <div key={category} className="mb-8">
          <h2 className="text-lg font-bold mb-4 uppercase tracking-wide text-slate-800">{category}</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {items.map((item) => {
              const cartItem = cart?.find(i => i.id === item.id);

              return (
                <div key={item.id} className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col ${!item.is_available ? 'opacity-60 grayscale' : ''}`}>
                  <div className="relative aspect-square">
                    <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'} alt={item.name} className="w-full h-full object-cover" />

                    {/* Out of stock overlay */}
                    {!item.is_available && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                        <span className="bg-danger text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Out of Stock</span>
                      </div>
                    )}

                    {/* Veg/Non-Veg Indicator */}
                    <div className="absolute bottom-2 left-2 bg-white/90 p-0.5 rounded shadow-sm">
                      <div className={`w-3.5 h-3.5 border flex items-center justify-center ${item.is_veg !== false ? 'border-green-600' : 'border-[#8B4513]'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.is_veg !== false ? 'bg-green-600' : 'bg-[#8B4513]'}`}></div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 flex flex-col flex-grow bg-[#FDFDFD]">
                    <h3 className="font-bold text-[13px] leading-tight mb-3 uppercase text-slate-900 line-clamp-2">{item.name}</h3>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="font-bold text-[15px] leading-none">₹{Math.round(item.price)}</span>
                        <span className="text-[9px] font-bold text-slate-400 mt-0.5 tracking-wider">+5% GST</span>
                      </div>

                      <div>
                        {!item.is_available ? (
                          <button disabled className="bg-slate-200 text-slate-400 font-bold text-[11px] px-3 py-1.5 rounded uppercase cursor-not-allowed">
                            N/A
                          </button>
                        ) : cartItem ? (
                          <div className="flex items-center bg-[#F24E5B] rounded overflow-hidden">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-white hover:bg-black/10 active:bg-black/20 transition-colors">
                              <Minus size={14} strokeWidth={3} />
                            </button>
                            <span className="text-white font-bold text-[13px] w-4 text-center">{cartItem.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-white hover:bg-black/10 active:bg-black/20 transition-colors">
                              <Plus size={14} strokeWidth={3} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => onAddToCart(item)} className="bg-[#F24E5B] text-white font-bold text-[11px] px-4 py-1.5 rounded uppercase active:scale-95 transition-transform">
                            ADD
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {menu.length === 0 && (
        <div className="text-center text-secondary py-12">
          Menu is currently empty.
        </div>
      )}
    </div>
  );
}
