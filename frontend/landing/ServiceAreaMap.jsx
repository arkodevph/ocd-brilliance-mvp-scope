import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { serviceAreas } from './data';
import 'leaflet/dist/leaflet.css';

export default function ServiceAreaMap({ query: controlledQuery = '', onQueryChange }) {
  const [localQuery, setLocalQuery] = useState('');
  const query = onQueryChange ? controlledQuery : localQuery;
  const setQuery = onQueryChange || setLocalQuery;
  const count = serviceAreas.filter(([name]) => name.toLowerCase().includes(query.toLowerCase().trim())).length;
  const element = useRef(null);
  const map = useRef(null);
  const bounds = useRef(null);
  const draw = useRef(null);
  const currentQuery = useRef(query);

  useEffect(() => {
    let cancelled = false;
    import('leaflet').then(({ default: L }) => {
      if (cancelled) return;
      const instance = L.map(element.current, { scrollWheelZoom: false, zoomControl: false });
      map.current = instance;
      L.tileLayer('https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · tiles <a href="https://www.openstreetmap.fr/">OSM France</a>',
        maxZoom: 18,
      }).addTo(instance);
      L.control.zoom({ position: 'topright' }).addTo(instance);
      bounds.current = L.latLngBounds(serviceAreas.map(([, lat, lng]) => [lat, lng]));
      const markers = L.layerGroup().addTo(instance);
      const pinIcon = (name, selected) => {
        const width = selected ? Math.max(78, Math.ceil(name.length * 7.2 + 40)) : 24;
        const height = selected ? 41 : 29;
        const surface = document.createElement('span');
        surface.className = 'service-pin-surface';
        const centre = document.createElement('span');
        centre.className = 'service-pin-centre';
        surface.append(centre);
        if (selected) surface.append(document.createTextNode(name));
        return L.divIcon({
          className: `service-pin${selected ? ' is-selected' : ''}`,
          html: surface,
          iconSize: [width, height], iconAnchor: [width / 2, height],
        });
      };
      draw.current = value => {
        markers.clearLayers();
        const matches = serviceAreas.filter(([name]) => name.toLowerCase().includes(value.toLowerCase().trim()));
        for (const [name, lat, lng] of matches) {
          const selected = matches.length === 1;
          L.marker([lat, lng], { icon: pinIcon(name, selected), interactive: false, keyboard: false, zIndexOffset: selected ? 1000 : 0 }).addTo(markers);
        }
        if (matches.length === 1) instance.setView([matches[0][1], matches[0][2]], 12);
        else instance.fitBounds(matches.length ? L.latLngBounds(matches.map(([, lat, lng]) => [lat, lng])) : bounds.current, { padding: [25, 25], maxZoom: 11 });
      };
      draw.current(currentQuery.current);
    });
    return () => { cancelled = true; draw.current = null; map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    currentQuery.current = query;
    draw.current?.(query);
  }, [query]);

  return <div className="area-map" role="group" aria-label="Map of OCD Brilliance service areas in northern Perth. Drag to move; use the plus and minus buttons to zoom.">
    <div className="area-map-canvas" ref={element} />
    <form className="area-map-search" role="search" onSubmit={event => event.preventDefault()}>
      <label className="sr-only" htmlFor="area-map-search">Search the listed suburbs</label>
      <Search size={17} aria-hidden="true" />
      <input id="area-map-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Perth suburbs" />
      {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear map search"><X size={16} aria-hidden="true" /></button>}
    </form>
    <button className="area-map-reset" type="button" onClick={() => map.current?.fitBounds(bounds.current, { padding: [25, 25] })} aria-label="Show all service areas"><RotateCcw size={15} aria-hidden="true" /></button>
    <span className="area-map-hint" role="status">{query.trim() ? count ? `${count} ${count === 1 ? 'suburb' : 'suburbs'} found` : 'No listed suburb found' : '40 suburbs · Search or drag to explore'}</span>
  </div>;
}
