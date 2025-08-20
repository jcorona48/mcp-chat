import Chat from "@/components/chat";
import { UIMessage } from "ai";
import { getUserId } from "./actions";

export default async function Page() {
    return <Chat initialMessages={[] as UIMessage[]} userId={null} />;
}
