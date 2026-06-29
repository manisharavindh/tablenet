import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Edit2, Trash2, Download, Upload, Loader2, Star, Check } from 'lucide-react';
import { supabase } from '@tablenet/supabase';

export default function MenuManager({ onCountUpdate }) {
  const [menu, setMenu] = useState([]);

  useEffect(() => {
    if (onCountUpdate) onCountUpdate(menu.length);
  }, [menu, onCountUpdate]);
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurantId, setRestaurantId] = useState(null);
  const fileInputRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: '', price: '', image_url: '', is_veg: true, is_popular: false, is_todays_special: false, meal_period: '' });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    fetchRestaurantAndMenu();
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase.channel(`kitchen-menu-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        fetchMenu(restaurantId);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [restaurantId]);

  const fetchRestaurantAndMenu = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roleData } = await supabase.from('user_roles').select('restaurant_id').eq('user_id', user.id).single();
    if (roleData) {
      setRestaurantId(roleData.restaurant_id);
      fetchMenu(roleData.restaurant_id);
    }
  };

  const fetchMenu = async (rId) => {
    const { data } = await supabase.from('menu_items').select('*').eq('restaurant_id', rId).order('category').order('name');
    if (data) setMenu(data);
  };

  const toggleAvailability = (id, currentStatus) => {
    // Optimistic UI update
    setMenu(prev => prev.map(m => m.id === id ? { ...m, is_available: !currentStatus } : m));

    supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id).then(({ error }) => {
      if (error) {
        console.error('Failed to toggle availability:', error);
        fetchMenu(restaurantId); // Revert on failure
      }
    });
  };

  const togglePopularity = (id, currentStatus) => {
    // Optimistic UI update
    setMenu(prev => prev.map(m => m.id === id ? { ...m, is_popular: !currentStatus } : m));

    supabase.from('menu_items').update({ is_popular: !currentStatus }).eq('id', id).then(({ error }) => {
      if (error) {
        console.error('Failed to toggle popularity:', error);
        fetchMenu(restaurantId);
      }
    });
  };

  const toggleVeg = (id, currentStatus) => {
    // Optimistic UI update
    setMenu(prev => prev.map(m => m.id === id ? { ...m, is_veg: !currentStatus } : m));

    supabase.from('menu_items').update({ is_veg: !currentStatus }).eq('id', id).then(({ error }) => {
      if (error) {
        console.error('Failed to toggle veg status:', error);
        fetchMenu(restaurantId);
      }
    });
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      const { data, error } = await supabase.from('menu_items').delete().eq('id', id).select();
      if (error) {
        alert('Error deleting item: ' + error.message);
      } else {
        fetchMenu(restaurantId);
      }
    }
  };

  const handleExport = () => {
    const cleanMenu = menu.map(({ id, restaurant_id, ...rest }) => rest);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanMenu, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "menu_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = async (e) => {
      try {
        const importedMenu = JSON.parse(e.target.result);
        if (Array.isArray(importedMenu) && restaurantId) {
          const itemsToInsert = importedMenu.map(item => ({
            restaurant_id: restaurantId,
            name: item.name,
            price: parseFloat(item.price) || 0,
            category: item.category || 'Uncategorized',
            image_url: item.image_url || '',
            is_available: item.is_available !== undefined ? item.is_available : true,
            is_popular: item.is_popular !== undefined ? item.is_popular : false,
            is_veg: item.is_veg !== undefined ? item.is_veg : true,
            is_todays_special: item.is_todays_special !== undefined ? item.is_todays_special : false,
            meal_period: item.meal_period || null
          }));

          const { error } = await supabase.from('menu_items').insert(itemsToInsert);
          if (error) throw error;
          alert(`Successfully imported ${itemsToInsert.length} items!`);
        }
      } catch (err) {
        alert("Failed to parse or import JSON file.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
  };

  const [isClosingModal, setIsClosingModal] = useState(false);

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsClosingModal(true);
    setTimeout(() => {
      setIsClosingModal(false);
      setIsModalOpen(false);
    }, 300);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', category: '', price: '', image_url: '', is_veg: true, is_popular: false, is_todays_special: false, meal_period: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      category: item.category || '',
      price: item.price,
      image_url: item.image_url || '',
      is_veg: item.is_veg !== undefined ? item.is_veg : true,
      is_popular: item.is_popular !== undefined ? item.is_popular : false,
      is_todays_special: item.is_todays_special !== undefined ? item.is_todays_special : false,
      meal_period: item.meal_period || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!restaurantId) return;

    setIsSaving(true);
    let error = null;

    if (editingId) {
      const { error: updateError } = await supabase.from('menu_items').update({
        name: formData.name,
        category: formData.category || 'Uncategorized',
        price: parseFloat(formData.price),
        image_url: formData.image_url,
        is_veg: formData.is_veg,
        is_popular: formData.is_popular,
        is_todays_special: formData.is_todays_special,
        meal_period: formData.meal_period || null
      }).eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('menu_items').insert({
        restaurant_id: restaurantId,
        name: formData.name,
        category: formData.category || 'Uncategorized',
        price: parseFloat(formData.price),
        image_url: formData.image_url,
        is_veg: formData.is_veg,
        is_available: true,
        is_popular: formData.is_popular,
        is_todays_special: formData.is_todays_special,
        meal_period: formData.meal_period || null
      });
      error = insertError;
    }

    setIsSaving(false);

    if (error) {
      alert('Error saving item: ' + error.message);
    } else {
      fetchMenu(restaurantId);
      handleCloseModal();
    }
  };

  const filteredMenu = menu.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const uniqueCategories = [...new Set(menu.map(item => item.category))].filter(Boolean);
  const defaultCategories = ['Starters', 'Main Course', 'Dessert', 'Beverages'];
  const categoryOptions = [...new Set([...defaultCategories, ...uniqueCategories])];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 pt-0 md:pt-0">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 my-2 md:my-6">
        <div className="relative flex-1 max-w-3xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-sec" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-4 h-12 rounded-2xl bg-surface border border-slate-200 dark:border-slate-700 outline-none w-full focus:ring-2 focus:ring-theme-primary/20 transition-all font-medium text-sm text-theme-text-main"
          />
        </div>
        <div className="flex items-center justify-end gap-2 md:gap-3 overflow-x-auto hide-scrollbar pb-1 w-[calc(100vw-32px)] md:w-auto">
          <button onClick={handleExport} className="flex-1 md:flex-none justify-center bg-surface border border-slate-200 text-theme-sec hover:text-theme-text-main rounded-2xl font-bold px-4 h-12 transition-all flex items-center gap-2 hover:bg-slate-50">
            <Upload size={18} />
            <span className="hidden sm:inline">Export</span>
          </button>

          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none justify-center bg-surface border border-slate-200 text-theme-sec hover:text-theme-text-main rounded-2xl font-bold px-4 h-12 transition-all flex items-center gap-2 hover:bg-slate-50">
            <Download size={18} />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button onClick={openAddModal} className="flex-1 md:flex-none justify-center bg-theme-primary text-white rounded-2xl font-bold px-4 md:px-5 h-12 transition-all flex items-center gap-2">
            <span className="inline">Add Item</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {filteredMenu.map(item => (
          <div key={item.id} className="bg-surface rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
            <div className="relative aspect-video bg-theme-bg border-b border-slate-100 flex-shrink-0 w-full">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" draggable="false" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-theme-sec bg-slate-50 dark:bg-slate-800">
                  <Star size={24} className="mb-2 opacity-50" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-50">No Image</span>
                </div>
              )}

              {/* Veg/Non-veg indicator */}
              <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-[3px] rounded-md shadow-sm z-10">
                <div className={`w-3.5 h-3.5 border-[1.5px] flex items-center justify-center rounded-sm ${item.is_veg !== false ? 'border-green-600' : 'border-[#8B4513]'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${item.is_veg !== false ? 'bg-green-600' : 'bg-[#8B4513]'}`}></div>
                </div>
              </div>

              {/* Featured badges */}
              <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
                {item.is_todays_special && (
                  <div className="bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                    <span>✨</span> Special
                  </div>
                )}
                {item.is_popular && (
                  <div className="bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                    <span className="text-orange-400">🔥</span> Popular
                  </div>
                )}
              </div>

              {!item.is_available && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px] z-10">
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Out of Stock</span>
                </div>
              )}
            </div>

            <div className="p-4 flex flex-col flex-grow">
              <div className="flex items-start justify-between mb-2 gap-2">
                <h3 className="font-bold text-lg text-theme-text-main line-clamp-2 leading-tight flex-1">{item.name}</h3>
                <span className="font-black text-lg text-theme-text-main flex-shrink-0">₹{item.price.toFixed(2)}</span>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <span className="bg-theme-bg px-2.5 py-1 rounded-lg text-[10px] font-bold text-theme-sec uppercase tracking-wider border border-slate-100">{item.category}</span>
                <span className="bg-blue-50/80 dark:bg-blue-500/10 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-blue-100 dark:border-blue-500/20">
                  {item.meal_period ? item.meal_period.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Any Time'}
                </span>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${item.is_available ? 'text-theme-accent' : 'text-theme-primary'}`}>
                    {item.is_available ? 'In Stock' : '86\'d'}
                  </span>
                  <button
                    onClick={() => toggleAvailability(item.id, item.is_available)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 focus:outline-none ${item.is_available ? 'bg-theme-accent' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-0.5 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${item.is_available ? 'left-5' : 'left-0.5'}`}></div>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(item)} className="p-2 text-theme-sec hover:text-theme-primary transition-colors hover:bg-theme-bg rounded-xl">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-theme-sec hover:text-red-500 transition-colors hover:bg-red-50 rounded-xl">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredMenu.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center bg-surface/50">
            <Search size={48} className="text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-theme-text-main mb-2">No items found</h3>
            <p className="text-theme-sec text-sm max-w-sm">We couldn't find any menu items matching your search criteria. Try a different term or add a new item.</p>
          </div>
        )}
      </div>

      {(isModalOpen || isClosingModal) && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end pointer-events-none lg:items-center lg:justify-center">
          <div className={`absolute inset-0 bg-black/40 pointer-events-auto ${isClosingModal ? 'animate-fadeOut' : 'animate-fadeIn'}`} onClick={() => !isSaving && handleCloseModal()}></div>
          <div className={`bg-white w-full max-w-md mx-auto lg:rounded-3xl rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative z-10 pointer-events-auto ${isClosingModal ? 'animate-slideDown lg:animate-fadeOut' : 'animate-slideUp lg:animate-fadeIn'}`}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0 rounded-t-[2.5rem] lg:rounded-t-3xl">
              <h2 className="text-xl font-black text-theme-text-main flex items-center gap-2">
                {editingId ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button type="button" onClick={() => !isSaving && handleCloseModal()} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors" disabled={isSaving}>
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto pb-28 lg:pb-8">
              <form onSubmit={handleSaveItem} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-theme-sec mb-2">Item Name</label>
                  <input required type="text" className="w-full p-3 rounded-xl bg-theme-bg border border-slate-200 outline-none focus:border-theme-primary/50 text-theme-text-main font-medium" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} disabled={isSaving} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-theme-sec mb-2">Category</label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        className="w-full p-3 rounded-xl bg-theme-bg border border-slate-200 outline-none focus:border-theme-primary/50 text-theme-text-main font-medium"
                        value={formData.category}
                        onChange={e => {
                          setFormData({ ...formData, category: e.target.value });
                          setShowCategoryDropdown(true);
                        }}
                        onFocus={() => setShowCategoryDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                        disabled={isSaving}
                        placeholder="e.g. Starters"
                      />
                      {showCategoryDropdown && categoryOptions.filter(cat => cat.toLowerCase().includes(formData.category.toLowerCase())).length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {categoryOptions
                            .filter(cat => cat.toLowerCase().includes(formData.category.toLowerCase()))
                            .map(cat => (
                              <div
                                key={cat}
                                className="px-4 py-2 hover:bg-theme-bg cursor-pointer text-theme-text-main font-medium"
                                onClick={() => {
                                  setFormData({ ...formData, category: cat });
                                  setShowCategoryDropdown(false);
                                }}
                              >
                                {cat}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-theme-sec mb-2">Price (₹)</label>
                    <input required type="number" step="0.01" className="w-full p-3 rounded-xl bg-theme-bg border border-slate-200 outline-none focus:border-theme-primary/50 text-theme-text-main font-medium" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} disabled={isSaving} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-theme-sec mb-2">Image URL</label>
                    <input required type="url" placeholder="https://..." className="w-full p-3 rounded-xl bg-theme-bg border border-slate-200 outline-none focus:border-theme-primary/50 text-theme-text-main font-medium" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} disabled={isSaving} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-theme-sec mb-2">Meal Period</label>
                    <select className="w-full p-3 rounded-xl bg-theme-bg border border-slate-200 outline-none focus:border-theme-primary/50 text-theme-text-main font-medium" value={formData.meal_period} onChange={e => setFormData({ ...formData, meal_period: e.target.value })} disabled={isSaving}>
                      <option value="">Any Time</option>
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="late_night">Late Night</option>
                    </select>
                  </div>
                </div>

                <div className="bg-theme-bg p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-theme-text-main flex items-center gap-2">
                      <div className="w-4 flex justify-center">
                        <span className={`w-2.5 h-2.5 rounded-full ${formData.is_veg ? 'bg-theme-accent' : 'bg-theme-primary'}`}></span>
                      </div>
                      Vegetarian
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_veg: !formData.is_veg })}
                      className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${formData.is_veg ? 'bg-theme-accent' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${formData.is_veg ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className="w-full h-px bg-slate-200"></div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-theme-text-main flex items-center gap-2">
                      <div className="w-4 flex justify-center">
                        <span className="text-sm">✨</span>
                      </div>
                      Today's Special
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_todays_special: !formData.is_todays_special })}
                      className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${formData.is_todays_special ? 'bg-amber-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${formData.is_todays_special ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className="w-full h-px bg-slate-200"></div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-theme-text-main flex items-center gap-2">
                      <div className="w-4 flex justify-center">
                        <span className="text-sm">🔥</span>
                      </div>
                      Popular Item
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_popular: !formData.is_popular })}
                      className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${formData.is_popular ? 'bg-orange-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${formData.is_popular ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>

                <button type="submit" className="w-full btn-primary font-bold py-4 rounded-2xl flex items-center justify-center gap-2 mt-4" disabled={isSaving}>
                  {isSaving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Check size={18} /> Save Item</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
