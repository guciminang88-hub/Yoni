import React, { useState } from 'react';
import { GuestTransport } from '../types';
import { Car, Clock, Plus, Trash2, CheckCircle, Navigation, MapPin, AlertCircle, Pencil, Check, X } from 'lucide-react';

const STANDARD_TERMINALS = [
  'Batam Center',
  'Harbourbay',
  'Sekupang',
  'Nongsa Pura',
  'Bandara Hang Nadim'
];

interface TransportCardProps {
  transports: GuestTransport[];
  onChange: (list: GuestTransport[]) => void;
  canEdit?: boolean;
}

export function TransportCard({ transports, onChange, canEdit = true }: TransportCardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [type, setType] = useState<'Pickup' | 'Drop-off'>('Pickup');
  const [time, setTime] = useState('');
  const [flightNumber, setFlightNumber] = useState('Batam Center');
  const [carDetails, setCarDetails] = useState('');
  const [status, setStatus] = useState<GuestTransport['status']>('Pending');
  const [passengerCount, setPassengerCount] = useState<number>(1);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGuestName, setEditGuestName] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editType, setEditType] = useState<'Pickup' | 'Drop-off'>('Pickup');
  const [editTime, setEditTime] = useState('');
  const [editFlightNumber, setEditFlightNumber] = useState('Batam Center');
  const [editCarDetails, setEditCarDetails] = useState('');
  const [editStatus, setEditStatus] = useState<GuestTransport['status']>('Pending');
  const [editPassengerCount, setEditPassengerCount] = useState<number>(1);

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAddTransport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    const newTr: GuestTransport = {
      id: `tr-${Date.now()}`,
      guestName: guestName.trim(),
      roomNumber: roomNumber.trim() || "TBD",
      type,
      time: time.trim() || "TBD",
      flightNumber: flightNumber.trim() || "Batam Center",
      carDetails: carDetails.trim() || "Hotel Shuttle / VIP Vehicle",
      status,
      passengerCount: Number(passengerCount) || 1
    };

    onChange([...transports, newTr]);
    setGuestName('');
    setRoomNumber('');
    setTime('');
    setFlightNumber('Batam Center');
    setCarDetails('');
    setStatus('Pending');
    setPassengerCount(1);
    setShowAddForm(false);
  };

  const handleStartEdit = (tr: GuestTransport) => {
    setEditingId(tr.id);
    setEditGuestName(tr.guestName);
    setEditRoomNumber(tr.roomNumber);
    setEditType(tr.type);
    setEditTime(tr.time);
    setEditFlightNumber(tr.flightNumber);
    setEditCarDetails(tr.carDetails);
    setEditStatus(tr.status);
    setEditPassengerCount(tr.passengerCount || 1);
  };

  const handleSaveEdit = (id: string) => {
    if (!editGuestName.trim()) return;
    const updated = transports.map(t => {
      if (t.id === id) {
        return {
          ...t,
          guestName: editGuestName.trim(),
          roomNumber: editRoomNumber.trim() || "TBD",
          type: editType,
          time: editTime.trim() || "TBD",
          flightNumber: editFlightNumber.trim() || "-",
          carDetails: editCarDetails.trim() || "Hotel Shuttle / VIP Vehicle",
          status: editStatus,
          passengerCount: Number(editPassengerCount) || 1
        };
      }
      return t;
    });
    onChange(updated);
    setEditingId(null);
  };

  const handleStatusChange = (id: string, newStatus: GuestTransport['status']) => {
    const updated = transports.map(t => {
      if (t.id === id) {
        return { ...t, status: newStatus };
      }
      return t;
    });
    onChange(updated);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleExecuteDelete = () => {
    if (deleteConfirmId) {
      const filtered = transports.filter(t => t.id !== deleteConfirmId);
      onChange(filtered);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div id="transport-card-container" className="bg-white border border-sand-200 rounded-xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-accent-gold/10 text-accent-gold rounded-md">
              <Car size={18} />
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-slate-800">Detail Layanan Pengantaran Tamu</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">Jadwal penjemputan bandara (pickups) & keberangkatan (drop-offs) hari ini</p>
        </div>

        {!canEdit ? (
          <span className="self-start text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1 select-none font-mono">
            <span>🔒</span> Hanya Lihat
          </span>
        ) : (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all self-start cursor-pointer"
          >
            <Plus size={14} /> Tambah Layanan
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddTransport} className="mb-6 p-4 bg-sand-100 rounded-lg animate-fadeIn space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Tambah Jadwal Transportasi</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Tamu</label>
              <input
                type="text"
                required
                placeholder="Contoh: Mrs. Elizabeth Taylor"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-gold"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">No Kamar</label>
              <input
                type="text"
                placeholder="Contoh: Room 204 atau Villa 105"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-gold"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Layanan Layanan</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-gold"
              >
                <option value="Pickup">Pickup (Penjemputan)</option>
                <option value="Drop-off">Drop-off (Pengantaran)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Waktu Operasional</label>
              <input
                type="text"
                required
                placeholder="Contoh: 13:30 atau 17:00"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-gold"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Terminal</label>
              <select
                value={STANDARD_TERMINALS.includes(flightNumber) ? flightNumber : (flightNumber ? "Other" : "Batam Center")}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "Other") {
                    setFlightNumber("");
                  } else {
                    setFlightNumber(val);
                  }
                }}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-gold"
              >
                <option value="Batam Center">Batam Center</option>
                <option value="Harbourbay">Harbourbay</option>
                <option value="Sekupang">Sekupang</option>
                <option value="Nongsa Pura">Nongsa Pura</option>
                <option value="Bandara Hang Nadim">Bandara Hang Nadim</option>
                <option value="Other">Other (Isi Manual)</option>
              </select>
            </div>
            {!STANDARD_TERMINALS.includes(flightNumber) && (
              <div className="animate-fadeIn">
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Terminal Manual</label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan nama terminal/bandara..."
                  value={flightNumber}
                  onChange={e => setFlightNumber(e.target.value)}
                  className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-gold"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Armada / Jenis Mobil</label>
              <input
                type="text"
                placeholder="Contoh: Alphard Gold - Car 1"
                value={carDetails}
                onChange={e => setCarDetails(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-gold"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Jumlah Orang (Pax)</label>
              <input
                type="number"
                min="1"
                required
                placeholder="Contoh: 1"
                value={passengerCount}
                onChange={e => setPassengerCount(parseInt(e.target.value) || 1)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-gold"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-accent-gold text-white text-xs font-semibold rounded-md hover:bg-accent-gold-hover"
            >
              Simpan Jadwal
            </button>
          </div>
        </form>
      )}

      {/* List transports */}
      <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
        {transports.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Car size={32} className="mx-auto mb-2 opacity-55" />
            <p className="text-sm">Tidak ada jadwal transport hari ini.</p>
          </div>
        ) : (
          transports.map(tr => {
            const isEditing = editingId === tr.id;
            return (
              <div
                key={tr.id}
                className="border border-sand-200 bg-sand-100/30 rounded-xl p-4 hover:border-sand-300 transition-all"
              >
                {isEditing ? (
                  <div className="space-y-3.5 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-sand-200 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-accent-gold inline-flex items-center gap-1">
                        <Pencil size={11} /> Edit Layanan Transportasi
                      </h4>
                      <span className="text-[10.5px] font-mono text-gray-400">ID: {tr.id}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nama Tamu</label>
                        <input
                          type="text"
                          required
                          value={editGuestName}
                          onChange={e => setEditGuestName(e.target.value)}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nomor Kamar</label>
                        <input
                          type="text"
                          value={editRoomNumber}
                          onChange={e => setEditRoomNumber(e.target.value)}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Tipe Layanan</label>
                        <select
                          value={editType}
                          onChange={e => setEditType(e.target.value as any)}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        >
                          <option value="Pickup">Pickup (Penjemputan)</option>
                          <option value="Drop-off">Drop-off (Pengantaran)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Waktu Operasional</label>
                        <input
                          type="text"
                          required
                          value={editTime}
                          onChange={e => setEditTime(e.target.value)}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Terminal</label>
                        <select
                          value={STANDARD_TERMINALS.includes(editFlightNumber) ? editFlightNumber : (editFlightNumber ? "Other" : "Batam Center")}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === "Other") {
                              setEditFlightNumber("");
                            } else {
                              setEditFlightNumber(val);
                            }
                          }}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        >
                          <option value="Batam Center">Batam Center</option>
                          <option value="Harbourbay">Harbourbay</option>
                          <option value="Sekupang">Sekupang</option>
                          <option value="Nongsa Pura">Nongsa Pura</option>
                          <option value="Bandara Hang Nadim">Bandara Hang Nadim</option>
                          <option value="Other">Other (Isi Manual)</option>
                        </select>
                      </div>

                      {!STANDARD_TERMINALS.includes(editFlightNumber) && (
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nama Terminal Manual</label>
                          <input
                            type="text"
                            required
                            placeholder="Masukkan nama terminal/bandara..."
                            value={editFlightNumber}
                            onChange={e => setEditFlightNumber(e.target.value)}
                            className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Armada / Jenis Mobil</label>
                        <input
                          type="text"
                          value={editCarDetails}
                          onChange={e => setEditCarDetails(e.target.value)}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Jumlah Orang (Pax)</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={editPassengerCount}
                          onChange={e => setEditPassengerCount(parseInt(e.target.value) || 1)}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-sand-200">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-300 inline-flex items-center gap-1 transition-all"
                      >
                        <X size={12} /> Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(tr.id)}
                        className="px-3 py-1.5 bg-accent-gold text-white text-xs font-semibold rounded-md hover:bg-accent-gold/90 inline-flex items-center gap-1 transition-all"
                      >
                        <Check size={12} /> Simpan Perubahan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                        tr.type === 'Pickup'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                          : 'bg-blue-50 text-blue-800 border border-blue-100'
                      }`}>
                        <Navigation size={18} className={tr.type === 'Pickup' ? 'rotate-90' : 'rotate-270'} />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-extrabold text-sm text-slate-800 tracking-tight">{tr.guestName}</h4>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            tr.type === 'Pickup'
                              ? 'bg-emerald-100/70 text-emerald-900'
                              : 'bg-blue-100/70 text-blue-900'
                          }`}>
                            {tr.type === 'Pickup' ? 'PICKUP' : 'DROP-OFF'}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1 font-sans">
                          <span>Kamar: <strong className="text-slate-700 font-bold">{tr.roomNumber}</strong></span>
                          <span>•</span>
                          <span>Jumlah Orang: <strong className="text-slate-700 font-bold">{tr.passengerCount || 1} Pax</strong></span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">Terminal: {tr.flightNumber}</span>
                          <span>•</span>
                          <span className="text-slate-600 italic">Mobil: {tr.carDetails}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status & Options */}
                    <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                      <span className="text-xs font-mono text-gray-500 bg-white border border-sand-200 px-2 py-1 rounded inline-flex items-center gap-1">
                        <Clock size={12} /> {tr.time}
                      </span>

                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleStartEdit(tr)}
                            className="p-1.5 text-slate-400 hover:text-accent-gold rounded-lg hover:bg-sand-200/50 transition-all shrink-0 cursor-pointer"
                            title="Edit Layanan Transport"
                          >
                            <Pencil size={12.5} />
                          </button>

                          <button
                            onClick={() => handleDeleteClick(tr.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all shrink-0 cursor-pointer"
                            title="Hapus Transport"
                          >
                            <Trash2 size={12.5} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Custom Delete Confirmation Modal (Pop-up) */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-white border border-sand-200 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <span className="p-2 bg-rose-50 rounded-lg">
                <Trash2 size={20} />
              </span>
              <h4 className="font-display font-bold text-base text-slate-800">
                Konfirmasi Hapus Transport
              </h4>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Apakah Anda yakin ingin menghapus jadwal transport tamu <strong className="text-slate-900 font-bold">{transports.find(t => t.id === deleteConfirmId)?.guestName}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            
            <div className="flex items-center justify-end gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-1.5 bg-sand-200 hover:bg-sand-300 text-slate-700 text-xs font-semibold rounded-lg transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-all"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
