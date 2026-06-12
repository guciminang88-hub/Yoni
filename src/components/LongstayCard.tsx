import React, { useState, useRef } from 'react';
import { LongstayGuest } from '../types';
import { Calendar, Trash2, Pencil, Check, X, Building, Hash, FileUp, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

interface LongstayCardProps {
  longstayGuests: LongstayGuest[];
  onChange: (list: LongstayGuest[]) => void;
  canEdit?: boolean;
}

export function LongstayCard({ longstayGuests = [], onChange, canEdit = true }: LongstayCardProps) {
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGuestName, setEditGuestName] = useState('');
  const [editArrivalDate, setEditArrivalDate] = useState('');
  const [editDepartureDate, setEditDepartureDate] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleStartEdit = (guest: LongstayGuest) => {
    setEditingId(guest.id);
    setEditGuestName(guest.guestName);
    setEditArrivalDate(guest.arrivalDate);
    setEditDepartureDate(guest.departureDate);
    setEditCompany(guest.company);
    setEditRoomNumber(guest.roomNumber);
  };

  const handleSaveEdit = (id: string) => {
    if (!editGuestName.trim()) return;
    const updated = longstayGuests.map(g => {
      if (g.id === id) {
        return {
          ...g,
          guestName: editGuestName,
          arrivalDate: editArrivalDate,
          departureDate: editDepartureDate,
          company: editCompany.trim() || '-',
          roomNumber: editRoomNumber.trim() || 'TBD'
        };
      }
      return g;
    });
    onChange(updated);
    setEditingId(null);
  };

  const handleDeleteGuest = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleExecuteDelete = () => {
    if (deleteConfirmId) {
      onChange(longstayGuests.filter(g => g.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const guestToDelete = longstayGuests.find(g => g.id === deleteConfirmId);

  // Helper to check if departure/check-out date is due/has passed (<= today)
  const isDue = (dateStr?: string) => {
    if (!dateStr || dateStr === '-' || dateStr.trim() === '') return false;
    try {
      const today = new Date();
      // Format today to Jakarta/local safe date: YYYY-MM-DD
      const offset = today.getTimezoneOffset();
      const localToday = new Date(today.getTime() - (offset * 60 * 1000));
      const todayStr = localToday.toISOString().split('T')[0]; // "YYYY-MM-DD"
      
      // If date is standard YYYY-MM-DD format, compare alphabetically
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr <= todayStr;
      }
      
      // Fallback parser
      const depDate = new Date(dateStr);
      if (isNaN(depDate.getTime())) return false;
      
      const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dDate = new Date(depDate.getFullYear(), depDate.getMonth(), depDate.getDate());
      return dDate <= tDate;
    } catch (e) {
      return false;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canEdit) return;

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      processExcelFile(file);
    } else {
      setErrorMsg("File tidak valid. Harap unggah file dengan format .xlsx atau .xls");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const cleanStr = (val: any): string => {
    if (val === undefined || val === null) return '';
    return String(val).trim();
  };

  const formatExcelDate = (val: any): string => {
    if (val === undefined || val === null) return '-';
    const str = String(val).trim();
    if (!str) return '-';
    const num = Number(str);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      try {
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (e) {
        return str;
      }
    }
    return str;
  };

  const processExcelFile = (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result;
        if (!arrayBuffer) throw new Error("Gagal membaca isi file.");

        const workbook = XLSX.read(new Uint8Array(arrayBuffer as ArrayBuffer), { type: 'array' });
        if (workbook.SheetNames.length === 0) {
          throw new Error("File Excel tidak memiliki lembar kerja (worksheet) yang valid.");
        }

        let sheet = workbook.Sheets[workbook.SheetNames[0]];
        const matchSheet = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('tamu') || 
          name.toLowerCase().includes('longstay') || 
          name.toLowerCase().includes('long')
        );
        if (matchSheet) {
          sheet = workbook.Sheets[matchSheet];
        }

        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        let headerRowIndex = 0;
        let foundHeader = false;

        for (let i = 0; i < Math.min(15, rawRows.length); i++) {
          const cells = rawRows[i].map(c => cleanStr(c).toLowerCase());
          if (
            cells.some(c => 
              c.includes('tamu') || c.includes('guest') || c.includes('nama')
            )
          ) {
            headerRowIndex = i;
            foundHeader = true;
            break;
          }
        }

        const rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: '' });
        if (rows.length === 0) {
          throw new Error("Tidak menemukan baris data di dalam file Excel.");
        }

        const parsedLongstays: LongstayGuest[] = [];

        rows.forEach((row: any, idx: number) => {
          const keys = Object.keys(row);
          const mappedRow: any = {};
          keys.forEach(k => {
            const normalizedKey = k.toLowerCase().replace(/[\s_-]/g, '');
            if (normalizedKey.includes('namatamu') || normalizedKey.includes('guest') || normalizedKey.includes('nama')) {
              mappedRow.guestName = cleanStr(row[k]);
            } else if (normalizedKey.includes('arrival') || normalizedKey.includes('kedatangan') || normalizedKey.includes('masuk')) {
              mappedRow.arrivalDate = formatExcelDate(row[k]);
            } else if (normalizedKey.includes('departure') || normalizedKey.includes('keberangkatan') || normalizedKey.includes('keluar')) {
              mappedRow.departureDate = formatExcelDate(row[k]);
            } else if (normalizedKey.includes('perusahaan') || normalizedKey.includes('company') || normalizedKey.includes('kantor') || normalizedKey.includes('instansi')) {
              mappedRow.company = cleanStr(row[k]);
            } else if (normalizedKey.includes('nomorkamar') || normalizedKey.includes('room') || normalizedKey.includes('kamar')) {
              mappedRow.roomNumber = cleanStr(row[k]);
            }
          });

          if (mappedRow.guestName) {
            parsedLongstays.push({
              id: `ls-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
              guestName: mappedRow.guestName,
              arrivalDate: mappedRow.arrivalDate || '-',
              departureDate: mappedRow.departureDate || '-',
              company: mappedRow.company || '-',
              roomNumber: mappedRow.roomNumber || '-'
            });
          }
        });

        if (parsedLongstays.length === 0) {
          throw new Error("Format kolom Excel tidak cocok atau tidak ada baris data nama tamu yang valid.");
        }

        if (importMode === 'replace') {
          onChange(parsedLongstays);
          setSuccessMsg(`Berhasil mengimpor ${parsedLongstays.length} tamu longstay! Seluruh data lama telah diganti.`);
        } else {
          onChange([...longstayGuests, ...parsedLongstays]);
          setSuccessMsg(`Berhasil menambahkan ${parsedLongstays.length} tamu longstay ke dalam daftar aktif.`);
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Gagal memproses file Excel. Pastikan format kolom sesuai dengan tabel.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const headers = ["Nama Tamu Longstay", "Tanggal Kedatangan (Arrival)", "Tanggal Keberangkatan (Departure)", "Nama Instansi / Perusahaan", "Nomor Kamar"];
    const rows = [
      ["Dr. Richard Halim", "2026-05-01", "2026-06-15", "Biofarma Bandung Research Unit", "501"],
      ["Mr. Yuki Takahashi", "2026-04-10", "2026-07-20", "Mitsubishi Heavy Industries", "412"]
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["TEMPLATE DAFTAR TAMU BERMALAM PANJANG (LONGSTAY)"],
      ["PETUNJUK: Masukkan data sesuai kolom di bawah harian. Urutan kolom bersifat bebas selama nama judul sama."],
      [],
      headers,
      ...rows
    ]);

    ws['!cols'] = [
      { wch: 30 },
      { wch: 22 },
      { wch: 22 },
      { wch: 32 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Tamu Longstay");
    XLSX.writeFile(wb, "Template_Tamu_Longstay.xlsx");
  };

  return (
    <div id="longstay-card-container" className="bg-white border border-sand-200 rounded-xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-sky-100 text-sky-600 rounded-md">
              <Calendar size={18} />
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-slate-800">Longstay Guests</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">Daftar pemantauan tamu yang menginap jangka panjang (Longstay Guests) aktif</p>
        </div>
        
        {!canEdit ? (
          <span className="self-start text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1 select-none font-mono">
            <span>🔒</span> Hanya Lihat
          </span>
        ) : (
          <button
            onClick={() => {
              setShowUploadZone(!showUploadZone);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all self-start cursor-pointer select-none ${
              showUploadZone 
                ? 'bg-amber-100/80 hover:bg-amber-200 text-amber-805 border border-amber-200' 
                : 'bg-slate-800 hover:bg-slate-900 text-white shadow-xs'
            }`}
          >
            <FileUp size={14} /> 
            <span>{showUploadZone ? 'Tutup Panel Excel' : 'Impor via Excel'}</span>
          </button>
        )}
      </div>

      {showUploadZone && (
        <div className="mb-6 p-5 border border-sand-250 bg-slate-50 rounded-2xl animate-fadeIn space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-sand-200 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-850">
                Impor Daftar Tamu Longstay dari Excel (.XLSX)
              </h4>
              <p className="text-[10.5px] text-gray-500 leading-relaxed mt-0.5">
                Pastikan nama kolom di tingkat baris judul mengandung: <strong className="text-slate-800">Nama Tamu</strong>, <strong className="text-slate-800">Arrival</strong>, <strong className="text-slate-800">Departure</strong>, <strong className="text-slate-800">Company</strong>, <strong className="text-slate-800">Kamar</strong>.
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-white hover:bg-sand-50/60 text-slate-700 border border-sand-250 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition select-none cursor-pointer shadow-3xs font-sans shrink-0 font-sans"
            >
              <FileDown size={12} className="text-slate-500" />
              <span>Unduh Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition flex flex-col items-center justify-center min-h-[160px] cursor-pointer ${
                  isDragging
                    ? 'bg-sky-50 border-sky-400 text-sky-700'
                    : 'bg-white hover:bg-sand-50/40 border-sand-300 hover:border-sky-550 text-slate-600'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                
                <div className={`p-3 rounded-full mb-2 ${isDragging ? 'bg-sky-100 text-sky-600 animate-bounce' : 'bg-slate-50 text-gray-400 border border-sand-200'}`}>
                  <FileUp size={20} />
                </div>
                
                <p className="text-xs font-black text-slate-800">
                  Seret file Excel (.xlsx) ke sini, atau klik untuk memilih
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 font-sans">
                  Format tabel sama dengan tampilan daftar (Nama Tamu, Arrival, Departure, Company, Kamar)
                </p>
              </div>
            </div>

            <div className="md:col-span-5 flex flex-col justify-between space-y-3 bg-white p-4 border border-sand-200/80 rounded-xl">
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Mode Integrasi Data:
                </label>
                
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 px-3 py-1.5 border border-sand-200 hover:bg-sand-50/50 rounded-lg cursor-pointer text-xs font-semibold text-slate-850 select-none">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-sky-600 focus:ring-sky-500 border-sand-300"
                    />
                    <div>
                      <span className="block font-bold text-slate-800">Gantikan Daftar (Replace)</span>
                      <span className="block text-[9px] text-gray-450 font-normal leading-normal mt-0.5">
                        Menghapus data longstay harian aktif saat ini dan menuliskannya ulang.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 px-3 py-1.5 border border-sand-200 hover:bg-sand-50/50 rounded-lg cursor-pointer text-xs font-semibold text-slate-850 select-none">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-sky-600 focus:ring-sky-500 border-sand-300"
                    />
                    <div>
                      <span className="block font-bold text-slate-800">Tambahkan Data (Append)</span>
                      <span className="block text-[9px] text-gray-450 font-normal leading-normal mt-0.5">
                        Menggabungkan data dari file Excel dengan data aktif yang sudah ada.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {(errorMsg || successMsg) && (
                <div className="animate-fadeIn">
                  {errorMsg && (
                    <div className="p-2.5 bg-rose-50 border border-slate-102 text-rose-800 rounded-lg text-[11px] font-medium leading-relaxed">
                      ❌ {errorMsg}
                    </div>
                  )}
                  {successMsg && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-lg text-[11px] font-semibold leading-relaxed">
                      ✅ {successMsg}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Longstay List Table / Grid */}
      <div className="overflow-x-auto border border-sand-200 rounded-xl shadow-xs">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-sand-100/60 border-b border-sand-200 text-slate-700 font-display font-bold">
              <th className="p-3 w-12 text-center">No</th>
              <th className="p-3">Nama Tamu</th>
              <th className="p-3">Arrival Date</th>
              <th className="p-3">Departure Date</th>
              <th className="p-3">Company</th>
              <th className="p-3">No. Kamar</th>
              {canEdit && <th className="p-3 w-24 text-center">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {longstayGuests.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="text-center py-10 text-gray-400">
                  <Calendar size={32} className="mx-auto mb-2 opacity-50 text-slate-400" />
                  <p>Tidak ada data tamu longstay saat ini.</p>
                  <p className="text-[10px] text-gray-450 mt-1">Harap klik "Impor via Excel" di atas untuk memasukkan data tamu aktif harian.</p>
                </td>
              </tr>
            ) : (
              longstayGuests.map((guest, index) => {
                const isEditing = editingId === guest.id;
                return (
                  <tr key={guest.id} className="hover:bg-sand-50/40 transition-colors">
                    <td className="p-3 text-center font-mono font-bold text-slate-500">
                      {index + 1}
                    </td>
                    
                    {isEditing ? (
                      <td colSpan={5} className="p-3 bg-sky-50/50">
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] uppercase font-bold text-sky-800 mb-0.5">Nama Tamu</label>
                            <input
                              type="text"
                              required
                              value={editGuestName}
                              onChange={e => setEditGuestName(e.target.value)}
                              className="w-full bg-white border border-sand-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-sky-800 mb-0.5">Arrival</label>
                            <input
                              type="text"
                              value={editArrivalDate}
                              onChange={e => setEditArrivalDate(e.target.value)}
                              className="w-full bg-white border border-sand-300 rounded-lg px-2 py-1 text-xs text-slate-805 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-sky-800 mb-0.5">Departure</label>
                            <input
                              type="text"
                              value={editDepartureDate}
                              onChange={e => setEditDepartureDate(e.target.value)}
                              className="w-full bg-white border border-sand-300 rounded-lg px-2 py-1 text-xs text-slate-805 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-sky-800 mb-0.5">Company</label>
                            <input
                              type="text"
                              value={editCompany}
                              onChange={e => setEditCompany(e.target.value)}
                              className="w-full bg-white border border-sand-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-sky-800 mb-0.5">No Room</label>
                            <input
                              type="text"
                              value={editRoomNumber}
                              onChange={e => setEditRoomNumber(e.target.value)}
                              className="w-full bg-white border border-sand-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="p-3 font-semibold text-slate-800">{guest.guestName}</td>
                        <td className="p-3 font-mono text-slate-600">{guest.arrivalDate || '-'}</td>
                        <td className={`p-3 font-mono transition-all ${isDue(guest.departureDate) ? 'text-rose-600 font-bold bg-rose-50/70 border-x border-rose-100' : 'text-slate-600'}`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{guest.departureDate || '-'}</span>
                            {isDue(guest.departureDate) && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-600 text-white font-black font-sans uppercase animate-pulse tracking-wider shrink-0 shadow-sm shadow-rose-600/15">
                                Check out Today
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">{guest.company || '-'}</td>
                        <td className="p-3 text-slate-800 font-bold font-mono">{guest.roomNumber || '-'}</td>
                      </>
                    )}

                    {canEdit && (
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <div className="flex justify-center items-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(guest.id)}
                              className="p-1 px-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs"
                              title="Simpan"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 px-2 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg text-xs"
                              title="Batal"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(guest)}
                              className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-sky-50 transition-all cursor-pointer"
                              title="Edit Tamu"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteGuest(guest.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
                Konfirmasi Hapus Longstay Guest
              </h4>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Apakah Anda yakin ingin menghapus data tamu longstay <strong className="text-slate-900 font-bold">{guestToDelete?.guestName}</strong>? Tindakan ini tidak dapat dibatalkan.
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
