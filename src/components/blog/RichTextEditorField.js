"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import { getSupabaseClient } from "@/lib/supabase/client";

const BLOG_MEDIA_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_BLOG_BUCKET === "shima-blog-media"
    ? "blog-media"
    : process.env.NEXT_PUBLIC_SUPABASE_BLOG_BUCKET || "blog-media";
const FONT_FAMILIES = [
  { label: "الافتراضي", value: "" },
  { label: "Cairo", value: "rt-font-cairo" },
  { label: "Almarai", value: "rt-font-almarai" },
  { label: "Tajawal", value: "rt-font-tajawal" },
  { label: "Georgia", value: "rt-font-georgia" },
  { label: "Monospace", value: "rt-font-mono" },
];
const FONT_SIZES = [
  { label: "الحجم", value: "" },
  { label: "14", value: "rt-size-14" },
  { label: "16", value: "rt-size-16" },
  { label: "18", value: "rt-size-18" },
  { label: "20", value: "rt-size-20" },
  { label: "24", value: "rt-size-24" },
  { label: "30", value: "rt-size-30" },
  { label: "36", value: "rt-size-36" },
];

const TypographyStyle = Extension.create({
  name: "typographyStyle",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamilyClass: {
            default: null,
            parseHTML: (element) =>
              Array.from(element.classList || []).find((className) => className.startsWith("rt-font-")) || null,
            renderHTML: (attributes) => {
              if (!attributes.fontFamilyClass) return {};
              return { class: attributes.fontFamilyClass };
            },
          },
          fontSizeClass: {
            default: null,
            parseHTML: (element) =>
              Array.from(element.classList || []).find((className) => className.startsWith("rt-size-")) || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSizeClass) return {};
              return { class: attributes.fontSizeClass };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSizeClass) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSizeClass }).run(),
      setFontFamily:
        (fontFamilyClass) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontFamilyClass }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSizeClass: null }).removeEmptyTextStyle().run(),
      unsetFontFamily:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontFamilyClass: null }).removeEmptyTextStyle().run(),
    };
  },
});

const AudioBlock = Node.create({
  name: "audioBlock",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      title: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "audio[data-audio-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "audio",
      mergeAttributes(HTMLAttributes, {
        "data-audio-block": "true",
        controls: "true",
        class: "blog-embedded-audio",
      }),
    ];
  },
});

const VideoBlock = Node.create({
  name: "videoBlock",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      poster: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "video[data-video-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        "data-video-block": "true",
        controls: "true",
        class: "blog-embedded-video",
      }),
    ];
  },
});

const EmbedBlock = Node.create({
  name: "embedBlock",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      title: { default: "Embedded content" },
      height: { default: 420 },
    };
  },
  parseHTML() {
    return [{ tag: "iframe[data-embed-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "iframe",
      mergeAttributes(HTMLAttributes, {
        "data-embed-block": "true",
        loading: "lazy",
        allowfullscreen: "true",
        class: "blog-embedded-iframe",
      }),
    ];
  },
});

const ButtonLink = Node.create({
  name: "buttonLink",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      href: { default: null },
      label: { default: "زر" },
      variant: { default: "primary" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-button-link]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const variant = HTMLAttributes.variant === "secondary" ? "secondary" : "primary";
    return [
      "div",
      {
        "data-button-link": "true",
      },
      [
        "a",
        mergeAttributes(
          {
            href: HTMLAttributes.href,
            class: `blog-inline-button ${variant === "secondary" ? "blog-inline-button-secondary" : ""}`.trim(),
          },
          {
            target: "_blank",
            rel: "noopener noreferrer",
          }
        ),
        HTMLAttributes.label,
      ],
    ];
  },
});

function IconFrame({ children }) {
  return <span className="flex h-4 w-4 items-center justify-center text-[13px] leading-none text-black">{children}</span>;
}

function SvgIcon({ children, viewBox = "0 0 24 24" }) {
  return (
    <svg
      viewBox={viewBox}
      className="h-4 w-4 stroke-current text-black"
      fill="none"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ToolbarButton({ onClick, onMouseDown, active = false, title, children, disabled = false }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown?.(event);
      }}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={[
        "flex h-9 w-9 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-60",
        active ? "border-black bg-slate-100" : "border-slate-300 bg-white hover:border-black hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 hidden h-6 w-px bg-slate-300 sm:block" aria-hidden="true" />;
}

function ColorButton({ title, defaultValue, onChange, onMouseDown, children }) {
  const inputRef = useRef(null);

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown?.(event);
      }}
      onClick={() => inputRef.current?.click()}
      className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white hover:border-black hover:bg-slate-50"
    >
      {children}
      <input
        ref={inputRef}
        type="color"
        defaultValue={defaultValue}
        onChange={onChange}
        className="pointer-events-none absolute inset-0 opacity-0"
        tabIndex={-1}
      />
    </button>
  );
}

