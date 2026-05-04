import TextNoteDetail from "@/components/library/TextNoteDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TextNoteDetail id={id} />;
}
