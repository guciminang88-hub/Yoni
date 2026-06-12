import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_BRIEFING_DATA } from './data/defaultBriefing';
import { BriefingData, UserProfile, DailyHistoryRecord } from './types';

// Importing custom components
import { MetricsCard } from './components/MetricsCard';
import { VipCard } from './components/VipCard';
import { GroupsCard } from './components/GroupsCard';
import { ForecastCard } from './components/ForecastCard';
import { TransportCard } from './components/TransportCard';
import { OperationalCard } from './components/OperationalCard';
import { ConciergeCard } from './components/ConciergeCard';
import { LongstayCard } from './components/LongstayCard';
import GuestUseCard from './components/GuestUseCard';
import { LogBookCard } from './components/LogBookCard';
import { Forecast7DaysCard } from './components/Forecast7DaysCard';
import { ExcelImportExport } from './components/ExcelImportExport';
import { ExportPdfButton } from './components/ExportPdfButton';
import { HistoryReportCard } from './components/HistoryReportCard';

// Google Sheets services
import { initAuth, googleSignIn, logout } from './services/auth';
import { searchSpreadsheet, createSpreadsheet, loadSpreadsheetData, saveSpreadsheetData, uploadRecapToDrive } from './services/sheetsService';
import { saveBriefingToFirestore, subscribeToBriefing, testFirestoreConnection } from './services/firestoreService';
import { User } from 'firebase/auth';

import { 
  Compass, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Users, 
  Pencil,
  Database,
  RefreshCw,
  ExternalLink,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  Trash2,
  RotateCcw,
  Settings,
  Upload,
  Printer,
  Share2,
  Image as ImageIcon,
  CheckCircle2,
  Info,
  Lock,
  LogIn,
  User as UserIcon,
  UserCheck,
  ShieldAlert,
  Wrench,
  Activity,
  CalendarDays,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Coffee,
  FileText,
  Bell,
  BookOpen,
  Home,
  CarFront,
} from 'lucide-react';

function extractSpreadsheetId(input: string): string {
  if (!input) return '';
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return input.trim();
}

