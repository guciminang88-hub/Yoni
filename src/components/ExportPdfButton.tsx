import React from 'react';
import { BriefingData } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Printer } from 'lucide-react';

interface ExportPdfButtonProps {
  data: BriefingData;
  hotelName: string;
  portalName: string;
}

export function ExportPdfButton({ data, hotelName, portalName }: ExportPdfButtonProps) {
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait' });
    const localDate = new Date();
    const dateString = localDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // 1. Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${hotelName} - ${portalName}`, 14, 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal Laporan: ${dateString}`, 14, 21);
    
    let yPos = 28;

    // Calculate dynamic values for today's occupancy
    const capacity = Number(localStorage.getItem('morning_briefing_hotel_capacity') || 209);
    const availRooms = Math.max(1, capacity);
    const calculatedPercentage = Math.round(((data.metrics.onHandBookingCount || 0) / availRooms) * 100);

    // 2. Metrics / Total Kamar
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Kinerja Hotel (Metrics)', 14, yPos);
    
    const metricsData = [
      ['Rata-Rata BAR Hari Ini', `Rp ${data.metrics.barRateToday.toLocaleString('id-ID')}`],
      ['Okupansi Hari Ini', `${calculatedPercentage}% (${data.metrics.onHandBookingCount} Rms Terjual / ${availRooms} Rms Tersedia)`],
      ['Total Kedatangan', `${data.metrics.totalArrivalsToday} Orang / Kamar`],
      ['Total Keberangkatan', `${data.metrics.totalDeparturesToday} Orang / Kamar`],
      ['Out of Order (OOO)', `${data.metrics.oooRoomsCount} Kamar`],
      ['Revenue Taxi', `Rp ${(data.metrics.taxiRevenue || 0).toLocaleString('id-ID')}`]
    ];

    autoTable(doc, {
      startY: yPos + 2,
      head: [['Metrik', 'Nilai']],
      body: metricsData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [40, 116, 166], minCellHeight: 5 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 6;

    // 3. Status Okupansi Bulanan
    if (data.forecasts && data.forecasts.length > 0) {
      if (yPos > 280) { doc.addPage(); yPos = 15; }
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Status Okupansi Bulanan', 14, yPos);
      
      const forecastData = data.forecasts.map(f => [
        f.monthName,
        `${f.percentage}%`,
        `${f.bookedRooms} Rms`
      ]);

      autoTable(doc, {
        startY: yPos + 2,
        head: [['Bulan', 'Persentase', 'Kamar Terjual']],
        body: forecastData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [180, 130, 40], minCellHeight: 5 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 6;
    }

    // 4. Forecast 7 Hari
    if (data.forecasts7Days && data.forecasts7Days.length > 0) {
      if (yPos > 280) { doc.addPage(); yPos = 15; }
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Forecast Okupansi 7 Hari', 14, yPos);
      
      const forecast7Data = data.forecasts7Days.map(f => [
        `${f.dayName}, ${f.date}`,
        `${f.percentage}%`,
        `${f.bookedRooms} Rms`
      ]);

      autoTable(doc, {
        startY: yPos + 2,
        head: [['Tanggal', 'Persentase', 'Kendala/OnHand']],
        body: forecast7Data,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [40, 116, 166], minCellHeight: 5 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 6;
    }

    // 5. Tamu VIP
    if (data.vipGuests && data.vipGuests.length > 0) {
      if (yPos > 280) { doc.addPage(); yPos = 15; }
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Daftar Tamu VIP', 14, yPos);
      
      const vipData = data.vipGuests.map(vip => [
        vip.name,
        vip.vipLevel,
        vip.roomType,
        vip.roomNumber,
        vip.requests || '-'
      ]);

      autoTable(doc, {
        startY: yPos + 2,
        head: [['Nama Tamu', 'Level', 'Tipe Kamar', 'Kamar', 'Request']],
        body: vipData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [142, 68, 173], minCellHeight: 5 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 6;
    }

    // 6. Rombongan / Groups
    if (data.groups && data.groups.length > 0) {
      if (yPos > 280) { doc.addPage(); yPos = 15; }
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Rombongan (Groups)', 14, yPos);
      
      const groupData = data.groups.map(g => [
        g.groupName,
        `${g.roomsCount} Kamar`,
        `${g.guestCount} Orang`,
        g.eta,
        g.remarks || '-'
      ]);

      autoTable(doc, {
        startY: yPos + 2,
        head: [['Rombongan', 'Kamar', 'Pax', 'ETA', 'Keterangan']],
        body: groupData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [39, 174, 96], minCellHeight: 5 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 6;
    }

    // 7. Transport & Jemputan
    if (data.transports && data.transports.length > 0) {
      if (yPos > 280) { doc.addPage(); yPos = 15; }
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Layanan Transportasi', 14, yPos);
      
      const transData = data.transports.map(t => [
        t.guestName,
        t.roomNumber,
        t.type,
        t.time,
        t.carDetails,
        t.status
      ]);

      autoTable(doc, {
        startY: yPos + 2,
        head: [['Nama Tamu', 'Kamar', 'Tipe', 'Waktu', 'Kendaraan', 'Status']],
        body: transData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [211, 84, 0], minCellHeight: 5 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 6;
    }

    // 8. Longstay
    if (data.longstayGuests && data.longstayGuests.length > 0) {
      if (yPos > 280) { doc.addPage(); yPos = 15; }
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Tamu Longstay', 14, yPos);
      
      const lsData = data.longstayGuests.map(ls => [
        ls.guestName,
        ls.roomNumber,
        ls.company,
        ls.arrivalDate,
        ls.departureDate
      ]);

      autoTable(doc, {
        startY: yPos + 2,
        head: [['Nama Tamu', 'Kamar', 'Perusahaan', 'Kedatangan', 'Keberangkatan']],
        body: lsData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], minCellHeight: 5 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 6;
    }

    // 9. Lain-lain / Operasional
    if (data.otherOperational && data.otherOperational.length > 0) {
      if (yPos > 280) { doc.addPage(); yPos = 15; }
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Catatan Operasional', 14, yPos);
      
      const opData = data.otherOperational.map(op => [
        op.category,
        op.title,
        op.notes,
        op.priority,
        op.status
      ]);

      autoTable(doc, {
        startY: yPos + 2,
        head: [['Dept', 'Topik', 'Catatan', 'Prioritas', 'Status']],
        body: opData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [100, 100, 100], minCellHeight: 5 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 6;
    }

    // 10. Penggunaan Mobil Concierge
    if (data.conciergeLogs && data.conciergeLogs.length > 0) {
      if (yPos > 280) { doc.addPage(); yPos = 15; }
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Catatan Penggunaan Mobil Concierge', 14, yPos);
      
      const cLogData = data.conciergeLogs.map(cl => [
        cl.no,
        cl.tanggal,
        cl.departemen,
        cl.tujuan,
        cl.namaDriver,
        cl.noKendaraan,
        cl.kmOut,
        cl.kmIn,
        cl.totalKm
      ]);

      autoTable(doc, {
        startY: yPos + 2,
        head: [['No', 'Tanggal', 'Dept', 'Tujuan', 'Driver', 'No Kend', 'KM Out', 'KM In', 'Total KM']],
        body: cLogData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [60, 120, 180], minCellHeight: 5 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 6;
    }

    // Footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Halaman ${i} dari ${pageCount} | Dibuat pada: ${new Date().toLocaleString('id-ID')}`, 14, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`Laporan_Briefing_${dateString.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <button
      onClick={exportPDF}
      className="text-red-600 hover:text-red-700 text-[11px] font-extrabold tracking-tight inline-flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer underline decoration-red-600/30 underline-offset-2"
      title="Cetak/Export PDF Semua Data Laporan"
    >
      <Printer size={12} />
      <span>Cetak Laporan PDF</span>
    </button>
  );
}
