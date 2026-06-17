import { Plus, Minus, Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@tablenet/supabase';
import ImageFallback from './ImageFallback';

export default function MenuPage({ onAddToCart, restaurantId, cart, updateQuantity, searchQuery, setSearchQuery, activeCategory, setActiveCategory, categories, isReadOnly }) {
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

  const displayedMenu = menu.filter(item => {
    const matchesCategory = activeCategory === 'All' || (item.category || 'Uncategorized') === activeCategory;
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
    <div className="px-4">
      {/* Sticky Header: Search Bar & Categories Filter */}
      <div className="sticky top-[72px] z-30 bg-theme-bg/90 backdrop-blur-md -mx-4 px-4 pt-4 pb-4 shadow-sm mb-4">
        {searchQuery !== undefined && (
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              className="w-full bg-theme-surface border border-slate-200 rounded-xl py-3 pl-10 pr-10 outline-none focus:border-theme-primary shadow-sm transition-colors text-sm"
            />
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-sec" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery && setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-text-sec hover:text-theme-text-main p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        <div className="flex overflow-x-auto hide-scrollbar gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full font-bold text-sm border shadow-sm transition-colors ${activeCategory === cat
                ? 'bg-theme-primary text-theme-surface border-theme-primary'
                : 'bg-theme-surface text-theme-text-sec border-slate-200 hover:border-theme-primary hover:text-theme-primary'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4 pb-20">
        {displayedMenu.map((item) => {
          const cartItem = cart?.find(i => i.id === item.id);

          return (
            <div key={item.id} className={`bg-theme-surface rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col ${!item.is_available ? 'opacity-60 grayscale' : ''}`}>
              <div className="relative aspect-square">
                <ImageFallback src={item.image_url} name={item.name} className="w-full h-full object-cover" />

                {/* Out of stock overlay */}
                {!item.is_available && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <span className="bg-danger text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Out of Stock</span>
                  </div>
                )}

                {/* Veg/Non-Veg Indicator */}
                <div className="absolute bottom-2 left-2 bg-theme-surface/90 p-0.5 rounded shadow-sm">
                  <div className={`w-3.5 h-3.5 border flex items-center justify-center ${item.is_veg !== false ? 'border-green-600' : 'border-[#8B4513]'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${item.is_veg !== false ? 'bg-green-600' : 'bg-[#8B4513]'}`}></div>
                  </div>
                </div>
              </div>

              <div className="p-3 flex flex-col flex-grow bg-theme-surface">
                <h3 className="font-bold text-[13px] leading-tight mb-3 uppercase text-theme-text-main line-clamp-2">{item.name}</h3>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex flex-col">
                    <span className="font-bold text-[15px] leading-none text-theme-text-main">₹{Math.round(item.price)}</span>
                    <span className="text-[9px] font-bold text-theme-text-sec mt-0.5 tracking-wider">+5% GST</span>
                  </div>

                  <div>
                    {!item.is_available ? (
                      <button disabled className="bg-slate-200 text-theme-text-sec font-bold text-[11px] px-3 py-1.5 rounded uppercase cursor-not-allowed">
                        N/A
                      </button>
                    ) : isReadOnly ? (
                      <div className="text-[11px] font-bold text-theme-text-sec uppercase tracking-wider px-2 py-1.5">
                        View Only
                      </div>
                    ) : cartItem ? (
                      <div className="flex items-center bg-theme-primary rounded overflow-hidden">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-theme-surface hover:bg-black/10 active:bg-black/20 transition-colors">
                          <Minus size={14} strokeWidth={3} />
                        </button>
                        <span className="text-theme-surface font-bold text-[13px] w-4 text-center">{cartItem.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-theme-surface hover:bg-black/10 active:bg-black/20 transition-colors">
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => onAddToCart(item)} className="bg-theme-primary text-theme-surface font-bold text-[11px] px-4 py-1.5 rounded uppercase active:scale-95 transition-transform">
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

      {displayedMenu.length === 0 && (
        <div className="text-center text-slate-500 py-12">
          {searchQuery ? `No items found for "${searchQuery}"` : 'Menu is currently empty.'}
        </div>
      )}
    </div>
  );
}
