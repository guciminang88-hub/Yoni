import { useState, useEffect } from 'react';
import { Forecast7DaysItem } from '../types';
import { TrendingUp, Settings, Check, X, Calendar, Percent, ShieldCheck } from 'lucide-react';

interface Forecast7DaysCardProps {
  forecasts7Days: Forecast7DaysItem[];
  onChange: (list: Forecast7DaysItem[]) => void;
  canEdit?: boolean;
  isAdmin?: boolean;
  todayDate?: Date;
}

// Indonesian future days generator based on current local browser date
function getFutureSevenDays(baseDate: Date): { date: string; dayName: string }[] {
  const daysIndonesia = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const list = [];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate.getTime());
    d.setDate(baseDate.getDate() + i);
    
    // Extract local year, month, date to build YYYY-MM-DD safely
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateVal = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dateVal}`;
    
    const dayName = daysIndonesia[d.getDay()];
    list.push({ date: dateStr, dayName });
  }
  
  return list;
}

export function Forecast7DaysCard({ forecasts7Days = [], onChange, canEdit = true, isAdmin = false, todayDate }: Forecast7DaysCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempForecasts, setTempForecasts] = useState<Forecast7DaysItem[]>([]);

  const todayDateObj = todayDate || new Date();
  const futureDays = getFutureSevenDays(todayDateObj);

  // Auto-calculate current forecasts based on date sequence
  const activeForecasts = futureDays.map((fd, i) => {
    // 1. Try to find if there is an existing record for this date string in forecasts7Days
    const existing = forecasts7Days.find(item => item.date === fd.date);
    if (existing) {
      // Repair potentially corrupted duplicate IDs
      const repairedId = (!existing.id || existing.id.startsWith('fc7-auto')) ? `fc7-auto-${fd.date}` : existing.id;
      return {
        ...existing,
        id: repairedId,
        dayName: fd.dayName // Keep the localized dayName up to date
      };
    }
    
    // 2. Or fallback to the existing list index if possible to preserve existing inputs on a sliding window
    const indexFallback = forecasts7Days[i];
    
    return {
      id: `fc7-auto-${fd.date}`,
      date: fd.date,
      dayName: fd.dayName,
      bookedRooms: indexFallback ? indexFallback.bookedRooms : 100 + Math.floor(Math.random() * 80),
      percentage: indexFallback ? indexFallback.percentage : 50 + Math.floor(Math.random() * 40)
    };
  });

  // Auto synchronization when component mounts or days change (e.g. at midnight)
  useEffect(() => {
    if (isEditing) return;

    // Check if state is different in dates or counts so they slide/sync automatically
    const isDifferent = forecasts7Days.length !== activeForecasts.length ||
      activeForecasts.some((af, i) => {
        const propItem = forecasts7Days[i];
        return !propItem || propItem.date !== af.date || propItem.dayName !== af.dayName;
      });

    if (isDifferent) {
      const timer = setTimeout(() => {
        onChange(activeForecasts);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [forecasts7Days, todayDateObj, isEditing]);

  const handleStartEdit = () => {
    setTempForecasts(activeForecasts.map(f => ({ ...f })));
    setIsEditing(true);
  };

  const handleUpdateField = (id: string, key: keyof Forecast7DaysItem, value: any) => {
    setTempForecasts(prev =>
      prev.map(f => {
        if (f.id === id) {
          let updatedValue = value;
          if (key === 'percentage') {
            updatedValue = Math.min(100, Math.max(0, Number(value)));
            const calculatedRooms = Math.round((updatedValue / 100) * 209);
            return { ...f, percentage: updatedValue, bookedRooms: calculatedRooms };
          } else if (key === 'bookedRooms') {
            updatedValue = Math.max(0, Number(value));
            // Auto calculate percentage as well if room changes based on 209 total capacity
            const calculatedPercentage = Math.round((updatedValue / 209) * 100 * 100) / 100;
            return { ...f, bookedRooms: updatedValue, percentage: Math.min(100, calculatedPercentage) };
          }
          return { ...f, [key]: updatedValue };
        }
        return f;
      })
    );
  };

  const handleSave = () => {
    onChange(tempForecasts);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const currentForecasts = isEditing ? tempForecasts : activeForecasts;

  // Render a nice Indonesian date format
  const formatIndoDate = (dateStr: string, dayName: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthMap: Record<string, string> = {
          '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
          '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Ags',
          '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des'
        };
        const monthLabel = monthMap[parts[1]] || parts[1];
        const day = parts[2];
        return `${dayName}, ${day} ${monthLabel} ${year}`;
      }
    } catch (e) {
      // ignore
    }
    return `${dayName}, ${dateStr}`;
  };

  return (
    <div id="forecast-7days-container" className="bg-white border border-sand-200 rounded-3xl p-4 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-sand-200 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-accent-gold/10 text-accent-gold rounded-xl">
              <Calendar size={22} className="text-amber-700" />
            </span>
            <h3 className="font-display font-black text-lg sm:text-xl text-slate-800 tracking-tight">
              Forecast Okupansi 7 Hari Kedepan
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-xl leading-relaxed">
            Estimasi On-Hand Booking harian, nama hari, detail tanggal, dan rasio persen okupansi (kalkulasi dibuat berdasarkan kapasitas standar 209 Kamar).
          </p>
        </div>

        {!canEdit ? (
          <span className="self-start text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1 leading-none select-none font-sans border border-sand-200/60">
            <ShieldCheck size={12} className="text-slate-400" />
            <span>Hanya Lihat</span>
          </span>
        ) : !isEditing ? (
          <button
            type="button"
            onClick={handleStartEdit}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-sand-300 rounded-xl text-xs font-bold text-slate-750 bg-slate-50 hover:bg-slate-100 shadow-3xs cursor-pointer select-none font-sans"
          >
            <Settings size={14} className="text-slate-500" />
            <span>Atur Angka Forecast</span>
          </button>
        ) : (
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-xs cursor-pointer"
            >
              <Check size={14} className="mr-0.5 text-emerald-400 font-bold" />
              <span>Simpan Perubahan</span>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold text-slate-650 bg-slate-100 hover:bg-slate-200 border border-sand-250 rounded-xl cursor-pointer"
            >
              <X size={14} className="mr-0.5 text-rose-500" />
              <span>Batal</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Display Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        {currentForecasts.map((f, idx) => {
          // Color based on active index with smooth progression
          const percentVal = f.percentage || 0;
          let progressBg = "bg-rose-500";
          let textBadge = "text-rose-700 bg-rose-50 border-rose-100";
          if (percentVal >= 75) {
            progressBg = "bg-emerald-600";
            textBadge = "text-emerald-700 bg-emerald-50 border-emerald-100";
          } else if (percentVal >= 60) {
            progressBg = "bg-amber-500";
            textBadge = "text-amber-700 bg-amber-50 border-amber-100";
          } else if (percentVal >= 45) {
            progressBg = "bg-sky-500";
            textBadge = "text-sky-700 bg-sky-50 border-sky-100";
          }

          return (
            <div
              key={f.id}
              className={`flex flex-col justify-between p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 h-full ${
                isEditing
                  ? 'bg-amber-50/50 border-amber-300 shadow-3xs'
                  : 'bg-slate-50/50 hover:bg-white border-sand-200 shadow-3xs hover:shadow-sm'
              }`}
            >
              <div className="mb-4">
                {/* Day & Date Headers (Always automatic, no manual changes) */}
                <div>
                  <span className={`text-xs font-black block uppercase tracking-wider ${
                    isEditing ? 'text-amber-800' : 'text-slate-550'
                  }`}>
                    {f.dayName}
                  </span>
                  <span className={`text-[11px] font-medium block mt-0.5 ${
                    isEditing ? 'text-amber-700/85' : 'text-gray-400'
                  }`}>
                    {formatIndoDate(f.date, f.dayName).split(', ')[1] || f.date}
                  </span>
                </div>
              </div>

              {/* Input or Stat Value parameters */}
              {isEditing ? (
                <div className="space-y-2.5 pt-2 border-t border-dashed border-amber-200">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-amber-800 mb-0.5 flex justify-between items-center">
                      <span>Kamar Terjual (Rms)</span>
                      <span className="text-[7.5px] font-bold opacity-75">(Kapasitas 209)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={f.bookedRooms}
                      onChange={e => handleUpdateField(f.id, 'bookedRooms', Number(e.target.value))}
                      className="w-full bg-white border border-sand-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-amber-800 mb-0.5">Rasio Okupansi (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={f.percentage}
                      onChange={e => handleUpdateField(f.id, 'percentage', Number(e.target.value))}
                      disabled={!isAdmin}
                      className="w-full bg-white border border-sand-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 pt-3 border-t border-sand-150">
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-2xl font-display font-black text-slate-850 tracking-tight leading-none">
                        {f.percentage}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-gray-200/70 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${progressBg} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, f.percentage)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-450 font-bold font-mono">ON-HAND</span>
                    <span className="text-[11px] font-extrabold text-slate-750 font-mono">
                      {f.bookedRooms} <span className="text-[9px] text-slate-400">/ 209 Rms</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-slate-50 border border-sand-200/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-1 px-2.5 bg-sky-100 text-sky-800 rounded-lg font-mono text-[10px] font-bold">INFO</span>
          <p className="text-[11px] text-gray-500">
            Perubahan forecast 7 hari ini disimpan secara otomatis dan tersinkronisasi dengan baik di cloud database.
          </p>
        </div>
      </div>
    </div>
  );
}
