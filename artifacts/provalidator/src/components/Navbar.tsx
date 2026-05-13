import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, Scan, Video, Clock, Info, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Home", icon: Shield },
  { href: "/detect-image", label: "Image Detector", icon: Scan },
  { href: "/detect-video", label: "Video Detector", icon: Video },
  { href: "/history", label: "History", icon: Clock },
  { href: "/about", label: "About System", icon: Info },
];

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div
        className="border-b border-[rgba(0,212,255,0.12)]"
        style={{
          background: "rgba(6, 10, 20, 0.8)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 4px 32px rgba(0,212,255,0.04)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer group">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center animate-glow-pulse"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(168,85,247,0.2))",
                    border: "1px solid rgba(0,212,255,0.4)",
                  }}
                >
                  <Shield className="w-4 h-4 text-[#00d4ff]" />
                </div>
                <span
                  className="font-bold text-xl tracking-wider text-neon-blue"
                  style={{ letterSpacing: "0.15em" }}
                >
                  PRO<span className="text-[#a855f7]">VALIDATOR</span>
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = location === link.href;
                return (
                  <Link key={link.href} href={link.href}>
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      className="relative px-4 py-2 rounded-lg cursor-pointer group"
                    >
                      <span
                        className="text-sm font-medium tracking-wide transition-colors duration-200"
                        style={{
                          color: active ? "#00d4ff" : "rgba(226,232,240,0.7)",
                          textShadow: active ? "0 0 10px rgba(0,212,255,0.5)" : "none",
                        }}
                      >
                        {link.label}
                      </span>
                      {active && (
                        <motion.div
                          layoutId="navbar-underline"
                          className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                          style={{
                            background: "linear-gradient(90deg, transparent, #00d4ff, transparent)",
                            boxShadow: "0 0 8px rgba(0,212,255,0.8)",
                          }}
                        />
                      )}
                      <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ background: "rgba(0,212,255,0.05)" }}
                      />
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden text-[rgba(226,232,240,0.7)] hover:text-[#00d4ff] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
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
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                    style={{
                      background: active ? "rgba(0,212,255,0.08)" : "transparent",
                      color: active ? "#00d4ff" : "rgba(226,232,240,0.7)",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{link.label}</span>
                  </div>
                </Link>
              );
            })}
          </motion.div>
        )}
      </div>
    </nav>
  );
}
