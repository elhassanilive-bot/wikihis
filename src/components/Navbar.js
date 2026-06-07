'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getCategoryHref } from '@/lib/blog/categoryRoutes';

const sectionLinks = [
  {
    href: '/?category=الصحة واللياقة',
    label: 'الصحة واللياقة',
    active: true,
    summary: 'موضوعات الصحة واللياقة والعناية اليومية والتغذية ونمط الحياة الصحي.',
    groups: [
      {
        title: 'الصحة العامة',
        items: [
          'تطوير الذات',
          'الوقاية من الأمراض',
          'الحمل والولادة',
          'الرضاعة الطبيعية',
          'تقوية المناعة',
          'القلق والتوتر',
          'الصحة الجنسية',
        ],
      },
      {
        title: 'اللياقة والتغذية',
        items: [
          'تمارين منزلية',
          'رجيمات فعالة',
          'أخطاء في الرجيم',
          'مكملات غذائية',
          'الأكل الصحي اليومي',
          'التغذية حسب العمر',
          'التداوي بالأعشاب',
        ],
      },
      {
        title: 'العناية ونمط الحياة',
        items: ['النوم الصحي', 'العناية بالبشرة', 'العناية بالأسنان', 'العناية بالشعر', 'الاستحمام'],
      },
    ],
  },
  {
    href: '/?category=الأخبار',
    label: 'الأخبار',
    summary: 'أخبار عاجلة ومستجدات يومية وتقارير وتحليلات للأحداث الأهم.',
    groups: [
      {
        title: 'الأخبار العامة',
        items: ['أخبار عاجلة', 'آخر المستجدات', 'ملخص اليوم', 'تقارير خاصة'],
      },
      {
        title: 'مسارات المتابعة',
        items: ['سياسة', 'اقتصاد', 'مجتمع', 'متابعات'],
      },
    ],
  },
  {
    href: '/?category=البيت والأسرة',
    label: 'البيت والأسرة',
    summary: 'محتوى البيت والأسرة وتربية الأطفال والعلاقة الزوجية وتنظيم الحياة اليومية.',
    groups: [
      {
        title: 'إدارة المنزل',
        items: [
          'تنظيم البيت',
          'ترتيب الغرف',
          'أكلات سريعة',
          'التغذية العائلية',
          'التوازن بين العمل والبيت',
        ],
      },
      {
        title: 'الأطفال والرضع',
        items: [
          'سلوك الأطفال',
          'التعليم المبكر',
          'مشاكل أطفال وحلولها',
          'العناية بالرضيع',
          'الرضاعة الطبيعية',
          'تعليم الأطفال في المنزل',
        ],
      },
      {
        title: 'الحياة الزوجية',
        items: ['تحسين العلاقة الزوجية', 'الرومانسية في الزواج'],
      },
    ],
  },
  {
    href: '/?category=قضايا المرأة',
    label: 'قضايا المرأة',
    summary: 'محتوى يهتم بقضايا المرأة وحقوقها وصحتها وتطورها الأسري والمهني.',
    groups: [
      {
        title: 'الحقوق والتمكين',
        items: ['اهتمامات المرأة', 'حقوق المرأة', 'القيادة النسائية', 'قصص نجاح نسائية', 'العمل الحر لدى النساء', 'حقوق المرأة في الإسلام'],
      },
      {
        title: 'الصحة والأسرة',
        items: [
          'صحة الجهاز التناسلي',
          'الحمل والولادة',
          'الأمراض الشائعة لدى النساء',
          'العلاقة الزوجية',
          'تربية الأطفال',
        ],
      },
      {
        title: 'الحياة اليومية',
        items: ['نصائح السفر للنساء', 'طرق التعامل مع هموم المنزل بانتظام'],
      },
    ],
  },
  {
    href: '/?category=المجتمع',
    label: 'المجتمع',
    summary: 'قضايا المجتمع والاهتمامات العامة بين التاريخ والاقتصاد والسياسة والبيئة.',
    groups: [
      {
        title: 'تصنيفات المجتمع',
        items: ['التاريخ', 'الاستثمار', 'الرياضة', 'السفر', 'السياسة', 'الفنون', 'البيئة', 'اقتصاد'],
      },
    ],
  },

  {
    href: '/?category=عالم الحيوانات',
    label: 'عالم الحيوانات',
    summary: 'محتوى عن تربية الحيوانات والحياة البرية والأنواع الذكية ودورها في التوازن البيئي.',
    groups: [
      {
        title: 'تربية ورعاية',
        items: ['تربية القطط', 'تربية الكلاب', 'الأسماك'],
      },
      {
        title: 'أنواع وسلوك',
        items: [
          'الحيوانات المفترسة',
          'طرق التواصل عند الحيوانات',
          'الحيوانات الذكية',
          'أغرب الحيوانات في العالم',
          'الحشرات والطيور',
        ],
      },
      {
        title: 'الطبيعة والبيئة',
        items: ['دور الحيوانات في التوازن البيئي', 'الحياة البرية', 'أشرس حيوانات مفترسة في العالم'],
      },
    ],
  },
  {
    href: '/?category=تكنولوجيا',
    label: 'تكنولوجيا',
    summary: 'أحدث أخبار التكنولوجيا والأمن الرقمي والبرمجة والأجهزة والابتكارات.',
    groups: [
      {
        title: 'تقنيات وبرمجيات',
        items: ['الذكاء الاصطناعي', 'البرمجة وتطوير التطبيقات', 'تطوير الويب', 'الحوسبة السحابية', 'البيانات الضخمة'],
      },
      {
        title: 'الأمن والبنية التحتية',
        items: ['الأمن السيبراني', 'الشبكات والاتصالات', 'أنظمة التشغيل', 'قواعد البيانات'],
      },
      {
        title: 'أجهزة واتجاهات',
        items: ['أجهزة الكمبيوتر والإلكترونيات', 'الهواتف الذكية', 'إنترنت الأشياء', 'الواقع الافتراضي والمعزز', 'مراجعات تقنية'],
      },
    ],
  },
  {
    href: '/?category=تفسير الأحلام',
    label: 'تفسير الأحلام',
    summary: 'تفسيرات الأحلام حسب حالة الرائي ورموز الرؤى الشائعة.',
    groups: [
      {
        title: 'حسب حالة الرائي',
        items: ['تفسير أحلام العزباء', 'تفسير أحلام المتزوجة', 'تفسير أحلام الحامل', 'تفسير أحلام الرجل'],
      },
      {
        title: 'حسب رموز الرؤى',
        items: ['تفسير رؤية الحيوانات', 'تفسير رؤية الماء', 'تفسير رؤية الموتى', 'تفسير رؤية الزواج'],
      },
    ],
  },
  {
    href: '/?category=منوعات',
    label: 'منوعات',
    summary: 'موضوعات متنوعة مفيدة للحياة اليومية والعمل والتطوير الشخصي.',
    groups: [
      {
        title: 'تصنيفات منوعة',
        items: [
          'تنمية المهارات الشخصية',
          'إدارة الوقت والإنتاجية',
          'الثقافة المالية اليومية',
          'الصحة النفسية والحياة المتوازنة',
          'أفكار تعليمية للأسرة',
          'مهارات رقمية للحياة والعمل',
        ],
      },
    ],
  },
];

