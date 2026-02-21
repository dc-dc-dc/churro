import { useState, useCallback, useEffect } from "react";
import "./index.css";
import { ChatBar } from "./components/ChatBar";
import { RenderSpace } from "./components/RenderSpace";
import type { Car } from "./components/CarCard";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export type View = {
  type: "empty" | "cars" | "map" | "booking" | "car_detail" | "comparison";
  data?: any;
};

export type Interaction = {
  type: "car_click";
  car: Car;
  timestamp: string; // ISO string — safe to serialise in JSON
};

export function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [view, setView] = useState<View>({ type: "empty" });
  const [isLoading, setIsLoading] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const handleCarInteract = useCallback((car: Car) => {
    setInteractions((prev) => {
      const next: Interaction = { type: "car_click", car, timestamp: new Date().toISOString() };
      return [...prev.slice(-9), next];
    });
    setView({ type: "car_detail", data: { car } });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            history: messages.map((m) => ({ role: m.role, content: m.content })),
            interactions,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json() as { message: string; view?: View };

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (data.view) {
          setView(data.view);
        }
      } catch {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, interactions]
  );

  return (
    <div className="app">
      <div className="bg-glow bg-glow--amber" />
      <div className="bg-glow bg-glow--blue" />

      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="logo">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <path
                d="M14 2L24.3923 8V20L14 26L3.6077 20V8L14 2Z"
                fill="#e8a020"
                fillOpacity="0.14"
                stroke="#e8a020"
                strokeWidth="1.4"
              />
              <path
                d="M14 7.5L19.5 10.75V17.25L14 20.5L8.5 17.25V10.75L14 7.5Z"
                fill="#e8a020"
                fillOpacity="0.28"
              />
            </svg>
            <span className="logo-text">churro</span>
          </a>

          <div className="nav-links">
            <div className="nav-divider" />
            <button className="btn-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      <div className="main-content">
        <ChatBar messages={messages} isLoading={isLoading} onSend={sendMessage} />
        <RenderSpace
          view={view}
          onSuggestedPrompt={sendMessage}
          onCarInteract={handleCarInteract}
          onBack={() => setView({ type: "empty" })}
          onBook={(car) => setView({ type: "car_detail", data: { car } })}
        />
      </div>
    </div>
  );
}

export default App;
