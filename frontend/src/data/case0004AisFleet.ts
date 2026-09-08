export interface AisFleetVessel {
  mmsi: string;
  imo?: string;
  name: string;
  type: 'Tanker' | 'Cargo' | 'Container' | 'Bulk Carrier' | 'Fishing' | 'Tug / Service' | 'Other';
  flag: string;
  stageEliminated: 1 | 2 | 3 | 4 | 5; // 1: Spatial, 2: Temporal, 3: Trajectory, 4: Priority, 5: Primary suspect
  eliminationReason?: string;
  speedKn: number;
  courseDeg: number;
  isPriorityCandidate?: boolean;
  isPrimarySuspect?: boolean;
  score?: number;
  waypoints: {
    hoursAgo: number; // e.g. 48, 36, 24, 12, 5.5, 4, 2, 0
    lat: number;
    lon: number;
    speedKn: number;
    courseDeg: number;
  }[];
}

// 47 Deterministic AIS Vessels recorded in the German Bight sector during Case 0004
export const CASE_0004_AIS_FLEET: AisFleetVessel[] = [
  // ==========================================
  // SURVIVORS: 2 HIGH-PRIORITY CANDIDATES
  // ==========================================
  {
    mmsi: '244710000',
    imo: '9382100',
    name: 'MT NORDIC POLARIS',
    type: 'Tanker',
    flag: 'Netherlands (NL)',
    stageEliminated: 5, // Primary Suspect (Survives all)
    isPriorityCandidate: true,
    isPrimarySuspect: true,
    score: 94,
    speedKn: 12.4,
    courseDeg: 54,
    waypoints: [
      { hoursAgo: 48, lat: 51.95, lon: 4.12, speedKn: 0.0, courseDeg: 75 }, // Rotterdam berthed
      { hoursAgo: 24, lat: 52.85, lon: 4.45, speedKn: 14.8, courseDeg: 48 }, // Dutch coast outbound
      { hoursAgo: 12, lat: 54.45, lon: 5.10, speedKn: 14.6, courseDeg: 52 },
      { hoursAgo: 5.5, lat: 55.188, lon: 5.812, speedKn: 12.4, courseDeg: 54 }, // INTERSECT AT CORRIDOR
      { hoursAgo: 4.0, lat: 55.225, lon: 5.890, speedKn: 13.5, courseDeg: 54 },
      { hoursAgo: 2.0, lat: 55.285, lon: 6.010, speedKn: 14.6, courseDeg: 54 },
      { hoursAgo: 0, lat: 55.45, lon: 6.35, speedKn: 14.7, courseDeg: 55 },
    ],
  },
  {
    mmsi: '219018000',
    imo: '9412086',
    name: 'MT PACIFIC GEMINI',
    type: 'Tanker',
    flag: 'Denmark (DK)',
    stageEliminated: 5, // Rank #2 Candidate
    isPriorityCandidate: true,
    score: 82,
    speedKn: 13.2,
    courseDeg: 50,
    waypoints: [
      { hoursAgo: 48, lat: 52.10, lon: 4.25, speedKn: 13.5, courseDeg: 46 },
      { hoursAgo: 24, lat: 53.20, lon: 4.70, speedKn: 14.0, courseDeg: 48 },
      { hoursAgo: 12, lat: 54.30, lon: 5.25, speedKn: 13.8, courseDeg: 50 },
      { hoursAgo: 5.5, lat: 55.165, lon: 5.765, speedKn: 13.2, courseDeg: 50 }, // Near corridor (1.4 nm S)
      { hoursAgo: 4.0, lat: 55.210, lon: 5.860, speedKn: 13.5, courseDeg: 51 },
      { hoursAgo: 0, lat: 55.40, lon: 6.28, speedKn: 13.6, courseDeg: 52 },
    ],
  },

  // ==========================================
  // SURVIVED TO STEP 3: TRAJECTORY FILTER (3 vessels survived Step 3, 1 eliminated)
  // ==========================================
  {
    mmsi: '219018444',
    imo: '9632064',
    name: 'MV MAERSK MCKINNEY',
    type: 'Container',
    flag: 'Denmark (DK)',
    stageEliminated: 4, // Eliminated in Stage 4: Container type, cargo ballast clean
    eliminationReason: 'Container design; cargo manifests confirm dry containerized load only',
    score: 41,
    speedKn: 19.4,
    courseDeg: 53,
    waypoints: [
      { hoursAgo: 24, lat: 53.80, lon: 4.60, speedKn: 20.1, courseDeg: 52 },
      { hoursAgo: 12, lat: 54.60, lon: 5.20, speedKn: 19.8, courseDeg: 53 },
      { hoursAgo: 5.0, lat: 55.205, lon: 5.840, speedKn: 19.4, courseDeg: 53 },
      { hoursAgo: 0, lat: 55.70, lon: 6.70, speedKn: 19.5, courseDeg: 54 },
    ],
  },

  // ==========================================
  // SURVIVED TO STEP 2: TEMPORAL FILTER (5 vessels survived Step 2, 2 eliminated in Step 3)
  // ==========================================
  {
    mmsi: '211280000',
    imo: '9456200',
    name: 'MV BALTIC HORIZON',
    type: 'Container',
    flag: 'Germany (DE)',
    stageEliminated: 3, // Eliminated in Step 3: Trajectory opposes slick major axis
    eliminationReason: 'Course 268° opposes 052° slick elongation; passed 4.8 nm N of locus',
    score: 28,
    speedKn: 18.6,
    courseDeg: 268,
    waypoints: [
      { hoursAgo: 24, lat: 54.10, lon: 7.90, speedKn: 18.0, courseDeg: 270 },
      { hoursAgo: 12, lat: 55.26, lon: 6.90, speedKn: 18.4, courseDeg: 268 },
      { hoursAgo: 6.0, lat: 55.27, lon: 5.86, speedKn: 18.6, courseDeg: 268 },
      { hoursAgo: 0, lat: 54.80, lon: 4.20, speedKn: 18.8, courseDeg: 265 },
    ],
  },
  {
    mmsi: '244001234',
    name: 'SV SEA RUNNER',
    type: 'Cargo',
    flag: 'Netherlands (NL)',
    stageEliminated: 3, // Eliminated in Step 3: Heading 330° perpendicular cross-traffic
    eliminationReason: 'Cross-traffic heading 330° NW perpendicular to slick major axis',
    score: 22,
    speedKn: 11.2,
    courseDeg: 330,
    waypoints: [
      { hoursAgo: 16, lat: 54.60, lon: 6.10, speedKn: 11.0, courseDeg: 328 },
      { hoursAgo: 5.5, lat: 55.195, lon: 5.790, speedKn: 11.2, courseDeg: 330 },
      { hoursAgo: 0, lat: 55.65, lon: 5.35, speedKn: 11.4, courseDeg: 332 },
    ],
  },

  // ==========================================
  // SURVIVED TO STEP 1: SPATIAL FILTER (8 vessels survived Step 1, 3 eliminated in Step 2)
  // ==========================================
  {
    mmsi: '257002000',
    imo: '9287340',
    name: 'MT OCEAN VOYAGER',
    type: 'Tanker',
    flag: 'Norway (NO)',
    stageEliminated: 2, // Eliminated in Step 2: Temporal mismatch (passed 3.5h too late)
    eliminationReason: 'Corridor transit at 15:45 UTC (3.5h after hindcast release window)',
    score: 18,
    speedKn: 13.8,
    courseDeg: 54,
    waypoints: [
      { hoursAgo: 24, lat: 52.90, lon: 4.30, speedKn: 14.0, courseDeg: 50 },
      { hoursAgo: 8, lat: 54.50, lon: 5.15, speedKn: 13.9, courseDeg: 53 },
      { hoursAgo: 1.5, lat: 55.185, lon: 5.815, speedKn: 13.8, courseDeg: 54 },
      { hoursAgo: 0, lat: 55.32, lon: 6.05, speedKn: 13.7, courseDeg: 54 },
    ],
  },
  {
    mmsi: '211559000',
    name: 'FV NORTH SEA PIONEER',
    type: 'Fishing',
    flag: 'Germany (DE)',
    stageEliminated: 2, // Eliminated in Step 2: Temporal mismatch (in sector at 06:00 UTC)
    eliminationReason: 'Operating in sector at 06:00 UTC (6 hours prior to release window)',
    score: 12,
    speedKn: 6.5,
    courseDeg: 110,
    waypoints: [
      { hoursAgo: 24, lat: 55.10, lon: 5.60, speedKn: 6.2, courseDeg: 105 },
      { hoursAgo: 11, lat: 55.19, lon: 5.80, speedKn: 6.5, courseDeg: 110 },
      { hoursAgo: 0, lat: 55.05, lon: 6.40, speedKn: 7.0, courseDeg: 120 },
    ],
  },
  {
    mmsi: '356910000',
    imo: '9512300',
    name: 'MV STAR CLIPPER',
    type: 'Bulk Carrier',
    flag: 'Panama (PA)',
    stageEliminated: 2, // Eliminated in Step 2: Passed at 08:30 UTC
    eliminationReason: 'Transited corridor at 08:30 UTC (3.5 hours prior to release window)',
    score: 15,
    speedKn: 13.5,
    courseDeg: 52,
    waypoints: [
      { hoursAgo: 24, lat: 53.40, lon: 4.60, speedKn: 13.8, courseDeg: 51 },
      { hoursAgo: 9, lat: 55.18, lon: 5.80, speedKn: 13.5, courseDeg: 52 },
      { hoursAgo: 0, lat: 56.10, lon: 7.10, speedKn: 13.4, courseDeg: 53 },
    ],
  },

  // ==========================================
  // ELIMINATED AT STEP 1: SPATIAL FILTER (39 background traffic vessels)
  // Outside the 15 nm corridor buffer
  // ==========================================
  // Southbound coastal traffic along Frisian Islands / Jade-Weser TSS
  {
    mmsi: '211330001',
    name: 'MV WESER COURIER',
    type: 'Cargo',
    flag: 'Germany (DE)',
    stageEliminated: 1,
    eliminationReason: 'Distance to corridor: 38 nm SE (Jade-Weser Approach TSS)',
    speedKn: 12.8,
    courseDeg: 275,
    waypoints: [
      { hoursAgo: 24, lat: 54.10, lon: 7.60, speedKn: 12.5, courseDeg: 275 },
      { hoursAgo: 0, lat: 53.95, lon: 6.20, speedKn: 12.8, courseDeg: 275 },
    ],
  },
  {
    mmsi: '244880002',
    name: 'MT ZUIDERZEE',
    type: 'Tanker',
    flag: 'Netherlands (NL)',
    stageEliminated: 1,
    eliminationReason: 'Distance to corridor: 42 nm S (Terschelling Inshore TSS)',
    speedKn: 11.5,
    courseDeg: 78,
    waypoints: [
      { hoursAgo: 24, lat: 53.60, lon: 5.10, speedKn: 11.2, courseDeg: 78 },
      { hoursAgo: 0, lat: 53.80, lon: 6.80, speedKn: 11.5, courseDeg: 78 },
    ],
  },
  {
    mmsi: '219440003',
    name: 'MV JUTLAND EXPRESS',
    type: 'Container',
    flag: 'Denmark (DK)',
    stageEliminated: 1,
    eliminationReason: 'Distance to corridor: 45 nm N (Central North Sea Fairway)',
    speedKn: 19.8,
    courseDeg: 230,
    waypoints: [
      { hoursAgo: 24, lat: 56.10, lon: 6.80, speedKn: 20.0, courseDeg: 230 },
      { hoursAgo: 0, lat: 55.50, lon: 4.90, speedKn: 19.8, courseDeg: 230 },
    ],
  },
  {
    mmsi: '257120004',
    name: 'MV BERGEN TRADER',
    type: 'Cargo',
    flag: 'Norway (NO)',
    stageEliminated: 1,
    eliminationReason: 'Distance to corridor: 55 nm NW (Dogger Bank East Transit)',
    speedKn: 13.0,
    courseDeg: 145,
    waypoints: [
      { hoursAgo: 24, lat: 56.40, lon: 4.80, speedKn: 13.2, courseDeg: 145 },
      { hoursAgo: 0, lat: 55.70, lon: 5.60, speedKn: 13.0, courseDeg: 145 },
    ],
  },
  {
    mmsi: '244550005',
    name: 'TB WATERMAN',
    type: 'Tug / Service',
    flag: 'Netherlands (NL)',
    stageEliminated: 1,
    eliminationReason: 'Distance to corridor: 48 nm SW (Offshore Windpark Gemini)',
    speedKn: 8.5,
    courseDeg: 35,
    waypoints: [
      { hoursAgo: 24, lat: 54.00, lon: 5.80, speedKn: 8.0, courseDeg: 35 },
      { hoursAgo: 0, lat: 54.35, lon: 6.10, speedKn: 8.5, courseDeg: 35 },
    ],
  },
  {
    mmsi: '211990006',
    name: 'MV HELGOLAND EXPRESS',
    type: 'Other',
    flag: 'Germany (DE)',
    stageEliminated: 1,
    eliminationReason: 'Distance to corridor: 62 nm E (Helgoland Passenger Ferry Lane)',
    speedKn: 24.0,
    courseDeg: 340,
    waypoints: [
      { hoursAgo: 12, lat: 53.90, lon: 8.70, speedKn: 24.0, courseDeg: 340 },
      { hoursAgo: 0, lat: 54.20, lon: 7.90, speedKn: 23.5, courseDeg: 340 },
    ],
  },
  {
    mmsi: '211660007',
    name: 'MT EMS VICTORY',
    type: 'Tanker',
    flag: 'Germany (DE)',
    stageEliminated: 1,
    eliminationReason: 'Distance to corridor: 36 nm S (Ems Estuary Approach)',
    speedKn: 10.4,
    courseDeg: 62,
    waypoints: [
      { hoursAgo: 24, lat: 53.75, lon: 6.40, speedKn: 10.2, courseDeg: 62 },
      { hoursAgo: 0, lat: 53.95, lon: 7.20, speedKn: 10.4, courseDeg: 62 },
    ],
  },
  {
    mmsi: '232110008',
    name: 'MV HUMBER STAR',
    type: 'Bulk Carrier',
    flag: 'United Kingdom (GB)',
    stageEliminated: 1,
    eliminationReason: 'Distance to corridor: 52 nm W (UK East Coast Outbound)',
    speedKn: 12.0,
    courseDeg: 95,
    waypoints: [
      { hoursAgo: 24, lat: 54.90, lon: 4.10, speedKn: 12.1, courseDeg: 95 },
      { hoursAgo: 0, lat: 54.95, lon: 5.30, speedKn: 12.0, courseDeg: 95 },
    ],
  },
  {
    mmsi: '211770009',
    name: 'FV ALBATROS II',
    type: 'Fishing',
    flag: 'Germany (DE)',
    stageEliminated: 1,
    eliminationReason: 'Distance to corridor: 29 nm SE (Frisian Front)',
    speedKn: 5.8,
    courseDeg: 180,
    waypoints: [
      { hoursAgo: 24, lat: 54.85, lon: 6.20, speedKn: 5.5, courseDeg: 180 },
      { hoursAgo: 0, lat: 54.60, lon: 6.25, speedKn: 5.8, courseDeg: 180 },
    ],
  },
  {
    mmsi: '244330010',
    name: 'MV AMSTELGRACHT',
    type: 'Cargo',
    flag: 'Netherlands (NL)',
    stageEliminated: 1,
    eliminationReason: 'Distance to corridor: 28 nm NW (Off-route)',
    speedKn: 14.1,
    courseDeg: 65,
    waypoints: [
      { hoursAgo: 24, lat: 55.45, lon: 4.90, speedKn: 14.0, courseDeg: 65 },
      { hoursAgo: 0, lat: 55.75, lon: 6.10, speedKn: 14.1, courseDeg: 65 },
    ],
  },
  // Additional background traffic to complete the 47-vessel fleet
  ...Array.from({ length: 29 }).map((_, idx) => {
    const vesselNum = idx + 11;
    const baseLat = 53.6 + (idx % 6) * 0.45;
    const baseLon = 4.4 + ((idx * 3) % 7) * 0.45;
    const speed = 10 + (idx % 8);
    const course = (45 + idx * 25) % 360;
    const types: ('Tanker' | 'Cargo' | 'Container' | 'Bulk Carrier' | 'Fishing' | 'Tug / Service')[] = [
      'Cargo', 'Container', 'Tanker', 'Bulk Carrier', 'Fishing', 'Tug / Service'
    ];

    return {
      mmsi: `21100${vesselNum.toString().padStart(4, '0')}`,
      name: `MV TRANS-SECTOR ${vesselNum}`,
      type: types[idx % types.length],
      flag: idx % 3 === 0 ? 'Germany (DE)' : idx % 3 === 1 ? 'Netherlands (NL)' : 'Liberia (LR)',
      stageEliminated: 1 as const,
      eliminationReason: `Distance to corridor: ${(25 + (idx * 2) % 35)} nm (Sector peripheral)`,
      speedKn: speed,
      courseDeg: course,
      waypoints: [
        { hoursAgo: 24, lat: baseLat, lon: baseLon, speedKn: speed, courseDeg: course },
        { hoursAgo: 12, lat: baseLat + 0.3, lon: baseLon + 0.4, speedKn: speed, courseDeg: course },
        { hoursAgo: 0, lat: baseLat + 0.6, lon: baseLon + 0.8, speedKn: speed, courseDeg: course },
      ],
    };
  }),
];
