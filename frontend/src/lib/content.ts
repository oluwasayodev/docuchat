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
  links?: LinkItem[];
};

export type StackGroup = { group: string; items: string[] };

export const profile = {
  name: "Oluwasayo Akinkunmi",
  initials: "OA",
  role: "Backend, Data & AI Engineer",
  headline: "I build backend, data, and AI systems that hold up in production.",
  intro:
    "I work across the stack where data meets product: pipelines and data models, services and APIs, and the retrieval and applied AI that sit on top.",
  location: "Lagos, Nigeria",
  email: "oluwasayoakinkunmi@gmail.com",
  resumeHref: "#",
  links: [
    { label: "GitHub", href: "https://github.com/oluwasayodev" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/oluwasayo-akinkunmi/" },
    // { label: "X", href: "#" },
  ] satisfies LinkItem[],
};

export const nav: NavItem[] = [
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Stack", href: "#stack" },
  { label: "Contact", href: "#contact" },
];

export const stats: Stat[] = [
  { value: `${new Date().getFullYear() - 2021}+`, label: "Years building" },
  { value: "12", label: "Systems shipped" },
  { value: "100%", label: "Documented with evidence" },
];

export const about = {
  paragraphs: [
    "I build fault-tolerant backend systems for data-intensive and AI applications. I design the heavy lifting underneath — event queues, ingestion pipelines, retrieval layers, and the end-to-end observability that ties them together.",
    "The work I enjoy most sits below the surface: moving data reliably from where it lands to where it answers questions, and keeping systems correct under load and graceful when things go wrong. I care about reliability and clarity as much as raw speed.",
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
    links: [
      { label: "Repository", href: "https://github.com/oluwasayodev/docuchat" },
      // { label: "Open DocuChat", href: "/login" },
    ],
  },
  {
    index: "02",
    title: "Vertebrae Counter",
    subtitle: "Detecting vertebrae in knockout-mouse X-rays with a trained YOLOv3 model",
    role: "Sole engineer — model training, API, and interface",
    year: "2025",
    stack: ["Python", "Django", "YOLOv3", "Darknet", "Docker", "React"],
    bullets: [
      "Trained a YOLOv3 model on the IMPC knockout-mouse X-ray dataset to localize vertebrae.",
      "Django API that runs inference and returns bounding-box coordinates for every detected vertebra.",
      "React interface that plots detections over the uploaded X-ray with react-bounding-box, containerized for one-command startup.",
    ],
    links: [
      { label: "View repository", href: "https://github.com/oluwasayo01/vertebrae-counter" },
    ],
  },
];

export const stack: StackGroup[] = [
  {
    group: "Backend",
    items: ["Node.js", "TypeScript", "Express", "Prisma", "PostgreSQL"],
  },
  {
    group: "Data Engineering",
    items: ["Python", "SQL", "ETL / ELT", "Data modeling", "Apache Airflow", "dbt", "Apache Spark", "Kafka"],
  },
  {
    group: "AI & Retrieval",
    items: ["Embeddings", "Elasticsearch", "Vector search", "RAG", "Ollama"],
  },
  {
    group: "Infra & Ops",
    items: ["Docker", "Kubernetes", "AWS", "GCP", "Redis", "BullMQ"],
  },
];
