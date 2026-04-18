export interface Question {
  label: string;
  placeholder: string;
}

export type TemplateKey = "landing" | "business";

export const templateMap: Record<TemplateKey, Question[]> = {
  landing: [
    {
      label: "What is your product/service?",
      placeholder: "Describe your product in one line",
    },
    {
      label: "Who is your target audience?",
      placeholder: "Who are you trying to reach?",
    },
    {
      label: "Main goal of this page?",
      placeholder: "Leads, sales, signups?",
    },
    {
      label: "Key benefits or features?",
      placeholder: "List 3–5 benefits",
    },
    {
      label: "Call to action?",
      placeholder: "What should users do?",
    },
  ],

  business: [
    {
      label: "Business name",
      placeholder: "Enter business name",
    },
    {
      label: "What services do you offer?",
      placeholder: "List your services",
    },
    {
      label: "Target customers",
      placeholder: "Who are your customers?",
    },
    {
      label: "Location / service area",
      placeholder: "City, country or region",
    },
    {
      label: "Contact details",
      placeholder: "Phone, email, etc.",
    },
  ],
};

export const templateMeta: Record<TemplateKey, { title: string; description: string }> = {
  landing: {
    title: "Landing Page Brief",
    description: "Generate a structured brief for a high-converting landing page.",
  },
  business: {
    title: "Business Website Brief",
    description: "Generate a structured brief for a professional business website.",
  },
};
