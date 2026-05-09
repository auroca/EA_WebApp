export interface ChatSummary {
  _id: string;
  name: string;
  hasPassword: boolean;
}

export interface ChatParticipant {
  _id: string;
  name: string;
  username: string;
}

export interface ChatHistoryMessage {
  userId: string | ChatParticipant;
  message: string;
  timestamp: string;
}

export interface ChatDetail {
  _id: string;
  name: string;
  participants: ChatParticipant[];
  chatHistory: ChatHistoryMessage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessageEvent {
  chat_id: string;
  username: string;
  message: string;
  timestamp: string;
}

export interface ChatParticipantsEvent {
  chat_id: string;
  participants: string[];
  count: number;
  timestamp: string;
}
