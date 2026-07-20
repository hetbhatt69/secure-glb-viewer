import React, { useEffect, useRef, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
// Just ONE single line containing all your 3D tools:
import { OrbitControls, Environment, Html, Center, Bounds } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import init, { decrypt_model } from "../wasm/wasm_decrypt.js";

const ACCENT = "#c59a91";

// Fallback 3D Torus shown before loading the actual encrypted model
function PlaceholderTorus() {
  return (
    <mesh rotation={[0.4, 0.2, 0]}>
      <torusGeometry args={[1.1, 0.35, 32, 128]} />
      <meshStandardMaterial color={ACCENT} metalness={0.85} roughness={0.25} />
    </mesh>
  );
}

// Renders the decrypted GLB once Object URL is generated
function SecureModel({ scene }) {
  return (
      <Bounds fit clip observe margin={1.2}>
        <Center>
          <primitive object={scene} />
        </Center>
      </Bounds>
  );
}

function MinimalSecureViewer() {
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [modelScene, setModelScene] = useState(null);
  const wasmReady = useRef(false);

  // 1. Initialize WebAssembly engine on mount
  useEffect(() => {
    (async () => {
      try {
        await init();
        wasmReady.current = true;
      } catch (e) {
        console.error("Wasm initialization error:", e);
        setErrorMsg("Failed to initialize secure Wasm runtime.");
        setStatus("error");
      }
    })();
  }, []);


  // 3. Fetch encrypted asset, decrypt via Wasm, generate Blob URL
  const handleLoad = async () => {
    if (!wasmReady.current) {
      setErrorMsg("Wasm engine is still loading. Please wait.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      // Fetch binary payload
      const res = await fetch("/models/model.enc", {cache: "no-store"});
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      const plaintext = decrypt_model(bytes);

// Ensure GLTFLoader receives an ArrayBuffer.
      const arrayBuffer =
          plaintext instanceof ArrayBuffer
              ? plaintext
              : plaintext.buffer.slice(
                  plaintext.byteOffset,
                  plaintext.byteOffset + plaintext.byteLength
              );

      const loader = new GLTFLoader();

      loader.parse(
          arrayBuffer,
          "",
          (gltf) => {
            setModelScene(gltf.scene);
            setStatus("ready");
          },
          (error) => {
            console.error(error);
            setErrorMsg("Failed to parse GLB.");
            setStatus("error");
          }
      );
    } catch (err) {
      console.error("Decryption pipeline error:", err);
      setErrorMsg(err.message || "Decryption failed or payload tampered with");
      setStatus("error");
    }
  };

  return (
      <div style={styles.shell}>
        {/* Top Header Navigation */}
        <header style={styles.nav}>
          <div style={styles.brand}>
            <span style={styles.brandDot}/>
            seepossible<sup style={styles.copy}>©</sup>
          </div>

          <button
              onClick={handleLoad}
              disabled={status === "loading"}
              style={styles.btn}
          >
            {status === "loading" ? "Decrypting…" : "Load Secure Model"}
          </button>
        </header>

        {/* 3D Canvas Area */}
        <main style={styles.canvasWrap}>
          <Canvas
              camera={{position: [0, 1.5, 4.5], fov: 50}}
              dpr={[1, 2]}
              gl={{antialias: true, preserveDrawingBuffer: false}}
          >
            <color attach="background" args={["#fafafa"]}/>
            <ambientLight intensity={0.6}/>
            <directionalLight position={[5, 6, 4]} intensity={1.1}/>
            <directionalLight position={[-4, -2, -3]} intensity={0.25}/>

            <Suspense
                fallback={
                  <Html center>
                    <div style={styles.hint}>Loading 3D Scene…</div>
                  </Html>
                }
            >
              {modelScene ? (
                  <SecureModel scene={modelScene}/>
              ) : (
                  <PlaceholderTorus/>
              )}
              <Environment preset="studio"/>
            </Suspense>

            <OrbitControls enableDamping/>
          </Canvas>

          {status === "error" && (
              <div style={styles.errorPill}>⚠ {errorMsg}</div>
          )}
        </main>

        {/* Footer */}
        <footer style={styles.footer}>
          Protected asset delivery · AES-256-GCM · WebAssembly
        </footer>
      </div>
  );
}

export default MinimalSecureViewer

// Inline Styles
const styles = {
  shell: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
    background: "#ffffff",
    color: "#1f1f1f",
    fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  nav: {
    height: 64,
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #eee",
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(8px)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 600,
    fontSize: 18,
    letterSpacing: "-0.01em",
  },
  brandDot: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${ACCENT}, #e8c8bf)`,
    boxShadow: `0 0 0 3px rgba(197,154,145,0.15)`,
  },
  copy: { fontSize: 10, marginLeft: 2, opacity: 0.6 },
  btn: {
    background: ACCENT,
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: 10,
    fontWeight: 500,
    fontSize: 14,
    letterSpacing: "0.01em",
    boxShadow: "0 4px 14px rgba(197,154,145,0.35)",
    cursor: "pointer",
    transition: "transform 0.15s ease",
  },
  canvasWrap: {
    position: "relative",
    flex: 1,
    background: "radial-gradient(1200px 600px at 50% 0%, #fdf6f3 0%, #fafafa 60%, #f4f4f4 100%)",
  },
  hint: {
    padding: "6px 12px",
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    borderRadius: 8,
    fontSize: 13,
  },
  errorPill: {
    position: "absolute",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#fff",
    border: "1px solid #f0c8c8",
    color: "#8a2a2a",
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 13,
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },
  footer: {
    padding: "10px 24px",
    borderTop: "1px solid #eee",
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
};