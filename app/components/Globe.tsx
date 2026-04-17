"use client";

import { useEffect, useRef } from "react";
import type { Datacenter } from "../lib/datacenters";

type Props = {
  origin: { lat: number; lon: number };
  nodes: Datacenter[];
  optimalId?: string | null;
  baselineId?: string | null;
};

// Loads three.js at runtime from a CDN so the project doesn't need an install step.
// The `new Function` wrapper hides the import URL from the bundler.
const loadThree = () =>
  (new Function("u", "return import(u)") as (u: string) => Promise<any>)(
    "https://esm.sh/three@0.160.0"
  );

function latLonToVec3(THREE: any, lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export default function Globe({ origin, nodes, optimalId, baselineId }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  // Stash mutable refs to scene objects so prop changes can update without rebuilding.
  const sceneRefs = useRef<any>({});

  // Mount + scene setup ────────────────────────────────────────────────
  useEffect(() => {
    let disposed = false;
    let raf = 0;
    const mount = mountRef.current;
    if (!mount) return;

    (async () => {
      const THREE = await loadThree();
      if (disposed || !mount) return;

      const width = mount.clientWidth;
      const height = mount.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(0, 0.4, 6.4);

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const root = new THREE.Group();
      scene.add(root);

      // ─── Earth sphere (deep ocean) ──────────────────────────────────
      const RADIUS = 2;
      const earthGeo = new THREE.SphereGeometry(RADIUS, 96, 96);
      const earthMat = new THREE.MeshPhongMaterial({
        color: 0x07151c,
        emissive: 0x021015,
        shininess: 18,
        specular: 0x0c4a48,
      });
      const earth = new THREE.Mesh(earthGeo, earthMat);
      root.add(earth);

      // ─── Wireframe latitudes/longitudes ─────────────────────────────
      const wireGeo = new THREE.SphereGeometry(RADIUS * 1.001, 36, 24);
      const wireMat = new THREE.LineBasicMaterial({
        color: 0x4be4c5,
        transparent: true,
        opacity: 0.10,
      });
      const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(wireGeo),
        wireMat
      );
      root.add(wire);

      // ─── Continents as a dot pattern ────────────────────────────────
      const dotGroup = new THREE.Group();
      root.add(dotGroup);

      const mapLoader = new THREE.TextureLoader();
      mapLoader.crossOrigin = "anonymous";

      const createDots = (data: Uint8ClampedArray | null, w: number, h: number) => {
        const dotMat = new THREE.PointsMaterial({
          color: 0x86efac,
          size: 0.022,
          transparent: true,
          opacity: 0.6,
          sizeAttenuation: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        const edgeMat = new THREE.PointsMaterial({
          color: 0x4be4c5,
          size: 0.03,
          transparent: true,
          opacity: 0.85,
          sizeAttenuation: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        const dotPositions: number[] = [];
        const edgePositions: number[] = [];
        const SAMPLES = 28000; // High density for accuracy
        const golden = Math.PI * (3 - Math.sqrt(5));

        for (let i = 0; i < SAMPLES; i++) {
          const y = 1 - (i / (SAMPLES - 1)) * 2;
          const r = Math.sqrt(1 - y * y);
          const t = golden * i;
          const x = Math.cos(t) * r;
          const z = Math.sin(t) * r;

          // Spherical to UV (Equirectangular)
          const u = (Math.atan2(x, z) + Math.PI) / (2 * Math.PI);
          const v = Math.acos(y) / Math.PI;

          let isLand = false;
          let isEdge = false;

          if (data) {
            const px = Math.floor(u * (w - 1));
            const py = Math.floor(v * (h - 1));
            const idx = (py * w + px) * 4;
            // Land is white/light in specular maps
            isLand = data[idx] > 100; 

            if (isLand) {
              // Check neighbors for more precise edge detection
              const nx = Math.floor(((u + 0.003) % 1) * (w - 1));
              const ny = Math.floor(Math.min(0.999, v + 0.003) * (h - 1));
              const nidx1 = (py * w + nx) * 4;
              const nidx2 = (ny * w + px) * 4;
              if (data[nidx1] <= 100 || data[nidx2] <= 100) isEdge = true;
            }
          } else {
            // High-detail procedural fallback
            const n = Math.sin(x * 4 + 1) * Math.cos(y * 3) + 
                      Math.sin(z * 4 + y) * 0.8 + 
                      Math.cos(x * 12) * Math.sin(z * 12) * 0.2;
            isLand = n > 0.45;
          }

          if (isLand) {
            const pos = [x * RADIUS * 1.01, y * RADIUS * 1.01, z * RADIUS * 1.01];
            if (isEdge) {
              edgePositions.push(...pos);
            } else {
              dotPositions.push(...pos);
            }
          }
        }

        const dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute("position", new THREE.Float32BufferAttribute(dotPositions, 3));
        dotGroup.add(new THREE.Points(dotGeo, dotMat));

        const edgeGeo = new THREE.BufferGeometry();
        edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
        dotGroup.add(new THREE.Points(edgeGeo, edgeMat));
      };

      mapLoader.load(
        "https://threejs.org/examples/textures/planets/earth_specular_2048.jpg",
        (texture: any) => {
          const img = texture.image;
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) { createDots(null, 0, 0); return; }
          // Use higher resolution for 100% accuracy
          canvas.width = 1024;
          canvas.height = 512;
          ctx.drawImage(img, 0, 0, 1024, 512);
          createDots(ctx.getImageData(0, 0, 1024, 512).data, 1024, 512);
        },
        undefined,
        () => {
          console.warn("Globe: Accurate map failed to load, falling back to procedural patterns.");
          createDots(null, 0, 0);
        }
      );

      // ─── Inner glow / atmosphere ────────────────────────────────────

      // ─── Inner glow / atmosphere ────────────────────────────────────
      const atmoGeo = new THREE.SphereGeometry(RADIUS * 1.18, 64, 64);
      const atmoMat = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Color(0x4be4c5) },
          uColor2: { value: new THREE.Color(0x5ad7ff) },
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          uniform vec3 uColor;
          uniform vec3 uColor2;
          void main() {
            float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
            vec3 c = mix(uColor, uColor2, smoothstep(0.0, 1.0, intensity));
            gl_FragColor = vec4(c, intensity * 0.9);
          }
        `,
      });
      const atmo = new THREE.Mesh(atmoGeo, atmoMat);
      root.add(atmo);

      // ─── Lighting ───────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0x88aab0, 0.45));
      const key = new THREE.DirectionalLight(0xb8fff0, 0.95);
      key.position.set(5, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x5ad7ff, 0.5);
      rim.position.set(-6, -2, -3);
      scene.add(rim);

      // ─── Containers for nodes & arcs (rebuilt as props change) ─────
      const nodesGroup = new THREE.Group();
      const arcsGroup = new THREE.Group();
      root.add(nodesGroup);
      root.add(arcsGroup);

      // ─── Pointer drag interaction ───────────────────────────────────
      const drag = { active: false, x: 0, y: 0, vx: 0.0, vy: 0.0 };
      const onDown = (e: PointerEvent) => {
        drag.active = true;
        drag.x = e.clientX;
        drag.y = e.clientY;
        renderer.domElement.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!drag.active) return;
        const dx = (e.clientX - drag.x) * 0.005;
        const dy = (e.clientY - drag.y) * 0.005;
        root.rotation.y += dx;
        root.rotation.x = Math.max(-0.9, Math.min(0.9, root.rotation.x + dy));
        drag.x = e.clientX;
        drag.y = e.clientY;
        drag.vx = dx * 0.4;
      };
      const onUp = () => { drag.active = false; };
      renderer.domElement.addEventListener("pointerdown", onDown);
      renderer.domElement.addEventListener("pointermove", onMove);
      renderer.domElement.addEventListener("pointerup", onUp);
      renderer.domElement.addEventListener("pointerleave", onUp);

      // ─── Resize ─────────────────────────────────────────────────────
      const ro = new ResizeObserver(() => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });
      ro.observe(mount);

      // ─── Animation loop ─────────────────────────────────────────────
      const clock = new THREE.Clock();
      const animate = () => {
        const t = clock.getElapsedTime();
        if (!drag.active) {
          root.rotation.y += drag.vx;
          drag.vx *= 0.98;
        }
        // Subtle breathing on atmosphere
        atmoMat.uniforms.uColor.value.setHSL(
          0.45 + Math.sin(t * 0.3) * 0.02,
          0.7,
          0.55
        );
        // Marker pulse — modulate scale of inner halos
        nodesGroup.children.forEach((m: any) => {
          if (m.userData?.halo) {
            const k = 0.85 + Math.sin(t * 1.6 + m.userData.phase) * 0.18;
            m.scale.setScalar(k);
          }
        });
        // Arcs flow via dash offset
        arcsGroup.children.forEach((line: any) => {
          if (line.material?.dashOffset !== undefined) {
            line.material.dashOffset -= line.userData.speed ?? 0.02;
          }
        });
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);

      sceneRefs.current = {
        THREE,
        scene,
        camera,
        renderer,
        root,
        nodesGroup,
        arcsGroup,
        RADIUS,
        cleanup: () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          renderer.domElement.removeEventListener("pointerdown", onDown);
          renderer.domElement.removeEventListener("pointermove", onMove);
          renderer.domElement.removeEventListener("pointerup", onUp);
          renderer.domElement.removeEventListener("pointerleave", onUp);
          renderer.dispose();
          mount.removeChild(renderer.domElement);
        },
      };
    })();

    return () => {
      disposed = true;
      const r = sceneRefs.current;
      if (r?.cleanup) r.cleanup();
      sceneRefs.current = {};
    };
  }, []);

  // Repaint nodes / arcs when selection changes ────────────────────────
  useEffect(() => {
    const r = sceneRefs.current;
    if (!r?.THREE) return;
    const { THREE, nodesGroup, arcsGroup, RADIUS } = r;

    // Wipe previous
    [nodesGroup, arcsGroup].forEach((g: any) => {
      while (g.children.length) {
        const c = g.children.pop();
        c.geometry?.dispose?.();
        c.material?.dispose?.();
      }
    });

    // ── Markers
    nodes.forEach((dc, i) => {
      const pos = latLonToVec3(THREE, dc.lat, dc.lon, RADIUS * 1.012);
      const isOptimal = dc.id === optimalId;
      const isBaseline = dc.id === baselineId;
      const color = isOptimal
        ? 0x86efac
        : isBaseline
        ? 0xf59ec0
        : dc.carbonIntensity < 150
        ? 0x4be4c5
        : dc.carbonIntensity < 350
        ? 0x5ad7ff
        : 0xfbbf24;

      // outward orientation
      const up = pos.clone().normalize();
      const qY = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        up
      );
      const qZ = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        up
      );

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 16, 16),
        new THREE.MeshBasicMaterial({ color })
      );
      core.position.copy(pos);
      nodesGroup.add(core);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.07, 32),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: isOptimal ? 0.9 : 0.45,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      halo.position.copy(pos);
      halo.quaternion.copy(qZ);
      halo.userData = { halo: true, phase: i * 0.7 };
      nodesGroup.add(halo);

      if (isOptimal) {
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.001, 0.34, 12, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xb9fbe6,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
          })
        );
        beam.position.copy(pos.clone().add(up.clone().multiplyScalar(0.17)));
        beam.quaternion.copy(qY);
        nodesGroup.add(beam);
      }
    });

    // ── Arcs
    const drawArc = (
      a: { lat: number; lon: number },
      b: { lat: number; lon: number },
      color: number,
      strong: boolean
    ) => {
      const start = latLonToVec3(THREE, a.lat, a.lon, RADIUS * 1.012);
      const end = latLonToVec3(THREE, b.lat, b.lon, RADIUS * 1.012);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const dist = start.distanceTo(end);
      const lift = 1 + dist * 0.45;
      mid.normalize().multiplyScalar(RADIUS * lift);

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(120);
      const geo = new THREE.BufferGeometry().setFromPoints(points);

      const mat = new THREE.LineDashedMaterial({
        color,
        linewidth: 2,
        dashSize: 0.08,
        gapSize: 0.08,
        transparent: true,
        opacity: strong ? 0.9 : 0.55,
      }) as any;
      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      line.userData = { speed: strong ? 0.04 : 0.02 };
      arcsGroup.add(line);

      // Soft glow underlay
      const glow = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: strong ? 0.25 : 0.14,
        })
      );
      arcsGroup.add(glow);

      // Origin marker
      const o = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xe9fbf3 })
      );
      o.position.copy(start);
      arcsGroup.add(o);
    };

    if (optimalId) {
      const dc = nodes.find((n) => n.id === optimalId);
      if (dc) drawArc(origin, dc, 0x86efac, true);
    }
    if (baselineId && baselineId !== optimalId) {
      const dc = nodes.find((n) => n.id === baselineId);
      if (dc) drawArc(origin, dc, 0xf59ec0, false);
    }
  }, [nodes, optimalId, baselineId, origin.lat, origin.lon]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 [touch-action:none] cursor-grab active:cursor-grabbing"
      aria-label="3D globe of global data centers"
    />
  );
}
