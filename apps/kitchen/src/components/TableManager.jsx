import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Save } from 'lucide-react';
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

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const { data, error } = await supabase.from('tables').select('*');
      if (data && data.length > 0) {
        const sorted = data.sort((a, b) => parseInt(a.table_number) - parseInt(b.table_number));
        setTables(sorted);
      }
    } catch (e) {
      console.warn("Using mock tables since DB isn't connected yet.");
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

      // If it's a real UUID from DB
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
      alert("Failed to save. Ensure you ran the SQL migration to add 'capacity' to the tables table.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-1">Table Management</h1>
        <p className="text-secondary text-sm font-medium">Manage table capacities and download QR codes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map(table => (
          <div key={table.id} className="bg-surface shadow-soft rounded-3xl p-6 border border-white/50 flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 w-full border-b border-slate-100 pb-2 text-center">Table {table.table_number}</h2>
            
            <div className="w-full mb-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-secondary font-medium">Capacity:</span>
                {editingTable === table.id ? (
                  <input 
                    type="number" 
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                    className="w-16 p-1 text-center border border-primary rounded-lg font-bold"
                    min="1"
                    autoFocus
                  />
                ) : (
                  <span className="font-bold text-primary bg-slate-100 px-3 py-1 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleEdit(table)}>
                    {table.capacity || 4}
                  </span>
                )}
              </div>
            </div>

            {editingTable === table.id ? (
              <button 
                onClick={() => handleSave(table)}
                disabled={isSaving}
                className="w-full btn btn-primary flex items-center justify-center gap-2 font-bold py-2 text-sm mb-6 bg-green-600 shadow-green-200"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            ) : (
              <div className="bg-slate-50 shadow-inset p-4 rounded-2xl mb-4 flex-shrink-0">
                <QRCodeSVG 
                  id={`qr-svg-${table.table_number}`}
                  value={`https://tablenet-customer.netlify.app/t/${table.qr_token}`} 
                  size={140}
                  bgColor={"transparent"}
                  fgColor={"#0f172a"}
                  level="Q"
                />
              </div>
            )}

            <div className="w-full space-y-3 mt-auto">
              {editingTable !== table.id && (
                <>
                  <div className="text-xs text-center font-mono text-secondary bg-slate-100 p-2 rounded-lg truncate px-2">
                    {table.qr_token}
                  </div>
                  <button 
                    onClick={() => downloadQR(table.table_number, table.qr_token)}
                    className="w-full btn btn-primary flex items-center justify-center gap-2 font-bold py-3 text-sm"
                  >
                    <Download size={16} />
                    Download QR
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
