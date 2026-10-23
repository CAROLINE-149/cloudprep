import { supabase } from "./supabase";
export class AIError extends Error {
  constructor(
    m: string,
    public code = "unknown",
  ) {
    super(m);
  }
}
export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}
export async function askAI(body: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-chat", { body });
  if (error) {
    let msg =
        "The AI service is unreachable. Make sure the ai-chat function is deployed.",
      code = "unreachable";
    try {
      const j = await (error as any).context.json();
      msg = j.error ?? msg;
      code = j.code ?? code;
    } catch {}
    throw new AIError(msg, code);
  }
  if (!data?.reply) throw new AIError("The AI returned no answer.", "empty");
  return data.reply as string;
}
