import { BriefingData, GeneralMetrics, ForecastMonth, VipGuest, IncomingGroup, GuestTransport, OtherOperational } from '../types';

/**
 * Searches the user's Google Drive for a spreadsheet named 'Hotel_Morning_Briefing_List'.
 * Returns the spreadsheet ID if found, otherwise null.
 */
export async function searchSpreadsheet(accessToken: string): Promise<string | null> {
  try {
    const q = encodeURIComponent("name = 'Hotel_Morning_Briefing_List' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to search Google Drive: ${res.statusText}`);
    }

    const result = await res.json();
    if (result.files && result.files.length > 0) {
      return result.files[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error in searchSpreadsheet:', error);
    return null;
  }
}

/**
 * Creates a brand-new Spreadsheet in Google Drive with the standard briefing sheets structure.
 */
export async function createSpreadsheet(
  accessToken: string,
  defaultData: BriefingData,
  hotelName: string,
  portalName: string
): Promise<string> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: 'Hotel_Morning_Briefing_List',
      },
      sheets: [
        { properties: { title: 'Config' } },
        { properties: { title: 'Metrics' } },
        { properties: { title: 'Forecasts' } },
        { properties: { title: 'VIP_Guests' } },
        { properties: { title: 'Groups' } },
        { properties: { title: 'Transports' } },
        { properties: { title: 'Operational' } },
        { properties: { title: 'Longstay_Guests' } },
        { properties: { title: 'Daily_History' } },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Create Spreadsheet error body:', errorBody);
    throw new Error(`Failed to create spreadsheet: ${response.statusText}`);
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;

  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID was not returned from creation API');
  }

  // Populate it with default data immediately
  await saveSpreadsheetData(accessToken, spreadsheetId, defaultData, hotelName, portalName);

  return spreadsheetId;
}

/**
 * Loading spreadsheet data from Google Sheets values and parsing it into structured models.
 */
