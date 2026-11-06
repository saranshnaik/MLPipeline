type Props = { ready: boolean | null };

const styles = {
  online: { box: "border-emerald-900 bg-emerald-950/50 text-emerald-300", dot: "bg-emerald-400", text: "API online" },
  offline: { box: "border-red-900 bg-red-950/50 text-red-300", dot: "bg-red-400", text: "API unreachable" },
  waking: {
    box: "border-amber-900 bg-amber-950/50 text-amber-300",
    dot: "animate-pulse bg-amber-400",
    text: "Waking up server...",
  },
};

export function StatusBadge({ ready }: Props) {
  const s = ready === true ? styles.online : ready === false ? styles.offline : styles.waking;
  return (
    <div
      role="status"
      className={`inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm ${s.box}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.text}
    </div>
  );
}
