const RESEND_API_URL = "https://api.resend.com/emails";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    console.warn("Email no configurado (RESEND_API_KEY / MAIL_FROM). Se omite el envío.");
    return;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`Error al enviar email a ${to}: ${response.status} ${body}`);
    }
  } catch (error) {
    console.error(`Error al enviar email a ${to}:`, error);
  }
}
