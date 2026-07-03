import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "عن Wikihat",
  description: "تعرف على هوية Wikihat، منهجه التحريري، وطبيعة المحتوى العربي الذي يقدمه للقراء والمساهمين.",
  path: "/about",
  keywords: ["عن Wikihat", "عن ويكيهات", "Wiki Hat"],
});

const pillars = [
  {
    title: "محتوى عربي واضح",
    text: "يركز Wikihat على تقديم الأخبار والمقالات والشروحات بواجهة سهلة وسريعة تساعد القارئ على الوصول إلى الموضوع الذي يهمه.",
  },
  {
    title: "تنوع في التغطية",
    text: "يشمل الموقع التكنولوجيا، الصحة، الأسرة، المجتمع، الأخبار، الاقتصاد، الرياضة، الفنون، وموضوعات معرفية متعددة.",
  },
  {
    title: "مساحة للمساهمين",
    text: "يوفر Wikihat مسارًا للمساهمين لإرسال المقالات للمراجعة والنشر ضمن بيئة تحريرية منظمة.",
  },
  {
    title: "شفافية تحريرية",
    text: "تدعم صفحات السياسات والمساعدة والتصحيحات فهم طريقة عمل الموقع ومسؤولياته تجاه القارئ والكاتب.",
  },
];

const sections = [
  {
    eyebrow: "فكرة الموقع",
    title: "لماذا تم بناء Wikihat؟",
    text:
      "تم بناء Wikihat ليكون موقعًا عربيًا حديثًا يوازن بين سرعة الوصول إلى الخبر وإمكانية قراءة مواد أعمق وأكثر ترتيبًا، مع إبراز التصنيفات والمواد المميزة والمساهمين.",
  },
  {
    eyebrow: "ماذا نقدم",
    title: "منصة تحريرية وليست مجرد صفحة أخبار",
    text:
      "يعرض Wikihat محتوى متنوعًا يشمل الأخبار، المقالات، التحليلات، التصنيفات المتخصصة، وصفحات المساهمين، مع أدوات داخلية تساعد على تنظيم النشر والمراجعة.",
  },
  {
    eyebrow: "كيف نفكر",
    title: "الوضوح أهم من التضخم",
    text:
      "نفضل صفحات تشرح الأقسام والسياسات وآلية النشر والتصحيح بدل تكديس روابط عامة لا تخدم القارئ. لذلك يصبح التذييل والصفحات القانونية جزءًا مفيدًا من تجربة الموقع.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f7f5ef] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6 text-right">
              <p className="text-sm font-extrabold tracking-[0.4em] text-red-700">عن الموقع</p>
              <h1 className="text-5xl font-black leading-[1.4] text-slate-950 sm:text-6xl">
                Wikihat مساحة عربية للأخبار والمقالات والتحليلات المنظمة
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-600">
                يعرض Wikihat محتوى تحريريًا متنوعًا عبر بنية واضحة تساعد القارئ على متابعة الجديد،
                واكتشاف التصنيفات، والعودة إلى الكتّاب والمساهمين بسهولة.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-[#faf8f3] p-8">
              <p className="text-sm font-extrabold tracking-[0.25em] text-slate-500">مرتكزات أساسية</p>
              <div className="mt-6 space-y-4">
                {pillars.map((item) => (
                  <article key={item.title} className="rounded-[1.4rem] border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-black text-slate-950">{item.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.32)]">
              <p className="text-sm font-extrabold tracking-[0.22em] text-red-700">{section.eyebrow}</p>
              <h2 className="mt-4 text-3xl font-black text-slate-950">{section.title}</h2>
              <p className="mt-4 max-w-5xl text-base leading-8 text-slate-600">{section.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
