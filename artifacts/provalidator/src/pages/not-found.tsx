import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#060a14" }}>
      <div className="absolute inset-0 cyber-grid opacity-40 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center px-4"
      >
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-glow-pulse" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <AlertTriangle className="w-9 h-9 text-red-400" />
        </div>
        <h1 className="text-6xl font-extrabold font-mono mb-4" style={{ color: "#00d4ff", textShadow: "0 0 30px rgba(0,212,255,0.5)" }}>
          404
        </h1>
        <p className="text-white text-xl font-semibold mb-2">Page Not Found</p>
        <p className="text-[rgba(226,232,240,0.4)] text-sm mb-8">The requested sector does not exist in this neural network.</p>
        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="neon-btn-blue px-6 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Base
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
