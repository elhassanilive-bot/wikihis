import ContactForm from './ContactForm';

export const metadata = {
  title: 'اتصل بنا | ويكيهات',
  description: 'تواصل مباشرة مع فريق ويكيهات بخصوص التحرير أو الدعم أو الملاحظات العامة حول الموقع.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4">
        <section className="space-y-4 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-black/45">تواصل مع فريق الموقع</p>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">اتصل بنا</h1>
          <p className="max-w-3xl text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            هذه الصفحة مخصصة للتواصل مع فريق ويكيهات. يمكنك استخدامها لطلبات الدعم، الملاحظات التحريرية،
            اقتراحات التحسين، أو أي استفسار عام يحتاج متابعة مباشرة من الفريق.
          </p>
        </section>

        <ContactForm />
      </div>
    </div>
  );
}
