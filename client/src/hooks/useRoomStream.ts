import { useEffect, useRef, useState } from "react";
import type { RoomSnapshot } from "../../../server/temporaryRooms";

interface UseRoomStreamOptions {
  roomId: string;
  inviteToken: string;
  memberId: string;
  enabled: boolean;
  onSnapshot?: (snapshot: RoomSnapshot) => void;
  onClosed?: (reason: string) => void;
}

export function useRoomStream({
  roomId,
  inviteToken,
  memberId,
  enabled,
  onSnapshot,
  onClosed,
}: UseRoomStreamOptions) {
  const [data, setData] = useState<RoomSnapshot | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || !roomId || !inviteToken || !memberId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const url = `/api/temporary/stream?roomId=${encodeURIComponent(roomId)}&inviteToken=${encodeURIComponent(
      inviteToken
    )}&memberId=${encodeURIComponent(memberId)}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "snapshot" && msg.payload) {
          setData(msg.payload);
          onSnapshot?.(msg.payload);
        } else if (msg.type === "closed") {
          setIsConnected(false);
          onClosed?.(msg.reason || "Room closed.");
        } else if (msg.type === "error") {
          setError(msg.message);
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, roomId, inviteToken, memberId]);

  return {
    data,
    isConnected,
    error,
    setData,
  };
}
