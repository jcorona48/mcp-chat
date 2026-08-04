import { UIMessage } from "ai";
import { CustomUIDataTypes } from "@/providers/data-stream-provider";

export type ChatMessage = UIMessage;

export type MessageStatus = "error" | "submitted" | "streaming" | "ready";
