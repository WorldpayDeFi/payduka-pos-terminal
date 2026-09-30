import { useState, useEffect } from "react";
import {
  verifyPinHash,
  isLocked,
  recordFailedAttempt,
  clearFailedAttempts,
} from "@/lib/secure-auth";

type Cashier = {
  id: string;
  name: string;
  role: string;
  pin_hash: string;
  color: string;
};

// Fallback demo cashiers (same hashes as schema seed)
// In production, load these from PowerSync / Supabase instead
const DEMO_CASHIERS: Cashier[] = [
  {
    id: "c1",
    name: "Thabo",
    role: "Manager",
    pin_hash:
      "GBFXEpqdqDV+MwWVNjrKxQ==$100000$g54Buavr5rNBvewYTM/PQT8dXi12G3E+5obhqWEtWEs=",
    color: "#00c9b1",
  },
  {
    id: "c2",
    name: "Nomsa",
    role: "Cashier",
    pin_hash:
      "3GlrcnY4z3loX1d/Tky8uQ==$100000$HIbgjfzxLdXiTeVSRAgqt5vRiEmtqN0LVtHCCNUxYNg=",
    color: "#f4c430",
  },
  {
    id: "c3",
    name: "Sipho",
    role: "Cashier",
    pin_hash:
      "cj2MEnAsm5TulsDs+aGjRA==$100000$t3N7Huw43VYcF8v6kZ9tFXXrCaU1jj7XmS95dbh+zXg=",
    color: "#8b5cf6",
  },
];

type Props = {
  onLogin: (cashier: Cashier, sessionId: string) => void;
};

export default function LoginPage({ onLogin }: Props) {
  const [cashiers] = useState<Cashier[]>(DEMO_CASHIERS);
  const [selected, setSelected] = useState<Cashier | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pin.length === 4 && selected) {
      void handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  function press(digit: string) {
    if (pin.length >= 4 || busy) return;
    setError("");
    setPin((p) => p + digit);
  }

  function del() {
    setPin((p) => p.slice(0, -1));
    setError("");
  }

  async function handleVerify() {
    if (!selected || pin.length !== 4) return;

    const lock = isLocked(selected.id);
    if (lock.locked) {
      setError(`Locked — try again in ${Math.ceil(lock.remainingMs / 1000)}s`);
      setPin("");
      return;
    }

    setBusy(true);
    try {
      const ok = await verifyPinHash(pin, selected.pin_hash);
      if (ok) {
        clearFailedAttempts(selected.id);
        const sessionId = "sess_" + crypto.randomUUID().slice(0, 8);
        onLogin(selected, sessionId);
      } else {
        const result = recordFailedAttempt(selected.id);
        if (result.locked) {
          setError(`Wrong PIN — locked for ${Math.ceil(result.remainingMs / 1000)}s`);
        } else {
          setError(`Wrong PIN (${result.fails} fails)`);
        }
        setPin("");
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Cashier select ────────────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#111827] border border-[#1e2d40] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00c9b1] to-[#0099a0] flex items-center justify-center font-bold text-[#0a0f1e] text-sm">
              PD
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                Pay<span className="text-[#00c9b1]">Duka</span>
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                Select cashier
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {cashiers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelected(c);
                  setPin("");
                  setError("");
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#1e2d40] hover:border-[#00c9b1] hover:bg-[#00c9b1]/10 transition text-left"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-[#0a0f1e]"
                  style={{ background: c.color }}
                >
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{c.name}</div>
                  <div className="text-[10px] text-gray-500 uppercase">{c.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── PIN entry ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111827] border border-[#1e2d40] rounded-2xl p-6 shadow-xl">
        <button
          onClick={() => {
            setSelected(null);
            setPin("");
            setError("");
          }}
          className="text-xs text-gray-500 border border-[#1e2d40] rounded-lg px-3 py-1.5 mb-4 hover:border-[#00c9b1] hover:text-[#00c9b1]"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-[#0a0f1e]"
            style={{ background: selected.color }}
          >
            {selected.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-base font-bold text-white">{selected.name}</div>
            <div className="text-[10px] text-gray-500 font-mono">Enter 4-digit PIN</div>
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-3 mb-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition ${
                i < pin.length
                  ? "bg-[#00c9b1] border-[#00c9b1]"
                  : "border-[#1e2d40]"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 text-center text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg py-2 px-3">
            {error}
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
            (key, i) => {
              if (key === "") return <div key={i} />;
              return (
                <button
                  key={i}
                  disabled={busy}
                  onClick={() => (key === "⌫" ? del() : press(key))}
                  className="py-4 rounded-xl border border-[#1e2d40] text-white font-mono text-lg font-bold hover:border-[#00c9b1] hover:text-[#00c9b1] active:scale-95 transition disabled:opacity-40"
                >
                  {key}
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
