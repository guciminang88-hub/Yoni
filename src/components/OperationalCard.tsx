import React, { useState } from 'react';
import { OtherOperational } from '../types';
import { CheckSquare, Square, Plus, Trash2, Tag, AlertTriangle, BookOpen, Pencil, Check, X } from 'lucide-react';

interface OperationalCardProps {
  operationalList: OtherOperational[];
  onChange: (list: OtherOperational[]) => void;
  canEdit?: boolean;
}

export function OperationalCard({ operationalList, onChange, canEdit = true }: OperationalCardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: OtherOperational = {
      id: `op-${Date.now()}`,
      title: title.trim(),
      notes: notes.trim() || 'No special remarks recorded.',
      category: 'GEN',
      priority: 'Medium',
      status: 'Pending'
    };

    onChange([...operationalList, newTask]);
    setTitle('');
    setNotes('');
    setShowAddForm(false);
  };

  const handleStartEdit = (task: OtherOperational) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditNotes(task.notes);
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    const updated = operationalList.map(task => {
      if (task.id === id) {
        return {
          ...task,
          title: editTitle.trim(),
          notes: editNotes.trim() || 'No special remarks recorded.',
          category: task.category || 'GEN',
          priority: task.priority || 'Medium'
        };
      }
      return task;
    });
    onChange(updated);
    setEditingId(null);
  };

  const handleToggleStatus = (id: string) => {
    if (!canEdit) return;
    const updated = operationalList.map(task => {
      if (task.id === id) {
        return {
          ...task,
          status: (task.status === 'Completed' ? 'Pending' : 'Completed') as OtherOperational['status']
        };
      }
      return task;
    });
    onChange(updated);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleExecuteDelete = () => {
    if (deleteConfirmId) {
      onChange(operationalList.filter(task => task.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const getPriorityStyle = (prio: OtherOperational['priority']) => {
    switch (prio) {
      case 'High':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div id="operational-card-container" className="bg-white border border-sand-200 rounded-xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-accent-gold/10 text-accent-gold rounded-md">
              <BookOpen size={18} />
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-slate-800">Operational Checklist & Tasks</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">Checklist operasional pendukung hari ini untuk kelancaran jalannya resort</p>
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
            <Plus size={14} /> Tambah Catatan
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddTask} className="mb-6 p-4 bg-sand-100 rounded-lg animate-fadeIn space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Tambah Catatan Operasional</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Judul Agenda / Tugas</label>
              <input
                type="text"
                required
                placeholder="Contoh: Tes Backup Genset Mingguan"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-2 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-accent-gold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Detail Deskripsi Tugas</label>
              <textarea
                rows={2}
                placeholder="Deskripsi pengerjaan, instruksi HOD, target durasi atau catatan tambahan..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-white border border-sand-300 rounded-lg p-2 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-accent-gold text-slate-800"
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
              Simpan Tugas
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
        {operationalList.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <CheckSquare size={32} className="mx-auto mb-2 opacity-55" />
            <p className="text-sm">Tidak ada checklist operasional tambahan hari ini.</p>
          </div>
        ) : (
          operationalList.map(task => {
            const isEditing = editingId === task.id;
            return (
              <div
                key={task.id}
                className={`border rounded-xl p-3.5 hover:shadow-xs transition-all ${
                  task.status === 'Completed'
                    ? 'bg-emerald-50/20 border-emerald-100'
                    : 'bg-sand-100/30 border-sand-200'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-sand-200 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-accent-gold inline-flex items-center gap-1">
                        <Pencil size={11} /> Edit Catatan Operasional
                      </h4>
                      <span className="text-[10.5px] font-mono text-gray-400">ID: {task.id}</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Judul Agenda / Tugas</label>
                        <input
                          type="text"
                          required
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full bg-white border border-sand-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Detail Deskripsi Tugas</label>
                        <textarea
                          rows={2.5}
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
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
                        onClick={() => handleSaveEdit(task.id)}
                        className="px-3 py-1.5 bg-accent-gold text-white text-xs font-semibold rounded-md hover:bg-accent-gold/90 inline-flex items-center gap-1 transition-all"
                      >
                        <Check size={12} /> Simpan Perubahan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3.5">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleStatus(task.id)}
                      disabled={!canEdit}
                      className={`p-0.5 mt-0.5 rounded transition-all focus:outline-none shrink-0 ${
                        task.status === 'Completed' 
                          ? 'text-emerald-700' 
                          : 'text-gray-400 ' + (canEdit ? 'hover:text-accent-gold cursor-pointer' : 'cursor-default')
                      }`}
                    >
                      {task.status === 'Completed' ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h4 className={`font-semibold text-xs leading-tight ${
                          task.status === 'Completed' ? 'line-through text-gray-400' : 'text-slate-800'
                        }`}>
                          {task.title}
                        </h4>
                        
                        {/* Category badge removed */}
                      </div>

                      <p className={`text-[11px] mt-1 line-clamp-3 leading-relaxed font-sans ${
                        task.status === 'Completed' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {task.notes}
                      </p>
                    </div>

                    {/* Actions */}
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(task)}
                          className="p-1.5 text-slate-400 hover:text-accent-gold rounded-lg hover:bg-sand-200/50 transition-all shrink-0 cursor-pointer"
                          title="Edit Tugas"
                        >
                          <Pencil size={12.5} />
                        </button>

                        <button
                          onClick={() => handleDeleteClick(task.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all shrink-0 cursor-pointer"
                          title="Hapus Tugas"
                        >
                          <Trash2 size={12.5} />
                        </button>
                      </div>
                    )}
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
                Konfirmasi Hapus Item Operasional
              </h4>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Apakah Anda yakin ingin menghapus agenda/tugas <strong className="text-slate-900 font-bold">{operationalList.find(o => o.id === deleteConfirmId)?.title}</strong> dari checklist briefing hari ini? Tindakan ini tidak dapat dibatalkan.
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
