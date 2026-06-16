import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
import { supabase } from '@tablenet/supabase';

const mockTables = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  table_number: `${i + 1}`,
  qr_token: `tbl_abc${(i + 1).toString().padStart(3, '0')}`
}));

export default function QRCodeManager() {
  const [tables, setTables] = useState(mockTables);

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
      
      // Add white background
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

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-1">QR Print Hub</h1>
        <p className="text-secondary text-sm font-medium">Download static QR codes for physical table placement.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map(table => (
          <div key={table.id} className="bg-surface shadow-soft rounded-3xl p-6 border border-white/50 flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 w-full border-b border-slate-100 pb-2 text-center">Table {table.table_number}</h2>
            
            <div className="bg-slate-50 shadow-inset p-4 rounded-2xl mb-6 flex-shrink-0">
              <QRCodeSVG 
                id={`qr-svg-${table.table_number}`}
                value={`https://tablenet.com/t/${table.qr_token}`} 
                size={140}
                bgColor={"transparent"}
                fgColor={"#0f172a"}
                level="Q"
              />
            </div>

            <div className="w-full space-y-3 mt-auto">
              <div className="text-xs text-center font-mono text-secondary bg-slate-100 p-2 rounded-lg truncate px-2">
                {table.qr_token}
              </div>
              <button 
                onClick={() => downloadQR(table.table_number, table.qr_token)}
                className="w-full btn btn-primary flex items-center justify-center gap-2 font-bold py-3 text-sm"
              >
                <Download size={16} />
                Download PNG
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
