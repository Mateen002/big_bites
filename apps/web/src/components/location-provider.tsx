'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, type DeliveryZone } from '@/lib/api';

export type OrderType = 'DELIVERY' | 'PICKUP';

type LocationContextValue = {
  orderType: OrderType;
  setOrderType: (t: OrderType) => void;
  selectedZone: DeliveryZone | null;
  setSelectedZone: (z: DeliveryZone) => void;
  zones: DeliveryZone[];
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  detectLocation: () => Promise<string | null>;
  detecting: boolean;
  detectedAddress: string;
  confirmLocation: (zone: DeliveryZone, type: OrderType) => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

const STORAGE_KEY_ZONE = 'bigbites_selected_zone';
const STORAGE_KEY_TYPE = 'bigbites_order_type';
const STORAGE_KEY_CONFIRMED = 'bigbites_location_confirmed';

// Approximate coordinates for Lahore delivery zones to match GPS
const ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
  gulberg: { lat: 31.512, lng: 74.348 },
  dha: { lat: 31.478, lng: 74.398 },
  cantt: { lat: 31.536, lng: 74.385 },
  'model-town': { lat: 31.485, lng: 74.322 },
  'johar-town': { lat: 31.468, lng: 74.298 },
  'valencia-town': { lat: 31.4026, lng: 74.2612 },
  'wapda-town': { lat: 31.432, lng: 74.288 },
  'faisal-town': { lat: 31.488, lng: 74.305 },
  'garden-town': { lat: 31.505, lng: 74.328 },
  township: { lat: 31.455, lng: 74.312 },
  'allama-iqbal-town': { lat: 31.505, lng: 74.282 },
  'bahria-town': { lat: 31.365, lng: 74.185 },
  'lake-city': { lat: 31.365, lng: 74.248 },
  'dha-rahbar': { lat: 31.395, lng: 74.275 },
  'khayaban-e-amin': { lat: 31.378, lng: 74.258 },
  askari: { lat: 31.535, lng: 74.425 },
  shadman: { lat: 31.542, lng: 74.331 },
  'state-life': { lat: 31.455, lng: 74.412 },
  'pcsir-society': { lat: 31.472, lng: 74.285 },
  'eme-society': { lat: 31.442, lng: 74.205 },
  'paragon-city': { lat: 31.548, lng: 74.462 },
  'bahria-orchard': { lat: 31.295, lng: 74.225 },
  'muslim-town': { lat: 31.518, lng: 74.325 },
  samanabad: { lat: 31.535, lng: 74.298 },
  sabzazar: { lat: 31.515, lng: 74.255 },
  'thokar-niaz-baig': { lat: 31.475, lng: 74.238 },
  'walled-city': { lat: 31.588, lng: 74.315 },
};

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [orderType, setOrderType] = useState<OrderType>('DELIVERY');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState('');

  // Load zones and restore persisted selection
  useEffect(() => {
    api.zones().then((allZones) => {
      setZones(allZones);

      if (typeof window !== 'undefined') {
        const savedZoneId = localStorage.getItem(STORAGE_KEY_ZONE);
        const savedType = localStorage.getItem(STORAGE_KEY_TYPE) as OrderType | null;
        const confirmed = localStorage.getItem(STORAGE_KEY_CONFIRMED);

        if (savedType) setOrderType(savedType);

        const found = allZones.find((z) => z.id === savedZoneId);
        if (found) {
          setSelectedZone(found);
        } else if (allZones[0]) {
          setSelectedZone(allZones[0]);
        }

        // If never confirmed before, open the location modal upon landing
        if (!confirmed) {
          // slight delay so first paint finishes smoothly
          const timer = setTimeout(() => setIsModalOpen(true), 600);
          return () => clearTimeout(timer);
        }
      }
    });
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const confirmLocation = useCallback(
    (zone: DeliveryZone, type: OrderType) => {
      setSelectedZone(zone);
      setOrderType(type);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ZONE, zone.id);
        localStorage.setItem(STORAGE_KEY_TYPE, type);
        localStorage.setItem(STORAGE_KEY_CONFIRMED, 'true');
      }
      setIsModalOpen(false);
    },
    [],
  );

  const detectLocation = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return null;
    }

    setDetecting(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let closestZone: DeliveryZone | null = null;
          let minDistance = Infinity;

          // Find closest Lahore zone
          for (const zone of zones) {
            const coords = ZONE_COORDS[zone.slug] || ZONE_COORDS.gulberg;
            const dist = getDistance(latitude, longitude, coords.lat, coords.lng);
            if (dist < minDistance) {
              minDistance = dist;
              closestZone = zone;
            }
          }

          if (closestZone) {
            setSelectedZone(closestZone);
            const addrText = `Near ${closestZone.name}, Lahore`;
            setDetectedAddress(addrText);
            setDetecting(false);
            resolve(addrText);
          } else {
            setDetecting(false);
            resolve(null);
          }
        },
        () => {
          setDetecting(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }, [zones]);

  return (
    <LocationContext.Provider
      value={{
        orderType,
        setOrderType,
        selectedZone,
        setSelectedZone,
        zones,
        isModalOpen,
        openModal,
        closeModal,
        detectLocation,
        detecting,
        detectedAddress,
        confirmLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
