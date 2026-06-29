import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Save, Users, Edit3, ExternalLink } from 'lucide-react';
import { supabase } from '@tablenet/supabase';

const mockTables = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  table_number: `${i + 1}`,
  qr_token: `tbl_abc${(i + 1).toString().padStart(3, '0')}`,
  capacity: 4
}));

export default function TableManager() {
  const [tables, setTables] = useState(mockTables);
  const [editingTable, setEditingTable] = useState(null);
  const [editCapacity, setEditCapacity] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [targetCount, setTargetCount] = useState(15);
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      let currentRestaurantId = restaurantId;
      if (!currentRestaurantId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase.from('user_roles').select('restaurant_id').eq('user_id', user.id).single();
          if (roleData) {
            currentRestaurantId = roleData.restaurant_id;
            setRestaurantId(currentRestaurantId);
          }
        }
      }

      const { data, error } = await supabase.from('tables').select('*');
      if (error) throw error;

      if (data) {
        if (data.length > 0) {
          const sorted = data.sort((a, b) => parseInt(a.table_number) - parseInt(b.table_number));
          setTables(sorted);
          setTargetCount(sorted.length);
        } else {
          setTables([]);
          setTargetCount(0);
        }
      }
    } catch (e) {
      console.warn("Using mock tables since DB isn't connected yet.");
    }
  };

  const handleUpdateTableCount = async () => {
    const newCount = parseInt(targetCount, 10);
    if (isNaN(newCount) || newCount < 1) {
      alert("Please enter a valid number of tables.");
      return;
    }

    if (!window.confirm(`Are you sure you want to set the total number of tables to ${newCount}?`)) return;

    setIsSaving(true);
    try {
      const currentCount = tables.length;

      if (newCount > currentCount) {
        if (!restaurantId) {
          alert("Restaurant ID not found. Please refresh the page.");
          return;
        }

        // Add new tables
        const tablesToAdd = [];
        for (let i = currentCount + 1; i <= newCount; i++) {
          // Generate a deterministic token based on restaurantId and table number
          const message = `${restaurantId}-${i}`;
          const msgBuffer = new TextEncoder().encode(message);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const deterministicToken = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);

          tablesToAdd.push({
            restaurant_id: restaurantId,
            table_number: `${i}`,
            qr_token: deterministicToken,
            capacity: 4
          });
        }

        const { error } = await supabase.from('tables').insert(tablesToAdd);
        if (error) throw error;
      } else if (newCount < currentCount) {
        // Remove excess tables from the END
        const tablesToRemove = tables.slice(newCount).map(t => t.id);
        const { error } = await supabase.from('tables').delete().in('id', tablesToRemove);
        if (error) throw error;
      }

      await fetchTables();
    } catch (e) {
      console.error(e);
      alert("Failed to update table count.");
    } finally {
      setIsSaving(false);
    }
  };

  const downloadQR = (tableNumber, qrToken) => {
    const svg = document.getElementById(`qr-svg-${tableNumber}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `Table_${tableNumber}_QR.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleEdit = (table) => {
    setEditingTable(table.id);
    setEditCapacity(table.capacity || 4);
  };

  const handleSave = async (table) => {
    setIsSaving(true);
    try {
      const newCapacity = parseInt(editCapacity, 10);
      if (isNaN(newCapacity) || newCapacity <= 0) {
        alert("Please enter a valid capacity.");
        return;
      }

      if (typeof table.id === 'string') {
        const { error } = await supabase
          .from('tables')
          .update({ capacity: newCapacity })
          .eq('id', table.id);

        if (error) throw error;
      }

      setTables(prev => prev.map(t => t.id === table.id ? { ...t, capacity: newCapacity } : t));
      setEditingTable(null);
    } catch (e) {
      console.error(e);
      alert("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-24 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-text-main mb-1">Table Management</h1>
          <p className="text-theme-text-sec text-sm font-medium">Manage table capacities and download QR codes.</p>
        </div>

        <div className="bg-surface border border-theme-border p-3 rounded-2xl shadow-sm flex items-center gap-3 transition-colors duration-300">
          <label className="text-sm font-bold text-theme-text-main">Total Tables:</label>
          <input
            type="number"
            value={targetCount}
            onChange={(e) => setTargetCount(e.target.value)}
            className="w-20 bg-theme-bg border border-theme-border rounded-xl px-3 py-2 font-bold text-theme-text-main outline-none focus:border-theme-primary transition-colors duration-300"
            min="1"
          />
          <button
            onClick={handleUpdateTableCount}
            disabled={isSaving || parseInt(targetCount) === tables.length}
            className="bg-theme-primary text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-theme-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Update
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {tables.map(table => (
          <div key={table.id} className="bg-surface rounded-3xl shadow-sm border border-theme-border p-5 flex flex-col items-center hover:border-theme-text-sec transition-colors duration-300">
            <div className="w-full flex justify-between items-center mb-4 pb-3 border-b border-theme-border transition-colors duration-300">
              <h2 className="text-xl font-bold text-theme-text-main">Table {table.table_number}</h2>
              <div className="flex items-center gap-1.5 text-theme-text-sec bg-theme-bg px-2.5 py-1 rounded-lg text-sm font-bold border border-theme-border transition-colors duration-300">
                <Users size={14} />
                {table.capacity || 4}
              </div>
            </div>

            {editingTable === table.id ? (
              <div className="w-full mb-4 bg-theme-bg p-4 rounded-2xl border border-theme-primary/20 flex flex-col items-center transition-colors duration-300">
                <label className="text-xs font-bold text-theme-text-sec uppercase tracking-wider mb-2">Edit Capacity</label>
                <input
                  type="number"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  className="w-20 bg-surface p-2 text-center border-2 border-theme-primary rounded-xl font-bold text-xl text-theme-text-main outline-none transition-colors duration-300"
                  min="1"
                  autoFocus
                />
                <button
                  onClick={() => handleSave(table)}
                  disabled={isSaving}
                  className="w-full bg-theme-accent text-white shadow-lg shadow-green-600/30 hover:bg-green-700 font-bold py-2.5 text-sm mt-4 rounded-xl flex items-center justify-center gap-2 transition-colors duration-300"
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 mb-4 inline-block group relative">
                  <QRCodeSVG
                    id={`qr-svg-${table.table_number}`}
                    value={`${import.meta.env.DEV ? 'http://localhost:5173' : 'https://tablenet-customer.netlify.app'}/${table.qr_token}`}
                    size={130}
                    bgColor={"#ffffff"}
                    fgColor={"#1C1C1C"}
                    level="Q"
                  />
                  <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl backdrop-blur-sm cursor-pointer" onClick={() => downloadQR(table.table_number, table.qr_token)}>
                    <div className="bg-theme-primary text-white p-3 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                      <Download size={20} />
                    </div>
                  </div>
                </div>

                <div className="w-full flex gap-2">
                  <button
                    onClick={() => handleEdit(table)}
                    className="flex-1 bg-theme-bg text-theme-text-sec hover:text-theme-text-main border border-theme-border font-bold py-2 rounded-xl text-xs sm:text-sm transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <Edit3 size={14} /> <span className="hidden sm:inline">Edit</span>
                  </button>
                  <a
                    href={`${import.meta.env.DEV ? 'http://localhost:5173' : 'https://tablenet-customer.netlify.app'}/${table.qr_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 font-bold py-2 rounded-xl text-xs sm:text-sm transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <ExternalLink size={14} /> <span className="hidden sm:inline">Open</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
