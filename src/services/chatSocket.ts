import { io, type Socket } from 'socket.io-client';
import { getApiBaseUrl } from './config';

let socket: Socket | null = null;
let socketToken = '';

export const getOrCreateChatSocket = (token: string): Socket => {
  if (socket && socketToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socketToken = token;
  socket = io(getApiBaseUrl(), {
    auth: {
      accessToken: token
    },
    transports: ['websocket']
  });

  return socket;
};

export const disconnectChatSocket = (): void => {
  if (!socket) {
    return;
  }

  socket.disconnect();
  socket = null;
  socketToken = '';
};
