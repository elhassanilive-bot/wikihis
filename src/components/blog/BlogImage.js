"use client";

import { useState } from "react";
import Image from "next/image";

function isLocalImage(src) {
  return String(src || "").startsWith("/");
}

function isOptimizableRemoteImage(src) {
  try {
    const url = new URL(String(src || ""));
    return ["upload.wikimedia.org", "img.icons8.com", "tjbwezoyvsddvphrdouk.supabase.co"].includes(url.hostname);
  } catch {
    return false;
  }
}

export default function BlogImage({
  src,
  alt,
  fill = false,
  className = "",
  sizes,
  priority = false,
}) {
  const [failed, setFailed] = useState(false);
  const source = !failed && String(src || "").trim() ? String(src).trim() : "/screenshots/feed.svg";

  if (isLocalImage(source) || isOptimizableRemoteImage(source)) {
    return (
      <Image
        src={source}
        alt={alt}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className={className}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
