export interface Station {
  station_id: string;
  station_name: string;
  city: string;
  lat: number;
  lon: number;
  pollutants: string[];
}

export const stations: Station[] = [
  { station_id: "delhi_anand_vihar", station_name: "Anand Vihar, DPCC", city: "Delhi", lat: 28.6469, lon: 77.3164, pollutants: ["PM2.5", "PM10", "NO2", "O3"] },
  { station_id: "delhi_ito", station_name: "ITO, DPCC", city: "Delhi", lat: 28.6289, lon: 77.2415, pollutants: ["PM2.5", "PM10", "NO2", "O3"] },
  { station_id: "delhi_r_k_puram", station_name: "R K Puram, DPCC", city: "Delhi", lat: 28.5631, lon: 77.1726, pollutants: ["PM2.5", "PM10", "NO2", "O3"] },
  { station_id: "delhi_mandir_marg", station_name: "Mandir Marg, DPCC", city: "Delhi", lat: 28.6364, lon: 77.2009, pollutants: ["PM2.5", "PM10", "NO2"] },
  { station_id: "delhi_punjabi_bagh", station_name: "Punjabi Bagh, DPCC", city: "Delhi", lat: 28.6742, lon: 77.1310, pollutants: ["PM2.5", "PM10", "NO2", "O3"] },
  { station_id: "delhi_dwarka_sec8", station_name: "Dwarka Sector 8, DPCC", city: "Delhi", lat: 28.5823, lon: 77.0500, pollutants: ["PM2.5", "PM10", "NO2"] },
  { station_id: "delhi_rohini", station_name: "Rohini, DPCC", city: "Delhi", lat: 28.7326, lon: 77.1101, pollutants: ["PM2.5", "PM10", "NO2", "O3"] },
  { station_id: "delhi_jahangirpuri", station_name: "Jahangirpuri, DPCC", city: "Delhi", lat: 28.7256, lon: 77.1723, pollutants: ["PM2.5", "PM10", "NO2"] },
  { station_id: "delhi_wazirpur", station_name: "Wazirpur, DPCC", city: "Delhi", lat: 28.6969, lon: 77.1547, pollutants: ["PM2.5", "PM10", "NO2", "O3"] },
  { station_id: "delhi_siri_fort", station_name: "Siri Fort, DPCC", city: "Delhi", lat: 28.5504, lon: 77.2158, pollutants: ["PM2.5", "PM10", "NO2"] },
  { station_id: "delhi_okhla_phase2", station_name: "Okhla Phase 2, DPCC", city: "Delhi", lat: 28.5310, lon: 77.2710, pollutants: ["PM2.5", "PM10", "NO2", "O3"] },
  { station_id: "delhi_nehru_nagar", station_name: "Nehru Nagar, DPCC", city: "Delhi", lat: 28.5679, lon: 77.2503, pollutants: ["PM2.5", "PM10"] },
  { station_id: "delhi_patparganj", station_name: "Patparganj, DPCC", city: "Delhi", lat: 28.6236, lon: 77.2872, pollutants: ["PM2.5", "PM10", "NO2"] },
  { station_id: "delhi_mundka", station_name: "Mundka, DPCC", city: "Delhi", lat: 28.6840, lon: 77.0310, pollutants: ["PM2.5", "PM10", "NO2"] },
  { station_id: "delhi_bawana", station_name: "Bawana, DPCC", city: "Delhi", lat: 28.7762, lon: 77.0510, pollutants: ["PM2.5", "PM10", "NO2"] },
  { station_id: "delhi_narela", station_name: "Narela, DPCC", city: "Delhi", lat: 28.8229, lon: 77.1026, pollutants: ["PM2.5", "PM10"] },
  { station_id: "delhi_alipur", station_name: "Alipur, DPCC", city: "Delhi", lat: 28.7951, lon: 77.1537, pollutants: ["PM2.5", "PM10", "NO2"] },
  { station_id: "delhi_ashok_vihar", station_name: "Ashok Vihar, DPCC", city: "Delhi", lat: 28.6953, lon: 77.1818, pollutants: ["PM2.5", "PM10", "NO2", "O3"] },
  { station_id: "delhi_chandni_chowk", station_name: "Chandni Chowk, IITM", city: "Delhi", lat: 28.6506, lon: 77.2296, pollutants: ["PM2.5", "PM10"] },
  { station_id: "delhi_lodhi_road", station_name: "Lodhi Road, IMD", city: "Delhi", lat: 28.5918, lon: 77.2273, pollutants: ["PM2.5", "PM10", "NO2", "O3"] },
  { station_id: "delhi_dtu", station_name: "DTU, CPCB", city: "Delhi", lat: 28.7500, lon: 77.1113, pollutants: ["PM2.5", "PM10", "NO2"] },
  { station_id: "delhi_aya_nagar", station_name: "Aya Nagar, DPCC", city: "Delhi", lat: 28.4707, lon: 77.1099, pollutants: ["PM2.5", "PM10"] },
  { station_id: "delhi_pusa", station_name: "Pusa, DPCC", city: "Delhi", lat: 28.6397, lon: 77.1461, pollutants: ["PM2.5", "PM10", "NO2", "O3"] },
  { station_id: "delhi_shadipur", station_name: "Shadipur, CPCB", city: "Delhi", lat: 28.6515, lon: 77.1580, pollutants: ["PM2.5", "PM10", "NO2"] },
  { station_id: "delhi_north_campus", station_name: "North Campus DU, DPCC", city: "Delhi", lat: 28.6886, lon: 77.2095, pollutants: ["PM2.5", "PM10", "NO2"] },
  { station_id: "delhi_major_dhyan_chand", station_name: "Major Dhyan Chand Stadium, DPCC", city: "Delhi", lat: 28.6113, lon: 77.2379, pollutants: ["PM2.5", "PM10"] },
  { station_id: "delhi_mathura_road", station_name: "Mathura Road, DPCC", city: "Delhi", lat: 28.5718, lon: 77.2509, pollutants: ["PM2.5", "PM10", "NO2"] },
  { station_id: "delhi_vivek_vihar", station_name: "Vivek Vihar, DPCC", city: "Delhi", lat: 28.6727, lon: 77.3150, pollutants: ["PM2.5", "PM10"] },
  { station_id: "delhi_najafgarh", station_name: "Najafgarh, DPCC", city: "Delhi", lat: 28.5704, lon: 76.9799, pollutants: ["PM2.5", "PM10"] },
  { station_id: "delhi_satyawati_college", station_name: "Satyawati College, DPCC", city: "Delhi", lat: 28.6973, lon: 77.1909, pollutants: ["PM2.5", "PM10"] },
];
