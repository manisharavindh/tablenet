export default function Logo({ className = "w-64 h-auto" }) {
  return (
    <svg viewBox="0 0 340 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@1,900&amp;display=swap');
        </style>
      </defs>
      <text
        x="170"
        y="55"
        fontFamily="'Montserrat', sans-serif"
        fontWeight="900"
        fontSize="62"
        letterSpacing="-2"
        textAnchor="middle"
        fill="#E23744"
        style={{ fontStyle: 'italic' }}
      >
        tablenet
      </text>
    </svg>
  );
}
