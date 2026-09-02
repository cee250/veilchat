import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, Image as ImageIcon, RefreshCw, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export default function QrScannerModal({ isOpen, onClose, onScan }: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopStream = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (deviceId?: string) => {
    stopStream();
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        scanLoop();
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setCameras(videoDevices);
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Camera permission denied. Please allow camera access in browser settings, or upload a QR image.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("No camera found on this device. You can upload a QR image instead.");
      } else {
        setError("Unable to start video stream. You can upload a QR image instead.");
      }
    }
  };

  const scanLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      try {
        if (navigator.vibrate) navigator.vibrate(50);
      } catch {
        /* ignore */
      }
      onScan(code.data);
      onClose();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(scanLoop);
  };

  const handleFileUpload = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          onScan(code.data);
          onClose();
        } else {
          setError("No QR code detected in this image. Please try a clearer screenshot or photo.");
        }
      };
      img.src = String(e.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const nextIndex = (activeCameraIndex + 1) % cameras.length;
    setActiveCameraIndex(nextIndex);
    startCamera(cameras[nextIndex].deviceId);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Scan Invite QR</h3>
              <p className="text-xs text-slate-400">Point your camera at a VeilChat QR code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close scanner"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative aspect-square w-full bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          <div className="relative z-10 w-64 h-64 border-2 border-emerald-400/40 rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
            <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />
          </div>

          {error && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 backdrop-blur-sm">
              <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-red-500/10 text-red-400">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm text-slate-200 mb-4 max-w-xs">{error}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startCamera()}
                  className="rounded-xl border-slate-700 hover:bg-slate-800 text-xs"
                >
                  <RefreshCw size={14} className="mr-1.5" /> Retry Camera
                </Button>
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                >
                  <ImageIcon size={14} className="mr-1.5" /> Upload Image
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-t border-slate-800">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-emerald-400 transition-colors"
          >
            <ImageIcon size={16} /> Upload QR Screenshot
          </button>

          {cameras.length > 1 && (
            <button
              type="button"
              onClick={switchCamera}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-emerald-400 transition-colors"
            >
              <RefreshCw size={14} /> Switch Camera
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
