interface Props {
  small?: boolean
}

export default function LiveBadge({ small = false }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-body font-bold uppercase tracking-widest text-white bg-red rounded ${
        small ? 'text-[9px] px-1.5 py-[2px]' : 'text-[10px] px-2 py-0.5'
      }`}
    >
      <span className="w-[5px] h-[5px] rounded-full bg-white animate-pulse" />
      LIVE
    </span>
  )
}
