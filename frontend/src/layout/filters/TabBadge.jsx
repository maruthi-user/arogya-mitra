export default function TabBadge({ count = 0 }) {
  if (!count || count <= 0) return null;

  return (
    <span
      className="
        inline-flex
        items-center
        justify-center
        min-w-[18px]
        h-[18px]
        px-1
        ml-1
        rounded-full
        bg-yellow-400
        text-black
        text-xs
        font-bold
        leading-none
        align-super
        relative
        -top-0.3
      "
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
