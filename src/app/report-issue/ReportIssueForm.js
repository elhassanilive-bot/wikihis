'use client';

import { useState } from 'react';

const MAX_ATTACHMENT_SIZE = 6 * 1024 * 1024;
const initialForm = {
  fullName: '',
  email: '',
  issueArea: '',
  pageUrl: '',
  device: '',
  browser: '',
  expectedResult: '',
  actualResult: '',
  steps: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const issueAreas = [
  'التسجيل وتسجيل الدخول',
  'الصفحة الرئيسية',
  'المنشورات والقصص',
  'الفيديوهات',
  'الدردشة والرسائل',
  'الإشعارات',
  'المجتمعات أو المساحات',
  'السوق أو العقارات أو الوظائف',
  'الملف الشخصي والإعدادات',
  'مشكلة عامة أخرى',
];

function Icon({ name, className = 'h-5 w-5' }) {
  const shared = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    className,
  };

  switch (name) {
    case 'bug':
      return (
        <svg {...shared}>
          <rect x="7" y="6" width="10" height="12" rx="3" />
          <path d="M9 6V4M15 6V4M9 18v2M15 18v2M3 12h18" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...shared}>
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M4 9l8 6 8-6" />
        </svg>
      );
    case 'monitor':
      return (
        <svg {...shared}>
          <rect x="4" y="5" width="16" height="11" rx="2" />
          <path d="M8 20h8" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ReportIssueForm() {
  const [form, setForm] = useState(initialForm);
  const [attachment, setAttachment] = useState(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleAttachment = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAttachment(null);
      setAttachmentError('');
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setAttachment(null);
      setAttachmentError('تجاوز الملف الحد الأقصى المسموح به وهو 6 ميغابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setAttachment({
          name: file.name,
          data: result.split(',')[1] ?? '',
        });
        setAttachmentError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'الاسم الكامل مطلوب.';
    if (!form.email.trim()) nextErrors.email = 'البريد الإلكتروني مطلوب.';
    else if (!emailPattern.test(form.email)) nextErrors.email = 'أدخل بريدًا إلكترونيًا صالحًا.';
    if (!form.issueArea.trim()) nextErrors.issueArea = 'حدد القسم المتأثر.';
    if (!form.actualResult.trim()) nextErrors.actualResult = 'اشرح ما الذي حدث فعليًا.';
    if (!form.steps.trim()) nextErrors.steps = 'اكتب خطوات إعادة ظهور المشكلة.';
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setStatus({ type: 'error', message: 'يرجى استكمال المعلومات الأساسية قبل الإرسال.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: 'pending', message: 'يتم إرسال بلاغ المشكلة...' });

    try {
      const response = await fetch('/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          attachmentName: attachment?.name,
          attachmentData: attachment?.data,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        if (payload.errors) {
          setErrors(payload.errors);
        }
        setStatus({ type: 'error', message: payload.message || 'تعذر إرسال البلاغ.' });
        return;
      }

      setStatus({ type: 'success', message: 'تم إرسال البلاغ الفني بنجاح وسيتم مراجعته.' });
      setForm(initialForm);
      setAttachment(null);
    } catch (error) {
      setStatus({ type: 'error', message: 'حدث خطأ أثناء إرسال البلاغ. حاول مرة أخرى لاحقًا.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[1.15fr,0.85fr]">
      <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] border border-black/10 bg-white p-8 shadow-sm" noValidate>
        {status.message ? (
          <div
            role="status"
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              status.type === 'success'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : status.type === 'error'
                ? 'border-red-400 bg-red-50 text-red-700'
                : 'border-black/10 bg-[#faf8f6] text-black/70'
            }`}
          >
            {status.message}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="الاسم الكامل *" error={errors.fullName}>
            <input type="text" value={form.fullName} onChange={handleChange('fullName')} placeholder="اسمك الكامل" className={inputClass(errors.fullName)} />
          </Field>
          <Field label="البريد الإلكتروني *" error={errors.email}>
            <input type="email" value={form.email} onChange={handleChange('email')} placeholder="example@domain.com" className={inputClass(errors.email)} />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="القسم أو الصفحة المتأثرة *" error={errors.issueArea}>
            <select value={form.issueArea} onChange={handleChange('issueArea')} className={inputClass(errors.issueArea)}>
              <option value="">اختر القسم</option>
              {issueAreas.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="رابط الصفحة أو المسار">
            <input type="text" value={form.pageUrl} onChange={handleChange('pageUrl')} placeholder="https://wikihat.com/..." className={inputClass()} />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="نوع الجهاز أو النظام">
            <input type="text" value={form.device} onChange={handleChange('device')} placeholder="Android / iPhone / Windows..." className={inputClass()} />
          </Field>
          <Field label="المتصفح أو نسخة التطبيق">
            <input type="text" value={form.browser} onChange={handleChange('browser')} placeholder="Chrome / Safari / App Version" className={inputClass()} />
          </Field>
        </div>

        <Field label="ما الذي كنت تتوقع حدوثه؟">
          <textarea rows={4} value={form.expectedResult} onChange={handleChange('expectedResult')} placeholder="مثال: كنت أتوقع فتح الصفحة أو حفظ التعديل بنجاح." className={inputClass()} />
        </Field>

        <Field label="ما الذي حدث فعليًا؟ *" error={errors.actualResult}>
          <textarea rows={4} value={form.actualResult} onChange={handleChange('actualResult')} placeholder="مثال: ظهر خطأ، أو بقي الزر معلقًا، أو لم يحدث شيء." className={inputClass(errors.actualResult)} />
        </Field>

        <Field label="خطوات إعادة ظهور المشكلة *" error={errors.steps}>
          <textarea rows={5} value={form.steps} onChange={handleChange('steps')} placeholder="اكتب الخطوات بالتسلسل حتى نتمكن من إعادة تتبع المشكلة." className={inputClass(errors.steps)} />
        </Field>

        <Field label="إرفاق لقطة شاشة أو ملف مساعد">
          <input
            type="file"
            accept="image/*,video/*,.pdf,.txt"
            onChange={handleAttachment}
            className="text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-black/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
          />
          {attachment?.name ? <p className="mt-2 text-xs text-black/55">المرفق: {attachment.name}</p> : null}
          {attachmentError ? <p className="mt-2 text-xs text-red-500">{attachmentError}</p> : null}
        </Field>

        <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/90 disabled:opacity-60">
          {isSubmitting ? 'جاري الإرسال...' : 'إرسال بلاغ المشكلة'}
        </button>
      </form>

      <aside className="space-y-6 rounded-[2rem] border border-black/10 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-[#faf8f6] text-black">
            <Icon name="bug" className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-black/35">بلاغ تقني</p>
            <h2 className="text-2xl font-bold text-black">ساعدنا على فهم المشكلة بسرعة</h2>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-7 text-black/65">
          <p>كلما كان البلاغ أوضح، كانت المراجعة أسرع. اكتب خطوات المشكلة كما حدثت عندك، واذكر الصفحة أو القسم ونوع الجهاز أو المتصفح.</p>
          <p>إذا كانت المشكلة متعلقة بزر لا يعمل، صفحة لا تفتح، خطأ أثناء النشر، تعليق في الدردشة، أو سلوك غير متوقع داخل أي قسم، فهذه الصفحة هي المسار الصحيح.</p>
        </div>

        <div className="space-y-3">
          <InfoCard icon="mail" title="البريد الداعم" value="support@wikihat.com" href="mailto:support@wikihat.com" />
          <InfoCard icon="monitor" title="نوع البلاغات" value="أزرار لا تعمل، صفحات متوقفة، أخطاء النشر، مشاكل الوسائط" />
        </div>
      </aside>
    </section>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="space-y-2 text-sm text-black/70">
      <span>{label}</span>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </label>
  );
}

function InfoCard({ icon, title, value, href }) {
  const content = (
    <>
      <Icon name={icon} className="h-5 w-5 text-black" />
      <div>
        <p className="text-sm font-semibold text-black">{title}</p>
        <p className="text-sm text-black/65">{value}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[#faf8f6] px-4 py-3 transition hover:border-black/20">
        {content}
      </a>
    );
  }

  return <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[#faf8f6] px-4 py-3">{content}</div>;
}

function inputClass(hasError) {
  return `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(0,0,0,0.08)] ${hasError ? 'border-red-400' : 'border-black/10'} bg-white`;
}
