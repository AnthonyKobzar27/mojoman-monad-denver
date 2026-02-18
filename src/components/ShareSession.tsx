"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  sessionId: string;
  /** Optional override base URL (e.g. Vercel production URL) */
  baseUrl?: string;
  /** Large mode — vertical layout with bigger QR */
  large?: boolean;
}

export default function ShareSession({ sessionId, baseUrl, large }: Props) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (baseUrl) {
      setOrigin(baseUrl);
    } else if (typeof window !== "undefined") {
      // On localhost, use the LAN IP so others on the same network can scan
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        setOrigin(`http://${window.location.host}`);
      } else {
        setOrigin(window.location.origin);
      }
    }
  }, [baseUrl]);

  const watchUrl = `${origin}/watch/${sessionId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(watchUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (large) {
    return (
      <div className="glass-card p-6 flex flex-col items-center text-center sticky top-8">
        <p className="text-lg font-semibold text-wii-ink mb-1">Scan to Watch & Bet</p>
        <p className="text-xs text-wii-muted mb-4">Join the live session</p>
        <div className="bg-white p-4 rounded-2xl shadow-float mb-4">
          <QRCodeSVG value={watchUrl} size={240} level="M" />
        </div>
        <p className="text-xs text-wii-muted mb-3 truncate max-w-full">{watchUrl}</p>
        <button
          onClick={handleCopy}
          className="px-5 py-2 bg-studio-blue/10 hover:bg-studio-blue/20 text-studio-blue border border-studio-blue/20 rounded-lg text-sm font-medium transition-colors"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-4">
        <div className="bg-white p-2 rounded-lg shrink-0">
          <QRCodeSVG value={watchUrl} size={96} level="M" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-wii-ink mb-1">Share this session</p>
          <p className="text-xs text-wii-muted mb-3 truncate">{watchUrl}</p>
          <button
            onClick={handleCopy}
            className="px-4 py-1.5 bg-studio-blue/10 hover:bg-studio-blue/20 text-studio-blue border border-studio-blue/20 rounded-lg text-xs font-medium transition-colors"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
