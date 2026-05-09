import { useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import TopNav from '../../shared/TopNav';
import { getStoredToken, getStoredUser, isAuthenticated } from '../../../services/authService';
import { getOrCreateChatSocket } from '../../../services/chatSocket';
import { getAllChats, getChatById, getChatsByUser, joinChatById } from '../../../services/chatService';
import type {
  ChatDetail,
  ChatHistoryMessage,
  ChatSummary,
  GrupMessageEvent,
  GrupParticipantsEvent
} from '../../../types/chat';

const resolveMessageAuthor = (entry: ChatHistoryMessage): { id: string; username: string } => {
  if (typeof entry.userId === 'string') {
    return {
      id: entry.userId,
      username: entry.userId
    };
  }

  return {
    id: entry.userId._id,
    username: entry.userId.username || entry.userId.name || 'Unknown'
  };
};

const formatMessageTime = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

function ChatPage() {
  const user = getStoredUser();
  const token = getStoredToken();
  const socketRef = useRef<Socket | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const [allChats, setAllChats] = useState<ChatSummary[]>([]);
  const [participantChatIds, setParticipantChatIds] = useState<string[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [messages, setMessages] = useState<ChatHistoryMessage[]>([]);
  const [onlineParticipants, setOnlineParticipants] = useState<string[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [joiningChatId, setJoiningChatId] = useState<string>('');
  const [joinPasswordOpenFor, setJoinPasswordOpenFor] = useState<ChatSummary | null>(null);
  const [joinPasswordValue, setJoinPasswordValue] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');

  const participantSet = useMemo(() => new Set(participantChatIds), [participantChatIds]);

  useEffect(() => {
    if (!isAuthenticated() || !user?._id) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const loadChats = async (): Promise<void> => {
      try {
        const [availableChats, myChats] = await Promise.all([
          getAllChats(),
          getChatsByUser(user._id)
        ]);

        if (!mounted) {
          return;
        }

        const myChatIds = myChats.map((chat) => chat._id);

        setAllChats(availableChats);
        setParticipantChatIds(myChatIds);
        setLoadError('');

        if (myChats[0]) {
          setSelectedChatId(myChats[0]._id);
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (error instanceof Error) {
          setLoadError(error.message);
        } else {
          setLoadError('Unable to load chats.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadChats();

    return () => {
      mounted = false;
    };
  }, [user?._id]);

  useEffect(() => {
    if (!isAuthenticated() || !token) {
      return;
    }

    const socket = getOrCreateChatSocket(token);
    socketRef.current = socket;

    const handleIncomingMessage = (event: GrupMessageEvent): void => {
      if (event.chat_id !== selectedChatId) {
        return;
      }

      setMessages((current) => [
        ...current,
        {
          userId: event.username,
          message: event.message,
          timestamp: event.timestamp
        }
      ]);
    };

    const handleParticipantsUpdate = (event: GrupParticipantsEvent): void => {
      if (event.chat_id !== selectedChatId) {
        return;
      }

      setOnlineParticipants(event.participants);
    };

    socket.on('grup:message', handleIncomingMessage);
    socket.on('grup:participants', handleParticipantsUpdate);

    return () => {
      socket.off('grup:message', handleIncomingMessage);
      socket.off('grup:participants', handleParticipantsUpdate);
    };
  }, [selectedChatId, token]);

  useEffect(() => {
    if (!selectedChatId || !participantSet.has(selectedChatId)) {
      setSelectedChat(null);
      setMessages([]);
      setOnlineParticipants([]);
      return;
    }

    let mounted = true;

    const loadSelectedChat = async (): Promise<void> => {
      try {
        const chat = await getChatById(selectedChatId);

        if (!mounted) {
          return;
        }

        setSelectedChat(chat);
        setMessages(chat.chatHistory ?? []);
        setOnlineParticipants(chat.participants.map((participant) => participant.username));
      } catch (error) {
        if (!mounted) {
          return;
        }

        setSelectedChat(null);
        setMessages([]);
        setOnlineParticipants([]);

        if (error instanceof Error) {
          setLoadError(error.message);
        } else {
          setLoadError('Unable to open the selected chat.');
        }
      }
    };

    void loadSelectedChat();

    return () => {
      mounted = false;
    };
  }, [participantSet, selectedChatId]);

  const selectChat = (chat: ChatSummary): void => {
    setJoinError('');

    if (participantSet.has(chat._id)) {
      setSelectedChatId(chat._id);
      return;
    }

    if (chat.hasPassword) {
      setJoinPasswordOpenFor(chat);
      setJoinPasswordValue('');
      return;
    }

    void handleJoinChat(chat, '');
  };

  const handleJoinChat = async (chat: ChatSummary, password: string): Promise<void> => {
    try {
      setJoiningChatId(chat._id);
      setJoinError('');

      const joinedChat = await joinChatById(chat._id, password);

      setParticipantChatIds((current) => {
        if (current.includes(chat._id)) {
          return current;
        }

        return [...current, chat._id];
      });

      setSelectedChatId(chat._id);
      setSelectedChat(joinedChat);
      setMessages(joinedChat.chatHistory ?? []);
      setOnlineParticipants(joinedChat.participants.map((participant) => participant.username));
      setJoinPasswordOpenFor(null);
      setJoinPasswordValue('');
    } catch (error) {
      if (error instanceof Error) {
        setJoinError(error.message);
      } else {
        setJoinError('Unable to join this chat.');
      }
    } finally {
      setJoiningChatId('');
    }
  };

  const handleSendMessage = (): void => {
    const content = messageInput.trim();

    if (!content || !selectedChatId || !socketRef.current || !user?.username) {
      return;
    }

    socketRef.current.emit('grup:message', {
      chat_id: selectedChatId,
      username: user.username,
      message: content
    });

    setMessageInput('');
  };

  if (!isAuthenticated() || !user?._id || !token) {
    return (
      <main className="home-page">
        <TopNav activeTopNav={'chats'} />
        <section className="home-content">
          <p className="status-message error">You need to log in to use chats.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="home-page">
      <TopNav activeTopNav={'chats'} />

      <section className="home-content chat-page-layout">
        <aside className="chat-sidebar">
          <h2 className="chat-sidebar-title">Available chats</h2>

          {isLoading ? <p className="status-message">Loading chats...</p> : null}
          {!isLoading && loadError ? <p className="status-message error">{loadError}</p> : null}

          {!isLoading && !loadError ? (
            <ul className="chat-room-list">
              {allChats.map((chat) => {
                const isSelected = selectedChatId === chat._id;
                const isParticipant = participantSet.has(chat._id);
                const requiresPassword = !isParticipant && chat.hasPassword;

                return (
                  <li key={chat._id}>
                    <button
                      type="button"
                      className={isSelected ? 'chat-room-item chat-room-item-active' : 'chat-room-item'}
                      onClick={() => selectChat(chat)}
                      disabled={joiningChatId === chat._id}
                    >
                      <span className="chat-room-item-main">
                        <span className="chat-room-name">{chat.name}</span>
                        <span className="chat-room-meta">
                          {isParticipant ? 'Participant' : requiresPassword ? 'Password required' : 'Open group'}
                        </span>
                      </span>

                      {requiresPassword ? <span className="chat-room-lock">Locked</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </aside>

        <section className="chat-main">
          {!selectedChat ? (
            <div className="chat-empty-state">
              <h3>Select a chat</h3>
              <p>Open a group from the left panel to start messaging.</p>
            </div>
          ) : (
            <>
              <header className="chat-header">
                <div>
                  <h2 className="chat-title">{selectedChat.name}</h2>
                  <p className="chat-online-count">{onlineParticipants.length} online now</p>
                </div>
                <div className="chat-participant-chips">
                  {onlineParticipants.slice(0, 4).map((username) => (
                    <span key={username} className="chat-participant-chip">
                      {username}
                    </span>
                  ))}
                </div>
              </header>

              <div className="chat-messages">
                {messages.map((entry, index) => {
                  const author = resolveMessageAuthor(entry);
                  const isMine = author.id === user._id || author.username === user.username;
                  const bubbleClassName = isMine
                    ? 'chat-message-bubble chat-message-bubble-mine'
                    : 'chat-message-bubble';

                  return (
                    <article
                      key={`${entry.timestamp}-${index}-${entry.message}`}
                      className={isMine ? 'chat-message-row chat-message-row-mine' : 'chat-message-row'}
                    >
                      <div className={bubbleClassName}>
                        <p className="chat-message-author">{isMine ? 'You' : author.username}</p>
                        <p className="chat-message-text">{entry.message}</p>
                        <time className="chat-message-time">{formatMessageTime(entry.timestamp)}</time>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="chat-input-row">
                <input
                  className="chat-input"
                  placeholder="Write your message..."
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  className="chat-send-button"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </section>
      </section>

      {joinPasswordOpenFor ? (
        <div className="chat-join-modal-overlay">
          <div className="chat-join-modal">
            <h3>Join {joinPasswordOpenFor.name}</h3>
            <p>This group is protected. Enter the password to continue.</p>

            <input
              type="password"
              className="chat-join-password-input"
              value={joinPasswordValue}
              onChange={(event) => setJoinPasswordValue(event.target.value)}
              placeholder="Group password"
            />

            {joinError ? <p className="status-message error">{joinError}</p> : null}

            <div className="chat-join-actions">
              <button
                type="button"
                className="chat-join-cancel"
                onClick={() => {
                  setJoinPasswordOpenFor(null);
                  setJoinPasswordValue('');
                  setJoinError('');
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="chat-join-confirm"
                disabled={joiningChatId === joinPasswordOpenFor._id}
                onClick={() => {
                  void handleJoinChat(joinPasswordOpenFor, joinPasswordValue);
                }}
              >
                {joiningChatId === joinPasswordOpenFor._id ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default ChatPage;
