/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Compass, AlertCircle, X, Check, Crosshair } from 'lucide-react';
import { KATULOYA_COORDINATES } from './LiveDeliveryMap.tsx';

interface CustomerLocationPickerProps {
  selectedCoords: { lat: number; lng: number } | null;
  onSelectCoords: (coords: { lat: number; lng: number } | null) => void;
  areaHint?: string;
  className?: string;
}

export const CustomerLocationPicker: React.FC<CustomerLocationPickerProps> = ({
  selectedCoords,
  onSelectCoords,
  areaHint = 'Katuloya',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Default coordinate center
  const defaultCenter: [number, number] = KATULOYA_COORDINATES[areaHint] || KATULOYA_COORDINATES.store;

  // Initialize or update Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = selectedCoords ? selectedCoords.lat : defaultCenter[0];
      const initialLng = selectedCoords ? selectedCoords.lng : defaultCenter[1];

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: selectedCoords ? 16 : 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom Delivery Destination Marker Icon
      const pinIcon = L.divIcon({
        className: 'customer-delivery-pin',
        html: `
          <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center; transform:translate(-50%, -100%);">
            <div style="background-color:#047857; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.3); border:2.5px solid white;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div style="position:absolute; bottom:-4px; left:50%; transform:translateX(-50%); width:6px; height:6px; background-color:#047857; border-radius:50%; opacity:0.8;"></div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      if (selectedCoords) {
        const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
          icon: pinIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onSelectCoords({
            lat: Number(pos.lat.toFixed(6)),
            lng: Number(pos.lng.toFixed(6)),
          });
        });

        markerRef.current = marker;
      }

      // Allow clicking anywhere on map to position pin
      map.on('click', (e: L.LeafletMouseEvent) => {
        const newLat = Number(e.latlng.lat.toFixed(6));
        const newLng = Number(e.latlng.lng.toFixed(6));

        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        } else {
          const marker = L.marker([newLat, newLng], {
            icon: pinIcon,
            draggable: true,
          }).addTo(map);

          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onSelectCoords({
              lat: Number(pos.lat.toFixed(6)),
              lng: Number(pos.lng.toFixed(6)),
            });
          });

          markerRef.current = marker;
        }

        onSelectCoords({ lat: newLat, lng: newLng });
        setGeoError(null);
      });

      mapInstanceRef.current = map;
    } else {
      const map = mapInstanceRef.current;
      map.invalidateSize();
      if (selectedCoords) {
        if (markerRef.current) {
          markerRef.current.setLatLng([selectedCoords.lat, selectedCoords.lng]);
        }
        map.setView([selectedCoords.lat, selectedCoords.lng], 16);
      }
    }
  }, [selectedCoords, isMapExpanded]);

  // Handle Current Location Geolocation Request
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('GPS Geolocation is not supported by your current browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setGpsAccuracy(position.coords.accuracy ? Math.round(position.coords.accuracy) : null);
        setIsLocating(false);
        setIsMapExpanded(true);

        onSelectCoords({ lat, lng });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17);
          mapInstanceRef.current.invalidateSize();
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Please allow location access in your browser settings or click on the map below.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoError('Location information is currently unavailable. You can click on the map to place your pin.');
        } else {
          setGeoError('Location request timed out. Please click on the map to set your location pin.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleClearLocation = () => {
    onSelectCoords(null);
    setGpsAccuracy(null);
    setGeoError(null);
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Geolocation Button & Coordinates Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
        >
          <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin text-emerald-200' : 'text-emerald-200'}`} />
          <span>{isLocating ? 'Detecting Your GPS Location...' : 'USE MY CURRENT LOCATION'}</span>
        </button>

        {selectedCoords ? (
          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-[11px] font-mono flex items-center gap-1.5 font-bold">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {selectedCoords.lat.toFixed(4)}° N, {selectedCoords.lng.toFixed(4)}° E
                {gpsAccuracy ? ` (±${gpsAccuracy}m)` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearLocation}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Remove location pin"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 italic">
            Tap button above or click on map to pinpoint delivery gate
          </span>
        )}
      </div>

      {geoError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Map Verification Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
        <div
          ref={mapContainerRef}
          className="w-full h-44 sm:h-52 z-10"
        />
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-xs">
            <Compass className="w-3 h-3 text-emerald-400" />
            <span>Click map or drag pin to adjust dropoff spot</span>
          </span>
        </div>
      </div>
    </div>
  );
};
