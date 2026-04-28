"use client";

import { useState } from "react";
import { Check, Copy, BookMarked, Smartphone, Chrome, ArrowLeft } from "lucide-react";
import Link from "next/link";

// The bookmarklet JavaScript — when clicked on any Instagram page,
// it grabs the current URL and opens ReelMind's add reel dialog
const BOOKMARKLET_CODE = `javascript:(function(){var u=window.location.href;if(!u.includes('instagram.com')){alert('Open an Instagram reel first!');return;}window.open('http://localhost:3000?add='+encodeURIComponent(u),'_blank');})();`;

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(BOOKMARKLET_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to ReelMind
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookMarked className="text-brand-400" size={24} />
            Quick Save Bookmarklet
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Drag the button below to your browser bookmarks bar. Then, whenever you're on an Instagram reel page, click it to instantly save the reel to ReelMind.
          </p>
        </div>

        {/* Drag target */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 text-center space-y-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
            Drag this to your bookmarks bar ↓
          </p>

          {/* The actual draggable bookmarklet link */}
          <a
            href={BOOKMARKLET_CODE}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/20 cursor-grab active:cursor-grabbing select-none"
            onClick={(e) => {
              e.preventDefault();
              alert("Drag this button to your bookmarks bar — don't click it here!");
            }}
            draggable
          >
            🎬 Save to ReelMind
          </a>

          <p className="text-xs text-gray-600">
            Can't drag it? Copy the code below and create a bookmark manually.
          </p>
        </div>

        {/* Manual copy option */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-white flex items-center gap-2">
            <Chrome size={15} className="text-gray-400" /> Manual Setup (Chrome / Safari)
          </p>
          <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
            <li>Right-click your bookmarks bar → <strong className="text-gray-300">Add page...</strong> or <strong className="text-gray-300">New bookmark</strong></li>
            <li>Set the name to <strong className="text-gray-300">Save to ReelMind</strong></li>
            <li>Paste the code below as the URL</li>
          </ol>
          <div className="relative">
            <div className="font-mono text-xs text-gray-500 bg-surface-hover border border-surface-border rounded-xl p-3 break-all leading-relaxed max-h-24 overflow-y-auto">
              {BOOKMARKLET_CODE}
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface-card border border-surface-border text-gray-500 hover:text-white transition-all"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Mobile instructions */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-white flex items-center gap-2">
            <Smartphone size={15} className="text-gray-400" /> On your phone (iOS / Android)
          </p>
          <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
            <li>Open an Instagram reel you want to save</li>
            <li>Tap <strong className="text-gray-300">···</strong> → <strong className="text-gray-300">Copy link</strong></li>
            <li>Open ReelMind on your phone → tap <strong className="text-gray-300">Add Reel</strong></li>
            <li>Paste the URL → the app fetches all details automatically</li>
          </ol>
          <p className="text-xs text-gray-600">
            Tip: Add ReelMind to your home screen (Share → Add to Home Screen) for one-tap access.
          </p>
        </div>

        {/* Pro tip */}
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
          <p className="text-xs text-brand-300 font-medium mb-1">✨ Pro tip for @palash_bountra_</p>
          <p className="text-xs text-gray-400">
            Browse your Instagram saved posts at{" "}
            <a
              href="https://www.instagram.com/palash_bountra_/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:text-brand-300 underline"
            >
              instagram.com/palash_bountra_
            </a>
            {" "}— open each saved reel, then click the bookmarklet to instantly queue it into ReelMind.
          </p>
        </div>
      </div>
    </div>
  );
}
