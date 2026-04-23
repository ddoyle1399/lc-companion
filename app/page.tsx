import Link from "next/link";
import Nav from "@/components/nav";

interface QuickAction {
  href: string;
  label: string;
  description: string;
  icon: string;
}

const paper2Actions: QuickAction[] = [
  {
    href: "/poetry",
    label: "New Poetry Note",
    description: "Generate analysis notes for a prescribed poem",
    icon: "pencil",
  },
  {
    href: "/single-text",
    label: "New Single Text Note",
    description: "Generate study notes for prescribed novels, plays, and Shakespeare",
    icon: "book",
  },
  {
    href: "/comparative",
    label: "New Comparative Note",
    description: "Generate comparative study notes across texts",
    icon: "compare",
  },
  {
    href: "/unseen-poetry",
    label: "Unseen Poetry Guide",
    description: "Generate skills guides for unseen poetry analysis",
    icon: "eye",
  },
];

const paper1Actions: QuickAction[] = [
  {
    href: "/comprehension",
    label: "Comprehension Guide",
    description: "Generate Paper 1 comprehension and functional writing strategies",
    icon: "search",
  },
  {
    href: "/composition",
    label: "Composition Guide",
    description: "Generate writing guides for Paper 1 compositions (100 marks)",
    icon: "pen",
  },
];

const toolActions: QuickAction[] = [
  {
    href: "/generate",
    label: "Generate Sample Answer",
    description: "Generate HL poetry sample answers at H1, H2, or H3 grade tier",
    icon: "star",
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
    case "book":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      );
    case "eye":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "search":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      );
    case "pen":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
        </svg>
      );
    case "star":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
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

        {/* Paper 2 */}
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
          Paper 2
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {paper2Actions.map((action) => (
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

        {/* Paper 1 */}
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
          Paper 1
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {paper1Actions.map((action) => (
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

        {/* Tools */}
        <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-3">
          Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {toolActions.map((action) => (
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
