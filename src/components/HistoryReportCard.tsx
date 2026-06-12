import React, { useState, useMemo } from 'react';
import { BriefingData, DailyHistoryRecord } from '../types';
import { 
  Calendar, 
  TrendingUp, 
  Users, 
  Printer, 
  RefreshCw, 
  FileText, 
  ChevronRight, 
  Search, 
  CalendarDays, 
  Plus, 
  Info, 
  Trash2, 
  ArrowRight, 
  UserCheck, 
  Car,
  CheckCircle2,
  FolderLock,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { ExportPdfButton } from './ExportPdfButton';

interface HistoryReportCardProps {
  historyLogs: DailyHistoryRecord[];
  currentData: BriefingData;
  hotelName: string;
  portalName: string;
  onSaveTodayToHistory: (targetDate?: string) => void;
  onDeleteHistoryRecord?: (dateString: string) => void;
  onInjectMockHistory: () => void;
  isAdmin?: boolean;
}

export function HistoryReportCard({
  historyLogs = [],
  currentData,
  hotelName,
  portalName,
  onSaveTodayToHistory,
  onDeleteHistoryRecord,
  onInjectMockHistory,
  isAdmin = false
}: HistoryReportCardProps) {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  
  // Date selection states
  const [selectedDailyDate, setSelectedDailyDate] = useState(() => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - tzOffset).toISOString().slice(0, 10);
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedYear, setSelectedYear] = useState(() => {
    return String(new Date().getFullYear());
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeDetailsRecord, setActiveDetailsRecord] = useState<DailyHistoryRecord | null>(null);

  // Formatting currency helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Human date string helper
  const translateDateStringLong = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  // 1. FILTER: DAILY REPORTS
  const dailyReportData = useMemo(() => {
    return historyLogs.find(log => log.date === selectedDailyDate) || null;
  }, [historyLogs, selectedDailyDate]);

  // 2. FILTER: MONTHLY REPORTS
  const monthlyReportData = useMemo(() => {
    // Selected month format: "YYYY-MM"
    const filtered = historyLogs.filter(log => log.date.startsWith(selectedMonth));
    if (filtered.length === 0) return null;

    const totalRecords = filtered.length;
    let sumOccupancy = 0;
    let sumBookedRooms = 0;
    let sumArrivals = 0;
    let sumDepartures = 0;
    let sumBarRate = 0;
    let sumOOO = 0;
    let totalVips = 0;
    let totalGroups = 0;
    let totalTransports = 0;
    let totalTasksCompleted = 0;

    filtered.forEach(log => {
      sumOccupancy += log.metrics.onHandBookingPercentage || 0;
      sumBookedRooms += log.metrics.onHandBookingCount || 0;
      sumArrivals += log.metrics.totalArrivalsToday || 0;
      sumDepartures += log.metrics.totalDeparturesToday || 0;
      sumBarRate += log.metrics.barRateToday || 0;
      sumOOO += log.metrics.oooRoomsCount || 0;
      totalVips += log.vipCount || 0;
      totalGroups += log.groupCount || 0;
      totalTransports += log.transportCount || 0;
      totalTasksCompleted += log.otherOperationalCount || 0;
    });

    return {
      monthStr: selectedMonth,
      recordCount: totalRecords,
      avgOccupancy: Math.round(sumOccupancy / totalRecords),
      totalRoomsSold: sumBookedRooms,
      avgBarRate: Math.round(sumBarRate / totalRecords),
      totalArrivals: sumArrivals,
      totalDepartures: sumDepartures,
      avgOOO: Math.round(sumOOO / totalRecords * 10) / 10,
      totalVips,
      totalGroups,
      totalTransports,
      totalTasksCompleted,
      dailyLogs: filtered.sort((a,b) => b.date.localeCompare(a.date))
    };
  }, [historyLogs, selectedMonth]);

  // 3. FILTER: YEARLY REPORTS
  const yearlyReportData = useMemo(() => {
    // Year format: "YYYY"
    const filtered = historyLogs.filter(log => log.date.startsWith(selectedYear));
    if (filtered.length === 0) return null;

    // Group logs by month
    const monthsGroup: Record<string, DailyHistoryRecord[]> = {};
    filtered.forEach(log => {
      const monthKey = log.date.substring(0, 7); // "YYYY-MM"
      if (!monthsGroup[monthKey]) monthsGroup[monthKey] = [];
      monthsGroup[monthKey].push(log);
    });

    const monthlySummaries = Object.entries(monthsGroup).map(([mKey, logs]) => {
      const totalDays = logs.length;
      const sumOcc = logs.reduce((acc, curr) => acc + (curr.metrics.onHandBookingPercentage || 0), 0);
      const sumRooms = logs.reduce((acc, curr) => acc + (curr.metrics.onHandBookingCount || 0), 0);
      const sumBar = logs.reduce((acc, curr) => acc + (curr.metrics.barRateToday || 0), 0);
      const sumArrivals = logs.reduce((acc, curr) => acc + (curr.metrics.totalArrivalsToday || 0), 0);

      const parts = mKey.split('-');
      const mIdx = Number(parts[1]) - 1;
      const indonesianMonths = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthName = indonesianMonths[mIdx] || mKey;

      return {
        monthKey: mKey,
        monthLabel: monthName,
        dayCount: totalDays,
        avgOccupancy: Math.round(sumOcc / totalDays),
        totalRoomsSold: sumRooms,
        avgBarRate: Math.round(sumBar / totalDays),
        totalArrivals: sumArrivals
      };
    }).sort((a,b) => a.monthKey.localeCompare(b.monthKey));

    const grandTotalDays = filtered.length;
    const divisor = grandTotalDays || 1;
    const avgOccOverall = Math.round(filtered.reduce((acc, curr) => acc + (curr.metrics.onHandBookingPercentage || 0), 0) / divisor);
    const avgBarOverall = Math.round(filtered.reduce((acc, curr) => acc + (curr.metrics.barRateToday || 0), 0) / divisor);
    const totalRoomsSoldOverall = filtered.reduce((acc, curr) => acc + (curr.metrics.onHandBookingCount || 0), 0);
    const totalArrivalsOverall = filtered.reduce((acc, curr) => acc + (curr.metrics.totalArrivalsToday || 0), 0);

    return {
      yearStr: selectedYear,
      recordCount: grandTotalDays,
      avgOccupancy: avgOccOverall,
      avgBarRate: avgBarOverall,
      totalRoomsSold: totalRoomsSoldOverall,
      totalArrivals: totalArrivalsOverall,
      monthlyDecomps: monthlySummaries
    };
  }, [historyLogs, selectedYear]);

  // Handle Past Report Printable Mode
  const handlePrintPastReport = (record: DailyHistoryRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const olderLogs = historyLogs.filter(l => l.date < record.date);
    const prevLog = olderLogs.length > 0 
      ? olderLogs.reduce((latest, current) => current.date > latest.date ? current : latest) 
      : null;
    const currentTaxiRev = record.metrics.taxiRevenue || 0;
    const prevTaxiRev = prevLog?.metrics?.taxiRevenue || 0;
    const taxiDiff = currentTaxiRev - prevTaxiRev;

    const dateStrLong = translateDateStringLong(record.date);
    const title = `Laporan Morning Briefing - ${record.hotelName}`;

    let html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 30px; line-height: 1.5; background: #fff; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
            .hotel-title { font-size: 24px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin: 0; }
            .portal-subtitle { font-size: 14px; color: #4b5563; margin-top: 5px; text-transform: capitalize; }
            .meta-date { font-size: 14px; font-weight: 600; color: #0284c7; }
            .section-title { font-size: 15px; font-weight: 800; text-transform: uppercase; border-left: 4px solid #b45309; padding-left: 10px; margin-top: 30px; margin-bottom: 12px; color: #111827; }
            .grid-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
            .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; text-align: center; }
            .metric-label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
            .metric-val { font-size: 18px; font-weight: bold; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background: #1e3a8a; color: white; font-weight: bold; text-transform: uppercase; font-size: 10px; }
            tr:nth-child(even) { background: #f1f5f9; }
            .empty-state { text-align: center; font-style: italic; color: #94a3b8; padding: 15px; border: 1px dashed #cbd5e1; border-radius: 8px; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #64748b; }
            @media print {
              body { padding: 0; }
              .header { border-bottom-color: #000; }
            }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div>
              <h1 class="hotel-title">${record.hotelName}</h1>
              <div class="portal-subtitle">Portal Morning Briefing: ${record.portalName}</div>
            </div>
            <div class="meta-date">
              ${dateStrLong.toUpperCase()}<br>
              <span style="font-size:10px; color:#4b5563; font-weight:normal;">REKAMAN HISTORIS</span>
            </div>
          </div>

          <div class="section-title">I. Metrik Kinerja Kamar Harian</div>
          <div class="grid-metrics">
            <div class="metric-card">
              <div class="metric-label">Tingkat Okupansi</div>
              <div class="metric-val">${record.metrics.onHandBookingPercentage}%</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Kamar Terjual (On Hand)</div>
              <div class="metric-val">${record.metrics.onHandBookingCount} Kamar</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Arrivals / Departures</div>
              <div class="metric-val">${record.metrics.totalArrivalsToday} / ${record.metrics.totalDeparturesToday} Kamar</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Harga BAR Aktif</div>
              <div class="metric-val">Rp ${record.metrics.barRateToday.toLocaleString('id-ID')}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Kamar Rusak (OOO)</div>
              <div class="metric-val">${record.metrics.oooRoomsCount} Kamar</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Revenue Taxi</div>
              <div class="metric-val">Rp ${(record.metrics.taxiRevenue || 0).toLocaleString('id-ID')}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Selisih Taxi (D-by-D)</div>
              <div class="metric-val" style="color: ${taxiDiff > 0 ? '#16a34a' : taxiDiff < 0 ? '#dc2626' : '#64748b'}; font-weight: bold;">
                ${prevLog ? (taxiDiff > 0 ? `+Rp ${taxiDiff.toLocaleString('id-ID')}` : taxiDiff < 0 ? `-Rp ${Math.abs(taxiDiff).toLocaleString('id-ID')}` : 'Rp 0') : 'N/A'}
              </div>
            </div>
            <div class="metric-card shadow">
              <div class="metric-label">Status Histori</div>
              <div class="metric-val" style="color:#10b981; font-size:14px;">TERKUNCI & AMAN</div>
            </div>
          </div>

          <div class="section-title">II. Tamu VIP & Special Requests (${record.vipCount})</div>
          ${record.details?.vipGuests && record.details.vipGuests.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Nama Tamu VIP</th>
                  <th>Kamar / Tipe</th>
                  <th>ETA</th>
                  <th>Permintaan Khusus / Remarks</th>
                  <th>Level VIP</th>
                </tr>
              </thead>
              <tbody>
                ${record.details.vipGuests.map(v => `
                  <tr>
                    <td><strong>${v.name}</strong></td>
                    <td>Room ${v.roomNumber || '-'} (${v.roomType || '-'})</td>
                    <td style="text-align:center;">${v.eta || '-'}</td>
                    <td>${v.requests || '-'}</td>
                    <td style="text-align:center;"><strong>${v.vipLevel || '-'}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `<div class="empty-state">Tidak ada tamu VIP yang dicatat untuk tanggal ini.</div>`}

          <div class="section-title">III. Rombongan Grup Masuk Hari Ini (${record.groupCount})</div>
          ${record.details?.groups && record.details.groups.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Nama Rombongan / Event</th>
                  <th>Kamar Dipesan</th>
                  <th>Jumlah Pax</th>
                  <th>ETA</th>
                  <th>Instruksi / Catatan Layanan</th>
                </tr>
              </thead>
              <tbody>
                ${record.details.groups.map(g => `
                  <tr>
                    <td><strong>${g.groupName}</strong></td>
                    <td style="text-align:center;">${g.roomsCount} Rms</td>
                    <td style="text-align:center;">${g.guestCount} Pax</td>
                    <td style="text-align:center;">${g.eta || '-'}</td>
                    <td>${g.remarks || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `<div class="empty-state">Tidak ada grup/rombongan terdaftar untuk tanggal ini.</div>`}

          <div class="section-title">IV. Pekerjaan Sektoral & Checklist Operasional [HOD]</div>
          ${record.details?.otherOperational && record.details.otherOperational.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Checklist Tugas</th>
                  <th>Kategori Sektor</th>
                  <th>Skala Prioritas</th>
                  <th>Detail Catatan / Pekerjaan</th>
                  <th>Status Final</th>
                </tr>
              </thead>
              <tbody>
                ${record.details.otherOperational.map(o => `
                  <tr>
                    <td><strong>${o.title}</strong></td>
                    <td style="text-align:center;">${o.category}</td>
                    <td style="text-align:center;">${o.priority}</td>
                    <td>${o.notes || '-'}</td>
                    <td style="text-align:center; font-weight:bold; color:${o.status === 'Completed' ? '#10b981' : '#b45309'};">
                      ${o.status.toUpperCase()}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `<div class="empty-state">Tidak ada tugas sektoral operasional terdaftar untuk tanggal ini.</div>`}

          <div class="section-title">V. Layanan Jemputan Airport Shuttles (${record.transportCount})</div>
          ${record.details?.transports && record.details.transports.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Nama Tamu</th>
                  <th>Kamar</th>
                  <th>Tipe Layanan</th>
                  <th>Waktu Shuttle</th>
                  <th>No. Penerbangan</th>
                  <th>Nama Supir / Armada</th>
                  <th>Pax</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${record.details.transports.map(t => `
                  <tr>
                    <td><strong>${t.guestName}</strong></td>
                    <td style="text-align:center;">Room ${t.roomNumber || '-'}</td>
                    <td style="text-align:center;">${t.type}</td>
                    <td style="text-align:center;">${t.time || '-'}</td>
                    <td style="text-align:center;">${t.flightNumber || '-'}</td>
                    <td>${t.carDetails || '-'}</td>
                    <td style="text-align:center;">${t.passengerCount || 2} Pax</td>
                    <td style="text-align:center;">${t.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `<div class="empty-state">Tidak ada airport shuttle terdaftar untuk tanggal ini.</div>`}

          <div class="footer">
            Dokumen ini diarsipkan secara digital oleh Sistem Portal HOD.<br>
            Dicetak otomatis dari cloud backup: ${new Date().toLocaleString('id-ID')} WITA
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Export Daily/Monthly report summary to Excel with beautiful styled template!
  const handleExportSummaryExcel = () => {
    const wb = XLSX.utils.book_new();

    if (reportType === 'monthly' && monthlyReportData) {
      // Create workbook with two sheets: 1. Monthly Summary, 2. Daily Log Listings
      const headers = ["Tanggal", "Kamar Terjual", "Okupansi (%)", "Arrivals", "Departures", "Harga BAR", "Kamar OOO", "Tamu VIP", "Jumlah Grup", "Checklist Ops", "Revenue Taxi", "Selisih Taxi"];
      const rows = monthlyReportData.dailyLogs.map(log => {
        const olderLogs = historyLogs.filter(l => l.date < log.date);
        const prevLog = olderLogs.length > 0 
          ? olderLogs.reduce((latest, current) => current.date > latest.date ? current : latest) 
          : null;
        const currentTaxiRev = log.metrics.taxiRevenue || 0;
        const prevTaxiRev = prevLog?.metrics?.taxiRevenue || 0;
        const taxiDiff = currentTaxiRev - prevTaxiRev;

        return [
          log.date,
          log.metrics.onHandBookingCount,
          log.metrics.onHandBookingPercentage,
          log.metrics.totalArrivalsToday,
          log.metrics.totalDeparturesToday,
          log.metrics.barRateToday,
          log.metrics.oooRoomsCount,
          log.vipCount,
          log.groupCount,
          log.otherOperationalCount,
          currentTaxiRev,
          taxiDiff
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([
        [`LAPORAN BULANAN MORNING BRIEFING - ${selectedMonth}`],
        [`HOTEL: ${hotelName.toUpperCase()}`],
        [`Diunduh pada: ${new Date().toLocaleString()}`],
        [],
        ["Statistik Rangkuman Bulanan", "", "Value", "Keterangan"],
        ["Jumlah Hari Recorded", "", monthlyReportData.recordCount, "Hari terinput data"],
        ["Rata-rata Okupansi (%)", "", `${monthlyReportData.avgOccupancy}%`, `Dari rata-rata total hari`],
        ["Total Kamar Terjual (Rms)", "", monthlyReportData.totalRoomsSold, "Penjualan terakumulasi"],
        ["Rata-rata Harga Kamar (BAR)", "", formatIDR(monthlyReportData.avgBarRate), "Best Available Rate rata-rata"],
        ["Total Kedatangan (Arrivals)", "", monthlyReportData.totalArrivals, "Jumlah rincian kamar check-in"],
        ["Total Keberangkatan (Departures)", "", monthlyReportData.totalDepartures, "Jumlah rincian kamar check-out"],
        ["Total Tamu VIP Dilayani", "", monthlyReportData.totalVips, "Pax tamu VIP harian"],
        [],
        headers,
        ...rows
      ]);

      XLSX.utils.book_append_sheet(wb, ws, "Monthly Summary");
      XLSX.writeFile(wb, `Laporan_Rangkuman_Bulanan_${selectedMonth}.xlsx`);
    } else if (reportType === 'yearly' && yearlyReportData) {
      const headers = ["Bulan", "Rata-rata Okupansi (%)", "Total Kamar Terjual (Rms)", "Rata-rata BAR Rate", "Total Kedatangan (Arrivals)"];
      const rows = yearlyReportData.monthlyDecomps.map(m => [
        m.monthLabel,
        m.avgOccupancy,
        m.totalRoomsSold,
        m.avgBarRate,
        m.totalArrivals
      ]);

      const ws = XLSX.utils.aoa_to_sheet([
        [`LAPORAN TAHUNAN MORNING BRIEFING - ${selectedYear}`],
        [`HOTEL: ${hotelName.toUpperCase()}`],
        [`Diunduh pada: ${new Date().toLocaleString()}`],
        [],
        ["Parameter Tahunan", "Nilai Terakumulasi", "Keterangan"],
        ["Rata-rata Okupansi Setahun", `${yearlyReportData.avgOccupancy}%`, "Kuartal terkapitalisasi"],
        ["Total Kamar Terjual", yearlyReportData.totalRoomsSold, "Rooms sold terakumulasi"],
        ["Rata-rata Harga Kamar (BAR)", formatIDR(yearlyReportData.avgBarRate), "Rata-rata BAR harian"],
        ["Total Kedatangan (Arrivals)", yearlyReportData.totalArrivals, "Kedatangan tamu setahun"],
        [],
        headers,
        ...rows
      ]);

      XLSX.utils.book_append_sheet(wb, ws, "Yearly Summary");
      XLSX.writeFile(wb, `Laporan_Rangkuman_Tahunan_${selectedYear}.xlsx`);
    } else if (reportType === 'daily' && dailyReportData) {
      handlePrintPastReport(dailyReportData);
    }
  };

  return (
    <div className="bg-white border border-sand-200 rounded-3xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sand-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl">
            <CalendarDays size={22} />
          </div>
          <div>
            <h2 className="font-display font-black text-slate-800 text-lg">
              Laporan Riwayat Harian & Rangkuman Berkala
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Pantau laporan harian terinput, rekap bulanan (kumulatif), dan grafik tahunan dari briefing.
            </p>
          </div>
        </div>

        {/* Right side Header Buttons */}
        <div className="flex items-center gap-2">
          <ExportPdfButton data={currentData} hotelName={hotelName} portalName={portalName} />
          {historyLogs.length === 0 && (
            <button
              type="button"
              onClick={onInjectMockHistory}
              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-250/65 px-3 py-1.5 rounded-xl cursor-pointer font-bold inline-flex items-center gap-1.5 transition-colors self-start sm:self-center"
            >
              <RefreshCw size={13} className="animate-spin-slow" />
              <span>Simulasi Data Riwayat (30 Hari Lalu)</span>
            </button>
          )}
        </div>
      </div>

      {/* Selector Tipe Laporan */}
      <div className="flex bg-slate-105 border border-sand-250/60 p-1 rounded-2xl max-w-sm">
        <button
          onClick={() => { setReportType('daily'); setActiveDetailsRecord(null); }}
          className={`flex-1 text-center py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            reportType === 'daily' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Harian (Daily)
        </button>
        <button
          onClick={() => { setReportType('monthly'); setActiveDetailsRecord(null); }}
          className={`flex-1 text-center py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            reportType === 'monthly' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Bulanan (Monthly)
        </button>
        <button
          onClick={() => { setReportType('yearly'); setActiveDetailsRecord(null); }}
          className={`flex-1 text-center py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            reportType === 'yearly' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Tahunan (Yearly)
        </button>
      </div>

      {/* FILTER CONTROL WRAPPER */}
      <div className="p-4 bg-slate-50 border border-sand-250 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {reportType === 'daily' && (
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">
              Pilih Tanggal Laporan
            </label>
            <input
              type="date"
              value={selectedDailyDate}
              onChange={(e) => { setSelectedDailyDate(e.target.value); setActiveDetailsRecord(null); }}
              className="w-full bg-white border border-sand-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-red-500 font-sans"
            />
          </div>
        )}

        {reportType === 'monthly' && (
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">
              Pilih Bulan Laporan
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setActiveDetailsRecord(null); }}
              className="w-full bg-white border border-sand-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-red-500 font-sans"
            />
          </div>
        )}

        {reportType === 'yearly' && (
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">
              Pilih Tahun Laporan
            </label>
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); setActiveDetailsRecord(null); }}
              className="w-full bg-white border border-sand-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-red-500 font-sans"
            >
              <option value="2026">Tahun 2026</option>
              <option value="2027">Tahun 2027</option>
              <option value="2028">Tahun 2028</option>
            </select>
          </div>
        )}

        <div className="md:col-span-8 flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="text-xs text-emerald-950 font-medium">
            <div className="font-bold">✓ Sinkronisasi & Penyimpanan Otomatis Aktif</div>
            <p className="text-[11px] text-emerald-800">Setiap perubahan data briefing harian hari ini otomatis dikunci ke riwayat database secara real-time.</p>
          </div>
        </div>
      </div>

      {/* CONTENT: 1. DAILY REPORT SCREEN */}
      {reportType === 'daily' && (
        <div className="space-y-4">
          {dailyReportData ? (
            <div className="border border-sand-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-sand-100 animate-fadeIn bg-white">
              {/* Card Header metadata */}
              <div className="p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[9.5px] font-black tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 font-mono uppercase">
                    DATA TERSEDIA & TERKUNCI
                  </span>
                  <p className="text-sm font-black text-slate-850">
                    {translateDateStringLong(dailyReportData.date)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePrintPastReport(dailyReportData)}
                    className="p-2 bg-white border border-sand-300 hover:border-red-500 rounded-xl text-slate-700 hover:text-red-600 transition-all cursor-pointer"
                    title="Cetak Laporan Penutup Harian"
                  >
                    <Printer size={15} />
                  </button>

                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onDeleteHistoryRecord) {
                          if (confirm(`Apakah Anda yakin ingin menghapus data riwayat untuk tanggal ${translateDateStringLong(dailyReportData.date)}?`)) {
                            onDeleteHistoryRecord(dailyReportData.date);
                          }
                        }
                      }}
                      className="p-2 bg-white border border-sand-300 hover:border-rose-500 rounded-xl text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Hapus Rekaman Riwayat"
                      id="btn-delete-history-record"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-300 opacity-60 cursor-not-allowed"
                      title="Hapus Rekaman Riwayat (Hanya untuk Administrator)"
                      id="btn-delete-history-record-disabled"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid block metrics summary */}
              <div className="p-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="p-3 bg-red-50/50 border border-red-100/60 rounded-xl text-center space-y-1">
                  <span className="block text-[9.5px] font-extrabold uppercase text-slate-550 font-mono">Tingkat Okupansi</span>
                  <span className="block text-xl font-black text-slate-800">{dailyReportData.metrics.onHandBookingPercentage}%</span>
                </div>

                <div className="p-3 bg-slate-52 border border-sand-200/80 rounded-xl text-center space-y-1">
                  <span className="block text-[9.5px] font-extrabold uppercase text-slate-550 font-mono">Kamar Terjual</span>
                  <span className="block text-xl font-black text-slate-800">{dailyReportData.metrics.onHandBookingCount} Rms</span>
                </div>

                <div className="p-3 bg-slate-52 border border-sand-200/80 rounded-xl text-center space-y-1">
                  <span className="block text-[9.5px] font-extrabold uppercase text-slate-550 font-mono">Arrivals / Departures</span>
                  <span className="block text-md font-extrabold text-slate-800 mt-1">{dailyReportData.metrics.totalArrivalsToday} / {dailyReportData.metrics.totalDeparturesToday}</span>
                </div>

                <div className="p-3 bg-slate-52 border border-sand-200/80 rounded-xl text-center space-y-1">
                  <span className="block text-[9.5px] font-extrabold uppercase text-slate-550 font-mono">B-A-R Room Rate</span>
                  <span className="block text-sm font-extrabold text-slate-800 mt-1 leading-normal truncate">{formatIDR(dailyReportData.metrics.barRateToday)}</span>
                </div>

                <div className="p-3 bg-slate-52 border border-sand-200/80 rounded-xl text-center space-y-1">
                  <span className="block text-[9.5px] font-extrabold uppercase text-slate-550 font-mono font-sans">Kamar Rusak (OOO)</span>
                  <span className="block text-xl font-black text-slate-800">{dailyReportData.metrics.oooRoomsCount} Rms</span>
                </div>

                <div className="p-3 bg-red-50/30 border border-slate-102 rounded-xl text-center space-y-1">
                  <span className="block text-[9.5px] font-extrabold uppercase text-slate-555 font-mono">Terakhir Update</span>
                  <span className="block text-[10px] text-slate-500 font-mono font-medium leading-normal mt-1 truncate">
                    {new Date(dailyReportData.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>
              </div>

              {/* Details of tables inside popover detail view */}
              <div className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-100 pb-2">
                  <h4 className="text-xs font-black font-mono uppercase tracking-wider text-slate-800">
                    📜 Detail Board Briefing Terangkum
                  </h4>
                  <p className="text-[10px] text-slate-400">Centang kelengkapan list data per sektor harian</p>
                </div>

                {/* Grid layout tables count badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3.5 bg-white border border-sand-200 rounded-xl flex items-center justify-between shadow-3xs">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-405">Tamu VIP</span>
                      <p className="text-lg font-black text-slate-800">{dailyReportData.vipCount} Pax</p>
                    </div>
                    <span className="p-2 bg-amber-50 rounded-lg text-amber-600"><Users size={16} /></span>
                  </div>

                  <div className="p-3.5 bg-white border border-sand-200 rounded-xl flex items-center justify-between shadow-3xs">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-405">Grup Masuk</span>
                      <p className="text-lg font-black text-slate-800">{dailyReportData.groupCount} Grup</p>
                    </div>
                    <span className="p-2 bg-sky-50 rounded-lg text-sky-600"><UserCheck size={16} /></span>
                  </div>

                  <div className="p-3.5 bg-white border border-sand-200 rounded-xl flex items-center justify-between shadow-3xs">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-405">Airport Shuttles</span>
                      <p className="text-lg font-black text-slate-800">{dailyReportData.transportCount} Mobil</p>
                    </div>
                    <span className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Car size={16} /></span>
                  </div>

                  <div className="p-3.5 bg-white border border-sand-200 rounded-xl flex items-center justify-between shadow-3xs">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-405">Catatan Sektoral</span>
                      <p className="text-lg font-black text-slate-800">{dailyReportData.otherOperationalCount} Tugas</p>
                    </div>
                    <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle2 size={16} /></span>
                  </div>

                  <div className="p-3.5 bg-white border border-sand-200 rounded-xl flex items-center justify-between shadow-3xs">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-405">Tamu Longstay</span>
                      <p className="text-lg font-black text-slate-800">{dailyReportData.longstayCount} Kamar</p>
                    </div>
                    <span className="p-2 bg-fuchsia-50 rounded-lg text-fuchsia-600"><Calendar size={16} /></span>
                  </div>
                </div>

                {/* Show toggle past snapshot buttons */}
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setActiveDetailsRecord(dailyReportData)}
                    className="text-xs text-red-600 hover:text-white hover:bg-red-600 border border-red-500 rounded-xl px-4 py-2 font-bold cursor-pointer transition-all inline-flex items-center gap-1"
                  >
                    <span>Tinjau Detail Kontak & Form Briefing Lengkap</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-sand-250 rounded-2xl bg-slate-50 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <FileText size={22} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">Belum Ada Rekaman Data pada Tanggal Ini</h4>
                <p className="text-xs text-slate-500">
                  Tidak ada data briefing yang terekam untuk tanggal {translateDateStringLong(selectedDailyDate)}. Data briefing harian otomatis tersimpan ke riwayat database saat diinput atau diubah pada hari bersangkutan.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENT: 2. MONTHLY REPORT SCREEN */}
      {reportType === 'monthly' && (
        <div className="space-y-6">
          {monthlyReportData ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Summary Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-red-50 text-red-950 border border-red-100 rounded-2xl space-y-1 shadow-2xs">
                  <span className="text-[9.5px] uppercase font-bold tracking-wider font-mono text-red-800">Okupansi Rata-Rata</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-850">{monthlyReportData.avgOccupancy}%</span>
                    <span className="text-[11px] text-red-755 font-medium">Bulan Ini</span>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/70 text-amber-950 border border-amber-200/50 rounded-2xl space-y-1 shadow-2xs">
                  <span className="text-[9.5px] uppercase font-bold tracking-wider font-mono text-amber-800">Total Kmr Terjual</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-850">{monthlyReportData.totalRoomsSold}</span>
                    <span className="text-[11px] text-amber-705 font-medium">Rooms Sold</span>
                  </div>
                </div>

                <div className="p-4 bg-sky-50 text-sky-950 border border-sky-100 rounded-2xl space-y-1 shadow-2xs">
                  <span className="text-[9.5px] uppercase font-bold tracking-wider font-mono text-sky-800">Harga Kamar (BAR) Rata-Rata</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-slate-800">{formatIDR(monthlyReportData.avgBarRate)}</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 text-emerald-950 border border-emerald-100 rounded-2xl space-y-1 shadow-2xs">
                  <span className="text-[9.5px] uppercase font-bold tracking-wider font-mono text-emerald-800">Hari Terinput Riwayat</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-850">{monthlyReportData.recordCount} Hri</span>
                    <span className="text-[11px] text-emerald-705 font-medium">Recorded</span>
                  </div>
                </div>
              </div>

              {/* Visual Performance Charts in Tailwind */}
              <div className="bg-slate-50 border border-sand-250 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-sand-200/70 pb-3">
                  <h4 className="text-xs font-black font-mono uppercase text-slate-800">
                    📈 Grafik Tingkat Okupansi Harian Bulan Ini (%)
                  </h4>
                  <button
                    type="button"
                    onClick={handleExportSummaryExcel}
                    className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer inline-flex items-center gap-1"
                  >
                    <Download size={12} />
                    <span>Ekspor ke Excel</span>
                  </button>
                </div>

                {/* Vertical Bar Chart Graphic built with pure Tailwind Flex */}
                <div className="h-44 flex items-end justify-between gap-1 pt-6 px-2 select-none">
                  {monthlyReportData.dailyLogs.slice().reverse().map((log, idx) => {
                    const pct = Math.min(100, Math.max(2, log.metrics.onHandBookingPercentage || 0));
                    return (
                      <div key={log.date} className="flex-1 flex flex-col items-center group h-full justify-end">
                        {/* Tooltip on Hover */}
                        <div className="opacity-0 group-hover:opacity-100 absolute -translate-y-24 bg-slate-900 text-white text-[9px] rounded px-1.5 py-1 pointer-events-none transition-opacity z-10 font-bold text-center border border-slate-700 font-mono shadow-md leading-normal">
                          {log.date}<br />
                          Occ: {pct}%<br />
                          {log.metrics.onHandBookingCount} Rms
                        </div>

                        {/* Visual bar */}
                        <div 
                          style={{ height: `${pct}%` }}
                          className={`w-full rounded-t-sm transition-all duration-300 group-hover:opacity-95 ${
                            pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-sky-500' : pct >= 30 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                        ></div>

                        <span className="text-[8px] text-slate-400 font-mono mt-1 scale-90 sm:scale-100 max-w-[12px] rotate-45 transform origin-left whitespace-nowrap pt-2">
                          {log.date.substring(8)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap text-[9px] font-bold gap-3 pt-4 border-t border-sand-200 justify-center">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Tinggi (≥75%)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-sky-500"></span> Sehat (50-74%)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Sedang (30-49%)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Rendah (&lt;30%)</span>
                </div>
              </div>

              {/* List of daily tables entered inside the Month */}
              <div className="space-y-3">
                <h4 className="text-xs font-black font-mono uppercase tracking-wider text-slate-805">
                  📁 Daftar Transaksi Masuk pada Bulan: {selectedMonth}
                </h4>

                <div className="overflow-x-auto border border-sand-200 rounded-2xl bg-white shadow-2xs">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-sand-200">
                        <th className="px-4 py-3 text-left font-display font-black text-slate-800 uppercase tracking-wider text-[10px] bg-slate-102">Tanggal</th>
                        <th className="px-4 py-3 text-center font-display font-black text-slate-800 uppercase tracking-wider text-[10px] bg-slate-102">Terjual (Rms)</th>
                        <th className="px-4 py-3 text-center font-display font-black text-slate-800 uppercase tracking-wider text-[10px] bg-slate-102">Okupansi (%)</th>
                        <th className="px-4 py-3 text-center font-display font-black text-slate-800 uppercase tracking-wider text-[10px] bg-slate-102">Arrivals / Departures</th>
                        <th className="px-4 py-3 text-right font-display font-black text-slate-800 uppercase tracking-wider text-[10px] bg-slate-102">Best Available Rate</th>
                        <th className="px-4 py-3 text-center font-display font-black text-slate-800 uppercase tracking-wider text-[10px] bg-slate-102">Tamu VIP / Grup</th>
                        <th className="px-4 py-3 text-right font-display font-black text-slate-800 uppercase tracking-wider text-[10px] bg-slate-102">Revenue Taxi</th>
                        <th className="px-4 py-3 text-center font-display font-black text-slate-800 uppercase tracking-wider text-[10px] bg-slate-102">Layanan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand-100 font-medium">
                      {monthlyReportData.dailyLogs.map(log => {
                        // Find chronological previous day
                        const olderLogs = historyLogs.filter(l => l.date < log.date);
                        const prevLog = olderLogs.length > 0 
                          ? olderLogs.reduce((latest, current) => current.date > latest.date ? current : latest) 
                          : null;
                        const currentTaxiRev = log.metrics.taxiRevenue || 0;
                        const prevTaxiRev = prevLog?.metrics?.taxiRevenue || 0;
                        const taxiDiff = currentTaxiRev - prevTaxiRev;

                        return (
                          <tr key={log.date} className="hover:bg-sand-50/50 transition duration-150">
                            <td className="px-4 py-3.5 text-left font-semibold text-slate-900">
                              {translateDateStringLong(log.date)}
                            </td>
                            <td className="px-4 py-3.5 text-center font-bold font-mono">
                              {log.metrics.onHandBookingCount} Rms
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                                log.metrics.onHandBookingPercentage >= 75 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {log.metrics.onHandBookingPercentage}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono text-slate-600">
                              {log.metrics.totalArrivalsToday} Arr / {log.metrics.totalDeparturesToday} Dep
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-slate-800">
                              {formatIDR(log.metrics.barRateToday)}
                            </td>
                            <td className="px-4 py-3.5 text-center font-semibold text-slate-600">
                              {log.vipCount} VIP , {log.groupCount} Grup
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono">
                              <div className="font-bold text-slate-800">
                                {formatIDR(currentTaxiRev)}
                              </div>
                              {prevLog ? (
                                <div className={`text-[10px] font-bold flex items-center justify-end gap-1 ${
                                  taxiDiff > 0 
                                    ? 'text-emerald-600' 
                                    : taxiDiff < 0 
                                      ? 'text-rose-600' 
                                      : 'text-gray-400'
                                }`}>
                                  <span>
                                    {taxiDiff > 0 ? '▲' : taxiDiff < 0 ? '▼' : '●'}
                                  </span>
                                  <span>
                                    {taxiDiff === 0 ? '0' : `${taxiDiff > 0 ? '+' : ''}${formatIDR(taxiDiff)}`}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-[9px] text-gray-400 italic">Data sebelumnya N/A</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => { setSelectedDailyDate(log.date); setReportType('daily'); }}
                                className="text-[10px] font-bold text-red-600 group-hover:underline flex items-center gap-1 mx-auto hover:text-red-700 cursor-pointer"
                              >
                                <span>Buka Briefing</span>
                                <ArrowRight size={11} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-sand-250 rounded-2xl bg-slate-55 inline-block w-full">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <CalendarDays size={22} />
              </div>
              <div className="max-w-md mx-auto mt-3 space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">Belum Ada Rekaman Data Terarsip pada Bulan Ini ({selectedMonth})</h4>
                <p className="text-xs text-slate-500 leading-normal">
                  Sistem memerlukan sekurang-kurangnya 1 data terekam di harian agar rekapitulasi performa bulanan dinamis.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENT: 3. YEARLY REPORT SCREEN */}
      {reportType === 'yearly' && (
        <div className="space-y-6">
          {yearlyReportData ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Year stats summaries */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400">Rata-rata Okupansi Tahunan</span>
                  <p className="text-2xl font-black text-white">{yearlyReportData.avgOccupancy}%</p>
                </div>

                <div className="p-4 bg-slate-50 border border-sand-250 rounded-2xl space-y-1">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500">Akumulasi Rooms Sold</span>
                  <p className="text-2xl font-black text-slate-800">{yearlyReportData.totalRoomsSold} Rms</p>
                </div>

                <div className="p-4 bg-slate-50 border border-sand-250 rounded-2xl space-y-1">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500">Harga Kamar Terkonsolidasi</span>
                  <p className="text-md font-extrabold text-slate-800 mt-1.5">{formatIDR(yearlyReportData.avgBarRate)}</p>
                </div>

                <div className="p-4 bg-slate-50 border border-sand-250 rounded-2xl space-y-1">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500">Total Tamu Airport Check-in</span>
                  <p className="text-2xl font-black text-slate-800">{yearlyReportData.totalArrivals} Kamar</p>
                </div>
              </div>

              {/* Graphical representation year columns in CSS */}
              <div className="p-5 bg-white border border-sand-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-sand-100 pb-2">
                  <h4 className="text-xs font-black font-mono uppercase tracking-wider text-slate-750">
                    📊 Grafik Fluktuasi Okupansi Rata-rata per Bulan Tahun {selectedYear}
                  </h4>
                  <button
                    type="button"
                    onClick={handleExportSummaryExcel}
                    className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    Download Excel
                  </button>
                </div>

                {/* Pure responsive HTML visual vertical bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {yearlyReportData.monthlyDecomps.map(m => (
                    <div key={m.monthKey} className="p-3.5 bg-slate-50 border border-sand-250 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-850">{m.monthLabel}</span>
                        <span className="text-xs font-mono font-bold text-red-700">{m.avgOccupancy}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${m.avgOccupancy}%` }}
                          className={`h-full rounded-full ${
                            m.avgOccupancy >= 75 ? 'bg-emerald-500' : m.avgOccupancy >= 50 ? 'bg-sky-500' : 'bg-amber-500'
                          }`}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono font-medium">
                        <span>Recorded: {m.dayCount} Hari</span>
                        <span>Sold: {m.totalRoomsSold} Kamar</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-sand-250 rounded-2xl bg-slate-56">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <CalendarDays size={22} />
              </div>
              <div className="max-w-md mx-auto mt-3 space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">Belum Ada Sesi Singkronisasi Terarsip di Tahun Ini</h4>
                <p className="text-xs text-slate-500">Pilihlah pencatatan riwayat harian agar parameter tahunan terhimpun otomatis.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULL SNAPSHOT POPUP DETAIL DIALOG */}
      {activeDetailsRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-sand-200 rounded-3xl p-6 max-w-4xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="border-b border-sand-100 pb-3 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[9.5px] font-black tracking-widest bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 uppercase font-mono">
                  ARSIP DETAIL BOARD {activeDetailsRecord.date}
                </span>
                <h3 className="font-display font-black text-base text-slate-800 mt-1 capitalize leading-relaxed">
                  Morning Briefing: {translateDateStringLong(activeDetailsRecord.date)}
                </h3>
              </div>
              
              <button
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
                onClick={() => setActiveDetailsRecord(null)}
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Scrollable Body contents */}
            <div className="flex-1 overflow-y-auto py-5 space-y-6 scrollbar-none">
              
              {/* Summary stats badge rows */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 bg-red-50 text-center rounded-xl border border-red-100/65">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 font-mono">Okupansi</span>
                  <span className="block text-lg font-black text-slate-800">{activeDetailsRecord.metrics.onHandBookingPercentage}%</span>
                </div>
                <div className="p-3 bg-slate-50 text-center rounded-xl border border-sand-200">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 font-mono">Booked Nights</span>
                  <span className="block text-lg font-black text-slate-850">{activeDetailsRecord.metrics.onHandBookingCount} Rms</span>
                </div>
                <div className="p-3 bg-slate-50 text-center rounded-xl border border-sand-200">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 font-mono">Harga Kamar BAR</span>
                  <span className="block text-xs font-bold text-slate-850 mt-1.5 leading-normal truncate">{formatIDR(activeDetailsRecord.metrics.barRateToday)}</span>
                </div>
                <div className="p-3 bg-slate-50 text-center rounded-xl border border-sand-200">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 font-mono">Tamu VIP</span>
                  <span className="block text-lg font-black text-slate-850">{activeDetailsRecord.vipCount} Pax</span>
                </div>
                <div className="p-3 bg-slate-50 text-center rounded-xl border border-sand-200">
                  <span className="block text-[9px] uppercase font-bold text-slate-400 font-mono">Arrival / Depart</span>
                  <span className="block text-xs font-bold text-slate-850 mt-1.5 leading-normal">{activeDetailsRecord.metrics.totalArrivalsToday} Arr / {activeDetailsRecord.metrics.totalDeparturesToday} Dep</span>
                </div>
              </div>

              {/* Detailed tables listings */}
              
              {/* VIP Guests Detail Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-black font-mono uppercase text-slate-800 tracking-wider">
                  🌟 Tamu VIP & Permintaan Khusus
                </h4>
                {activeDetailsRecord.details?.vipGuests && activeDetailsRecord.details.vipGuests.length > 0 ? (
                  <div className="overflow-x-auto border border-sand-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-3 py-2 text-left text-[9px] uppercase text-slate-500 font-mono">Nama Tamu VIP</th>
                          <th className="px-3 py-2 text-center text-[9px] uppercase text-slate-500 font-mono">Kamar</th>
                          <th className="px-3 py-2 text-center text-[9px] uppercase text-slate-500 font-mono">Tipe Kamar</th>
                          <th className="px-3 py-2 text-[9px] uppercase text-slate-500 font-mono">Remarks / Request Khusus</th>
                          <th className="px-3 py-2 text-center text-[9px] uppercase text-slate-500 font-mono">Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sand-100">
                        {activeDetailsRecord.details.vipGuests.map(v => (
                          <tr key={v.id}>
                            <td className="px-3 py-2.5 font-bold text-slate-850">{v.name}</td>
                            <td className="px-3 py-2.5 text-center font-mono">Room {v.roomNumber || '-'}</td>
                            <td className="px-3 py-2.5 text-center text-slate-500">{v.roomType}</td>
                            <td className="px-3 py-2.5 text-slate-650">{v.requests || '-'}</td>
                            <td className="px-3 py-2.5 text-center font-semibold text-rose-700">{v.vipLevel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Tidak ada tamu VIP yang dicatat untuk tanggal ini.</p>
                )}
              </div>

              {/* Groups Detail Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-black font-mono uppercase text-slate-800 tracking-wider">
                  👥 Rombongan Grup Masuk
                </h4>
                {activeDetailsRecord.details?.groups && activeDetailsRecord.details.groups.length > 0 ? (
                  <div className="overflow-x-auto border border-sand-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-3 py-2 text-left text-[9px] uppercase text-slate-500 font-mono">Nama Rombongan</th>
                          <th className="px-3 py-2 text-center text-[9px] uppercase text-slate-500 font-mono">Kamar</th>
                          <th className="px-3 py-2 text-center text-[9px] uppercase text-slate-500 font-mono">Pax</th>
                          <th className="px-3 py-2 text-center text-[9px] uppercase text-slate-500 font-mono">ETA</th>
                          <th className="px-3 py-2 text-[9px] uppercase text-slate-500 font-mono">Catatan Rombongan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sand-100">
                        {activeDetailsRecord.details.groups.map(g => (
                          <tr key={g.id}>
                            <td className="px-3 py-2.5 font-bold text-slate-850">{g.groupName}</td>
                            <td className="px-3 py-2.5 text-center font-mono">{g.roomsCount} Rms</td>
                            <td className="px-3 py-2.5 text-center font-mono">{g.guestCount} Pax</td>
                            <td className="px-3 py-2.5 text-center text-slate-505">{g.eta}</td>
                            <td className="px-3 py-2.5 text-slate-650">{g.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Tidak ada rombongan untuk tanggal ini.</p>
                )}
              </div>

              {/* Departmental tasks Checklist */}
              <div className="space-y-2">
                <h4 className="text-xs font-black font-mono uppercase text-slate-800 tracking-wider">
                  📋 Pekerjaan Operasional & Checklist Sektoral HOD
                </h4>
                {activeDetailsRecord.details?.otherOperational && activeDetailsRecord.details.otherOperational.length > 0 ? (
                  <div className="overflow-x-auto border border-sand-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-3 py-2 text-left text-[9px] uppercase text-slate-500 font-mono">Nama Tugas</th>
                          <th className="px-3 py-2 text-center text-[9px] uppercase text-slate-500 font-mono">Kategori</th>
                          <th className="px-3 py-2 text-center text-[9px] uppercase text-slate-500 font-mono">Prioritas</th>
                          <th className="px-3 py-2 text-[9px] uppercase text-slate-500 font-mono">Keterangan</th>
                          <th className="px-3 py-2 text-center text-[9px] uppercase text-slate-500 font-mono">Status Akhir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sand-100">
                        {activeDetailsRecord.details.otherOperational.map(o => (
                          <tr key={o.id}>
                            <td className="px-3 py-2.5 font-bold text-slate-850">{o.title}</td>
                            <td className="px-3 py-2.5 text-center"><span className="bg-slate-100 border border-sand-200 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600">{o.category}</span></td>
                            <td className="px-3 py-2.5 text-center"><span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              o.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}>{o.priority}</span></td>
                            <td className="px-3 py-2.5 text-slate-605">{o.notes || '-'}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                o.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>{o.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Tidak ada tugas sektoral untuk tanggal ini.</p>
                )}
              </div>

            </div>

            {/* Modal Footer with Action Buttons */}
            <div className="border-t border-sand-100 pt-3 flex flex-col sm:flex-row gap-2 justify-between items-center shrink-0">
              <span className="text-[10px] text-slate-400 font-medium">Auto-Archived by HOD System Portal Nagoya Batam</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintPastReport(activeDetailsRecord)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 border border-slate-755 text-white text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer size={13} />
                  <span>Cetak Form Lengkap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailsRecord(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Tutup Jendela Detail
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
