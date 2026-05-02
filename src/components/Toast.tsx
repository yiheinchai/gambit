import { useEffect, useState } from "react";

interface Props {
  message: string;
  type?: "success" | "info";
  duration?: number;
  onDone?: () => void;
}

export default function Toast({ message, type = "success", duration = 3000, onDone }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone?.(), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDone]);

  const bg = type === "success" ? "var(--green)" : "var(--blue)";
  const shadow = type === "success" ? "var(--green-dark)" : "#1E3A8A";

  return (
    <div style={{
      position: "fixed", top: 24, left: "50%", transform: `translateX(-50%) translateY(${visible ? 0 : -60}px)`,
      background: bg, color: "white", padding: "12px 24px", borderRadius: 14,
      fontFamily: "var(--sans)", fontWeight: 800, fontSize: 14, letterSpacing: 0.4,
      boxShadow: `0 4px 0 ${shadow}`, zIndex: 100,
      opacity: visible ? 1 : 0, transition: "transform 300ms, opacity 300ms",
    }}>
      {message}
    </div>
  );
}
