"use client";
import { FC } from "react";

import type { MessageType } from "langchain/schema";

interface ChatMessageProps {
  text: string;
  type: MessageType;
}

const ChatMessage: FC<ChatMessageProps> = ({ text, type }) => {
  const isHuman = type === "human";

  return (
    <div className={`flex my-2 ${isHuman ? "justify-end" : "justify-start"}`}>
      <div>
        <p
          className={`font-semibold text-gray-500 ${
            isHuman ? "text-right" : "text-left"
          }`}
        >
          {type}
        </p>
        <div
          className={`w-auto max-w-3/4 rounded-tl-lg rounded-tr-lg  px-4 py-2 ${
            isHuman
              ? "bg-blue-400 text-white rounded-bl-lg"
              : "bg-gray-300 text-gray-700 rounded-br-lg"
          }`}
        >
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
