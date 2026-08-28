import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ScanLine } from "lucide-react";
import { makeIdentityCard, parseIdentityCard, type IdentityCard } from "@shared/identity";

export function IdentityQr({ username, publicKeyFingerprint, onScanned }: { username: string; publicKeyFingerprint: string; onScanned: (card: IdentityCard) => void }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const payload = JSON.stringify(makeIdentityCard(username, publicKeyFingerprint));

  useEffect(() => { QRCode.toDataURL(payload, { width: 220, margin: 2, color: { dark: "#071014", light: "#8ff5ff" } }).then(setQrUrl).catch(() => setError("Unable to generate identity QR.")); }, [payload]);

  const stop = async () => { if (scannerRef.current) { await scannerRef.current.stop().catch(() => undefined); scannerRef.current.clear(); scannerRef.current = null; } setScanning(false); };
  const start = async () => { setError(null); setScanSuccess(false); setScanning(true); const scanner = new Html5Qrcode("veilchat-qr-reader"); scannerRef.current = scanner; try { await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 220 }, (value) => { try { const card = parseIdentityCard(value); setScanSuccess(true); onScanned(card); void stop(); } catch { setError("That code is not a valid VeilChat identity."); } }, () => undefined); } catch { setError("Camera unavailable. Allow camera access or use the displayed QR on another device."); setScanning(false); } };

  return <div className="space-y-3"><div className="flex flex-wrap items-center gap-4"><div className="grid size-[220px] place-items-center rounded-xl bg-cyan-100 p-2">{qrUrl ? <img src={qrUrl} alt="Your VeilChat identity QR" className="size-full rounded-lg" /> : <span className="text-xs text-slate-700">Generating…</span>}</div><div className="min-w-0 flex-1"><div className="font-mono text-xs text-cyan-200">{username || "@your-username"}</div><div className="mt-2 text-[10px] leading-4 text-slate-500">This code contains your username and a public-key fingerprint only. It never contains a password, private key, or phone number.</div><div className="mt-3 flex gap-2"><Button type="button" variant="outline" onClick={() => void start()} disabled={scanning} className="border-white/10 bg-transparent text-xs text-slate-300">Scan identity</Button>{scanning && <Button type="button" variant="outline" onClick={() => void stop()} className="border-white/10 bg-transparent text-xs text-slate-300">Stop camera</Button>}</div></div></div>{scanning && <div className="relative max-w-sm overflow-hidden rounded-xl border border-cyan-300/30 bg-black"><div id="veilchat-qr-reader" className="min-h-[280px]" /><div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="relative size-56 border border-cyan-300/70 shadow-[0_0_0_999px_rgba(3,8,12,0.52)]"><span className="absolute -left-px -top-px size-7 border-l-2 border-t-2 border-cyan-200" /><span className="absolute -right-px -top-px size-7 border-r-2 border-t-2 border-cyan-200" /><span className="absolute -bottom-px -left-px size-7 border-b-2 border-l-2 border-cyan-200" /><span className="absolute -bottom-px -right-px size-7 border-b-2 border-r-2 border-cyan-200" /><span className="absolute left-0 right-0 top-1/2 h-px animate-pulse bg-cyan-300 shadow-[0_0_12px_2px_rgba(103,232,249,0.8)]" /></div></div><div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-cyan-100"><ScanLine className="size-3" /> Align identity code</div></div>}{scanSuccess && <div className="flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-2 font-mono text-[10px] text-emerald-200"><CheckCircle2 className="size-4" /> Key scanned. Review the fingerprint before accepting.</div>}{error && <div className="font-mono text-[10px] text-rose-300">{error}</div>}</div>;
}
