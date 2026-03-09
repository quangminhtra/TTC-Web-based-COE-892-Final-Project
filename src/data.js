export const alerts = [
  {
    id: 1,
    level: 'warning',
    title: 'Minor delay on Line 1',
    message: 'Northbound trains are running about 5 minutes behind schedule near Eglinton.',
  },
  {
    id: 2,
    level: 'info',
    title: 'Service operating normally on Line 2',
    message: 'No major disruptions reported at this time.',
  },
];

export const overviewCards = [
  { label: 'Active Vehicles', value: '42', helper: '28 trains, 14 buses' },
  { label: 'Stations Monitored', value: '31', helper: 'Live status available' },
  { label: 'Peak Demand Window', value: '7:00–9:00', helper: 'Morning commute' },
  { label: 'Average Delay', value: '3 min', helper: 'Across all active lines' },
];

export const lines = [
  { id: 'line1', name: 'Line 1 Yonge-University', colorClass: 'line-yellow', status: 'Delayed' },
  { id: 'line2', name: 'Line 2 Bloor-Danforth', colorClass: 'line-green', status: 'Normal' },
  { id: 'line4', name: 'Line 4 Sheppard', colorClass: 'line-purple', status: 'Normal' },
  { id: 'line5', name: 'Line 5 Eglinton', colorClass: 'line-orange', status: 'Planned' },
];

export const stations = [
  { id: 'finch', name: 'Finch', line: 'Line 1', accessibility: 'Elevator available', crowd: 'Medium', nextArrival: '2 min' },
  { id: 'yonge-bloor', name: 'Bloor-Yonge', line: 'Line 1 / Line 2', accessibility: 'Full accessibility support', crowd: 'High', nextArrival: '1 min' },
  { id: 'eglinton', name: 'Eglinton', line: 'Line 1 / Line 5', accessibility: 'Elevator available', crowd: 'High', nextArrival: '3 min' },
  { id: 'union', name: 'Union', line: 'Line 1', accessibility: 'Full accessibility support', crowd: 'High', nextArrival: '4 min' },
  { id: 'kennedy', name: 'Kennedy', line: 'Line 2 / Line 5', accessibility: 'Ramp access available', crowd: 'Medium', nextArrival: '5 min' },
];

export const arrivals = [
  { destination: 'Finch', platform: 'Northbound', time: '2 min' },
  { destination: 'Vaughan Metropolitan Centre', platform: 'Southbound', time: '6 min' },
  { destination: 'Finch', platform: 'Northbound', time: '9 min' },
];

export const demandSummary = [
  { period: 'Early Morning', passengers: 'Low', note: 'Stable station flow' },
  { period: 'Morning Peak', passengers: 'High', note: 'Heavy interchange activity' },
  { period: 'Midday', passengers: 'Medium', note: 'Balanced usage across central stations' },
  { period: 'Evening Peak', passengers: 'High', note: 'Outbound demand increases significantly' },
];
