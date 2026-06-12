import React, { useState } from 'react';
import { VipGuest } from '../types';
import { Star, Clock, UserPlus, Trash2, HeartHandshake, Pencil, Check, X } from 'lucide-react';

interface VipCardProps {
  vipGuests: VipGuest[];
  onChange: (list: VipGuest[]) => void;
  canEdit?: boolean;
}

export function VipCard({ vipGuests, onChange, canEdit = true }: VipCardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState('Ocean Suite');
  const [roomNumber, setRoomNumber] = useState('');
  const [eta, setEta] = useState('');
  const [requests, setRequests] = useState('');
  const [vipLevel, setVipLevel] = useState('VIP 2');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoomType, setEditRoomType] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editEta, setEditEta] = useState('');
  const [editRequests, setEditRequests] = useState('');
  const [editVipLevel, setEditVipLevel] = useState('');

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleStartEdit = (vip: VipGuest) => {
    setEditingId(vip.id);
    setEditName(vip.name);
    setEditRoomType(vip.roomType);
    setEditRoomNumber(vip.roomNumber);
    setEditEta(vip.eta);
    setEditRequests(vip.requests);
    setEditVipLevel(vip.vipLevel);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim() || !editRoomType.trim()) return;
    const updated = vipGuests.map(v => {
      if (v.id === id) {
        return {
          ...v,
          name: editName,
          roomType: editRoomType,
          roomNumber: editRoomNumber.trim() || "TBD (Upon Arrival)",
          eta: editEta.trim() || "TBD",
          requests: editRequests.trim() || "Standard VIP amenities setup.",
          vipLevel: editVipLevel
        };
      }
      return v;
    });
    onChange(updated);
    setEditingId(null);
  };

  const handleAddVip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomType.trim()) return;

    const newVip: VipGuest = {
      id: `vip-${Date.now()}`,
      name,
      roomType,
      roomNumber: roomNumber.trim() || "TBD (Upon Arrival)",
      eta: eta.trim() || "TBD",
      requests: requests.trim() || "Standard VIP amenities setup.",
      vipLevel
    };

    onChange([...vipGuests, newVip]);
    setName('');
    setRoomNumber('');
    setEta('');
    setRequests('');
    setShowAddForm(false);
  };

  const handleDeleteVip = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleExecuteDelete = () => {
    if (deleteConfirmId) {
      onChange(vipGuests.filter(v => v.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const guestToDelete = vipGuests.find(v => v.id === deleteConfirmId);

  return (
    <div id="vip-card-container" className="bg-white border border-sand-200 rounded-xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-accent-gold/10 text-accent-gold rounded-md">
              <Star size={18} />
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-slate-800">VIP Guests & Special Requests</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">Laporan tamu VIP yang akan datang (Check-in) serta permintaan khusus</p>
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
            <UserPlus size={14} /> Tambah VIP Guest
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddVip} className="mb-6 p-4 bg-sand-100 rounded-lg animate-fadeIn space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Tambah Tamu VIP</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Tamu</label>
              <input
                type="text"
                required
                placeholder="Contoh: Mr. Robert Downey Jr."
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs focus:ring-1 focus:ring-accent-gold text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Tipe Kamar</label>
              <input
                type="text"
                required
                placeholder="Contoh: Presidential Villa"
                value={roomType}
                onChange={e => setRoomType(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs focus:ring-1 focus:ring-accent-gold text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nomor Kamar (Opsional)</label>
              <input
                type="text"
                placeholder="Contoh: Villa 102 atau TBD"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs focus:ring-1 focus:ring-accent-gold text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">VIP Level</label>
              <select
                value={vipLevel}
                onChange={e => setVipLevel(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs focus:ring-1 focus:ring-accent-gold text-slate-800 focus:outline-none"
              >
                <option value="VIP 1 (VVVIP)">VIP 1 (VVVIP / Head of State / Owner)</option>
                <option value="VIP 2 (Regular VIP)">VIP 2 (Regular VIP / Suite guests)</option>
                <option value="VIP 3 (Celebrity / Influencer)">VIP 3 (Celebrity / Honeymoon special)</option>
                <option value="CIP (Commercially Important)">CIP (Commercially Important Guest)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Estimasi Kedatangan (ETA)</label>
              <input
                type="text"
                placeholder="Contoh: 14:00"
                value={eta}
                onChange={e => setEta(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs focus:ring-1 focus:ring-accent-gold text-slate-800 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Permintaan Khusus (Special Requests)</label>
              <textarea
                rows={2}
                placeholder="Gluten-free diet, flower setup, fruit basket, butler service, etc."
                value={requests}
                onChange={e => setRequests(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg p-2 text-base sm:text-xs focus:ring-1 focus:ring-accent-gold text-slate-800 focus:outline-none"
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
              Simpan Guest
            </button>
          </div>
        </form>
      )}

      {/* VIP list grid */}
      <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
        {vipGuests.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Star size={32} className="mx-auto mb-2 opacity-55" />
            <p className="text-sm">Tidak ada list kedatangan tamu VIP hari ini.</p>
          </div>
        ) : (
          vipGuests.map(vip => {
            const isEditing = editingId === vip.id;
            return (
              <div
                key={vip.id}
                className="border border-sand-200/80 bg-sand-100/40 rounded-xl p-4 hover:border-sand-300 transition-all"
              >
                {isEditing ? (
                  <div className="space-y-3.5 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-sand-200 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-accent-gold inline-flex items-center gap-1">
                        <Pencil size={11} /> Edit Detail VIP Guest
                      </h4>
                      <span className="text-[10.5px] font-mono text-gray-400">ID: {vip.id}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nama Tamu</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Tipe Kamar</label>
                        <input
                          type="text"
                          required
                          value={editRoomType}
                          onChange={e => setEditRoomType(e.target.value)}
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
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">VIP Level</label>
                        <select
                          value={editVipLevel}
                          onChange={e => setEditVipLevel(e.target.value)}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        >
                          <option value="VIP 1 (VVVIP)">VIP 1 (VVVIP / Head of State / Owner)</option>
                          <option value="VIP 2 (Regular VIP)">VIP 2 (Regular VIP / Suite guests)</option>
                          <option value="VIP 3 (Celebrity / Influencer)">VIP 3 (Celebrity / Honeymoon special)</option>
                          <option value="CIP (Commercially Important)">CIP (Commercially Important Guest)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Estimasi Kedatangan (ETA)</label>
                        <input
                          type="text"
                          value={editEta}
                          onChange={e => setEditEta(e.target.value)}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        />
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Permintaan Khusus (Special Requests)</label>
                        <textarea
                          rows={2.5}
                          value={editRequests}
                          onChange={e => setEditRequests(e.target.value)}
                          className="w-full bg-white border border-sand-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-accent-gold"
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
                        onClick={() => handleSaveEdit(vip.id)}
                        className="px-3 py-1.5 bg-accent-gold text-white text-xs font-semibold rounded-md hover:bg-accent-gold/90 inline-flex items-center gap-1 transition-all"
                      >
                        <Check size={12} /> Simpan Perubahan
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-extrabold text-sm text-slate-800 tracking-tight">{vip.name}</h4>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            vip.vipLevel.includes('VIP 1') || vip.vipLevel.includes('VVVIP')
                              ? 'bg-amber-600 text-white'
                              : 'bg-accent-gold/15 text-accent-gold border border-accent-gold/20'
                          }`}>
                            {vip.vipLevel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium font-sans">
                          {vip.roomType} <span className="text-gray-400">•</span> No Kamar: <span className="text-slate-800 font-bold">{vip.roomNumber}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <span className="text-[11px] font-mono text-gray-500 bg-white border border-sand-200 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1.5">
                          <Clock size={11} /> ETA: {vip.eta}
                        </span>
                        
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleStartEdit(vip)}
                              className="p-1.5 text-slate-400 hover:text-accent-gold rounded-lg hover:bg-sand-200/50 transition-all shrink-0 cursor-pointer"
                              title="Edit Tamu VIP"
                            >
                              <Pencil size={12.5} />
                            </button>

                            <button
                              onClick={() => handleDeleteVip(vip.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all shrink-0 cursor-pointer"
                              title="Hapus VIP"
                            >
                              <Trash2 size={12.5} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Special Request Section */}
                    <div className="mt-3 p-3 bg-white border border-sand-200/50 rounded-lg">
                      <div className="flex gap-2 items-start text-xs text-slate-800">
                        <HeartHandshake size={14} className="shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <span className="font-bold text-[10px] uppercase text-amber-800 tracking-wide block mb-1">Permintaan Khusus & Amenities:</span>
                          <p className="text-xs italic leading-relaxed text-slate-700">{vip.requests}</p>
                        </div>
                      </div>
                    </div>
                  </>
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
                Konfirmasi Hapus VIP
              </h4>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Apakah Anda yakin ingin menghapus tamu VIP <strong className="text-slate-900 font-bold">{guestToDelete?.name}</strong> dari list briefing hari ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            
            <div className="flex items-center justify-end gap-2.5">
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
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-all animate-pulse-slow"
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
