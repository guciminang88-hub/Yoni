import { useState } from 'react';
import { GeneralMetrics, BarTier } from '../types';
import { Settings, Check, X, ArrowDownLeft, ArrowUpRight, Percent, DollarSign, TrendingUp, Plus, Trash2, Lock, Minus, Hammer, Info } from 'lucide-react';

const DEFAULT_BAR_TIERS: BarTier[] = [
  { id: 'tier-1', level: 'BAR Level 1', rate: 1500000, remarks: 'Okupansi di bawah 50%', isActive: false },
  { id: 'tier-2', level: 'BAR Level 2', rate: 1650000, remarks: 'Okupansi 50% - 70%', isActive: false },
  { id: 'tier-3', level: 'BAR Level 3', rate: 1850000, remarks: 'Okupansi 70% - 85%', isActive: true },
  { id: 'tier-4', level: 'BAR Level 4', rate: 2100000, remarks: 'Okupansi 85% - 95%', isActive: false },
  { id: 'tier-5', level: 'BAR Level 5', rate: 2450000, remarks: 'Peak Season / Okupansi > 95%', isActive: false },
];

interface MetricsCardProps {
  metrics: GeneralMetrics;
  onChange: (metrics: GeneralMetrics) => void;
  canEdit?: boolean;
  isAdmin?: boolean;
}