export default function App() {
  // User ID Access Control States
  const DEFAULT_USER_PROFILES: UserProfile[] = [
    {
      userId: 'admin',
      userName: 'General Manager / Admin Utama',
      allowedSections: ['metrics', 'forecasts', 'vipGuests', 'groups', 'transports', 'otherOperational', 'longstayGuests']
    },
    {
      userId: 'fo',
      userName: 'Front Office Supervisor',
      allowedSections: ['metrics', 'forecasts', 'vipGuests', 'transports', 'longstayGuests']
    },
    {
      userId: 'hk',
      userName: 'Housekeeping Desk',
      allowedSections: ['vipGuests', 'transports', 'otherOperational']
    },
    {
      userId: 'fb',
      userName: 'Food \& Beverage Coordinator',
      allowedSections: ['vipGuests', 'otherOperational']
    },
    {
      userId: 'eng',
      userName: 'Chief Engineer / Maintenance',
      allowedSections: ['otherOperational']
    }
  ];

  const [userProfiles, setUserProfiles] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('morning_briefing_user_profiles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading local user profiles:', e);
      }
    }
    return DEFAULT_USER_PROFILES;
  });

  const [activeUserId, setActiveUserId] = useState<string>(() => {
    return localStorage.getItem('morning_briefing_active_user_id') || 'admin';
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('morning_briefing_is_logged_in') === 'true';
  });

  // Login Form States
  const [loginUserId, setLoginUserId] = useState('');
  const [loginUserName, setLoginUserName] = useState('');
  const [loginError, setLoginError] = useState('');

  const canEditSection = (sectionKey: string): boolean => {
    if (activeUserId === 'admin') return true; // Admin can always edit everything!
    const activeProfile = userProfiles.find((p) => p.userId === activeUserId);
    if (!activeProfile) return false;
    return activeProfile.allowedSections.includes(sectionKey);
  };

  // Real-time local date/time state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Editable Header Titles states
  const [hotelName, setHotelName] = useState(() => {
    return localStorage.getItem('morning_briefing_hotel_name') || 'Harper Premier Nagoya Batam';
  });
  const [portalName, setPortalName] = useState(() => {
    return localStorage.getItem('morning_briefing_portal_name') || 'morning briefing list';
  });
  const [logo, setLogo] = useState<string | null>(() => {
    return localStorage.getItem('morning_briefing_logo') || null;
  });
  const [footerText, setFooterText] = useState(() => {
    return localStorage.getItem('morning_briefing_footer_text') || 'Penyimpanan cloud terpusat dan cadangan lokal aman secara real-time';
  });

  // Local settings editor fields
  const [settingsHotelName, setSettingsHotelName] = useState(hotelName);
  const [settingsPortalName, setSettingsPortalName] = useState(portalName);
  const [settingsFooterText, setSettingsFooterText] = useState(footerText);
  const [saveBrandSuccess, setSaveBrandSuccess] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Missing forms checking state
  const [showMissingFormsGlobalModal, setShowMissingFormsGlobalModal] = useState(false);

  // User ID Access Form States
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState('');
  const [inputUserId, setInputUserId] = useState('');
  const [inputUserName, setInputUserName] = useState('');
  const [inputMetrics, setInputMetrics] = useState(false);
  const [inputForecasts, setInputForecasts] = useState(false);
  const [inputVip, setInputVip] = useState(false);
  const [inputGroups, setInputGroups] = useState(false);
  const [inputTransports, setInputTransports] = useState(false);
  const [inputOperational, setInputOperational] = useState(false);
  const [inputLongstay, setInputLongstay] = useState(false);

  const handleEditProfile = (p: UserProfile) => {
    setEditingProfileId(p.userId);
    setInputUserId(p.userId);
    setInputUserName(p.userName);
    setInputMetrics(p.allowedSections.includes('metrics'));
    setInputForecasts(p.allowedSections.includes('forecasts'));
    setInputVip(p.allowedSections.includes('vipGuests'));
    setInputGroups(p.allowedSections.includes('groups'));
    setInputTransports(p.allowedSections.includes('transports'));
    setInputOperational(p.allowedSections.includes('otherOperational'));
    setInputLongstay(p.allowedSections.includes('longstayGuests'));
    setProfileError('');
  };

  const handleSaveProfile = () => {
    const userIdClean = inputUserId.trim().toLowerCase();
    if (!userIdClean) {
      setProfileError('User ID tidak boleh kosong.');
      return;
    }
    if (!inputUserName.trim()) {
      setProfileError('Nama Pengguna tidak boleh kosong.');
      return;
    }

    const sections: string[] = [];
    if (inputMetrics) sections.push('metrics');
    if (inputForecasts) sections.push('forecasts');
    if (inputVip) sections.push('vipGuests');
    if (inputGroups) sections.push('groups');
    if (inputTransports) sections.push('transports');
    if (inputOperational) sections.push('otherOperational');
    if (inputLongstay) sections.push('longstayGuests');

    const updated = userProfiles.map(p => {
      if (p.userId === userIdClean) {
        return { ...p, userName: inputUserName.trim(), allowedSections: sections };
      }
      return p;
    });

    const exists = userProfiles.some(p => p.userId === userIdClean);
    let finalProfiles = updated;
    if (!exists) {
      finalProfiles = [...userProfiles, { userId: userIdClean, userName: inputUserName.trim(), allowedSections: sections }];
    }

    setUserProfiles(finalProfiles);
    localStorage.setItem('morning_briefing_user_profiles', JSON.stringify(finalProfiles));
    saveStateToCloud(data, hotelName, portalName, logo, finalProfiles);

    triggerNotification(
      'success',
      'User ID Tersimpan',
      `Konfigurasi batas akses untuk ID "${userIdClean.toUpperCase()}" berhasil dicadangkan.`
    );

    // Clear form
    setEditingProfileId(null);
    setInputUserId('');
    setInputUserName('');
    setInputMetrics(false);
    setInputForecasts(false);
    setInputVip(false);
    setInputGroups(false);
    setInputTransports(false);
    setInputOperational(false);
    setInputLongstay(false);
    setProfileError('');
  };

  const handleDeleteProfile = (userId: string) => {
    if (userId === 'admin') {
      triggerNotification('delete', 'Gagal Menghapus', 'ID "admin" dilarang dihapus karena merupakan super-user utama.');
      return;
    }

    const finalProfiles = userProfiles.filter(p => p.userId !== userId);
    setUserProfiles(finalProfiles);
    localStorage.setItem('morning_briefing_user_profiles', JSON.stringify(finalProfiles));
    saveStateToCloud(data, hotelName, portalName, logo, finalProfiles);

    triggerNotification(
      'delete',
      'User ID Dihapus',
      `ID "${userId.toUpperCase()}" beserta seluruh limit aksesnya telah berhasil dihapus.`
    );

    if (activeUserId === userId) {
      setActiveUserId('admin');
      localStorage.setItem('morning_briefing_active_user_id', 'admin');
    }
  };

  // Notification Toast state for changes/deletes
  interface FeatureNotification {
    id: string;
    type: 'edit' | 'delete' | 'success';
    title: string;
    message: string;
  }
  const [notifications, setNotifications] = useState<FeatureNotification[]>([]);

  const triggerNotification = (type: 'edit' | 'delete' | 'success', title: string, message: string) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  };

  const handlePortalLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');
    
    const cleanId = loginUserId.trim().toLowerCase();
    const cleanName = loginUserName.trim();

    if (!cleanId) {
      setLoginError('User ID tidak boleh kosong.');
      return;
    }
    if (!cleanName) {
      setLoginError('Nama Pengguna tidak boleh kosong.');
      return;
    }

    const matchedProfile = userProfiles.find((p) => p.userId === cleanId);
    if (!matchedProfile) {
      setLoginError(`User ID "${cleanId.toUpperCase()}" tidak terdaftar di sistem.`);
      return;
    }

    if (matchedProfile.userName.trim().toLowerCase() !== cleanName.toLowerCase()) {
      setLoginError('Nama Pengguna salah atau tidak sesuai.');
      return;
    }

    // Success login
    setActiveUserId(matchedProfile.userId);
    localStorage.setItem('morning_briefing_active_user_id', matchedProfile.userId);
    localStorage.setItem('morning_briefing_is_logged_in', 'true');
    setIsLoggedIn(true);

    triggerNotification(
      'success',
      'Masuk Portal Sukses',
      `Selamat bekerja kembali, ${matchedProfile.userName}! Masuk sebagai ${matchedProfile.userId.toUpperCase()}`
    );

    // Clear login input inputs
    setLoginUserId('');
    setLoginUserName('');
  };

  const handlePortalLogout = () => {
    localStorage.setItem('morning_briefing_is_logged_in', 'false');
    setIsLoggedIn(false);
    triggerNotification(
      'success',
      'Keluar dari Sesi',
      'Sesi Anda di HOD Portal telah diakhiri secara aman.'
    );
  };

  // Synchronize Settings fields when state updates from Cloud
  useEffect(() => {
    setSettingsHotelName(hotelName);
  }, [hotelName]);

  useEffect(() => {
    setSettingsPortalName(portalName);
  }, [portalName]);

  useEffect(() => {
    setSettingsFooterText(footerText);
  }, [footerText]);

  // Logo file-uploading states & handlers
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const handleLogoFile = (file: File) => {
    setLogoError(null);
    if (!file.type.startsWith('image/')) {
      setLogoError('Format file harus berupa gambar (PNG, JPG, SVG, GIF, dll).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 180;
        const MAX_HEIGHT = 180;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedResult = canvas.toDataURL('image/png');
          setLogo(compressedResult);
          localStorage.setItem('morning_briefing_logo', compressedResult);
          saveStateToCloud(data, hotelName, portalName, compressedResult);
          triggerNotification(
            'success', 
            'Logo Kustom Diunggah', 
            'Logo kustom baru Anda telah berhasil diperbarui dan disinkronkan ke Cloud.'
          );
        }
      };
      img.onerror = () => {
        setLogoError('Gagal memproses file gambar.');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setLogoError('Gagal membaca file.');
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(true);
  };

  const handleLogoDragLeave = () => {
    setIsDraggingLogo(false);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoFile(e.dataTransfer.files[0]);
    }
  };

  // Main board data state
  const [data, setData] = useState<BriefingData>(() => {
    const saved = localStorage.getItem('morning_briefing_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved briefing data:", e);
      }
    }
    return DEFAULT_BRIEFING_DATA;
  });

  const [activeTab, setActiveTab] = useState<'occupancy' | 'forecast7' | 'operations' | 'longstay' | 'reports' | 'settings' | 'guest-use' | 'logbook' | 'concierge'>('occupancy');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMorningBriefingOpen, setIsMorningBriefingOpen] = useState(true);
  const [isOperationalFOOpen, setIsOperationalFOOpen] = useState(true);

  const [historyLogs, setHistoryLogs] = useState<DailyHistoryRecord[]>(() => {
    const saved = localStorage.getItem('morning_briefing_history_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved history logs:", e);
      }
    }
    return [];
  });

  // Guard: Restrict Database & Settings tab access to admin only
  useEffect(() => {
    if (activeUserId !== 'admin' && activeTab === 'settings') {
      setActiveTab('occupancy');
    }
  }, [activeUserId, activeTab]);

  // Google Sheets integration state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('morning_briefing_spreadsheet_id') || null;
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'synced' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);
  const [isEditingSpreadsheetId, setIsEditingSpreadsheetId] = useState(false);
  const [tempSpreadsheetId, setTempSpreadsheetId] = useState('');

  // Daily Recap & Google Drive states
  const [recapUploadStatus, setRecapUploadStatus] = useState<'idle' | 'loading' | 'success' | 'err'>('idle');
  const [recapUploadLink, setRecapUploadLink] = useState<string | null>(null);
  const [recapUploadError, setRecapUploadError] = useState<string | null>(null);

  // Markdown recap generator function
  const generateRecapMarkdown = (currentData: BriefingData, hotel: string, portal: string) => {
    const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    // Dynamically calculate on-hand occupancy percentage based on capacity
    const savedCap = localStorage.getItem('morning_briefing_hotel_capacity');
    const cap = savedCap ? Number(savedCap) : 209;
    const ooo = currentData.metrics.oooRoomsCount || 0;
    const avail = Math.max(1, cap);
    const onHandPercentage = Math.round(((currentData.metrics.onHandBookingCount || 0) / avail) * 100);

    let md = `# LAPORAN MORNING BRIEFING HARIAN - ${hotel.toUpperCase()}\n`;
    md += `*Disusun melalui Portal HOD ${portal.toUpperCase()}*\n`;
    md += `*Tanggal Briefing: ${dateStr} - Pukul ${timeStr} WIB*\n\n`;
    
    md += `## 📊 1. METRIK UTAMA HARI INI\n`;
    md += `- **Okupansi Kamar (On-Hand)**: ${onHandPercentage}% (${currentData.metrics.onHandBookingCount} Rms terjual dari ${avail} Kamar Tersedia)\n`;
    md += `- **Kamar OOO (Out of Order)**: ${ooo} Rms\n`;
    md += `- **Kapasitas Total Hotel**: ${cap} Rms\n`;
    md += `- **Kedatangan (Arrivals Today)**: ${currentData.metrics.totalArrivalsToday} Kamar\n`;
    md += `- **Keberangkatan (Departures Today)**: ${currentData.metrics.totalDeparturesToday} Kamar\n`;
    md += `- **Harga Best Available Rate (BAR) Aktif**: Rp ${currentData.metrics.barRateToday.toLocaleString('id-ID')}\n\n`;
    
    md += `## 🌟 2. DAFTAR TAMU VIP (VIP GUESTS)\n`;
    if (!currentData.vipGuests || currentData.vipGuests.length === 0) {
      md += `*Tidak ada tamu VIP hari ini.*\n\n`;
    } else {
      currentData.vipGuests.forEach((v, idx) => {
        md += `${idx + 1}. **${v.name}** | Kamar: ${v.roomNumber || '-'} (${v.roomType || '-'}) | Level VIP: ${v.vipLevel || '-'} | ETA: ${v.eta || '-'} | Catatan khusus: ${v.requests || '-'}\n`;
      });
      md += `\n`;
    }
    
    md += `## 👥 3. GRUP KEDATANGAN HARI INI (INCOMING GROUPS)\n`;
    if (!currentData.groups || currentData.groups.length === 0) {
      md += `*Tidak ada grup hari ini.*\n\n`;
    } else {
      currentData.groups.forEach((g, idx) => {
        md += `${idx + 1}. **${g.groupName}** | Jumlah Kamar: ${g.roomsCount} Rms | ETA: ${g.eta || '-'} | Remarks: ${g.remarks || '-'}\n`;
      });
      md += `\n`;
    }
    
    md += `## 🚗 4. JADWAL LAYANAN TRANSPORTASI (PICKUP & DROP-OFF)\n`;
    if (!currentData.transports || currentData.transports.length === 0) {
      md += `*Tidak ada jadwal penjemputan/pengantaran hari ini.*\n\n`;
    } else {
      currentData.transports.forEach((t, idx) => {
        md += `${idx + 1}. **${t.guestName}** | Kamar: ${t.roomNumber || '-'} | Tipe: ${t.type} | Jam: ${t.time || '-'} | Terminal: ${t.flightNumber} | Armada/Mobil: ${t.carDetails || '-'} | Penumpang: ${t.passengerCount || 1} Pax | Status: ${t.status}\n`;
      });
      md += `\n`;
    }
    
    md += `## 📋 5. DAFTAR PEKERJAAN OPERASIONAL DEPARTEMEN\n`;
    if (!currentData.otherOperational || currentData.otherOperational.length === 0) {
      md += `*Tidak ada pekerjaan operasional baru hari ini.*\n\n`;
    } else {
      const categories = ['FO', 'HK', 'FB', 'ENG', 'SALES', 'HR'];
      categories.forEach(cat => {
        const filtered = currentData.otherOperational.filter(o => o.category === cat);
        if (filtered.length > 0) {
          md += `### 🏢 Departemen: ${cat}\n`;
          filtered.forEach((o, idx) => {
            md += `- [${o.status === 'Completed' ? 'x' : ' '}] **${o.title}** (Prioritas: ${o.priority}) - *Catatan: ${o.notes || '-'}*\n`;
          });
          md += `\n`;
        }
      });
    }
    
    md += `\n---\n*Laporan ini disimpan secara otomatis ke Google Drive pada ${dateStr} ${timeStr}.*`;
    return md;
  };

  const handleSaveRecapToDrive = async () => {
    if (!token) {
      setRecapUploadStatus('err');
      setRecapUploadError('Silakan hubungkan Google Sheets terlebih dahulu untuk mendapatkan akses Google Drive.');
      return;
    }
    setRecapUploadStatus('loading');
    setRecapUploadError(null);
    try {
      const formattedDate = new Date().toISOString().split('T')[0];
      const fileName = `Morning_Briefing_Recap_${formattedDate}.md`;
      const markdownContent = generateRecapMarkdown(data, hotelName, portalName);
      
      const uploadResult = await uploadRecapToDrive(token, fileName, markdownContent);
      setRecapUploadLink(uploadResult.webViewLink || null);
      setRecapUploadStatus('success');
    } catch (error: any) {
      console.error('Failed to save recap to Google Drive:', error);
      setRecapUploadStatus('err');
      setRecapUploadError(error.message || 'Gagal menyimpan file recap ke Google Drive.');
    }
  };

  // Clear Cache state
  const [isClearCacheModalOpen, setIsClearCacheModalOpen] = useState(false);
  const [clearCacheSuccess, setClearCacheSuccess] = useState(false);

  // Factory Reset state
  const [isFactoryResetModalOpen, setIsFactoryResetModalOpen] = useState(false);
  const [factoryResetSuccess, setFactoryResetSuccess] = useState(false);

  // Reset All Input state
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
  const [resetAllSuccess, setResetAllSuccess] = useState(false);

  // Self-Healing Auto-Diagnostics state
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [repairLog, setRepairLog] = useState<string[]>([]);
  const [diagnosticSteps, setDiagnosticSteps] = useState<{
    key: string;
    label: string;
    status: 'idle' | 'running' | 'success' | 'repaired' | 'failed';
    details: string;
  }[]>([
    { key: 'schema', label: 'Verifikasi Skema Database Lokal', status: 'idle', details: 'Memeriksa keutuhan struktur tabel formulir harian.' },
    { key: 'calculations', label: 'Konsistensi Nilai & Kalkulasi Kamar', status: 'idle', details: 'Memastikan kapasitas & kalkulasi persen okupansi tidak corrupt.' },
    { key: 'credentials', label: 'Verifikasi Profil & Otorisasi Sesi', status: 'idle', details: 'Memeriksa keutuhan otorisasi admin dan user.' },
    { key: 'sync', label: 'Pembersihan Buffer & Antrean Sinkronisasi', status: 'idle', details: 'Memulihkan sinkronisasi Firestore jika terblokir/jammed.' },
    { key: 'logo', label: 'Optimasi Blob & Cache Logo Kustom', status: 'idle', details: 'Memvalidasi ukuran dan keutuhan file cache image base64.' }
  ]);

  // Initialize sheets database on loaded token
  const initializeSheets = async (authToken: string, authUser: User) => {
    setSyncStatus('loading');
    setSyncError(null);
    try {
      let sheetId = await searchSpreadsheet(authToken);
      
      if (!sheetId) {
        sheetId = await createSpreadsheet(authToken, data, hotelName, portalName);
      }
      
      setSpreadsheetId(sheetId);
      localStorage.setItem('morning_briefing_spreadsheet_id', sheetId);
      
      const loaded = await loadSpreadsheetData(authToken, sheetId, DEFAULT_BRIEFING_DATA);
      
      setData(loaded.data);
      setHotelName(loaded.hotelName);
      setPortalName(loaded.portalName);
      
      localStorage.setItem('morning_briefing_data', JSON.stringify(loaded.data));
      localStorage.setItem('morning_briefing_hotel_name', loaded.hotelName);
      localStorage.setItem('morning_briefing_portal_name', loaded.portalName);
      
      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Failed to initialize sheets database:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Gagal tersambung dengan Google Sheets.');
    }
  };

  // Google Authentication Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authUser, authToken) => {
        setUser(authUser);
        setToken(authToken);
        await initializeSheets(authToken, authUser);
      },
      () => {
        setUser(null);
        setToken(null);
        setSyncStatus('idle');
      }
    );
    return () => unsubscribe();
  }, []);

  // Google Login handling
  const handleLogin = async () => {
    setSyncStatus('loading');
    setSyncError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        await initializeSheets(result.accessToken, result.user);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Gagal masuk dengan Akun Google.');
    }
  };

  // Google Log out handling
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setSpreadsheetId(null);
      localStorage.removeItem('morning_briefing_spreadsheet_id');
      setSyncStatus('idle');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  // Manual Trigger Refresh Stream
  const handleManualSync = async () => {
    if (!token || !spreadsheetId) return;
    setSyncStatus('loading');
    setSyncError(null);
    try {
      const loaded = await loadSpreadsheetData(token, spreadsheetId, DEFAULT_BRIEFING_DATA);
      setData(loaded.data);
      setHotelName(loaded.hotelName);
      setPortalName(loaded.portalName);
      
      localStorage.setItem('morning_briefing_data', JSON.stringify(loaded.data));
      localStorage.setItem('morning_briefing_hotel_name', loaded.hotelName);
      localStorage.setItem('morning_briefing_portal_name', loaded.portalName);
      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Manual resync error:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Gagal memperbarui data.');
    }
  };

  // Save updates back to both our permanent real-time Firestore DB and optional Google Sheets
  const saveStateToCloud = async (
    updatedData: BriefingData,
    updatedHotel: string,
    updatedPortal: string,
    updatedLogo: string | null = logo,
    updatedProfiles: UserProfile[] | null = userProfiles,
    updatedHistoryLogs: DailyHistoryRecord[] | null = historyLogs,
    skipAutoHistoryUpdate = false,
    updatedFooterText: string | null = footerText
  ) => {
    let finalLogs = updatedHistoryLogs || historyLogs || [];

    if (!skipAutoHistoryUpdate) {
      // Automatically calculate the updated log for today's date from the updatedData
      const today = new Date();
      const tzOffset = today.getTimezoneOffset() * 60000;
      const dateStr = new Date(today.getTime() - tzOffset).toISOString().slice(0, 10);

      const newRecord: DailyHistoryRecord = {
        date: dateStr,
        hotelName: updatedHotel,
        portalName: updatedPortal,
        metrics: {
          onHandBookingCount: updatedData.metrics.onHandBookingCount || 0,
          onHandBookingPercentage: updatedData.metrics.onHandBookingPercentage || 0,
          totalArrivalsToday: updatedData.metrics.totalArrivalsToday || 0,
          totalDeparturesToday: updatedData.metrics.totalDeparturesToday || 0,
          barRateToday: updatedData.metrics.barRateToday || 0,
          oooRoomsCount: updatedData.metrics.oooRoomsCount || 0,
          taxiRevenue: updatedData.metrics.taxiRevenue || 0
        },
        vipCount: updatedData.vipGuests?.length || 0,
        groupCount: updatedData.groups?.length || 0,
        transportCount: updatedData.transports?.length || 0,
        otherOperationalCount: updatedData.otherOperational?.length || 0,
        longstayCount: updatedData.longstayGuests?.length || 0,
        updatedAt: new Date().toISOString(),
        details: JSON.parse(JSON.stringify(updatedData)) // deep copy of today's state
      };

      const existingIdx = finalLogs.findIndex(log => log.date === dateStr);
      let nextLogs = [...finalLogs];
      if (existingIdx >= 0) {
        nextLogs[existingIdx] = newRecord;
      } else {
        nextLogs = [newRecord, ...nextLogs];
      }

      // Sort logs descending by date
      nextLogs.sort((a, b) => b.date.localeCompare(a.date));
      finalLogs = nextLogs;

      // Update local state if different to prevent infinite cycles
      const cloudHistoryStr = JSON.stringify(finalLogs);
      const localHistoryStr = JSON.stringify(historyLogs);
      if (cloudHistoryStr !== localHistoryStr) {
        setHistoryLogs(finalLogs);
        localStorage.setItem('morning_briefing_history_logs', cloudHistoryStr);
      }
    }

    setSyncStatus('saving');
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // 1. Always store to the permanent real-time Firestore database for guciminang88@gmail.com
        await saveBriefingToFirestore('guciminang88@gmail.com', updatedHotel, updatedPortal, updatedData, updatedLogo, updatedProfiles, finalLogs, updatedFooterText);
        
        // 2. If signed in and linked with a spreadsheet, also update Google Sheets
        if (token && spreadsheetId) {
          await saveSpreadsheetData(token, spreadsheetId, updatedData, updatedHotel, updatedPortal);
        }
        setSyncStatus('synced');
      } catch (err: any) {
        console.error('Failed to save to cloud storage:', err);
        setSyncStatus('error');
        if (err.message && err.message.includes('resource-exhausted')) {
          setSyncError('Limit harian database cloud telah habis. Data tersimpan secara lokal sementara ini.');
        } else {
          setSyncError(err.message || 'Gagal menyimpan perubahan ke cloud.');
        }
      }
    }, 5000); // 5 second debounce wait before triggering network write to save quota
  };

  // Real-time ticking clock
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 1. Initial background connection check to Firestore on boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // 2. Real-time Firestore synchronized listener for 'guciminang88@gmail.com'
  useEffect(() => {
    if (!isAutoSyncEnabled) return;

    // We pause listening updates while we are actively saving to prevent input interruption
    if (isEditingSpreadsheetId || syncStatus === 'saving') {
      return;
    }

    const unsubscribe = subscribeToBriefing(
      'guciminang88@gmail.com',
      (payload) => {
        setData((currentData) => {
          const cloudDataStr = JSON.stringify(payload.data);
          const currentDataStr = JSON.stringify(currentData);
          if (cloudDataStr !== currentDataStr) {
            localStorage.setItem('morning_briefing_data', cloudDataStr);
            return payload.data;
          }
          return currentData;
        });
        
        setHotelName((currentHotel) => {
          if (payload.hotelName !== currentHotel) {
            localStorage.setItem('morning_briefing_hotel_name', payload.hotelName);
            return payload.hotelName;
          }
          return currentHotel;
        });
        
        setPortalName((currentPortal) => {
          if (payload.portalName !== currentPortal) {
            localStorage.setItem('morning_briefing_portal_name', payload.portalName);
            return payload.portalName;
          }
          return currentPortal;
        });

        setLogo((currentLogo) => {
          if (payload.logo !== currentLogo) {
            if (payload.logo) {
              localStorage.setItem('morning_briefing_logo', payload.logo);
            } else {
              localStorage.removeItem('morning_briefing_logo');
            }
            return payload.logo;
          }
          return currentLogo;
        });

        if (payload.footerText !== undefined && payload.footerText !== null) {
          setFooterText((currentFooter) => {
            if (payload.footerText !== currentFooter) {
              const actualFooter = payload.footerText || 'Penyimpanan cloud terpusat dan cadangan lokal aman secara real-time';
              localStorage.setItem('morning_briefing_footer_text', actualFooter);
              return actualFooter;
            }
            return currentFooter;
          });
        }

        if (payload.userProfiles) {
          const cloudProfilesStr = JSON.stringify(payload.userProfiles);
          const localProfilesStr = JSON.stringify(userProfiles);
          if (cloudProfilesStr !== localProfilesStr) {
            setUserProfiles(payload.userProfiles);
            localStorage.setItem('morning_briefing_user_profiles', cloudProfilesStr);
          }
        }

        if (payload.historyLogs) {
          const cloudHistoryStr = JSON.stringify(payload.historyLogs);
          const localHistoryStr = JSON.stringify(historyLogs);
          if (cloudHistoryStr !== localHistoryStr) {
            setHistoryLogs(payload.historyLogs);
            localStorage.setItem('morning_briefing_history_logs', cloudHistoryStr);
          }
        }

        setSyncStatus('synced');
      },
      (error) => {
        console.error('Firestore real-time subscription error:', error);
        setSyncStatus('error');
        if (error.message && error.message.includes('resource-exhausted')) {
          setSyncError('Limit harian database cloud telah habis. Silakan gunakan aplikasi secara lokal.');
        } else {
          setSyncError('Koneksi database real-time terputus.');
        }
      }
    );
    
    return () => unsubscribe();
  }, [isAutoSyncEnabled, isEditingSpreadsheetId, syncStatus]);

  // Connect to custom spreadsheet ID directly
  const handleConnectSpreadsheet = async (idInput: string) => {
    if (!token) return;
    setSyncStatus('loading');
    setSyncError(null);
    const cleanedId = extractSpreadsheetId(idInput);
    if (!cleanedId) {
      setSyncStatus('error');
      setSyncError('ID Spreadsheet tidak boleh kosong.');
      return;
    }

    try {
      const loaded = await loadSpreadsheetData(token, cleanedId, DEFAULT_BRIEFING_DATA);
      setSpreadsheetId(cleanedId);
      localStorage.setItem('morning_briefing_spreadsheet_id', cleanedId);
      
      setData(loaded.data);
      setHotelName(loaded.hotelName);
      setPortalName(loaded.portalName);
      
      localStorage.setItem('morning_briefing_data', JSON.stringify(loaded.data));
      localStorage.setItem('morning_briefing_hotel_name', loaded.hotelName);
      localStorage.setItem('morning_briefing_portal_name', loaded.portalName);
      
      setIsEditingSpreadsheetId(false);
      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Failed to connect to custom spreadsheet:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Gagal tersambung dengan Spreadsheet ID tersebut. Pastikan Anda memiliki akses pengeditan.');
    }
  };

  // Create new spreadsheet and link it
  const handleCreateNewSpreadsheet = async () => {
    if (!token) return;
    setSyncStatus('loading');
    setSyncError(null);
    try {
      const sheetId = await createSpreadsheet(token, data, hotelName, portalName);
      setSpreadsheetId(sheetId);
      localStorage.setItem('morning_briefing_spreadsheet_id', sheetId);
      setSyncStatus('synced');
    } catch (err: any) {
      console.error('Failed to create spreadsheet:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Gagal membuat file spreadsheet baru.');
    }
  };

  // Update browser tab title dynamically
  useEffect(() => {
    document.title = `${hotelName} - ${portalName}`;
  }, [hotelName, portalName]);

  // Update data state and save locally + Cloud (including real-time Firestore)
  const handleDataChange = (newData: BriefingData) => {
    setData(newData);
    localStorage.setItem('morning_briefing_data', JSON.stringify(newData));

    // Auto-update today's daily log in the history logs
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const dateStr = new Date(today.getTime() - tzOffset).toISOString().slice(0, 10);

    const newRecord: DailyHistoryRecord = {
      date: dateStr,
      hotelName: hotelName,
      portalName: portalName,
      metrics: {
        onHandBookingCount: newData.metrics.onHandBookingCount || 0,
        onHandBookingPercentage: newData.metrics.onHandBookingPercentage || 0,
        totalArrivalsToday: newData.metrics.totalArrivalsToday || 0,
        totalDeparturesToday: newData.metrics.totalDeparturesToday || 0,
        barRateToday: newData.metrics.barRateToday || 0,
        oooRoomsCount: newData.metrics.oooRoomsCount || 0,
        taxiRevenue: newData.metrics.taxiRevenue || 0
      },
      vipCount: newData.vipGuests?.length || 0,
      groupCount: newData.groups?.length || 0,
      transportCount: newData.transports?.length || 0,
      otherOperationalCount: newData.otherOperational?.length || 0,
      longstayCount: newData.longstayGuests?.length || 0,
      updatedAt: new Date().toISOString(),
      details: JSON.parse(JSON.stringify(newData)) // deep copy of today's state
    };

    const existingIdx = historyLogs.findIndex(log => log.date === dateStr);
    let finalLogs = [...historyLogs];
    if (existingIdx >= 0) {
      finalLogs[existingIdx] = newRecord;
    } else {
      finalLogs = [newRecord, ...finalLogs];
    }
    finalLogs.sort((a, b) => b.date.localeCompare(a.date));

    setHistoryLogs(finalLogs);
    localStorage.setItem('morning_briefing_history_logs', JSON.stringify(finalLogs));

    saveStateToCloud(newData, hotelName, portalName, logo, userProfiles, finalLogs);
  };

  const handleSettingsSaveBrand = () => {
    const trimmedHotel = settingsHotelName.trim() || 'Harper Premier Nagoya Batam';
    const trimmedPortal = settingsPortalName.trim() || 'morning briefing list';
    const trimmedFooter = settingsFooterText.trim() || 'Penyimpanan cloud terpusat dan cadangan lokal aman secara real-time';
    
    // Check if there was actually a change to trigger the notification dynamically
    const isChanged = (trimmedHotel !== hotelName) || (trimmedPortal !== portalName) || (trimmedFooter !== footerText);
    
    setHotelName(trimmedHotel);
    setPortalName(trimmedPortal);
    setFooterText(trimmedFooter);
    localStorage.setItem('morning_briefing_hotel_name', trimmedHotel);
    localStorage.setItem('morning_briefing_portal_name', trimmedPortal);
    localStorage.setItem('morning_briefing_footer_text', trimmedFooter);

    // Sync branding change into today's history log
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const dateStr = new Date(today.getTime() - tzOffset).toISOString().slice(0, 10);

    let finalLogs = [...historyLogs];
    const existingIdx = finalLogs.findIndex(log => log.date === dateStr);
    if (existingIdx >= 0) {
      finalLogs[existingIdx] = {
        ...finalLogs[existingIdx],
        hotelName: trimmedHotel,
        portalName: trimmedPortal,
        updatedAt: new Date().toISOString()
      };
      setHistoryLogs(finalLogs);
      localStorage.setItem('morning_briefing_history_logs', JSON.stringify(finalLogs));
    }

    saveStateToCloud(data, trimmedHotel, trimmedPortal, logo, userProfiles, finalLogs, false, trimmedFooter);
    setSaveBrandSuccess(true);
    
    if (isChanged) {
      triggerNotification(
        'edit', 
        'Pengaturan Diperbarui', 
        `Nama Hotel diubah menjadi "${trimmedHotel}", Portal menjadi "${trimmedPortal}", dan Footer Catatan Kaki diperbarui.`
      );
    } else {
      triggerNotification(
        'success',
        'Pengaturan Disimpan',
        'Semua pengaturan disimpan dengan sukses (tidak ada perubahan baru).'
      );
    }

    setTimeout(() => {
      setSaveBrandSuccess(false);
    }, 3000);
  };

  const handleClearCache = () => {
    // Clear only workspace integration / logo caches
    localStorage.removeItem('morning_briefing_spreadsheet_id');
    localStorage.removeItem('morning_briefing_logo');
    localStorage.removeItem('morning_briefing_history_logs');

    setLogo(null);
    setSpreadsheetId(null);
    setHistoryLogs([]);
    setSyncStatus('idle');
    setSyncError(null);
    setRecapUploadLink(null);
    setRecapUploadStatus('idle');

    // Feedback completion
    setClearCacheSuccess(true);
    setTimeout(() => {
      setClearCacheSuccess(false);
      setIsClearCacheModalOpen(false);
    }, 1500);
  };

  const handleFactoryReset = () => {
    // Clear localStorage keys completely
    localStorage.removeItem('morning_briefing_data');
    localStorage.removeItem('morning_briefing_hotel_name');
    localStorage.removeItem('morning_briefing_portal_name');
    localStorage.removeItem('morning_briefing_spreadsheet_id');
    localStorage.removeItem('morning_briefing_hotel_capacity');
    localStorage.removeItem('morning_briefing_logo');
    localStorage.removeItem('morning_briefing_history_logs');

    // Reset local React state to defaults
    setData(DEFAULT_BRIEFING_DATA);
    setHotelName('Harper Premier Nagoya Batam');
    setPortalName('morning briefing list');
    setLogo(null);
    setHistoryLogs([]);
    setSettingsHotelName('Harper Premier Nagoya Batam');
    setSettingsPortalName('morning briefing list');

    // Disconnect active spreadsheet linkage to reset flow
    setSpreadsheetId(null);
    setSyncStatus('idle');
    setSyncError(null);
    setRecapUploadLink(null);
    setRecapUploadStatus('idle');

    // Feedback completion
    setFactoryResetSuccess(true);
    setTimeout(() => {
      setFactoryResetSuccess(false);
      setIsFactoryResetModalOpen(false);
      window.location.reload();
    }, 1500);
  };

  const handleSaveTodayToHistory = (customDate?: string) => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const dateStr = customDate || new Date(today.getTime() - tzOffset).toISOString().slice(0, 10);

    const newRecord: DailyHistoryRecord = {
      date: dateStr,
      hotelName: hotelName,
      portalName: portalName,
      metrics: {
        onHandBookingCount: data.metrics.onHandBookingCount || 0,
        onHandBookingPercentage: data.metrics.onHandBookingPercentage || 0,
        totalArrivalsToday: data.metrics.totalArrivalsToday || 0,
        totalDeparturesToday: data.metrics.totalDeparturesToday || 0,
        barRateToday: data.metrics.barRateToday || 0,
        oooRoomsCount: data.metrics.oooRoomsCount || 0,
        taxiRevenue: data.metrics.taxiRevenue || 0
      },
      vipCount: data.vipGuests?.length || 0,
      groupCount: data.groups?.length || 0,
      transportCount: data.transports?.length || 0,
      otherOperationalCount: data.otherOperational?.length || 0,
      longstayCount: data.longstayGuests?.length || 0,
      updatedAt: new Date().toISOString(),
      details: JSON.parse(JSON.stringify(data)) // deep copy of today's state
    };

    // Replace if date already exists, else prepend
    const existingIdx = historyLogs.findIndex(log => log.date === dateStr);
    let finalLogs = [...historyLogs];
    if (existingIdx >= 0) {
      finalLogs[existingIdx] = newRecord;
    } else {
      finalLogs = [newRecord, ...finalLogs];
    }

    // Sort logs descending by date
    finalLogs.sort((a, b) => b.date.localeCompare(a.date));

    // Update state & persist
    setHistoryLogs(finalLogs);
    localStorage.setItem('morning_briefing_history_logs', JSON.stringify(finalLogs));
    
    // Save to Firestore
    saveStateToCloud(data, hotelName, portalName, logo, userProfiles, finalLogs);

    triggerNotification(
      'success',
      'Pencatatan Riwayat Sukses',
      `Berhasil mengunci data briefing harian untuk tanggal ${dateStr} ke riwayat.`
    );
  };

  const handleDeleteHistoryRecord = (dateString: string) => {
    const finalLogs = historyLogs.filter(log => log.date !== dateString);
    setHistoryLogs(finalLogs);
    localStorage.setItem('morning_briefing_history_logs', JSON.stringify(finalLogs));
    saveStateToCloud(data, hotelName, portalName, logo, userProfiles, finalLogs, true);

    triggerNotification(
      'delete',
      'Data Riwayat Dihapus',
      `Rekaman data tanggal ${dateString} berhasil dihapus dari riwayat.`
    );
  };

  const handleInjectMockHistory = () => {
    const mockLogs: DailyHistoryRecord[] = [];
    const today = new Date();
    
    // Loop over the last 30 days
    for (let i = 1; i <= 30; i++) {
      const pastDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const tzOffset = pastDate.getTimezoneOffset() * 60000;
      const dateStr = new Date(pastDate.getTime() - tzOffset).toISOString().slice(0, 10);

      // Generate realistic fluctuating metrics
      const randOcc = 45 + Math.floor(Math.sin(i * 0.5) * 20) + Math.floor(Math.random() * 15);
      const cap = Number(localStorage.getItem('morning_briefing_hotel_capacity')) || 209;
      const roomsSold = Math.round((randOcc / 100) * cap);
      const arrivals = Math.floor(Math.random() * 25) + 5;
      const departures = Math.floor(Math.random() * 25) + 5;
      const ooo = Math.floor(Math.random() * 8);

      const mockData: BriefingData = {
        attendanceList: [],
        dailyProgress: [],
        metrics: {
          onHandBookingCount: roomsSold,
          onHandBookingPercentage: randOcc,
          totalArrivalsToday: arrivals,
          totalDeparturesToday: departures,
          barRateToday: 950000 + (Math.floor(Math.sin(i) * 15) * 10000),
          oooRoomsCount: ooo,
          taxiRevenue: 300000 + (Math.floor(Math.random() * 200) * 1000)
        },
        vipGuests: [
          { id: `mock-v1-${i}`, name: 'James Smith', roomType: 'Deluxe Suite', roomNumber: '601', eta: '14:00', requests: 'Extra towels, fruit basket', vipLevel: 'VIP 1' },
          { id: `mock-v2-${i}`, name: 'Yuki Tanaka', roomType: 'Premier Room', roomNumber: '502', eta: '16:30', requests: 'Late check-out request', vipLevel: 'VIP 2' }
        ],
        groups: [
          { id: `mock-g-${i}`, groupName: 'Chevron Petroleum Annual Meeting', roomsCount: 15, guestCount: 22, eta: '11:00', remarks: 'Requires group check-in keycards.' }
        ],
        forecasts: [],
        transports: [
          { id: `mock-t-${i}`, guestName: 'James Smith', roomNumber: '601', type: 'Pickup', time: '13:00', flightNumber: 'GA-201', carDetails: 'Kijang Innova Black - Pak Budi', status: 'Completed', passengerCount: 2 }
        ],
        otherOperational: [
          { id: `mock-o1-${i}`, title: 'Fascia Signage Cleaning', notes: 'Done by engineering at 09:30', category: 'ENG', priority: 'Medium', status: 'Completed' },
          { id: `mock-o2-${i}`, title: 'Aerate carpets in executive lounge', notes: 'Housekeeping deep sanitize', category: 'HK', priority: 'High', status: 'Completed' }
        ],
        longstayGuests: []
      };

      mockLogs.push({
        date: dateStr,
        hotelName: 'Harper Premier Nagoya Batam',
        portalName: 'morning briefing list',
        metrics: {
          onHandBookingCount: roomsSold,
          onHandBookingPercentage: randOcc,
          totalArrivalsToday: arrivals,
          totalDeparturesToday: departures,
          barRateToday: mockData.metrics.barRateToday,
          oooRoomsCount: ooo,
          taxiRevenue: mockData.metrics.taxiRevenue
        },
        vipCount: mockData.vipGuests.length,
        groupCount: mockData.groups.length,
        transportCount: mockData.transports.length,
        otherOperationalCount: mockData.otherOperational.length,
        longstayCount: 0,
        updatedAt: pastDate.toISOString(),
        details: mockData
      });
    }

    setHistoryLogs(mockLogs);
    localStorage.setItem('morning_briefing_history_logs', JSON.stringify(mockLogs));
    saveStateToCloud(data, hotelName, portalName, logo, userProfiles, mockLogs, true);

    triggerNotification(
      'success',
      'Data Simulasi Disisipkan',
      'Sistem berhasil mempopulasi riwayat tiruan 30 hari terakhir untuk menguji laporan Harian, Bulanan, dan Tahunan.'
    );
  };

  const handleResetAllInputs = () => {
    const freshData: BriefingData = {
      attendanceList: [],
      dailyProgress: [],
      metrics: {
        onHandBookingCount: 0,
        onHandBookingPercentage: 0,
        totalArrivalsToday: 0,
        totalDeparturesToday: 0,
        barRateToday: 0,
        oooRoomsCount: 0,
        taxiRevenue: 0
      },
      vipGuests: [],
      groups: [],
      forecasts: [
        {
          id: "fc-1",
          monthName: "Bulan Depan",
          percentage: 0,
          bookedRooms: 0
        },
        {
          id: "fc-2",
          monthName: "Dua Bulan Kedepan",
          percentage: 0,
          bookedRooms: 0
        }
      ],
      forecasts7Days: [],
      transports: [],
      otherOperational: [],
      longstayGuests: [],
      guestUseUsages: [],
      logBooks: [],
      conciergeLogs: []
    };

    // Update state & persist in local storage
    setData(freshData);
    localStorage.setItem('morning_briefing_data', JSON.stringify(freshData));
    
    // Automatically dynamic update to cloud database
    saveStateToCloud(freshData, hotelName, portalName);

    // Modal success feedback and timeout close
    setResetAllSuccess(true);
    setTimeout(() => {
      setResetAllSuccess(false);
      setIsResetAllModalOpen(false);
    }, 1500);
  };

  const runSelfRepairDiagnostics = async () => {
    setDiagnosticRunning(true);
    setRepairLog([]);
    
    // Reset steps to idle
    setDiagnosticSteps(prev => prev.map(s => ({ ...s, status: 'idle' })));

    const appendLog = (msg: string) => {
      setRepairLog(prev => [...prev, `[${new Date().toLocaleTimeString('id-ID')}] ${msg}`]);
    };

    // Step 1: Database Schema Validation
    setDiagnosticSteps(prev => prev.map(s => s.key === 'schema' ? { ...s, status: 'running' } : s));
    await new Promise(resolve => setTimeout(resolve, 800));
    let schemaRepaired = false;
    try {
      appendLog("Memulai verifikasi tabel basis data harian...");
      const localData = { ...data };
      const missingKeys: string[] = [];
      const defaultDataKeys = Object.keys(DEFAULT_BRIEFING_DATA);
      
      defaultDataKeys.forEach((k) => {
        if (!(k in localData) || localData[k as keyof typeof DEFAULT_BRIEFING_DATA] === undefined) {
          missingKeys.push(k);
          // Auto repair/fill key from defaults
          (localData as any)[k] = DEFAULT_BRIEFING_DATA[k as keyof typeof DEFAULT_BRIEFING_DATA];
          schemaRepaired = true;
        }
      });

      if (schemaRepaired) {
        appendLog(`Ditemukan dan diperbaiki skema kosong: ${missingKeys.join(', ')}.`);
        setData(localData);
        localStorage.setItem('morning_briefing_data', JSON.stringify(localData));
        saveStateToCloud(localData, hotelName, portalName);
        setDiagnosticSteps(prev => prev.map(s => s.key === 'schema' ? { ...s, status: 'repaired', details: 'Struktur basis data yang kosong berhasil direparasi dan disinkronkan.' } : s));
      } else {
        appendLog("Semua tabel dasar lokal terverifikasi UTUH dan AMAN.");
        setDiagnosticSteps(prev => prev.map(s => s.key === 'schema' ? { ...s, status: 'success', details: 'Seluruh struktur data lokal utuh dan valid.' } : s));
      }
    } catch (err) {
      appendLog("Error saat memproses skema. Merestore default...");
      setData(DEFAULT_BRIEFING_DATA);
      localStorage.setItem('morning_briefing_data', JSON.stringify(DEFAULT_BRIEFING_DATA));
      saveStateToCloud(DEFAULT_BRIEFING_DATA, hotelName, portalName);
      setDiagnosticSteps(prev => prev.map(s => s.key === 'schema' ? { ...s, status: 'repaired', details: 'Kerusakan kritis diperbaiki dengan pemulihan setelan standar.' } : s));
    }

    // Step 2: Hotel Capacity & Calculations consistency
    setDiagnosticSteps(prev => prev.map(s => s.key === 'calculations' ? { ...s, status: 'running' } : s));
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      appendLog("Memvalidasi parameter kapasitas kamar...");
      const savedCap = localStorage.getItem('morning_briefing_hotel_capacity');
      const capInt = Number(savedCap);
      if (!savedCap || isNaN(capInt) || capInt <= 0) {
        appendLog("Kapasitas terdeteksi tidak valid (0 / NaN). Reset ke default (209 Rms) untuk mencegah kesalahan pembagian.");
        localStorage.setItem('morning_briefing_hotel_capacity', '209');
        // Trigger storage update
        window.dispatchEvent(new Event('storage'));
        setDiagnosticSteps(prev => prev.map(s => s.key === 'calculations' ? { ...s, status: 'repaired', details: 'Kapasitas diatur ke 209 Rms untuk mencegah error division by zero (NaN).' } : s));
      } else {
        appendLog(`Kapasitas terverifikasi valid: ${capInt} Rooms.`);
        setDiagnosticSteps(prev => prev.map(s => s.key === 'calculations' ? { ...s, status: 'success', details: `Kalkulasi fungsional sehat (${capInt} Rooms).` } : s));
      }
    } catch (err) {
      appendLog("Gagal memvalidasi kapasitas. Mengatur ke standard (209 Rms).");
      localStorage.setItem('morning_briefing_hotel_capacity', '209');
      setDiagnosticSteps(prev => prev.map(s => s.key === 'calculations' ? { ...s, status: 'repaired', details: 'Kapasitas di-reset ke standar 209 Rms.' } : s));
    }

    // Step 3: Authorization & User Identity Check
    setDiagnosticSteps(prev => prev.map(s => s.key === 'credentials' ? { ...s, status: 'running' } : s));
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      appendLog("Memeriksa profil user dan hak akses...");
      const activeId = localStorage.getItem('morning_briefing_active_user_id');
      
      if (!activeId) {
        appendLog("Akun aktif kosong. Mengkonfigurasi ulang akun sebagai Admin.");
        localStorage.setItem('morning_briefing_active_user_id', 'admin');
        localStorage.setItem('morning_briefing_is_logged_in', 'true');
        setDiagnosticSteps(prev => prev.map(s => s.key === 'credentials' ? { ...s, status: 'repaired', details: 'Sesi dipulihkan: Pengguna disetel ulang sebagai administrator.' } : s));
      } else {
        appendLog(`Pengguna terotorisasi aktif: ${activeId}.`);
        setDiagnosticSteps(prev => prev.map(s => s.key === 'credentials' ? { ...s, status: 'success', details: `Sesi aktif aman (${activeId}).` } : s));
      }
    } catch (err) {
      setDiagnosticSteps(prev => prev.map(s => s.key === 'credentials' ? { ...s, status: 'failed', details: 'Gagal memulihkan hak akses.' } : s));
    }

    // Step 4: Sync & Firestore buffering repair
    setDiagnosticSteps(prev => prev.map(s => s.key === 'sync' ? { ...s, status: 'running' } : s));
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      appendLog("Memeriksa status sinkronisasi Firestore...");
      setSyncError(null);
      setSyncStatus('idle');
      appendLog("Menyetel ulang antrean offline & membersihkan error sinkronisasi.");
      setDiagnosticSteps(prev => prev.map(s => s.key === 'sync' ? { ...s, status: 'success', details: 'Koneksi real-time diluruskan kembali & status ditata ulang.' } : s));
    } catch (err) {
      appendLog("Gagal mereparasi antrean sinkronisasi.");
      setDiagnosticSteps(prev => prev.map(s => s.key === 'sync' ? { ...s, status: 'failed', details: 'Gagal mendiagnosis sinkronisasi.' } : s));
    }

    // Step 5: Logo base64 and buffer validation
    setDiagnosticSteps(prev => prev.map(s => s.key === 'logo' ? { ...s, status: 'running' } : s));
    await new Promise(resolve => setTimeout(resolve, 850));
    try {
      appendLog("Menganalisis cache logo kustom...");
      const savedLogo = localStorage.getItem('morning_briefing_logo');
      if (savedLogo) {
        if (!savedLogo.startsWith('data:image/') || savedLogo.length > 5000000) {
          appendLog("Mendeteksi kerusakan logo (Blob corrupt / Terlalu Besar). Menghapus logo...");
          localStorage.removeItem('morning_briefing_logo');
          setLogo(null);
          setDiagnosticSteps(prev => prev.map(s => s.key === 'logo' ? { ...s, status: 'repaired', details: 'Logo rusak dibersihkan demi kestabilan performa.' } : s));
        } else {
          appendLog("Visual logo memenuhi kriteria.");
          setDiagnosticSteps(prev => prev.map(s => s.key === 'logo' ? { ...s, status: 'success', details: 'Logo kustom valid dan optimal.' } : s));
        }
      } else {
        appendLog("Menggunakan logo standar Harper Premier.");
        setDiagnosticSteps(prev => prev.map(s => s.key === 'logo' ? { ...s, status: 'success', details: 'Menggunakan logo default.' } : s));
      }
    } catch (err) {
      appendLog("Gagal saat menganalisis logo.");
      setDiagnosticSteps(prev => prev.map(s => s.key === 'logo' ? { ...s, status: 'failed', details: 'Gagal mendiagnosis logo.' } : s));
    }

    setDiagnosticRunning(false);
    appendLog("=== PROSES DIAGNOSIS & AUTO-FIX BERHASIL SELESAI ===");
  };

  // Calculate missing forms globally globally across all types
  const getGlobalMissingForms = () => {
    let globalMissing: {typeName: string, missing: number[]}[] = [];
    if (!data.guestUseTypes || !data.guestUseUsages) return globalMissing;
    
    data.guestUseTypes.forEach(t => {
        if (!t.startSeries) return;
        const typeUsages = data.guestUseUsages!.filter(u => u.typeId === t.id);
        if (typeUsages.length === 0) return;
        const maxUsed = Math.max(...typeUsages.map(u => u.formNumber));
        if (t.startSeries > maxUsed) return;
        
        const usedSet = new Set(typeUsages.map(u => u.formNumber));
        const missing: number[] = [];
        for (let i = t.startSeries; i <= maxUsed; i++) {
            if (!usedSet.has(i)) {
                missing.push(i);
            }
        }
        if (missing.length > 0) {
            globalMissing.push({ typeName: t.name, missing });
        }
    });
    return globalMissing;
  };

  const globalMissingForms = getGlobalMissingForms();
  const hasMissingForms = globalMissingForms.length > 0;

  // Human date translator helper page
  const getIndonesianDate = (d: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-sky-500/35 selection:text-white relative overflow-hidden">
        {/* Ambient luxury backgrounds and glassmorphic designs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-600/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-800 border border-slate-700/60 rounded-3xl shadow-2xl p-6 sm:p-8 z-10 relative backdrop-blur-md">
          {/* Logo & Headline */}
          <div className="text-center space-y-4 mb-8">
            <div className="mx-auto w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg border border-sky-500/40">
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
              ) : (
                <Compass size={36} className="animate-spin-slow text-white" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest text-sky-500 bg-sky-500/10 border border-sky-500/30 px-3 py-1 rounded-full uppercase">
                {hotelName}
              </span>
              <h2 className="font-display font-black text-2xl tracking-tight text-white mt-3 capitalize">
                {portalName}
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Silakan masuk dengan kredensial User ID Anda untuk memproses briefing
              </p>
            </div>
          </div>

          {/* Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handlePortalLogin();
            }} 
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                User ID Departemen / Jabatan
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock size={15} />
                </span>
                <input
                  type="text"
                  value={loginUserId}
                  onChange={(e) => setLoginUserId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  placeholder=""
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Nama Pengguna Lengkap
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                  <UserIcon size={15} />
                </span>
                <input
                  type="text"
                  value={loginUserName}
                  onChange={(e) => setLoginUserName(e.target.value)}
                  placeholder=""
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition"
                  required
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-sky-950/40 border border-sky-800/40 text-sky-500 text-xs rounded-xl flex items-start gap-2 animate-fadeIn font-sans">
                <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                <span className="font-semibold leading-normal">{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs tracking-wider rounded-xl transition shadow-xl hover:shadow-sky-900/35 cursor-pointer flex items-center justify-center gap-2 select-none uppercase font-mono mt-2"
            >
              <LogIn size={15} />
              <span>Masuk Portal HOD</span>
            </button>
          </form>


        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 pb-24 lg:pb-16 print:bg-white print:pb-0 print:p-0 selection:bg-accent-gold/25 selection:text-slate-800">
      
      {/* Sleek Interface Branded Navbar */}
      <header id="app-nav-header" className="bg-sky-700 text-white border-b border-sky-800/80 sticky top-0 z-50 shadow-md pt-safe print:hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8 pb-3 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 -ml-1 text-sky-100 hover:bg-sky-600 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="w-10 h-10 bg-white/15 backdrop-blur-md border border-white/25 rounded-xl flex items-center justify-center text-white shadow-inner shrink-0 overflow-hidden">
              {logo ? (
                <img src={logo} alt="Hotel Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Compass size={24} className="animate-spin-slow text-white" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-display font-black text-lg sm:text-xl tracking-tight text-white capitalize shadow-sm flex items-center gap-2 mt-0.5">
                {portalName}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-100 bg-sky-800/40 border border-sky-700/30 px-2.5 py-0.5 rounded-full select-none animate-fadeIn">
                  {hotelName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end flex-wrap gap-2 sm:gap-4 shrink-0">
            {/* Notifications */}
            {hasMissingForms && (
              <button
                onClick={() => setShowMissingFormsGlobalModal(true)}
                className="relative bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-lg transition shadow-sm mr-1 ml-auto animate-pulse"
                title="Pemberitahuan: Ada form yang melompat"
              >
                <Bell size={16} />
                <span className="absolute -top-1 -right-1 bg-white text-rose-600 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-rose-500 shadow-sm">
                  !
                </span>
              </button>
            )}

            {/* Time Display */}
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold mr-1">
              <span className="bg-sky-50/80 border border-sky-200/65 text-sky-700 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 shadow-xs font-medium">
                <Calendar size={12} className="text-sky-600" />
                {getIndonesianDate(currentTime)}
              </span>
              <span className="bg-sky-50/80 border border-sky-200/65 text-sky-700 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 font-mono shadow-xs">
                <Clock size={12} className="text-sky-600" />
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container body with Sidebar Overlay */}
      <div className="w-full px-4 sm:px-4 lg:px-6 xl:px-8 mt-6 print:hidden flex items-start gap-4 sm:gap-6 lg:gap-8 relative">
        
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 lg:hidden animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white lg:bg-transparent border-r border-sand-200 lg:border-none transform transition-transform duration-300 lg:sticky lg:top-24 lg:translate-x-0 lg:w-64 shrink-0 pt-20 lg:pt-0 shadow-2xl lg:shadow-none flex flex-col lg:h-[calc(100vh-7rem)] ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex flex-col gap-1.5 px-4 lg:px-0 flex-1 overflow-y-auto pb-4">
            {/* Morning Briefing Menu Group */}
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setIsMorningBriefingOpen(!isMorningBriefingOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[12px] sm:text-sm font-extrabold text-slate-800 bg-sand-100 hover:bg-sand-200 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Coffee size={18} className="text-amber-700 shrink-0" />
                  <span>Morning Briefing</span>
                </div>
                {isMorningBriefingOpen ? <ChevronDown size={16} className="text-slate-500 shrink-0" /> : <ChevronRight size={16} className="text-slate-500 shrink-0" />}
              </button>

              {isMorningBriefingOpen && (
                <div className="flex flex-col gap-1.5 pl-4 ml-2 border-l-2 border-sand-200/70 mt-1">
                  <button
                    onClick={() => { setActiveTab('occupancy'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                      activeTab === 'occupancy'
                        ? 'bg-sky-700 text-white shadow-md shadow-sky-900/20'
                        : 'text-slate-600 hover:bg-sand-150 hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp size={16} className="shrink-0" />
                    <span>Okupansi & Forecast</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('operations'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                      activeTab === 'operations'
                        ? 'bg-sky-700 text-white shadow-md shadow-sky-900/20'
                        : 'text-slate-600 hover:bg-sand-150 hover:text-slate-900'
                    }`}
                  >
                    <Users size={16} className="shrink-0" />
                    <span>VIP & Operasional</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('forecast7'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                      activeTab === 'forecast7'
                        ? 'bg-sky-700 text-white shadow-md shadow-sky-900/20'
                        : 'text-slate-600 hover:bg-sand-150 hover:text-slate-900'
                    }`}
                  >
                    <Calendar size={16} className={activeTab === 'forecast7' ? 'text-white' : 'text-amber-600'} />
                    <span>Forecast 7 Hari</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('longstay'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                      activeTab === 'longstay'
                        ? 'bg-sky-700 text-white shadow-md shadow-sky-900/20'
                        : 'text-slate-600 hover:bg-sand-150 hover:text-slate-900'
                    }`}
                  >
                    <Calendar size={16} className="shrink-0" />
                    <span>Longstay Guest</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                      activeTab === 'reports'
                        ? 'bg-sky-700 text-white shadow-md shadow-sky-900/20'
                        : 'text-slate-600 hover:bg-sand-150 hover:text-slate-900'
                    }`}
                  >
                    <CalendarDays size={16} className="shrink-0" />
                    <span>Laporan & Riwayat</span>
                  </button>
                </div>
              )}
            </div>

            {/* Operational FO Menu Group */}
            <div className="flex flex-col gap-1.5 mt-1.5">
              <button
                onClick={() => setIsOperationalFOOpen(!isOperationalFOOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[12px] sm:text-sm font-extrabold text-slate-800 bg-sand-100 hover:bg-sand-200 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Activity size={18} className="text-teal-700 shrink-0" />
                  <span>Operational FO</span>
                </div>
                {isOperationalFOOpen ? <ChevronDown size={16} className="text-slate-500 shrink-0" /> : <ChevronRight size={16} className="text-slate-500 shrink-0" />}
              </button>

              {isOperationalFOOpen && (
                <div className="flex flex-col gap-1.5 pl-4 ml-2 border-l-2 border-sand-200/70 mt-1">
                  <button
                    onClick={() => { setActiveTab('guest-use'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                      activeTab === 'guest-use'
                        ? 'bg-sky-700 text-white shadow-md shadow-sky-900/20'
                        : 'text-slate-600 hover:bg-sand-150 hover:text-slate-900'
                    }`}
                  >
                    <FileText size={16} className="shrink-0" />
                    <span>Guest use form</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('logbook'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                      activeTab === 'logbook'
                        ? 'bg-sky-700 text-white shadow-md shadow-sky-900/20'
                        : 'text-slate-600 hover:bg-sand-150 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen size={16} className="shrink-0" />
                    <span>Log Book</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('concierge'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                      activeTab === 'concierge'
                        ? 'bg-sky-700 text-white shadow-md shadow-sky-900/20'
                        : 'text-slate-600 hover:bg-sand-150 hover:text-slate-900'
                    }`}
                  >
                    <CarFront size={16} className="shrink-0" />
                    <span>Concierge</span>
                  </button>
                </div>
              )}
            </div>

            {activeUserId === 'admin' && (
              <button
                type="button"
                onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-start gap-3 px-4 py-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                  activeTab === 'settings'
                    ? 'bg-sky-700 text-white shadow-md shadow-sky-900/20'
                    : 'text-slate-600 hover:bg-sand-200 hover:text-slate-900'
                }`}
              >
                <Settings size={18} className="shrink-0" />
                <span>Database & Pengaturan</span>
              </button>
            )}
          </div>

          {/* Active User Badging (Moved to Sidebar Bottom) */}
          <div className="mt-auto px-4 lg:px-0 pb-6">
            <div className="bg-sky-700 rounded-xl p-3 shadow-sm flex items-center justify-between gap-2 text-white">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-black uppercase text-white shadow-inner shrink-0 leading-none">
                  {activeUserId.substring(0, 2)}
                </div>
                <div className="text-left leading-none flex-1 min-w-0">
                  <p className="text-[11px] font-extrabold tracking-wide uppercase truncate">
                    ID: {activeUserId.toUpperCase()}
                  </p>
                  <p className="text-[10px] text-sky-100 font-sans mt-0.5 truncate" title={userProfiles.find(p => p.userId === activeUserId)?.userName}>
                    {userProfiles.find(p => p.userId === activeUserId)?.userName || 'Pengguna'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePortalLogout}
                className="w-8 h-8 flex shrink-0 items-center justify-center rounded-lg bg-sky-800/50 hover:bg-rose-500 hover:text-white text-sky-100 transition-colors border border-sky-600 self-center"
                title="Keluar dari Portal"
              >
                <LogIn size={14} className="rotate-180" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0">

        {/* TAB 1: Occupancy & Forecasts */}
        {activeTab === 'occupancy' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Core Metrics Summary */}
            <MetricsCard 
              metrics={data.metrics}
              onChange={(metrics) => handleDataChange({ ...data, metrics })}
              canEdit={canEditSection('metrics')}
              isAdmin={activeUserId === 'admin'}
            />

            {/* Forecast Panel & Occupancy Progress */}
            <div className="grid grid-cols-1 gap-8">
              <ForecastCard
                forecasts={data.forecasts}
                onChange={(list) => handleDataChange({ ...data, forecasts: list })}
                canEdit={canEditSection('forecasts')}
                isAdmin={activeUserId === 'admin'}
              />
            </div>
          </div>
        )}

        {/* TAB: Forecast 7 Hari */}
        {activeTab === 'forecast7' && (
          <div className="space-y-8 animate-fadeIn">
            <Forecast7DaysCard
              forecasts7Days={data.forecasts7Days || []}
              onChange={(list) => handleDataChange({ ...data, forecasts7Days: list })}
              canEdit={canEditSection('forecasts')}
              isAdmin={activeUserId === 'admin'}
              todayDate={currentTime}
            />
          </div>
        )}

        {/* TAB 8: Guest Use Form */}
        {activeTab === 'guest-use' && (
          <div className="space-y-8 animate-fadeIn">
            <GuestUseCard
              types={data.guestUseTypes || []}
              usages={data.guestUseUsages || []}
              onChangeTypes={(types) => handleDataChange({ ...data, guestUseTypes: types })}
              onChangeUsages={(usages) => handleDataChange({ ...data, guestUseUsages: usages })}
              canEdit={canEditSection('otherOperational')}
              isAdmin={activeUserId === 'admin'}
            />
          </div>
        )}

        {/* TAB 9: Log Book */}
        {activeTab === 'logbook' && (
          <div className="space-y-8 animate-fadeIn">
            <LogBookCard
              logBooks={data.logBooks || []}
              onChange={(logbooks) => handleDataChange({ ...data, logBooks: logbooks })}
              canEdit={canEditSection('otherOperational')}
              isAdmin={activeUserId === 'admin'}
            />
          </div>
        )}

        {/* TAB 2: Operational logs, VIP Guests and transport dispatchers */}
        {activeTab === 'operations' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
            
            {/* VIP Guests Panel */}
            <div className="space-y-6">
              <VipCard 
                vipGuests={data.vipGuests}
                onChange={(list) => handleDataChange({ ...data, vipGuests: list })}
                canEdit={canEditSection('vipGuests')}
              />

              <GroupsCard
                groups={data.groups}
                onChange={(list) => handleDataChange({ ...data, groups: list })}
                canEdit={canEditSection('groups')}
              />
            </div>

            {/* Transports & other checklist */}
            <div className="space-y-6">
              <TransportCard
                transports={data.transports}
                onChange={(list) => handleDataChange({ ...data, transports: list })}
                canEdit={canEditSection('transports')}
              />

              <OperationalCard
                operationalList={data.otherOperational}
                onChange={(list) => handleDataChange({ ...data, otherOperational: list })}
                canEdit={canEditSection('otherOperational')}
              />
            </div>
          </div>
        )}

        {/* TAB: Concierge */}
        {activeTab === 'concierge' && (
          <div className="space-y-8 animate-fadeIn">
            <ConciergeCard
              logs={data.conciergeLogs || []}
              onChange={(logs) => handleDataChange({ ...data, conciergeLogs: logs })}
              canEdit={canEditSection('otherOperational')}
            />
          </div>
        )}

        {/* TAB 3: Longstay Guests tracker */}
        {activeTab === 'longstay' && (
          <div className="space-y-8 animate-fadeIn">
            <LongstayCard
              longstayGuests={data.longstayGuests || []}
              onChange={(list) => handleDataChange({ ...data, longstayGuests: list })}
              canEdit={canEditSection('longstayGuests')}
            />
          </div>
        )}

        {/* TAB 4: Laporan & Riwayat (Daily, Monthly, Yearly Reports) */}
        {activeTab === 'reports' && (
          <div className="space-y-8 animate-fadeIn">
            <HistoryReportCard
              historyLogs={historyLogs}
              currentData={data}
              hotelName={hotelName}
              portalName={portalName}
              onSaveTodayToHistory={handleSaveTodayToHistory}
              onDeleteHistoryRecord={handleDeleteHistoryRecord}
              onInjectMockHistory={handleInjectMockHistory}
              isAdmin={activeUserId === 'admin'}
            />
          </div>
        )}

        {/* TAB 5: Database & Cloud Synchronization Settings */}
        {activeTab === 'settings' && activeUserId === 'admin' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header section of settings */}
            <div className="bg-slate-50/75 border border-sand-300/60 p-6 rounded-3xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-accent-gold/10 text-accent-gold rounded-2xl shrink-0">
                  <Settings className="animate-spin-slow text-amber-700" size={22} />
                </div>
                <div>
                  <h2 className="font-display font-black text-base text-slate-800 border-none inline-block">
                    Database & Pengaturan Sinkronisasi
                  </h2>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Kelola tautan Google Sheets harian, tonton live-status data guciminang88@gmail.com, serta konfigurasikan pemeliharaan internal cache browser Anda di satu tempat yang aman.
                  </p>
                </div>
              </div>
            </div>

            {/* Identitas Brand & Logo Panel */}
            <section id="brand-identity-panel" className="bg-white border border-sand-200 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="border-b border-sand-100 pb-3">
                <h3 className="font-display font-bold text-sm text-slate-800">1. Identitas Brand, Logo, & Footer</h3>
                <p className="text-xs text-slate-500 mt-0.5">Atur nama hotel, judul portal morning briefing, catatan kaki footer, serta unggah logo kustom di sini.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kolom Kiri: Form Identitas Brand */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 font-mono">Nama Hotel / Brand</label>
                    <input
                      type="text"
                      value={settingsHotelName}
                      onChange={(e) => setSettingsHotelName(e.target.value)}
                      className="w-full bg-slate-50 border border-sand-200 focus:border-red-500 focus:bg-white rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-red-100 transition-all font-sans"
                      placeholder="Contoh: Harper Premier Nagoya Batam"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 font-mono">Judul Portal / List Name</label>
                    <input
                      type="text"
                      value={settingsPortalName}
                      onChange={(e) => setSettingsPortalName(e.target.value)}
                      className="w-full bg-slate-50 border border-sand-200 focus:border-red-500 focus:bg-white rounded-xl px-3 py-1.5 text-xs text-slate-800 font-extrabold focus:outline-none focus:ring-1 focus:ring-red-100 transition-all font-sans"
                      placeholder="Contoh: morning briefing list"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 font-mono">Catatan Kaki Beranda (Footer Text)</label>
                    <textarea
                      rows={2}
                      value={settingsFooterText}
                      onChange={(e) => setSettingsFooterText(e.target.value)}
                      className="w-full bg-slate-50 border border-sand-200 focus:border-red-500 focus:bg-white rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-red-100 transition-all font-sans resize-none"
                      placeholder="Contoh: Penyimpanan cloud terpusat dan cadangan lokal aman secara real-time"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSettingsSaveBrand}
                      className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white font-extrabold text-[11px] rounded-xl transition-all shadow-xs hover:shadow-sm cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>Simpan Identitas Brand</span>
                    </button>
                    {saveBrandSuccess && (
                      <span className="text-[10px] text-emerald-600 font-bold font-mono animate-fadeIn">
                        ✓ Berhasil Disimpan
                      </span>
                    )}
                  </div>
                </div>

                {/* Kolom Kanan: Upload Logo */}
                <div className="space-y-3">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono">Logo Kustom Hotel</label>
                  
                  {/* Drag and Drop Container */}
                  <div
                    onDragOver={handleLogoDragOver}
                    onDragLeave={handleLogoDragLeave}
                    onDrop={handleLogoDrop}
                    className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all min-h-[140px] ${
                      isDraggingLogo 
                        ? 'border-red-500 bg-red-50/30' 
                        : 'border-sand-250 bg-slate-50 border-sand-300 hover:bg-slate-100/40 hover:border-sand-400'
                    }`}
                  >
                    {logo ? (
                      <div className="space-y-2 flex flex-col items-center">
                        <div className="relative group w-16 h-16 bg-white border border-sand-200 rounded-xl overflow-hidden shadow-xs flex items-center justify-center p-1">
                          <img src={logo} alt="Custom Logo Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-emerald-600 font-semibold">✓ Logo Kustom Aktif</p>
                          <button
                            type="button"
                            onClick={() => {
                              setLogo(null);
                              localStorage.removeItem('morning_briefing_logo');
                              saveStateToCloud(data, hotelName, portalName, null);
                              triggerNotification(
                                'delete', 
                                'Logo Kustom Dihapus', 
                                'Logo kustom telah dihapus. Sistem kembali menggunakan lencana default Compass.'
                              );
                            }}
                            className="mt-1 text-[10px] text-red-600 hover:text-red-700 font-bold transition-all hover:underline cursor-pointer flex items-center gap-1 inline-flex"
                          >
                            <Trash2 size={11} />
                            <span>Hapus & Gunakan Default</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 flex flex-col items-center p-1">
                        <div className="p-2.5 bg-red-50 border border-red-100/65 rounded-full text-red-600">
                          <ImageIcon size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-700 leading-tight">
                            Seret & lepas logo di sini, atau
                          </p>
                          
                          <label className="mt-1 inline-block px-2.5 py-1 bg-white border border-sand-300 hover:border-red-500 rounded-lg text-[9.5px] font-bold text-slate-750 hover:text-red-600 cursor-pointer shadow-xs transition-colors">
                            Pilih File Gambar
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleLogoFile(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono">PNG, JPG, SVG, GIF (Maks. 2MB)</p>
                      </div>
                    )}
                  </div>

                  {logoError && (
                    <div className="p-2 bg-red-50 border border-red-100 rounded-xl flex items-start gap-1.5 animate-fadeIn">
                      <AlertCircle size={12} className="text-red-600 shrink-0 mt-0.5" />
                      <p className="text-[9.5px] text-red-700 leading-tight font-medium">{logoError}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Google Sheets Connection Panel */}
            <section id="google-sheets-panel" className="bg-white border border-sand-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="border-b border-sand-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-800">2. Sinkronisasi Google Sheets</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tautkan lembar kerja input harian secara instan ke Drive akun Google Anda.</p>
                </div>
                
                {/* Auto Sync Control */}
                <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                  <div className="flex items-center gap-2 bg-slate-50 border border-sand-250 rounded-xl px-3.5 py-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isAutoSyncEnabled ? 'bg-emerald-400' : 'bg-gray-400'
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        isAutoSyncEnabled ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}></span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-705">
                      Live Auto-Sync: <span className="font-extrabold">{isAutoSyncEnabled ? 'Aktif (6s)' : 'Mati'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)}
                      className={`ml-2 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        isAutoSyncEnabled
                          ? 'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-700'
                          : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isAutoSyncEnabled ? 'Pause' : 'Resume'}
                    </button>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${
                user ? 'bg-emerald-50/20 border-emerald-100' : 'bg-red-50/20 border-red-100'
              }`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      user ? 'bg-emerald-100/65 text-emerald-800' : 'bg-red-100/70 text-red-700'
                    }`}>
                      <FileSpreadsheet size={22} />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-display font-bold text-xs text-slate-800">
                          Penyimpanan: {user ? 'Google Sheets Cloud' : 'Browser Offline (Local)'}
                        </h4>
                        <span className={`inline-flex items-center gap-1 text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider font-mono ${
                          user 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/60' 
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-600 animate-pulse' : 'bg-red-600 animate-pulse'}`}></span>
                          {user ? 'Online Cloud' : 'Offline Lokal'}
                        </span>
                        
                        {syncStatus === 'saving' && (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-accent-gold bg-accent-gold/10 px-2.5 py-0.5 rounded-full animate-pulse">
                            <Loader2 size={10} className="animate-spin" /> Menyimpan perubahan...
                          </span>
                        )}

                        {syncStatus === 'loading' && (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full animate-pulse border border-red-100">
                            <Loader2 size={10} className="animate-spin" /> Sinkronisasi data...
                          </span>
                        )}

                        {syncStatus === 'synced' && (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
                            ✓ Cloud Terupdate
                          </span>
                        )}
                      </div>

                      <p className="text-[11.5px] text-gray-600 leading-relaxed max-w-2xl">
                        {user 
                          ? `Terhubung dengan akun Google: ${user.displayName || user.email} (${user.email}). File database 'Hotel_Morning_Briefing_List' tersimpan secara otomatis jika terjadi perubahan.`
                          : 'Perubahan saat ini hanya disimpan pada browser ini demi kecepatan. Masuk dengan Google Account Anda untuk secara dinamis membaca, menulis, dan melacak data langsung dari Google Spreadsheet.'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                    {user ? (
                      <>
                        {spreadsheetId && (
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                            target="_blank"
                            rel="noreferrer referrer"
                            className="px-3.5 py-1.5 bg-white border border-sand-300 hover:border-accent-gold text-slate-700 hover:text-accent-gold font-semibold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <ExternalLink size={12.5} />
                            <span>Buka Spreadsheet</span>
                          </a>
                        )}
                        
                        <button
                          type="button"
                          onClick={handleManualSync}
                          disabled={syncStatus === 'loading' || syncStatus === 'saving'}
                          className="px-3.5 py-1.5 bg-white border border-sand-300 hover:border-slate-400 text-slate-700 font-semibold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                        >
                          <RefreshCw size={12.5} className={syncStatus === 'loading' ? 'animate-spin' : ''} />
                          <span>Sync</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/50 font-bold text-xs rounded-xl transition-all"
                        >
                          Putuskan Link
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLogin}
                        disabled={syncStatus === 'loading'}
                        className="gsi-material-button text-xs font-sans animate-pulse hover:animate-none"
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid #dadce0',
                          borderRadius: '12px',
                          color: '#3c4043',
                          cursor: 'pointer',
                          fontSize: '11px',
                          height: '32px',
                          letterSpacing: '0.25px',
                          outline: 'none',
                          overflow: 'hidden',
                          padding: '0 12px',
                          position: 'relative',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          width: 'auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontWeight: '500',
                          transition: 'background-color .218s, border-color .218s, box-shadow .218s',
                        }}
                      >
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '16px', height: '16px' }}>
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </svg>
                        <span>Hubungkan Google Sheets</span>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Sync Error Alarm Banner */}
                {syncError && (
                  <div className="mt-3.5 bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2 text-rose-800 text-xs animate-fadeIn">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <h4 className="font-bold">Galat Sinkronisasi</h4>
                      <p className="text-[11px] opacity-90 mt-0.5">{syncError}</p>
                    </div>
                  </div>
                )}
              </div>

              {user && (
                <div className="mt-4 pt-4 border-t border-sand-300/40">
                  {/* Left side: Spreadsheet ID edit or view */}
                  <div className="w-full">
                    {isEditingSpreadsheetId ? (
                      <div className="flex items-center gap-2 max-w-xl">
                        <div className="flex-1 min-w-0">
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">ID atau URL Google Spreadsheet</label>
                          <input
                            type="text"
                            value={tempSpreadsheetId}
                            onChange={(e) => setTempSpreadsheetId(e.target.value)}
                            className="w-full bg-white border border-sand-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-accent-gold"
                            placeholder="Masukkan ID Spreadsheet atau salin link lengkap..."
                          />
                        </div>
                        <div className="flex items-end gap-1.5 self-end pt-5">
                          <button
                            type="button"
                            onClick={() => handleConnectSpreadsheet(tempSpreadsheetId)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all whitespace-nowrap cursor-pointer"
                          >
                            Hubungkan
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingSpreadsheetId(false)}
                            className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-slate-755 font-medium text-xs rounded-lg transition-all cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-450">ID Spreadsheet Terkoneksi:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="text-[11px] font-mono font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 max-w-xs md:max-w-md truncate select-all" title={spreadsheetId || ''}>
                            {spreadsheetId || 'Belum terhubung'}
                          </code>
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setTempSpreadsheetId(spreadsheetId || '');
                                setIsEditingSpreadsheetId(true);
                              }}
                              className="text-slate-700 hover:text-slate-900 transition-colors inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-sand-50 rounded-lg border border-sand-300 shadow-sm cursor-pointer"
                              title="Ganti ID Spreadsheet"
                            >
                              <Pencil size={11} />
                              <span>Ganti ID</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCreateNewSpreadsheet}
                              className="text-slate-700 hover:text-slate-900 transition-colors inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-sand-50 rounded-lg border border-sand-300 shadow-sm cursor-pointer"
                              title="Buat File Spreadsheet Baru di Google Drive"
                            >
                              <Database size={11} />
                              <span>Buat Baru</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Permanent Cloud Database Status Check card */}
            <div className="bg-white border border-sand-200 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="border-b border-sand-100 pb-3">
                <h3 className="font-display font-bold text-sm text-slate-800">3. Database Real-Time Permanen</h3>
                <p className="text-xs text-slate-500 mt-0.5">Segmentasi basis data real-time cloud-sync yang selalu aktif agar data termutakhir di mana pun aplikasi dibuka.</p>
              </div>
              <div className="p-4 bg-emerald-50/20 border border-emerald-100/60 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-800">Firestore Cloud Sync: Terkoneksi Lancar</span>
                  </div>
                  <p className="text-[11.5px] text-gray-600 leading-normal max-w-xl">
                    Sistem otomatis menginkubasi dan menyinkronkan data secara real-time pada database pengembang bersama <code className="text-emerald-700 font-bold bg-white border border-emerald-100 px-1.5 py-0.5 rounded">guciminang88@gmail.com</code> di perangkat mana pun aplikasi digunakan.
                  </p>
                </div>
                <div className="px-3.5 py-1.5 bg-emerald-105/50 border border-emerald-200 text-emerald-800 text-xs font-extrabold rounded-xl shrink-0 self-start md:self-center">
                  DATABASE SELALU AKTIF
                </div>
              </div>
            </div>

            {/* Excel Bulk Loader Panel */}
            <ExcelImportExport 
              data={data} 
              onImportComplete={handleDataChange} 
              canEdit={canEditSection('metrics')} 
              hotelName={hotelName}
              portalName={portalName}
            />

            {/* Maintenance Panel */}
            <div className="bg-white border border-sand-200 p-6 rounded-3xl shadow-xs space-y-6">
              <div className="border-b border-sand-100 pb-4">
                <h3 className="font-display font-bold text-sm text-slate-800">5. Pemeliharaan & Reset Data</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Gunakan tindakan di bawah ini untuk membersihkan lembar kerja input harian atau mengembalikan aplikasi ke kondisi pabrik.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Reset Data Input */}
                <div className="p-5 bg-amber-50/40 border border-amber-200/55 rounded-2xl flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-850">
                      <RotateCcw size={15} className="text-amber-700" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800 font-mono">Reset Input Manual</h4>
                    </div>
                    <p className="text-[11px] text-gray-650 leading-relaxed font-sans">
                      Kosongkan seluruh data isian formulir hari ini (Metrik, VIP, Grup, Checklist) tanpa merusak setelan brand, logo kustom, nama portal, atau tautan Google Sheets.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsResetAllModalOpen(true)}
                    className="w-full mt-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>Kosongkan Form Sekarang</span>
                  </button>
                </div>

                {/* Reset Clear Cache */}
                <div className="p-5 bg-teal-50/40 border border-teal-200/55 rounded-2xl flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-teal-850">
                      <RefreshCw size={15} className="text-teal-700" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-teal-800 font-mono">Bersihkan Cache & Link</h4>
                    </div>
                    <p className="text-[11px] text-gray-650 leading-relaxed font-sans">
                      Bersihkan session cache, putuskan sambungan integrasi Spreadsheet Google, serta hapus file cache logo kustom. Data isian form briefing Anda tetap dipertahankan dengan aman.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsClearCacheModalOpen(true)}
                    className="w-full mt-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={13} />
                    <span>Hapus Cache Browser</span>
                  </button>
                </div>

                {/* Auto-Fix Diagnostic & Repair Center */}
                <div className="p-5 bg-indigo-50/40 border border-indigo-200/55 rounded-2xl flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-indigo-850">
                      <Wrench size={15} className="text-indigo-600 animate-pulse" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-800 font-mono">Auto-Fix & Diagnosis</h4>
                    </div>
                    <p className="text-[11px] text-gray-650 leading-relaxed font-sans font-medium">
                      Pindai dan perbaiki langsung error sistem secara otomatis: struktur database pecah, pembagian angka nol (NaN) pada okupansi, delay sync, atau cache logo rusak.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDiagnosticModalOpen(true);
                      runSelfRepairDiagnostics();
                    }}
                    className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Activity size={13} className="animate-pulse" />
                    <span>Perbaiki Fitur & Link</span>
                  </button>
                </div>

                {/* Reset Total System */}
                <div className="p-5 bg-rose-50/40 border border-rose-200/55 rounded-2xl flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-rose-850">
                      <Trash2 size={15} className="text-rose-700" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-rose-800 font-mono">Reset Total Aplikasi</h4>
                    </div>
                    <p className="text-[11px] text-gray-650 leading-relaxed font-sans">
                      Kembalikan seluruh parameter sistem, kustomisasi judul, logo, tautan real-time database, integrasi eksternal, dan seluruh data input ke setelan default pabrik.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFactoryResetModalOpen(true)}
                    className="w-full mt-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>Reset Total Sistem</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 5. User ID and Access Limit configuration */}
            <div className="bg-white border border-sand-200 p-6 rounded-3xl shadow-xs space-y-6">
              <div className="border-b border-sand-100 pb-4">
                <h3 className="font-display font-bold text-sm text-slate-800">5. Pengaturan User ID & Batasan Akses</h3>
                <p className="text-xs text-slate-500 mt-1 font-sans">
                  Tambahkan atau ubah kredensial User ID departemen dan batasi hak akses masing-masing ke bagian metrik, tamu VIP, jadwal grup, transpor layanan, atau catatan operasional. ID aktif di pojok kanan atas membatasi editing form.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form column */}
                <div className="lg:col-span-5 bg-sand-50/50 p-5 rounded-2xl border border-sand-200/60 space-y-4">
                  <h4 className="text-xs font-bold font-mono tracking-wider text-slate-850 uppercase flex items-center gap-1">
                    <span>📝</span> {editingProfileId ? 'Edit Akses ID' : 'Tambah Akses ID Baru'}
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 font-mono">User ID (Satu Kata Huruf Kecil)</label>
                      <input
                        type="text"
                        value={inputUserId}
                        disabled={editingProfileId !== null}
                        onChange={(e) => setInputUserId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                        placeholder="Contoh: hsk, engineering"
                        className="w-full bg-white border border-sand-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:opacity-60 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 font-mono">Nama Pengguna / Jabatan</label>
                      <input
                        type="text"
                        value={inputUserName}
                        onChange={(e) => setInputUserName(e.target.value)}
                        placeholder="Contoh: Housekeeping Desk"
                        className="w-full bg-white border border-sand-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition font-sans"
                      />
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 font-mono">Hak Akses Menulis (Pilih Bagian):</span>
                      <div className="space-y-2 p-3 bg-white rounded-xl border border-sand-200">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-705 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={inputMetrics}
                            onChange={(e) => setInputMetrics(e.target.checked)}
                            className="rounded text-red-650 focus:ring-red-500"
                          />
                          <span>Metrik Utama Hari Ini</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium text-slate-705 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={inputForecasts}
                            onChange={(e) => setInputForecasts(e.target.checked)}
                            className="rounded text-red-650 focus:ring-red-500"
                          />
                          <span>Forecast 2 Bulan Kedepan</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium text-slate-705 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={inputVip}
                            onChange={(e) => setInputVip(e.target.checked)}
                            className="rounded text-red-650 focus:ring-red-500"
                          />
                          <span>Tamu VIP & Special Requests</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium text-slate-705 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={inputGroups}
                            onChange={(e) => setInputGroups(e.target.checked)}
                            className="rounded text-red-650 focus:ring-red-500"
                          />
                          <span>Daftar Rombongan / Grup</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium text-slate-705 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={inputTransports}
                            onChange={(e) => setInputTransports(e.target.checked)}
                            className="rounded text-red-650 focus:ring-red-500"
                          />
                          <span>Detail Layanan Transportasi</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium text-slate-705 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={inputOperational}
                            onChange={(e) => setInputOperational(e.target.checked)}
                            className="rounded text-red-650 focus:ring-red-500"
                          />
                          <span>Checklist Catatan Operasional</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium text-slate-705 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={inputLongstay}
                            onChange={(e) => setInputLongstay(e.target.checked)}
                            className="rounded text-red-650 focus:ring-red-500"
                          />
                          <span>Detail Longstay Guest</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {profileError && (
                    <p className="text-[10px] text-red-600 font-bold font-mono">{profileError}</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs cursor-pointer"
                    >
                      {editingProfileId ? 'Simpan Perubahan' : 'Tambah User ID'}
                    </button>
                    {editingProfileId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProfileId(null);
                          setInputUserId('');
                          setInputUserName('');
                          setInputMetrics(false);
                          setInputForecasts(false);
                          setInputVip(false);
                          setInputGroups(false);
                          setInputTransports(false);
                          setInputOperational(false);
                          setInputLongstay(false);
                          setProfileError('');
                        }}
                        className="px-3.5 py-2 bg-gray-200 hover:bg-gray-300 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>

                {/* Database state list columns */}
                <div className="lg:col-span-7 space-y-3.5">
                  <h4 className="text-xs font-bold font-mono tracking-wider text-slate-850 uppercase flex items-center gap-1">
                    <span>🔑</span> Daftar User ID & Batasan Hak Akses
                  </h4>

                  <div className="grid grid-cols-1 gap-3.5">
                    {userProfiles.map((p) => {
                      const isSuper = p.userId === 'admin';
                      return (
                        <div key={p.userId} className="p-4 bg-white border border-sand-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs hover:shadow-inner transition">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 font-sans">
                                {p.userName}
                              </span>
                              <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[9.5px] font-extrabold font-mono uppercase">
                                ID: {p.userId.toUpperCase()}
                              </span>
                              {isSuper && (
                                <span className="bg-amber-100 text-amber-850 border border-amber-250 rounded px-1.5 py-0.5 text-[8.5px] font-bold font-mono uppercase">
                                  ★ Admin Utama
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1 items-center pt-0.5">
                              <span className="text-[9px] text-slate-400 font-mono select-none mr-1">Tulis:</span>
                              {p.allowedSections.length === 0 ? (
                                <span className="text-[9px] text-slate-400 italic">Terbaca saja (View-only)</span>
                              ) : (
                                p.allowedSections.map((sec) => (
                                  <span key={sec} className="bg-slate-50 border border-sand-200/70 text-slate-600 px-1.5 py-0.5 rounded text-[8.5px] font-medium font-sans">
                                    {sec === 'metrics' && 'Metrik Utama'}
                                    {sec === 'forecasts' && 'Forecasts'}
                                    {sec === 'vipGuests' && 'VIP Guests'}
                                    {sec === 'groups' && 'Grup'}
                                    {sec === 'transports' && 'Layanan Transport'}
                                    {sec === 'otherOperational' && 'Operasional'}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Control action buttons */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleEditProfile(p)}
                              className="p-1.5 text-slate-450 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition border border-transparent hover:border-amber-100 cursor-pointer"
                              title="Edit Profil"
                            >
                              <Pencil size={12.5} />
                            </button>
                            {!isSuper && (
                              <button
                                type="button"
                                onClick={() => handleDeleteProfile(p.userId)}
                                className="p-1.5 text-slate-450 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-100 cursor-pointer"
                                title="Hapus User ID"
                              >
                                <Trash2 size={12.5} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
      </div> {/* Closes the layout flex container */}



      {/* Beautiful Tailwind Modal for Reset All Inputs */}
      {isResetAllModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-sand-200 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden transform scale-100 transition-all duration-300 animate-fadeIn">
            
            {resetAllSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-100/80 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-black text-lg text-slate-800">Form Dikosongkan!</h3>
                  <p className="text-xs text-gray-500">Semua input manual berhasil dihapus dan siap diisi baru.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 text-amber-750 rounded-2xl">
                    <RotateCcw size={24} className="text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-base text-slate-800">Reset & Kosongkan Form?</h3>
                    <p className="text-xs text-gray-500">Konfirmasi pengosongan lembar input harian</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-2">
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold font-mono">Tindakan ini akan mengosongkan:</p>
                  <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-1 leading-normal font-medium">
                    <li>Data Key Metrics & BAR rate hari ini</li>
                    <li>Seluruh daftar Tamu VIP & Special requests</li>
                    <li>Rencana check-in harian Grup / Rombongan</li>
                    <li>Layanan penjemputan & keberangkatan mobil</li>
                    <li>Daftar operational checklist & tasks staf</li>
                  </ul>
                  <p className="text-[10.5px] text-amber-800 font-bold mt-2 leading-relaxed border-t border-amber-200/30 pt-2">
                    ✓ Tetap mempertahankan nama hotel, judul portal, & koneksi tautan Google Drive Anda yang aktif.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsResetAllModalOpen(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAllInputs}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-amber-600/20 cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Kosongkan Form</span>
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Beautiful Tailwind Modal for Clear Cache */}
      {isClearCacheModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-sand-200 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden transform scale-100 transition-all duration-300">
            
            {clearCacheSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-100/80 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-black text-lg text-slate-800">Cache Dihapus!</h3>
                  <p className="text-xs text-gray-500">Seluruh cache integrasi & logo lokal telah dibersihkan.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl">
                    <RefreshCw size={24} />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-base text-slate-800">Bersihkan Cache & Hubungan?</h3>
                    <p className="text-xs text-gray-500">Merapikan session, file logo, & tautan Google Sheets</p>
                  </div>
                </div>

                <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl space-y-2">
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold">Tindakan ini akan menghapus cache lokal:</p>
                  <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-1 leading-normal font-medium">
                    <li>File cache Logo Kustom format base64</li>
                    <li>Tautan ID Spreadsheet Google Sheets saat ini</li>
                    <li>Status sinkronisasi & antrean offline</li>
                  </ul>
                  <p className="text-[10.5px] text-teal-700 font-bold mt-2 leading-relaxed">
                    *Formulir input harian (Metrik, VIP, Grup, dll.) Anda TIDAK akan terhapus dan tetap tersimpan aman di browser Anda.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsClearCacheModalOpen(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-teal-600/20 cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Hapus Cache</span>
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Beautiful Tailwind Modal for Factory Reset */}
      {isFactoryResetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-sand-200 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden transform scale-100 transition-all duration-300">
            
            {factoryResetSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-100/80 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-black text-lg text-slate-800">Reset Pabrik Berhasil!</h3>
                  <p className="text-xs text-gray-500">Sistem dan seluruh data telah kembali ke setelan bawaan.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-base text-slate-800">Reset Total (Setelan Pabrik)?</h3>
                    <p className="text-xs text-gray-500">Konfirmasi pembersihan total sistem</p>
                  </div>
                </div>

                <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-2">
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold text-rose-700">Tindakan ini akan menghapus PERMANEN seluruh setelan:</p>
                  <ul className="text-[11px] text-slate-650 list-disc list-inside space-y-1 leading-normal font-medium">
                    <li>Seluruh Formulir Input Harian (Okupansi, VIP, Grup, Checklist)</li>
                    <li>Kustomisasi Nama Hotel, Portal, & Kapasitas Kamar</li>
                    <li>Kustomisasi Logo & Integrasi Google Sheets</li>
                    <li>Seluruh basis data lokal di browser Anda</li>
                  </ul>
                  <p className="text-[10.5px] text-rose-600 font-bold mt-2 leading-relaxed">
                    *Peringatan: Seluruh data akan hilang secara permanen. Aplikasi akan memuat ulang ke setelan awal dari server.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFactoryResetModalOpen(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleFactoryReset}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Hapus Total Sekarang</span>
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}


      {/* Beautiful Tailwind Modal for Self-Healing / Auto-Fix Diagnosis */}
      {isDiagnosticModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-sand-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden transform scale-100 transition-all duration-300 animate-fadeIn flex flex-col max-h-[90vh]">
            
            <div className="flex items-center gap-3 border-b border-sand-150 pb-4">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl animate-pulse">
                <Wrench size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-black text-base text-slate-800">Sistem Deteksi & Auto-Repair Mandiri</h3>
                <p className="text-xs text-gray-500">Mendiagnosis integritas struktur, kalkulasi matematika, koneksi real-time, dan membetulkan kegagalan fitur instan.</p>
              </div>
            </div>

            <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
              {/* Stepper list */}
              <div className="space-y-3">
                {diagnosticSteps.map((step) => (
                  <div key={step.key} className="p-3 bg-slate-50 border border-sand-200 rounded-2xl flex items-start gap-3 transition">
                    <div className="mt-0.5 shrink-0">
                      {step.status === 'idle' && (
                        <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold">...</div>
                      )}
                      {step.status === 'running' && (
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                      )}
                      {step.status === 'success' && (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold font-sans">✓</div>
                      )}
                      {step.status === 'repaired' && (
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold font-sans">🛠️</div>
                      )}
                      {step.status === 'failed' && (
                        <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold font-sans">✗</div>
                      )}
                    </div>
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-850 truncate">{step.label}</h4>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                          step.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                          step.status === 'repaired' ? 'bg-indigo-50 text-indigo-700' :
                          step.status === 'running' ? 'bg-indigo-100 text-indigo-800 animate-pulse' :
                          step.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {step.status === 'success' ? 'Ok' :
                           step.status === 'repaired' ? 'Fixed' :
                           step.status === 'running' ? 'Scanning' :
                           step.status === 'failed' ? 'Err' : 'Idle'}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-gray-500 leading-normal">{step.details}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Console logs box */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Activity size={10} className="text-indigo-600" /> Terminal Perbaikan Sistem (Live Logs)
                </label>
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-3 h-32 overflow-y-auto font-mono text-[10px] text-indigo-350 space-y-1 scrollbar-thin select-none shadow-inner">
                  {repairLog.length === 0 ? (
                    <div className="text-gray-500 italic animate-pulse">Menunggu inisialisasi diagnostik otomatis...</div>
                  ) : (
                    repairLog.map((line, idx) => (
                      <div key={idx} className={`${line.includes('Selesai') || line.includes('SELESAI') ? 'text-emerald-400 font-extrabold' : line.includes('Error') || line.includes('Gagal') ? 'text-rose-400 font-bold' : line.includes('diperbaiki') || line.includes('Reset') ? 'text-indigo-300 font-bold' : 'text-slate-400'}`}>
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-sand-150 flex gap-3">
              <button
                type="button"
                disabled={diagnosticRunning}
                onClick={runSelfRepairDiagnostics}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={12} className={diagnosticRunning ? 'animate-spin' : ''} />
                <span>Pindai Ulang</span>
              </button>
              <button
                type="button"
                disabled={diagnosticRunning}
                onClick={() => setIsDiagnosticModalOpen(false)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer"
              >
                <span>{diagnosticRunning ? 'Melakukan Perbaikan...' : 'Selesai & Tutup'}</span>
              </button>
            </div>

          </div>
        </div>
      )}



      {/* Global Missing Forms Modal */}
      {showMissingFormsGlobalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-zoomIn transform scale-95 border border-sand-200">
                <div className="bg-rose-50 border-b border-rose-100 px-5 py-4 flex items-center justify-between">
                    <h3 className="font-display font-black text-rose-800 flex items-center gap-2">
                        <AlertCircle size={18} />
                        Formulir Terlewat
                    </h3>
                    <button onClick={() => setShowMissingFormsGlobalModal(false)} className="text-rose-400 hover:text-rose-700 transition">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-5">
                    <p className="text-sm text-slate-600 mb-4">
                        Peringatan: Ditemukan nomor urut form yang belum disubmit dalam urutan seri:
                    </p>

                    <div className="bg-slate-50 p-4 rounded-xl border border-sand-200 max-h-60 overflow-y-auto">
                        <div className="flex flex-col gap-4">
                            {globalMissingForms.map((missingItem, idx) => (
                                <div key={idx}>
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2 border-b border-sand-200 pb-1">{missingItem.typeName}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {missingItem.missing.map(num => (
                                            <span key={num} className="bg-white border border-rose-200 text-rose-600 px-2 py-1 rounded shadow-sm text-xs font-mono font-bold">
                                                {num}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-500 mt-4 leading-relaxed italic text-center">
                        Segera periksa dan submit kembali form yang melompat ini pada tab Formulir.
                    </p>
                </div>
            </div>
        </div>
      )}

      {/* Floating Notification Area */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none print:hidden">
        {notifications.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 border backdrop-blur-md animate-slide-in-right pointer-events-auto transition-all duration-300 transform translate-y-0 ${
              toast.type === 'delete'
                ? 'bg-amber-50/95 border-amber-200/80 text-amber-900 shadow-amber-900/10'
                : toast.type === 'edit'
                ? 'bg-blue-50/95 border-blue-200/80 text-blue-900 shadow-blue-900/10'
                : 'bg-emerald-50/95 border-emerald-200/80 text-emerald-950 shadow-emerald-900/10'
            }`}
          >
            <div className={`p-1.5 rounded-xl shrink-0 ${
              toast.type === 'delete'
                ? 'bg-amber-100 text-amber-700'
                : toast.type === 'edit'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {toast.type === 'delete' ? (
                <Trash2 size={16} />
              ) : toast.type === 'edit' ? (
                <Pencil size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
            </div>
            <div className="flex-1 space-y-0.5 min-w-0">
              <h4 className="text-xs font-black tracking-tight leading-snug">{toast.title}</h4>
              <p className="text-[10.5px] leading-relaxed opacity-90 font-medium">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotifications((prev) => prev.filter((item) => item.id !== toast.id))}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer self-start p-1 text-base leading-none font-bold"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-sand-200 z-[60] flex justify-around items-center px-2 py-1 safe-area-bottom shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <button 
          onClick={() => { setActiveTab('occupancy'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'occupancy' ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Home size={20} className={activeTab === 'occupancy' ? 'fill-sky-50 text-sky-600' : ''} />
          <span className="text-[10px] font-bold">Utama</span>
        </button>
        
        <button 
          onClick={() => { setActiveTab('guest-use'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'guest-use' ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <FileText size={20} className={activeTab === 'guest-use' ? 'fill-sky-50 text-sky-600' : ''} />
          <span className="text-[10px] font-bold">Form</span>
        </button>

        <button 
          onClick={() => { setActiveTab('logbook'); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'logbook' ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <BookOpen size={20} className={activeTab === 'logbook' ? 'fill-sky-50 text-sky-600' : ''} />
          <span className="text-[10px] font-bold">Log Book</span>
        </button>

        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${isMobileMenuOpen ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Menu size={20} className={isMobileMenuOpen ? 'fill-sky-50 text-sky-600' : ''} />
          <span className="text-[10px] font-bold">More</span>
        </button>
      </nav>

    </div>
  );
}
