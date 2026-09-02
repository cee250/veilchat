import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Camera, Clock3, LockKeyhole, MessageSquare, Mic, Play, Send, ShieldCheck, Square, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import TemporaryQr from "@/components/TemporaryQr";
import { createTemporaryInvite, encodeTemporaryInvite, parseTemporaryInvite, type TemporaryInvite } from "@shared/temporaryInvite";

const aliasPattern = /^[A-Za-z0-9 ._-]{2,32}$/;

type Session = { roomId: string; inviteToken: string; memberId: string; alias: string; invite: TemporaryInvite };

function formatRemaining(expiresAt: number, now: number) {
  const seconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function validateAlias(alias: string) {
  const normalized = alias.trim();
  return aliasPattern.test(normalized) ? normalized : null;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [inviteState] = useState(() => {
    const raw = new URLSearchParams(window.location.search).get("invite");
    if (!raw) return { invite: null as TemporaryInvite | null, error: "" };
    try { return { invite: parseTemporaryInvite(raw), error: "" }; }
    catch { return { invite: null as TemporaryInvite | null, error: "This temporary chat invite is invalid or expired." }; }
  });
  const [invite, setInvite] = useState<TemporaryInvite | null>(inviteState.invite);
  const [alias, setAlias] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState(inviteState.error);
  const [isRecording, setIsRecording] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [consumedMediaIds, setConsumedMediaIds] = useState<Set<string>>(() => new Set());

  const createRoom = trpc.temporary.create.useMutation();
  const joinRoom = trpc.temporary.join.useMutation();
  const sendMessage = trpc.temporary.send.useMutation();
  const sendMedia = trpc.temporary.sendMedia.useMutation();
  const consumeMedia = trpc.temporary.consumeMedia.useMutation();
  const setTyping = trpc.temporary.typing.useMutation();
  const acknowledge = trpc.temporary.acknowledge.useMutation();
  const markRead = trpc.temporary.markRead.useMutation();
  const leaveRoom = trpc.temporary.leave.useMutation();
  const typingTimerRef = useRef<number | undefined>(undefined);
  const messageNodesRef = useRef(new Map<string, HTMLElement>());
  const messageListRef = useRef<HTMLDivElement>(null);
  const readObserverRef = useRef<IntersectionObserver | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const roomQuery = trpc.temporary.get.useQuery(
    session ? { roomId: session.roomId, inviteToken: session.inviteToken, memberId: session.memberId } : { roomId: "", inviteToken: "", memberId: "" },
    { enabled: Boolean(session), refetchInterval: 1200 },
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (roomQuery.error) {
      setError(roomQuery.error.message);
      setSession(null);
    }
  }, [roomQuery.error]);

  useEffect(() => {
    if (!session) return;
    const unreadIncoming = roomQuery.data?.messages.some((item) => item.memberId !== session.memberId && !item.readBy) ?? false;
    if (roomQuery.data?.participantCount === 2 && roomQuery.data.messages.some((item) => item.memberId !== session.memberId && !item.deliveredBy)) {
      void acknowledge.mutateAsync({ roomId: session.roomId, inviteToken: session.inviteToken, memberId: session.memberId });
    }
    const markVisibleAsRead = () => {
      if (document.visibilityState !== "visible" || !unreadIncoming) return;
      const listRect = messageListRef.current?.getBoundingClientRect();
      if (!listRect) return;
      const visibleUnreadIds: string[] = [];
      messageNodesRef.current.forEach((node, messageId) => {
        const item = roomQuery.data?.messages.find((message) => message.id === messageId);
        const rect = node.getBoundingClientRect();
        const intersectsList = rect.top < listRect.bottom && rect.bottom > listRect.top && rect.left < listRect.right && rect.right > listRect.left;
        if (item && item.memberId !== session.memberId && !item.readBy && intersectsList) visibleUnreadIds.push(messageId);
      });
      if (visibleUnreadIds.length > 0) void markRead.mutateAsync({ roomId: session.roomId, inviteToken: session.inviteToken, memberId: session.memberId, messageIds: visibleUnreadIds });
    };
    readObserverRef.current?.disconnect();
    readObserverRef.current = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) markVisibleAsRead();
    }, { root: messageListRef.current, threshold: 0.35 });
    messageNodesRef.current.forEach((node, messageId) => {
      const item = roomQuery.data?.messages.find((message) => message.id === messageId);
      if (item && item.memberId !== session.memberId && !item.readBy) readObserverRef.current?.observe(node);
    });
    document.addEventListener("visibilitychange", markVisibleAsRead);
    markVisibleAsRead();
    return () => {
      readObserverRef.current?.disconnect();
      document.removeEventListener("visibilitychange", markVisibleAsRead);
    };
  }, [roomQuery.data?.messages, roomQuery.data?.participantCount, session]);

  const inviteUrl = useMemo(() => {
    if (!session) return "";
    return `${window.location.origin}/?invite=${encodeURIComponent(encodeTemporaryInvite(session.invite))}`;
  }, [session]);

  async function create() {
    const cleanAlias = validateAlias(alias);
    if (!cleanAlias) { setError("Choose an alias between 2 and 32 characters. No identifying details needed."); return; }
    setError("");
    try {
      const result = await createRoom.mutateAsync({ alias: cleanAlias });
      const roomInvite = createTemporaryInvite({ roomId: result.roomId, inviteToken: result.inviteToken, hostAlias: result.hostAlias, expiresAt: result.expiresAt });
      setSession({ roomId: result.roomId, inviteToken: result.inviteToken, memberId: result.currentMemberId, alias: result.currentAlias, invite: roomInvite });
      toast.success("Temporary room created");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the room."); }
  }

  async function join() {
    if (!invite) return;
    const cleanAlias = validateAlias(alias);
    if (!cleanAlias) { setError("Choose an alias between 2 and 32 characters. No identifying details needed."); return; }
    setError("");
    try {
      const result = await joinRoom.mutateAsync({ roomId: invite.roomId, inviteToken: invite.inviteToken, alias: cleanAlias });
      setSession({ roomId: result.roomId, inviteToken: invite.inviteToken, memberId: result.currentMemberId, alias: result.currentAlias, invite });
      toast.success("You joined the temporary room");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This invite cannot be joined."); }
  }

  function handleMessageChange(value: string) {
    setMessage(value);
    if (!session) return;
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    void setTyping.mutateAsync({ roomId: session.roomId, inviteToken: session.inviteToken, memberId: session.memberId, isTyping: Boolean(value.trim()) });
    if (value.trim()) {
      typingTimerRef.current = window.setTimeout(() => {
        void setTyping.mutateAsync({ roomId: session.roomId, inviteToken: session.inviteToken, memberId: session.memberId, isTyping: false });
      }, 1_800);
    }
  }

  async function send() {
    if (!session || !message.trim()) return;
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    try {
      await setTyping.mutateAsync({ roomId: session.roomId, inviteToken: session.inviteToken, memberId: session.memberId, isTyping: false });
      await sendMessage.mutateAsync({ roomId: session.roomId, inviteToken: session.inviteToken, memberId: session.memberId, body: message });
      setMessage("");
      await roomQuery.refetch();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Message could not be sent."); }
  }

  function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not prepare media."));
      reader.readAsDataURL(blob);
    });
  }

  async function toggleRecording() {
    if (!session || roomQuery.data?.participantCount !== 2) return;
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        try {
          const dataUrl = await blobToDataUrl(new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" }));
          await sendMedia.mutateAsync({ roomId: session.roomId, inviteToken: session.inviteToken, memberId: session.memberId, kind: "voice", dataUrl });
          await roomQuery.refetch();
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Voice note could not be sent."); }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch { setError("Microphone access was not granted."); }
  }

  async function sendPhoto(file: File | undefined) {
    if (!session || !file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) { setError("Choose a JPG, PNG, or WebP photo."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Photo must be smaller than 8 MB."); return; }
    try {
      const dataUrl = await blobToDataUrl(file);
      await sendMedia.mutateAsync({ roomId: session.roomId, inviteToken: session.inviteToken, memberId: session.memberId, kind: "photo", dataUrl });
      await roomQuery.refetch();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Photo could not be sent."); }
  }

  async function consumeMediaOnce(mediaId: string) {
    if (!session || consumedMediaIds.has(mediaId)) return;
    try {
      await consumeMedia.mutateAsync({ roomId: session.roomId, inviteToken: session.inviteToken, memberId: session.memberId, mediaId });
      setConsumedMediaIds((current) => new Set(current).add(mediaId));
      await roomQuery.refetch();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This media is no longer available."); }
  }

  async function endRoom() {
    if (!session) return;
    try { await leaveRoom.mutateAsync({ roomId: session.roomId, inviteToken: session.inviteToken, memberId: session.memberId }); } catch { /* room may already be gone */ }
    setSession(null);
    setInvite(null);
    setAlias("");
    setLocation("/");
    toast.success("Room ended and cleared");
  }

  if (session) {
    const room = roomQuery.data;
    const connected = Boolean(room?.participantCount === 2);
    const expired = session.invite.expiresAt <= now;
    return (
      <div className="app-shell room-shell">
        <header className="topbar"><a className="brand" href="/"><span className="brand-mark"><MessageSquare size={17} /></span><span>VEIL<span>CHAT</span><small>TEMPORARY CHAT</small></span></a><Button onClick={endRoom} variant="outline" className="end-button"><X size={16} /> END CHAT</Button></header>
        <main className="room-main">
          <div className="room-heading"><div><p className="eyebrow">TEMPORARY ROOM</p><h1>{connected ? <>Chatting with <span>{room?.hostAlias === session.alias ? room?.guestAlias : room?.hostAlias}</span></> : <>Waiting for a guest <span>{session.alias}</span></>}</h1></div><div className="timer"><Clock3 size={16} />{expired ? "00:00" : formatRemaining(session.invite.expiresAt, now)}<small>ROOM EXPIRY</small></div></div>
          <div className="room-grid">
            <section className="chat-panel hud-panel">
              <div className="room-status"><span className={connected ? "status-dot live" : "status-dot"} />{connected ? <>Connected as <strong>{session.alias}</strong></> : <>Waiting for a guest. Share the invite.</>}{room?.typingAlias && <span className="typing-indicator"><i /> {room.typingAlias} is typing<span className="typing-dots">···</span></span>}</div>
              <div ref={messageListRef} className="message-list">{room?.messages.length || room?.media.length ? <>{room.messages.map((item) => <article key={item.id} ref={(node) => { if (node) messageNodesRef.current.set(item.id, node); else messageNodesRef.current.delete(item.id); }} className={item.memberId === session.memberId ? "message own" : "message"}><div className="message-meta">{item.alias} · {new Date(item.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div><p>{item.body}</p>{item.memberId === session.memberId && <small className="receipt">{item.readBy ? "READ" : item.deliveredBy ? "DELIVERED" : "SENT"}</small>}</article>)}{room.media.map((item) => { const unavailable = consumedMediaIds.has(item.id) || (item.consumedBy && item.consumedBy !== session.memberId); if (unavailable) return <article className="media-note" key={item.id}><div className="message-meta">{item.alias}</div><p>{item.kind === "voice" ? "Voice note played once." : "Photo viewed once."}</p></article>; return <article className="media-note" key={item.id}><div className="message-meta">{item.alias} · {item.kind === "voice" ? "VOICE NOTE" : "PHOTO"}</div>{item.kind === "voice" && item.dataUrl ? <audio controls src={item.dataUrl} onPlay={() => item.memberId === session.memberId ? undefined : void consumeMediaOnce(item.id)} /> : item.kind === "photo" && item.dataUrl ? <Button variant="outline" className="view-once-button" onClick={async () => { await consumeMediaOnce(item.id); setActivePhoto(item.dataUrl ?? null); window.setTimeout(() => setActivePhoto(null), 5000); }}><Play size={15} /> View once</Button> : <p>Media unavailable.</p>}</article>; })}</> : <div className="empty-chat"><Sparkles size={25} /><p>{connected ? "Start the temporary conversation." : "Your message stream will appear here after the guest joins."}</p></div>}</div>
              <div className="composer"><div className="media-toolbar"><input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void sendPhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} /><Button type="button" variant="outline" className="media-button" aria-label="Send view-once photo" onClick={() => document.getElementById("photo-upload")?.click()} disabled={!connected || expired}><Camera size={17} /></Button><Button type="button" variant="outline" className={isRecording ? "media-button recording" : "media-button"} aria-label={isRecording ? "Stop recording" : "Record voice note"} onClick={() => void toggleRecording()} disabled={!connected || expired}>{isRecording ? <Square size={16} /> : <Mic size={17} />}</Button></div><Textarea value={message} onChange={(event) => handleMessageChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} disabled={!connected || expired || isRecording} placeholder={expired ? "Room expired" : connected ? "Write a message…" : "Waiting for a guest…"} /><Button onClick={() => void send()} disabled={!connected || expired || !message.trim()} className="send-button" aria-label="Send message"><Send size={18} /></Button></div><p className="microcopy">Voice notes play once. Photos open once. Media is cleared with the room.</p>{activePhoto && <div className="photo-viewer" role="dialog" aria-label="View-once photo" onClick={() => setActivePhoto(null)}><img src={activePhoto} alt="View-once shared photo" /><span>Tap to close</span></div>}
            </section>
            <aside className="room-aside"><TemporaryQr inviteUrl={inviteUrl} onScan={() => setLocation("/")} /><div className="privacy-card hud-panel"><ShieldCheck size={17} /><div><p className="eyebrow">PRIVACY BOUNDARY</p><p>This prototype keeps room state in server memory and does not write temporary messages to the project database. It cannot prevent screenshots, copied content, browser or device storage, network metadata, or service restarts.</p></div></div></aside>
          </div>
        </main>
      </div>
    );
  }

  const isJoin = Boolean(invite);
  return (
    <div className="app-shell">
      <header className="topbar landing-topbar"><a className="brand" href="/"><span className="brand-mark"><MessageSquare size={17} /></span><span>VEIL<span>CHAT</span><small>TEMPORARY CHAT</small></span></a><div className="top-status"><span className="status-dot live" />NO ACCOUNT REQUIRED</div></header>
      <main className="landing-main"><section className="hero"><p className="eyebrow"><ZapIcon /> TEMPORARY CHAT // TWO PEOPLE</p><h1>A chat that <em>leaves lightly.</em></h1><p className="hero-copy">Choose an alias, share one invite, and chat for up to 30 minutes. No account or profile required.</p></section>
        <section className="landing-grid"><div className="create-card hud-panel"><div className="panel-kicker"><LockKeyhole size={14} /> {isJoin ? "JOIN ROOM" : "ALIAS"}</div><h2>{isJoin ? <>Join <span>{invite?.hostAlias}</span>’s room.</> : <>Choose an alias</>}</h2><p className="card-copy">Use a nickname. It is visible only in this room.</p>{isJoin && <div className="invite-review"><span className="status-dot live" /><div><strong>HOST ALIAS</strong><b>{invite?.hostAlias}</b></div><span className="invite-time"><Clock3 size={14} /> {invite && formatRemaining(invite.expiresAt, now)}</span></div>}<label htmlFor="alias">ALIAS</label><Input id="alias" value={alias} onChange={(event) => setAlias(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void (isJoin ? join() : create()); }} placeholder="e.g. ShadowFox" maxLength={32} autoComplete="off" />{error && <p className="form-error" role="alert">{error}</p>}<Button onClick={() => void (isJoin ? join() : create())} className="primary-cta" disabled={createRoom.isPending || joinRoom.isPending}>{isJoin ? "JOIN ROOM" : "CREATE ROOM"}<span>↗</span></Button><p className="input-hint">2–32 characters · letters, numbers, spaces, dots, dashes, underscores</p></div>
          <div className="how-card hud-panel"><div className="panel-kicker">HOW IT WORKS</div><h2>Simple and temporary.</h2><div className="steps"><div><b>01</b><span><strong>Choose an alias</strong><small>No account required.</small></span></div><div><b>02</b><span><strong>Share the invite</strong><small>Use the QR code or copy the link.</small></span></div><div><b>03</b><span><strong>Chat</strong><small>Two people. Thirty minutes.</small></span></div></div></div></section>
        <section className="feature-strip"><div><Users size={17} /><span><strong>2 PEOPLE</strong><small>One host and one guest.</small></span></div><div><Clock3 size={17} /><span><strong>30 MINUTES</strong><small>Auto-expires.</small></span></div><div><ShieldCheck size={17} /><span><strong>IN MEMORY</strong><small>No saved message history.</small></span></div></section>
        <div className="landing-warning"><ShieldCheck size={16} /><p><strong>Privacy note</strong> Temporary rooms do not prevent screenshots, copied content, device storage, network metadata, or service restarts.</p></div>
      </main><footer><span>VEILCHAT</span></footer>
    </div>
  );
}

function ZapIcon() { return <span className="icon-glyph">✦</span>; }
function QrIcon() { return <div className="fake-qr" aria-hidden="true">{Array.from({ length: 36 }, (_, index) => <i key={index} className={index % 3 === 0 || index % 7 === 0 ? "on" : ""} />)}</div>; }
