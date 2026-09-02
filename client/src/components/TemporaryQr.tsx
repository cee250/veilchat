import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, QrCode, ScanLine, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type TemporaryQrProps = {
  inviteUrl: string;
  onScan: () => void;
};

export default function TemporaryQr({ inviteUrl, onScan }: TemporaryQrProps) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let active = true;
    if (!inviteUrl) {
      setDataUrl("");
      return () => { active = false; };
    }
    QRCode.toDataURL(inviteUrl, {
      width: 420,
      margin: 2,
      color: { dark: "#17212b", light: "#eef7f6" },
      errorCorrectionLevel: "H",
    }).then((url) => {
      if (active) setDataUrl(url);
    });
    return () => { active = false; };
  }, [inviteUrl]);

  async function shareInvite() {
    if (!inviteUrl) return;
    if (navigator.share) {
      await navigator.share({ title: "VeilChat temporary room", text: "Join my temporary VeilChat room", url: inviteUrl });
    } else {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied");
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied");
  }

  function downloadQr() {
    if (!dataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = "veilchat-temporary-room.png";
    anchor.click();
    toast.success("QR code downloaded");
  }

  return (
    <section className="qr-panel hud-panel" aria-label="Temporary QR invitation">
      <div className="panel-kicker"><QrCode size={14} /> ROOM INVITE</div>
      <div className="qr-layout">
        <div className="qr-frame">
          {dataUrl ? <img src={dataUrl} alt="Scannable temporary VeilChat room invitation" /> : <div className="qr-empty"><QrCode size={42} /></div>}
          <span className="corner corner-tl" /><span className="corner corner-tr" /><span className="corner corner-bl" /><span className="corner corner-br" />
        </div>
        <div className="qr-copy">
          <p className="eyebrow">SHARE INVITE</p>
          <h3>One room. Two people.</h3>
          <p>Share with one person. The room expires in 30 minutes or when ended.</p>
          <div className="button-grid">
            <Button onClick={shareInvite} className="neon-button"><Share2 size={16} /> Share</Button>
            <Button onClick={downloadQr} variant="outline" className="outline-button"><Download size={16} /> Download</Button>
            <Button onClick={copyInvite} variant="outline" className="outline-button"><Copy size={16} /> Copy link</Button>
            <Button onClick={onScan} variant="ghost" className="scan-button"><ScanLine size={16} /> Scan invite</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