export function MetricsCard({ metrics, onChange, canEdit = true, isAdmin = false }: MetricsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [capacity, setCapacity] = useState(() => {
    const saved = localStorage.getItem('morning_briefing_hotel_capacity');
    return saved ? Number(saved) : 209;
  });
  const [tempCapacity, setTempCapacity] = useState(capacity);
  const [tempMetrics, setTempMetrics] = useState<GeneralMetrics>(() => ({
    ...metrics,
    oooRoomsCount: metrics.oooRoomsCount || 0
  }));

  const currentTiers = metrics.barTiers || DEFAULT_BAR_TIERS;

  // Calculate dynamic occupancy percentage on the fly to avoid desynchronization
  const currentOoo = metrics.oooRoomsCount || 0;
  const availRooms = Math.max(1, capacity);
  const calculatedPercentage = Math.round(((metrics.onHandBookingCount || 0) / availRooms) * 100);

  // Handle local change in edit view
  const updateTemp = (key: keyof GeneralMetrics, val: any) => {
    const updated = { ...tempMetrics, [key]: val };
    
    // Automatically recalculate percentage based on: Available Rooms = totalCapacity
    if (key === 'onHandBookingCount' || key === 'oooRoomsCount') {
      const curCapacity = tempCapacity;
      const curSold = key === 'onHandBookingCount' ? Math.max(0, Number(val)) : updated.onHandBookingCount;
      
      const availableRooms = Math.max(1, curCapacity);
      updated.onHandBookingPercentage = Math.round((curSold / availableRooms) * 100);
    }
    
    setTempMetrics(updated);
  };

  const handleCapacityChange = (newCap: number) => {
    const capVal = Math.max(1, newCap);
    setTempCapacity(capVal);
    // Recalculate percentage based on new capacity
    const curSold = tempMetrics.onHandBookingCount;
    const availableRooms = Math.max(1, capVal);

    setTempMetrics(prev => ({
      ...prev,
      onHandBookingPercentage: Math.round((curSold / availableRooms) * 100)
    }));
  };

  const handleSave = () => {
    setCapacity(tempCapacity);
    localStorage.setItem('morning_briefing_hotel_capacity', String(tempCapacity));
    onChange(tempMetrics);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempCapacity(capacity);
    setIsEditing(false);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div id="metrics-card-container" className="bg-white border border-sand-200 rounded-xl p-4 sm:p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2 relative">
          <h3 className="font-display font-bold text-lg sm:text-xl text-slate-800">Metrik Utama Hari Ini</h3>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200 flex items-center justify-center transition-colors"
            title="Info"
          >
            <Info size={12} />
          </button>
          
          {showInfo && (
            <div className="absolute top-0 sm:top-1/2 sm:-translate-y-1/2 left-full ml-3 w-64 bg-slate-800 text-white text-xs rounded-xl p-3 shadow-xl z-20 animate-fadeIn border border-slate-700">
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="font-bold text-sky-400">Info:</span>
                <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>
              <p className="leading-relaxed">Ringkasan okupansi, BAR rate, penanganan kedatangan (arrivals), dan keberangkatan (departures)</p>
            </div>
          )}
        </div>
        {!canEdit ? (
          <span className="self-start text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1 select-none font-mono">
            <span>🔒</span> Hanya Lihat
          </span>
        ) : !isEditing ? (
          <button
            onClick={() => {
              const curOoo = metrics.oooRoomsCount ?? 0;
              const curSold = metrics.onHandBookingCount ?? 0;
              const capVal = capacity ?? 209;
              const availableRooms = Math.max(1, capVal - curOoo);
              const correctedPercentage = Math.round((curSold / availableRooms) * 105) > 0 ? Math.round((curSold / availableRooms) * 100) : 0;

              setTempMetrics({
                ...metrics,
                oooRoomsCount: curOoo,
                onHandBookingCount: curSold,
                totalArrivalsToday: metrics.totalArrivalsToday ?? 0,
                totalDeparturesToday: metrics.totalDeparturesToday ?? 0,
                barRateToday: metrics.barRateToday ?? 0,
                onHandBookingPercentage: correctedPercentage,
                taxiRevenue: metrics.taxiRevenue ?? 0,
              });
              setTempCapacity(capVal);
              setIsEditing(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-700 bg-sand-100 hover:bg-sand-200 border border-sand-300 rounded-lg transition-all min-h-[40px] sm:min-h-0"
          >
            <Settings size={14} /> Atur Angka
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs font-bold text-white bg-accent-emerald hover:bg-accent-emerald/90 rounded-lg transition-all min-h-[40px] sm:min-h-0"
            >
              <Check size={14} className="mr-0.5" /> Simpan
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all min-h-[40px] sm:min-h-0"
            >
              <X size={14} className="mr-0.5" /> Batal
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-sand-100 rounded-xl">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide font-mono">
                On-Hand Booking (Sold Rooms)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max={Math.max(1, tempCapacity ?? 200)}
                  value={tempMetrics.onHandBookingCount ?? 0}
                  onChange={(e) => updateTemp('onHandBookingCount', Number(e.target.value))}
                  className="w-full bg-white border border-sand-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                />
                <span className="text-sm text-slate-400 font-bold shrink-0">/</span>
                <input
                  type="number"
                  min="1"
                  value={tempCapacity ?? 200}
                  onChange={(e) => handleCapacityChange(Number(e.target.value))}
                  disabled={!isAdmin}
                  className="w-20 bg-white border border-sand-300 rounded-lg px-2 py-2 text-base sm:text-sm text-center text-slate-800 font-semibold focus:outline-none focus:border-accent-gold disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  title={isAdmin ? "Edit Kapasitas Total Hotel (Total Rooms)" : "Hanya Admin yang dapat mengubah kapasitas total"}
                />
                <span className="text-xs text-slate-500 font-medium shrink-0">Rms</span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium font-sans">
                Okupansi: <strong className="text-accent-gold font-bold">{tempMetrics.onHandBookingPercentage || 0}%</strong> (dari {Math.max(0, tempCapacity ?? 200)} Kamar Tersedia)
              </p>
            </div>

            <div className="space-y-1.5 border-l-0 sm:border-l sm:border-sand-200 sm:pl-4">
              <label className="text-xs font-semibold text-rose-700 uppercase tracking-wide font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Kamar OOO (Out of Order)
              </label>
              <input
                type="number"
                min="0"
                max={tempCapacity ?? 200}
                value={tempMetrics.oooRoomsCount ?? 0}
                onChange={(e) => updateTemp('oooRoomsCount', Number(e.target.value))}
                className="w-full bg-white border border-sand-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
              />
              <p className="text-[10px] text-gray-400 font-medium font-sans">
                Ruangan tidak bisa dijual.
              </p>
            </div>

            <div className="space-y-1.5 sm:border-l sm:border-sand-200 sm:pl-4">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide font-mono">
                Arrivals Today
              </label>
              <input
                type="number"
                min="0"
                value={tempMetrics.totalArrivalsToday ?? 0}
                onChange={(e) => updateTemp('totalArrivalsToday', Number(e.target.value))}
                className="w-full bg-white border border-sand-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
              />
              <p className="text-[10px] text-gray-400 font-sans">Kedatangan hari ini</p>
            </div>

            <div className="space-y-1.5 sm:border-l sm:border-sand-200 sm:pl-4">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide font-mono">
                Departures Today
              </label>
              <input
                type="number"
                min="0"
                value={tempMetrics.totalDeparturesToday ?? 0}
                onChange={(e) => updateTemp('totalDeparturesToday', Number(e.target.value))}
                className="w-full bg-white border border-sand-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
              />
              <p className="text-[10px] text-gray-400 font-sans">Keberangkatan hari ini</p>
            </div>

            <div className="space-y-1.5 md:col-span-2 border-t border-sand-200 pt-3">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide font-mono">
                Harga Best Available Rate (BAR) Hari Ini (IDR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={tempMetrics.barRateToday ?? 0}
                  onChange={(e) => updateTemp('barRateToday', Number(e.target.value))}
                  className="w-full bg-white border border-sand-300 rounded-lg pl-9 pr-3 py-2 text-base sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                />
              </div>
              <p className="text-[10px] text-gray-400 font-sans">Harga acuan publik kamar standard hari ini untuk Front Desk dan Walk-In.</p>
            </div>

            <div className="space-y-1.5 md:col-span-2 border-t border-sand-200 pt-3 md:border-l md:border-sand-200 md:pl-4">
              <label className="text-xs font-semibold text-slate-705 uppercase tracking-wide font-mono flex items-center gap-1">
                <span>🚕</span> Revenue Taxi Hari Ini (IDR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={tempMetrics.taxiRevenue ?? 0}
                  onChange={(e) => updateTemp('taxiRevenue', Number(e.target.value))}
                  className="w-full bg-white border border-sand-300 rounded-lg pl-9 pr-3 py-2 text-base sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                />
              </div>
              <p className="text-[10px] text-gray-405 font-sans">Pendapatan pelayanan pemesanan taxi / transport tamu untuk hari ini.</p>
            </div>
          </div>

          {/* BAR Tiers Editor Sub-table */}
          {isAdmin && (
            <div className="space-y-3 bg-sand-50 p-4 border border-sand-200 rounded-xl">
              <div className="flex items-center justify-between gap-4">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <span>⚙️</span> Atur Konfigurasi Acuan BAR Levels
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `tier-${Date.now()}`;
                    const currentList = tempMetrics.barTiers || [...DEFAULT_BAR_TIERS];
                    const nextLevelNum = currentList.length + 1;
                    const updatedTiers = [
                      ...currentList,
                      { id: newId, level: `BAR Level ${nextLevelNum}`, rate: 1000000, remarks: 'Kriteria tambahan untuk okupansi tertentu' }
                    ];
                    setTempMetrics(prev => ({ ...prev, barTiers: updatedTiers }));
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-xs transition cursor-pointer font-sans"
                >
                  <Plus size={11} /> Tambah Level BAR
                </button>
              </div>
              
              <div className="rounded-lg border border-sand-200 overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-sand-100 border-b border-sand-200 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-3 py-2 w-1/4">Nama Tingkatan</th>
                      <th className="px-3 py-2 w-1/4">Tarif Standard Today (IDR)</th>
                      <th className="px-3 py-2">Kriteria / Catatan Okupansi</th>
                      <th className="px-3 py-2 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-150">
                    {(tempMetrics.barTiers || DEFAULT_BAR_TIERS).map((tier) => (
                      <tr key={tier.id} className="text-xs hover:bg-slate-50/50">
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={tier.level}
                            onChange={(e) => {
                              const currentList = tempMetrics.barTiers || [...DEFAULT_BAR_TIERS];
                              const updated = currentList.map(t => t.id === tier.id ? { ...t, level: e.target.value } : t);
                              setTempMetrics(prev => ({ ...prev, barTiers: updated }));
                            }}
                            className="w-full bg-slate-50 border border-sand-200 rounded px-2 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-accent-gold font-sans"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            value={tier.rate}
                            onChange={(e) => {
                              const currentList = tempMetrics.barTiers || [...DEFAULT_BAR_TIERS];
                              const updated = currentList.map(t => t.id === tier.id ? { ...t, rate: Number(e.target.value) } : t);
                              setTempMetrics(prev => ({ ...prev, barTiers: updated }));
                            }}
                            className="w-full bg-slate-50 border border-sand-200 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-accent-gold"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={tier.remarks}
                            onChange={(e) => {
                              const currentList = tempMetrics.barTiers || [...DEFAULT_BAR_TIERS];
                              const updated = currentList.map(t => t.id === tier.id ? { ...t, remarks: e.target.value } : t);
                              setTempMetrics(prev => ({ ...prev, barTiers: updated }));
                            }}
                            className="w-full bg-slate-50 border border-sand-200 rounded px-2 py-1 text-xs text-gray-600 focus:outline-none focus:bg-white focus:ring-1 focus:ring-accent-gold font-sans"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const currentList = tempMetrics.barTiers || [...DEFAULT_BAR_TIERS];
                              const updated = currentList.filter(t => t.id !== tier.id);
                              setTempMetrics(prev => ({ ...prev, barTiers: updated }));
                            }}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus tingkat ini"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-400 font-sans">Atur level acuan ini agar Manager / Front Office dapat melakukan integrasi tarif instan saat rapat pagi.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Card 1: On Hand Occupancy */}
            <div className="bg-slate-50 border border-slate-200/85 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:bg-slate-100/50 transition-all relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-sand-100/60 pointer-events-none">
                <Percent size={120} />
              </div>
              <div className="flex justify-between items-start z-10">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider font-mono">On-Hand Booking</span>
                <span className="px-2.5 py-1 bg-white text-slate-705 border border-sand-200 rounded-lg text-xs font-bold font-mono">
                  {metrics.onHandBookingCount}/{Math.max(0, capacity)} Rms
                </span>
              </div>
              <div className="mt-4 z-10">
                <h4 className="text-4xl font-display font-black tracking-tight text-accent-gold">
                  {calculatedPercentage}%
                </h4>
                <p className="text-[11px] text-gray-400 mt-1 font-sans">Okupansi Kamar Terjual (Sold / Room Avail)</p>
              </div>
              {/* Visual Progress Bar */}
              <div className="w-full bg-sand-200 h-1.5 rounded-full mt-3 overflow-hidden z-10">
                <div 
                  className="bg-accent-gold h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${calculatedPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Card 2: Arrivals Today */}
            <div className="bg-slate-50 border border-slate-200/85 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:bg-slate-100/50 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider font-mono">Arrival Today</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-800 rounded-lg">
                  <ArrowDownLeft size={16} />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-3xl font-display font-bold text-slate-800">
                  {metrics.totalArrivalsToday} <span className="text-sm text-gray-500 font-normal font-sans">Kamar</span>
                </h4>
                <p className="text-[11px] text-gray-400 mt-1 font-sans">Estimasi kedatangan tamu hari ini</p>
              </div>
            </div>

            {/* Card 3: Departures Today */}
            <div className="bg-slate-50 border border-slate-200/85 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:bg-slate-100/50 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider font-mono">Departure Today</span>
                <div className="p-1.5 bg-blue-50 text-blue-800 rounded-lg">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-3xl font-display font-bold text-slate-800">
                  {metrics.totalDeparturesToday} <span className="text-sm text-gray-500 font-normal font-sans">Kamar</span>
                </h4>
                <p className="text-[11px] text-gray-400 mt-1 font-sans">Rencana tamu keluar / check-out hari ini</p>
              </div>
            </div>

            {/* Card 4: BAR Today Settings */}
            <div className="bg-slate-50 border border-slate-200/85 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:bg-slate-100/50 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider font-mono">Harga BAR Hari Ini</span>
                <div className="p-1.5 bg-accent-gold/10 text-accent-gold rounded-lg">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="mt-2">
                <h4 className="text-xl font-display font-black text-slate-800 tracking-tight leading-none">
                  {formatRupiah(metrics.barRateToday)}
                </h4>
                <p className="text-[10px] text-gray-400 mt-1 font-sans">Best Available Rate (Harga Dasar Terbuka)</p>
              </div>
            </div>

            {/* Card 5: Revenue Taxi */}
            <div className="bg-slate-50 border border-slate-200/85 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:bg-slate-100/50 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider font-mono">Revenue Taxi</span>
                <div className="p-1.5 bg-blue-50/70 text-blue-800 rounded-lg">
                  <span className="text-sm font-bold font-mono">🚕</span>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-xl font-display font-black text-slate-805 tracking-tight leading-none">
                  {formatRupiah(metrics.taxiRevenue || 0)}
                </h4>
                <p className="text-[10px] text-gray-400 mt-1 font-sans">Pencatatan pendapatan dari pesanan taxi harian</p>
              </div>
            </div>
          </div>

          {/* Configured BAR rate list details column/table */}
          <div className="mt-6 pt-5 border-t border-sand-150">
            <div className="flex items-center justify-between gap-4 mb-3.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-accent-gold/10 text-accent-gold rounded-lg shrink-0">
                  <TrendingUp size={15} />
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">Kolom Acuan Konfigurasi Harga BAR (Best Available Rate)</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-sans">Daftar standard tiering harga kamar harian berdasarkan tingkat occupancy harian.</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-sand-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-50/75 border-b border-sand-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Tingkatan / Level BAR</th>
                    <th className="px-4 py-3">Tarif Standard Hari Ini</th>
                    <th className="px-4 py-3">Syarat Okupansi / Kriteria</th>
                    <th className="px-4 py-3 text-right">Aksi Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-150">
                  {currentTiers.map((tier) => {
                    const isActive = metrics.barRateToday === tier.rate;
                    return (
                      <tr 
                        key={tier.id} 
                        className={`text-xs transition ${
                          isActive 
                            ? 'bg-emerald-50/45 text-slate-850 font-medium' 
                            : 'hover:bg-slate-50/40 text-slate-650'
                        }`}
                      >
                        <td className="px-4 py-2.5 font-bold text-slate-800 font-sans">
                          {tier.level}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-extrabold text-slate-750">
                          {formatRupiah(tier.rate)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 font-sans">
                          {tier.remarks || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {isActive ? (
                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[9px] font-extrabold uppercase tracking-widest font-mono">
                              ● Sedang Aktif
                            </span>
                          ) : (
                            <div className="flex justify-end gap-2 items-center">
                              {canEdit && (
                                isAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onChange({ ...metrics, barRateToday: tier.rate, barTiers: currentTiers });
                                    }}
                                    className="px-2.5 py-1 bg-white hover:bg-sand-150 text-slate-700 hover:text-black border border-sand-300 rounded-lg text-[10px] font-bold transition shadow-3xs cursor-pointer font-sans"
                                    title={`Terapkan ${formatRupiah(tier.rate)} sebagai harga aktif`}
                                  >
                                    Gunakan Tarif
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    className="px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-[10px] font-bold font-sans flex items-center gap-1 cursor-not-allowed opacity-75"
                                    title="Hanya administrator yang dapat mengubah atau menerapkan tarif aktif"
                                  >
                                    <Lock size={10} className="text-slate-400" />
                                    <span>Gunakan Tarif</span>
                                  </button>
                                )
                              )}
                              <span className="text-[10px] text-gray-400 font-medium font-sans">Standby</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
