'use client';

import { useMemo, useState } from 'react';

const faqSections = [
  {
    id: 'account',
    title: 'الحساب والدخول',
    items: [
      { q: 'كيف أنشئ حساباً في ويكيهات؟', a: 'يمكنك إنشاء حساب من صفحة التسجيل ثم استخدامه للدخول إلى صفحة الحساب والمساهمة وإدارة الطلبات المرتبطة بك.', k: ['حساب', 'تسجيل', 'دخول'] },
      { q: 'هل أحتاج حساباً لتصفح الموقع؟', a: 'معظم المحتوى التحريري يمكن قراءته من دون حساب، لكن بعض المسارات مثل إرسال المقالات أو إدارة الحساب تحتاج إلى تسجيل الدخول.', k: ['تصفح', 'بدون حساب', 'قراءة'] },
      { q: 'ماذا أفعل إذا نسيت كلمة المرور؟', a: 'استخدم مسار استعادة كلمة المرور من صفحة الدخول، ثم اتبع التعليمات التي تصلك على البريد الإلكتروني المرتبط بالحساب.', k: ['نسيت', 'كلمة المرور', 'استعادة'] },
      { q: 'كيف أغير بياناتي الأساسية؟', a: 'يمكنك تعديل البيانات التي يتيحها الموقع من صفحة الحساب، وإذا كانت هناك بيانات تحتاج تدخلاً يدوياً فيمكنك التواصل معنا عبر صفحة اتصل بنا.', k: ['تعديل', 'البيانات', 'الملف الشخصي'] },
      { q: 'كيف أطلب حذف حسابي؟', a: 'استخدم صفحة طلب حذف الحساب الموجودة في التذييل وأرسل الطلب بالمعلومات المطلوبة حتى تتم مراجعته بصورة صحيحة.', k: ['حذف الحساب', 'إغلاق', 'طلب حذف'] },
    ],
  },
  {
    id: 'content',
    title: 'القراءة والتصفح',
    items: [
      { q: 'كيف أصل إلى تصنيف معين؟', a: 'يمكنك استخدام شريط التنقل العلوي أو روابط الأقسام في الصفحة الرئيسية أو صفحة أقسام الموقع الجديدة للوصول إلى أي تصنيف رئيسي أو فرعي.', k: ['تصنيف', 'أقسام', 'وصول'] },
      { q: 'ما الفرق بين الخبر والتحليل؟', a: 'الخبر يركز على المستجدات السريعة، بينما التحليل يوسع السياق ويشرح الخلفية والنتائج والقراءة الأعمق للحدث.', k: ['خبر', 'تحليل', 'فرق'] },
      { q: 'لماذا تغير ترتيب المقالات في الصفحة الرئيسية؟', a: 'قد يتغير الترتيب بحسب حداثة النشر أو إبراز مواد معينة أو تحديثات تحريرية أو تغييرات في التصنيف والعرض.', k: ['ترتيب', 'الصفحة الرئيسية', 'المقالات'] },
      { q: 'هل المقالات تبقى ثابتة بعد النشر؟', a: 'ليس دائماً. بعض المقالات تخضع للتحديث أو التصحيح أو تغيير العنوان والملخص إذا ظهرت معطيات جديدة أو لزم تحسينها تحريرياً.', k: ['تحديث', 'تصحيح', 'بعد النشر'] },
      { q: 'كيف أعرف أن المقال تم تحديثه؟', a: 'عادة يظهر تاريخ النشر أو التحديث داخل الصفحة، وقد ينعكس التحديث أيضاً على النص أو العنوان أو الملخص بحسب طبيعة المادة.', k: ['تحديث المقال', 'تاريخ', 'تعديل'] },
    ],
  },
  {
    id: 'contributors',
    title: 'المساهمون والنشر',
    items: [
      { q: 'كيف أرسل مقالاً إلى ويكيهات؟', a: 'إذا كان لديك حساب مساهم، يمكنك فتح صفحة المساهمين وتجهيز العنوان والملخص والتصنيف والنص ثم إرسال المادة للمراجعة.', k: ['إرسال مقال', 'مساهم', 'نشر'] },
      { q: 'هل يتم نشر المقال مباشرة؟', a: 'لا، تمر المواد المرسلة بمراجعة تحريرية أولاً، وقد تُقبل أو يطلب تعديلها أو تُرفض إذا لم تناسب معايير الموقع.', k: ['مراجعة', 'قبول', 'رفض'] },
      { q: 'ما أهم الأشياء التي ترفع فرصة قبول المقال؟', a: 'عنوان واضح، ملخص مختصر، تصنيف صحيح، لغة سليمة، فقرات منظمة، ومحتوى أصلي يضيف قيمة فعلية للقارئ.', k: ['قبول المقال', 'عنوان', 'ملخص'] },
      { q: 'هل يحق لي تعديل المقال بعد إرساله؟', a: 'ذلك يعتمد على حالة المقال ومسار المراجعة، لكن في الغالب يمكن طلب تعديل أو إعادة إرسال نسخة محدثة إذا كان ذلك مسموحاً في الصفحة الخاصة بالمساهمين.', k: ['تعديل المقال', 'إعادة إرسال', 'المراجعة'] },
      { q: 'هل أحتفظ بحقوق مقالتي بعد النشر؟', a: 'تبقى حقوقك الأصلية على المادة ما لم يوجد اتفاق خاص، لكنك تمنح ويكيهات حق عرضها وتنسيقها وتحريرها تحريراً معقولاً داخل المنصة.', k: ['الحقوق', 'المقالة', 'الملكية الفكرية'] },
      { q: 'هل يستطيع أي شخص أن يصبح مساهماً؟', a: 'يعتمد ذلك على سياسة الموقع الحالية وآلية التسجيل والمراجعة، وقد تتطلب بعض الحالات حساباً مفعلًا أو قبولاً داخلياً قبل إتاحة النشر.', k: ['مساهماً', 'كاتب', 'انضمام'] },
    ],
  },
  {
    id: 'editorial',
    title: 'السياسة التحريرية',
    items: [
      { q: 'هل كل ما ينشر في ويكيهات يمثل موقف الموقع؟', a: 'ليس بالضرورة. بعض المواد خبرية، وبعضها تحليلي أو رأي أو مساهمات خارجية، لذلك يجب قراءة نوع المادة وسياقها قبل نسبة الموقف للموقع ككل.', k: ['موقف الموقع', 'رأي', 'تحرير'] },
      { q: 'كيف يتعامل الموقع مع الأخطاء التحريرية؟', a: 'إذا ظهر خطأ مؤثر في المعنى أو الوقائع، يعمل الفريق على تصحيحه أو تحديثه وفق سياسة التصحيحات والتحديث المعتمدة.', k: ['خطأ', 'تصحيح', 'سياسة التصحيحات'] },
      { q: 'هل يتم تعديل العنوان أو الملخص بعد النشر؟', a: 'نعم، قد يحدث ذلك إذا احتاجت المادة إلى تحسين الدقة أو الوضوح أو إذا لم يعد العنوان القديم يعكس محتوى المادة بعد التحديث.', k: ['العنوان', 'الملخص', 'تعديل'] },
      { q: 'كيف أبلغ عن خطأ في مقال؟', a: 'يمكنك التواصل معنا من صفحة اتصل بنا أو صفحة الشكاوى والبلاغات مع إرفاق رابط المقال والنقطة التي ترى أنها تحتاج مراجعة.', k: ['الإبلاغ عن خطأ', 'مقال', 'مراجعة'] },
      { q: 'هل ينشر ويكيهات آراء ومساهمات خارجية؟', a: 'نعم، لكن نشرها يتم ضمن مراجعة تحريرية، ولا يعني ذلك تبني كل ما يرد فيها كموقف رسمي نهائي للموقع.', k: ['آراء', 'مساهمات', 'خارجية'] },
    ],
  },
  {
    id: 'legal',
    title: 'الخصوصية والقانون',
    items: [
      { q: 'أين أجد سياسة الخصوصية؟', a: 'يمكنك الوصول إلى سياسة الخصوصية من التذييل، وهي صفحة موسعة تشرح جمع البيانات واستخدامها والاحتفاظ بها وحقوقك المرتبطة بها.', k: ['الخصوصية', 'البيانات', 'سياسة'] },
      { q: 'أين أجد الشروط والأحكام؟', a: 'الشروط والأحكام متاحة في التذييل وتوضح قواعد الاستخدام والنشر والحسابات والمساهمات وحدود المسؤولية.', k: ['الشروط', 'الأحكام', 'الاستخدام'] },
      { q: 'ما المقصود بصفحة إخلاء المسؤولية؟', a: 'هي الصفحة التي توضح أن محتوى ويكيهات مخصص للإطلاع العام ولا يغني عن الاستشارة المهنية أو القانونية أو الطبية أو المالية المتخصصة.', k: ['إخلاء المسؤولية', 'استشارة', 'اعتماد'] },
      { q: 'كيف أبلغ عن انتهاك حقوق نشر؟', a: 'استخدم صفحة حقوق النشر وDMCA أو تواصل معنا عبر المسار المخصص مع توضيح المادة الأصلية والمادة محل الاعتراض والبيانات اللازمة للمراجعة.', k: ['DMCA', 'حقوق النشر', 'بلاغ'] },
      { q: 'هل يبيع الموقع بيانات المستخدمين؟', a: 'لا. ويكيهات لا يبيع البيانات الشخصية للمستخدمين، ويقصر أي مشاركة على ما يلزم للتشغيل أو الحماية أو الالتزام القانوني.', k: ['بيع البيانات', 'البيانات الشخصية', 'مشاركة'] },
      { q: 'هل يمكنني طلب تعديل أو حذف بياناتي؟', a: 'نعم، بحسب نوع البيانات والمسار المستخدم يمكنك طلب التعديل أو الحذف أو المراجعة من خلال التواصل معنا أو عبر صفحات الطلبات المخصصة.', k: ['حذف البيانات', 'تعديل البيانات', 'طلب'] },
    ],
  },
  {
    id: 'support',
    title: 'الأعطال والدعم',
    items: [
      { q: 'ماذا أفعل إذا كانت صفحة أو زر لا يعمل؟', a: 'استخدم صفحة الإبلاغ عن عطل، واذكر اسم الصفحة والخطوات التي قمت بها وما الذي كنت تتوقع حدوثه.', k: ['عطل', 'زر', 'صفحة لا تعمل'] },
      { q: 'ما أفضل طريقة لشرح المشكلة للفريق؟', a: 'اكتب وصفاً واضحاً للمشكلة، وأرفق الرابط ولقطة شاشة واذكر الجهاز أو المتصفح إن أمكن، لأن ذلك يسرع فهم الحالة.', k: ['شرح المشكلة', 'لقطة شاشة', 'الدعم'] },
      { q: 'هل أستطيع إرسال اقتراحات لتحسين الموقع؟', a: 'نعم، يمكن إرسال اقتراحات التحسين عبر صفحة اتصل بنا أو من خلال أي مسار تواصل رسمي داخل الموقع.', k: ['اقتراح', 'تحسين', 'ملاحظات'] },
      { q: 'كيف أتابع طلباً أو شكوى قدمتها سابقاً؟', a: 'إذا كانت هناك وسيلة رد مرتبطة بطلبك مثل البريد الإلكتروني أو نموذج التواصل، فتابع من خلالها، وقد نطلب منك بيانات إضافية لإكمال المراجعة.', k: ['متابعة الطلب', 'شكوى', 'الرد'] },
      { q: 'هل هناك فرق بين صفحة الشكاوى وصفحة الأعطال؟', a: 'نعم. صفحة الأعطال مخصصة للمشكلات التقنية والوظيفية، بينما صفحة الشكاوى والبلاغات أوسع وتشمل المخالفات والملاحظات والتصحيحات والاعتراضات.', k: ['الفرق', 'الشكاوى', 'الأعطال'] },
    ],
  },
];

