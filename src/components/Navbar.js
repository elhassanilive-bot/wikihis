'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

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

const sectionIcons = {
  'الصحة واللياقة': '✚',
  الأخبار: '◈',
  'البيت والأسرة': '⌂',
  'قضايا المرأة': '◐',
  المجتمع: '◆',
  'عالم الحيوانات': '♧',
  تكنولوجيا: '⌘',
  'تفسير الأحلام': '☾',
  منوعات: '✦',
};

function buildCategoryHref(value, fallbackHref) {
  const category = String(value || '').trim();
  if (!category) return fallbackHref;
  return `/?category=${encodeURIComponent(category)}`;
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
                  className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-800 transition hover:border-amber-200 hover:text-[var(--gold-700)]"
                >
                  المساهمون
                </Link>
                {authUser ? (
                  <Link
                    href="/account"
                    className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-800 transition hover:border-amber-200 hover:text-[var(--gold-700)]"
                  >
                    حسابي
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth"
                      className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-800 transition hover:border-amber-200 hover:text-[var(--gold-700)]"
                    >
                      تسجيل الدخول
                    </Link>
                    <Link
                      href="/auth?mode=signup"
                      className="inline-flex h-9 items-center rounded-full bg-[var(--gold-700)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--gold-800)]"
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
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800"
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
  const icon = sectionIcons[link.label] || '•';

  return (
    <div className="shrink-0">
      <Link
        ref={setTriggerRef}
        href={link.href}
        onClick={onSelect}
        onMouseEnter={!compact && link.groups ? onOpen : undefined}
        onFocus={!compact && link.groups ? onOpen : undefined}
        className={[
          'group inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm font-extrabold shadow-sm transition',
          active
            ? 'border-[var(--gold-700)] bg-[var(--gold-700)] text-white shadow-[0_12px_30px_-22px_rgba(122,86,11,0.9)]'
            : 'border-slate-200 bg-white/90 text-slate-800 hover:border-amber-200 hover:bg-amber-50 hover:text-[var(--gold-800)]',
          compact ? 'h-8 px-3 text-[13px]' : '',
        ].join(' ')}
      >
        <span
          className={[
            'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] leading-none',
            active ? 'bg-white/20 text-white' : 'bg-slate-100 text-[var(--gold-700)] group-hover:bg-white',
          ].join(' ')}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span>{link.label}</span>
        {!compact && link.groups ? (
          <svg viewBox="0 0 24 24" className={active ? 'h-3.5 w-3.5 text-white/80' : 'h-3.5 w-3.5 text-slate-400 transition group-hover:text-[var(--gold-700)]'} fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          </svg>
        ) : null}
      </Link>
    </div>
  );
}
