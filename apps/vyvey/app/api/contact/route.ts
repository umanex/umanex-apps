import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { contactSchema } from '@/lib/contact-schema';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { site } from '@/lib/site';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const limit = rateLimit(`contact:${getClientIp(request)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Te veel aanvragen. Probeer het straks opnieuw.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Controleer de ingevulde velden.' }, { status: 400 });
  }

  const { website, naam, telefoon, dag, voormiddag, namiddag } = parsed.data;

  // Honeypot gevuld → doe alsof het lukte, verstuur niets.
  if (website && website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY ontbreekt — kan terugbel-aanvraag niet versturen.');
    return NextResponse.json({ error: 'Mailconfiguratie ontbreekt.' }, { status: 500 });
  }

  const from = process.env.CONTACT_FROM ?? 'Vyvey Website <onboarding@resend.dev>';
  const to = process.env.CONTACT_TO ?? site.email;

  const moment =
    [voormiddag ? 'voormiddag' : null, namiddag ? 'namiddag' : null].filter(Boolean).join(' / ') ||
    'geen voorkeur';
  const veiligeNaam = naam.replace(/[\r\n]+/g, ' ');

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Nieuwe terugbel-aanvraag van ${veiligeNaam}`,
    text: [
      'Nieuwe terugbel-aanvraag via vyveyinterieur.be:',
      '',
      `Naam: ${veiligeNaam}`,
      `Telefoon: ${telefoon}`,
      `Voorkeurdag: ${dag ?? 'geen voorkeur'}`,
      `Voorkeurmoment: ${moment}`,
    ].join('\n'),
  });

  if (error) {
    console.error('Resend-fout bij terugbel-aanvraag:', error);
    return NextResponse.json({ error: 'Verzenden mislukt.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
