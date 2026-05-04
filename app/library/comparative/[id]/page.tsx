import NoteDetail from "@/components/library/NoteDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NoteDetail id={id} backHref="/library/comparative" backLabel="Back to comparative" />;
}
