type SessionStatus = "open" | "active";

export type Session = {
  id: string;
  title: string;
  maxPlayers: number;
  status: SessionStatus;
  participants: string[];
  createdAt: string;
};

export type CreateSessionPayload = {
  title: string;
  maxPlayers: number;
};

const sessions = new Map<string, Session>();

const newId = () => crypto.randomUUID();

export function listSessions(): Session[] {
  return Array.from(sessions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function createSession(payload: CreateSessionPayload): Session {
  const id = newId();
  const session: Session = {
    id,
    title: payload.title,
    maxPlayers: payload.maxPlayers,
    status: "open",
    participants: [],
    createdAt: new Date().toISOString(),
  };

  sessions.set(id, session);

  return session;
}

export function findSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function joinSession(id: string): Session {
  const session = sessions.get(id);

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.participants.length >= session.maxPlayers) {
    throw new Error("Session is full");
  }

  session.participants = [...session.participants, crypto.randomUUID()];

  if (session.participants.length >= session.maxPlayers) {
    session.status = "active";
  }

  sessions.set(id, session);

  return session;
}
