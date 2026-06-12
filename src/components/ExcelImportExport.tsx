import React, { useState, useRef } from 'react';
import XLSX from 'xlsx-js-style';
import { BriefingData, GeneralMetrics, VipGuest, IncomingGroup, ForecastMonth, GuestTransport, OtherOperational, LongstayGuest } from '../types';
import { FileUp, FileDown, CheckCircle2, AlertCircle, RefreshCw, Layers, Check, ChevronRight } from 'lucide-react';

interface ExcelImportExportProps {
  data: BriefingData;
  onImportComplete: (newData: BriefingData) => void;
  canEdit?: boolean;
  hotelName?: string;
  portalName?: string;
}

export function ExcelImportExport({ 
  data, 
  onImportComplete, 
  canEdit = true, 
  hotelName = 'Harper Premier Nagoya Batam', 
  portalName = 'morning briefing list' 
}: ExcelImportExportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    metrics?: Partial<GeneralMetrics>;
    vipGuests?: VipGuest[];
    groups?: IncomingGroup[];
    forecasts?: ForecastMonth[];
    transports?: GuestTransport[];
    otherOperational?: OtherOperational[];
    longstayGuests?: LongstayGuest[];
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper helper to generate ID
  const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

  // Normalize string for safety
  const cleanStr = (val: any): string => {
    if (val === undefined || val === null) return '';
    return String(val).trim();
  };

  // Convert Excel Sheet to JSON safely
  const sheetToArr = (sheet: XLSX.WorkSheet): any[] => {
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  };

  // Process uploaded Excel workbook
  const processFile = (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result;
        if (!arrayBuffer) throw new Error("Gagal membaca file.");

        const workbook = XLSX.read(new Uint8Array(arrayBuffer as ArrayBuffer), { type: 'array' });
        
        let parsedMetrics: Partial<GeneralMetrics> = {};
        let parsedVips: VipGuest[] = [];
        let parsedGroups: IncomingGroup[] = [];
        let parsedForecasts: ForecastMonth[] = [];
        let parsedTransports: GuestTransport[] = [];
        let parsedOperations: OtherOperational[] = [];
        let parsedLongstays: LongstayGuest[] = [];

        // Loop through worksheets to parse by name or contents
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          
          // Auto-detect the starting index of the actual table headers (skipping upper metadata blocks if present)
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(15, rawRows.length); i++) {
            const cells = rawRows[i].map(c => cleanStr(c).toLowerCase());
            if (
              cells.some(c => 
                c.includes('parameter utama') || 
                c.includes('nama tamu vip') || c.includes('vip level') ||
                c.includes('nama grup') || c.includes('group name') ||
                c.includes('bulan proyeksi') || c.includes('persentase okupansi') ||
                c.includes('shuttling') || c.includes('penerbangan') ||
                c.includes('judul tugas') || c.includes('prioritas') ||
                c.includes('tamu longstay') || c.includes('longstay') ||
                c.includes('nama tamu')
              )
            ) {
              headerRowIndex = i;
              break;
            }
          }

          const rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: '' });
          const normalizedSheetName = sheetName.toLowerCase().replace(/[\s_-]/g, '');

          // 1. MODULE: METRICS
          if (
            normalizedSheetName.includes('metrik') || 
            normalizedSheetName.includes('metric')
          ) {
            rows.forEach((row: any) => {
              // Read key-value columns (Col A: Key/Parameter, Col B: Value)
              const keys = Object.keys(row);
              if (keys.length >= 2) {
                const paramName = cleanStr(row[keys[0]]).toLowerCase();
                const paramVal = Number(row[keys[1]]);

                if (!isNaN(paramVal)) {
                  if (paramName.includes('terjual') || paramName.includes('sold') || paramName.includes('handbooking')) {
                    parsedMetrics.onHandBookingCount = paramVal;
                  } else if (paramName.includes('datang') || paramName.includes('arrival')) {
                    parsedMetrics.totalArrivalsToday = paramVal;
                  } else if (paramName.includes('pergi') || paramName.includes('departure')) {
                    parsedMetrics.totalDeparturesToday = paramVal;
                  } else if (paramName.includes('bar') || paramName.includes('rate') || paramName.includes('tarif')) {
                    parsedMetrics.barRateToday = paramVal;
                  } else if (paramName.includes('rusak') || paramName.includes('ooo') || paramName.includes('order')) {
                    parsedMetrics.oooRoomsCount = paramVal;
                  } else if (paramName.includes('taxi') || paramName.includes('taksi') || paramName.includes('revenue')) {
                    parsedMetrics.taxiRevenue = paramVal;
                  }
                }
              }
            });
          }

          // 2. MODULE: VIP GUESTS
          else if (
            normalizedSheetName.includes('vip') || 
            normalizedSheetName.includes('tamu')
          ) {
            rows.forEach((row: any) => {
              const keys = Object.keys(row);
              const mappedRow: any = {};
              keys.forEach(k => {
                const normalizedKey = k.toLowerCase().replace(/[\s_-]/g, '');
                if (normalizedKey.includes('nama') || normalizedKey.includes('name') || normalizedKey.includes('tamu')) {
                  mappedRow.name = cleanStr(row[k]);
                } else if (normalizedKey.includes('tipe') || normalizedKey.includes('type')) {
                  mappedRow.roomType = cleanStr(row[k]);
                } else if (normalizedKey.includes('nomor') || normalizedKey.includes('roomnumber') || normalizedKey.includes('kamar')) {
                  mappedRow.roomNumber = cleanStr(row[k]);
                } else if (normalizedKey.includes('eta') || normalizedKey.includes('jamdatang') || normalizedKey.includes('waktu')) {
                  mappedRow.eta = cleanStr(row[k]);
                } else if (normalizedKey.includes('permintaan') || normalizedKey.includes('request') || normalizedKey.includes('catatan')) {
                  mappedRow.requests = cleanStr(row[k]);
                } else if (normalizedKey.includes('level') || normalizedKey.includes('viplevel') || normalizedKey.includes('vip')) {
                  mappedRow.vipLevel = cleanStr(row[k]);
                }
              });

              if (mappedRow.name) {
                parsedVips.push({
                  id: generateId('vip'),
                  name: mappedRow.name,
                  roomType: mappedRow.roomType || 'Standard Room',
                  roomNumber: mappedRow.roomNumber || '-',
                  eta: mappedRow.eta || '14:00',
                  requests: mappedRow.requests || '-',
                  vipLevel: mappedRow.vipLevel || 'VIP 1'
                });
              }
            });
          }

          // 3. MODULE: INCOMING GROUPS
          else if (
            normalizedSheetName.includes('group') || 
            normalizedSheetName.includes('grup') ||
            normalizedSheetName.includes('rombongan')
          ) {
            rows.forEach((row: any) => {
              const keys = Object.keys(row);
              const mappedRow: any = {};
              keys.forEach(k => {
                const normalizedKey = k.toLowerCase().replace(/[\s_-]/g, '');
                if (normalizedKey.includes('namagrup') || normalizedKey.includes('groupname') || normalizedKey.includes('nama') || normalizedKey.includes('grup')) {
                  mappedRow.groupName = cleanStr(row[k]);
                } else if (normalizedKey.includes('jumlahkamar') || normalizedKey.includes('kamarcount') || normalizedKey.includes('room') || normalizedKey.includes('kamar')) {
                  mappedRow.roomsCount = Number(row[k]);
                } else if (normalizedKey.includes('jumlahtamu') || normalizedKey.includes('pax') || normalizedKey.includes('guest') || normalizedKey.includes('tamu')) {
                  mappedRow.guestCount = Number(row[k]);
                } else if (normalizedKey.includes('eta') || normalizedKey.includes('jam') || normalizedKey.includes('waktu')) {
                  mappedRow.eta = cleanStr(row[k]);
                } else if (normalizedKey.includes('catatan') || normalizedKey.includes('remark') || normalizedKey.includes('keterangan')) {
                  mappedRow.remarks = cleanStr(row[k]);
                }
              });

              if (mappedRow.groupName) {
                parsedGroups.push({
                  id: generateId('grp'),
                  groupName: mappedRow.groupName,
                  roomsCount: isNaN(mappedRow.roomsCount) ? 0 : mappedRow.roomsCount,
                  guestCount: isNaN(mappedRow.guestCount) ? 0 : mappedRow.guestCount,
                  eta: mappedRow.eta || '14:00',
                  remarks: mappedRow.remarks || '-'
                });
              }
            });
          }

          // 4. MODULE: FORECAST MONTHS
          else if (
            normalizedSheetName.includes('forecast') || 
            normalizedSheetName.includes('ramalan') ||
            normalizedSheetName.includes('proyeksi')
          ) {
            rows.forEach((row: any) => {
              const keys = Object.keys(row);
              const mappedRow: any = {};
              keys.forEach(k => {
                const normalizedKey = k.toLowerCase().replace(/[\s_-]/g, '');
                if (normalizedKey.includes('bulan') || normalizedKey.includes('month') || normalizedKey.includes('nama')) {
                  mappedRow.monthName = cleanStr(row[k]);
                } else if (normalizedKey.includes('persen') || normalizedKey.includes('percent') || normalizedKey.includes('okupansi') || normalizedKey.includes('%')) {
                  mappedRow.percentage = Number(row[k]);
                } else if (normalizedKey.includes('kamar') || normalizedKey.includes('booked') || normalizedKey.includes('rooms') || normalizedKey.includes('terboking')) {
                  mappedRow.bookedRooms = Number(row[k]);
                }
              });

              if (mappedRow.monthName) {
                parsedForecasts.push({
                  id: generateId('fore'),
                  monthName: mappedRow.monthName,
                  percentage: isNaN(mappedRow.percentage) ? 0 : mappedRow.percentage,
                  bookedRooms: isNaN(mappedRow.bookedRooms) ? 0 : mappedRow.bookedRooms
                });
              }
            });
          }

          // 5. MODULE: GUEST TRANSPORTS
          else if (
            normalizedSheetName.includes('transport') || 
            normalizedSheetName.includes('penjemputan') ||
            normalizedSheetName.includes('shuttle')
          ) {
            rows.forEach((row: any) => {
              const keys = Object.keys(row);
              const mappedRow: any = {};
              keys.forEach(k => {
                const normalizedKey = k.toLowerCase().replace(/[\s_-]/g, '');
                if (normalizedKey.includes('namatamu') || normalizedKey.includes('guest') || normalizedKey.includes('nama')) {
                  mappedRow.guestName = cleanStr(row[k]);
                } else if (normalizedKey.includes('nomorkamar') || normalizedKey.includes('room') || normalizedKey.includes('kamar')) {
                  mappedRow.roomNumber = cleanStr(row[k]);
                } else if (normalizedKey.includes('jenis') || normalizedKey.includes('type') || normalizedKey.includes('shuttle')) {
                  const typeVal = cleanStr(row[k]).toLowerCase();
                  mappedRow.type = typeVal.includes('drop') ? 'Drop-off' : 'Pickup';
                } else if (normalizedKey.includes('waktu') || normalizedKey.includes('time') || normalizedKey.includes('jam')) {
                  mappedRow.time = cleanStr(row[k]);
                } else if (normalizedKey.includes('penerbangan') || normalizedKey.includes('flight')) {
                  mappedRow.flightNumber = cleanStr(row[k]);
                } else if (normalizedKey.includes('mobil') || normalizedKey.includes('car') || normalizedKey.includes('kendaraan')) {
                  mappedRow.carDetails = cleanStr(row[k]);
                } else if (normalizedKey.includes('status')) {
                  const st = cleanStr(row[k]);
                  mappedRow.status = st.includes('way') ? 'On the way' : st.includes('Comp') ? 'Completed' : 'Pending';
                } else if (normalizedKey.includes('penumpang') || normalizedKey.includes('pax') || normalizedKey.includes('passengers')) {
                  mappedRow.passengerCount = Number(row[k]);
                }
              });

              if (mappedRow.guestName) {
                parsedTransports.push({
                  id: generateId('tf'),
                  guestName: mappedRow.guestName,
                  roomNumber: mappedRow.roomNumber || '-',
                  type: mappedRow.type || 'Pickup',
                  time: mappedRow.time || '12:00',
                  flightNumber: mappedRow.flightNumber || '-',
                  carDetails: mappedRow.carDetails || '-',
                  status: mappedRow.status || 'Pending',
                  passengerCount: isNaN(mappedRow.passengerCount) ? 2 : mappedRow.passengerCount
                });
              }
            });
          }

          // 6. MODULE: OPERATIONAL LOGS / CATATAN
          else if (
            normalizedSheetName.includes('operasional') || 
            normalizedSheetName.includes('operational') ||
            normalizedSheetName.includes('catatan') ||
            normalizedSheetName.includes('checklist')
          ) {
            rows.forEach((row: any) => {
              const keys = Object.keys(row);
              const mappedRow: any = {};
              keys.forEach(k => {
                const normalizedKey = k.toLowerCase().replace(/[\s_-]/g, '');
                if (normalizedKey.includes('judul') || normalizedKey.includes('title') || normalizedKey.includes('tugas') || normalizedKey.includes('kegiatan')) {
                  mappedRow.title = cleanStr(row[k]);
                } else if (normalizedKey.includes('catatan') || normalizedKey.includes('notes') || normalizedKey.includes('keterangan')) {
                  mappedRow.notes = cleanStr(row[k]);
                } else if (normalizedKey.includes('kategori') || normalizedKey.includes('category') || normalizedKey.includes('dept')) {
                  mappedRow.category = cleanStr(row[k]).toUpperCase();
                } else if (normalizedKey.includes('prioritas') || normalizedKey.includes('priority')) {
                  const prio = cleanStr(row[k]).toLowerCase();
                  mappedRow.priority = prio.includes('high') ? 'High' : prio.includes('med') ? 'Medium' : 'Low';
                } else if (normalizedKey.includes('status')) {
                  const st = cleanStr(row[k]).toLowerCase();
                  mappedRow.status = st.includes('comp') ? 'Completed' : 'Pending';
                }
              });

              if (mappedRow.title) {
                parsedOperations.push({
                  id: generateId('ops'),
                  title: mappedRow.title,
                  notes: mappedRow.notes || '-',
                  category: mappedRow.category || 'GEN',
                  priority: mappedRow.priority || 'Medium',
                  status: mappedRow.status || 'Pending'
                });
              }
            });
          }

          // 7. MODULE: LONGSTAY GUESTS
          else if (
            normalizedSheetName.includes('longstay') || 
            normalizedSheetName.includes('tamu_longstay') ||
            normalizedSheetName.includes('long')
          ) {
            rows.forEach((row: any) => {
              const keys = Object.keys(row);
              const mappedRow: any = {};
              keys.forEach(k => {
                const normalizedKey = k.toLowerCase().replace(/[\s_-]/g, '');
                if (normalizedKey.includes('namatamu') || normalizedKey.includes('guest') || normalizedKey.includes('nama')) {
                  mappedRow.guestName = cleanStr(row[k]);
                } else if (normalizedKey.includes('arrival') || normalizedKey.includes('kedatangan') || normalizedKey.includes('masuk')) {
                  mappedRow.arrivalDate = cleanStr(row[k]);
                } else if (normalizedKey.includes('departure') || normalizedKey.includes('keberangkatan') || normalizedKey.includes('keluar')) {
                  mappedRow.departureDate = cleanStr(row[k]);
                } else if (normalizedKey.includes('perusahaan') || normalizedKey.includes('company') || normalizedKey.includes('kantor')) {
                  mappedRow.company = cleanStr(row[k]);
                } else if (normalizedKey.includes('nomorkamar') || normalizedKey.includes('room') || normalizedKey.includes('kamar')) {
                  mappedRow.roomNumber = cleanStr(row[k]);
                }
              });

              if (mappedRow.guestName) {
                parsedLongstays.push({
                  id: generateId('ls'),
                  guestName: mappedRow.guestName,
                  arrivalDate: mappedRow.arrivalDate || '-',
                  departureDate: mappedRow.departureDate || '-',
                  company: mappedRow.company || '-',
                  roomNumber: mappedRow.roomNumber || '-'
                });
              }
            });
          }
        });

        // Pack the result
        const previewResult: any = {};
        let dataCount = 0;

        if (Object.keys(parsedMetrics).length > 0) {
          previewResult.metrics = parsedMetrics;
          dataCount++;
        }
        if (parsedVips.length > 0) {
          previewResult.vipGuests = parsedVips;
          dataCount++;
        }
        if (parsedGroups.length > 0) {
          previewResult.groups = parsedGroups;
          dataCount++;
        }
        if (parsedForecasts.length > 0) {
          previewResult.forecasts = parsedForecasts;
          dataCount++;
        }
        if (parsedTransports.length > 0) {
          previewResult.transports = parsedTransports;
          dataCount++;
        }
        if (parsedOperations.length > 0) {
          previewResult.otherOperational = parsedOperations;
          dataCount++;
        }
        if (parsedLongstays.length > 0) {
          previewResult.longstayGuests = parsedLongstays;
          dataCount++;
        }

        if (dataCount === 0) {
          throw new Error("Format tab spreadsheet Excel tidak sesuai. Mohon unduh dan gunakan template Excel resmi.");
        }

        setImportPreview(previewResult);
        setSuccessMsg("File Excel berhasil dipindai! Silakan lihat pratinjau data di bawah ini.");
      } catch (err: any) {
        setErrorMsg(err.message || "Gagal memproses file Excel. Pastikan format kolom sesuai.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Drag and drop events
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
      processFile(file);
    } else {
      setErrorMsg("Mohon lampirkan file Excel yang valid (.xlsx/.xls).");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Submit imported data into the app data
  const handleApplyImport = () => {
    if (!importPreview) return;

    // Merge or overwrite columns based on imported items
    const updatedData: BriefingData = { ...data };

    if (importPreview.metrics) {
      updatedData.metrics = {
        ...updatedData.metrics,
        ...importPreview.metrics,
      };

      // Recalculate dynamic occupancy percentage automatically
      const ooo = updatedData.metrics.oooRoomsCount || 0;
      const capacity = Number(localStorage.getItem('morning_briefing_hotel_capacity')) || 200;
      const avail = Math.max(1, capacity);
      updatedData.metrics.onHandBookingPercentage = Math.round(((updatedData.metrics.onHandBookingCount || 0) / avail) * 100);
    }

    if (importPreview.vipGuests) {
      updatedData.vipGuests = importPreview.vipGuests;
    }
    if (importPreview.groups) {
      updatedData.groups = importPreview.groups;
    }
    if (importPreview.forecasts) {
      updatedData.forecasts = importPreview.forecasts;
    }
    if (importPreview.transports) {
      updatedData.transports = importPreview.transports;
    }
    if (importPreview.otherOperational) {
      updatedData.otherOperational = importPreview.otherOperational;
    }
    if (importPreview.longstayGuests) {
      updatedData.longstayGuests = importPreview.longstayGuests;
    }

    onImportComplete(updatedData);
    setImportPreview(null);
    setSuccessMsg("Selamat! Seluruh data Excel berhasil diimpor dan disinkronkan ke seluruh database cloud secara otomatis.");

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Custom styled sheet builder with metadata title, colored headers, custom widths, and center alignment
  const createStyledSheet = (
    reportTitle: string,
    headers: string[],
    dataRows: any[][],
    colStyles: { wch: number }[]
  ) => {
    const aoa: any[][] = [];

    // Row 1: Report Title
    aoa.push([reportTitle.toUpperCase()]);
    // Row 2: Hotel Identity
    aoa.push([`NAMA HOTEL: ${hotelName.toUpperCase()} | PORTAL: ${portalName.toUpperCase()}`]);
    // Row 3: Generation Date
    const longDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    aoa.push([`TANGGAL UNDUH TEMPLATE: ${longDate.toUpperCase()}`]);
    // Row 4: Integrity
    aoa.push([`FORM KONTROL DATA EXCEL - HARAP TIDAK MENGUBAH URUTAN KOLOM DI LEVEL HEADER`]);
    // Row 5: Empty Spacer Row
    aoa.push([]);
    // Row 6: Table Header Row
    aoa.push(headers);

    // Data rows
    dataRows.forEach(row => {
      aoa.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Apply column widths and hide unused columns past headers length (up to 40 columns)
    const extendedColStyles = [...colStyles];
    for (let c = headers.length; c < 40; c++) {
      extendedColStyles.push({ wch: 8, hidden: true } as any);
    }
    ws['!cols'] = extendedColStyles;

    // Set custom row heights and hide unused rows (up to 200 rows)
    const rowStyles: any[] = [];
    for (let r = 0; r < aoa.length; r++) {
      if (r === 0) rowStyles.push({ hpt: 30 }); // Title
      else if (r === 1 || r === 2 || r === 3) rowStyles.push({ hpt: 18 }); // Subtitle metadata block
      else if (r === 4) rowStyles.push({ hpt: 12 }); // Spacing
      else if (r === 5) rowStyles.push({ hpt: 26 }); // Table headers
      else rowStyles.push({ hpt: 22 }); // Data rows
    }
    for (let r = aoa.length; r < 200; r++) {
      rowStyles.push({ hpt: 15, hidden: true });
    }
    ws['!rows'] = rowStyles;

    // Hide extra unused grey gridlines in the sheet view
    ws['!views'] = [
      { showGridLines: false }
    ];

    // Apply Merges for Row 1 to Row 4 (to clear the cell borders and make titles beautifully spread across columns)
    const lastColIndex = Math.max(2, headers.length - 1);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIndex } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: lastColIndex } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: lastColIndex } }
    ];

    const ref = ws['!ref'] || 'A1:A1';
    const range = XLSX.utils.decode_range(ref);

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        if (!cell) continue;

        // Initialize style structure
        cell.s = {
          font: {
            name: "Arial",
            sz: 10,
            bold: false,
            color: { rgb: "334155" }
          },
          alignment: {
            vertical: "center"
          }
        };

        // Header Title Block Styles (Rows 1 to 4)
        if (r === 0) {
          cell.s.font = {
            name: "Arial",
            sz: 14,
            bold: true,
            color: { rgb: "1E3A8A" } // Dark Royal Blue Navy
          };
          cell.s.alignment = {
            horizontal: "left",
            vertical: "center"
          };
        } else if (r === 1) {
          cell.s.font = {
            name: "Arial",
            sz: 10,
            bold: true,
            color: { rgb: "D97706" } // Amber Golden
          };
          cell.s.alignment = {
            horizontal: "left",
            vertical: "center"
          };
        } else if (r === 2) {
          cell.s.font = {
            name: "Arial",
            sz: 9,
            italic: true,
            color: { rgb: "4B5563" } // Soft Gray
          };
          cell.s.alignment = {
            horizontal: "left",
            vertical: "center"
          };
        } else if (r === 3) {
          cell.s.font = {
            name: "Arial",
            sz: 8.5,
            bold: true,
            color: { rgb: "0D9488" } // Teal Green
          };
          cell.s.alignment = {
            horizontal: "left",
            vertical: "center"
          };
        } 
        // Row 5: Empty Spacer - skip styling

        // Row 6: TABLE HEADERS (Beautiful royal blue fill, white centered bold text, sturdy borders)
        else if (r === 5) {
          cell.s = {
            font: {
              name: "Arial",
              sz: 10,
              bold: true,
              color: { rgb: "FFFFFF" }
            },
            fill: {
              patternType: "solid",
              fgColor: { rgb: "1E3A8A" } // Strong Royal Blue Background
            },
            alignment: {
              horizontal: "center", // Centered horizontally
              vertical: "center"
            },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        } 
        // Row 7 onwards: DATA ROWS (Alternating light gray background/white, aligned beautifully)
        else {
          const isEven = r % 2 === 0;
          cell.s = {
            font: {
              name: "Arial",
              sz: 10,
              color: { rgb: "1E293B" }
            },
            fill: {
              patternType: "solid",
              fgColor: { rgb: isEven ? "F1F5F9" : "FFFFFF" } // Light Slate Zebra Stripes
            },
            alignment: {
              horizontal: "left",
              vertical: "center"
            },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };

          // Centering fields dynamically for professional output balance
          const headerClean = headers[c] ? headers[c].toLowerCase() : '';
          const isCenterField = 
            headerClean.includes('nomor') || 
            headerClean.includes('eta') || 
            headerClean.includes('waktu') || 
            headerClean.includes('jam') || 
            headerClean.includes('status') ||
            headerClean.includes('pax') ||
            headerClean.includes('penerbangan') ||
            headerClean.includes('kamar') ||
            headerClean.includes('persen') ||
            headerClean.includes('nilai');

          if (isCenterField) {
            cell.s.alignment = {
              horizontal: "center",
              vertical: "center"
            };
          }
        }
      }
    }

    return ws;
  };

  // Generate and download Excel template pre-filled with current app data for easy editing!
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // 1. SHEET: Metrik Utama
    const metricsHeaders = ["Parameter Utama", "Nilai", "Keterangan Parameter"];
    const metricsRows = [
      ["Total Kamar Terjual (On Hand Bookings)", data.metrics.onHandBookingCount || 0, "Jumlah kamar yang terpesan/terjual malam ini."],
      ["Kedatangan Hari Ini (Total Arrivals)", data.metrics.totalArrivalsToday || 0, "Jumlah kamar check-in rencana hari ini."],
      ["Keberangkatan Hari Ini (Total Departures)", data.metrics.totalDeparturesToday || 0, "Jumlah kamar check-out rencana hari ini."],
      ["Tarif Kamar Hari Ini (Harga BAR Rupiah)", data.metrics.barRateToday || 0, "Harga acuan publik untuk Front Desk (Walk-In)."],
      ["Jumlah Kamar Rusak (Out of Order)", data.metrics.oooRoomsCount || 0, "Total kamar rusak/sedang dalam perbaikan."],
      ["Revenue Taxi Hari Ini (IDR)", data.metrics.taxiRevenue || 0, "Pendapatan harian dari pesanan taksi/transportasi tamu."],
    ];
    const metricsColWidths = [
      { wch: 46 }, // A: Parameter
      { wch: 14 }, // B: Nilai
      { wch: 52 }  // C: Keterangan
    ];
    const wsMetrics = createStyledSheet("Metrik Utama Briefing Harian", metricsHeaders, metricsRows, metricsColWidths);
    XLSX.utils.book_append_sheet(wb, wsMetrics, "Metrik Utama");

    // 2. SHEET: VIP Guests
    const vipHeaders = ["Nama Tamu VIP", "Tipe Kamar", "Nomor Kamar", "Waktu ETA", "Permintaan Khusus", "Level VIP"];
    const vipRows = data.vipGuests.length > 0 
      ? data.vipGuests.map(v => [v.name, v.roomType, v.roomNumber, v.eta, v.requests, v.vipLevel])
      : [
          ["Bpk. Ahmad Subarjo", "Executive Suite", "402", "13:00", "Fruit basket setup, welcome letter", "VIP 1"],
          ["Ibu Maria Christina", "Deluxe Room", "305", "14:30", "Extra pillow, silent room preference", "VIP 2"]
        ];
    const vipColWidths = [
      { wch: 28 }, // Nama Tamu VIP
      { wch: 22 }, // Tipe Kamar
      { wch: 14 }, // Nomor Kamar
      { wch: 14 }, // Waktu ETA
      { wch: 42 }, // Permintaan Khusus
      { wch: 14 }  // Level VIP
    ];
    const wsVips = createStyledSheet("Daftar Tamu VIP Hari Ini", vipHeaders, vipRows, vipColWidths);
    XLSX.utils.book_append_sheet(wb, wsVips, "VIP Guests");

    // 3. SHEET: Rombongan Grup
    const groupHeaders = ["Nama Grup", "Jumlah Kamar", "Jumlah Tamu (Pax)", "ETA", "Catatan / Remarks"];
    const groupRows = data.groups.length > 0
      ? data.groups.map(g => [g.groupName, g.roomsCount, g.guestCount, g.eta, g.remarks])
      : [
          ["PT. Telkom Indonesia Group", 12, 24, "15:00", "Pembayaran gabungan, luggage assistance"],
          ["Rombongan Wedding Wijaya", 8, 16, "11:00", "Kamar berdekatan di lantai yang sama"]
        ];
    const groupColWidths = [
      { wch: 28 }, // Nama Grup
      { wch: 15 }, // Jumlah Kamar
      { wch: 18 }, // Jumlah Tamu
      { wch: 12 }, // ETA
      { wch: 42 }  // Catatan
    ];
    const wsGroups = createStyledSheet("Daftar Rombongan Grup Hari Ini", groupHeaders, groupRows, groupColWidths);
    XLSX.utils.book_append_sheet(wb, wsGroups, "Rombongan Grup");

    // 4. SHEET: Forecast Bulanan
    const forecastHeaders = ["Nama Bulan Proyeksi", "Persentase Okupansi (%)", "Jumlah Kamar Terboking"];
    const forecastRows = data.forecasts.length > 0
      ? data.forecasts.map(f => [f.monthName, f.percentage, f.bookedRooms])
      : [
          ["Juni 2026", 65, 130],
          ["Juli 2026", 72, 144]
        ];
    const forecastColWidths = [
      { wch: 24 }, // Bulan
      { wch: 24 }, // Persentase
      { wch: 24 }  // Terboking
    ];
    const wsForecasts = createStyledSheet("Ramalan & Proyeksi Okupansi Bulanan", forecastHeaders, forecastRows, forecastColWidths);
    XLSX.utils.book_append_sheet(wb, wsForecasts, "Forecast Bulanan");

    // 5. SHEET: Penjemputan Tamu
    const transHeaders = ["Nama Tamu", "Nomor Kamar", "Jenis (Pickup / Drop-off)", "Waktu Shuttling", "Nomor Penerbangan", "Detail Kendaran / Supir", "Status (Pending / On the way / Completed)", "Jumlah Penumpang Pax"];
    const transRows = data.transports.length > 0
      ? data.transports.map(t => [t.guestName, t.roomNumber, t.type, t.time, t.flightNumber, t.carDetails, t.status, t.passengerCount || 2])
      : [
          ["Mr. Johnathan Miller", "102", "Pickup", "10:30", "GA-202", "Innova Silver - Supir Rama", "Pending", 3],
          ["Bpk. Hendra Wijaya", "R-204", "Drop-off", "16:00", "JT-104", "Avanza Black - Supir Toni", "Pending", 2]
        ];
    const transColWidths = [
      { wch: 26 }, // Nama Tamu
      { wch: 14 }, // Kamar
      { wch: 25 }, // Jenis (Pickup / Drop-off)
      { wch: 16 }, // Waktu Shuttling
      { wch: 18 }, // Penerbangan
      { wch: 28 }, // Mobil / Supir
      { wch: 38 }, // Status
      { wch: 20 }  // Pax
    ];
    const wsTrans = createStyledSheet("Penjemputan / Shuttle Transportasi Tamu", transHeaders, transRows, transColWidths);
    XLSX.utils.book_append_sheet(wb, wsTrans, "Penjemputan Tamu");

    // 6. SHEET: Catatan Operasional
    const opsHeaders = ["Judul Tugas / Checklist", "Catatan Keterangan Detail", "Kategori (FO/HK/FB/ENG/SEC/GEN)", "Prioritas (Low/Medium/High)", "Status (Pending/Completed)"];
    const opsRows = data.otherOperational.length > 0
      ? data.otherOperational.map(o => [o.title, o.notes, o.category, o.priority, o.status])
      : [
          ["Deep cleaning corridor lantai 4", "Pastikan tidak ada noda membandel pada karpet selasar kamar lama.", "HK", "High", "Pending"],
          ["Pengecekan genset preventif", "Siklus bulanan pengetesan beban kompresor.", "ENG", "Medium", "Pending"],
          ["Setup prasmananVIP", "Sediakan sendok garpu perak tambahan dan alas taplak krem.", "FB", "High", "Pending"]
        ];
    const opsColWidths = [
      { wch: 32 }, // Judul
      { wch: 48 }, // Catatan
      { wch: 32 }, // Kategori
      { wch: 22 }, // Prioritas
      { wch: 22 }  // Status
    ];
    const wsOps = createStyledSheet("Tugas Operasional & Checklist Harian", opsHeaders, opsRows, opsColWidths);
    XLSX.utils.book_append_sheet(wb, wsOps, "Catatan Operasional");

    // 7. SHEET: Tamu Longstay
    const lsHeaders = ["Nama Tamu Longstay", "Tanggal Kedatangan (Arrival)", "Tanggal Keberangkatan (Departure)", "Nama Instansi / Perusahaan", "Nomor Kamar"];
    const lsRows = data.longstayGuests.length > 0
      ? data.longstayGuests.map(l => [l.guestName, l.arrivalDate, l.departureDate, l.company, l.roomNumber])
      : [
          ["Dr. Richard Halim", "2026-05-01", "2026-06-15", "Biofarma Bandung Research Unit", "501"],
          ["Mr. Yuki Takahashi", "2026-04-10", "2026-07-20", "Mitsubishi Heavy Industries", "412"]
        ];
    const lsColWidths = [
      { wch: 28 }, // Nama Longstay
      { wch: 24 }, // Arrival
      { wch: 24 }, // Departure
      { wch: 32 }, // Perusahaan
      { wch: 14 }  // Kamar
    ];
    const wsLs = createStyledSheet("Daftar Tamu Bermalam Panjang (Longstay)", lsHeaders, lsRows, lsColWidths);
    XLSX.utils.book_append_sheet(wb, wsLs, "Tamu Longstay");

    XLSX.writeFile(wb, "Template_Morning_Briefing_Harian.xlsx");
  };

  return (
    <div className="bg-white border border-sand-300 rounded-3xl p-6 sm:p-8 shadow-sm">
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-sand-200 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-display font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Layers className="text-accent-gold" size={24} />
            Impor Seluruh Data Briefing Harian via Excel
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xl leading-relaxed font-sans">
            Gunakan fungsionalitas cerdas ini untuk menulis atau menyalin data dari file Excel harian ke dalam aplikasi. Seluruh kolom metrik, VIP, grup, shuttle, and log checklist akan terpetakan dan tersinkronisasi instan ke cloud.
          </p>
        </div>
        
        {/* Download Template Action */}
        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-sand-300 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer select-none font-sans"
        >
          <FileDown size={14} className="text-slate-500" />
          <span>Unduh Template Excel</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Drag & Drop Dropzone */}
        <div className="lg:col-span-1">
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-2 tracking-wider font-mono">
            Unggah File Spreadsheet (.XLSX)
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => canEdit && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center min-h-[220px] cursor-pointer ${
              !canEdit 
                ? 'bg-slate-50 border-slate-200 cursor-not-allowed text-stone-400'
                : isDragging
                ? 'bg-sky-50 border-sky-400 text-sky-700'
                : 'bg-sand-50/50 hover:bg-sand-50 border-sand-300 hover:border-accent-gold text-slate-600'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xlsx, .xls"
              className="hidden"
              disabled={!canEdit}
            />
            <div className={`p-4 rounded-full mb-3 ${isDragging ? 'bg-sky-100 text-sky-600' : 'bg-white text-gray-400 border border-sand-200 shadow-2xs'}`}>
              <FileUp size={28} className={isDragging ? 'animate-bounce' : ''} />
            </div>
            
            <p className="text-sm font-extrabold text-slate-800">
              Seret file Excel ke sini
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Atau klik untuk menelusuri folder komputer Anda
            </p>
            <div className="mt-4 px-2.5 py-1 bg-white border border-sand-200 rounded-md text-[9px] font-bold text-slate-500 uppercase tracking-wider shadow-3xs">
              MENDUKUNG .XLSX DAN .XLS
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Instructions, Status, and Action Preview */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-2 tracking-wider font-mono">
              Status Pemrosesan File
            </label>
            
            {/* Feedback Notifications */}
            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-start gap-3 animate-fadeIn mb-4">
                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                <div className="leading-relaxed">
                  <p className="font-bold">Error Pemindaian Kolom:</p>
                  <p className="text-slate-600 font-sans mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            {successMsg && !importPreview && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-start gap-3 animate-fadeIn mb-4">
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                <div className="leading-relaxed">
                  <p className="font-bold">Status Berhasil:</p>
                  <p className="text-slate-600 font-sans mt-0.5">{successMsg}</p>
                </div>
              </div>
            )}

            {/* Instruction list if no preview loaded */}
            {!importPreview ? (
              <div className="p-5 bg-sand-50/50 border border-sand-200/60 rounded-2xl text-xs text-slate-600 space-y-3 font-sans">
                <h4 className="font-bold text-slate-800 font-mono text-[10px] uppercase tracking-wide">Panduan Alur Siklus Peta Data:</h4>
                <ol className="list-decimal list-inside space-y-2.5 leading-relaxed text-gray-500 pl-1">
                  <li>
                    Siapkan template dengan mengklik <strong className="text-slate-800 font-semibold cursor-pointer underline hover:text-accent-gold" onClick={handleDownloadTemplate}>"Unduh Template Excel"</strong> di pojok kanan atas.
                  </li>
                  <li>
                    Edit spreadsheet tersebut menggunakan Microsoft Excel, WPS, LibreOffice, atau Google Sheets di laptop Anda. Isi data harian untuk tiap tab lembar kerja yang tersedia secara bebas.
                  </li>
                  <li>
                    Warna header, urutan baris, dan penamaan deskripsi tidak sensitif. Sistem pembaca cerdas kami dapat memetakan kolom secara adaptif.
                  </li>
                  <li>
                    Unggah kembali file Excel ke kotak kiri. Sistem akan memeriksa kelengkapan metrik baris sebelum Anda menyetujui pembaruan sinkronisasi.
                  </li>
                </ol>
              </div>
            ) : (
              /* If preview exists, display the scanned numbers and apply buttons */
              <div className="p-5 bg-sky-50/30 border border-sky-100/65 rounded-2xl space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="text-sky-600 animate-spin-slow" />
                  <h4 className="font-bold text-slate-800 font-mono text-xs uppercase tracking-wide">Ringkasan Pratinjau Kolom Ditemukan:</h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {importPreview.metrics && (
                    <div className="bg-white border border-sand-250 p-3 rounded-xl shadow-3xs flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider font-mono">Metrik Utama</p>
                        <p className="text-xs text-slate-800 font-semibold font-sans mt-0.5">Updated</p>
                      </div>
                      <Check className="text-emerald-500" size={16} />
                    </div>
                  )}

                  {importPreview.vipGuests && (
                    <div className="bg-white border border-sand-250 p-3 rounded-xl shadow-3xs flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider font-mono">Tamu VIP</p>
                        <p className="text-xs text-slate-800 font-mono font-bold mt-0.5">{importPreview.vipGuests.length} Records</p>
                      </div>
                      <Check className="text-emerald-500" size={16} />
                    </div>
                  )}

                  {importPreview.groups && (
                    <div className="bg-white border border-sand-250 p-3 rounded-xl shadow-3xs flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider font-mono">Rombongan Grup</p>
                        <p className="text-xs text-slate-800 font-mono font-bold mt-0.5">{importPreview.groups.length} Groups</p>
                      </div>
                      <Check className="text-emerald-500" size={16} />
                    </div>
                  )}

                  {importPreview.forecasts && (
                    <div className="bg-white border border-sand-250 p-3 rounded-xl shadow-3xs flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider font-mono">Forecast Bulanan</p>
                        <p className="text-xs text-slate-800 font-mono font-bold mt-0.5">{importPreview.forecasts.length} Bulan</p>
                      </div>
                      <Check className="text-emerald-500" size={16} />
                    </div>
                  )}

                  {importPreview.transports && (
                    <div className="bg-white border border-sand-250 p-3 rounded-xl shadow-3xs flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider font-mono">Shuttle & Transport</p>
                        <p className="text-xs text-slate-800 font-mono font-bold mt-0.5">{importPreview.transports.length} Reservasi</p>
                      </div>
                      <Check className="text-emerald-500" size={16} />
                    </div>
                  )}

                  {importPreview.otherOperational && (
                    <div className="bg-white border border-sand-250 p-3 rounded-xl shadow-3xs flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider font-mono">Log Checklist</p>
                        <p className="text-xs text-slate-800 font-mono font-bold mt-0.5">{importPreview.otherOperational.length} Catatan</p>
                      </div>
                      <Check className="text-emerald-500" size={16} />
                    </div>
                  )}

                  {importPreview.longstayGuests && (
                    <div className="bg-white border border-sand-250 p-3 rounded-xl shadow-3xs flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider font-mono">Longstay Guest</p>
                        <p className="text-xs text-slate-800 font-mono font-bold mt-0.5">{importPreview.longstayGuests.length} Tamu</p>
                      </div>
                      <Check className="text-emerald-500" size={16} />
                    </div>
                  )}
                </div>

                {/* Confirm Apply Actions footer inside preview Card */}
                <div className="pt-2 border-t border-sky-100 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                  <p className="text-[10px] text-gray-400 font-sans">
                    *Mengeklik tombol "Terapkan & Sinkronkan" akan memperbarui lembar briefing hari ini.
                  </p>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => {
                        setImportPreview(null);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-800 border border-sand-250 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleApplyImport}
                      className="flex-1 sm:flex-initial px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 size={13} />
                      <span>Terapkan & Sinkronkan</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
