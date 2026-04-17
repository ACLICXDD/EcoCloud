"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe3D from "react-globe.gl";
import type { Datacenter } from "../lib/datacenters";

type Props = {
  nodes: Datacenter[];
  optimalId?: string | null;
  vivid?: boolean;
};

type GlobeNode = {
  id: string;
  provider: string;
  city: string;
  country: string;
  regionCode: string;
  lat: number;
  lng: number;
  altitude: number;
  color: string;
  radius: number;
};

type GlobeControls = {
  autoRotate: boolean;
  autoRotateSpeed: number;
  enablePan: boolean;
  minDistance: number;
  maxDistance: number;
};

type GlobeHandle = {
  pointOfView: (
    pos: { lat: number; lng: number; altitude: number },
    ms?: number
  ) => void;
  controls: () => GlobeControls;
};

const PROVIDER_COLOR: Record<string, string> = {
  aws: "#fbbf24",
  gcp: "#5ad7ff",
  azure: "#86efac",
};

const oceanColor = "#041219";

export default function Globe({ nodes, optimalId, vivid }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeHandle | null>(null);
  const locationStoreRef = useRef<Map<string, GlobeNode>>(new Map());
  const lastFocusIdRef = useRef<string | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const points = useMemo<GlobeNode[]>(() => {
    return nodes
      .filter((dc) => Number.isFinite(dc.lat) && Number.isFinite(dc.lon) && (dc.lat !== 0 || dc.lon !== 0))
      .map((dc) => {
        const selected = dc.id === optimalId;
        return {
          id: dc.id,
          provider: dc.provider,
          city: dc.city,
          country: dc.country,
          regionCode: dc.regionCode,
          lat: dc.lat,
          lng: dc.lon,
          altitude: selected ? 0.03 : 0.018,
          radius: selected ? 0.33 : 0.2,
          color: selected ? "#d4ffe8" : (PROVIDER_COLOR[dc.provider] ?? "#ffffff"),
        };
      });
  }, [nodes, optimalId]);

  const pointIndex = useMemo(() => {
    const map = new Map<string, GlobeNode>();
    for (const point of points) {
      map.set(point.id, point);
    }
    return map;
  }, [points]);

  useEffect(() => {
    locationStoreRef.current = new Map(pointIndex);
  }, [pointIndex]);

  const routedPoint = optimalId ? pointIndex.get(optimalId) ?? null : null;

  const ringPulse = useMemo(() => {
    return routedPoint ? [routedPoint] : [];
  }, [routedPoint]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !routedPoint) return;

    if (lastFocusIdRef.current !== routedPoint.id) {
      globe.pointOfView(
        { lat: routedPoint.lat, lng: routedPoint.lng, altitude: 1.7 },
        1100
      );
      lastFocusIdRef.current = routedPoint.id;
    }
  }, [routedPoint]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const update = () => {
      setSize({
        width: mount.clientWidth,
        height: mount.clientHeight,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(mount);
    return () => observer.disconnect();
  }, []);

  const hasMarkers = points.length > 0;

  return (
    <div ref={mountRef} className="absolute inset-0">
      {size.width > 0 && size.height > 0 && (
      <Globe3D
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        atmosphereColor={vivid ? "#59ffd4" : "#5ad7ff"}
        atmosphereAltitude={0.2}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude="altitude"
        pointColor="color"
        pointRadius="radius"
        pointsMerge={false}
        pointResolution={16}
        pointLabel={(d: object) => {
          const node = d as GlobeNode;
          return `${node.provider.toUpperCase()} - ${node.city}, ${node.country} (${node.regionCode})`;
        }}
        ringsData={ringPulse}
        ringLat="lat"
        ringLng="lng"
        ringColor={() => ["#8fffe1", "#53e8ff", "#ffffff"]}
        ringMaxRadius={3.4}
        ringPropagationSpeed={2.6}
        ringRepeatPeriod={760}
        onGlobeReady={() => {
          const globe = globeRef.current;
          if (!globe) return;
          const controls = globe.controls();
          if (controls) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.45;
            controls.enablePan = false;
            controls.minDistance = 175;
            controls.maxDistance = 340;
          }
          if (routedPoint) {
            globe.pointOfView(
              { lat: routedPoint.lat, lng: routedPoint.lng, altitude: 1.7 },
              900
            );
            lastFocusIdRef.current = routedPoint.id;
          }
        }}
      />
      )}

      {!hasMarkers && (
        <div className="absolute inset-0 grid place-items-center text-[12px] text-white/45">
          waiting for location stream...
        </div>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(90% 70% at 50% 52%, transparent 45%, ${oceanColor}cc 100%)`,
        }}
      />
    </div>
  );
}
