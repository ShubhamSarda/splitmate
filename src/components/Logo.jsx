/**
 * Theme-aware logo: logo-dark.png has the "mate" wordmark recolored to
 * off-white so it stays legible on dark surfaces.
 */
export default function Logo({ className = "h-8 w-auto" }) {
  return (
    <>
      <img
        src="/logo.png"
        alt="Splitmate"
        className={`${className} dark:hidden`}
      />
      <img
        src="/logo-dark.png"
        alt="Splitmate"
        className={`hidden ${className} dark:block`}
      />
    </>
  );
}
