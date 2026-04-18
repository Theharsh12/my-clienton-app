import type { TemplateKey } from "@/data/templates";

type Responses = Record<string, string>;

// ── Landing formatter ──────────────────────────────────────────────────────────
export const formatLandingBrief = (data: Responses): string => `
LANDING PAGE BRIEF
${"─".repeat(36)}

Product / Service:
→ ${data["What is your product/service?"] || "Not specified"}

Target Audience:
→ ${data["Who is your target audience?"] || "Not specified"}

Goal:
→ ${data["Main goal of this page?"] || "Not specified"}

Key Benefits / Features:
→ ${data["Key benefits or features?"] || "Not specified"}

Call To Action:
→ ${data["Call to action?"] || "Not specified"}
`.trim();

// ── Business formatter ─────────────────────────────────────────────────────────
export const formatBusinessBrief = (data: Responses): string => `
BUSINESS WEBSITE BRIEF
${"─".repeat(36)}

Business:
→ ${data["Business name"] || "Not specified"}

Services:
→ ${data["What services do you offer?"] || "Not specified"}

Target Customers:
→ ${data["Target customers"] || "Not specified"}

Location / Service Area:
→ ${data["Location / service area"] || "Not specified"}

Contact Details:
→ ${data["Contact details"] || "Not specified"}
`.trim();

// ── Lookup map ─────────────────────────────────────────────────────────────────
export const formatters: Record<TemplateKey, (data: Responses) => string> = {
  landing: formatLandingBrief,
  business: formatBusinessBrief,
};
