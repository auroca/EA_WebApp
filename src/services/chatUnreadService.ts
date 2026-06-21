export const CHAT_UNREAD_UPDATED_EVENT = 'trip2guide:chat-unread-updated';

export const notifyChatUnreadUpdated = (total: number): void => {
  window.dispatchEvent(
    new CustomEvent(CHAT_UNREAD_UPDATED_EVENT, {
      detail: { total }
    })
  );
};
