"use client";
import {
  FC,
  FormEvent,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { Roboto } from "next/font/google";
import { MessageType } from "langchain/schema";

const roboto = Roboto({ weight: ["400"], subsets: ["latin"] });

import ChatMessage from "./ChatMessage";

interface Message {
  text: string;
  type: MessageType;
}

const Chat: FC = () => {
  const [persona, setPersona] = useState(
    "You are a FinanceGPT, an advanced AI language model specialized in the field of finance. You are here to provide expert insights and navigate complex financial topics. You will provide a thorough and well-reasoned response."
  );
  const [input, setInput] = useState("");
  const [canSend, setCanSend] = useState(true);
  const [output, setOutput] = useState("");
  const [pastMessages, setPastMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const messages = window.sessionStorage.getItem("pastMessages");
    if (messages) {
      setPastMessages(JSON.parse(messages));
    }
    const personality = window.sessionStorage.getItem("persona");
    if (personality) {
      setPersona(personality);
    }
  }, []);
  useEffect(() => {
    window.sessionStorage.setItem("pastMessages", JSON.stringify(pastMessages));
  }, [pastMessages]);

  useEffect(() => {
    window.sessionStorage.setItem("persona", persona);
  }, [persona]);

  const outputRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollIntoView(false);
    }
  }, [output]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      try {
        setCanSend(false);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            persona,
            input,
            pastMessages,
          }),
        });
        if (res.status !== 200) {
          throw new Error(`Response status: ${res.statusText}`);
        }
        if (!res?.body) {
          throw new Error("Response has no body.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        setInput((input) => {
          setPastMessages((history) => [
            ...history,
            { text: input, type: "human" },
          ]);
          return "";
        });
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          const chunk = decoder.decode(value);
          setOutput((output) => output.concat(chunk));
        }
        reader.cancel();

        setOutput((output) => {
          setPastMessages((history) => [
            ...history,
            { text: output, type: "ai" },
          ]);
          return "";
        });
      } catch (err) {
        let message = "Unknown error.";
        if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
        console.error(err);
      } finally {
        setCanSend(true);
      }
    },
    [persona, input, pastMessages]
  );
  const hasHistory = useMemo(
    () => Boolean(pastMessages.length),
    [pastMessages]
  );
  const isDisabled = useMemo(
    () => !!error || !input || !canSend,
    [input, canSend, error]
  );
  return (
    <div
      className={`${roboto.className} container mx-auto bg-white black h-screen p-5`}
    >
      <div className="flex flex-col h-full">
        <h1
          className={`${roboto.className} mb-2 mt-10 text-5xl font-medium leading-tight text-primary text-center`}
        >
          Chat with short-term memory
        </h1>
        <div className="border-2 border-gray-200 rounded-lg p-4 h-30 mb-5">
          <form className="flex flex-col">
            <div>
              {hasHistory ? (
                <div className="flex flex-row-reverse">
                  <button
                    className="bg-blue-700 text-white rounded-lg px-4 py-2 mb-5 disabled:opacity-25"
                    onClick={() => setPastMessages([])}
                    disabled={!canSend}
                  >
                    Start a new chat to change personality
                  </button>
                </div>
              ) : (
                <label className="font-semibold mb-1" htmlFor="persona">
                  Set a specific personality for Chat:
                </label>
              )}

              <textarea
                rows={3}
                id="persona"
                className="w-full rounded-lg border-gray-200 border p-2 mr-4 max-h-32"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                disabled={hasHistory}
              ></textarea>
            </div>
            <div></div>
          </form>
        </div>
        <div className="border-2 border-gray-200 rounded-lg h-full flex flex-col overflow-auto px-4 mb-5">
          {pastMessages.map((message, index) => (
            <div key={index}>
              <ChatMessage text={message.text} type={message.type} />
            </div>
          ))}

          {output && (
            <div ref={outputRef}>
              <ChatMessage text={output} type="ai" />
            </div>
          )}
          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
              role="alert"
            >
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline">{error}</span>
              <button
                onClick={() => setError("")}
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
                type="button"
              >
                ✖
              </button>
            </div>
          )}
        </div>
        <div className="border-2 border-gray-200 rounded-lg p-4 h-24">
          <form className="flex" onSubmit={handleSubmit}>
            <input
              type="text"
              className="w-full rounded-lg border-gray-200 border p-2 mr-4"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={isDisabled}
              className="bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-25"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
