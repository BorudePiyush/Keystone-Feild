import React, { useState, useEffect, useRef } from 'react';
import { Users, RefreshCw, Compass, Clock, MapPin } from 'lucide-react';

interface LiveTrackingMapProps {
  token: string;
}

export default function LiveTrackingMap({ token }: LiveTrackingMapProps) {
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<any | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);

  // Load Leaflet files dynamically from CDN
  useEffect(() => {
    // 1. Add Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // 2. Add Leaflet JS Script
    if (!(window as any).L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setMapLoaded(true);
      document.body.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, []);

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/technicians', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTechs(data);
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
    const interval = setInterval(fetchTechnicians, 10000);
    return () => clearInterval(interval);
  }, []);

  // Initialize and update Leaflet Map
  useEffect(() => {
    const L = (window as any).L;
    if (!mapLoaded || !L || loading || !mapContainerRef.current) return;

    // 1. Initialize Map Instance if not created
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        fadeAnimation: true
      }).setView([20.5937, 78.9629], 5); // Default center: India

      // OpenStreetMap Dark Theme Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      markerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    // 2. Clear previous markers
    markerGroupRef.current.clearLayers();

    const bounds: any[] = [];

    // Client Sites seeded locations (Actual GPS coordinates)
    const sites = [
      { name: 'HQ Office Tower (NY)', lat: 40.7128, lng: -74.0060, addr: '123 Main St, NY' },
      { name: 'Downtown Plaza (NY)', lat: 40.7580, lng: -73.9855, addr: '456 Broadway, NY' },
      { name: 'Eastside Warehouse (Boston)', lat: 42.3601, lng: -71.0589, addr: '789 Industrial Pkwy, Boston' },
      { name: 'Westside Mall (LA)', lat: 34.0522, lng: -118.2437, addr: '101 Shopping Way, LA' }
    ];

    // Blueprint Site Icon
    const siteIcon = L.divIcon({
      className: 'custom-site-marker',
      html: `<div style="width: 14px; height: 14px; border-radius: 50%; background: #6366f1; border: 2.5px solid #ffffff; box-shadow: 0 0 10px rgba(99, 102, 241, 0.6);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    sites.forEach(site => {
      L.marker([site.lat, site.lng], { icon: siteIcon })
        .bindPopup(`
          <div style="color: #000; font-family: sans-serif; font-size: 11px;">
            <strong style="color: #4f46e5; font-size: 12px;">Client Site</strong><br/>
            <strong>Name:</strong> ${site.name}<br/>
            <strong>Address:</strong> ${site.addr}
          </div>
        `)
        .addTo(markerGroupRef.current);
      bounds.push([site.lat, site.lng]);
    });

    // Plot Online Technicians
    const onlineTechs = techs.filter(t => t.isOnDuty && t.latitude && t.longitude);

    onlineTechs.forEach(tech => {
      // Pulse animation marker icon
      const techIcon = L.divIcon({
        className: 'custom-tech-marker',
        html: `
          <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
            <div class="pulse" style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(52, 211, 153, 0.4); transform: translate(-50%, -50%);"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: #34d399; border: 2.5px solid #ffffff; box-shadow: 0 0 8px rgba(52, 211, 153, 0.8);"></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      L.marker([tech.latitude, tech.longitude], { icon: techIcon })
        .bindPopup(`
          <div style="color: #000; font-family: sans-serif; font-size: 11px;">
            <strong style="color: #059669; font-size: 12px;">Technician Checked-In</strong><br/>
            <strong>Name:</strong> ${tech.name}<br/>
            <strong>Email:</strong> ${tech.email}<br/>
            <strong>Mobile:</strong> ${tech.phone || 'N/A'}<br/>
            <strong>Coordinates:</strong> ${tech.latitude.toFixed(5)}, ${tech.longitude.toFixed(5)}
          </div>
        `)
        .addTo(markerGroupRef.current);

      bounds.push([tech.latitude, tech.longitude]);
    });

    // 3. Fit map bounds dynamically to show india user and sites
    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [mapLoaded, techs, loading]);

  const selectOnlineTech = (tech: any) => {
    setSelectedTech(tech);
    const L = (window as any).L;
    if (mapInstanceRef.current && L && tech.latitude && tech.longitude) {
      mapInstanceRef.current.setView([tech.latitude, tech.longitude], 13);
    }
  };

  return (
    <div className="fade-in">
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Real-Time Staff Radar Map</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Automatically centering map pinpointing live geolocations</p>
        </div>
        <button onClick={fetchTechnicians} className="btn btn-secondary">
          <RefreshCw size={14} />
          <span>Refresh Radar</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* Leaflet Map Grid Card */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '480px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Compass size={18} style={{ color: 'var(--primary)' }} />
            <span>Interactive Operational Radar Zone</span>
          </h3>

          <div style={{ flex: 1, position: 'relative', minHeight: '400px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {!mapLoaded && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <p style={{ color: 'var(--text-muted)' }}>Loading live maps telemetry...</p>
              </div>
            )}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '400px', background: '#0b0f19' }} />
          </div>
        </div>

        {/* Staff Directory Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="glass-card" style={{ padding: '1.5rem', flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: 'var(--primary)' }} />
              <span>Field Staff Status</span>
            </h3>

            {loading && techs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pinging field locator...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {techs.map(tech => (
                  <div 
                    key={tech.id} 
                    onClick={() => {
                      if (tech.isOnDuty) selectOnlineTech(tech);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: selectedTech?.id === tech.id ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.04)',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      cursor: tech.isOnDuty ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tech.name}</span>
                        <div style={{ 
                          width: '8px', height: '8px', 
                          borderRadius: '50%', 
                          background: tech.isOnDuty ? 'var(--color-completed)' : 'rgba(255,255,255,0.15)' 
                        }} />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tech.phone || 'No Mobile'}</span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 700, 
                        background: tech.isOnDuty ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255,255,255,0.04)', 
                        color: tech.isOnDuty ? 'var(--color-completed)' : 'var(--text-muted)', 
                        padding: '0.1rem 0.4rem', 
                        borderRadius: '4px' 
                      }}>
                        {tech.isOnDuty ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details Card for Radar Point */}
          {selectedTech && (
            <div className="glass-card fade-in" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-completed)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {selectedTech.avatarUrl ? (
                  <img src={selectedTech.avatarUrl} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                ) : (
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {selectedTech.name.substring(0, 2)}
                  </div>
                )}
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selectedTech.name}</h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>GPS Locating Active</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Location Coordinate:</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{selectedTech.latitude?.toFixed(5)}, {selectedTech.longitude?.toFixed(5)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Last Checked In:</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>
                    {selectedTech.lastLocationUpdate ? new Date(selectedTech.lastLocationUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
