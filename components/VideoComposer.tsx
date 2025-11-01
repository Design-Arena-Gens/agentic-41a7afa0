"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { fitCover, kenBurnsPath, lerp } from "@/lib/kenburns";

interface Props {
  assets: File[];
  audioFile: File | null;
  productName: string;
  tagline: string;
  features: string[];
  cta: string;
  price: string;
  ratio: "16:9" | "9:16" | "1:1";
  style: "cinematic" | "modern" | "minimal";
}

export const VideoComposer = forwardRef(function VideoComposer(props: Props, ref) {
  const { assets, audioFile, productName, tagline, features, cta, price, ratio, style } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bitmaps, setBitmaps] = useState<ImageBitmap[]>([]);

  // Layout target size
  const { width, height } = useMemo(()=>{
    if (ratio === "16:9") return { width: 1280, height: 720 };
    if (ratio === "9:16") return { width: 1080, height: 1920 };
    return { width: 1080, height: 1080 };
  }, [ratio]);

  // Scene timings (ms)
  const introMs = 1500;
  const perImageMs = 3200;
  const priceMs = 1800;
  const outroMs = 800;

  const totalDurationMs = useMemo(()=>{
    const n = Math.max(bitmaps.length, assets.length);
    if (n === 0) return introMs; 
    return introMs + n * perImageMs + priceMs + outroMs;
  }, [bitmaps.length]);

  // Load image bitmaps from files
  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      const imgs: ImageBitmap[] = [];
      for (const f of assets) {
        if (!f.type.startsWith("image/")) continue;
        const url = URL.createObjectURL(f);
        try {
          const bmp = await createImageBitmap(await (await fetch(url)).blob());
          imgs.push(bmp);
        } catch {}
      }
      if (!cancelled) setBitmaps(imgs);
    })();
    return ()=>{ cancelled = true; };
  }, [assets]);

  // Preview loop
  const previewStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  function drawFrame(ctx: CanvasRenderingContext2D, tMs: number) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0,0,W,H);

    // Background
    ctx.fillStyle = "black";
    ctx.fillRect(0,0,W,H);

    const scenes: { kind: "intro" | "image" | "price" | "outro"; idx?: number; start: number; end: number }[] = [];
    let cursor = 0;
    scenes.push({ kind: "intro", start: cursor, end: cursor + introMs });
    cursor += introMs;
    for (let i=0;i<bitmaps.length;i++) {
      scenes.push({ kind: "image", idx: i, start: cursor, end: cursor + perImageMs });
      cursor += perImageMs;
    }
    scenes.push({ kind: "price", start: cursor, end: cursor + priceMs });
    cursor += priceMs;
    scenes.push({ kind: "outro", start: cursor, end: cursor + outroMs });

    const time = Math.min(tMs, totalDurationMs - 1);
    const scene = scenes.find(s => time >= s.start && time < s.end)!;
    const local = time - scene.start;
    const prog = local / (scene.end - scene.start);

    // global color grade
    (ctx as any).filter = style === "minimal" ? "none" : "contrast(1.12) saturate(0.95) brightness(1.05)";

    if (scene.kind === "intro") {
      drawIntro(ctx, bitmaps[0], productName, tagline, prog, style);
    } else if (scene.kind === "image") {
      drawImageScene(ctx, bitmaps[scene.idx!], features[scene.idx!], scene.idx!, prog, style);
    } else if (scene.kind === "price") {
      drawPrice(ctx, price, cta, prog, style);
    } else if (scene.kind === "outro") {
      // fade to black
      ctx.fillStyle = "black";
      ctx.globalAlpha = prog;
      ctx.fillRect(0,0,W,H);
      ctx.globalAlpha = 1;
    }

    // Vignette
    if (style !== "minimal") drawVignette(ctx);

    // Optional anamorphic bars for cinematic
    if (style === "cinematic") drawLetterbox(ctx);

    // Reset filter
    (ctx as any).filter = "none";
  }

  function drawIntro(ctx: CanvasRenderingContext2D, bmp: ImageBitmap | undefined, title: string, subtitle: string, prog: number, style: Props["style"]) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    if (bmp) {
      const fit = fitCover(bmp.width, bmp.height, W, H);
      // Subtle zoom
      const zoom = 1.04 + prog * 0.04;
      const cx = fit.x + fit.w * 0.5;
      const cy = fit.y + fit.h * 0.5;
      const w = fit.w * zoom, h = fit.h * zoom;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(bmp, 0,0,bmp.width,bmp.height, cx - w/2, cy - h/2, w, h);
      ctx.globalAlpha = 1;
      // blur overlay
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0,0,W,H);
    }
    const fade = Math.min(1, prog * 1.5);
    ctx.fillStyle = `rgba(255,255,255,${fade})`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    ctx.font = `700 ${Math.round(W*0.055)}px ui-sans-serif, system-ui`;
    ctx.fillText(title, W*0.08, H*0.52);

    ctx.globalAlpha = 0.9;
    ctx.font = `400 ${Math.round(W*0.025)}px ui-sans-serif, system-ui`;
    ctx.fillText(subtitle, W*0.08, H*0.58);
    ctx.globalAlpha = 1;
  }

  function drawImageScene(ctx: CanvasRenderingContext2D, bmp: ImageBitmap | undefined, caption: string | undefined, index: number, prog: number, style: Props["style"]) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    if (bmp) {
      const fit = fitCover(bmp.width, bmp.height, W, H);
      const path = kenBurnsPath(index);
      const scale = lerp(path.startScale, path.endScale, prog);
      const panX = lerp(path.startX, path.endX, prog);
      const panY = lerp(path.startY, path.endY, prog);

      const viewW = fit.w * scale;
      const viewH = fit.h * scale;
      const x = fit.x + (fit.w - viewW) * panX;
      const y = fit.y + (fit.h - viewH) * panY;

      ctx.globalAlpha = 1;
      ctx.drawImage(bmp, 0,0,bmp.width,bmp.height, x, y, viewW, viewH);

      // Subtle black gradient at bottom for legibility
      const grad = ctx.createLinearGradient(0, H*0.7, 0, H);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, H*0.7, W, H*0.3);
    }

    if (caption) {
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "white";
      ctx.font = `600 ${Math.round(W*0.032)}px ui-sans-serif, system-ui`;
      ctx.fillText(caption, W*0.06, H*0.92);
    }
  }

  function drawPrice(ctx: CanvasRenderingContext2D, price: string, cta: string, prog: number, style: Props["style"]) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    // gradient bg
    const g = ctx.createLinearGradient(0,0,W,H);
    g.addColorStop(0, "#1f1c2c");
    g.addColorStop(1, "#928DAB");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    // fade-in
    const fade = Math.min(1, prog * 1.5);
    ctx.globalAlpha = 0.9 * fade;

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    ctx.font = `800 ${Math.round(W*0.095)}px ui-sans-serif, system-ui`;
    ctx.fillText(price, W/2, H*0.48);
    ctx.globalAlpha = 1 * fade;

    // CTA pill
    const pillW = W*0.36, pillH = Math.round(W*0.06);
    const x = W/2 - pillW/2, y = H*0.58 - pillH/2, r = pillH/2;
    ctx.fillStyle = "#6366f1";
    roundRect(ctx, x, y, pillW, pillH, r);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = `600 ${Math.round(W*0.03)}px ui-sans-serif, system-ui`;
    ctx.fillText(cta, W/2, H*0.59 + Math.round(W*0.012));
  }

  function roundRect(ctx: CanvasRenderingContext2D, x:number,y:number,w:number,h:number,r:number) {
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function drawVignette(ctx: CanvasRenderingContext2D) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const grad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.7);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);
  }

  function drawLetterbox(ctx: CanvasRenderingContext2D) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    // target 2.35:1 frame within canvas bounds
    const targetH = Math.min(H, Math.round(W / 2.35));
    const pad = Math.max(0, (H - targetH) / 2);
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, W, pad);
    ctx.fillRect(0, H - pad, W, pad);
  }

  // Continuous preview
  useEffect(()=>{
    const canvas = canvasRef.current;
    if (!canvas) return;
    const _ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
    if (!_ctx) return;
    const ctx: CanvasRenderingContext2D = _ctx;

    function loop(ts: number) {
      if (previewStartRef.current == null) previewStartRef.current = ts;
      const start = previewStartRef.current!;
      const elapsed = (ts - start) % Math.max(totalDurationMs, 1);
      drawFrame(ctx, elapsed);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return ()=>{ if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [bitmaps, productName, tagline, features.join("|"), price, cta, ratio, style, totalDurationMs]);

  // Recording API
  useImperativeHandle(ref, ()=>({
    totalDurationMs,
    startRecording: async (): Promise<Blob> => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;

      // Ensure steady start
      drawFrame(ctx, 0);

      const fps = 30;
      const stream = canvas.captureStream(fps);

      let audioEl: HTMLAudioElement | null = null;
      let audioTrack: MediaStreamTrack | null = null;
      if (audioFile) {
        const url = URL.createObjectURL(audioFile);
        audioEl = new Audio(url);
        audioEl.crossOrigin = "anonymous";
        try {
          const astream = (audioEl as any).captureStream ? (audioEl as any).captureStream() : null;
          if (astream) {
            audioTrack = astream.getAudioTracks()[0] ?? null;
          }
        } catch {}
      }

      const combined = new MediaStream([
        ...stream.getVideoTracks(),
        ...(audioTrack ? [audioTrack] : []),
      ]);

      const mime = selectMimeType();
      const recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

      const duration = totalDurationMs;
      let resolve!: (b: Blob)=>void;
      const done = new Promise<Blob>((res)=>resolve = res);
      recorder.onstop = () => {
        if (audioEl) { try { audioEl.pause(); } catch {} }
        resolve(new Blob(chunks, { type: mime }));
      };

      recorder.start();
      if (audioEl) {
        try { await audioEl.play(); } catch {}
      }

      // Render timeline deterministically
      const start = performance.now();
      await new Promise<void>((res)=>{
        function step() {
          const now = performance.now();
          const t = now - start;
          const clamped = Math.min(t, duration - 1);
          drawFrame(ctx, clamped);
          if (t < duration) requestAnimationFrame(step); else res();
        }
        requestAnimationFrame(step);
      });

      recorder.stop();
      return done;
    },
    stopRecording: () => {
      // Not used; recording stops automatically at end
    }
  }), [totalDurationMs, audioFile, bitmaps, productName, tagline, features.join("|"), price, cta, ratio, style]);

  function selectMimeType() {
    const cand = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const m of cand) {
      if ((window as any).MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    }
    return "video/webm";
  }

  return (
    <div className="w-full">
      <div className="aspect-video relative bg-black/60 rounded-lg overflow-hidden border border-white/10" style={{
        aspectRatio: ratio === "16:9" ? "16 / 9" : ratio === "9:16" ? "9 / 16" : "1 / 1",
      }}>
        <canvas ref={canvasRef} width={width} height={height} className="w-full h-full object-contain" />
        {bitmaps.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-white/60 text-sm">
            Add some product images to preview.
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-white/60">
        <div>{Math.round(totalDurationMs/100)/10}s total</div>
        <div>{width}?{height}</div>
      </div>
    </div>
  );
});
