import { AuthorScreen } from "@/src/features/author/AuthorScreen";

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AuthorScreen authorId={id} />;
}
