"use client";
import { useEffect, useState } from "react";

export default function BlogLightbox() {
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    function handleClick(e) {
      const img = e.target.closest(".blog-prose img, .blog-prose .blog-resizable-image");
      if (!img) return;
      e.preventDefault();
      setLightbox({ src: img.src, alt: img.alt || "" });
    }
    function handleKey(e) {
      if (e.key === "Escape") setLightbox(null);
    }
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  if (!lightbox) return null;

  return (
    <div
      className="blog-lightbox-overlay"
      onClick={() => setLightbox(null)}
      role="dialog"
      aria-modal="true"
      aria-label="عرض الصورة"
    >
      <button
        className="blog-lightbox-close"
        onClick={() => setLightbox(null)}
        aria-label="إغلاق"
      >
        &#x2715;
      </button>
      <img
        src={lightbox.src}
        alt={lightbox.alt}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
