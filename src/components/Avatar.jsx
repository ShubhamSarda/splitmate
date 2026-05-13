function initialsFor(name, fallbackEmail) {
  const source = (name || fallbackEmail || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return source[0].toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Avatar({ name, email, size = 28 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full bg-stone-100 text-[11px] font-semibold text-stone-600"
      style={{ width: size, height: size }}
    >
      {initialsFor(name, email)}
    </div>
  );
}