export async function loadSpreadsheetData(
  accessToken: string,
  spreadsheetId: string,
  defaultData: BriefingData
): Promise<{ data: BriefingData; hotelName: string; portalName: string }> {
  // Safe sheet detection: Fetch sheets metadata first to avoid 400 bad request errors if a tab is missing
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const metaRes = await fetch(metaUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let availableSheets: string[] = [];
  if (metaRes.ok) {
    const meta = await metaRes.json();
    availableSheets = meta.sheets ? meta.sheets.map((s: any) => s.properties.title) : [];
  }

  const desiredRanges = [
    { name: 'Config', range: 'Config!A1:Z100' },
    { name: 'Metrics', range: 'Metrics!A1:Z10' },
    { name: 'Forecasts', range: 'Forecasts!A1:Z50' },
    { name: 'VIP_Guests', range: 'VIP_Guests!A1:Z100' },
    { name: 'Groups', range: 'Groups!A1:Z100' },
    { name: 'Transports', range: 'Transports!A1:Z100' },
    { name: 'Operational', range: 'Operational!A1:Z100' },
    { name: 'Longstay_Guests', range: 'Longstay_Guests!A1:Z200' },
  ];

  // Only request ranges for sheets that actually exist in the workbook
  const activeRanges = desiredRanges.filter(r => availableSheets.includes(r.name) || r.name === 'Config');
  const queryRanges = activeRanges.map(r => `ranges=${encodeURIComponent(r.range)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&${queryRanges}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load spreadsheet: ${response.statusText}`);
  }

  const result = await response.json();
  const valueRanges = result.valueRanges || [];

  // 1. Config Parse
  const configRows = valueRanges.find((vr: any) => vr.range.startsWith('Config'))?.values || [];
  let hotelName = 'Harper Premier Nagoya Batam';
  let portalName = 'morning briefing list';

  // skip header [Key, Value]
  for (let i = 1; i < configRows.length; i++) {
    const key = configRows[i][0];
    const val = configRows[i][1];
    if (key === 'hotelName') hotelName = String(val || hotelName);
    if (key === 'portalName') portalName = String(val || portalName);
  }

  // Helper map row elements safely to model properties
  const getVal = (row: any[], index: number, fallback: any) => {
    if (row && row[index] !== undefined && row[index] !== null) {
      return row[index];
    }
    return fallback;
  };

  // 2. Metrics Parse
  const metricsRows = valueRanges.find((vr: any) => vr.range.startsWith('Metrics'))?.values || [];
  let metrics: GeneralMetrics = { ...defaultData.metrics };
  if (metricsRows.length > 1) {
    const r = metricsRows[1];
    metrics = {
      onHandBookingCount: Number(getVal(r, 0, metrics.onHandBookingCount)),
      onHandBookingPercentage: Number(getVal(r, 1, metrics.onHandBookingPercentage)),
      totalArrivalsToday: Number(getVal(r, 2, metrics.totalArrivalsToday)),
      totalDeparturesToday: Number(getVal(r, 3, metrics.totalDeparturesToday)),
      barRateToday: Number(getVal(r, 4, metrics.barRateToday)),
      oooRoomsCount: Number(getVal(r, 5, metrics.oooRoomsCount || 0)),
      taxiRevenue: Number(getVal(r, 6, metrics.taxiRevenue || 0)),
    };
  }

  // 3. Forecasts Parse
  const forecastsRows = valueRanges.find((vr: any) => vr.range.startsWith('Forecasts'))?.values || [];
  const forecasts: ForecastMonth[] = [];
  for (let i = 1; i < forecastsRows.length; i++) {
    const r = forecastsRows[i];
    if (!r[1]) continue; // Skip empty rows
    forecasts.push({
      id: String(getVal(r, 0, `fc-${i}`)),
      monthName: String(getVal(r, 1, '')),
      percentage: Number(getVal(r, 2, 0)),
      bookedRooms: Number(getVal(r, 3, 0)),
    });
  }

  // 4. VIP Guests Parse
  const vipRows = valueRanges.find((vr: any) => vr.range.startsWith('VIP_Guests'))?.values || [];
  const vipGuests: VipGuest[] = [];
  for (let i = 1; i < vipRows.length; i++) {
    const r = vipRows[i];
    if (!r[1]) continue;
    vipGuests.push({
      id: String(getVal(r, 0, `vip-${i}`)),
      name: String(getVal(r, 1, '')),
      roomType: String(getVal(r, 2, '')),
      roomNumber: String(getVal(r, 3, '')),
      eta: String(getVal(r, 4, '')),
      requests: String(getVal(r, 5, '')),
      vipLevel: String(getVal(r, 6, '')),
    });
  }

  // 5. Groups Parse
  const groupRows = valueRanges.find((vr: any) => vr.range.startsWith('Groups'))?.values || [];
  const groups: IncomingGroup[] = [];
  for (let i = 1; i < groupRows.length; i++) {
    const r = groupRows[i];
    if (!r[1]) continue;
    groups.push({
      id: String(getVal(r, 0, `grp-${i}`)),
      groupName: String(getVal(r, 1, '')),
      roomsCount: Number(getVal(r, 2, 1)),
      guestCount: Number(getVal(r, 3, 2)),
      eta: String(getVal(r, 4, '')),
      remarks: String(getVal(r, 5, '')),
    });
  }

  // 6. Transports Parse
  const transportRows = valueRanges.find((vr: any) => vr.range.startsWith('Transports'))?.values || [];
  const transports: GuestTransport[] = [];
  for (let i = 1; i < transportRows.length; i++) {
    const r = transportRows[i];
    if (!r[1]) continue;
    transports.push({
      id: String(getVal(r, 0, `tr-${i}`)),
      guestName: String(getVal(r, 1, '')),
      roomNumber: String(getVal(r, 2, '')),
      type: getVal(r, 3, 'Pickup') as 'Pickup' | 'Drop-off',
      time: String(getVal(r, 4, '')),
      flightNumber: String(getVal(r, 5, '')),
      carDetails: String(getVal(r, 6, '')),
      status: getVal(r, 7, 'Pending') as 'Pending' | 'On the way' | 'Completed',
      passengerCount: Number(getVal(r, 8, 1)),
    });
  }

  // 7. Operational Checklist Parse
  const operationalRows = valueRanges.find((vr: any) => vr.range.startsWith('Operational'))?.values || [];
  const otherOperational: OtherOperational[] = [];
  for (let i = 1; i < operationalRows.length; i++) {
    const r = operationalRows[i];
    if (!r[1]) continue;
    otherOperational.push({
      id: String(getVal(r, 0, `op-${i}`)),
      title: String(getVal(r, 1, '')),
      notes: String(getVal(r, 2, '')),
      category: String(getVal(r, 3, 'FO')),
      priority: getVal(r, 4, 'Medium') as 'Low' | 'Medium' | 'High',
      status: getVal(r, 5, 'Pending') as 'Pending' | 'Completed',
    });
  }

  // 8. Longstay Guests Parse
  const longstayRows = valueRanges.find((vr: any) => vr.range.startsWith('Longstay_Guests'))?.values || [];
  const longstayGuests: any[] = [];
  for (let i = 1; i < longstayRows.length; i++) {
    const r = longstayRows[i];
    if (!r[1]) continue;
    longstayGuests.push({
      id: String(getVal(r, 0, `ls-${i}`)),
      guestName: String(getVal(r, 1, '')),
      arrivalDate: String(getVal(r, 2, '')),
      departureDate: String(getVal(r, 3, '')),
      company: String(getVal(r, 4, '')),
      roomNumber: String(getVal(r, 5, '')),
    });
  }

  return {
    hotelName,
    portalName,
    data: {
      attendanceList: defaultData.attendanceList, // Keep existing attendance if not storing in sheet
      dailyProgress: defaultData.dailyProgress,   // Keep existing daily progress if not storing in sheet
      metrics,
      forecasts: forecasts.length > 0 ? forecasts : defaultData.forecasts,
      vipGuests: vipGuests.length > 0 ? vipGuests : defaultData.vipGuests,
      groups: groups.length > 0 ? groups : defaultData.groups,
      transports: transports.length > 0 ? transports : defaultData.transports,
      otherOperational: otherOperational.length > 0 ? otherOperational : defaultData.otherOperational,
      longstayGuests: longstayGuests.length > 0 ? longstayGuests : (defaultData.longstayGuests || []),
    },
  };
}

