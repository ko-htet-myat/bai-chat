import { redirect } from "next/navigation";

export default async function ChatbotDefaultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/chatbots/${id}/settings`);
}
