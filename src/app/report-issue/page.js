import ReportIssueForm from './ReportIssueForm';
import { issueFaq } from './issueFaq';

export const metadata = {
  title: 'الإبلاغ عن شيء لا يعمل | Wikihat',
  description: 'أرسل بلاغًا تقنيًا احترافيًا عن زر أو صفحة أو ميزة لا تعمل داخل Wikihat مع خطوات إعادة المشكلة ومرفقات توضيحية.',
  alternates: { canonical: '/report-issue' },
};

export default function ReportIssuePage() {
  return (
    <div className="min-h-screen bg-[#f7f5f1] py-12 text-black">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4">
        <section className="rounded-[2rem] border border-black/10 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-black/45">الدعم الفني</p>
          <h1 className="mt-4 text-4xl font-black text-black sm:text-5xl">الإبلاغ عن شيء لا يعمل</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-black/65">
            إذا وجدت زرًا لا يستجيب، أو صفحة لا تعمل، أو مشكلة في النشر أو الفيديو أو الدردشة أو الإشعارات،
            فاستخدم هذا النموذج لتقديم بلاغ تقني واضح يساعد الفريق على تتبع الخلل بسرعة.
          </p>
        </section>

        <ReportIssueForm />

        <section className="rounded-[2rem] border border-black/10 bg-white p-8 shadow-sm sm:p-10">
          <div className="max-w-3xl text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-black/40">قبل الإرسال</p>
            <h2 className="mt-4 text-3xl font-black text-black">أسئلة شائعة حول الأعطال والمشاكل التقنية</h2>
          </div>

          <div className="mt-8 space-y-4">
            {issueFaq.map((item) => (
              <article key={item.question} className="rounded-[1.5rem] border border-black/10 bg-[#fcfbf9] p-5">
                <h3 className="text-lg font-bold text-black">{item.question}</h3>
                <p className="mt-3 text-sm leading-8 text-black/65">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
