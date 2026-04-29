"use client";

import { X, ExternalLink, AlertCircle } from "lucide-react";
import type { Reel } from "@/lib/types";

interface ReelPlayerProps {
  reel: Reel;
  onClose: () => void;
}

function extractShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export function ReelPlayer({ reel, onClose }: ReelPlayerProps) {
  const shortcode = extractShortcode(reel.url);
  const embedUrl = shortcode ? `https://www.instagram.com/p/${shortcode}/embed/` : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Player container */}
      <div className="relative z-10 flex flex-col animate-slide-up" style={{ width: "min(380px, 90vw)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface-card border border-b-0 border-surface-border rounded-t-2xl">
          <p className="text-sm font-medium text-white truncate pr-2 flex-1">{reel.title}</p>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={reel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-gray-500 hover:text-brand-300 hover:bg-surface-hover transition-all"
              title="Open on Instagram"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-surface-hover transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Embed frame */}
        <div
          className="bg-[#000] rounded-b-2xl overflow-hidden border border-t-0 border-surface-border"
          style={{ aspectRatio: "9 / 16", maxHeight: "72vh" }}
        >
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              scrolling="no"
              allowTransparency={true}
              allow="encrypted-media; autoplay; clipboard-write"
              style={{ border: "none", display: "block" }}
              title={reel.title}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle size={28} className="text-gray-600" />
              <p className="text-sm text-gray-500">Couldn&apos;t load the embed for this reel.</p>
              <a
                href={reel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors"
              >
                <ExternalLink size={13} /> Open on Instagram
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
