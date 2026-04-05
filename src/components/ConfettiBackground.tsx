import { useMemo } from "react";

export function ConfettiBackground() {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`,
      size: `${4 + Math.random() * 6}px`,
      color: [
        "hsl(330 65% 55%)",
        "hsl(25 80% 60%)",
        "hsl(270 40% 65%)",
        "hsl(45 90% 65%)",
        "hsl(180 50% 60%)",
      ][Math.floor(Math.random() * 5)],
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-20"
          style={{
            left: p.left,
            top: "-10px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration} ${p.delay} infinite linear`,
          }}
        />
      ))}
    </div>
  );
}
