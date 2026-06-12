import React, { useState } from "react";
import { GuestUseType, GuestUseUsage } from "../types";
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Settings,
  X,
  Info,
  Check,
  Printer,
  Calendar,
  Edit2,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface GuestUseCardProps {
  types: GuestUseType[];
  usages: GuestUseUsage[];
  onChangeTypes: (types: GuestUseType[]) => void;
  onChangeUsages: (usages: GuestUseUsage[]) => void;
  canEdit: boolean;
  isAdmin?: boolean;
}

export default function GuestUseCard({
  types,
  usages,
  onChangeTypes,
  onChangeUsages,
  canEdit,
  isAdmin = false,
}: GuestUseCardProps) {
  const [activeTypeId, setActiveTypeId] = useState<string | null>(
    types.length > 0 ? types[0].id : null,
  );
  const [showMissingPopup, setShowMissingPopup] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [missingForms, setMissingForms] = useState<number[]>([]);

  // Derived state
  const currentType = types.find((t) => t.id === activeTypeId);
  const currentUsages = currentType
    ? usages
        .filter((u) => u.typeId === currentType.id)
        .sort((a, b) => a.formNumber - b.formNumber)
    : [];

  const handleAddType = () => {
    if (!canEdit) return;
    const newType: GuestUseType = {
      id: `type-${Date.now()}`,
      name: `Form Baru`,
      startSeries: null,
      endSeries: null,
    };
    const newTypes = [...types, newType];
    onChangeTypes(newTypes);
    setActiveTypeId(newType.id);
  };

  const handleUpdateType = (
    id: string,
    field: keyof GuestUseType,
    value: any,
  ) => {
    if (!canEdit) return;
    onChangeTypes(
      types.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const handleDeleteType = (id: string) => {
    if (!canEdit) return;
    onChangeTypes(types.filter((t) => t.id !== id));
    onChangeUsages(usages.filter((u) => u.typeId !== id)); // Cascade delete usages
    if (activeTypeId === id) setActiveTypeId(types[0]?.id || null);
  };

  const handleAddUsage = () => {
    if (!canEdit || !currentType) return;

    let nextFormNumber = currentType.startSeries || 1;
    if (currentUsages.length > 0) {
      const maxUsed = Math.max(...currentUsages.map((u) => u.formNumber));
      nextFormNumber = maxUsed + 1;
    }

    if (currentType.endSeries && nextFormNumber > currentType.endSeries) {
      alert("Nomor form sudah melewati batas No. Akhir.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const newUsage: GuestUseUsage = {
      id: `usage-${Date.now()}`,
      typeId: currentType.id,
      formNumber: nextFormNumber,
      roomNumber: "",
      usageDesc: "",
      staffName: "",
      date: today,
      isSubmitted: false,
    };
    onChangeUsages([...usages, newUsage]);
  };

  const handleUpdateUsage = (
    id: string,
    field: keyof GuestUseUsage,
    value: any,
  ) => {
    if (!canEdit) return;
    onChangeUsages(
      usages.map((u) => (u.id === id ? { ...u, [field]: value } : u)),
    );
  };

  const handleSubmitForm = (id: string) => {
    if (!canEdit) return;

    // First, save the status
    onChangeUsages(
      usages.map((u) => (u.id === id ? { ...u, isSubmitted: true } : u)),
    );

    // Check for gaps (missing forms) up to the max used so far
    if (!currentType || currentType.startSeries === null) return;
    const start = currentType.startSeries;

    // Recalculate max used including the one we just submitted
    const maxUsed = Math.max(...currentUsages.map((u) => u.formNumber));
    if (start > maxUsed) return;

    const usedNumbers = new Set(currentUsages.map((u) => u.formNumber));
    const missing: number[] = [];
    for (let i = start; i <= maxUsed; i++) {
      if (!usedNumbers.has(i)) {
        missing.push(i);
      }
    }

    // If there is any missing, pop up the alert
    if (missing.length > 0) {
      setMissingForms(missing);
      setShowMissingPopup(true);
    }
  };

  const handleDeleteUsage = (id: string) => {
    if (!canEdit) return;
    onChangeUsages(usages.filter((u) => u.id !== id));
  };

  const calculateMissingForms = () => {
    if (
      !currentType ||
      currentType.startSeries === null ||
      currentType.endSeries === null
    )
      return;
    const start = currentType.startSeries;

    if (currentUsages.length === 0) {
      setMissingForms([]);
      setShowMissingPopup(true);
      return;
    }

    const maxUsed = Math.max(...currentUsages.map((u) => u.formNumber));
    const end = maxUsed; // Hanya cek s/d nomor seri tertinggi yang digunakan

    if (start > end) return; // Invalid range

    const usedNumbers = new Set(currentUsages.map((u) => u.formNumber));
    const missing: number[] = [];

    for (let i = start; i <= end; i++) {
      if (!usedNumbers.has(i)) {
        missing.push(i);
      }
    }

    setMissingForms(missing);
    setShowMissingPopup(true);
  };

  const generatePdfReport = (reportType: "daily" | "monthly" | "yearly" | "gabungan") => {
    const doc = new jsPDF();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const monthStr = todayStr.substring(0, 7);
    const yearStr = todayStr.substring(0, 4);

    let title = "Laporan Penggunaan Form";
    let filteredUsages = [...usages];

    if (reportType === "daily") {
      title = `Laporan Harian (${todayStr})`;
      filteredUsages = usages.filter((u) => u.date === todayStr);
    } else if (reportType === "monthly") {
      title = `Laporan Bulanan (${monthStr})`;
      filteredUsages = usages.filter((u) => u.date?.startsWith(monthStr));
    } else if (reportType === "yearly") {
      title = `Laporan Tahunan (${yearStr})`;
      filteredUsages = usages.filter((u) => u.date?.startsWith(yearStr));
    } else if (reportType === "gabungan") {
      title = `Laporan Gabungan Keseluruhan`;
    }

    doc.setFontSize(16);
    doc.text("Guest Use Form - " + title, 14, 22);

    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${today.toLocaleString()}`, 14, 30);

    const tableData: any[] = [];

    if (reportType === "gabungan") {
      // Sort usages by Form Type then form number
      filteredUsages.sort((a, b) => {
        const typeA = types.find(t => t.id === a.typeId)?.name || "";
        const typeB = types.find(t => t.id === b.typeId)?.name || "";
        if (typeA !== typeB) return typeA.localeCompare(typeB);
        return a.formNumber - b.formNumber;
      });
    } else {
      // Sort usages by date then form number
      filteredUsages.sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.formNumber - b.formNumber;
      });
    }

    filteredUsages.forEach((u, i) => {
      const type = types.find((t) => t.id === u.typeId);
      tableData.push([
        i + 1,
        u.date || "-",
        type?.name || "-",
        u.formNumber,
        u.roomNumber || "",
        u.usageDesc,
        u.staffName,
      ]);
    });

    autoTable(doc, {
      startY: 36,
      head: [["No", "Tanggal", "Jenis Form", "No Form", "No Kamar", "Penggunaan", "Staf"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [14, 165, 233] }, // Sky 500
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: "auto" },
        6: { cellWidth: 35 },
      },
    });

    doc.save(`Guest_Use_Form_${reportType}_${todayStr}.pdf`);
    setShowReportModal(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-sand-200/50 overflow-hidden group">
      {/* Header section with Sand color */}
      <div className="flex bg-sand-50/50 px-5 sm:px-6 py-5 border-b border-sand-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-sky-100 text-sky-700 rounded-xl">
              <FileText size={22} className="text-sky-700" />
            </span>
            <h3 className="font-display font-black text-lg sm:text-xl text-slate-800 tracking-tight">
              Guest Use Form Tracker
            </h3>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm w-full sm:w-auto"
            >
              <Printer size={16} />
              <span>Cetak Laporan PDF</span>
            </button>
            {canEdit && isAdmin && (
              <button
                onClick={handleAddType}
                className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm w-full sm:w-auto"
              >
                <Plus size={16} />
                <span>Tambah Jenis Form</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 sm:px-6">
        {/* Horizontal Scroll Types Config */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {types.map((t, i) => {
            const colors = [
              "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
              "bg-blue-50 border-blue-200 hover:border-blue-300",
              "bg-amber-50 border-amber-200 hover:border-amber-300",
              "bg-purple-50 border-purple-200 hover:border-purple-300",
              "bg-rose-50 border-rose-200 hover:border-rose-300",
            ];
            const activeColors = [
              "bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/20",
              "bg-blue-100 border-blue-500 ring-2 ring-blue-500/20",
              "bg-amber-100 border-amber-500 ring-2 ring-amber-500/20",
              "bg-purple-100 border-purple-500 ring-2 ring-purple-500/20",
              "bg-rose-100 border-rose-500 ring-2 ring-rose-500/20",
            ];
            const colorIdx = i % colors.length;

            return (
              <div
                key={t.id}
                className={`shrink-0 w-64 p-4 rounded-2xl border transition-all cursor-pointer ${
                  activeTypeId === t.id
                    ? activeColors[colorIdx]
                    : colors[colorIdx]
                }`}
                onClick={() => setActiveTypeId(t.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <input
                    type="text"
                    value={t.name}
                    onChange={(e) =>
                      handleUpdateType(t.id, "name", e.target.value)
                    }
                    placeholder="Nama Form..."
                    readOnly={!isAdmin}
                    className={`font-black text-sm text-slate-800 placeholder-slate-400 focus:outline-none w-full border rounded-lg px-3 py-2 transition-all ${
                      activeTypeId === t.id
                        ? "bg-white border-sky-200 focus:border-sky-400 shadow-[0_2px_10px_-3px_rgba(14,165,233,0.2)]"
                        : "bg-slate-50 border-transparent hover:border-slate-200"
                    }`}
                    onClick={(e) => isAdmin && e.stopPropagation()}
                  />
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteType(t.id);
                      }}
                      className="text-rose-400 hover:text-rose-600 transition"
                      title="Hapus Form"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">
                      No. Awal
                    </label>
                    <input
                      type="number"
                      value={t.startSeries ?? ""}
                      onChange={(e) =>
                        handleUpdateType(
                          t.id,
                          "startSeries",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      placeholder="Mis. 100"
                      readOnly={!isAdmin}
                      className="bg-white border border-sand-200 rounded px-2 py-1.5 text-xs text-slate-850 w-full focus:outline-none focus:border-sky-500"
                      onClick={(e) => isAdmin && e.stopPropagation()}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">
                      No. Akhir
                    </label>
                    <input
                      type="number"
                      value={t.endSeries ?? ""}
                      onChange={(e) =>
                        handleUpdateType(
                          t.id,
                          "endSeries",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      placeholder="Mis. 200"
                      readOnly={!isAdmin}
                      className="bg-white border border-sand-200 rounded px-2 py-1.5 text-xs text-slate-850 w-full focus:outline-none focus:border-sky-500"
                      onClick={(e) => isAdmin && e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {types.length === 0 && (
            <div className="text-sm text-slate-400 italic p-4">
              Belum ada tipe form yang disetel. Klik tombol 'Tambah Jenis Form'.
            </div>
          )}
        </div>

        {/* Selected Form Type Area */}
        {currentType && (
          <div className="mt-4 bg-slate-50 rounded-2xl border border-sand-200 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-sm text-slate-800">
                Penggunaan:{" "}
                <span className="text-sky-700">{currentType.name}</span>
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={calculateMissingForms}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <AlertCircle size={14} />
                  Hitung / Cek Form Hilang
                </button>
              </div>
            </div>

            {/* Usages Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-100/50 border-b border-sand-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-3 py-2 text-center w-12">No</th>
                    <th className="px-3 py-2 w-32">Nomor Urut Form</th>
                    <th className="px-3 py-2 w-28">Nomor Kamar</th>
                    <th className="px-3 py-2">Penggunaan (Keterangan)</th>
                    <th className="px-3 py-2 w-48">Nama Staf</th>
                    {canEdit && <th className="px-3 py-2 text-right w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-150">
                  {currentUsages.map((usage, index) => {
                    const todayDate = new Date().toISOString().split("T")[0];
                    const isPastDay = usage.date && usage.date !== todayDate;
                    const isReadOnlyRow =
                      !canEdit || usage.isSubmitted || isPastDay;

                    return (
                      <tr
                        key={usage.id}
                        className={`transition ${isReadOnlyRow ? "bg-slate-50/50" : "hover:bg-sand-50/50"}`}
                      >
                        <td className="px-3 py-2 text-center text-xs font-mono text-slate-400 font-bold">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={usage.formNumber}
                            onChange={(e) =>
                              handleUpdateUsage(
                                usage.id,
                                "formNumber",
                                Number(e.target.value),
                              )
                            }
                            placeholder="No. Form"
                            readOnly={isReadOnlyRow}
                            className={`w-full bg-white border border-sand-200 rounded-lg text-sm font-bold text-slate-800 py-1.5 px-3 transition shadow-none ${isReadOnlyRow ? "bg-slate-100 opacity-80 cursor-not-allowed" : "focus:border-sky-400 focus:ring-2 focus:ring-sky-100 hover:border-sand-300 focus:outline-none"}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={usage.roomNumber || ""}
                            onChange={(e) =>
                              handleUpdateUsage(
                                usage.id,
                                "roomNumber",
                                e.target.value,
                              )
                            }
                            placeholder="No. Kamar"
                            readOnly={isReadOnlyRow}
                            className={`w-full bg-white border border-sand-200 rounded-lg text-sm text-slate-800 py-1.5 px-3 transition shadow-none ${isReadOnlyRow ? "bg-slate-100 opacity-80 cursor-not-allowed" : "focus:border-sky-400 focus:ring-2 focus:ring-sky-100 hover:border-sand-300 focus:outline-none"}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={usage.usageDesc}
                            onChange={(e) =>
                              handleUpdateUsage(
                                usage.id,
                                "usageDesc",
                                e.target.value,
                              )
                            }
                            placeholder="Deskripsi / Penggunaan"
                            readOnly={isReadOnlyRow}
                            className={`w-full bg-white border border-sand-200 rounded-lg text-xs text-slate-800 py-1.5 px-3 transition shadow-none ${isReadOnlyRow ? "bg-slate-100 opacity-80 cursor-not-allowed" : "focus:border-sky-400 focus:ring-2 focus:ring-sky-100 hover:border-sand-300 focus:outline-none"}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={usage.staffName}
                            onChange={(e) =>
                              handleUpdateUsage(
                                usage.id,
                                "staffName",
                                e.target.value,
                              )
                            }
                            placeholder="Nama staf..."
                            readOnly={isReadOnlyRow}
                            className={`w-full bg-white border border-sand-200 rounded-lg text-xs text-slate-800 py-1.5 px-3 transition shadow-none ${isReadOnlyRow ? "bg-slate-100 opacity-80 cursor-not-allowed" : "focus:border-sky-400 focus:ring-2 focus:ring-sky-100 hover:border-sand-300 focus:outline-none"}`}
                          />
                        </td>
                        {canEdit && (
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!isReadOnlyRow && (
                                <>
                                  <button
                                    onClick={() => handleSubmitForm(usage.id)}
                                    className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded p-1.5 transition"
                                    title="Selesai & Submit"
                                  >
                                    <Check size={16} strokeWidth={3} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUsage(usage.id)}
                                    className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded p-1.5 transition"
                                    title="Hapus baris"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              )}
                              {isReadOnlyRow &&
                                !isPastDay &&
                                canEdit &&
                                usage.isSubmitted && (
                                  <button
                                    onClick={() =>
                                      handleUpdateUsage(
                                        usage.id,
                                        "isSubmitted",
                                        false,
                                      )
                                    }
                                    className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded p-1.5 transition flex items-center justify-center gap-1 min-w-[60px]"
                                    title="Edit Form"
                                  >
                                    <Edit2 size={14} />
                                    <span className="text-[10px] font-bold">
                                      Edit
                                    </span>
                                  </button>
                                )}
                              {isReadOnlyRow && (isPastDay || !canEdit) && (
                                <span
                                  className="p-1.5 text-slate-300"
                                  title="Data sudah dikunci atau lewat hari"
                                >
                                  <CheckCircle size={16} />
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {currentUsages.length === 0 && (
                    <tr>
                      <td
                        colSpan={canEdit ? 6 : 5}
                        className="px-4 py-8 text-center text-sm text-slate-400 italic"
                      >
                        Belum ada penggunaan tercatat untuk {currentType.name}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {canEdit && (
              <button
                onClick={handleAddUsage}
                className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-sand-100 hover:bg-sand-200 text-slate-600 rounded-xl transition text-xs font-bold border border-sand-200 hover:border-sand-300 border-dashed"
              >
                <Plus size={16} />
                Tambah Baris Penggunaan Form
              </button>
            )}
          </div>
        )}
      </div>

      {/* Missing Forms Pop-Up / Modal */}
      {showMissingPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-zoomIn transform scale-95 border border-sand-200">
            <div className="bg-rose-50 border-b border-rose-100 px-5 py-4 flex items-center justify-between">
              <h3 className="font-display font-black text-rose-800 flex items-center gap-2">
                <AlertCircle size={18} />
                Laporan Form Hilang
              </h3>
              <button
                onClick={() => setShowMissingPopup(false)}
                className="text-rose-400 hover:text-rose-700 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 mb-4">
                Hasil pengecekan form{" "}
                <strong className="text-slate-800">{currentType?.name}</strong>{" "}
                dari nomor awal{" "}
                <strong className="text-slate-800">
                  {currentType?.startSeries}
                </strong>{" "}
                s/d pemakaian terakhir{" "}
                <strong className="text-slate-800">
                  {currentUsages.length > 0
                    ? Math.max(...currentUsages.map((u) => u.formNumber))
                    : currentType?.startSeries}
                </strong>
                :
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-sand-200">
                {missingForms.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 text-emerald-600">
                    <CheckCircle size={24} />
                    <span className="text-sm font-bold">
                      Aman! Tidak ada nomor form yang loncat/hilang.
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="text-rose-600 text-lg font-black mb-2 flex items-center gap-2">
                      <AlertCircle size={20} />
                      <span>{missingForms.length} Form Terdeteksi Hilang!</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto pr-2">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                        Nomor Seri yang Hilang:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {missingForms.map((num) => (
                          <span
                            key={num}
                            className="bg-rose-100 text-rose-800 px-2 py-1 rounded text-xs font-mono font-bold"
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowMissingPopup(false)}
                className="mt-5 w-full bg-slate-800 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-slate-700 transition"
              >
                Tutup Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Selection Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-zoomIn transform scale-95 border border-sand-200">
            <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-4 flex items-center justify-between">
              <h3 className="font-display font-black text-emerald-800 flex items-center gap-2">
                <Printer size={18} />
                Cetak Laporan PDF
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-emerald-400 hover:text-emerald-700 transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 mb-4 font-medium text-center">
                Pilih jenis laporan yang ingin Anda unduh:
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => generatePdfReport("daily")}
                  className="bg-white border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 px-4 py-3 rounded-2xl transition flex items-center gap-4 text-left group"
                >
                  <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl group-hover:bg-emerald-200 transition">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800 text-sm">
                      Laporan Harian (Daily)
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Mencetak penggunaan form hari ini.
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => generatePdfReport("monthly")}
                  className="bg-white border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 px-4 py-3 rounded-2xl transition flex items-center gap-4 text-left group"
                >
                  <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl group-hover:bg-blue-200 transition">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800 text-sm">
                      Laporan Bulanan (Monthly)
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Mencetak penggunaan form bulan ini.
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => generatePdfReport("yearly")}
                  className="bg-white border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 px-4 py-3 rounded-2xl transition flex items-center gap-4 text-left group"
                >
                  <div className="bg-purple-100 text-purple-600 p-2.5 rounded-xl group-hover:bg-purple-200 transition">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800 text-sm">
                      Laporan Tahunan (Yearly)
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Mencetak penggunaan form tahun ini.
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => generatePdfReport("gabungan")}
                  className="bg-white border-2 border-slate-100 hover:border-amber-500 hover:bg-amber-50 px-4 py-3 rounded-2xl transition flex items-center gap-4 text-left group"
                >
                  <div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl group-hover:bg-amber-200 transition">
                    <Printer size={20} />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800 text-sm">
                      Laporan Gabungan
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Mencetak keseluruhan data form yang tersimpan.
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
