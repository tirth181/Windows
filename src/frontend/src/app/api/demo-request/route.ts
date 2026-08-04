import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { demoRequestSchema } from "@/lib/demo-request-schema";

export const runtime = "nodejs";

const TO_EMAIL =
  process.env.DEMO_REQUEST_TO || "tirthsoni1810@gmail.com";

type Payload = {
  name: string;
  company: string;
  position: string;
  useCase: string;
};

type SendResult = { ok: true; provider: string } | { ok: false; error: string };

function buildText(payload: Payload): string {
  return [
    "New LogiForge access / demo request",
    "",
    `Name: ${payload.name}`,
    `Company: ${payload.company}`,
    `Position: ${payload.position}`,
    "",
    "Use case:",
    payload.useCase,
    "",
    `Received: ${new Date().toISOString()}`,
  ].join("\n");
}

function buildHtml(payload: Payload): string {
  return `
    <h2>New LogiForge demo request</h2>
    <table style="border-collapse:collapse;font-family:sans-serif">
      <tr><td style="padding:6px 12px 6px 0"><strong>Name</strong></td><td>${escapeHtml(payload.name)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0"><strong>Company</strong></td><td>${escapeHtml(payload.company)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0"><strong>Position</strong></td><td>${escapeHtml(payload.position)}</td></tr>
    </table>
    <p style="margin-top:16px"><strong>Use case</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(payload.useCase)}</p>
    <p style="color:#64748b;font-size:12px">Received ${new Date().toISOString()}</p>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendWithResend(payload: Payload): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Resend not configured" };

  const from =
    process.env.DEMO_REQUEST_FROM || "LogiForge <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [TO_EMAIL],
      subject: `LogiForge demo request — ${payload.company}`,
      text: buildText(payload),
      html: buildHtml(payload),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return { ok: false, error: detail || "Resend failed" };
  }
  return { ok: true, provider: "resend" };
}

async function sendWithSmtp(payload: Payload): Promise<SendResult> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return { ok: false, error: "SMTP not configured" };
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.DEMO_REQUEST_FROM || `LogiForge <${user}>`,
    to: TO_EMAIL,
    subject: `LogiForge demo request — ${payload.company}`,
    text: buildText(payload),
    html: buildHtml(payload),
    replyTo: user,
  });

  return { ok: true, provider: "smtp" };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = demoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid form" },
      { status: 400 },
    );
  }

  // Honeypot tripped — pretend success to bots
  if (parsed.data.website) {
    return NextResponse.json({ ok: true, provider: "honeypot" });
  }

  const payload: Payload = {
    name: parsed.data.name,
    company: parsed.data.company,
    position: parsed.data.position,
    useCase: parsed.data.useCase,
  };

  const resend = await sendWithResend(payload);
  if (resend.ok) {
    return NextResponse.json({ ok: true, provider: resend.provider });
  }

  const smtp = await sendWithSmtp(payload);
  if (smtp.ok) {
    return NextResponse.json({ ok: true, provider: smtp.provider });
  }

  console.warn("Demo request server delivery unavailable; client fallback needed", {
    resend: resend.error,
    smtp: smtp.error,
    to: TO_EMAIL,
  });

  // Tell the browser to deliver via FormSubmit (visitor IP usually works).
  return NextResponse.json({
    ok: false,
    fallback: "formsubmit",
    to: TO_EMAIL,
    error: "Server email provider not configured",
  }, { status: 503 });
}
