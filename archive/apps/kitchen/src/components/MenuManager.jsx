import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Edit2, Trash2, Download, Upload, Loader2, Star, Check } from 'lucide-react';
import { supabase } from '@tablenet/supabase';

export default function MenuManager() {
  const [menu, setMenu] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurantId, setRestaurantId] = useState(null);
  const fileInputRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: '', price: '', image_url: '', is_veg: true, is_popular: false });

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

  const toggleAvailability = async (id, currentStatus) => {
    await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id);
  };

  const togglePopularity = async (id, currentStatus) => {
    await supabase.from('menu_items').update({ is_popular: !currentStatus }).eq('id', id);
  };

  const toggleVeg = async (id, currentStatus) => {
    await supabase.from('menu_items').update({ is_veg: !currentStatus }).eq('id', id);
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
            is_veg: item.is_veg !== undefined ? item.is_veg : true
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

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', category: '', price: '', image_url: '', is_veg: true, is_popular: false });
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
      is_popular: item.is_popular !== undefined ? item.is_popular : false
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
        is_popular: formData.is_popular
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
        is_popular: formData.is_popular
      });
      error = insertError;
    }

    setIsSaving(false);

    if (error) {
      alert('Error saving item: ' + error.message);
    } else {
      fetchMenu(restaurantId);
      setIsModalOpen(false);
    }
  };

  const filteredMenu = menu.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-text-main mb-1">Menu Manager</h1>
          <p className="text-theme-sec text-sm font-medium">Manage item availability, prices, and categories.</p>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar py-2">
          <div className="relative flex-shrink-0">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-sec" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-3 rounded-2xl bg-surface border border-slate-200 outline-none w-56 md:w-64 focus:ring-2 focus:ring-theme-primary/20 transition-all font-medium text-sm text-theme-text-main"
            />
          </div>
          <button onClick={handleExport} className="flex-shrink-0 bg-surface border border-slate-200 text-theme-sec hover:text-theme-text-main rounded-2xl font-bold px-4 py-3 transition-all flex items-center gap-2 hover:bg-slate-50">
            <Download size={18} />
            Export
          </button>

          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 bg-surface border border-slate-200 text-theme-sec hover:text-theme-text-main rounded-2xl font-bold px-4 py-3 transition-all flex items-center gap-2 hover:bg-slate-50">
            <Upload size={18} />
            Import
          </button>

          <button onClick={openAddModal} className="flex-shrink-0 btn-primary rounded-2xl font-bold px-5 py-3 transition-all flex items-center gap-2">
            <Plus size={18} />
            Add Item
          </button>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-theme-bg text-theme-sec text-xs uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold">Item Name</th>
                <th className="px-6 py-4 font-bold">Category</th>
                <th className="px-6 py-4 font-bold">Price</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMenu.map(item => (
                <tr key={item.id} className="hover:bg-theme-bg/50 transition-colors group">
                  <td className="px-6 py-4 font-semibold text-[15px] text-theme-text-main flex items-center gap-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-xl shadow-sm border border-slate-100 flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-theme-bg rounded-xl border border-slate-100 flex items-center justify-center text-theme-sec flex-shrink-0">
                        <span className="text-xs">No img</span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1">
                        {/* <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-theme-accent' : 'bg-theme-primary'}`}></span> */}
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-theme-sec font-medium">
                    <span className="bg-theme-bg px-3 py-1 rounded-lg text-xs border border-slate-100">{item.category}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-theme-text-main">₹{item.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end items-center gap-3">
                      <div className="flex items-center gap-2 mr-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${item.is_available ? 'text-theme-accent' : 'text-theme-primary'}`}>
                          {item.is_available ? 'In Stock' : '86\'d'}
                        </span>
                        <button
                          onClick={() => toggleAvailability(item.id, item.is_available)}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 focus:outline-none ${item.is_available ? 'bg-theme-accent' : 'bg-slate-200'}`}
                        >
                          <div className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${item.is_available ? 'left-7' : 'left-1'}`}></div>
                        </button>
                      </div>

                      {/* <button 
                        onClick={() => toggleVeg(item.id, item.is_veg)} 
                        className={`font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition-colors ${item.is_veg ? 'text-theme-accent border-theme-accent bg-green-50' : 'text-theme-primary border-theme-primary bg-red-50'}`}
                        title={item.is_veg ? "Mark as Non-Veg" : "Mark as Veg"}
                      >
                        {item.is_veg ? 'VEG' : 'N-VEG'}
                      </button> */}

                      <button
                        onClick={() => togglePopularity(item.id, item.is_popular)}
                        className={`p-2 transition-colors rounded-xl ${item.is_popular ? 'text-amber-500 bg-amber-50 border border-amber-200' : 'text-theme-sec hover:text-amber-500 hover:bg-amber-50 border border-transparent'}`}
                        title={item.is_popular ? "Remove from Popular" : "Mark as Popular"}
                      >
                        <Star size={16} fill={item.is_popular ? "currentColor" : "none"} />
                      </button>

                      <div className="w-px h-6 bg-slate-200 mx-1"></div>

                      <button onClick={() => openEditModal(item)} className="p-2 text-theme-sec hover:text-theme-primary transition-colors hover:bg-theme-bg rounded-xl border border-transparent">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-theme-sec hover:text-theme-primary transition-colors hover:bg-red-50 hover:border-red-100 rounded-xl border border-transparent">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMenu.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-theme-sec font-medium">No menu items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-theme-text-main/20 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)} />
          <div className="relative bg-surface p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-theme-text-main">{editingId ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-theme-bg hover:bg-slate-200 rounded-full transition-colors" disabled={isSaving}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-theme-sec mb-2">Item Name</label>
                <input required type="text" className="w-full p-3 rounded-xl bg-theme-bg border border-slate-200 outline-none focus:border-theme-primary/50 text-theme-text-main font-medium" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} disabled={isSaving} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-theme-sec mb-2">Category</label>
                  <input required type="text" className="w-full p-3 rounded-xl bg-theme-bg border border-slate-200 outline-none focus:border-theme-primary/50 text-theme-text-main font-medium" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} disabled={isSaving} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-theme-sec mb-2">Price (₹)</label>
                  <input required type="number" step="0.01" className="w-full p-3 rounded-xl bg-theme-bg border border-slate-200 outline-none focus:border-theme-primary/50 text-theme-text-main font-medium" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} disabled={isSaving} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-theme-sec mb-2">Image URL</label>
                <input required type="url" placeholder="https://..." className="w-full p-3 rounded-xl bg-theme-bg border border-slate-200 outline-none focus:border-theme-primary/50 text-theme-text-main font-medium" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} disabled={isSaving} />
              </div>

              <div className="bg-theme-bg p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-theme-text-main flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${formData.is_veg ? 'bg-theme-accent' : 'bg-theme-primary'}`}></span>
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
                    <Star size={14} className={formData.is_popular ? 'text-amber-500' : 'text-theme-sec'} fill={formData.is_popular ? 'currentColor' : 'none'} />
                    Popular Item
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_popular: !formData.is_popular })}
                    className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${formData.is_popular ? 'bg-amber-500' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${formData.is_popular ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>

              <button type="submit" className="w-full btn-primary font-bold py-4 rounded-2xl flex items-center justify-center gap-2 mt-2" disabled={isSaving}>
                {isSaving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Check size={18} /> Save Item</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
