export default function Logo({ className = "w-64 h-auto" }) {
  return (
    <svg viewBox="0 0 340 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <text
        x="170"
        y="55"
        fontFamily="'Outfit', 'Inter', sans-serif"
        fontWeight="900"
        fontSize="62"
        letterSpacing="-2"
        textAnchor="middle"
        className="fill-theme-text-main"
        style={{ fontStyle: 'normal' }}
      >
        tablenet
      </text>
    </svg>
  );
}
