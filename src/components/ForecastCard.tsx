import { useState } from 'react';
import { ForecastMonth } from '../types';
import { TrendingUp, Settings, Check, X, Calendar } from 'lucide-react';

interface ForecastCardProps {
  forecasts: ForecastMonth[];
  onChange: (list: ForecastMonth[]) => void;
  canEdit?: boolean;
  isAdmin?: boolean;
}

export function ForecastCard({ forecasts, onChange, canEdit = true, isAdmin = false }: ForecastCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempForecasts, setTempForecasts] = useState<ForecastMonth[]>([]);

  const handleStartEdit = () => {
    setTempForecasts(forecasts.map(f => ({ ...f })));
    setIsEditing(true);
  };

  const handleUpdateField = (id: string, key: keyof ForecastMonth, value: any) => {
    setTempForecasts(prev =>
      prev.map(f => {
        if (f.id === id) {
          let updatedValue = value;
          if (key === 'percentage') {
            updatedValue = Math.min(100, Math.max(0, Number(value)));
            return { ...f, percentage: updatedValue };
          } else if (key === 'bookedRooms') {
            updatedValue = Math.max(0, Number(value));
            return { ...f, bookedRooms: updatedValue };
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

  // We should map forecasts (either active or temp)
  const activeForecasts = isEditing ? tempForecasts : forecasts;

  return (
    <div id="forecast-card-container" className="bg-white border border-sand-200 rounded-xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-accent-gold/10 text-accent-gold rounded-md">
              <TrendingUp size={18} />
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-slate-800">Forecast 2 Bulan Kedepan</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">Estimasi On-Hand Booking kamar terjual dan persentase okupansi untuk 60 hari ke depan</p>
        </div>

        {!canEdit ? (
          <span className="self-start text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1 select-none font-mono">
            <span>🔒</span> Hanya Lihat
          </span>
        ) : !isEditing ? (
          <button
            type="button"
            onClick={handleStartEdit}
            className="flex items-center justify-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-700 bg-sand-100 hover:bg-sand-200 border border-sand-300 rounded-lg transition-all min-h-[40px] sm:min-h-0 shrink-0 cursor-pointer"
          >
            <Settings size={14} /> Atur Angka
          </button>
        ) : (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs font-bold text-white bg-accent-emerald hover:bg-accent-emerald/90 rounded-lg transition-all min-h-[40px] sm:min-h-0 cursor-pointer"
            >
              <Check size={14} className="mr-0.5" /> Simpan
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all min-h-[40px] sm:min-h-0 cursor-pointer"
            >
              <X size={14} className="mr-0.5" /> Batal
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeForecasts.map(f => {
          return (
            <div
              key={f.id}
              className={`p-5 rounded-xl border transition-all ${
                isEditing
                  ? 'bg-sand-100 border-accent-gold shadow-sm'
                  : 'bg-sand-100/40 border-sand-200 hover:border-sand-300'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-accent-gold" />
                  {isEditing ? (
                    <span className="text-[11px] font-bold text-slate-550 uppercase tracking-wide">Pengaturan Kolom</span>
                  ) : (
                    <h4 className="font-display font-bold text-sm text-slate-800">{f.monthName}</h4>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3.5 animate-fadeIn">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nama Bulan / Label</label>
                    <input
                      type="text"
                      value={f.monthName}
                      onChange={e => handleUpdateField(f.id, 'monthName', e.target.value)}
                      className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                      placeholder="Contoh: June 2026"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Okupansi (%)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={f.percentage}
                        onChange={e => handleUpdateField(f.id, 'percentage', Number(e.target.value))}
                        className="flex-1 accent-accent-gold h-2 bg-gray-200 rounded cursor-pointer min-h-[40px]"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={f.percentage}
                        onChange={e => handleUpdateField(f.id, 'percentage', Number(e.target.value))}
                        className="w-16 bg-white border border-sand-300 rounded-lg px-2 py-2 text-center font-mono text-base sm:text-xs text-slate-800 font-bold focus:outline-none focus:border-accent-gold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Kamar Terjual</label>
                    <input
                      type="number"
                      min="0"
                      value={f.bookedRooms}
                      onChange={e => handleUpdateField(f.id, 'bookedRooms', Number(e.target.value))}
                      className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                      placeholder="0"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Big stat */}
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-display font-extrabold text-slate-800 tracking-tight">
                      {f.percentage}%
                    </span>
                    <span className="text-xs font-semibold text-gray-500">
                      {f.bookedRooms} Kamar Terjual
                    </span>
                  </div>

                  {/* Progress bar visual */}
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-gold rounded-full transition-all duration-500"
                      style={{ width: `${f.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
