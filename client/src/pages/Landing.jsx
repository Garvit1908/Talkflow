import { Link } from "react-router-dom";
import Magnetic from "../components/Magnetic";

export default function Landing() {
  return (
    <div className="min-h-screen bg-workspace relative overflow-hidden text-ink font-sans selection:bg-lime selection:text-evergreen">
      {/* Subtle organic ambient gradients */}
      <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-evergreen/3 blur-[140px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-lime/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[25%] w-[40%] h-[40%] rounded-full bg-evergreen/2 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 px-6 py-4 md:px-12 md:py-6 flex items-center justify-between border-b border-border-subtle bg-workspace/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-evergreen flex items-center justify-center text-lime font-bold text-lg shadow-sm">
            T
          </div>
          <span className="text-2xl font-extrabold tracking-tight font-display text-ink">
            TalkFlow<span className="text-lime">.</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-5 py-2.5 text-sm font-semibold text-ink hover:text-evergreen hover:bg-evergreen/5 rounded-full transition-all duration-200"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="px-5 py-2.5 text-sm font-bold text-evergreen bg-lime hover:brightness-105 border border-evergreen/10 rounded-full transition-all duration-200 shadow-[0_2px_12px_rgba(217,250,87,0.4)] hover:scale-105"
          >
            Sign up free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-16 md:pt-28 md:pb-24 text-center max-w-5xl mx-auto">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-evergreen text-lime text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
          The Modern Messenger
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.05] text-ink font-display">
          Connect Instantly.<br />
          <span className="relative inline-block text-evergreen">
            Anywhere.
            <span className="absolute bottom-2 left-0 w-full h-3 bg-lime -z-10 -rotate-1 rounded-sm opacity-80" />
          </span>
        </h1>

        <p className="text-lg md:text-xl text-supporting mb-12 max-w-2xl leading-relaxed font-normal">
          Designed for high-craft conversations. Experience ultra-fast real-time messaging, crystal-clear WebRTC video calls, and seamless group collaboration.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Magnetic>
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 bg-lime text-evergreen font-bold text-base rounded-full hover:brightness-105 transition-all duration-300 shadow-[0_8px_25px_rgba(217,250,87,0.4)] hover:shadow-[0_12px_35px_rgba(217,250,87,0.6)] hover:-translate-y-0.5 border border-evergreen/10"
            >
              Start Chatting — It's Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </Magnetic>
          <Magnetic>
            <Link
              to="/login"
              className="w-full sm:w-auto block text-center px-8 py-4 bg-evergreen text-workspace font-semibold text-base rounded-full hover:bg-evergreen/90 transition-all duration-300 shadow-sm"
            >
              Sign in to TalkFlow
            </Link>
          </Magnetic>
        </div>
      </main>

      {/* Editorial Features Grid */}
      <section className="relative z-10 px-6 py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Evergreen Story Card */}
          <div className="bg-evergreen text-workspace p-8 rounded-3xl shadow-xl border border-evergreen relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute -right-10 -top-10 w-36 h-36 bg-lime/10 rounded-full blur-2xl pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-lime text-evergreen flex items-center justify-center mb-6 shadow-md font-bold group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="text-lime text-xs font-bold uppercase tracking-wider block mb-2 font-display">Real-Time Core</span>
            <h3 className="text-2xl font-bold mb-3 tracking-tight font-display text-white">Instant WebSocket Sync</h3>
            <p className="text-border-subtle text-sm leading-relaxed font-normal">
              Sub-millisecond delivery with live typing indicators, delivery checkmarks, and instant read receipts.
            </p>
          </div>

          {/* Card 2: Workspace White Card */}
          <div className="bg-white text-ink p-8 rounded-3xl shadow-[0_4px_24px_rgba(23,33,31,0.04)] border border-border-subtle hover:border-evergreen/30 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-workspace border border-border-subtle text-evergreen flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-supporting text-xs font-bold uppercase tracking-wider block mb-2 font-display">Video & Audio</span>
            <h3 className="text-2xl font-bold mb-3 tracking-tight font-display">HD Peer-to-Peer Calls</h3>
            <p className="text-supporting text-sm leading-relaxed font-normal">
              Direct WebRTC peer connectivity directly in the browser with end-call synchronization and instant ringers.
            </p>
          </div>

          {/* Card 3: Workspace White Card */}
          <div className="bg-white text-ink p-8 rounded-3xl shadow-[0_4px_24px_rgba(23,33,31,0.04)] border border-border-subtle hover:border-evergreen/30 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-workspace border border-border-subtle text-evergreen flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-supporting text-xs font-bold uppercase tracking-wider block mb-2 font-display">Teams & Groups</span>
            <h3 className="text-2xl font-bold mb-3 tracking-tight font-display">Effortless Group Rooms</h3>
            <p className="text-supporting text-sm leading-relaxed font-normal">
              Organize multi-user team discussions, add and manage participants, with real-time socket room broadcasting.
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border-subtle py-8 text-center text-supporting text-xs font-medium bg-workspace">
        <p>&copy; {new Date().getFullYear()} TalkFlow. Crafted with precision.</p>
      </footer>
    </div>
  );
}