const MEGA_MENU_MAX_WIDTH = 980;
const VIEWPORT_PADDING = 16;

function buildCategoryHref(value, fallbackHref) {
  const category = String(value || '').trim();
  if (!category) return fallbackHref;
  return getCategoryHref(category);
}

function SectionIcon({ label }) {
  const sharedProps = {
    viewBox: '0 0 24 24',
    className: 'h-4 w-4',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  switch (label) {
    case 'الصحة واللياقة':
      return (
        <svg {...sharedProps}>
          <path d="M12 21s-7-4.35-9.2-9.4C1.05 7.6 3.55 4 7.35 4c2.05 0 3.45 1.15 4.65 2.7C13.2 5.15 14.6 4 16.65 4c3.8 0 6.3 3.6 4.55 7.6C19 16.65 12 21 12 21Z" />
          <path d="M8 12h8" />
          <path d="M12 8v8" />
        </svg>
      );
    case 'الأخبار':
      return (
        <svg {...sharedProps}>
          <path d="M5 5h11a3 3 0 0 1 3 3v11H6a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2Z" />
          <path d="M7 9h7" />
          <path d="M7 13h8" />
          <path d="M7 17h5" />
        </svg>
      );
    case 'البيت والأسرة':
      return (
        <svg {...sharedProps}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13v-9.5" />
          <path d="M9 20v-5a3 3 0 0 1 6 0v5" />
        </svg>
      );
    case 'قضايا المرأة':
      return (
        <svg {...sharedProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M12 12v8" />
          <path d="M8.5 16h7" />
        </svg>
      );
    case 'المجتمع':
      return (
        <svg {...sharedProps}>
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="8" r="3" />
          <path d="M3 20a5 5 0 0 1 10 0" />
          <path d="M11 20a5 5 0 0 1 10 0" />
        </svg>
      );
    case 'عالم الحيوانات':
      return (
        <svg {...sharedProps}>
          <path d="M8.5 10.5c.9-.9 2-1.5 3.5-1.5s2.6.6 3.5 1.5" />
          <path d="M6.5 13.5c1.5 4 9.5 4 11 0" />
          <path d="M7.5 8 5 4" />
          <path d="M16.5 8 19 4" />
          <path d="M9 13h.01" />
          <path d="M15 13h.01" />
        </svg>
      );
    case 'تكنولوجيا':
      return (
        <svg {...sharedProps}>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <path d="M9 1v4" />
          <path d="M15 1v4" />
          <path d="M9 19v4" />
          <path d="M15 19v4" />
          <path d="M1 9h4" />
          <path d="M1 15h4" />
          <path d="M19 9h4" />
          <path d="M19 15h4" />
        </svg>
      );
    case 'تفسير الأحلام':
      return (
        <svg {...sharedProps}>
          <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
          <path d="m16 4 .5 1.5L18 6l-1.5.5L16 8l-.5-1.5L14 6l1.5-.5L16 4Z" />
        </svg>
      );
    case 'منوعات':
      return (
        <svg {...sharedProps}>
          <path d="M12 3v18" />
          <path d="M3 12h18" />
          <path d="m5 5 14 14" />
          <path d="m19 5-14 14" />
        </svg>
      );
    default:
      return (
        <svg {...sharedProps}>
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}

export default function Navbar() {
  const [activeMega, setActiveMega] = useState(null);
  const [megaStyle, setMegaStyle] = useState({ left: VIEWPORT_PADDING, top: 110, width: MEGA_MENU_MAX_WIDTH });
  const [authUser, setAuthUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState(null);
  const [currentCategory, setCurrentCategory] = useState('');
  const navRef = useRef(null);
  const triggerRefs = useRef({});
  const closeTimerRef = useRef(null);

  const activeMegaLink = useMemo(
    () => sectionLinks.find((link) => link.label === activeMega) || null,
    [activeMega]
  );
  function syncCurrentCategoryFromUrl() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setCurrentCategory(String(params.get('category') || '').trim());
  }

  function updateMegaPosition(label) {
    if (typeof window === 'undefined') return;

    const trigger = triggerRefs.current[label];
    const nav = navRef.current;
    if (!trigger || !nav) return;

    const triggerRect = trigger.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const width = Math.min(MEGA_MENU_MAX_WIDTH, Math.max(320, viewportWidth - VIEWPORT_PADDING * 2));
    const preferredLeft = triggerRect.right - width;
    const maxLeft = Math.max(VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING);
    const left = Math.min(Math.max(preferredLeft, VIEWPORT_PADDING), maxLeft);

    setMegaStyle({
      left,
      top: navRect.bottom + 10,
      width,
    });
  }

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleMegaClose() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setActiveMega(null);
      closeTimerRef.current = null;
    }, 90);
  }

  function openMega(label) {
    clearCloseTimer();
    setActiveMega(label);
    updateMegaPosition(label);
  }

  useEffect(() => {
    if (!activeMega) return undefined;

    function handleResize() {
      updateMegaPosition(activeMega);
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [activeMega]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    syncCurrentCategoryFromUrl();
    window.addEventListener('popstate', syncCurrentCategoryFromUrl);
    return () => window.removeEventListener('popstate', syncCurrentCategoryFromUrl);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    function handleResize() {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bindAuth() {
      if (!isSupabaseConfigured()) return undefined;

      const supabase = await getSupabaseClient();
      if (!supabase || !mounted) return undefined;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setAuthUser(session?.user || null);
      }

      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (mounted) {
          setAuthUser(nextSession?.user || null);
        }
      });

      return () => data.subscription.unsubscribe();
    }

    const cleanupPromise = bindAuth();

    return () => {
      mounted = false;
      Promise.resolve(cleanupPromise).then((cleanup) => cleanup && cleanup());
    };
  }, []);

  return (
    <nav ref={navRef} className="fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur">
      <div className="bg-[#fbfbfb]" onMouseEnter={clearCloseTimer} onMouseLeave={scheduleMegaClose}>
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 px-3 py-2 md:hidden">
            <Link href="/" className="text-sm font-black text-slate-900">
              WIKIHIS
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-800 transition hover:border-red-200 hover:text-red-700"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
            >
              <span>{mobileMenuOpen ? 'إغلاق' : 'القائمة'}</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>

          <div className="category-nav-scroll hidden overflow-x-auto md:block">
            <div className="flex min-h-[52px] min-w-max items-center justify-between gap-2 px-3 py-1.5 sm:px-0">
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/contributors"
                  aria-label="المساهمون"
                  title="المساهمون"
                  className="inline-flex h-8 items-center gap-1.5 px-1 text-[13px] font-bold text-slate-900 transition hover:text-[var(--gold-700)]"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>المساهمون</span>
                </Link>
                <Link
                  href="/search"
                  aria-label="البحث"
                  title="البحث"
                  className="inline-flex h-8 items-center gap-1.5 px-1 text-[13px] font-bold text-slate-900 transition hover:text-[var(--gold-700)]"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" />
                  </svg>
                  <span>البحث</span>
                </Link>
                {authUser ? (
                  <Link
                    href="/account"
                    aria-label="حسابي"
                    title="حسابي"
                    className="inline-flex h-8 items-center gap-1.5 px-1 text-[13px] font-bold text-slate-900 transition hover:text-[var(--gold-700)]"
                  >
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 0 0-16 0" />
                    </svg>
                    <span>حسابي</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth"
                      className="wikihis-red-secondary inline-flex h-9 items-center rounded-full border px-4 text-sm font-extrabold transition"
                    >
                      تسجيل الدخول
                    </Link>
                    <Link
                      href="/auth?mode=signup"
                      className="wikihis-red-primary inline-flex h-9 items-center rounded-full border px-4 text-sm font-extrabold transition"
                    >
                      إنشاء حساب
                    </Link>
                  </>
                )}
              </div>

              {sectionLinks.map((link) => (
                <SectionLink
                  key={link.label}
                  link={link}
                  active={currentCategory ? currentCategory === link.label : Boolean(link.active)}
                  setTriggerRef={(node) => {
                    triggerRefs.current[link.label] = node;
                  }}
                  onOpen={() => openMega(link.label)}
                  onSelect={() => setCurrentCategory(link.label)}
                />
              ))}
            </div>
          </div>

          <div className="category-nav-scroll overflow-x-auto border-t border-slate-100 px-3 pb-2 md:hidden">
            <div className="flex min-h-[52px] min-w-max items-center gap-2">
              {sectionLinks.map((link) => (
                <SectionLink
                  key={`mobile-chip-${link.label}`}
                  link={link}
                  active={currentCategory ? currentCategory === link.label : Boolean(link.active)}
                  compact
                  onSelect={() => setCurrentCategory(link.label)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div
          id="mobile-nav-panel"
          className="md:hidden border-t border-slate-200 bg-white h-[calc(100dvh-64px)] overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="space-y-3 p-3 pb-24">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/contributors"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800"
            >
              المساهمون
            </Link>
            {authUser ? (
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800"
              >
                حسابي
              </Link>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="wikihis-red-secondary inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-bold transition"
              >
                تسجيل الدخول
              </Link>
            )}
          </div>

          {sectionLinks.map((link) => {
            const expanded = mobileExpandedSection === link.label;
            return (
              <div key={`mobile-${link.label}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setMobileExpandedSection(expanded ? null : link.label)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-right"
                >
                  <span className="text-sm font-black text-slate-900">{link.label}</span>
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 text-slate-500 transition ${expanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
                  </svg>
                </button>

                {expanded ? (
                  <div className="border-t border-slate-200 px-3 pb-3 pt-2">
                    <p className="mb-3 text-right text-xs leading-6 text-slate-600">{link.summary}</p>
                    <div className="space-y-2">
                      {link.groups.map((group) => (
                        <div key={`mobile-${link.label}-${group.title}`} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                          <div className="mb-2 text-right text-xs font-black text-slate-900">{group.title}</div>
                          <div className="space-y-1">
                            {group.items.map((item) => (
                              <Link
                                key={`mobile-${group.title}-${item}`}
                                href={buildCategoryHref(item, link.href)}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block rounded-lg px-2 py-2 text-right text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-red-700"
                              >
                                {item}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-red-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-800"
                    >
                      عرض القسم
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
          </div>
        </div>
      ) : null}

      {activeMegaLink ? (
        <div
          className="fixed z-[80] hidden md:block"
          style={{
            left: `${megaStyle.left}px`,
            top: `${megaStyle.top}px`,
            width: `${megaStyle.width}px`,
          }}
          onMouseLeave={scheduleMegaClose}
          onMouseEnter={() => openMega(activeMegaLink.label)}
        >
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_35px_90px_-35px_rgba(15,23,42,0.35)]">
            <div className="grid grid-cols-[1.4fr_0.6fr]">
              <div className="grid grid-flow-col auto-cols-[minmax(190px,1fr)] gap-4 p-5 text-right">
                {activeMegaLink.groups.map((group) => (
                  <div key={`${activeMegaLink.label}-${group.title}`} className="rounded-2xl border border-slate-200 bg-white p-4 text-right">
                    <div className="text-sm font-black text-slate-950">{group.title}</div>
                    <div className="mt-4 space-y-2">
                      {group.items.map((item) => (
                        <Link
                          key={`${group.title}-${item}`}
                          href={buildCategoryHref(item, activeMegaLink.href)}
                          className="flex items-start justify-between gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-red-700"
                        >
                          <span className="min-w-0 flex-1 whitespace-normal break-words leading-6">{item}</span>
                          <svg viewBox="0 0 24 24" className="mt-1 h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-r border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#fff_100%)] p-6 text-right">
                <div className="text-xs font-extrabold tracking-[0.18em] text-red-700">WIKIHIS</div>
                <h3 className="mt-3 text-2xl font-black text-slate-950">{activeMegaLink.label}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{activeMegaLink.summary}</p>
                <Link
                  href={activeMegaLink.href}
                  className="mt-5 inline-flex items-center rounded-full bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800"
                >
                  عرض القسم
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

function SectionLink({ link, active = false, compact = false, setTriggerRef, onOpen, onSelect }) {
  return (
    <div className="shrink-0">
      <Link
        ref={setTriggerRef}
        href={link.href}
        onClick={onSelect}
        onMouseEnter={!compact && link.groups ? onOpen : undefined}
        onFocus={!compact && link.groups ? onOpen : undefined}
        className={[
          'group inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-bold shadow-sm transition',
          active
            ? 'border-[var(--gold-700)] bg-[var(--gold-700)] text-white shadow-[0_12px_26px_-22px_rgba(122,86,11,0.9)]'
            : 'border-slate-200 bg-white/90 text-slate-700 hover:border-amber-200 hover:bg-amber-50 hover:text-[var(--gold-800)]',
          compact ? 'h-8 px-2.5 text-[12.5px]' : '',
        ].join(' ')}
      >
        <span
          className={[
            'inline-flex h-4 w-4 items-center justify-center leading-none transition',
            active ? 'text-white' : 'text-slate-500 group-hover:text-[var(--gold-700)]',
          ].join(' ')}
          aria-hidden="true"
        >
          <SectionIcon label={link.label} />
        </span>
        <span>{link.label}</span>
        {!compact && link.groups ? (
          <svg viewBox="0 0 24 24" className={active ? 'h-3 w-3 text-white/80' : 'h-3 w-3 text-slate-400 transition group-hover:text-[var(--gold-700)]'} fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          </svg>
        ) : null}
      </Link>
    </div>
  );
}
