import { useEffect, useRef, useState, useCallback } from "react";
import SimplePeer from "simple-peer";

// TalkFlow Video Call Component - WebRTC Peer Connection with Smart Stream Fallback
function createFallbackStream(userName) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  const initial = (userName || "U").charAt(0).toUpperCase();

  const draw = () => {
    // Deep Evergreen surface
    ctx.fillStyle = "#182522";
    ctx.fillRect(0, 0, 640, 480);

    // Subtle background grid
    ctx.strokeStyle = "rgba(217, 250, 87, 0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 640; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }
    for (let y = 0; y < 480; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    // Glowing avatar circle
    const t = Date.now() / 900;
    const pulse = Math.sin(t) * 6;
    ctx.beginPath();
    ctx.arc(320, 200, 64 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = "#233530";
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#D9FA57";
    ctx.stroke();

    // User initial
    ctx.fillStyle = "#D9FA57";
    ctx.font = "bold 56px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initial, 320, 200);

    // User name
    ctx.fillStyle = "#FBFCF8";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(userName || "User", 320, 305);
  };

  draw();
  const timer = setInterval(draw, 250);

  const canvasStream = canvas.captureStream(15);
  const videoTrack = canvasStream.getVideoTracks()[0];
  videoTrack.addEventListener("ended", () => clearInterval(timer));

  // Create synthetic silent audio track so WebRTC audio negotiation always passes
  let audioTrack = null;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();
      audioTrack = dest.stream.getAudioTracks()[0];
    }
  } catch (e) {
    console.warn("Could not create synthetic audio track:", e);
  }

  const tracks = [videoTrack];
  if (audioTrack) tracks.push(audioTrack);
  return new MediaStream(tracks);
}