function normalize(text) {
  return String(text || '').toLowerCase().trim();
}

function scoreItem(item, query) {
  const q = normalize(query);
  if (!q) return 0;
  const haystacks = [item.q, item.a, ...(item.k || [])].map(normalize);
  let score = 0;
  haystacks.forEach((value, index) => {
    if (value.includes(q)) {
      score += index === 0 ? 5 : index === 1 ? 3 : 2;
    }
  });
  return score;
}

export default function HelpCenterPageView() {
  const [search, setSearch] = useState('');
  const [activeTopic, setActiveTopic] = useState('all');
  const [openKey, setOpenKey] = useState(null);

  const topics = useMemo(() => [{ id: 'all', title: 'الكل' }, ...faqSections.map((section) => ({ id: section.id, title: section.title }))], []);

  const results = useMemo(() => {
    const collected = [];

    faqSections.forEach((section) => {
      if (activeTopic !== 'all' && section.id !== activeTopic) return;

      section.items.forEach((item) => {
        const score = search ? scoreItem(item, search) : 1;
        if (search && score === 0) return;
        collected.push({ ...item, sectionId: section.id, sectionTitle: section.title, score });
      });
    });

    return collected.sort((a, b) => b.score - a.score || a.q.localeCompare(b.q, 'ar'));
  }, [activeTopic, search]);

  const grouped = useMemo(() => {
    const map = new Map();
    results.forEach((item) => {
      if (!map.has(item.sectionTitle)) map.set(item.sectionTitle, []);
      map.get(item.sectionTitle).push(item);
    });
    return Array.from(map.entries());
  }, [results]);

  const suggestions = useMemo(
    () => ['إنشاء حساب', 'إرسال مقال', 'تعديل مقال', 'سياسة الخصوصية', 'DMCA', 'إبلاغ عن عطل', 'التصحيحات', 'المساهمون'],
    []
  );

  return (
    <div className="min-h-screen bg-[#f7f5ef] py-12 text-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="text-center">
            <p className="text-xs font-extrabold tracking-[0.42em] text-red-700">HELP CENTER</p>
            <h1 className="mt-4 text-4xl font-black sm:text-5xl">الأسئلة الشائعة</h1>
            <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              صفحة شاملة لأسئلة ويكيهات: الحساب، التصفح، المساهمون، السياسة التحريرية، الخصوصية، حقوق النشر، والأعطال التقنية.
            </p>
          </div>

          <div className="mt-8">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث في جميع أسئلة الموقع وإجاباته..."
              className="w-full rounded-[1.5rem] border border-slate-200 bg-[#faf8f3] px-5 py-4 text-right text-base outline-none transition focus:border-red-300 focus:bg-white"
            />
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {suggestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSearch(item)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setActiveTopic(topic.id)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  activeTopic === topic.id
                    ? 'bg-red-700 text-white'
                    : 'border border-slate-200 bg-[#faf8f3] text-slate-700 hover:border-red-200 hover:text-red-700'
                }`}
              >
                {topic.title}
              </button>
            ))}
          </div>

          <div className="mt-6 text-center text-sm font-semibold text-slate-500">
            {results.length} نتيجة
            {search ? ` للبحث عن "${search}"` : ' في جميع الأسئلة'}
          </div>
        </section>

        {grouped.length ? (
          <section className="space-y-6">
            {grouped.map(([sectionTitle, items]) => (
              <article key={sectionTitle} className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.32)]">
                <h2 className="text-right text-2xl font-black text-slate-950">{sectionTitle}</h2>
                <div className="mt-5 space-y-3">
                  {items.map((item) => {
                    const key = `${item.sectionId}-${item.q}`;
                    const isOpen = openKey === key;
                    return (
                      <div key={key} className="rounded-[1.25rem] border border-slate-200 bg-[#faf8f3]">
                        <button
                          type="button"
                          onClick={() => setOpenKey(isOpen ? null : key)}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right"
                        >
                          <span className="text-base font-bold text-slate-950">{item.q}</span>
                          <span className="text-red-700">{isOpen ? '−' : '+'}</span>
                        </button>
                        {isOpen ? <p className="border-t border-slate-200 px-5 py-4 text-right text-sm leading-7 text-slate-600">{item.a}</p> : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-10 text-center shadow-[0_24px_60px_-45px_rgba(15,23,42,0.32)]">
            <h2 className="text-2xl font-black text-slate-950">لا توجد نتائج مطابقة</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              جرّب استخدام كلمة أدق، أو غيّر الموضوع المحدد، أو استخدم إحدى اقتراحات البحث السريع في الأعلى.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
