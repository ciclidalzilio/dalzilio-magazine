"use client";

import { useEffect, useRef, useState } from "react";

import type { BikeConfig, Point, Swatch, WheelPhoto } from "@/lib/bike-visualizer";

const cache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string) {
  let promise = cache.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Immagine non trovata: ${src}`));
      image.src = src;
    });
    cache.set(src, promise);
  }
  return promise;
}

// Ruota su un canvas a parte, con la gomma ricolorata mantenendo le ombre della foto.
function wheelLayer(image: HTMLImageElement, photo: WheelPhoto, tyre: Swatch) {
  const layer = document.createElement("canvas");
  layer.width = image.naturalWidth;
  layer.height = image.naturalHeight;
  const ctx = layer.getContext("2d")!;
  ctx.drawImage(image, 0, 0);

  if (tyre.id !== "black") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(photo.hub.x, photo.hub.y, photo.tyreRadius, 0, Math.PI * 2);
    ctx.arc(photo.hub.x, photo.hub.y, photo.rimRadius, 0, Math.PI * 2, true);
    ctx.clip();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = tyre.color;
    ctx.fillRect(0, 0, layer.width, layer.height);
    ctx.globalCompositeOperation = "soft-light";
    ctx.drawImage(image, 0, 0);
    ctx.restore();
  }

  return layer;
}

function drawWheel(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, photo: WheelPhoto, axle: Point, radius: number) {
  const scale = radius / photo.tyreRadius;
  ctx.drawImage(
    layer,
    axle.x - photo.hub.x * scale,
    axle.y - photo.hub.y * scale,
    layer.width * scale,
    layer.height * scale,
  );
}

export default function PhotoCanvas({ config, background }: { config: BikeConfig; background: "light" | "dark" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const { frame, color, wheels, tyre } = config;

  useEffect(() => {
    const framePhoto = frame.photo;
    const wheelPhoto = wheels.photo;
    if (!framePhoto || !wheelPhoto || !color.image || !wheels.image) return;

    let cancelled = false;

    Promise.all([loadImage(color.image), loadImage(wheels.image)])
      .then(([frameImage, wheelImage]) => {
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;

        canvas.width = framePhoto.width;
        canvas.height = framePhoto.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = background === "dark" ? "#16181d" : "#f4f5f7";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const layer = wheelLayer(wheelImage, wheelPhoto, tyre);
        drawWheel(ctx, layer, wheelPhoto, framePhoto.rearAxle, framePhoto.wheelRadius);
        drawWheel(ctx, layer, wheelPhoto, framePhoto.frontAxle, framePhoto.wheelRadius);
        ctx.drawImage(frameImage, 0, 0, framePhoto.width, framePhoto.height);
        setError("");
      })
      .catch((err: Error) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [frame, color, wheels, tyre, background]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="h-auto w-full"
        role="img"
        aria-label={`${frame.brand} ${frame.model} ${color.name} con ruote ${wheels.brand} ${wheels.name} e gomme ${tyre.name}`}
      />
      {error && <p className="absolute inset-0 grid place-items-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
