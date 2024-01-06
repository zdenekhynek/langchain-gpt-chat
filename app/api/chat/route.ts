import { ChatOpenAI } from "langchain/chat_models/openai";
import { CallbackManager } from "langchain/callbacks";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from "langchain/prompts";

import { ConversationChain } from "langchain/chains";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import {
  HumanChatMessage,
  AIChatMessage,
  BaseChatMessage,
} from "langchain/schema";

async function callChain(
  persona: string,
  input: string,
  pastMessages: BaseChatMessage[]
) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const llm = new ChatOpenAI({
    temperature: 0.8,
    streaming: true,
    callbackManager: CallbackManager.fromHandlers({
      handleLLMNewToken: async (token) => {
        await writer.ready;
        await writer.write(encoder.encode(`${token}`));
      },
      handleLLMEnd: async () => {
        await writer.ready;
        await writer.close();
      },
      handleLLMError: async (e) => {
        await writer.ready;
        await writer.abort(e);
      },
    }),
  });

  const prompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(persona),
    new MessagesPlaceholder("history"),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
  ]);

  const memory = new BufferMemory({
    returnMessages: true,
    chatHistory: new ChatMessageHistory(pastMessages),
  });
  const chain = new ConversationChain({
    prompt,
    llm,
    memory,
  });
  chain.call({ input }).catch(console.error);

  return stream.readable;
}

export async function POST(request: Request) {
  const body = await request.json();
  const input: string = body.input;
  const persona: string = body.persona;

  const pastMessages: BaseChatMessage[] = body.pastMessages.map((msg: any) => {
    switch (msg.type) {
      case "ai":
        return new AIChatMessage(msg.text);
      case "human":
        return new HumanChatMessage(msg.text);
      default:
        throw new TypeError(`Unsupported message type: ${msg.type}`);
    }
  });

  try {
    const stream = callChain(persona, input, pastMessages);
    return new Response(await stream, {
      headers: {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    console.error(err);
    let error = "Unexpected message";
    if (err instanceof Error) {
      error = err.message;
    }
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
