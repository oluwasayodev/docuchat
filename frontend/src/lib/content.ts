export type NavItem = { label: string; href: string };

export type LinkItem = { label: string; href: string };

export type Stat = { value: string; label: string };

export type WorkItem = {
  index: string;
  title: string;
  subtitle: string;
  role: string;
  year: string;
  stack: string[];
  bullets: string[];
  href?: string;
  linkLabel?: string;
};

export type StackGroup = { group: string; items: string[] };

export const profile = {
  name: "Oluwasayo Akinkunmi",
  initials: "OA",
  role: "Backend & AI Engineer",
  headline: "I build backend systems that make documents answerable.",
  intro:
    "I design the unglamorous parts well — ingest pipelines, retrieval, queues, and the observability that makes them trustworthy.",
  location: "City, Country",
  email: "oluwasayoakinkunmi@gmail.com",
  resumeHref: "#",
  links: [
    { label: "GitHub", href: "#" },
    { label: "LinkedIn", href: "#" },
    { label: "X", href: "#" },
  ] satisfies LinkItem[],
};

export const nav: NavItem[] = [
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Stack", href: "#stack" },
  { label: "Contact", href: "#contact" },
];

export const stats: Stat[] = [
  { value: "3+", label: "Years building" },
  { value: "12", label: "Systems shipped" },
  { value: "100%", label: "Documented with evidence" },
];

export const about = {
  paragraphs: [
    "Placeholder opening line — a short, direct statement of what you do and for whom.",
    "Placeholder second paragraph — how you work, what you care about, and the kind of problems you enjoy.",
  ],
};

export const work: WorkItem[] = [
  {
    index: "01",
    title: "DocuChat",
    subtitle: "Retrieval-augmented chat over your own documents",
    role: "Sole engineer — architecture, backend, infra",
    year: "2026",
    stack: [
      "Node.js",
      "TypeScript",
      "Express",
      "PostgreSQL",
      "Elasticsearch",
      "Redis",
      "BullMQ",
      "Ollama",
    ],
    bullets: [
      "Ingest pipeline that parses PDFs and Word files, chunks them, and embeds them in batches with retry and progress reporting.",
      "Hybrid retrieval over Elasticsearch with citation-linked answers and a grounded refusal path.",
      "Correlation IDs propagated end to end — API, queue, and worker — with structured logging for observability.",
    ],
    href: "#",
    linkLabel: "Read case study",
  },
  {
    index: "02",
    title: "Project Two",
    subtitle: "Placeholder subtitle for a second case study",
    role: "Role — what you owned",
    year: "2025",
    stack: ["Placeholder", "Stack", "Tags"],
    bullets: [
      "Placeholder outcome one.",
      "Placeholder outcome two.",
    ],
    href: "#",
    linkLabel: "Read case study",
  },
];

export const stack: StackGroup[] = [
  {
    group: "Backend",
    items: ["Node.js", "TypeScript", "Express", "Prisma", "PostgreSQL"],
  },
  {
    group: "AI & Retrieval",
    items: ["Embeddings", "Elasticsearch", "Vector search", "RAG", "Ollama"],
  },
  {
    group: "Infra & Ops",
    items: ["Redis", "BullMQ", "Docker", "Structured logging", "Correlation IDs"],
  },
];
