import { useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import TopNav from '../../shared/TopNav';
import AccessibilityPanel from '../../shared/AccessibilityPanel';
import { getStoredToken, getStoredUser, isAuthenticated } from '../../../services/authService';
import { getOrCreateChatSocket } from '../../../services/chatSocket';
import { getAllChats, getChatById, getChatsByUser, joinChatById, createChat } from '../../../services/chatService';
import type {
  ChatDetail,
  ChatHistoryMessage,
  ChatSummary,
  ChatMessageEvent,
  ChatParticipantsEvent
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
  const [showCreateGroupModal, setShowCreateGroupModal] = useState<boolean>(false);
  const [createGroupName, setCreateGroupName] = useState<string>('');
  const [createGroupPassword, setCreateGroupPassword] = useState<string>('');
  const [createGroupError, setCreateGroupError] = useState<string>('');
  const [isCreatingGroup, setIsCreatingGroup] = useState<boolean>(false);

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

    const handleIncomingMessage = (event: ChatMessageEvent): void => {
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

    const handleParticipantsUpdate = (event: ChatParticipantsEvent): void => {
      if (event.chat_id !== selectedChatId) {
        return;
      }

      setOnlineParticipants(event.participants);
    };

    const handleChatReload = async (): Promise<void> => {
      // Only reload if user is available
      if (!user?._id) {
        return;
      }

      try {
        const [availableChats, myChats] = await Promise.all([
          getAllChats(),
          getChatsByUser(user._id)
        ]);

        const myChatIds = myChats.map((chat) => chat._id);
        setAllChats(availableChats);
        setParticipantChatIds(myChatIds);
      } catch (error) {
        console.error('Error reloading chats:', error);
      }
    };

    socket.on('chat:message', handleIncomingMessage);
    socket.on('chat:participants', handleParticipantsUpdate);
    socket.on('chat:reload', handleChatReload);

    return () => {
      socket.off('chat:message', handleIncomingMessage);
      socket.off('chat:participants', handleParticipantsUpdate);
      socket.off('chat:reload', handleChatReload);
    };
  }, [selectedChatId, token, user?._id]);

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

    socketRef.current.emit('chat:message', {
      chat_id: selectedChatId,
      username: user.username,
      message: content
    });

    setMessageInput('');
  };

  const handleCreateGroup = async (): Promise<void> => {
    const groupName = createGroupName.trim();

    if (!groupName) {
      setCreateGroupError('Group name is required.');
      return;
    }

    if (groupName.length < 2) {
      setCreateGroupError('Group name must be at least 2 characters.');
      return;
    }

    try {
      setIsCreatingGroup(true);
      setCreateGroupError('');

      const newChat = await createChat(groupName, createGroupPassword);

      setParticipantChatIds((current) => [...current, newChat._id]);
      setAllChats((current) => [
        ...current,
        {
          _id: newChat._id,
          name: newChat.name,
          hasPassword: !!createGroupPassword && createGroupPassword.trim().length > 0
        }
      ]);

      setSelectedChatId(newChat._id);
      setSelectedChat(newChat);
      setMessages(newChat.chatHistory ?? []);
      setOnlineParticipants(newChat.participants.map((participant) => participant.username));

      setShowCreateGroupModal(false);
      setCreateGroupName('');
      setCreateGroupPassword('');
    } catch (error) {
      if (error instanceof Error) {
        setCreateGroupError(error.message);
      } else {
        setCreateGroupError('Unable to create group.');
      }
    } finally {
      setIsCreatingGroup(false);
    }
  };

  if (!isAuthenticated() || !user?._id || !token) {
    return (
      <main className="home-page">
        <TopNav activeTopNav={'chats'} />
        <AccessibilityPanel />
        <section className="home-content">
          <p className="status-message error">You need to log in to use chats.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="home-page">
      <TopNav activeTopNav={'chats'} />
      <AccessibilityPanel />

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

          {!isLoading && !loadError ? (
            <button
              type="button"
              className="chat-create-group-button"
              onClick={() => {
                setShowCreateGroupModal(true);
                setCreateGroupError('');
              }}
            >
              + Create Group
            </button>
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

      {showCreateGroupModal ? (
        <div className="chat-join-modal-overlay">
          <div className="chat-join-modal">
            <h3>Create New Group</h3>
            <p>Enter a name for your group and optionally set a password.</p>

            <input
              type="text"
              className="chat-join-password-input"
              value={createGroupName}
              onChange={(event) => setCreateGroupName(event.target.value)}
              placeholder="Group name"
              disabled={isCreatingGroup}
            />

            <input
              type="password"
              className="chat-join-password-input"
              value={createGroupPassword}
              onChange={(event) => setCreateGroupPassword(event.target.value)}
              placeholder="Password (optional)"
              disabled={isCreatingGroup}
            />

            {createGroupError ? <p className="status-message error">{createGroupError}</p> : null}

            <div className="chat-join-actions">
              <button
                type="button"
                className="chat-join-cancel"
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setCreateGroupName('');
                  setCreateGroupPassword('');
                  setCreateGroupError('');
                }}
                disabled={isCreatingGroup}
              >
                Cancel
              </button>

              <button
                type="button"
                className="chat-join-confirm"
                disabled={isCreatingGroup}
                onClick={() => {
                  void handleCreateGroup();
                }}
              >
                {isCreatingGroup ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default ChatPage;
