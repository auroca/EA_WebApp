import type { ChatDetail, ChatSummary } from '../types/chat';
import { authenticatedFetch } from './apiClient';

const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const data = await response.json();
    if (typeof data?.message === 'string' && data.message.trim().length > 0) {
      return data.message;
    }
  } catch {
  }

  return fallback;
};

export const getAllChats = async (): Promise<ChatSummary[]> => {
  const response = await authenticatedFetch('/chats');

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Unable to load chat list.'));
  }

  return (await response.json()) as ChatSummary[];
};

export const getChatsByUser = async (userId: string): Promise<ChatDetail[]> => {
  const response = await authenticatedFetch(`/chats/user/${userId}`);

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Unable to load your chats.'));
  }

  return (await response.json()) as ChatDetail[];
};

export const getChatById = async (chatId: string): Promise<ChatDetail> => {
  const response = await authenticatedFetch(`/chats/${chatId}`);

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Unable to open this chat.'));
  }

  return (await response.json()) as ChatDetail;
};

export const joinChatById = async (chatId: string, password: string): Promise<ChatDetail> => {
  const response = await authenticatedFetch(`/chats/${chatId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Unable to join this chat.'));
  }

  return (await response.json()) as ChatDetail;
};

export const createChat = async (name: string, password?: string): Promise<ChatDetail> => {
  const body: { name: string; password?: string } = { name };
  if (password && password.trim().length > 0) {
    body.password = password;
  }

  const response = await authenticatedFetch('/chats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Unable to create this chat.'));
  }

  return (await response.json()) as ChatDetail;
};
