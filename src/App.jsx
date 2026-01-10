import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toPng } from 'html-to-image';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Wifi, Thermometer, Droplets, MapPin, RefreshCw, LayoutDashboard, Calendar, 
  Navigation, FileDown, Camera, Menu, X 
} from 'lucide-react'; 
import MapComponent from './MapComponent';

const NODE_CONFIG = [
  { 
    db_id: 'Node1',       
    label: 'Node 1',      
    area: 'Hatulian Beach', 
    desc: 'Monitoring Hatulian Beach tourism area'
  },
  { 
    db_id: 'Node2', 
    label: 'Node 2', 
    area: 'Pardinggaran Beach',
    desc: 'Monitoring Pardinggaran conservation area'
  }
];

const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="text-right hidden md:block">
      <div className="text-sm text-green-100 opacity-90">
        {time.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      <div className="text-2xl font-bold text-white tracking-widest font-mono">
        {time.toLocaleTimeString('en-GB', { hour12: false })}
      </div>
    </div>
  );
};

const App = () => {
  const API_URL = "http://103.59.94.231:1880/api/water-data";

  const [selectedNode, setSelectedNode] = useState(NODE_CONFIG[0]); 
  const [timeRange, setTimeRange] = useState('24h');
  const [chartData, setChartData] = useState([]);
  const [status, setStatus] = useState({ rssi: null, snr: null, online: false });
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const chartRef = useRef(null);

  const ranges = [
    { label: '1 Hour', val: '1h' },
    { label: '3 Hours', val: '3h' },
    { label: '6 Hours', val: '6h' },
    { label: '12 Hours', val: '12h' },
    { label: '24 Hours', val: '24h' },
    { label: '2 Days', val: '2d' },
    { label: '7 Days', val: '7d' },
    { label: '30 Days', val: '30d' },
    { label: '90 Days', val: '90d' },
    { label: '6 Months', val: '180d' },
  ];

  // --- 1. FORMATTER UTAMA: CSV LENGKAP (Tgl + Jam) ---
  const formatForCSV = (timeStr) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    
    // Jika format valid (ISO dari Node-RED)
    if (!isNaN(date.getTime())) {
       // Output: 10/01/2026 17:30
       return date.toLocaleString('id-ID', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: false
       });
    }
    
    // Fallback jika data masih yang lama (cuma jam)
    return timeStr;
  };

  // --- 2. FORMATTER GRAFIK (WIB Simpel) ---
  // Hanya dipakai jika data Node-RED error/buntung
  const convertToWIB = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (typeof timeStr === 'string' && timeStr.includes(':')) {
       try {
         const parts = timeStr.split(':');
         let hour = parseInt(parts[0]);
         let minute = parts[1];
         hour = hour + 7;
         if (hour >= 24) hour = hour - 24;
         return `${hour.toString().padStart(2, '0')}:${minute}`;
       } catch (e) { return timeStr; }
    }
    return timeStr;
  };

  // --- 3. FORMATTER SUMBU X (PINTAR: Jam vs Tanggal) ---
  const formatXAxis = (tickItem) => {
    if (!tickItem) return '';
    const date = new Date(tickItem);
    
    if (!isNaN(date.getTime())) {
        const longRanges = ['2d', '7d', '30d', '90d', '180d'];
        
        // > 24 Jam: Tampilkan Tgl + Jam
        if (longRanges.includes(timeRange)) {
            return date.toLocaleString('id-ID', { 
                day: 'numeric', month: 'short', 
                hour: '2-digit', minute: '2-digit', hour12: false 
            });
        } 
        // <= 24 Jam: Tampilkan Jam saja
        else {
            return date.toLocaleTimeString('id-ID', { 
                hour: '2-digit', minute: '2-digit', hour12: false 
            });
        }
    }
    return convertToWIB(tickItem);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL, {
        params: { node: selectedNode.db_id, range: timeRange }
      });

      if (response.data) {
        const cleanChart = (response.data.chart || []).map(item => {
          const rawTime = item.time || item._time || item.timestamp || item.created_at || "00:00";
          return { ...item, time: rawTime };
        });
        setChartData(cleanChart);
        setStatus(response.data.status || { rssi: null, snr: null, online: false });
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setChartData([]); 
    setStatus({ rssi: null, snr: null, online: false });
    fetchData();
    const interval = setInterval(fetchData, 10000); 
    return () => clearInterval(interval);
  }, [selectedNode, timeRange]);

  const calculateAvg = (key) => {
    if (!chartData || chartData.length === 0) return '-';
    const validData = chartData.filter(item => item[key] !== null && item[key] !== undefined);
    if (validData.length === 0) return '-';
    const total = validData.reduce((acc, curr) => acc + parseFloat(curr[key]), 0);
    return (total / validData.length).toFixed(1);
  };

  // --- DOWNLOAD CSV (DIPERBAIKI) ---
  const downloadCSV = () => {
    if (!chartData || chartData.length === 0) {
      alert("No data loaded to download.");
      return;
    }
    const dateNow = new Date();
    const dateString = dateNow.toISOString().split('T')[0];
    const headers = ["Node id", "Time (WIB)", "Temperature (°C)", "DO (mg/L)", "RSSI (dBm)", "SNR (dB)"];

    const rows = chartData.map(item => [
      `"${selectedNode.label}"`, 
      // PERUBAHAN: Gunakan formatForCSV agar tanggal muncul lengkap
      `"${formatForCSV(item.time)}"`,
      item.suhu ?? "-", 
      item.do ?? "-",
      item.rssi ?? "-",
      item.snr ?? "-"
    ]);

    const csvContent = [
      "sep=,", 
      headers.join(","), 
      ...rows.map(e => e.join(",")) 
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Report_${selectedNode.label.replace(/\s/g, '')}_${timeRange}_${dateString}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadImage = async () => {
    if (chartRef.current === null) return;
    document.body.style.cursor = 'wait';
    try {
      const dataUrl = await toPng(chartRef.current, { 
        cacheBust: true, backgroundColor: '#ffffff', pixelRatio: 2 
      });
      const link = document.createElement('a');
      link.download = `Chart_${selectedNode.label.replace(/\s/g, '')}_${timeRange}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to save image:', err);
      alert("Failed to save image.");
    } finally {
      document.body.style.cursor = 'default';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden relative">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <aside 
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col z-40 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 flex items-center justify-between gap-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200">
               <LayoutDashboard className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg tracking-tight">Lake Toba</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">IoT Monitoring</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
          <div className="text-xs font-bold text-gray-400 uppercase px-3 mb-2 mt-4">Select Sensor Location</div>
          {NODE_CONFIG.map((node) => (
            <button
              key={node.db_id}
              onClick={() => {
                setSelectedNode(node);
                setSidebarOpen(false);
              }}
              className={`group flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 text-left relative overflow-hidden ${
                selectedNode.db_id === node.db_id
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${selectedNode.db_id === node.db_id ? 'bg-white' : 'bg-gray-100 group-hover:bg-white'}`}>
                <MapPin size={16} className={selectedNode.db_id === node.db_id ? 'text-blue-600' : 'text-gray-400'} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{node.label}</span>
                <span className="text-[10px] opacity-80 leading-tight">{node.area}</span>
              </div>
              {selectedNode.db_id === node.db_id && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500"></div>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100">
             <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full animate-pulse ${status.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs font-bold text-gray-600">{status.online ? 'Gateway Connected' : 'Gateway Offline'}</span>
             </div>
             <p className="text-[10px] text-gray-400">Dashboard Version v2.2 (CSV Date Fix)</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 md:px-8 md:py-6 shadow-lg z-10 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Menu size={28} />
            </button>

            <div>
              <div className="flex items-center gap-3">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight truncate max-w-[200px] md:max-w-none">{selectedNode.label}</h2>
                  <span className="hidden md:flex bg-white/20 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm items-center gap-1">
                      <MapPin size={10} /> {selectedNode.area}
                  </span>
              </div>
              <p className="text-blue-100 opacity-90 text-sm mt-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse"></span>
                  Real-time Water Quality Monitoring
              </p>
            </div>
          </div>
          <RealTimeClock />
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-20 scroll-smooth">
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto p-1 scrollbar-hide">
                <Calendar size={18} className="text-gray-400 ml-2 min-w-[18px]" />
                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                {ranges.map(range => (
                    <button 
                    key={range.val}
                    onClick={() => setTimeRange(range.val)}
                    className={`px-3 md:px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        timeRange === range.val 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                    >
                    {range.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 md:gap-3 px-2 w-full md:w-auto justify-end">
              <div className="text-xs text-gray-400 font-mono hidden md:block">
                {loading ? (
                    <span className="flex items-center gap-1 text-blue-500"><RefreshCw className="animate-spin w-3 h-3"/> Updating...</span>
                ) : (
                    <span>Sync: {new Date().toLocaleTimeString()}</span>
                )}
              </div>

              <button onClick={downloadCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-50 text-green-600 hover:bg-green-100 px-3 py-2 rounded-lg transition-colors border border-green-100 shadow-sm">
                <FileDown size={16} />
                <span className="text-xs font-bold md:inline">CSV</span>
              </button>

              <button onClick={downloadImage} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors border border-blue-100 shadow-sm">
                <Camera size={16} />
                <span className="text-xs font-bold md:inline">Chart</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div ref={chartRef} className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6 flex flex-col h-[400px] md:h-[450px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700">Historical Data Chart</h3>
                    <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Temperature (°C)</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> DO (mg/L)</span>
                    </div>
                </div>
                
                <div className="flex-1 w-full min-h-[300px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                    
                    <LineChart key={timeRange} data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        
                        <XAxis 
                            dataKey="time"
                            tickFormatter={formatXAxis} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#94a3b8', fontSize: 11}} 
                            dy={10} 
                            minTickGap={35}
                        />

                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#3b82f6'}} domain={['auto', 'auto']} unit="°C" />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#10b981'}} domain={[0, 'auto']} unit=" mg" />
                        
                        <Tooltip 
                            labelFormatter={(label) => {
                                const date = new Date(label);
                                if (!isNaN(date.getTime())) {
                                  return date.toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12: false });
                                }
                                return convertToWIB(label);
                            }}
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px'}}
                            formatter={(val, name) => [val, name === 'suhu' ? 'Water Temperature' : 'Dissolved Oxygen']}
                            labelStyle={{color: '#64748b', marginBottom: '8px', fontSize: '12px'}}
                            cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }}
                        />
                        
                        <Line connectNulls yAxisId="left" type="monotone" dataKey="suhu" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                        <Line connectNulls yAxisId="right" type="monotone" dataKey="do" stroke="#10b981" strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: '#10b981' }} activeDot={{ r: 6 }} />
                    </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 h-[300px] md:h-[450px] flex flex-col">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="font-bold text-gray-700">Location Map</h3>
                    <Navigation size={16} className="text-blue-500" />
                </div>
                <div className="flex-1 rounded-2xl overflow-hidden border border-gray-100 relative">
                    <MapComponent selectedNodeId={selectedNode.db_id} />
                    <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-gray-100 z-[1000] text-xs">
                        <div className="font-bold text-gray-800">{selectedNode.label}</div>
                        <div className="text-gray-500">{selectedNode.area}</div>
                    </div>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* NETWORK STATUS */}
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="flex justify-between items-start z-10 relative">
                   <div>
                      <h3 className="text-gray-500 text-sm font-medium">Network Status</h3>
                      <div className={`text-xl font-bold mt-1 ${status.online ? 'text-green-600' : 'text-red-500'}`}>
                        {status.online ? 'Connected' : 'Disconnected'}
                      </div>
                   </div>
                   <div className={`p-2 rounded-xl ${status.online ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                       <Wifi size={20} />
                   </div>
                </div>
                <div className="mt-6 space-y-3">
                    <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-400">RSSI (Signal)</span>
                        <span className="font-mono font-bold text-gray-700">{status.rssi ?? '-'} dBm</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                            className={`h-full ${status.rssi > -100 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                            style={{width: status.rssi ? `${Math.min(Math.max((status.rssi + 130)*1.2, 0), 100)}%` : '0%'}}
                        ></div>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">SNR (Noise)</span>
                        <span className="font-mono font-bold text-gray-700">{status.snr ?? '-'} dB</span>
                    </div>
                </div>
             </div>

             <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium">Average Temperature</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Period: {ranges.find(r => r.val === timeRange)?.label}</p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-xl text-blue-600"><Thermometer size={20}/></div>
                </div>
                <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-800 tracking-tight">{calculateAvg('suhu')}</span>
                    <span className="text-lg font-medium text-gray-400 ml-1">°C</span>
                </div>
             </div>

             <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium">Average DO</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Dissolved Oxygen Level</p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-xl text-green-600"><Droplets size={20}/></div>
                </div>
                <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-800 tracking-tight">{calculateAvg('do')}</span>
                    <span className="text-lg font-medium text-gray-400 ml-1">mg/L</span>
                </div>
             </div>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-8 pb-4 flex flex-col items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
            <p className="text-xs text-gray-400 font-mono tracking-[0.2em] font-bold">
              TA1-GROUP3-2025/2026
            </p>
            <p className="text-[10px] text-gray-300 mt-2 font-medium">
              Lake Toba Water Quality Monitoring System Based on IoT LoRa
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;