import NoteDetail from "@/components/library/NoteDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NoteDetail id={id} backHref="/library/poetry" backLabel="Back to poetry" />;
}