export default function VideoCall({ socket, callData, currentUser, onEndCall }) {
  const [stream, setStream] = useState(null);
  const [callStatus, setCallStatus] = useState("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isVirtualFeed, setIsVirtualFeed] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const hasStartedRef = useRef(false);

  // Timer for connected call duration
  useEffect(() => {
    if (callStatus !== "connected") return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const cleanup = useCallback(() => {
    const activeStream = streamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (socket) {
      socket.off("call-accepted");
    }
  }, [socket]);

  const startMedia = useCallback(async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    let mediaStream = null;
    let usingVirtual = false;

    // 1. Try real hardware camera + microphone
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch (fullErr) {
      console.warn("Hardware camera unavailable or in use by another tab. Using smart fallback:", fullErr.name);
      usingVirtual = true;
      setIsVirtualFeed(true);

      // 2. Try microphone only with virtual animated canvas video
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        const fallback = createFallbackStream(currentUser?.name);
        mediaStream = new MediaStream([
          fallback.getVideoTracks()[0],
          audioStream.getAudioTracks()[0],
        ]);
      } catch (audioErr) {
        console.warn("Microphone also unavailable. Using full synthetic stream:", audioErr);
        mediaStream = createFallbackStream(currentUser?.name);
      }
    }

    setStream(mediaStream);
    streamRef.current = mediaStream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = mediaStream;
      localVideoRef.current.play?.().catch(() => {});
    }

    const targetUserId =
      typeof callData.to === "object" ? callData.to._id : callData.to;

    if (callData.initiator) {
      // Caller: create peer as initiator
      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: mediaStream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
          ],
        },
      });

      peer.on("signal", (signal) => {
        socket.emit("call-user", {
          to: targetUserId,
          signal,
          from: currentUser.id,
          name: currentUser.name,
        });
      });

      peer.on("stream", (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play?.().catch((err) => console.warn("Remote playback error:", err));
        }
        setCallStatus("connected");
      });

      peer.on("error", (err) => {
        console.error("Caller peer error:", err);
      });

      // Listen for callee acceptance signal
      socket.on("call-accepted", (data) => {
        if (data?.signal && peer && !peer.destroyed) {
          peer.signal(data.signal);
          setCallStatus("connected");
        }
      });

      peerRef.current = peer;
      setCallStatus("ringing");
    } else {
      // Callee: create peer and signal back
      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream: mediaStream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
          ],
        },
      });

      peer.on("signal", (signal) => {
        socket.emit("accept-call", {
          to: targetUserId,
          signal,
        });
      });

      peer.on("stream", (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play?.().catch((err) => console.warn("Remote playback error:", err));
        }
        setCallStatus("connected");
      });

      peer.on("error", (err) => {
        console.error("Callee peer error:", err);
      });

      // Signal with caller's incoming offer
      if (callData.incomingSignal) {
        peer.signal(callData.incomingSignal);
      }
      peerRef.current = peer;
      setCallStatus("connecting");
    }
  }, [callData, currentUser, socket]);

  useEffect(() => {
    startMedia();

    if (socket) {
      socket.on("call-ended", () => {
        cleanup();
        onEndCall();
      });
      socket.on("call-rejected", () => {
        cleanup();
        onEndCall();
      });
    }

    return () => {
      if (socket) {
        socket.off("call-ended");
        socket.off("call-rejected");
        socket.off("call-accepted");
      }
      cleanup();
    };
  }, [startMedia, cleanup, socket, onEndCall]);

  const handleEndCall = () => {
    const targetUserId =
      typeof callData.to === "object" ? callData.to._id : callData.to;
    if (socket && targetUserId) {
      socket.emit("end-call", { to: targetUserId });
    }
    cleanup();
    onEndCall();
  };

  const toggleMute = () => {
    if (stream && stream.getAudioTracks().length > 0) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (stream && stream.getVideoTracks().length > 0) {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/85 z-50 flex items-center justify-center backdrop-blur-md animate-in fade-in duration-300 font-sans p-2 md:p-6">
      <div className="relative w-full h-full md:h-auto md:max-w-5xl md:aspect-video bg-evergreen md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
        
        {/* Remote Video (Full Screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-700 ${
            callStatus === "connected" ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Top Bar Status */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
          <div className="px-3.5 py-1.5 rounded-full bg-evergreen/80 backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-xs pointer-events-auto">
            <span
              className={`w-2 h-2 rounded-full ${
                callStatus === "connected"
                  ? "bg-lime animate-pulse"
                  : "bg-amber-400 animate-ping"
              }`}
            ></span>
            <span className="text-xs font-semibold text-workspace font-display">
              {callStatus === "connected"
                ? `Connected (${formatDuration(callDuration)})`
                : callStatus === "ringing"
                ? "Ringing..."
                : "Connecting..."}
            </span>
          </div>

          {isVirtualFeed && (
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium text-workspace/80 backdrop-blur-md">
              Camera Off
            </div>
          )}
        </div>
        
        {/* Connecting / Ringing State Overlay */}
        {callStatus !== "connected" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-evergreen z-10">
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-lime animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-evergreen/85 text-lime flex items-center justify-center font-bold text-sm">
                  {callData.callerName?.charAt(0) || callData.to?.name?.charAt(0) || "T"}
                </div>
              </div>
            </div>
            <h3 className="text-white font-display text-xl font-bold tracking-tight mb-1">
              {callData.callerName || callData.to?.name || "Video Call"}
            </h3>
            <p className="text-supporting font-medium text-sm">
              {callStatus === "ringing" ? "Waiting for recipient to answer..." : "Setting up secure connection..."}
            </p>
          </div>
        )}

        {/* Local Video (PiP) */}
        <div className="absolute bottom-24 right-4 md:bottom-8 md:right-8 w-32 md:w-56 aspect-video bg-evergreen rounded-xl md:rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 hover:scale-105 transition-transform duration-200 z-30">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {isVideoOff && (
            <div className="absolute inset-0 bg-evergreen flex items-center justify-center text-white/50 text-xs font-semibold">
              Camera Off
            </div>
          )}
          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-evergreen/80 backdrop-blur-md rounded-md text-[10px] text-white font-medium flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 rounded-full bg-lime"></span>
             You
          </div>
        </div>

        {/* Controls Bar */}
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-4 px-5 py-3 bg-evergreen/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl z-40">
          {/* Audio Mute */}
          <button
            onClick={toggleMute}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer ${
              isMuted 
                ? "bg-red-500/30 text-red-400 border border-red-500/50" 
                : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            )}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={toggleVideo}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer ${
              isVideoOff 
                ? "bg-red-500/30 text-red-400 border border-red-500/50" 
                : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
            }`}
            title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isVideoOff ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          
          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full font-display font-bold text-xs tracking-wide transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 8l2-2m0 0l2-2m-2 2l-2 2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}
