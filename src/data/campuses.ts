import { useCallback, useEffect, useState } from 'react';

export interface Campus {
  id: string;
  name: string;
  address: string;
  /** First line of the address, for compact cards. */
  street: string;
  times: { sunday: string; bibleStudy: string; prayer: string };
  phone: string;
  email: string;
  whatsappGroup: string;
  coordinates: { lat: number; lng: number };
}

export const CAMPUSES: Campus[] = [
  {
    id: 'galway',
    name: 'Galway',
    address: 'The Power House International Church, Unit 22 Marangonii House, Monivea Rd, Ballybrit, Galway, H91 958A',
    street: 'Unit 22 Marangonii House, Monivea Rd',
    times: { sunday: '10 AM', bibleStudy: '7 PM', prayer: '7 PM' },
    phone: '089 953 4714',
    email: 'contact.thepowerhouse@gmail.com',
    whatsappGroup: 'https://chat.whatsapp.com/GalwayGroup',
    coordinates: { lat: 53.295, lng: -8.997 },
  },
  {
    id: 'dublin',
    name: 'Dublin',
    address: "Holiday Inn Express 28-32 O'Connell Street Upper, Rotunda Dublin 1, D01T2X2",
    street: "Holiday Inn Express, O'Connell Street Upper",
    times: { sunday: '10 AM', bibleStudy: '8 PM', prayer: '8 PM' },
    phone: '089 252 7008',
    email: 'contact.thepowerhouse@gmail.com',
    whatsappGroup: 'https://chat.whatsapp.com/DublinGroup',
    coordinates: { lat: 53.353, lng: -6.263 },
  },
  {
    id: 'kildare',
    name: 'Kildare',
    address: "The Power House International, O'Cola House Lower Eyre Street, Newbridge, W12TK37",
    street: "O'Cola House, Lower Eyre Street, Newbridge",
    times: { sunday: '10 AM', bibleStudy: '7 PM', prayer: '7 PM' },
    phone: '089 953 5663',
    email: 'contact.thepowerhouse@gmail.com',
    whatsappGroup: 'https://chat.whatsapp.com/KildareGroup',
    coordinates: { lat: 53.179, lng: -6.8 },
  },
  {
    id: 'athlone',
    name: 'Athlone',
    address: 'Unit 22 Athlone Shopping Centre, Sean Costello Street, Athlone, Co. Westmeath, N37 V2Y2',
    street: 'Unit 22 Athlone Shopping Centre',
    times: { sunday: '10 AM', bibleStudy: '7 PM', prayer: '7 PM' },
    phone: '089 982 2556',
    email: 'contact.thepowerhouse@gmail.com',
    whatsappGroup: 'https://chat.whatsapp.com/AthloneGroup',
    coordinates: { lat: 53.4239, lng: -7.9407 },
  },
];

// Same key the old location picker used, so people keep their choice
const CAMPUS_KEY = 'selected_location';
const CHANGE_EVENT = 'campus:changed';

export const getCampus = (id?: string | null) => CAMPUSES.find((c) => c.id === id);

const readSaved = () => {
  try {
    return localStorage.getItem(CAMPUS_KEY);
  } catch {
    return null;
  }
};

const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const directionsUrl = (c: Campus) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.address)}`;

export const telUrl = (c: Campus) => `tel:${c.phone.replace(/\s+/g, '')}`;

/** "Next: Sun 28 Sep" for the coming Sunday (today counts before noon). */
export const nextSundayLabel = (now = new Date()) => {
  const d = new Date(now);
  const add = d.getDay() === 0 && d.getHours() < 12 ? 0 : (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + add);
  return add === 0 ? 'Today' : d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
};

/**
 * The person's campus, remembered on this device. `findNearest` asks for the
 * location (only when tapped) and picks the closest campus.
 */
export function useCampus() {
  const [campusId, setId] = useState<string | null>(readSaved);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const sync = () => setId(readSaved());
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const setCampusId = useCallback((id: string) => {
    try {
      localStorage.setItem(CAMPUS_KEY, id);
    } catch {
      /* private mode */
    }
    setId(id);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }, []);

  const findNearest = useCallback(
    () =>
      new Promise<{ campus: Campus; km: number } | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            let best = CAMPUSES[0];
            let bestKm = Infinity;
            for (const c of CAMPUSES) {
              const km = distanceKm(pos.coords.latitude, pos.coords.longitude, c.coordinates.lat, c.coordinates.lng);
              if (km < bestKm) {
                best = c;
                bestKm = km;
              }
            }
            setLocating(false);
            setCampusId(best.id);
            resolve({ campus: best, km: bestKm });
          },
          () => {
            setLocating(false);
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
        );
      }),
    [setCampusId],
  );

  return { campus: getCampus(campusId), campusId, setCampusId, findNearest, locating };
}
