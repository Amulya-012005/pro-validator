import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Scan, Video, Clock, Info, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home", icon: Shield },
  { href: "/detect-image", label: "Image Detector", icon: Scan },
  { href: "/detect-video", label: "Video Detector", icon: Video },
  { href: "/history", label: "History", icon: Clock },
  { href: "/about", label: "About", icon: Info },
];

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div
        className="border-b border-[rgba(0,212,255,0.10)]"
        style={{
          background: "rgba(5, 8, 16, 0.82)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          boxShadow: "0 4px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(0,212,255,0.08)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer group">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center animate-glow-pulse relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,212,255,0.25), rgba(168,85,247,0.25))",
                    border: "1px solid rgba(0,212,255,0.45)",
                  }}
                >
                  <Shield className="w-4 h-4 text-[#00d4ff] relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,212,255,0.1)] to-[rgba(168,85,247,0.1)]" />
                </div>
                <div className="flex flex-col leading-none">
                  <span
                    className="font-bold text-lg tracking-[0.18em] font-orbitron"
                    style={{ color: "#00d4ff", textShadow: "0 0 12px rgba(0,212,255,0.5)" }}
                  >
                    PRO<span style={{ color: "#a855f7", textShadow: "0 0 12px rgba(168,85,247,0.5)" }}>VALIDATOR</span>
                  </span>
                  <span className="text-[9px] text-[rgba(0,212,255,0.4)] tracking-[0.3em] uppercase font-mono -mt-0.5">
                    AI Forensics
                  </span>
                </div>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = location === link.href;
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      className="relative px-4 py-2 rounded-xl cursor-pointer group flex items-center gap-2"
                    >
                      <Icon
                        className="w-3.5 h-3.5 transition-colors duration-200"
                        style={{ color: active ? "#00d4ff" : "rgba(226,232,240,0.35)" }}
                      />
                      <span
                        className="text-sm font-medium tracking-wide transition-colors duration-200 font-sora"
                        style={{
                          color: active ? "#00d4ff" : "rgba(226,232,240,0.65)",
                          textShadow: active ? "0 0 12px rgba(0,212,255,0.5)" : "none",
                        }}
                      >
                        {link.label}
                      </span>
                      {active && (
                        <motion.div
                          layoutId="navbar-underline"
                          className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                          style={{
                            background: "linear-gradient(90deg, transparent, #00d4ff, transparent)",
                            boxShadow: "0 0 10px rgba(0,212,255,0.8)",
                          }}
                        />
                      )}
                      <div
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ background: "rgba(0,212,255,0.05)" }}
                      />
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            <button
              className="md:hidden text-[rgba(226,232,240,0.7)] hover:text-[#00d4ff] transition-colors p-2 rounded-lg hover:bg-[rgba(0,212,255,0.08)]"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-[rgba(0,212,255,0.08)] px-4 py-3 space-y-1"
            >
              {navLinks.map((link) => {
                const active = location === link.href;
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <div
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: active ? "rgba(0,212,255,0.08)" : "transparent",
                        border: active ? "1px solid rgba(0,212,255,0.15)" : "1px solid transparent",
                        color: active ? "#00d4ff" : "rgba(226,232,240,0.7)",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium font-sora">{link.label}</span>
                    </div>
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
