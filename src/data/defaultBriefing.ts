import { BriefingData } from '../types';

export const DEFAULT_BRIEFING_DATA: BriefingData = {
  attendanceList: [
    {
      id: "att-1",
      name: "Suryadarma",
      department: "Front Office",
      role: "FOM (Front Office Manager)",
      status: "Present",
      checkInTime: "07:45 AM"
    },
    {
      id: "att-2",
      name: "Ni Putu Ayu",
      department: "Housekeeping",
      role: "Executive Housekeeper",
      status: "Present",
      checkInTime: "07:50 AM"
    },
    {
      id: "att-3",
      name: "Chef Henry",
      department: "Food & Beverage",
      role: "Executive Chef",
      status: "Late",
      checkInTime: "08:15 AM"
    },
    {
      id: "att-4",
      name: "I Wayan Sugi",
      department: "Engineering",
      role: "Chief Engineer",
      status: "Present",
      checkInTime: "07:30 AM"
    },
    {
      id: "att-5",
      name: "Hendra Wijaya",
      department: "Sales & Marketing",
      role: "Director of Sales",
      status: "Present",
      checkInTime: "08:00 AM"
    },
    {
      id: "att-6",
      name: "Ketut Arta",
      department: "Security",
      role: "Chief Security",
      status: "Present",
      checkInTime: "07:40 AM"
    }
  ],
  dailyProgress: [
    {
      id: "prog-1",
      department: "Front Office",
      progress: 90,
      notes: "Prepared keys for VIP Arrivals. Cleaned lobby area. Morning briefing held with GSAs.",
      updatedBy: "Suryadarma",
      updatedTime: "08:15 AM"
    },
    {
      id: "prog-2",
      department: "Housekeeping",
      progress: 75,
      notes: "Targeting check-out rooms by 1 PM. Special deep cleaning for Villa 102 & 204.",
      updatedBy: "Ni Putu Ayu",
      updatedTime: "08:20 AM"
    },
    {
      id: "prog-3",
      department: "Food & Beverage",
      progress: 60,
      notes: "Breakfast service closed with 148 covers. Preparation for poolside Indonesian Night buffet active.",
      updatedBy: "Chef Henry",
      updatedTime: "08:30 AM"
    },
    {
      id: "prog-4",
      department: "Engineering",
      progress: 50,
      notes: "AC maintenance in room 305 completed. Pool filter cleaning is on-going, ETA 11 AM.",
      updatedBy: "I Wayan Sugi",
      updatedTime: "08:05 AM"
    },
    {
      id: "prog-5",
      department: "Sales & Marketing",
      progress: 80,
      notes: "Site inspection query from Astra Group received today, organizing itinerary and welcome gift.",
      updatedBy: "Hendra Wijaya",
      updatedTime: "08:10 AM"
    }
  ],
  metrics: {
    // 142 occupied out of 200 rooms -> 71%
    onHandBookingCount: 142,
    onHandBookingPercentage: 71,
    totalArrivalsToday: 38,
    totalDeparturesToday: 29,
    barRateToday: 1850000, // Rp 1.850.000 / night
    oooRoomsCount: 0,
    taxiRevenue: 350000
  },
  vipGuests: [
    {
      id: "vip-1",
      name: "Mr. Jean-Luc Godard",
      roomType: "Royal Pool Villa",
      roomNumber: "Villa 102",
      eta: "14:30",
      requests: "Complimentary champagne. Butler orientation required at check-in. Extra firm pillows.",
      vipLevel: "VIP 1 (VVVIP)"
    },
    {
      id: "vip-2",
      name: "Mrs. Sarah Jenkins & Family",
      roomType: "Ocean Suite",
      roomNumber: "Room 304",
      eta: "16:00",
      requests: "Anniversary flower arrangement. Extra rollaway bed. Early check-in requested if possible.",
      vipLevel: "VIP 2 (Regular VIP)"
    },
    {
      id: "vip-3",
      name: "Dato Sri Hisyam bin Omar",
      roomType: "Executive Residence",
      roomNumber: "Room 501",
      eta: "13:15",
      requests: "Needs private baggage handling. Halal food amenities only. Extended late check-out till 4 PM proposed.",
      vipLevel: "VIP 1 (VVVIP)"
    }
  ],
  groups: [
    {
      id: "grp-1",
      groupName: "Toyota Astra Motor Executive Retreat",
      roomsCount: 15,
      guestCount: 30,
      eta: "11:30",
      remarks: "Express check-in in the main ballroom. Welcome drink: Ginger iced tea. Luggage tags 'TOYOTA'."
    },
    {
      id: "grp-2",
      groupName: "Goldman Sachs Asia-Pacific Cohort",
      roomsCount: 22,
      guestCount: 44,
      eta: "15:00",
      remarks: "Welcome banners in lobby. Meeting set up at Boardroom A started today. Dinner hosted in SeaGlow Grill."
    }
  ],
  forecasts: [
    {
      id: "fc-1",
      monthName: "Next Month (June 2026)",
      percentage: 82,
      bookedRooms: 164
    },
    {
      id: "fc-2",
      monthName: "Following Month (July 2026)",
      percentage: 67,
      bookedRooms: 134
    }
  ],
  forecasts7Days: [
    { id: "fc7-1", date: "2026-06-07", dayName: "Minggu", bookedRooms: 142, percentage: 71 },
    { id: "fc7-2", date: "2026-06-08", dayName: "Senin", bookedRooms: 125, percentage: 62.5 },
    { id: "fc7-3", date: "2026-06-09", dayName: "Selasa", bookedRooms: 110, percentage: 55 },
    { id: "fc7-4", date: "2026-06-10", dayName: "Rabu", bookedRooms: 132, percentage: 66 },
    { id: "fc7-5", date: "2026-06-11", dayName: "Kamis", bookedRooms: 145, percentage: 72.5 },
    { id: "fc7-6", date: "2026-06-12", dayName: "Jumat", bookedRooms: 168, percentage: 84 },
    { id: "fc7-7", date: "2026-06-13", dayName: "Sabtu", bookedRooms: 180, percentage: 90 }
  ],
  transports: [
    {
      id: "tr-1",
      guestName: "Mr. Jean-Luc Godard",
      roomNumber: "Villa 102",
      type: "Pickup",
      time: "13:30",
      flightNumber: "Batam Center",
      carDetails: "Toyota Alphard Slate - Alph-1",
      status: "On the way",
      passengerCount: 2
    },
    {
      id: "tr-2",
      guestName: "Dr. Richard Feynman",
      roomNumber: "Room 214",
      type: "Drop-off",
      time: "10:00",
      flightNumber: "Harbourbay",
      carDetails: "Vellfire Black - Vell-3",
      status: "Completed",
      passengerCount: 1
    },
    {
      id: "tr-3",
      guestName: "Ambassador Matsuoka",
      roomNumber: "Suite 405",
      type: "Pickup",
      time: "17:15",
      flightNumber: "Sekupang",
      carDetails: "Alphard White - Alph-2",
      status: "Pending",
      passengerCount: 4
    }
  ],
  otherOperational: [
    {
      id: "op-1",
      title: "Inspect Spa Steam Room Leakage",
      notes: "Spa team complained water pressure drop. Engineering team to fix by midday.",
      category: "ENG",
      priority: "High",
      status: "Pending"
    },
    {
      id: "op-2",
      title: "Lobby flower arrangement rotation",
      notes: "Replace yellow orchids with fresh sunset orange heliconias for the weekend vibe.",
      category: "HK",
      priority: "Medium",
      status: "Completed"
    },
    {
      id: "op-3",
      title: "Stock check for pool towels",
      notes: "Ensure standard minimum level is maintained. Current pool towel laundry is delayed.",
      category: "FO",
      priority: "Medium",
      status: "Pending"
    },
    {
      id: "op-4",
      title: "Briefing on guest allergens",
      notes: "Chef Henry to review daily VIP allergies list with all waiting staff before lunchtime.",
      category: "FB",
      priority: "High",
      status: "Pending"
    }
  ],
  longstayGuests: [
    {
      id: "ls-1",
      guestName: "Hans Müller",
      arrivalDate: "2026-05-01",
      departureDate: "2026-06-15",
      company: "Siemens Indonesia",
      roomNumber: "Room 402"
    },
    {
      id: "ls-2",
      guestName: "Yoshiro Tanaka",
      arrivalDate: "2026-04-10",
      departureDate: "2026-06-30",
      company: "Panasonic Batam",
      roomNumber: "Room 312"
    }
  ],
  guestUseTypes: [
    { id: "gu-1", name: "Official receipt", startSeries: 100, endSeries: 150 },
    { id: "gu-2", name: "Miscellaneous", startSeries: 200, endSeries: 250 },
    { id: "gu-3", name: "Paid Out", startSeries: 500, endSeries: 520 },
    { id: "gu-4", name: "Room Rate change", startSeries: 800, endSeries: 810 }
  ],
  guestUseUsages: [],
  logBooks: [],
  conciergeLogs: []
};