/**
 * Saves current data models to the user's connected Spreadsheet.
 * Accomplishes this safely via a batchClear followed by atomic batchUpdate.
 */
export async function saveSpreadsheetData(
  accessToken: string,
  spreadsheetId: string,
  data: BriefingData,
  hotelName: string,
  portalName: string
): Promise<void> {
  // Safe sheet detection: Fetch sheets metadata first
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const metaRes = await fetch(metaUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let availableSheets: string[] = [];
  if (metaRes.ok) {
    const meta = await metaRes.json();
    availableSheets = meta.sheets ? meta.sheets.map((s: any) => s.properties.title) : [];
  }

  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`;
  
  // All potential sheets we might clear
  const potentialSheets = [
    { name: 'Config', range: 'Config!A1:Z200' },
    { name: 'Metrics', range: 'Metrics!A1:Z50' },
    { name: 'Forecasts', range: 'Forecasts!A1:Z100' },
    { name: 'VIP_Guests', range: 'VIP_Guests!A1:Z500' },
    { name: 'Groups', range: 'Groups!A1:Z500' },
    { name: 'Transports', range: 'Transports!A1:Z500' },
    { name: 'Operational', range: 'Operational!A1:Z500' },
    { name: 'Longstay_Guests', range: 'Longstay_Guests!A1:Z500' },
  ];

  // Only clear ranges for sheets that actually exist
  const sheetsToClear = potentialSheets
    .filter(s => availableSheets.includes(s.name) || s.name === 'Config')
    .map(s => s.range);

  // Clear previous data before saving
  const clearRes = await fetch(clearUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ranges: sheetsToClear,
    }),
  });

  if (!clearRes.ok) {
    throw new Error(`Failed to clear old sheet rows: ${clearRes.statusText}`);
  }

  // Format dataset arrays
  const configGrid = [
    ['Key', 'Value'],
    ['hotelName', hotelName],
    ['portalName', portalName],
  ];

  const metricsGrid = [
    ['onHandBookingCount', 'onHandBookingPercentage', 'totalArrivalsToday', 'totalDeparturesToday', 'barRateToday', 'oooRoomsCount', 'taxiRevenue'],
    [
      data.metrics.onHandBookingCount,
      data.metrics.onHandBookingPercentage,
      data.metrics.totalArrivalsToday,
      data.metrics.totalDeparturesToday,
      data.metrics.barRateToday,
      data.metrics.oooRoomsCount || 0,
      data.metrics.taxiRevenue || 0,
    ],
  ];

  const forecastsGrid = [
    ['id', 'monthName', 'percentage', 'bookedRooms'],
    ...data.forecasts.map(f => [f.id, f.monthName, f.percentage, f.bookedRooms]),
  ];

  const vipGrid = [
    ['id', 'name', 'roomType', 'roomNumber', 'eta', 'requests', 'vipLevel'],
    ...data.vipGuests.map(v => [v.id, v.name, v.roomType, v.roomNumber, v.eta, v.requests, v.vipLevel]),
  ];

  const groupsGrid = [
    ['id', 'groupName', 'roomsCount', 'guestCount', 'eta', 'remarks'],
    ...data.groups.map(g => [g.id, g.groupName, g.roomsCount, g.guestCount, g.eta, g.remarks]),
  ];

  const transportsGrid = [
    ['id', 'guestName', 'roomNumber', 'type', 'time', 'flightNumber', 'carDetails', 'status', 'passengerCount'],
    ...data.transports.map(t => [t.id, t.guestName, t.roomNumber, t.type, t.time, t.flightNumber, t.carDetails, t.status, t.passengerCount || 1]),
  ];

  const operationalGrid = [
    ['id', 'title', 'notes', 'category', 'priority', 'status'],
    ...data.otherOperational.map(o => [o.id, o.title, o.notes, o.category, o.priority, o.status]),
  ];

  const longstayGrid = [
    ['id', 'guestName', 'arrivalDate', 'departureDate', 'company', 'roomNumber'],
    ...(data.longstayGuests || []).map(l => [l.id, l.guestName, l.arrivalDate, l.departureDate, l.company, l.roomNumber]),
  ];

  // Batch data mapping with dynamic existence defense
  const updateDataPayload: { range: string; values: (string | number)[][]; }[] = [
    { range: 'Config!A1', values: configGrid },
  ];

  if (availableSheets.includes('Metrics')) updateDataPayload.push({ range: 'Metrics!A1', values: metricsGrid });
  if (availableSheets.includes('Forecasts')) updateDataPayload.push({ range: 'Forecasts!A1', values: forecastsGrid });
  if (availableSheets.includes('VIP_Guests')) updateDataPayload.push({ range: 'VIP_Guests!A1', values: vipGrid });
  if (availableSheets.includes('Groups')) updateDataPayload.push({ range: 'Groups!A1', values: groupsGrid });
  if (availableSheets.includes('Transports')) updateDataPayload.push({ range: 'Transports!A1', values: transportsGrid });
  if (availableSheets.includes('Operational')) updateDataPayload.push({ range: 'Operational!A1', values: operationalGrid });
  if (availableSheets.includes('Longstay_Guests')) updateDataPayload.push({ range: 'Longstay_Guests!A1', values: longstayGrid });

  // Atomic batchUpdate payload
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const updateRes = await fetch(updateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: updateDataPayload,
    }),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    console.error('BatchUpdate failed:', errText);
    throw new Error(`Failed to save spreadsheet data: ${updateRes.statusText}`);
  }

  // --- Start of Day-by-Day History Tracking ---
  try {
    // 1. Ensure Daily_History sheet exists dynamically
    if (!availableSheets.includes('Daily_History')) {
      const addSheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
      const addSheetRes = await fetch(addSheetUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Daily_History',
                },
              },
            },
          ],
        }),
      });
      if (addSheetRes.ok) {
        availableSheets.push('Daily_History');
      }
    }

    if (availableSheets.includes('Daily_History')) {
      // 2. Check if headers are initialized in Daily_History
      let hasHeaders = false;
      const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daily_History!A1:A1`;
      const checkRes = await fetch(checkUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (checkRes.ok) {
        const checkJson = await checkRes.json();
        if (checkJson.values && checkJson.values.length > 0 && checkJson.values[0][0]) {
          hasHeaders = true;
        }
      }

      const headers = [
        'Tanggal (Date)',
        'Nama Hotel',
        'Kamar Terjual',
        'Okupansi (%)',
        'Arrivals Today',
        'Departures Today',
        'Harga BAR Hari Ini',
        'Kamar OOO',
        'Total Tamu VIP',
        'Total Grup',
        'Total Transport',
        'Total Tugas Ops',
        'Total Longstay',
        'Waktu Sinkronisasi (Sync Time)'
      ];

      if (!hasHeaders) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daily_History!A1:N1?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [headers],
          }),
        });
      }

      // 3. Construct modern ISO local date: YYYY-MM-DD
      const now = new Date();
      const timezoneOffsetMs = now.getTimezoneOffset() * 60000;
      const localDate = new Date(now.getTime() - timezoneOffsetMs);
      const todayStr = localDate.toISOString().slice(0, 10);

      const rowData = [
        todayStr,
        hotelName,
        data.metrics.onHandBookingCount || 0,
        data.metrics.onHandBookingPercentage || 0,
        data.metrics.totalArrivalsToday || 0,
        data.metrics.totalDeparturesToday || 0,
        data.metrics.barRateToday || 0,
        data.metrics.oooRoomsCount || 0,
        data.vipGuests ? data.vipGuests.length : 0,
        data.groups ? data.groups.length : 0,
        data.transports ? data.transports.length : 0,
        data.otherOperational ? data.otherOperational.length : 0,
        data.longstayGuests ? data.longstayGuests.length : 0,
        now.toLocaleString('id-ID'),
      ];

      // 4. Find if today's date already exists in Daily_History column A
      const getHistoryUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daily_History!A1:A2000`;
      const getHistoryRes = await fetch(getHistoryUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      let existingRowIndex = -1;
      if (getHistoryRes.ok) {
        const getHistoryJson = await getHistoryRes.json();
        const datesColumn = getHistoryJson.values || [];
        for (let i = 0; i < datesColumn.length; i++) {
          if (datesColumn[i] && datesColumn[i][0] === todayStr) {
            existingRowIndex = i + 1; // 1-based row index
            break;
          }
        }
      }

      if (existingRowIndex !== -1) {
        // Overwrite existing row for today matching day-by-day
        const updateRowUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daily_History!A${existingRowIndex}:N${existingRowIndex}?valueInputOption=USER_ENTERED`;
        await fetch(updateRowUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [rowData],
          }),
        });
      } else {
        // Append as a new row
        const appendRowUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daily_History!A1:append?valueInputOption=USER_ENTERED`;
        await fetch(appendRowUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [rowData],
          }),
        });
      }
    }
  } catch (historyErr) {
    console.error('Error tracking daily history to Google Sheets:', historyErr);
  }
  // --- End of Day-by-Day History Tracking ---
}

/**
 * Creates/uploads a beautifully formatted Daily Recap text file (.md) inside the user's Google Drive.
 */
export async function uploadRecapToDrive(
  accessToken: string,
  fileName: string,
  markdownContent: string
): Promise<{ id: string; webViewLink?: string }> {
  try {
    const metadata = {
      name: fileName,
      mimeType: 'text/markdown',
      description: 'Morning Briefing Daily Summary & HOD Recap File',
    };

    const boundary = 'morning_briefing_boundary_v1';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const multipartBody = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/markdown; charset=UTF-8\r\n\r\n' +
      markdownContent +
      closeDelim;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,alternateLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Drive upload failed, status:', res.status, errText);
      throw new Error(`Failed to save recap to Google Drive: ${res.statusText}`);
    }

    const json = await res.json();
    return {
      id: json.id,
      webViewLink: json.webViewLink || json.alternateLink,
    };
  } catch (error: any) {
    console.error('Error uploading recap to Google Drive:', error);
    throw error;
  }
}

