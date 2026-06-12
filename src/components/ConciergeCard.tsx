import React, { useState } from 'react';
import { ConciergeLog } from '../types';
import { Car, Clock, Plus, Trash2, Check, X, Pencil, CarFront, FileText, Navigation, CheckCircle } from 'lucide-react';

interface ConciergeCardProps {
  logs: ConciergeLog[];
  onChange: (list: ConciergeLog[]) => void;
  canEdit?: boolean;
}

export function ConciergeCard({ logs, onChange, canEdit = true }: ConciergeCardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [departemen, setDepartemen] = useState('');
  const [tujuan, setTujuan] = useState('');
  const [namaDriver, setNamaDriver] = useState('');
  const [noKendaraan, setNoKendaraan] = useState('');
  const [kmOut, setKmOut] = useState<number | ''>('');
  const [kmIn, setKmIn] = useState<number | ''>('');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTanggal, setEditTanggal] = useState('');
  const [editDepartemen, setEditDepartemen] = useState('');
  const [editTujuan, setEditTujuan] = useState('');
  const [editNamaDriver, setEditNamaDriver] = useState('');
  const [editNoKendaraan, setEditNoKendaraan] = useState('');
  const [editKmOut, setEditKmOut] = useState<number | ''>('');
  const [editKmIn, setEditKmIn] = useState<number | ''>('');

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!departemen.trim() || !tujuan.trim() || kmOut === '' || kmIn === '') return;

    const outVal = Number(kmOut);
    const inVal = Number(kmIn);
    
    // Auto increment No. based on previous highest
    const maxNo = logs.length > 0 ? Math.max(...logs.map(l => l.no)) : 0;

    const newLog: ConciergeLog = {
      id: `concierge-${Date.now()}`,
      no: maxNo + 1,
      tanggal: tanggal || new Date().toISOString().split('T')[0],
      departemen: departemen.trim(),
      tujuan: tujuan.trim(),
      namaDriver: namaDriver.trim(),
      noKendaraan: noKendaraan.trim(),
      kmOut: outVal,
      kmIn: inVal,
      totalKm: inVal - outVal
    };

    onChange([...logs, newLog]);
    setTanggal(new Date().toISOString().split('T')[0]);
    setDepartemen('');
    setTujuan('');
    setNamaDriver('');
    setNoKendaraan('');
    setKmOut('');
    setKmIn('');
    setShowAddForm(false);
  };

  const handleRemoveLog = (id: string) => {
    onChange(logs.filter(t => t.id !== id));
  };

  const startEdit = (log: ConciergeLog) => {
    setEditingId(log.id);
    setEditTanggal(log.tanggal);
    setEditDepartemen(log.departemen);
    setEditTujuan(log.tujuan);
    setEditNamaDriver(log.namaDriver);
    setEditNoKendaraan(log.noKendaraan || '');
    setEditKmOut(log.kmOut);
    setEditKmIn(log.kmIn);
  };

  const saveEdit = () => {
    if (!editingId) return;
    onChange(logs.map(log => {
      if (log.id === editingId) {
        const outVal = Number(editKmOut);
        const inVal = Number(editKmIn);
        return {
          ...log,
          tanggal: editTanggal,
          departemen: editDepartemen.trim(),
          tujuan: editTujuan.trim(),
          namaDriver: editNamaDriver.trim(),
          noKendaraan: editNoKendaraan.trim(),
          kmOut: outVal,
          kmIn: inVal,
          totalKm: inVal - outVal
        };
      }
      return log;
    }));
    setEditingId(null);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xs border border-sand-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-sky-100 text-sky-700 rounded-xl shrink-0">
            <CarFront size={22} className="sm:w-[24px] sm:h-[24px]" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-slate-800 tracking-tight leading-tight">Penggunaan Mobil Concierge</h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5 max-w-sm leading-relaxed">Pencatatan data penggunaan mobil operasional, tujuan, dan akumulasi KM</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors shrink-0 outline-none focus:ring-2 focus:ring-sky-500/50"
            title="Tambah Data Penggunaan Mobil"
          >
            {showAddForm ? <X size={20} /> : <Plus size={20} />}
          </button>
        )}
      </div>

      {showAddForm && canEdit && (
        <form onSubmit={handleAddLog} className="mb-6 bg-slate-50 p-4 rounded-2xl border border-sand-200">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Plus size={14} /> Form Penggunaan Mobil Baru
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Tanggal</label>
              <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="w-full bg-white border border-sand-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" required />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Departemen</label>
              <input type="text" placeholder="Front Office, Sales..." value={departemen} onChange={e => setDepartemen(e.target.value)} className="w-full bg-white border border-sand-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" required />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Tujuan</label>
              <input type="text" placeholder="Bandara, Meeting, etc" value={tujuan} onChange={e => setTujuan(e.target.value)} className="w-full bg-white border border-sand-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" required />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">Nama Driver</label>
              <input type="text" placeholder="Budi, Agus..." value={namaDriver} onChange={e => setNamaDriver(e.target.value)} className="w-full bg-white border border-sand-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" required />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">No Kendaraan</label>
              <input type="text" placeholder="B 1234 CD" value={noKendaraan} onChange={e => setNoKendaraan(e.target.value)} className="w-full bg-white border border-sand-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" required />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">KM-Out</label>
              <input type="number" placeholder="10500" value={kmOut} onChange={e => setKmOut(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-white border border-sand-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" required />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 ml-1">KM-In</label>
              <input type="number" placeholder="10550" value={kmIn} onChange={e => setKmIn(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-white border border-sand-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" required />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
              Tambahkan <CheckCircle size={16} />
            </button>
          </div>
        </form>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-8 text-slate-500/70 border-2 border-dashed border-sand-200 rounded-2xl flex flex-col items-center">
          <CarFront size={48} className="mb-3 text-slate-300" strokeWidth={1} />
          <p className="text-sm font-medium">Belum ada catatan penggunaan mobil.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sand-100/50 border-b border-sand-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-3 py-2.5 w-12 text-center">No</th>
                <th className="px-3 py-2.5">Tanggal</th>
                <th className="px-3 py-2.5">Departemen</th>
                <th className="px-3 py-2.5">Tujuan</th>
                <th className="px-3 py-2.5">Nama Driver</th>
                <th className="px-3 py-2.5">No Kendaraan</th>
                <th className="px-3 py-2.5 text-right w-24">KM Out</th>
                <th className="px-3 py-2.5 text-right w-24">KM In</th>
                <th className="px-3 py-2.5 text-right w-28">Total KM</th>
                {canEdit && <th className="px-3 py-2.5 w-20 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200 text-xs text-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-3 py-2 text-center font-mono text-slate-400">{log.no}</td>
                  {editingId === log.id ? (
                    <>
                      <td className="px-2 py-1.5"><input type="date" value={editTanggal} onChange={e => setEditTanggal(e.target.value)} className="w-full text-xs px-2 py-1 rounded bg-white border border-slate-300" /></td>
                      <td className="px-2 py-1.5"><input type="text" value={editDepartemen} onChange={e => setEditDepartemen(e.target.value)} className="w-full text-xs px-2 py-1 rounded bg-white border border-slate-300" /></td>
                      <td className="px-2 py-1.5"><input type="text" value={editTujuan} onChange={e => setEditTujuan(e.target.value)} className="w-full text-xs px-2 py-1 rounded bg-white border border-slate-300" /></td>
                      <td className="px-2 py-1.5"><input type="text" value={editNamaDriver} onChange={e => setEditNamaDriver(e.target.value)} className="w-full text-xs px-2 py-1 rounded bg-white border border-slate-300" /></td>
                      <td className="px-2 py-1.5"><input type="text" value={editNoKendaraan} onChange={e => setEditNoKendaraan(e.target.value)} className="w-full text-xs px-2 py-1 rounded bg-white border border-slate-300" /></td>
                      <td className="px-2 py-1.5"><input type="number" value={editKmOut} onChange={e => setEditKmOut(e.target.value === '' ? '' : Number(e.target.value))} className="w-full text-xs px-2 py-1 rounded bg-white border border-slate-300 text-right" /></td>
                      <td className="px-2 py-1.5"><input type="number" value={editKmIn} onChange={e => setEditKmIn(e.target.value === '' ? '' : Number(e.target.value))} className="w-full text-xs px-2 py-1 rounded bg-white border border-slate-300 text-right" /></td>
                      <td className="px-3 py-2 text-right font-mono font-bold bg-slate-50">{Number(editKmIn) - Number(editKmOut)}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={saveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"><X size={14} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">{log.tanggal}</td>
                      <td className="px-3 py-2.5">{log.departemen}</td>
                      <td className="px-3 py-2.5">{log.tujuan}</td>
                      <td className="px-3 py-2.5 font-medium">{log.namaDriver}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-500">{log.noKendaraan}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-500">{log.kmOut}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-500">{log.kmIn}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-sky-700">{log.totalKm} KM</td>
                      {canEdit && (
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex justify-center items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(log)} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors" title="Edit"><Pencil size={14} /></button>
                            <button onClick={() => handleRemoveLog(log.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors" title="Hapus"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
