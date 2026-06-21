import { FormEvent, useRef, useState } from 'react';
import { FaPaperPlane, FaXmark } from 'react-icons/fa6';
import { getApiBaseUrl } from '../../services/config';
import { buildRouteDetailUrl } from '../../utils/routeNavigation';
import { useLanguage } from '../../i18n/LanguageContext';
import './PedroAssistant.css';

type PedroRoute = {
  _additional?: {
    score?: string;
  };
  city: string;
  country: string;
  cover_image: string;
  description: string;
  difficulty: string;
  distance: number;
  duration: number;
  name: string;
  route_id: string;
  tags: string[];
};

type PedroRouteResponse = {
  answer: string;
  routes?: PedroRoute[];
  selectedRoute?: PedroRoute;
};

type PedroMessage = {
  id: number;
  author: 'pedro' | 'user';
  text: string;
  routeResponse?: PedroRouteResponse;
};

const PEDRO_AVATAR_SRC = '/resources/icons/IA.gif';

async function sendPedroMessage(text: string): Promise<PedroRouteResponse> {
  const response = await fetch(`${getApiBaseUrl()}/ia/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: text,
      limit: 5
    })
  });

  if (!response.ok) {
    throw new Error('Pedro recommendation request failed.');
  }

  const data = (await response.json()) as Partial<PedroRouteResponse>;

  if (!data.answer) {
    throw new Error('Pedro recommendation response is missing an answer.');
  }

  return {
    answer: data.answer,
    routes: data.routes ?? [],
    selectedRoute: data.selectedRoute
  };
}

function buildRouteAnswerParts(answer: string, routes: PedroRoute[]) {
  const sortedRoutes = [...routes].sort((firstRoute, secondRoute) => secondRoute.name.length - firstRoute.name.length);
  const parts: Array<string | PedroRoute> = [];
  let remainingAnswer = answer;

  while (remainingAnswer.length > 0) {
    const nextMatch = sortedRoutes
      .map((route) => {
        const routeText = `${route.name} (${route.route_id})`;
        const index = remainingAnswer.indexOf(routeText);

        return index >= 0 ? { index, route, routeText } : null;
      })
      .filter((match): match is { index: number; route: PedroRoute; routeText: string } => Boolean(match))
      .sort((firstMatch, secondMatch) => firstMatch.index - secondMatch.index)[0];

    if (!nextMatch) {
      parts.push(remainingAnswer);
      break;
    }

    if (nextMatch.index > 0) {
      parts.push(remainingAnswer.slice(0, nextMatch.index));
    }

    parts.push(nextMatch.route);
    remainingAnswer = remainingAnswer.slice(nextMatch.index + nextMatch.routeText.length);
  }

  return parts;
}

function PedroAnswer({ response }: { response: PedroRouteResponse }) {
  const { t } = useLanguage();
  const routes = response.routes ?? [];
  const selectedRoute = response.selectedRoute;
  const alternatives = selectedRoute
    ? routes.filter((route) => route.route_id !== selectedRoute.route_id)
    : routes;

  return (
    <div className="pedro-assistant-route-response">
      <p className="pedro-assistant-answer">
        {buildRouteAnswerParts(response.answer, routes).map((part, index) =>
          typeof part === 'string' ? (
            <span key={`${index}-${part}`}>{part}</span>
          ) : (
            <a key={`${index}-${part.route_id}`} href={buildRouteDetailUrl(part.route_id)}>
              {part.name}
            </a>
          )
        )}
      </p>

      {selectedRoute && (
        <a className="pedro-assistant-main-route" href={buildRouteDetailUrl(selectedRoute.route_id)}>
          <img src={selectedRoute.cover_image} alt={selectedRoute.name} />
          <div>
            <strong>{selectedRoute.name}</strong>
            <span>
              {selectedRoute.city}, {selectedRoute.country}
            </span>
          </div>
        </a>
      )}

      {alternatives.length > 0 && (
        <div className="pedro-assistant-alternatives" aria-label={t('pedro.alternatives')}>
          {alternatives.map((route) => (
            <a
              key={route.route_id}
              className="pedro-assistant-alternative-route"
              href={buildRouteDetailUrl(route.route_id)}
            >
              <img src={route.cover_image} alt={route.name} />
              <span>{route.name}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function PedroAssistant() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isGreetingVisible, setIsGreetingVisible] = useState(true);
  const [messages, setMessages] = useState<PedroMessage[]>(() => [
    {
      id: 1,
      author: 'pedro',
      text: t('pedro.greeting')
    }
  ]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const nextMessageId = useRef(2);

  const addMessage = (
    author: PedroMessage['author'],
    text: string,
    routeResponse?: PedroRouteResponse
  ) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: nextMessageId.current++,
        author,
        text,
        routeResponse
      }
    ]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanMessage = messageText.trim();

    if (!cleanMessage || isSending) {
      return;
    }

    setMessageText('');
    addMessage('user', cleanMessage);
    setIsSending(true);

    try {
      const response = await sendPedroMessage(cleanMessage);
      addMessage('pedro', response.answer, response);
    } catch {
      addMessage('pedro', t('pedro.error'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="pedro-assistant-widget">
      {isOpen && (
        <section className="pedro-assistant-panel" aria-label={t('pedro.open')}>
          <header className="pedro-assistant-header">
            <div className="pedro-assistant-title">
              <img src={PEDRO_AVATAR_SRC} alt="" aria-hidden="true" />
              <div>
                <strong>Pedro</strong>
                <span>{t('pedro.title')}</span>
              </div>
            </div>

            <button
              type="button"
              className="pedro-assistant-close"
              onClick={() => setIsOpen(false)}
              aria-label={t('pedro.close')}
            >
              <FaXmark />
            </button>
          </header>

          <div className="pedro-assistant-messages" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`pedro-assistant-message pedro-assistant-message-${message.author}`}
              >
                {message.routeResponse ? <PedroAnswer response={message.routeResponse} /> : message.text}
              </div>
            ))}

            {isSending && (
              <div className="pedro-assistant-message pedro-assistant-message-pedro">
                {t('pedro.thinking')}
              </div>
            )}
          </div>

          <form className="pedro-assistant-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder={t('pedro.placeholder')}
              aria-label={t('pedro.input')}
            />

            <button type="submit" disabled={!messageText.trim() || isSending} aria-label={t('pedro.send')}>
              <FaPaperPlane />
            </button>
          </form>
        </section>
      )}

      {!isOpen && isGreetingVisible && (
        <div className="pedro-assistant-bubble">
          <button
            type="button"
            className="pedro-assistant-bubble-close"
            onClick={() => setIsGreetingVisible(false)}
            aria-label={t('pedro.hideGreeting')}
          >
            <FaXmark />
          </button>
          <span>{t('pedro.greeting')}</span>
        </div>
      )}

      <button
        type="button"
        className="pedro-assistant-button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-label={isOpen ? t('pedro.close') : t('pedro.open')}
      >
        <img src={PEDRO_AVATAR_SRC} alt="" aria-hidden="true" />
      </button>
    </div>
  );
}

export default PedroAssistant;
