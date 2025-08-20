import Chat from "@/components/chat";
import { UIMessage } from "ai";
import { getUserId } from "./actions";

export default async function Page() {
    const userId = await getUserId();
    return <Chat initialMessages={[] as UIMessage[]} userId={userId} />;
}
