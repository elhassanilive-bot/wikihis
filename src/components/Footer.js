import Link from 'next/link';
import { site } from '@/config/site';

const exploreLinks = [
  { href: '/', label: 'الرئيسية' },
  { href: '/sections', label: 'أقسام الموقع' },
  { href: '/features', label: 'كيف يعمل ويكيهات' },
  { href: '/contributors', label: 'المساهمون' },
  { href: '/faq', label: 'مركز المساعدة' },
];

const newsroomLinks = [
  { href: '/about', label: 'عن ويكيهات' },
  { href: '/editorial-policy', label: 'السياسة التحريرية' },
  { href: '/corrections-policy', label: 'سياسة التصحيحات' },
  { href: '/contribute', label: 'النشر كمساهم' },
  { href: '/contact', label: 'اتصل بنا' },
];

const supportLinks = [
  { href: '/report-issue', label: 'الإبلاغ عن عطل' },
  { href: '/complaints', label: 'الشكاوى والبلاغات' },
  { href: '/deletion', label: 'طلب حذف الحساب' },
  { href: '/privacy', label: 'سياسة الخصوصية' },
  { href: '/terms', label: 'الشروط والأحكام' },
  { href: '/disclaimer', label: 'إخلاء المسؤولية' },
  { href: '/dmca', label: 'حقوق النشر وDMCA' },
];

function SocialIcon({ name }) {
  const shared = {
    viewBox: '0 0 24 24',
    className: 'h-5 w-5',
    fill: 'currentColor',
  };

  switch (name) {
    case 'x':
      return (
        <svg {...shared}>
          <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.2L6.5 22H2l7.4-8.6L1 2h6.3l4.4 5.6L18.9 2zm-1.1 18h1.7L6.4 3.9H4.6L17.8 20z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...shared}>
          <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.5A4.5 4.5 0 1 1 12 16a4.5 4.5 0 0 1 0-9zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17.8 6.2a1 1 0 1 1-1-1 1 1 0 0 1 1 1z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...shared}>
          <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5A3 3 0 0 0 2.4 7.2 31.6 31.6 0 0 0 2 12a31.6 31.6 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 22 12a31.6 31.6 0 0 0-.4-4.8zM10 15.5v-7l6 3.5-6 3.5z" />
        </svg>
      );
    default:
      return null;
  }
}

function LinkColumn({ title, links }) {
  return (
    <div className="text-right">
      <h4 className="mb-4 text-lg font-semibold text-slate-950">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link prefetch={false} href={link.href} className="text-sm text-slate-600 transition-colors hover:text-slate-950">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const socialEntries = [
    { name: 'x', href: site.socials.x },
    { name: 'instagram', href: site.socials.instagram },
    { name: 'youtube', href: site.socials.youtube },
  ].filter((item) => item.href);

  return (
    <footer className="border-t border-slate-200 bg-white py-12 text-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-[1.2fr_0.9fr_0.9fr_0.95fr] xl:items-start">
          <div className="space-y-4 text-right">
            <h3 className="text-2xl font-black text-red-700">{site.name}</h3>
            <p className="max-w-md leading-8 text-slate-600">
              {site.name} منصة محتوى عربية تجمع الأخبار والمقالات والتحليلات والتصنيفات المتخصصة في واجهة واضحة، مع مساحة للمساهمين وصفحات دعم وسياسات تحريرية شفافة.
            </p>
            <p className="text-sm text-slate-600">
              للتواصل:
              {' '}
              <a className="font-medium text-slate-950 hover:underline" href={`mailto:${site.supportEmail}`}>
                {site.supportEmail}
              </a>
            </p>

            {socialEntries.length > 0 ? (
              <div className="pt-2">
                <p className="mb-3 text-sm font-semibold text-slate-950">حساباتنا</p>
                <div className="flex items-center gap-4 text-slate-500">
                  {socialEntries.map((social) => (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-slate-950"
                      aria-label={social.name}
                    >
                      <SocialIcon name={social.name} />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <LinkColumn title="استكشف" links={exploreLinks} />
          <LinkColumn title="التحرير والموقع" links={newsroomLinks} />
          <LinkColumn title="الدعم والقانون" links={supportLinks} />
        </div>

        <div className="mt-10 border-t border-slate-200 pt-8">
          <p className="text-center text-sm text-slate-500">&copy; {currentYear} {site.name}. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
