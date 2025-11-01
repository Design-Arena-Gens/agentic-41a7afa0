"use client";

import { useMemo, useRef, useState } from "react";
import { AssetDropzone } from "@/components/AssetDropzone";
import { VideoComposer } from "@/components/VideoComposer";

export default function Page() {
  const [assets, setAssets] = useState<File[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [productName, setProductName] = useState("Aurora Lamp");
  const [tagline, setTagline] = useState("Light. Sculpted.");
  const [features, setFeatures] = useState<string[]>([
    "Premium anodized aluminum",
    "Adaptive ambient glow",
    "12h battery life",
  ]);
  const [cta, setCta] = useState("Shop Now ?");
  const [price, setPrice] = useState("$129");
  const [ratio, setRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [style, setStyle] = useState<"cinematic" | "modern" | "minimal">(
    "cinematic",
  );

  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const composerRef = useRef<{
    startRecording: () => Promise<Blob>;
    stopRecording: () => void;
    totalDurationMs: number;
  } | null>(null);

  const hasAssets = assets.length > 0;

  async function handleGenerate() {
    setVideoUrl(null);
    setIsRecording(true);
    const blob = await composerRef.current!.startRecording();
    setIsRecording(false);
    const url = URL.createObjectURL(blob);
    setVideoUrl(url);
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <section className="lg:col-span-2 card p-4 lg:p-6">
        <h2 className="text-lg font-semibold mb-4">Project</h2>
        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm mb-1">Product name</span>
            <input className="input" value={productName} onChange={(e)=>setProductName(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-sm mb-1">Tagline</span>
            <input className="input" value={tagline} onChange={(e)=>setTagline(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-sm mb-1">Features (one per line)</span>
            <textarea className="input h-24" value={features.join("\n")} onChange={(e)=>setFeatures(e.target.value.split("\n").filter(Boolean))} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm mb-1">Price</span>
              <input className="input" value={price} onChange={(e)=>setPrice(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-sm mb-1">CTA</span>
              <input className="input" value={cta} onChange={(e)=>setCta(e.target.value)} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm mb-1">Aspect ratio</span>
              <select className="input" value={ratio} onChange={(e)=>setRatio(e.target.value as any)}>
                <option>16:9</option>
                <option>9:16</option>
                <option>1:1</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-sm mb-1">Style</span>
              <select className="input" value={style} onChange={(e)=>setStyle(e.target.value as any)}>
                <option value="cinematic">Cinematic</option>
                <option value="modern">Modern</option>
                <option value="minimal">Minimal</option>
              </select>
            </label>
          </div>

          <div>
            <span className="block text-sm mb-2">Assets</span>
            <AssetDropzone onFiles={(fs)=>setAssets(fs)} accept="image/*" multiple />
          </div>

          <div>
            <span className="block text-sm mb-2">Optional music</span>
            <AssetDropzone onFiles={(fs)=>setAudioFile(fs[0] ?? null)} accept="audio/*" multiple={false} />
          </div>

          <div className="pt-2 flex gap-3">
            <button disabled={!hasAssets || isRecording} className="btn disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleGenerate}>
              {isRecording ? "Rendering?" : "Generate Video"}
            </button>
            {videoUrl && (
              <a className="btn" download={`cineforge-${Date.now()}.webm`} href={videoUrl}>Download</a>
            )}
          </div>
        </div>
      </section>
      <section className="lg:col-span-3 card p-2 lg:p-4">
        <VideoComposer
          ref={composerRef as any}
          assets={assets}
          productName={productName}
          tagline={tagline}
          features={features}
          cta={cta}
          price={price}
          ratio={ratio}
          style={style}
          audioFile={audioFile}
        />
      </section>
    </main>
  );
}
