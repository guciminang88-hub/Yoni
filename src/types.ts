export interface Attendance {
  id: string;
  name: string;
  department: string;
  role: string;
  status: 'Present' | 'Late' | 'Absent';
  checkInTime: string;
}

export interface DailyProgress {
  id: string;
  department: string;
  progress: number; // Percentage
  notes: string;
  updatedBy: string;
  updatedTime: string;
}

export interface BarTier {
  id: string;
  level: string; // e.g., "BAR 1", "BAR 2"
  rate: number;
  remarks: string; // e.g., "Okupansi < 50%"
  isActive?: boolean;
}

export interface GeneralMetrics {
  onHandBookingCount: number;
  onHandBookingPercentage: number;
  totalArrivalsToday: number;
  totalDeparturesToday: number;
  barRateToday: number; // In local currency, e.g. Rupiah IDR or standard price
  barTiers?: BarTier[];
  oooRoomsCount: number;
  taxiRevenue?: number;
}

export interface VipGuest {
  id: string;
  name: string;
  roomType: string;
  roomNumber: string;
  eta: string;
  requests: string;
  vipLevel: string; // e.g., "VIP 1", "VIP 2", "VVIP"
}

export interface IncomingGroup {
  id: string;
  groupName: string;
  roomsCount: number;
  guestCount: number;
  eta: string;
  remarks: string;
}

export interface ForecastMonth {
  id: string; // "month-1" or "month-2"
  monthName: string; // e.g., "June 2026"
  percentage: number;
  bookedRooms: number;
}

export interface Forecast7DaysItem {
  id: string;
  date: string; // YYYY-MM-DD
  dayName: string; // e.g. "Senin"
  bookedRooms: number;
  percentage: number;
}

export interface GuestTransport {
  id: string;
  guestName: string;
  roomNumber: string;
  type: 'Pickup' | 'Drop-off';
  time: string;
  flightNumber: string;
  carDetails: string;
  status: 'Pending' | 'On the way' | 'Completed';
  passengerCount?: number;
}

export interface OtherOperational {
  id: string;
  title: string;
  notes: string;
  category: string; // e.g. "FO", "HK", "FB", "ENG", "SEC", "GEN"
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Completed';
}

export interface LongstayGuest {
  id: string;
  guestName: string;
  arrivalDate: string;
  departureDate: string;
  company: string;
  roomNumber: string;
}

export interface GuestUseType {
  id: string;
  name: string;
  startSeries: number | null;
  endSeries: number | null;
}

export interface GuestUseUsage {
  id: string;
  typeId: string; // References GuestUseType.id
  formNumber: number;
  roomNumber?: string;
  usageDesc: string;
  staffName: string;
  date?: string; // YYYY-MM-DD
  isSubmitted?: boolean;
}

export interface ConciergeLog {
  id: string;
  no: number;
  tanggal: string;
  departemen: string;
  tujuan: string;
  namaDriver: string;
  noKendaraan: string;
  kmOut: number;
  kmIn: number;
  totalKm: number;
}

export interface BriefingData {
  attendanceList: Attendance[];
  dailyProgress: DailyProgress[];
  metrics: GeneralMetrics;
  vipGuests: VipGuest[];
  groups: IncomingGroup[];
  forecasts: ForecastMonth[];
  forecasts7Days?: Forecast7DaysItem[];
  transports: GuestTransport[];
  otherOperational: OtherOperational[];
  longstayGuests: LongstayGuest[];
  guestUseTypes?: GuestUseType[];
  guestUseUsages?: GuestUseUsage[];
  logBooks?: LogBookEntry[];
  conciergeLogs?: ConciergeLog[];
}

export interface LogBookEntry {
  id: string;
  no: number;
  tanggal: string; // ISO format date 'YYYY-MM-DD'
  nama: string;
  detailInfo: string;
  statusInfo: 'Open' | 'In Progress' | 'Closed';
  createdAt: string; // ISO datetime
}

export interface UserProfile {
  userId: string;
  userName: string;
  allowedSections: string[]; // e.g. ['metrics', 'forecasts', 'vipGuests', 'groups', 'transports', 'otherOperational']
}

export interface DailyHistoryRecord {
  date: string; // "YYYY-MM-DD"
  hotelName: string;
  portalName: string;
  metrics: {
    onHandBookingCount: number;
    onHandBookingPercentage: number;
    totalArrivalsToday: number;
    totalDeparturesToday: number;
    barRateToday: number;
    oooRoomsCount: number;
    taxiRevenue?: number;
  };
  vipCount: number;
  groupCount: number;
  transportCount: number;
  otherOperationalCount: number;
  longstayCount: number;
  updatedAt: string; // ISO DateTime
  details: BriefingData; // Full briefing snapshot to view historical board details!
}

