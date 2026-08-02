import sharp from "sharp";

export type CardRenderInput = {
  legalName: string;
  dateOfBirth: Date;
  freelanceIdCode: string;
  serialNumber: string;
  issueDate: Date;
};

export class CardRenderer {
  async render(input: CardRenderInput): Promise<Buffer> {
    const svg = cardSvg(input);

    return sharp(Buffer.from(svg))
      .png()
      .toBuffer();
  }
}

function cardSvg(input: CardRenderInput): string {
  return `
<svg width="1000" height="620" viewBox="0 0 1000 620" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="0.55" stop-color="#164e63"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="1000" height="620" rx="38" fill="url(#cardBg)"/>
  <rect x="42" y="42" width="916" height="536" rx="28" fill="none" stroke="#67e8f9" stroke-width="3" opacity="0.75"/>
  <text x="78" y="154" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">${escapeXml(input.legalName)}</text>
  ${field(78, 260, "DOB", formatDate(input.dateOfBirth))}
  ${field(78, 350, "Freelance ID", input.freelanceIdCode)}
  ${field(78, 440, "Serial", input.serialNumber)}
  ${field(78, 530, "Issue Date", formatDate(input.issueDate))}
  <rect x="734" y="86" width="156" height="156" rx="22" fill="#ecfeff" opacity="0.9"/>
  <path d="M773 178l30 30 70-86" fill="none" stroke="#0e7490" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function field(x: number, y: number, label: string, value: string): string {
  return `
  <text x="${x}" y="${y}" fill="#a5f3fc" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">${escapeXml(label)}</text>
  <text x="${x}" y="${y + 38}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="600">${escapeXml(value)}</text>`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
