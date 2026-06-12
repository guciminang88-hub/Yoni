import React, { useState } from 'react';
import { IncomingGroup } from '../types';
import { Users, Clock, Plus, Trash2, Home, Pencil, Check, X } from 'lucide-react';

interface GroupsCardProps {
  groups: IncomingGroup[];
  onChange: (list: IncomingGroup[]) => void;
  canEdit?: boolean;
}

export function GroupsCard({ groups, onChange, canEdit = true }: GroupsCardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [roomsCount, setRoomsCount] = useState(1);
  const [guestCount, setGuestCount] = useState(2);
  const [eta, setEta] = useState('');
  const [remarks, setRemarks] = useState('');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editRoomsCount, setEditRoomsCount] = useState(1);
  const [editGuestCount, setEditGuestCount] = useState(2);
  const [editEta, setEditEta] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    const newGroup: IncomingGroup = {
      id: `grp-${Date.now()}`,
      groupName: groupName.trim(),
      roomsCount: Number(roomsCount),
      guestCount: Number(guestCount),
      eta: eta.trim() || "TBD",
      remarks: remarks.trim() || "Standard group check-in."
    };

    onChange([...groups, newGroup]);
    setGroupName('');
    setRoomsCount(1);
    setGuestCount(2);
    setEta('');
    setRemarks('');
    setShowAddForm(false);
  };

  const handleStartEdit = (g: IncomingGroup) => {
    setEditingId(g.id);
    setEditGroupName(g.groupName);
    setEditRoomsCount(g.roomsCount);
    setEditGuestCount(g.guestCount);
    setEditEta(g.eta);
    setEditRemarks(g.remarks);
  };

  const handleSaveEdit = (id: string) => {
    if (!editGroupName.trim()) return;
    const updated = groups.map(g => {
      if (g.id === id) {
        return {
          ...g,
          groupName: editGroupName.trim(),
          roomsCount: Number(editRoomsCount),
          guestCount: Number(editGuestCount),
          eta: editEta.trim() || "TBD",
          remarks: editRemarks.trim() || "Standard group check-in."
        };
      }
      return g;
    });
    onChange(updated);
    setEditingId(null);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleExecuteDelete = () => {
    if (deleteConfirmId) {
      onChange(groups.filter(g => g.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  return (
    <div id="groups-card-container" className="bg-white border border-sand-200 rounded-xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-accent-gold/10 text-accent-gold rounded-md">
              <Users size={18} />
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-slate-800">Laporan Grup Hari Ini</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">Daftar rombongan / grup yang akan check-in harian</p>
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
            <Plus size={14} /> Tambah Grup
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddGroup} className="mb-6 p-4 bg-sand-100 rounded-lg animate-fadeIn space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Tambah Informasi Grup</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Grup / Instansi</label>
              <input
                type="text"
                required
                placeholder="Contoh: Astra Honda Motor Board"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-gold"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Jumlah Kamar (Rooms)</label>
              <input
                type="number"
                min="1"
                required
                value={roomsCount}
                onChange={e => setRoomsCount(Number(e.target.value))}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-gold"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Schedule ETA</label>
              <input
                type="text"
                placeholder="Contoh: 11:30 atau 14:00"
                value={eta}
                onChange={e => setEta(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-gold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Keterangan / Remarks Instansi</label>
              <textarea
                rows={2}
                placeholder="Express check-in ballroom, welcome drapes, baggage tag details, etc."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
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
              Simpan Grup
            </button>
          </div>
        </form>
      )}

      {/* Group listings */}
      <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
        {groups.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Users size={32} className="mx-auto mb-2 opacity-55" />
            <p className="text-sm">Tidak ada kedatangan grup hari ini.</p>
          </div>
        ) : (
          groups.map(g => {
            const isEditing = editingId === g.id;
            return (
              <div
                key={g.id}
                className="border border-sand-200 bg-sand-100/30 rounded-xl p-4 hover:border-sand-300 transition-all"
              >
                {isEditing ? (
                  <div className="space-y-3.5 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-sand-200 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-accent-gold inline-flex items-center gap-1">
                        <Pencil size={11} /> Edit Informasi Rombongan / Grup
                      </h4>
                      <span className="text-[10.5px] font-mono text-gray-400">ID: {g.id}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nama Grup / Instansi</label>
                        <input
                          type="text"
                          required
                          value={editGroupName}
                          onChange={e => setEditGroupName(e.target.value)}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Jumlah Kamar</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={editRoomsCount}
                          onChange={e => setEditRoomsCount(Number(e.target.value))}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Schedule ETA</label>
                        <input
                          type="text"
                          value={editEta}
                          onChange={e => setEditEta(e.target.value)}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Keterangan / Remarks Instansi</label>
                        <textarea
                          rows={2.5}
                          value={editRemarks}
                          onChange={e => setEditRemarks(e.target.value)}
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
                        onClick={() => handleSaveEdit(g.id)}
                        className="px-3 py-1.5 bg-accent-gold text-white text-xs font-semibold rounded-md hover:bg-accent-gold/90 inline-flex items-center gap-1 transition-all"
                      >
                        <Check size={12} /> Simpan Perubahan
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-sand-200/50">
                      <div>
                        <h4 className="font-display font-extrabold text-sm text-slate-800 tracking-tight">{g.groupName}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700 font-sans">
                            <Home size={12} className="text-gray-400" /> {g.roomsCount} Kamar
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <span className="text-[11px] font-mono text-gray-500 bg-white border border-sand-200 px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1.5">
                          <Clock size={11} /> ETA: {g.eta}
                        </span>

                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleStartEdit(g)}
                              className="p-1.5 text-slate-400 hover:text-accent-gold rounded-lg hover:bg-sand-200/50 transition-all shrink-0 cursor-pointer"
                              title="Edit Grup"
                            >
                              <Pencil size={12.5} />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteClick(g.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all shrink-0 cursor-pointer"
                              title="Hapus Grup"
                            >
                              <Trash2 size={12.5} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Group remarks */}
                    <div className="mt-3 text-xs text-slate-700 bg-white border border-sand-100 p-2.5 rounded-lg flex gap-1.5">
                      <span className="p-0.5 bg-slate-100 rounded text-[9px] font-mono font-bold uppercase tracking-wider text-slate-700 self-start">REMARKS</span>
                      <p className="leading-relaxed font-sans">{g.remarks}</p>
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
                Konfirmasi Hapus Grup
              </h4>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Apakah Anda yakin ingin menghapus rombongan/grup <strong className="text-slate-900 font-bold">{groups.find(g => g.id === deleteConfirmId)?.groupName}</strong>? Tindakan ini tidak dapat dibatalkan.
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
