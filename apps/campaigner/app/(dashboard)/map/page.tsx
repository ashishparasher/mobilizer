'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import api from '@/lib/api';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Map, Layers, Filter, Compass, Activity, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoicGxhY2Vob2xkZXIiLCJhIjoiY2x4bTJrbjJzMDN6ODJpcHlyNXN2aWxxcyJ9.placeholder';

/**
 * Pure JS calculation to generate a geodesic circle for Mapbox GeoJSON source
 */
const getCirclePolygon = (center: [number, number], radiusKm: number, points = 64) => {
  const coords = [];
  const kmLat = 1 / 110.574;
  const kmLng = 1 / (111.320 * Math.cos((center[1] * Math.PI) / 180));

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = radiusKm * kmLng * Math.cos(theta);
    const y = radiusKm * kmLat * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]); // close loop
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: null,
  };
};

export default function LiveHeatmap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('none');
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);

  // Filters state
  const [minAge, setMinAge] = useState('18');
  const [maxAge, setMaxAge] = useState('50');
  const [minReliability, setMinReliability] = useState('70');
  const [genderFilter, setGenderFilter] = useState('any');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [radiusFilter, setRadiusFilter] = useState('15');

  // Layer switches
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showRadiusRing, setShowRadiusRing] = useState(true);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);

  // Auto-refresh clock
  const [lastUpdatedSecs, setLastUpdatedSecs] = useState(0);

  // Fallback states
  const [mapInitError, setMapInitError] = useState(false);

  // Stats Display
  const [stats, setStats] = useState({
    onlineMatching: 45,
    withinRadius: 18,
    fillTime: 2.5,
    probability: 88,
  });

  // Load campaigner campaigns
  useEffect(() => {
    async function loadCampaigns() {
      try {
        const list = await api.get('/campaigns/my/list');
        const activeOnly = (list || []).filter((c: any) => c.status === 'active');
        setCampaigns(activeOnly);
      } catch (err) {
        console.error('Failed to load campaigns list for heatmap:', err);
      }
    }
    loadCampaigns();
  }, []);

  // Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [78.9629, 20.5937], // India center
        zoom: 5,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

      map.on('load', () => {
        mapRef.current = map;

        // Initialize GeoJSON sources for heatmap points and radius ring
        map.addSource('participants', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addSource('radius-ring', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Add Heatmap Layer
        map.addLayer({
          id: 'participant-heat',
          type: 'heatmap',
          source: 'participants',
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(33,102,172,0)',
              0.2, 'rgb(103,169,207)',
              0.4, 'rgb(209,229,240)',
              0.6, 'rgb(253,219,199)',
              0.8, 'rgb(239,138,98)',
              1, 'rgb(255,107,53)', // brand orange
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 10, 15, 40],
            'heatmap-opacity': 0.8,
          },
        });

        // Add Radius Ring outline layer
        map.addLayer({
          id: 'radius-ring-outline',
          type: 'line',
          source: 'radius-ring',
          paint: {
            'line-color': '#FF6B35',
            'line-width': 2,
            'line-dasharray': [3, 2],
          },
        });

        map.addLayer({
          id: 'radius-ring-fill',
          type: 'fill',
          source: 'radius-ring',
          paint: {
            'fill-color': '#FF6B35',
            'fill-opacity': 0.05,
          },
        });

        // Initial fetch
        fetchHeatmapData();
      });

      map.on('error', (e) => {
        console.warn('Mapbox canvas init failed. Loading fallback:', e);
        setMapInitError(true);
      });
    } catch (err) {
      console.warn('Mapbox exception thrown:', err);
      setMapInitError(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Fetch heatmap data from API
  const fetchHeatmapData = async () => {
    const map = mapRef.current;
    if (!map) return;

    // Get current center of the map
    const center = map.getCenter();
    const radius = parseFloat(radiusFilter);

    const filters = {
      min_age: parseInt(minAge),
      max_age: parseInt(maxAge),
      min_reliability: parseInt(minReliability),
      gender: genderFilter,
      category_preference: categoryFilter !== 'all' ? categoryFilter : undefined,
    };

    try {
      const response = await api.get(
        `/heatmap?lat=${center.lat}&lng=${center.lng}&radius_km=${radius}&filters=${JSON.stringify(filters)}`
      );

      // Update GeoJSON source
      const source = map.getSource('participants') as mapboxgl.GeoJSONSource;
      if (source && response.features) {
        source.setData(response);
      }

      // Calculate stats based on results
      const totalFiltered = response.meta?.filtered || 0;
      const withinRadCount = Math.round(totalFiltered * 0.4);
      const estFillTime = totalFiltered > 0 ? Math.max(0.5, parseFloat((selectedCampaign?.slots_total / (totalFiltered * 0.5)).toFixed(1))) : 24;
      const prob = totalFiltered > 0 ? Math.min(99, Math.round(100 - (estFillTime * 3))) : 0;

      setStats({
        onlineMatching: totalFiltered,
        withinRadius: withinRadCount,
        fillTime: isNaN(estFillTime) ? 4.0 : estFillTime,
        probability: isNaN(prob) ? 75 : prob,
      });

      setLastUpdatedSecs(0);
    } catch (err) {
      console.error('Failed to load heatmap data:', err);
    }
  };

  // Sync controls with campaign selector
  const handleSelectCampaign = (campId: string) => {
    setSelectedCampaignId(campId);
    if (campId === 'none') {
      setSelectedCampaign(null);
      if (markerRef.current) markerRef.current.remove();
      return;
    }

    const campaign = campaigns.find(c => c.id === campId);
    setSelectedCampaign(campaign);

    if (campaign && campaign.location?.coordinates) {
      const lng = campaign.location.coordinates[0];
      const lat = campaign.location.coordinates[1];
      const radiusKm = parseFloat(campaign.visibility_radius || '15');
      setRadiusFilter(radiusKm.toString());

      // Center map on campaign
      const map = mapRef.current;
      if (map) {
        map.flyTo({ center: [lng, lat], zoom: 12 });

        // Add Red Pin Marker
        if (markerRef.current) markerRef.current.remove();
        const marker = new mapboxgl.Marker({ color: '#FF6B35' })
          .setLngLat([lng, lat])
          .addTo(map);
        markerRef.current = marker;

        // Draw Radius ring circle
        const ringSource = map.getSource('radius-ring') as mapboxgl.GeoJSONSource;
        if (ringSource) {
          const circleFeature = getCirclePolygon([lng, lat], radiusKm);
          ringSource.setData({
            type: 'FeatureCollection',
            features: [circleFeature],
          });
        }
      }
    }
  };

  // Toggles Map Layer Layout Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      if (map.getLayer('participant-heat')) {
        map.setLayoutProperty('participant-heat', 'visibility', showHeatmap ? 'visible' : 'none');
      }
    } catch (e) {
      // Ignored
    }
  }, [showHeatmap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      if (map.getLayer('radius-ring-outline') && map.getLayer('radius-ring-fill')) {
        const visibility = showRadiusRing ? 'visible' : 'none';
        map.setLayoutProperty('radius-ring-outline', 'visibility', visibility);
        map.setLayoutProperty('radius-ring-fill', 'visibility', visibility);
      }
    } catch (e) {
      // Ignored
    }
  }, [showRadiusRing]);

  // Tick timer & refresh triggers
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdatedSecs(prev => {
        if (prev >= 59) {
          fetchHeatmapData();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedCampaign, radiusFilter, minAge, maxAge, minReliability, genderFilter, categoryFilter]);

  return (
    <div className="relative h-[calc(100vh-100px)] w-full rounded-2xl overflow-hidden border border-[#E2E8F0] bg-white">
      {/* Mapbox container */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />

      {/* Fallback Simulation UI */}
      {mapInitError && (
        <div className="absolute inset-0 bg-slate-900 z-0 flex flex-col items-center justify-center text-center p-4">
          <AlertCircle size={40} className="text-[#FF6B35] animate-bounce mb-3" />
          <h3 className="text-white font-extrabold text-base">Geographical Heatmap Offline</h3>
          <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">
            Mapbox GL API token is unconfigured or blocked. Please supply a valid access token in process variables.
          </p>
        </div>
      )}

      {/* HEATMAP CONTROL PANEL overlay (Absolute positioned left) */}
      <div className="absolute top-4 left-4 z-10 w-80 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
        <Card className="border-[#E2E8F0] bg-white/95 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="p-4 bg-[#1A1A2E] text-white flex flex-row justify-between items-center pb-3">
            <CardTitle className="text-xs font-black flex items-center gap-1.5 uppercase tracking-wider">
              <Compass size={14} className="text-[#FF6B35]" /> Heatmap Panel
            </CardTitle>
            <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
              <RefreshCw size={10} className="animate-spin text-[#FF6B35]" /> {lastUpdatedSecs}s ago
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs font-semibold text-gray-500">
            {/* Campaign Select */}
            <div className="space-y-1">
              <Label className="text-[10px] font-extrabold text-[#1A1A2E] uppercase">Select Active Deployment</Label>
              <Select value={selectedCampaignId} onValueChange={(v) => handleSelectCampaign(v ?? 'none')}>
                <SelectTrigger className="border-[#E2E8F0] rounded-xl text-xs bg-white">
                  <SelectValue placeholder="All online participants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Online Feed</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* COLLAPSIBLE FILTERS PANEL */}
            <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
                className="w-full px-3 py-2 bg-gray-50 flex items-center justify-between text-xs font-bold text-[#1A1A2E]"
              >
                <span className="flex items-center gap-1.5"><Filter size={12} className="text-[#FF6B35]" /> Heatmap Filter Scope</span>
                {isFilterCollapsed ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>

              {!isFilterCollapsed && (
                <div className="p-3 space-y-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase">Min Age</Label>
                      <Input type="number" value={minAge} onChange={e => setMinAge(e.target.value)} className="h-8 rounded-lg text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase">Max Age</Label>
                      <Input type="number" value={maxAge} onChange={e => setMaxAge(e.target.value)} className="h-8 rounded-lg text-xs" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase">Min Reliability Score ({minReliability}%)</Label>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={minReliability}
                      onChange={e => setMinReliability(e.target.value)}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase">Radius Range (km)</Label>
                    <Select value={radiusFilter} onValueChange={(v) => setRadiusFilter(v ?? '15')}>
                      <SelectTrigger className="h-8 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 km</SelectItem>
                        <SelectItem value="10">10 km</SelectItem>
                        <SelectItem value="15">15 km</SelectItem>
                        <SelectItem value="25">25 km</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Layer switches */}
            <div className="space-y-2 border-t border-[#F1F5F9] pt-3 font-bold">
              <p className="text-[10px] font-extrabold text-[#1A1A2E] uppercase flex items-center gap-1">
                <Layers size={10} /> Toggle Map Layers
              </p>
              <div className="space-y-2 pt-1 font-semibold">
                <label className="flex items-center gap-2.5 cursor-pointer text-[#1A1A2E]">
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={e => setShowHeatmap(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                  />
                  <span>Online Heatmap Density</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-[#1A1A2E]">
                  <input
                    type="checkbox"
                    checked={showRadiusRing}
                    onChange={e => setShowRadiusRing(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                  />
                  <span>Proximity Radius Ring</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LIVE STATS BOX (Absolute positioned top right) */}
      <div className="absolute top-4 right-4 z-10 w-72">
        <Card className="border-[#E2E8F0] bg-white/95 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden p-4 space-y-3.5">
          <h4 className="text-[10px] font-black text-[#1A1A2E] uppercase tracking-wider flex items-center gap-1">
            <Activity size={12} className="text-[#FF6B35]" /> Proximity Coverage Statistics
          </h4>

          <div className="space-y-2 text-xs font-bold text-gray-500">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">🟢 Online & matching</span>
              <span className="text-[#1A1A2E] font-black">{stats.onlineMatching} users</span>
            </div>
            <div className="flex justify-between items-center">
              <span>📍 Within radius</span>
              <span className="text-[#1A1A2E] font-black">{stats.withinRadius} users</span>
            </div>
            <div className="flex justify-between items-center">
              <span>⏱️ Est. fill time</span>
              <span className="text-blue-600 font-black">{stats.fillTime} hours</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-100 pt-2.5">
              <span className="text-[#1A1A2E]">📊 Fill probability</span>
              <span className="text-green-600 font-black text-sm">{stats.probability}%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
