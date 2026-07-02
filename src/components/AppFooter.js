"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";

function isRunningInApp() {
  if (typeof window === "undefined") {
    return false;
  }

  const ua = (navigator.userAgent || "").toLowerCase();

  // Android WebView marker used by packaged apps (Capacitor/Cordova/TWA wrappers).
  if (ua.includes("; wv)") || ua.includes("wikiatapp")) {
    return true;
  }

  const cap = window.Capacitor;
  if (!cap) {
    return false;
  }

  if (typeof cap.isNativePlatform === "function") {
    return cap.isNativePlatform();
  }

  const platform = typeof cap.getPlatform === "function" ? cap.getPlatform() : cap.platform;
  return Boolean(platform && platform !== "web");
}

export default function AppFooter() {
  const [showFooter, setShowFooter] = useState(false);

  useEffect(() => {
    setShowFooter(!isRunningInApp());
  }, []);

  if (!showFooter) {
    return null;
  }

  return <Footer />;
}
