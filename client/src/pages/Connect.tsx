import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Fingerprint, Link2, ShieldCheck, UserRound, X } from "lucide-react";

export default function Connect() {
  const { isAuthenticated, loading } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const username = useMemo(() => new URLSearchParams(window.location.search).get("username")?.replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "") || "", []);
  const targetQuery = trpc.discovery.byUsername.useQuery({ username }, { enabled: username.length >= 3, retry: false });
  const target = targetQuery.data?.[0];
  const sendRequest = trpc.requests.send.useMutation({ onSuccess: () => setNotice("Request sent. They can accept or reject it from Requests.") , onError: (error) => setNotice(error instanceof Error ? error.message : "Unable to send connection request.") });

  if (!username) return <ConnectShell><StateCard icon={<X className="size-5" />} title="Invalid shared link" body="This link does not include a username. Ask your contact to create a new link in Settings." /></ConnectShell>;
  if (targetQuery.isLoading || loading) return <ConnectShell><StateCard icon={<Link2 className="size-5 animate-pulse" />} title="Loading connection" body="Checking the shared username…" /></ConnectShell>;
  if (!target) return <ConnectShell><StateCard icon={<X className="size-5" />} title="Username unavailable" body="This profile is not discoverable or the link has expired." /></ConnectShell>;

  return <ConnectShell><div className="mb-8 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><Fingerprint className="size-7" /></div><div className="mt-5 font-mono text-[10px] uppercase tracking-[0.26em] text-cyan-300/70">private connection request</div><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">Connect with {target.displayName || "this person"}</h1><p className="mt-2 text-sm leading-6 text-slate-400">{target.displayName || "VeilChat member"} is inviting you to start a private VeilChat conversation.</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex items-center gap-4"><div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-300 to-emerald-400 text-sm font-bold text-[#071014]">{target.avatarUrl ? <img src={target.avatarUrl} alt="" className="size-full object-cover" /> : (target.displayName || target.username).slice(0, 2).toUpperCase()}</div><div><div className="text-lg font-medium text-white">{target.displayName || "VeilChat member"}</div><div className="font-mono text-xs text-cyan-200/80">@{target.username}</div></div></div><div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.05] p-3 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" /><span>They will see your request and choose <strong className="text-slate-200">Accept</strong> or <strong className="text-slate-200">Reject</strong>. A chat opens only after acceptance.</span></div>{notice && <div className="mt-4 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2 font-mono text-[10px] text-cyan-200">{notice}</div>}{isAuthenticated ? <Button onClick={() => sendRequest.mutate({ recipientId: target.userId })} disabled={sendRequest.isPending || Boolean(notice)} className="mt-5 h-11 w-full bg-cyan-300 font-semibold text-[#071014] hover:bg-cyan-200">{sendRequest.isPending ? "Sending request…" : notice ? "Request sent" : "Request to connect"}</Button> : <Button onClick={() => startLogin(window.location.pathname + window.location.search)} className="mt-5 h-11 w-full bg-cyan-300 font-semibold text-[#071014] hover:bg-cyan-200">Sign in to connect</Button>}</div><div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600"><UserRound className="size-3.5" /><span>Already using VeilChat?</span><Link href="/" className="text-cyan-300/80 hover:text-cyan-200">Open workspace</Link></div></ConnectShell>;
}

function ConnectShell({ children }: { children: React.ReactNode }) {
  return <main className="veil-app grid min-h-screen place-items-center bg-[#070a0f] px-4 py-10 text-slate-100"><div className="w-full max-w-lg">{children}</div></main>;
}

function StateCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-7 text-center shadow-2xl shadow-black/30"><div className="mx-auto grid size-12 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-200">{icon}</div><h1 className="mt-5 font-display text-2xl font-semibold text-white">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-400">{body}</p><Link href="/" className="mt-6 inline-flex h-10 items-center rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-[#071014]">Back to VeilChat</Link></div>;
}
