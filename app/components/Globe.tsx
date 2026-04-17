"use client";

import { useEffect, useRef } from "react";
import type { Datacenter } from "../lib/datacenters";

type Props = {
  nodes: Datacenter[];
  optimalId?: string | null;
  vivid?: boolean; // brighter continents for the workload section
};

// Loads three.js at runtime from a CDN so the project doesn't need an install step.
const loadThree = () =>
  (new Function("u", "return import(u)") as (u: string) => Promise<any>)(
    "https://esm.sh/three@0.160.0"
  );

const PROVIDER_COLOR: Record<string, number> = {
  aws: 0xfbbf24,
  gcp: 0x5ad7ff,
  azure: 0x86efac,
};

function latLonToVec3(THREE: any, lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export default function Globe({ nodes, optimalId, vivid }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRefs = useRef<any>({});

  // Mount + scene setup
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
      const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
      camera.position.set(0, 0.3, 6.6);

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

      const RADIUS = 2;

      // ─── Earth body (deep ocean) ───────────────────────────────────
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(RADIUS, 96, 96),
        new THREE.MeshPhongMaterial({
          color: 0x05131c,
          emissive: 0x010a12,
          shininess: 24,
          specular: 0x103a40,
        })
      );
      root.add(earth);

      // ─── Continents (loaded from a specular map) ───────────────────
      const dotGroup = new THREE.Group();
      root.add(dotGroup);

      const buildDots = (data: Uint8ClampedArray | null, w: number, h: number) => {
        const SAMPLES = 38000;
        const golden = Math.PI * (3 - Math.sqrt(5));

        const landPos: number[] = [];
        const landCol: number[] = [];
        const edgePos: number[] = [];
        const edgeCol: number[] = [];

        const c1 = new THREE.Color(0x86efac); // leaf
        const c2 = new THREE.Color(0x4be4c5); // teal
        const c3 = new THREE.Color(0x5ad7ff); // aqua
        const tmp = new THREE.Color();

        for (let i = 0; i < SAMPLES; i++) {
          const y = 1 - (i / (SAMPLES - 1)) * 2;
          const r = Math.sqrt(1 - y * y);
          const t = golden * i;
          const x = Math.cos(t) * r;
          const z = Math.sin(t) * r;

          const u = (Math.atan2(x, z) + Math.PI) / (2 * Math.PI);
          const v = Math.acos(y) / Math.PI;

          let isLand = false;
          let isEdge = false;

          if (data) {
            const px = Math.floor(u * (w - 1));
            const py = Math.floor(v * (h - 1));
            const idx = (py * w + px) * 4;
            isLand = data[idx] > 100;
            if (isLand) {
              const dx = Math.floor(((u + 0.004) % 1) * (w - 1));
              const dy = Math.floor(Math.min(0.999, v + 0.004) * (h - 1));
              if (data[(py * w + dx) * 4] <= 100 || data[(dy * w + px) * 4] <= 100) {
                isEdge = true;
              }
            }
          } else {
            // Procedural fallback if texture fails to load.
            const n =
              Math.sin(x * 4 + 1) * Math.cos(y * 3) +
              Math.sin(z * 4 + y) * 0.8;
            isLand = n > 0.5;
          }

          if (!isLand) continue;

          // Vertical gradient leaf → teal → aqua.
          const t01 = (y + 1) / 2;
          if (t01 < 0.5) tmp.copy(c2).lerp(c1, t01 * 2);
          else tmp.copy(c2).lerp(c3, (t01 - 0.5) * 2);

          const px = x * RADIUS * 1.012;
          const py = y * RADIUS * 1.012;
          const pz = z * RADIUS * 1.012;

          if (isEdge) {
            edgePos.push(px, py, pz);
            edgeCol.push(1, 1, 1);
          } else {
            landPos.push(px, py, pz);
            landCol.push(tmp.r, tmp.g, tmp.b);
          }
        }

        const landGeo = new THREE.BufferGeometry();
        landGeo.setAttribute("position", new THREE.Float32BufferAttribute(landPos, 3));
        landGeo.setAttribute("color", new THREE.Float32BufferAttribute(landCol, 3));
        const landMat = new THREE.PointsMaterial({
          size: vivid ? 0.034 : 0.024,
          vertexColors: true,
          transparent: true,
          opacity: vivid ? 0.95 : 0.7,
          sizeAttenuation: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        dotGroup.add(new THREE.Points(landGeo, landMat));

        const edgeGeo = new THREE.BufferGeometry();
        edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePos, 3));
        edgeGeo.setAttribute("color", new THREE.Float32BufferAttribute(edgeCol, 3));
        const edgeMat = new THREE.PointsMaterial({
          size: vivid ? 0.05 : 0.038,
          vertexColors: true,
          transparent: true,
          opacity: 0.95,
          sizeAttenuation: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        dotGroup.add(new THREE.Points(edgeGeo, edgeMat));
      };

      const loader = new THREE.TextureLoader();
      loader.crossOrigin = "anonymous";
      loader.load(
        "https://threejs.org/examples/textures/planets/earth_specular_2048.jpg",
        (tex: any) => {
          const img = tex.image;
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            buildDots(null, 0, 0);
            return;
          }
          canvas.width = 1024;
          canvas.height = 512;
          ctx.drawImage(img, 0, 0, 1024, 512);
          buildDots(ctx.getImageData(0, 0, 1024, 512).data, 1024, 512);
        },
        undefined,
        () => buildDots(null, 0, 0)
      );

      // ─── Atmosphere shader (back-side additive halo) ───────────────
      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(RADIUS * 1.18, 64, 64),
        new THREE.ShaderMaterial({
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
              gl_FragColor = vec4(c, intensity * 0.95);
            }
          `,
        })
      );
      root.add(atmo);

      // ─── Lighting ──────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0x88aab0, 0.5));
      const key = new THREE.DirectionalLight(0xb8fff0, 0.95);
      key.position.set(5, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x5ad7ff, 0.55);
      rim.position.set(-6, -2, -3);
      scene.add(rim);

      // ─── Containers for nodes & arcs ───────────────────────────────
      const nodesGroup = new THREE.Group();
      const arcsGroup = new THREE.Group();
      root.add(nodesGroup);
      root.add(arcsGroup);

      // ─── Drag interaction ──────────────────────────────────────────
      const drag = { active: false, x: 0, y: 0, vx: 0.0014 };
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

      // ─── Resize ────────────────────────────────────────────────────
      const ro = new ResizeObserver(() => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });
      ro.observe(mount);

      // ─── Animation loop ────────────────────────────────────────────
      const clock = new THREE.Clock();
      const animate = () => {
        const t = clock.getElapsedTime();
        if (!drag.active) {
          root.rotation.y += drag.vx;
          drag.vx *= 0.985;
          drag.vx += 0.0006;
        }
        nodesGroup.children.forEach((m: any) => {
          if (m.userData?.halo) {
            const k = 0.85 + Math.sin(t * 1.6 + m.userData.phase) * 0.18;
            m.scale.setScalar(k);
          }
        });
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);

      sceneRefs.current = {
        THREE, scene, camera, renderer, root, nodesGroup, arcsGroup, RADIUS,
        cleanup: () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          renderer.domElement.removeEventListener("pointerdown", onDown);
          renderer.domElement.removeEventListener("pointermove", onMove);
          renderer.domElement.removeEventListener("pointerup", onUp);
          renderer.domElement.removeEventListener("pointerleave", onUp);
          renderer.dispose();
          if (renderer.domElement.parentNode === mount) {
            mount.removeChild(renderer.domElement);
          }
        },
      };
    })();

    return () => {
      disposed = true;
      const r = sceneRefs.current;
      if (r?.cleanup) r.cleanup();
      sceneRefs.current = {};
    };
  }, [vivid]);

  // Repaint markers when nodes / selection change
  useEffect(() => {
    const r = sceneRefs.current;
    if (!r?.THREE) return;
    const { THREE, nodesGroup, arcsGroup, RADIUS } = r;

    [nodesGroup, arcsGroup].forEach((g: any) => {
      while (g.children.length) {
        const c = g.children.pop();
        c.geometry?.dispose?.();
        c.material?.dispose?.();
      }
    });

    nodes.forEach((dc, i) => {
      if (dc.lat === 0 && dc.lon === 0) return; // skip unknown regions
      const pos = latLonToVec3(THREE, dc.lat, dc.lon, RADIUS * 1.014);
      const isOptimal = dc.id === optimalId;
      const color = PROVIDER_COLOR[dc.provider] ?? 0xffffff;
      const up = pos.clone().normalize();
      const qZ = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        up
      );

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(isOptimal ? 0.034 : 0.022, 16, 16),
        new THREE.MeshBasicMaterial({ color: isOptimal ? 0xffffff : color })
      );
      core.position.copy(pos);
      nodesGroup.add(core);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.075, 32),
        new THREE.MeshBasicMaterial({
          color: isOptimal ? 0x86efac : color,
          transparent: true,
          opacity: isOptimal ? 0.95 : 0.5,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      halo.position.copy(pos);
      halo.quaternion.copy(qZ);
      halo.userData = { halo: true, phase: i * 0.7 };
      nodesGroup.add(halo);

      if (isOptimal) {
        const qY = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          up
        );
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.001, 0.5, 14, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xb9fbe6,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );
        beam.position.copy(pos.clone().add(up.clone().multiplyScalar(0.25)));
        beam.quaternion.copy(qY);
        nodesGroup.add(beam);
      }
    });
  }, [nodes, optimalId]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 [touch-action:none] cursor-grab active:cursor-grabbing"
      aria-label="3D globe of cloud regions"
    />
  );
}
