import { modelID } from "@/ai/providers";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { ArrowUp, Loader2, Square } from "lucide-react";
import { ModelPicker } from "./model-picker";
import { ToolsStatusBadge } from "./tools-status-badge";

interface InputProps {
    input: string;
    handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    isLoading: boolean;
    status: string;
    stop: () => void;
    selectedModel: modelID;
    setSelectedModel: (model: modelID) => void;
    toolsCount?: number;
    hasToolsError?: boolean;
    toolsErrorMessage?: string;
}

export const Textarea = ({
    input,
    handleInputChange,
    isLoading,
    status,
    stop,
    selectedModel,
    setSelectedModel,
    toolsCount = 0,
    hasToolsError = false,
    toolsErrorMessage,
}: InputProps) => {
    const isStreaming = status === "streaming" || status === "submitted";

    return (
        <div className="relative w-full">
            <ShadcnTextarea
                className="resize-none bg-background/50 dark:bg-muted/50 backdrop-blur-sm w-full rounded-2xl pr-12 pt-4 pb-16 border-input focus-visible:ring-ring placeholder:text-muted-foreground disabled:opacity-50"
                value={input}
                autoFocus
                placeholder={isStreaming ? "Esperando respuesta..." : "Send a message..."}
                onChange={handleInputChange}
                disabled={isStreaming}
                onKeyDown={(e) => {
                    if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !isLoading &&
                        input?.trim()
                    ) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                    }
                }}
            />
            
            {/* Controls: Model Picker + Tools Badge side by side */}
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2">
                <ModelPicker
                    setSelectedModel={setSelectedModel}
                    selectedModel={selectedModel}
                />
                <ToolsStatusBadge
                    toolCount={toolsCount}
                    hasError={hasToolsError}
                    errorMessage={toolsErrorMessage}
                />
            </div>

            <button
                type={isStreaming ? "button" : "submit"}
                onClick={isStreaming ? stop : undefined}
                disabled={
                    (!isStreaming && !input?.trim()) ||
                    (isStreaming && status === "submitted")
                }
                className="absolute right-2 bottom-2 rounded-full p-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200"
            >
                {isStreaming ? (
                    <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                ) : (
                    <ArrowUp className="h-4 w-4 text-primary-foreground" />
                )}
            </button>
        </div>
    );
};
