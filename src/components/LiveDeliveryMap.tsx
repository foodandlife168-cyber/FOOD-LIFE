/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Truck, RefreshCw, Compass, ShieldCheck, Clock } from 'lucide-react';
import type { GPSCoordinate } from '../types/index.ts';

// Known coordinates for Katuloya hill region
export const KATULOYA_COORDINATES: Record<string, [number, number]> = {
  store: [7.3486, 80.7042], // 929, Kandy Road, Katuloya
  Katuloya: [7.3495, 80.7055],
  Thawalanthanne: [7.3620, 80.7180],
  Babaralla: [7.3750, 80.7300],
  Goomaraya: [7.3820, 80.7450],
  Thunisgala: [7.3910, 80.7600],
};

interface LiveDeliveryMapProps {
  agentLocation?: GPSCoordinate;
  customerArea?: string;
  customerAddress?: string;
  agentName?: string;
  agentPhone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  status?: string;
  isLiveActive?: boolean;
  orderNumber?: string;
  heightClass?: string;
  className?: string;
}

export const LiveDeliveryMap: React.FC<LiveDeliveryMapProps> = ({
  agentLocation,
  customerArea,
  customerAddress,
  agentName = 'Delivery Agent',
  agentPhone,
  vehicleNumber,
  vehicleType = 'Three Wheeler',
  status = 'Out for Delivery',
  isLiveActive = true,
  orderNumber,
  heightClass = 'h-72 sm:h-96',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const agentMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number>(0);

  // Resolve destination coords from area
  const destCoords: [number, number] = React.useMemo(() => {
    if (customerArea && KATULOYA_COORDINATES[customerArea]) {
      return KATULOYA_COORDINATES[customerArea];
    }
    return KATULOYA_COORDINATES.Thawalanthanne;
  }, [customerArea]);

  // Current agent position or default near store/en route
  const currentAgentCoords: [number, number] = React.useMemo(() => {
    if (agentLocation?.latitude && agentLocation?.longitude) {
      return [agentLocation.latitude, agentLocation.longitude];
    }
    // Interpolate between store and destination
    return [
      (KATULOYA_COORDINATES.store[0] + destCoords[0]) / 2,
      (KATULOYA_COORDINATES.store[1] + destCoords[1]) / 2,
    ];
  }, [agentLocation, destCoords]);

  // Timer for relative updated time counter
  useEffect(() => {
    setSecondsSinceUpdate(0);
    const interval = setInterval(() => {
      setSecondsSinceUpdate((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [agentLocation?.timestamp]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: currentAgentCoords,
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom Store Icon
      const storeIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="background:#065f46; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.3); border:2px solid white;">
            <span style="font-size:16px;">🏪</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker(KATULOYA_COORDINATES.store, { icon: storeIcon })
        .addTo(map)
        .bindPopup(`<strong>FOOD & LIFE GROCERY</strong><br/>Katuloya Dispatch Store`);

      // Custom Destination Icon
      const destIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="background:#dc2626; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.3); border:2px solid white;">
            <span style="font-size:16px;">📍</span>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      destMarkerRef.current = L.marker(destCoords, { icon: destIcon })
        .addTo(map)
        .bindPopup(`<strong>Customer Destination</strong><br/>${customerArea || 'Katuloya'}`);

      // Custom Agent Live Marker Icon with pulse ring
      const agentIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="position:relative; width:44px; height:44px;">
            <div style="position:absolute; inset:0; border-radius:50%; background:#10b981; opacity:0.4; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position:relative; background:#047857; color:white; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 14px rgba(0,0,0,0.35); border:3px solid white;">
              <span style="font-size:20px;">🛵</span>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      agentMarkerRef.current = L.marker(currentAgentCoords, { icon: agentIcon })
        .addTo(map)
        .bindPopup(`<strong>${agentName}</strong><br/>${vehicleType} • ${vehicleNumber || ''}`);

      // Routing Polyline
      polylineRef.current = L.polyline(
        [KATULOYA_COORDINATES.store, currentAgentCoords, destCoords],
        { color: '#059669', weight: 4, dashArray: '6, 8', opacity: 0.85 }
      ).addTo(map);

      // Fit bounds
      const bounds = L.latLngBounds([KATULOYA_COORDINATES.store, currentAgentCoords, destCoords]);
      map.fitBounds(bounds, { padding: [50, 50] });

      mapInstanceRef.current = map;
    } else {
      const map = mapInstanceRef.current;

      // Update agent marker
      if (agentMarkerRef.current) {
        agentMarkerRef.current.setLatLng(currentAgentCoords);
      }

      // Update polyline
      if (polylineRef.current) {
        polylineRef.current.setLatLngs([
          KATULOYA_COORDINATES.store,
          currentAgentCoords,
          destCoords,
        ]);
      }

      // Update destination marker
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng(destCoords);
      }
    }
  }, [currentAgentCoords, destCoords, agentName, vehicleType, vehicleNumber, customerArea]);

  const handleCenterOnAgent = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(currentAgentCoords, 16, { animate: true });
    }
  };

  const handleFitRoute = () => {
    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds([KATULOYA_COORDINATES.store, currentAgentCoords, destCoords]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-emerald-500/30 shadow-xl bg-slate-900 ${className}`}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} className={`w-full ${heightClass} z-0`} />

      {/* Top Floating Live GPS HUD */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center gap-2 pointer-events-auto text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-black text-emerald-400 uppercase tracking-wider text-[11px]">
            {isLiveActive ? 'LIVE GPS DISPATCH' : 'GPS TRACKING'}
          </span>
          {orderNumber && <span className="text-slate-400 font-mono text-[10px]">#{orderNumber}</span>}
        </div>

        <div className="bg-slate-900/90 backdrop-blur-md text-slate-200 px-3 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center gap-2 pointer-events-auto text-[11px]">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {secondsSinceUpdate <= 5
              ? 'Updated just now'
              : `Updated ${secondsSinceUpdate}s ago`}
          </span>
        </div>
      </div>

      {/* Map Control Buttons */}
      <div className="absolute bottom-20 sm:bottom-24 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleCenterOnAgent}
          title="Center on Delivery Agent"
          className="p-2.5 bg-white hover:bg-slate-50 text-emerald-800 rounded-full shadow-lg border border-slate-200 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
        >
          <Navigation className="w-4 h-4 fill-emerald-600" />
        </button>
        <button
          type="button"
          onClick={handleFitRoute}
          title="Fit full delivery route"
          className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-full shadow-lg border border-slate-200 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Floating Delivery Card */}
      <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-inner">
            <Truck className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm">{agentName}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase">
                {vehicleType}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              {vehicleNumber ? `Vehicle: ${vehicleNumber}` : 'Katuloya Delivery Fleet'}
              {customerArea && ` • Towards ${customerArea}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-center">
          {agentPhone && (
            <a
              href={`tel:${agentPhone}`}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Call Agent</span>
            </a>
          )}
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Live Status</span>
            <span className="font-black text-emerald-700">{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
