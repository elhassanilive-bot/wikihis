import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 90 * 1000;
const MAX_REQUESTS_PER_WINDOW = 4;
const rateLimitStore = new Map();

let transporter;

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function enforceRateLimit(request) {
  const ip = getClientIp(request);
  const now = Date.now();
  const entry = rateLimitStore.get(ip) || { count: 0, expires: 0 };

  if (entry.expires < now) {
    entry.count = 0;
    entry.expires = now + RATE_LIMIT_WINDOW_MS;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  entry.count += 1;
  rateLimitStore.set(ip, entry);
  return true;
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = port === 465;

  if (!host || !user || !pass) {
    throw new Error('Missing SMTP configuration. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS.');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
}

function buildMessage(payload) {
  return [
    `الاسم: ${payload.fullName}`,
    `البريد الإلكتروني: ${payload.email}`,
    `القسم المتأثر: ${payload.issueArea}`,
    `الرابط أو المسار: ${payload.pageUrl || 'غير مذكور'}`,
    `الجهاز أو النظام: ${payload.device || 'غير مذكور'}`,
    `المتصفح أو النسخة: ${payload.browser || 'غير مذكور'}`,
    '',
    'ما المتوقع:',
    payload.expectedResult || 'غير مذكور',
    '',
    'ما الذي حدث فعليًا:',
    payload.actualResult,
    '',
    'خطوات إعادة ظهور المشكلة:',
    payload.steps,
  ].join('\n');
}

export async function POST(request) {
  if (!enforceRateLimit(request)) {
    return NextResponse.json({ message: 'تم الوصول للحد الأقصى من البلاغات. حاول لاحقًا.' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'الطلب غير صالح.' }, { status: 400 });
  }

  const errors = {};
  if (!body.fullName?.trim()) errors.fullName = 'الاسم الكامل مطلوب.';
  if (!body.email?.trim()) errors.email = 'البريد الإلكتروني مطلوب.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.email = 'أدخل بريدًا إلكترونيًا صالحًا.';
  if (!body.issueArea?.trim()) errors.issueArea = 'القسم المتأثر مطلوب.';
  if (!body.actualResult?.trim()) errors.actualResult = 'اشرح ما الذي حدث فعليًا.';
  if (!body.steps?.trim()) errors.steps = 'اكتب خطوات إعادة ظهور المشكلة.';

  if (Object.keys(errors).length) {
    return NextResponse.json({ errors, message: 'يرجى استكمال الحقول المطلوبة.' }, { status: 400 });
  }

  const payload = {
    fullName: body.fullName.trim(),
    email: body.email.trim(),
    issueArea: body.issueArea.trim(),
    pageUrl: body.pageUrl?.trim() ?? '',
    device: body.device?.trim() ?? '',
    browser: body.browser?.trim() ?? '',
    expectedResult: body.expectedResult?.trim() ?? '',
    actualResult: body.actualResult.trim(),
    steps: body.steps.trim(),
  };

  try {
    const currentTransporter = getTransporter();
    await currentTransporter.sendMail({
      from: process.env.EMAIL_FROM ?? 'Wikihat <no-reply@wikihat.com>',
      to: process.env.CONTACT_RECIPIENT ?? 'support@wikihat.com',
      replyTo: payload.email,
      subject: `بلاغ تقني جديد - ${payload.issueArea}`,
      text: buildMessage(payload),
      attachments:
        body.attachmentName && body.attachmentData
          ? [{ filename: body.attachmentName, content: Buffer.from(body.attachmentData, 'base64') }]
          : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('report issue mail error', error);
    const message = error instanceof Error ? error.message : 'فشل إرسال البلاغ.';
    return NextResponse.json({ message: 'تعذر إرسال البلاغ. ' + message }, { status: 500 });
  }
}