function ToolbarSelect({ title, value, onChange, options }) {
  return (
    <select
      title={title}
      aria-label={title}
      value={value}
      onChange={onChange}
      className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition hover:border-black focus:border-black"
    >
      {options.map((option) => (
        <option key={option.value || "default"} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
    reader.readAsDataURL(file);
  });
}

function loadImageDimensions(src) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("تعذر تحميل الصورة."));
    image.src = src;
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function uploadMediaFileToSupabase(file, folder = "editor") {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase غير مُعد. أضف مفاتيح Supabase أولًا.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${folder}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(BLOG_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    throw new Error(
      `تعذر رفع الملف إلى bucket "${BLOG_MEDIA_BUCKET}". أنشئ bucket بالاسم نفسه وشغّل سياسات الملف supabase/blog_storage.sql ثم أعد المحاولة.`
    );
  }

  const { data } = supabase.storage.from(BLOG_MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("تم الرفع لكن لم نتمكن من إنشاء رابط عام للملف.");
  }

  return data.publicUrl;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCropRect(rect) {
  const x = Math.min(rect.x, rect.x + rect.width);
  const y = Math.min(rect.y, rect.y + rect.height);
  return {
    x,
    y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
}

function CropImageModal({ cropState, setCropState, onClose, onConfirm }) {
  if (!cropState) return null;

  const displayWidth = cropState.displayWidth || 640;
  const displayHeight = cropState.displayHeight || 420;
  const cropRect = normalizeCropRect(
    cropState.cropRect || {
      x: displayWidth * 0.1,
      y: displayHeight * 0.1,
      width: displayWidth * 0.8,
      height: displayHeight * 0.8,
    }
  );

  function updateCropRect(updater) {
    setCropState((current) => {
      const nextRaw = typeof updater === "function" ? updater(normalizeCropRect(current.cropRect)) : updater;
      const next = normalizeCropRect(nextRaw);
      const safeX = clamp(next.x, 0, Math.max(0, current.displayWidth - 24));
      const safeY = clamp(next.y, 0, Math.max(0, current.displayHeight - 24));
      return {
        ...current,
        cropRect: {
          x: safeX,
          y: safeY,
          width: clamp(next.width, 24, current.displayWidth - safeX),
          height: clamp(next.height, 24, current.displayHeight - safeY),
        },
      };
    });
  }

  function beginCropInteraction(event, mode, handle = "") {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startRect = normalizeCropRect(cropRect);

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      updateCropRect(() => {
        if (mode === "move") {
          return {
            x: clamp(startRect.x + dx, 0, displayWidth - startRect.width),
            y: clamp(startRect.y + dy, 0, displayHeight - startRect.height),
            width: startRect.width,
            height: startRect.height,
          };
        }

        let next = {
          x: startRect.x,
          y: startRect.y,
          width: startRect.width,
          height: startRect.height,
        };

        if (handle.includes("e")) next.width = startRect.width + dx;
        if (handle.includes("s")) next.height = startRect.height + dy;
        if (handle.includes("w")) {
          next.x = startRect.x + dx;
          next.width = startRect.width - dx;
        }
        if (handle.includes("n")) {
          next.y = startRect.y + dy;
          next.height = startRect.height - dy;
        }

        return normalizeCropRect(next);
      });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-4xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-950">قص الصورة قبل الإدراج</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              اسحب إطار القص بالماوس وغيّر حجمه من الزوايا حتى تختار الجزء الذي تريد رفعه.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
          >
            إلغاء
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="overflow-auto rounded-[1.5rem] border border-slate-200 bg-slate-100 p-4">
            <div className="blog-crop-stage mx-auto" style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cropState.dataUrl}
                alt="Crop preview"
                className="blog-crop-stage-image"
                style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
              />
              <div className="blog-crop-mask" />
              <div
                className="blog-crop-selection"
                style={{
                  left: `${cropRect.x}px`,
                  top: `${cropRect.y}px`,
                  width: `${cropRect.width}px`,
                  height: `${cropRect.height}px`,
                }}
                onMouseDown={(event) => beginCropInteraction(event, "move")}
              >
                <div className="blog-crop-selection-grid" />
                {["nw", "ne", "sw", "se"].map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    className={`blog-crop-handle blog-crop-handle-${handle}`}
                    onMouseDown={(event) => beginCropInteraction(event, "resize", handle)}
                    aria-label={`Resize crop ${handle}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              <div className="font-semibold text-slate-900">أبعاد القص الحالية</div>
              <div className="mt-2">
                {Math.round((cropRect.width / displayWidth) * cropState.width)} ×{" "}
                {Math.round((cropRect.height / displayHeight) * cropState.height)} px
              </div>
              <div className="mt-3 text-xs text-slate-500">
                حرّك الإطار من الوسط، أو اسحب أي زاوية للحصول على قص حر تمامًا بدون sliders.
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex items-center justify-center rounded-2xl bg-[var(--blog-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--blog-accent-strong)]"
              >
                قص وإدراج
              </button>
              <button
                type="button"
                onClick={() =>
                  setCropState((current) => ({
                    ...current,
                    cropRect: {
                      x: current.displayWidth * 0.1,
                      y: current.displayHeight * 0.1,
                      width: current.displayWidth * 0.8,
                      height: current.displayHeight * 0.8,
                    },
                  }))
                }
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
              >
                إعادة ضبط
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorInputModal({ modalState, setModalState }) {
  if (!modalState?.open) return null;

  const action = modalState.action;

  function updateField(key, value) {
    setModalState((current) => ({
      ...current,
      values: {
        ...current.values,
        [key]: value,
      },
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-slate-950">{action.title}</h3>
            {action.description ? <p className="mt-2 text-sm leading-7 text-slate-600">{action.description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setModalState(null)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
          >
            إغلاق
          </button>
        </div>

        <div className="mt-6 grid gap-5">
          {action.fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-900">{field.label}</span>
              {field.type === "select" ? (
                <select
                  value={modalState.values[field.key] || field.defaultValue || ""}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-orange-300 focus:bg-white"
                >
                  {(field.options || []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={modalState.values[field.key] || field.defaultValue || ""}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  rows={field.rows || 4}
                  placeholder={field.placeholder || ""}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white"
                />
              ) : (
                <input
                  type={field.type || "text"}
                  dir={field.dir || "rtl"}
                  value={modalState.values[field.key] || field.defaultValue || ""}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  placeholder={field.placeholder || ""}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white"
                />
              )}
            </label>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => setModalState(null)}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={async () => {
              if (savedSelectionRef.current) {
                editor.chain().focus().setTextSelection(savedSelectionRef.current).run();
              }
              const result = await action.onSubmit(modalState.values);
              if (result?.ok === false) {
                setModalState((current) => ({
                  ...current,
                  error: result.error || "تعذر تنفيذ العملية.",
                }));
                return;
              }
              savedSelectionRef.current = null;
              setModalState(null);
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-[var(--blog-accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--blog-accent-strong)]"
          >
            حفظ
          </button>
        </div>

        {modalState.error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {modalState.error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResizableImageView({ node, updateAttributes, selected, deleteNode }) {
  const wrapperRef = useRef(null);
  const replaceInputRef = useRef(null);
  const [replaceState, setReplaceState] = useState({ message: "", error: false, pending: false });
  const widthPercent = Math.max(20, Math.min(100, Number(node.attrs.widthPercent) || 100));
  const align = node.attrs.align || "center";
  const rotation = Number(node.attrs.rotation) || 0;
  const caption = node.attrs.caption || "";
  const altText = node.attrs.alt || "";

  function setAlign(nextAlign) {
    updateAttributes({ align: nextAlign });
  }

  function handleResizeStart(event) {
    event.preventDefault();
    const container = wrapperRef.current?.closest(".ProseMirror") || wrapperRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth || 1;
    const startX = event.clientX;
    const startWidth = widthPercent;

    function onMove(moveEvent) {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(20, Math.min(100, Math.round(startWidth + (delta / containerWidth) * 100)));
      updateAttributes({ widthPercent: nextWidth });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  async function handleReplaceImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setReplaceState({ message: "جارٍ رفع الصورة البديلة...", error: false, pending: true });
      const publicUrl = await uploadMediaFileToSupabase(file);
      updateAttributes({
        src: publicUrl,
        alt: altText || file.name.replace(/\.[^.]+$/, ""),
      });
      setReplaceState({ message: "تم استبدال الصورة بنجاح.", error: false, pending: false });
    } catch (error) {
      setReplaceState({
        message: error instanceof Error ? error.message : "تعذر استبدال الصورة.",
        error: true,
        pending: false,
      });
    }
  }

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`blog-editor-image-wrap blog-editor-image-align-${align} ${selected ? "is-selected" : ""}`}
    >
      <div className="blog-editor-image-box" style={{ width: `${widthPercent}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={node.attrs.src}
          alt={node.attrs.alt || ""}
          className={`blog-resizable-image blog-align-${align}`}
          style={{ transform: `rotate(${rotation}deg)` }}
        />

        {selected ? (
          <div className="blog-image-toolbar" contentEditable={false}>
            <button type="button" onClick={() => setAlign("right")} className={align === "right" ? "is-active" : ""}>
              يمين
            </button>
            <button type="button" onClick={() => setAlign("center")} className={align === "center" ? "is-active" : ""}>
              وسط
            </button>
            <button type="button" onClick={() => setAlign("left")} className={align === "left" ? "is-active" : ""}>
              يسار
            </button>
            <button type="button" onClick={() => updateAttributes({ rotation: (rotation - 90 + 360) % 360 })}>
              تدوير-
            </button>
            <button type="button" onClick={() => updateAttributes({ rotation: (rotation + 90) % 360 })}>
              تدوير+
            </button>
            <button type="button" onClick={() => replaceInputRef.current?.click()} disabled={replaceState.pending}>
              استبدال
            </button>
            <button type="button" onClick={() => deleteNode()}>
              حذف
            </button>
            <span className="blog-image-size-badge">{widthPercent}%</span>
          </div>
        ) : null}

        <div className="blog-image-caption-wrap" contentEditable={false}>
          <input
            type="text"
            value={caption}
            onChange={(event) => updateAttributes({ caption: event.target.value })}
            placeholder="أضف caption تحت الصورة..."
            className="blog-image-caption-input"
          />
          <input
            type="text"
            value={altText}
            onChange={(event) => updateAttributes({ alt: event.target.value })}
            placeholder="نص بديل للصورة لتحسين الوصول و SEO..."
            className="blog-image-alt-input"
          />
        </div>

        {replaceState.message ? (
          <div className={replaceState.error ? "blog-image-inline-status is-error" : "blog-image-inline-status"}>
            {replaceState.message}
          </div>
        ) : null}

        <input
          ref={replaceInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          contentEditable={false}
          onChange={handleReplaceImage}
        />

        <button
          type="button"
          contentEditable={false}
          className="blog-image-resize-handle"
          onMouseDown={handleResizeStart}
          aria-label="Resize image"
          title="اسحب لتغيير حجم الصورة"
        />
      </div>
    </NodeViewWrapper>
  );
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      widthPercent: {
        default: 100,
        parseHTML: (element) => Number(element.getAttribute("data-width")) || 100,
        renderHTML: (attributes) => ({
          "data-width": attributes.widthPercent,
        }),
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes) => ({
          "data-align": attributes.align || "center",
        }),
      },
      rotation: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute("data-rotation")) || 0,
        renderHTML: (attributes) => ({
          "data-rotation": String(attributes.rotation || 0),
        }),
      },
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") || "",
        renderHTML: (attributes) => ({
          "data-caption": attributes.caption || "",
        }),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const widthPercent = Math.max(20, Math.min(100, Number(HTMLAttributes.widthPercent) || 100));
    const align = HTMLAttributes.align || "center";
    const rotation = Number(HTMLAttributes.rotation) || 0;
    const caption = HTMLAttributes.caption || "";
    const { widthPercent: _width, align: _align, rotation: _rotation, caption: _caption, ...rest } = HTMLAttributes;

    return [
      "figure",
      {
        class: `blog-image-figure blog-align-${align}`,
      },
      [
        "img",
        mergeAttributes(rest, {
          class: `blog-resizable-image blog-align-${align}`,
          style: `width:${widthPercent}%;transform:rotate(${rotation}deg);`,
          "data-width": String(widthPercent),
          "data-align": align,
          "data-rotation": String(rotation),
          "data-caption": caption,
        }),
      ],
      ["figcaption", { class: "blog-image-caption" }, caption],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export default function RichTextEditorField({
  name = "content",
  value = "<p></p>",
  onChange,
}) {
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const [uploadState, setUploadState] = useState({ kind: "", message: "", error: false });
  const [cropState, setCropState] = useState(null);
  const [modalState, setModalState] = useState(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TypographyStyle,
      Link.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: "https",
      }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
      Youtube.configure({
        controls: true,
        nocookie: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "ابدأ كتابة المقال بتنسيق غني ومرن...",
      }),
      AudioBlock,
      VideoBlock,
      EmbedBlock,
      ButtonLink,
    ],
    content: value || "<p></p>",
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "blog-editor-surface",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextValue = value || "<p></p>";
    if (editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue, false);
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-10 text-center text-slate-500">
        جارٍ تحميل المحرر...
      </div>
    );
  }

  async function createCroppedImageFile(state) {
    const image = new window.Image();
    image.src = state.dataUrl;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const cropRect = normalizeCropRect(state.cropRect);
    const scaleX = sourceWidth / state.displayWidth;
    const scaleY = sourceHeight / state.displayHeight;
    const sx = clamp(Math.round(cropRect.x * scaleX), 0, sourceWidth - 1);
    const sy = clamp(Math.round(cropRect.y * scaleY), 0, sourceHeight - 1);
    const cropWidth = clamp(Math.round(cropRect.width * scaleX), 1, sourceWidth - sx);
    const cropHeight = clamp(Math.round(cropRect.height * scaleY), 1, sourceHeight - sy);

    const canvas = document.createElement("canvas");
    const targetWidth = Math.min(1600, Math.round(cropWidth));
    const targetHeight = Math.min(1600, Math.round(cropHeight));
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    context.drawImage(image, sx, sy, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      throw new Error("تعذر إنشاء الصورة المقصوصة.");
    }

    return new File([blob], state.file.name.replace(/\.\w+$/, "") + "-cropped.jpg", { type: "image/jpeg" });
  }

  async function handleFileSelection(event, kind) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (kind === "image") {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const dimensions = await loadImageDimensions(dataUrl);
        const displayScale = Math.min(1, 640 / dimensions.width, 420 / dimensions.height);
        const displayWidth = Math.max(240, Math.round(dimensions.width * displayScale));
        const displayHeight = Math.max(180, Math.round(dimensions.height * displayScale));
        setCropState({
          file,
          dataUrl,
          width: dimensions.width,
          height: dimensions.height,
          displayWidth,
          displayHeight,
          cropRect: {
            x: displayWidth * 0.1,
            y: displayHeight * 0.1,
            width: displayWidth * 0.8,
            height: displayHeight * 0.8,
          },
        });
      } catch (error) {
        setUploadState({
          kind,
          message: error instanceof Error ? error.message : "تعذر تجهيز الصورة للقص.",
          error: true,
        });
      }
      return;
    }

    try {
      setUploadState({ kind, message: `جارٍ رفع ${kind}...`, error: false });
      const publicUrl = await uploadMediaFileToSupabase(file);

      if (kind === "image") {
        editor.chain().focus().setImage({ src: publicUrl, alt: file.name, widthPercent: 100, align: "center" }).run();
      } else if (kind === "video") {
        editor.chain().focus().insertContent({ type: "videoBlock", attrs: { src: publicUrl, poster: "" } }).run();
      } else if (kind === "audio") {
        editor.chain().focus().insertContent({ type: "audioBlock", attrs: { src: publicUrl, title: file.name } }).run();
      }

      setUploadState({ kind, message: `تم رفع ${kind} وإدراجه في المقال.`, error: false });
    } catch (error) {
      setUploadState({
        kind,
        message: error instanceof Error ? error.message : "تعذر رفع الملف.",
        error: true,
      });
    }
  }

  function openInputModal(action) {
    const { from, to } = editor.state.selection;
    savedSelectionRef.current = { from, to };
    const initialValues = {};
    action.fields.forEach((field) => {
      initialValues[field.key] = field.defaultValue || "";
    });
    setModalState({
      open: true,
      action,
      values: initialValues,
      error: "",
    });
  }

  function rememberSelection() {
    const { from, to } = editor.state.selection;
    savedSelectionRef.current = { from, to };
  }

  function chainWithSelection() {
    const chain = editor.chain().focus();
    if (savedSelectionRef.current) {
      chain.setTextSelection(savedSelectionRef.current);
    }
    return chain;
  }

  const currentFontFamily = editor.getAttributes("textStyle").fontFamilyClass || "";
  const currentFontSize = editor.getAttributes("textStyle").fontSizeClass || "";

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-300 bg-[#f6f7f7]">
      <EditorInputModal modalState={modalState} setModalState={setModalState} />
      <CropImageModal
        cropState={cropState}
        setCropState={setCropState}
        onClose={() => setCropState(null)}
        onConfirm={async () => {
          if (!cropState) return;

          try {
            setUploadState({ kind: "image", message: "جارٍ قص الصورة ورفعها...", error: false });
            const croppedFile = await createCroppedImageFile(cropState);
            const publicUrl = await uploadMediaFileToSupabase(croppedFile);
            editor.chain().focus().setImage({
              src: publicUrl,
              alt: cropState.file.name.replace(/\.[^.]+$/, ""),
              widthPercent: 100,
              align: "center",
              rotation: 0,
              caption: "",
            }).run();
            setUploadState({ kind: "image", message: "تم رفع الصورة المقصوصة وإدراجها.", error: false });
            setCropState(null);
          } catch (error) {
            setUploadState({
              kind: "image",
              message: error instanceof Error ? error.message : "تعذر قص الصورة أو رفعها.",
              error: true,
            });
          }
        }}
      />

      <input type="hidden" name={name} value={value} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleFileSelection(event, "image")} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(event) => handleFileSelection(event, "video")} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(event) => handleFileSelection(event, "audio")} />

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-[#fcfcfc] px-3 py-3">
        <ToolbarSelect
          title="نوع الخط"
          value={currentFontFamily}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (!nextValue) {
              editor.chain().focus().unsetFontFamily().run();
              return;
            }
            editor.chain().focus().setFontFamily(nextValue).run();
          }}
          options={FONT_FAMILIES}
        />
        <ToolbarSelect
          title="حجم الخط"
          value={currentFontSize}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (!nextValue) {
              editor.chain().focus().unsetFontSize().run();
              return;
            }
            editor.chain().focus().setFontSize(nextValue).run();
          }}
          options={FONT_SIZES}
        />
        <ToolbarDivider />
        <ToolbarButton title="عنوان 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}>
          <IconFrame><strong>H1</strong></IconFrame>
        </ToolbarButton>
        <ToolbarButton title="عنوان 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          <IconFrame><strong>H2</strong></IconFrame>
        </ToolbarButton>
        <ToolbarButton title="عنوان 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
          <IconFrame><strong>H3</strong></IconFrame>
        </ToolbarButton>
        <ToolbarButton title="فقرة" onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")}>
          <IconFrame>P</IconFrame>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton title="عريض" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <IconFrame><strong>B</strong></IconFrame>
        </ToolbarButton>
        <ToolbarButton title="مائل" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <IconFrame><em>I</em></IconFrame>
        </ToolbarButton>
        <ToolbarButton title="تسطير" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>
          <SvgIcon><path d="M6 4v6a6 6 0 0 0 12 0V4" /><path d="M4 20h16" /></SvgIcon>
        </ToolbarButton>
        <ColorButton
          title="لون النص"
          defaultValue="#111111"
          onMouseDown={rememberSelection}
          onChange={(event) => chainWithSelection().setColor(event.target.value).run()}
        >
          <SvgIcon><path d="M4 20h16" /><path d="M9 4h6" /><path d="M7 16 12 4l5 12" /></SvgIcon>
        </ColorButton>
        <ColorButton
          title="لون الخلفية"
          defaultValue="#fde68a"
          onMouseDown={rememberSelection}
          onChange={(event) => chainWithSelection().setHighlight({ color: event.target.value }).run()}
        >
          <SvgIcon><path d="M5 19h14" /><path d="m7 16 5-11 5 11" /><path d="M8 13h8" /></SvgIcon>
        </ColorButton>
        <ToolbarDivider />
        <ToolbarButton title="اقتباس" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          <SvgIcon><path d="M8 10h4v4H8z" /><path d="M4 10h2v6H4z" /><path d="M18 10h2v6h-2z" /><path d="M12 10h4v4h-4z" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton title="قائمة نقطية" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <SvgIcon><path d="M9 7h11" /><path d="M9 12h11" /><path d="M9 17h11" /><circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton title="قائمة مرقمة" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <SvgIcon><path d="M10 7h10" /><path d="M10 12h10" /><path d="M10 17h10" /><path d="M4 7h2v4" /><path d="M4 11h3" /><path d="M4 16c0-1 1-2 2-2s2 1 2 2c0 2-4 1-4 3h4" /></SvgIcon>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton title="محاذاة يسار" onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })}>
          <SvgIcon><path d="M4 7h16" /><path d="M4 12h10" /><path d="M4 17h14" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton title="محاذاة وسط" onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })}>
          <SvgIcon><path d="M5 7h14" /><path d="M7 12h10" /><path d="M6 17h12" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton title="محاذاة يمين" onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })}>
          <SvgIcon><path d="M4 7h16" /><path d="M10 12h10" /><path d="M6 17h14" /></SvgIcon>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          title="رابط"
          onMouseDown={rememberSelection}
          onClick={() =>
            openInputModal({
              title: "إضافة رابط",
              description: "أدخل الرابط الذي تريد ربط النص به.",
              fields: [
                {
                  key: "href",
                  label: "الرابط",
                  type: "url",
                  dir: "ltr",
                  placeholder: "https://example.com",
                },
              ],
              onSubmit: async (values) => {
                if (!values.href?.trim()) {
                  return { ok: false, error: "الرابط مطلوب." };
                }
                chainWithSelection().extendMarkRange("link").setLink({ href: values.href.trim() }).run();
                return { ok: true };
              },
            })
          }
          active={editor.isActive("link")}
        >
          <SvgIcon><path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" /><path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton title="رفع صورة" onClick={() => imageInputRef.current?.click()}>
          <SvgIcon><rect x="4" y="5" width="16" height="14" rx="2" /><path d="m8 14 3-3 5 5" /><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton title="رفع فيديو" onClick={() => videoInputRef.current?.click()}>
          <SvgIcon><rect x="4" y="6" width="16" height="12" rx="2" /><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton title="رفع صوت" onClick={() => audioInputRef.current?.click()}>
          <SvgIcon><path d="M11 5 7 8H4v8h3l4 3z" /><path d="M16 9a4 4 0 0 1 0 6" /><path d="M18 7a7 7 0 0 1 0 10" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton
          title="YouTube"
          onClick={() =>
            openInputModal({
              title: "إضافة فيديو YouTube",
              description: "ألصق رابط الفيديو، وسيتم تحويله إلى embed داخل المقال.",
              fields: [
                {
                  key: "src",
                  label: "رابط YouTube",
                  type: "url",
                  dir: "ltr",
                  placeholder: "https://www.youtube.com/watch?v=...",
                },
              ],
              onSubmit: async (values) => {
                if (!values.src?.trim()) {
                  return { ok: false, error: "رابط الفيديو مطلوب." };
                }
                editor.commands.setYoutubeVideo({
                  src: values.src.trim(),
                  width: 1280,
                  height: 720,
                });
                return { ok: true };
              },
            })
          }
        >
          <SvgIcon><rect x="3" y="6" width="18" height="12" rx="4" /><path d="m11 9 4 3-4 3z" fill="currentColor" stroke="none" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton
          title="زر"
          onClick={() =>
            openInputModal({
              title: "إضافة زر",
              description: "أنشئ زرًا تفاعليًا داخل المقال مع النص والرابط ونوع الزر.",
              fields: [
                {
                  key: "label",
                  label: "نص الزر",
                  placeholder: "اقرأ المزيد",
                  defaultValue: "اقرأ المزيد",
                },
                {
                  key: "href",
                  label: "الرابط",
                  type: "url",
                  dir: "ltr",
                  placeholder: "https://example.com",
                },
                {
                  key: "variant",
                  label: "نوع الزر",
                  type: "select",
                  defaultValue: "primary",
                  options: [
                    { label: "Primary", value: "primary" },
                    { label: "Secondary", value: "secondary" },
                  ],
                },
              ],
              onSubmit: async (values) => {
                if (!values.label?.trim() || !values.href?.trim()) {
                  return { ok: false, error: "نص الزر والرابط مطلوبان." };
                }
                editor.chain().focus().insertContent({
                  type: "buttonLink",
                  attrs: {
                    label: values.label.trim(),
                    href: values.href.trim(),
                    variant: values.variant || "primary",
                  },
                }).run();
                return { ok: true };
              },
            })
          }
        >
          <SvgIcon><rect x="4" y="8" width="16" height="8" rx="4" /><path d="M8 12h8" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton
          title="Embed"
          onClick={() =>
            openInputModal({
              title: "إضافة Embed",
              description: "أدخل رابط iframe أو مصدر embed ليظهر كعنصر مضمّن داخل المقال.",
              fields: [
                {
                  key: "src",
                  label: "رابط الـ embed",
                  type: "url",
                  dir: "ltr",
                  placeholder: "https://...",
                },
                {
                  key: "height",
                  label: "الارتفاع",
                  type: "number",
                  dir: "ltr",
                  defaultValue: "420",
                  placeholder: "420",
                },
              ],
              onSubmit: async (values) => {
                if (!values.src?.trim()) {
                  return { ok: false, error: "رابط الـ embed مطلوب." };
                }
                editor.chain().focus().insertContent({
                  type: "embedBlock",
                  attrs: {
                    src: values.src.trim(),
                    title: "embed",
                    height: Number(values.height || 420),
                  },
                }).run();
                return { ok: true };
              },
            })
          }
        >
          <SvgIcon><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="m13 5-2 14" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton
          title="HTML"
          onClick={() =>
            openInputModal({
              title: "إضافة HTML Block",
              description: "أدخل كود HTML مخصص ليظهر كجزء مستقل داخل المقال.",
              fields: [
                {
                  key: "html",
                  label: "كود HTML",
                  type: "textarea",
                  rows: 8,
                  dir: "ltr",
                  placeholder: "<section>...</section>",
                },
              ],
              onSubmit: async (values) => {
                if (!values.html?.trim()) {
                  return { ok: false, error: "كود HTML مطلوب." };
                }
                editor.chain().focus().insertContent(values.html.trim()).run();
                return { ok: true };
              },
            })
          }
        >
          <SvgIcon><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="M11 6h2" /><path d="M11 18h2" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton
          title="Code"
          onClick={() =>
            openInputModal({
              title: "إضافة Code Block",
              description: "أدخل الكود واختر اللغة ليظهر بتنسيق واضح داخل المقال.",
              fields: [
                {
                  key: "language",
                  label: "اللغة",
                  type: "select",
                  defaultValue: "plaintext",
                  options: [
                    { label: "Plain Text", value: "plaintext" },
                    { label: "HTML", value: "html" },
                    { label: "CSS", value: "css" },
                    { label: "JavaScript", value: "javascript" },
                    { label: "TypeScript", value: "typescript" },
                    { label: "JSON", value: "json" },
                    { label: "Bash", value: "bash" },
                    { label: "SQL", value: "sql" },
                  ],
                },
                {
                  key: "code",
                  label: "الكود",
                  type: "textarea",
                  rows: 10,
                  dir: "ltr",
                  placeholder: "console.log('Hello Wikihat');",
                },
              ],
              onSubmit: async (values) => {
                if (!values.code?.trim()) {
                  return { ok: false, error: "نص الكود مطلوب." };
                }
                const language = (values.language || "plaintext").trim();
                const html = `<pre><code class="language-${escapeHtml(language)}">${escapeHtml(values.code)}</code></pre>`;
                editor.chain().focus().insertContent(html).run();
                return { ok: true };
              },
            })
          }
        >
          <SvgIcon><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="M10 6h4" /><path d="M10 18h4" /></SvgIcon>
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton title="جدول" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <SvgIcon><rect x="4" y="5" width="16" height="14" rx="1.5" /><path d="M4 10h16" /><path d="M4 14h16" /><path d="M10 5v14" /><path d="M14 5v14" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton title="إضافة عمود" onClick={() => editor.chain().focus().addColumnAfter().run()}>
          <SvgIcon><rect x="4" y="5" width="10" height="14" rx="1.5" /><path d="M17 8v8" /><path d="M13 12h8" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton title="إضافة سطر" onClick={() => editor.chain().focus().addRowAfter().run()}>
          <SvgIcon><rect x="4" y="5" width="16" height="8" rx="1.5" /><path d="M12 16v4" /><path d="M8 18h8" /></SvgIcon>
        </ToolbarButton>
        <ToolbarButton title="حذف جدول" onClick={() => editor.chain().focus().deleteTable().run()}>
          <SvgIcon><rect x="4" y="5" width="16" height="14" rx="1.5" /><path d="m8 9 8 8" /><path d="m16 9-8 8" /></SvgIcon>
        </ToolbarButton>
      </div>

      {uploadState.message ? (
        <div className={uploadState.error ? "border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" : "border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"}>
          {uploadState.message}
        </div>
      ) : null}

      <div className="bg-white px-4 py-4 sm:px-5">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
