export const metadata = {
  title: 'كيف يعمل ويكيهات',
  description: 'شرح سريع لبنية ويكيهات، الواجهة الرئيسية، التصنيفات، صفحات المساهمين، وآلية النشر داخل الموقع.',
  alternates: { canonical: '/features' },
};

const groups = [
  {
    title: 'الصفحة الرئيسية',
    intro: 'واجهة المجلة الرقمية التي تجمع الخبر البارز والعناوين السريعة والمواد الأحدث داخل تسلسل بصري واضح.',
    items: [
      { title: 'خبر رئيسي بارز', description: 'إبراز مادة رئيسية في أعلى الصفحة مع عرض عناوين مساندة تساعد القارئ على مسح المشهد سريعاً.' },
      { title: 'شبكة أحدث المنشورات', description: 'عرض المقالات الحديثة ضمن بطاقات منتظمة مع التاريخ والزمن التقديري للقراءة.' },
      { title: 'تصنيفات جانبية', description: 'الوصول إلى الأقسام الرئيسية والفرعية مباشرة من الصفحة نفسها دون الحاجة إلى قوائم معقدة.' },
    ],
  },
  {
    title: 'التصنيفات والمحتوى المتخصص',
    intro: 'الموقع لا يكتفي بقسم واحد، بل يعرض محتوى متنوعاً يناسب اهتمامات مختلفة.',
    items: [
      { title: 'تقنية وذكاء اصطناعي', description: 'مواد تتابع الأدوات والمنصات والاتجاهات التقنية والشروحات العملية.' },
      { title: 'سياسة وعالم وشرق أوسط', description: 'تغطيات تتعامل مع الحدث الإقليمي والدولي ضمن مسارات سهلة الوصول.' },
      { title: 'رياضة ومنوعات وثقافة', description: 'أقسام أخف أو أكثر جماهيرية تحافظ على تنوع الموقع واستمرارية التصفح.' },
    ],
  },
  {
    title: 'المساهمون والنشر',
    intro: 'يعتمد ويكيهات على بنية تسمح باستقبال المقالات من المساهمين ثم مراجعتها قبل النشر.',
    items: [
      { title: 'صفحة المساهمين', description: 'تعرض الكتّاب والناشرين وتسمح بزيارة صفحة كل مساهم ومعرفة نشاطه المنشور.' },
      { title: 'إرسال المقال للمراجعة', description: 'يمكن للمساهم تجهيز العنوان والملخص والتصنيف والنص ثم إرسال المادة بانتظار الموافقة.' },
      { title: 'لوحة إدارة للنشر', description: 'يدعم المشروع مساراً داخلياً لإدارة المقالات ومراجعتها وتنظيم النشر التحريري.' },
    ],
  },
  {
    title: 'الدعم والسياسات',
    intro: 'جزء مهم من الموقع مخصص للمساعدة والتواصل ومعالجة الأعطال والسياسات المرتبطة بالنشر.',
    items: [
      { title: 'مركز المساعدة', description: 'إجابات منظمة حول الحسابات والدعم والتصفح والمشكلات الشائعة.' },
      { title: 'الإبلاغ والتواصل', description: 'نماذج مستقلة للتواصل العام، الإبلاغ عن الأعطال، ورفع الشكاوى أو الملاحظات.' },
      { title: 'صفحات تحريرية مخصصة', description: 'صفحات جديدة توضح أقسام الموقع والسياسة التحريرية والتصحيحات والنشر كمساهم.' },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#f7f5ef] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6 text-right">
              <p className="text-sm font-extrabold tracking-[0.4em] text-red-700">كيف يعمل الموقع</p>
              <h1 className="text-5xl font-black leading-[1.4] text-slate-950 sm:text-6xl">بنية تحريرية واضحة تساعد القارئ على الوصول السريع للمحتوى</h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-600">
                بني ويكيهات ليعمل كموقع محتوى عربي مرن: الصفحة الرئيسية تقودك إلى الأحدث والأبرز، والتصنيفات توسع التصفح، وصفحات المساهمين تضيف بعداً تحريرياً مستمراً.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-[#faf8f3] p-8">
              <p className="text-sm font-extrabold tracking-[0.22em] text-slate-500">ملخص سريع</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  'واجهة رئيسية بنمط مجلة رقمية',
                  'تصنيفات رئيسية وفرعية متعددة',
                  'صفحات مساهمين وإرسال مواد للمراجعة',
                  'دعم وسياسات مرتبطة فعلياً بطريقة العمل',
                ].map((item) => (
                  <article key={item} className="rounded-[1.4rem] border border-slate-200 bg-white p-5 text-right text-sm font-semibold leading-7 text-slate-700">
                    {item}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {groups.map((group) => (
            <article key={group.title} className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.32)]">
              <div className="text-right">
                <h2 className="text-3xl font-black text-slate-950">{group.title}</h2>
                <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600">{group.intro}</p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {group.items.map((item) => (
                  <div key={item.title} className="rounded-[1.4rem] border border-slate-200 bg-[#faf8f3] p-5 text-right">
                    <h3 className="text-xl font-black text-slate-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
