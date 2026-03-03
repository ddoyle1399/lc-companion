import Link from "next/link";
import Nav from "@/components/nav";

const quickActions = [
  {
    href: "/poetry",
    label: "New Poetry Note",
    description: "Generate analysis notes for a prescribed poem",
    icon: "pencil",
  },
  {
    href: "/comparative",
    label: "New Comparative Note",
    description: "Generate comparative study notes across texts",
    icon: "compare",
  },
  {
    href: "/worksheet",
    label: "New Worksheet",
    description: "Create activities and exercises for class",
    icon: "clipboard",
  },
  {
    href: "/slides",
    label: "New Slides",
    description: "Generate PowerPoint presentations",
    icon: "slides",
  },
  {
    href: "/video",
    label: "New Video",
    description: "Create narrated video analysis from a poetry note",
    icon: "video",
  },
];

function ActionIcon({ type }: { type: string }) {
  const cls = "w-6 h-6 text-teal";
  switch (type) {
    case "pencil":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      );
    case "compare":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      );
    case "slides":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
        </svg>
      );
    case "video":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-navy">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate exam-aligned Leaving Certificate English content.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:border-teal hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-3">
                <ActionIcon type={action.icon} />
                <div>
                  <h2 className="font-medium text-navy group-hover:text-teal transition-colors">
                    {action.label}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-navy mb-3">
            Getting Started
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <ol className="text-sm text-gray-600 space-y-2">
              <li>
                <strong className="text-navy">1.</strong> Select a content type
                above to begin generating.
              </li>
              <li>
                <strong className="text-navy">2.</strong> Choose the circular
                year (2026), level (HL/OL), and the specific text or poem.
              </li>
              <li>
                <strong className="text-navy">3.</strong> Add any specific
                instructions, then generate. Content streams in real time.
              </li>
              <li>
                <strong className="text-navy">4.</strong> Review, edit if needed,
                then export as Markdown or copy to clipboard.
              </li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
