// POST /api/inquiry — receives the intake form, emails it to NOTIFY_TO via Resend.
// Requires:
// Requires three environment variables on the Pages project (Settings ->
// Environment variables, Production):
//   RESEND_API_KEY  — secret (already set)
//   MAIL_FROM       — forms@workanetics.com  (plain text)
//   NOTIFY_TO       — hello@workanetics.com  (plain text)

// Single-line fields: strip CR/LF and cap length.
const clean = (s, max) => String(s ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // Honeypot: bots fill every field. Real visitors never see this one.
  // Report success so the bot moves on.
  if (data.website) return json({ ok: true });

  const name = clean(data.name, 120);
  const email = clean(data.email, 200);
  const company = clean(data.company, 200);
  const current = clean(data.current, 200);
  const target = clean(data.target, 200);
  const timeline = clean(data.timeline, 300);
  const pain = String(data.pain ?? "").trim().slice(0, 5000);

  if (!name || !pain || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "invalid_fields" }, 400);
  }

  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company || "—"}`,
    `Current platform: ${current || "—"}`,
    `Target platform: ${target || "—"}`,
    `Timeline / trigger: ${timeline || "—"}`,
    ``,
    `Situation & pain points:`,
    pain,
    ``,
    `—`,
    `Sent from the workanetics.com intake form.`,
  ].join("\n");

  let res;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Workanetics Intake <${env.MAIL_FROM}>`,
        to: [env.NOTIFY_TO],
        reply_to: [email], // replies go straight to the submitter
        subject: `Migration inquiry — ${company || name}`,
        text: body,
      }),
    });
  } catch (err) {
    console.error("resend fetch failed:", err && err.message);
    return json({ ok: false, error: "send_failed" }, 502);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("resend error:", res.status, detail);
    return json({ ok: false, error: "send_failed" }, 502);
  }

  return json({ ok: true });
}
