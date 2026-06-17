import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Edit2, Trash2, Download, Upload, Loader2 } from 'lucide-react';
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

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      const { data, error } = await supabase.from('menu_items').delete().eq('id', id).select();
      if (error) {
        alert('Error deleting item: ' + error.message);
        console.error('Delete error:', error);
      } else if (!data || data.length === 0) {
        alert('Item could not be deleted (it may have already been deleted or you lack permissions).');
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
            is_popular: item.is_popular !== undefined ? item.is_popular : false
          }));

          const { error } = await supabase.from('menu_items').insert(itemsToInsert);
          if (error) throw error;

          alert(`Successfully imported ${itemsToInsert.length} items!`);
        } else {
          alert("Invalid format: Expected an array of menu items.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse or import JSON file.");
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
    let data = null;

    if (editingId) {
      const { data: updateData, error: updateError } = await supabase.from('menu_items').update({
        name: formData.name,
        category: formData.category || 'Uncategorized',
        price: parseFloat(formData.price),
        image_url: formData.image_url,
        is_veg: formData.is_veg,
        is_popular: formData.is_popular
      }).eq('id', editingId).select();
      error = updateError;
      data = updateData;
    } else {
      const { data: insertData, error: insertError } = await supabase.from('menu_items').insert({
        restaurant_id: restaurantId,
        name: formData.name,
        category: formData.category || 'Uncategorized',
        price: parseFloat(formData.price),
        image_url: formData.image_url,
        is_veg: formData.is_veg,
        is_available: true,
        is_popular: formData.is_popular
      }).select();
      error = insertError;
      data = insertData;
    }

    setIsSaving(false);

    if (error) {
      alert('Error saving item: ' + error.message);
      console.error('Save error:', error);
    } else if (!data || data.length === 0) {
      alert('Save operation completed, but 0 rows were affected. You may not have permissions.');
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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Menu Manager</h1>
          <p className="text-secondary text-sm font-medium">Manage item availability</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 rounded-2xl bg-surface shadow-inset outline-none w-64 focus:ring-2 focus:ring-accent/50 transition-all font-medium"
            />
          </div>
          <button onClick={handleExport} className="btn bg-surface text-secondary hover:text-primary shadow-soft flex items-center gap-2">
            <Download size={20} />
            Export
          </button>

          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button onClick={() => fileInputRef.current?.click()} className="btn bg-surface text-secondary hover:text-primary shadow-soft flex items-center gap-2">
            <Upload size={20} />
            Import
          </button>

          <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
            <Plus size={20} />
            Add Item
          </button>
        </div>
      </div>

      <div className="bg-surface shadow-soft rounded-3xl overflow-hidden border border-white/50">
        <table className="w-full text-left">
          <thead className="bg-slate-100/50 text-secondary text-xs uppercase tracking-widest border-b border-slate-200">
            <tr>
              <th className="px-8 py-5 font-bold">Item Name</th>
              <th className="px-8 py-5 font-bold">Category</th>
              <th className="px-8 py-5 font-bold">Price</th>
              <th className="px-8 py-5 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMenu.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5 font-semibold text-lg flex items-center gap-4">
                  {item.image_url && <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-lg" />}
                  {item.name}
                </td>
                <td className="px-8 py-5 text-secondary font-medium">
                  <span className="bg-slate-100 px-3 py-1 rounded-full text-sm">{item.category}</span>
                </td>
                <td className="px-8 py-5 font-semibold text-accent">₹{item.price.toFixed(2)}</td>
                <td className="px-8 py-5">
                  <div className="flex justify-end items-center gap-4">
                    <span className={`text-sm font-bold uppercase tracking-wider ${item.is_available ? 'text-green-600' : 'text-danger'}`}>
                      {item.is_available ? 'Available' : '86\'d'}
                    </span>
                    <button
                      onClick={() => toggleAvailability(item.id, item.is_available)}
                      className={`neumorphic-toggle w-16 h-8 flex items-center p-1 rounded-full shadow-inset ${item.is_available ? 'bg-success/20' : 'bg-danger/20'}`}
                    >
                      <div className={`neumorphic-toggle-knob w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${item.is_available ? 'translate-x-8 bg-success' : 'translate-x-0 bg-danger'}`} />
                    </button>
                    <button 
                      onClick={() => togglePopularity(item.id, item.is_popular)} 
                      className={`p-2 transition-colors rounded-full ${item.is_popular ? 'text-amber-500 bg-amber-50 shadow-inset' : 'text-slate-300 hover:text-amber-500 bg-surface shadow-soft'}`}
                      title={item.is_popular ? "Remove from Popular" : "Mark as Popular"}
                    >
                      ★
                    </button>
                    <button onClick={() => openEditModal(item)} className="p-2 text-secondary hover:text-primary transition-colors bg-surface shadow-soft rounded-full active:shadow-inset">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-secondary hover:text-danger transition-colors bg-surface shadow-soft rounded-full active:shadow-inset">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredMenu.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-10 text-secondary">No menu items found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-background p-8 rounded-3xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingId ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-surface shadow-soft rounded-full" disabled={isSaving}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Name</label>
                <input required type="text" className="w-full p-3 rounded-xl bg-surface shadow-inset outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} disabled={isSaving} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Category</label>
                  <input required type="text" className="w-full p-3 rounded-xl bg-surface shadow-inset outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} disabled={isSaving} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Price (₹)</label>
                  <input required type="number" step="0.01" className="w-full p-3 rounded-xl bg-surface shadow-inset outline-none" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} disabled={isSaving} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Image URL</label>
                <input required type="url" placeholder="https://..." className="w-full p-3 rounded-xl bg-surface shadow-inset outline-none" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} disabled={isSaving} />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isVegCheckbox"
                    checked={formData.is_veg}
                    onChange={e => setFormData({ ...formData, is_veg: e.target.checked })}
                    className="w-5 h-5 text-success rounded focus:ring-success/50"
                    disabled={isSaving}
                  />
                  <label htmlFor="isVegCheckbox" className="text-sm font-semibold text-secondary">
                    Vegetarian
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPopularCheckbox"
                    checked={formData.is_popular}
                    onChange={e => setFormData({ ...formData, is_popular: e.target.checked })}
                    className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500/50"
                    disabled={isSaving}
                  />
                  <label htmlFor="isPopularCheckbox" className="text-sm font-semibold text-secondary flex items-center gap-1">
                    <span className="text-amber-500">★</span> Popular Item
                  </label>
                </div>
              </div>
              <button type="submit" className="w-full btn btn-primary mt-4 flex items-center justify-center gap-2" disabled={isSaving}>
                {isSaving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : 'Save Item'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
