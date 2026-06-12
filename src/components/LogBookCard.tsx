import React, { useState } from 'react';
import { LogBookEntry } from '../types';
import { Pencil, Trash2, Check, X, FileDown, Plus, BookOpen } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LogBookCardProps {
  logBooks?: LogBookEntry[];
  onChange: (logBooks: LogBookEntry[]) => void;
  canEdit?: boolean;
  isAdmin?: boolean;
}

export function LogBookCard({ logBooks = [], onChange, canEdit = true, isAdmin = false }: LogBookCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNo, setEditNo] = useState<number>(0);
  const [editTanggal, setEditTanggal] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editDetailInfo, setEditDetailInfo] = useState('');
  const [editStatusInfo, setEditStatusInfo] = useState<'Open' | 'In Progress' | 'Closed'>('Open');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const getTodayStr = () => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - tzOffset).toISOString().split('T')[0];
  };

  const todayStr = getTodayStr();

  const isEditable = (tanggal: string) => {
    if (isAdmin) return true;
    return tanggal >= todayStr;
  };

  const handleStartEdit = (entry: LogBookEntry) => {
    setEditingId(entry.id);
    setEditNo(entry.no);
    setEditTanggal(entry.tanggal);
    setEditNama(entry.nama);
    setEditDetailInfo(entry.detailInfo);
    setEditStatusInfo(entry.statusInfo);
  };

  const handleSaveEdit = (id: string) => {
    if (!editNama.trim() && !editDetailInfo.trim()) return;
    const updated = logBooks.map(entry => {
      if (entry.id === id) {
        return {
          ...entry,
          no: editNo,
          tanggal: editTanggal,
          nama: editNama,
          detailInfo: editDetailInfo,
          statusInfo: editStatusInfo
        };
      }
      return entry;
    });
    onChange(updated);
    setEditingId(null);
  };

  const handleCancelEdit = (entry: LogBookEntry) => {
    setEditingId(null);
    // If it was just added and is completely empty, remove it to avoid persisting empty rows
    if (!entry.nama.trim() && !entry.detailInfo.trim()) {
      onChange(logBooks.filter(e => e.id !== entry.id));
    }
  };

  const handleExecuteDelete = () => {
    if (deleteConfirmId) {
      onChange(logBooks.filter(e => e.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const handleAddLogBook = () => {
    const maxNo = logBooks.length > 0 ? Math.max(...logBooks.map(l => l.no)) : 0;
    const newEntry: LogBookEntry = {
      id: crypto.randomUUID(),
      no: maxNo + 1,
      tanggal: todayStr,
      nama: '',
      detailInfo: '',
      statusInfo: 'Open',
      createdAt: new Date().toISOString()
    };
    onChange([...logBooks, newEntry]);
    handleStartEdit(newEntry);
  };

  const generatePdfReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("Laporan Hari Ini - Log Book", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${todayStr}`, 14, 28);

    const tableData = logBooks.map(entry => [
      entry.no.toString(),
      entry.tanggal,
      entry.nama,
      entry.detailInfo,
      entry.statusInfo
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['No', 'Tanggal', 'Nama', 'Detail Info', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [3, 105, 161], // sky-700
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 25 }
      }
    });

    doc.save(`LogBook_Report_${todayStr}.pdf`);
  };

  return (
    <div className="bg-white border border-sand-200 rounded-3xl p-6 md:p-8 shadow-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-800 tracking-tight">Log Book</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Catatan harian dan informasi logbook operasional</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={generatePdfReport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <FileDown size={16} />
            <span>Cetak PDF</span>
          </button>
          {canEdit && (
            <button
              onClick={handleAddLogBook}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus size={16} />
              <span>Tambah Log Baru</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-2xl border border-sand-200 shadow-sm mt-6">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 text-[10px] md:text-xs uppercase tracking-wider text-slate-500 border-b border-sand-200">
              <th className="px-4 py-3 font-black">No</th>
              <th className="px-4 py-3 font-black">Tanggal</th>
              <th className="px-4 py-3 font-black">Nama</th>
              <th className="px-4 py-3 font-black">Detail Info</th>
              <th className="px-4 py-3 font-black">Status Info</th>
              <th className="px-4 py-3 font-black text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-xs md:text-sm divide-y divide-sand-100">
            {logBooks.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 font-medium bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <BookOpen size={32} className="text-slate-300" />
                    <p>Belum ada catatan log book</p>
                  </div>
                </td>
              </tr>
            ) : (
              logBooks.map((entry) => {
                const canEditThis = canEdit && isEditable(entry.tanggal);
                if (editingId === entry.id) {
                  return (
                    <tr key={entry.id} className="bg-sky-50/30">
                      <td className="p-3">
                        <input
                          type="number"
                          value={editNo}
                          onChange={(e) => setEditNo(parseInt(e.target.value) || 0)}
                          className="w-16 bg-white border border-sky-200 rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="date"
                          value={editTanggal}
                          onChange={(e) => setEditTanggal(e.target.value)}
                          className="w-full bg-white border border-sky-200 rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editNama}
                          onChange={(e) => setEditNama(e.target.value)}
                          placeholder="Nama..."
                          className="w-full bg-white border border-sky-200 rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editDetailInfo}
                          onChange={(e) => setEditDetailInfo(e.target.value)}
                          placeholder="Detail info..."
                          className="w-full bg-white border border-sky-200 rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={editStatusInfo}
                          onChange={(e) => setEditStatusInfo(e.target.value as 'Open' | 'In Progress' | 'Closed')}
                          className="w-full bg-white border border-sky-200 rounded px-2 py-1.5 focus:outline-none focus:border-sky-500"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSaveEdit(entry.id)}
                            className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleCancelEdit(entry)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={entry.id} className="hover:bg-slate-50 transition group">
                    <td className="px-4 py-3 font-black text-slate-700">{entry.no}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{entry.tanggal}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{entry.nama}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.detailInfo}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        entry.statusInfo === 'Open' ? 'bg-amber-100 text-amber-700' :
                        entry.statusInfo === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {entry.statusInfo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canEditThis && (
                        <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(entry)}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(entry.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-zoomIn transform scale-95 border border-sand-200">
            <div className="bg-rose-50 border-b border-rose-100 px-5 py-4 flex items-center justify-between">
              <h3 className="font-display font-black text-rose-800 flex items-center gap-2">
                <Trash2 size={18} />
                Hapus Log Book
              </h3>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="text-rose-400 hover:text-rose-700 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm font-medium mb-6">
                Apakah Anda yakin ingin menghapus data log book ini secara permanen?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleExecuteDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm"
                >
                  Hapus Permanen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
