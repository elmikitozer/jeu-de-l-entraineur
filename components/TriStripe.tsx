interface Props {
  height?: number
}

export default function TriStripe({ height = 5 }: Props) {
  return (
    <div
      className="flex overflow-hidden"
      style={{ height, borderRadius: height / 2 }}
    >
      <span className="flex-1 bg-green" />
      <span className="flex-1 bg-blue" />
      <span className="flex-1 bg-red" />
    </div>
  )
}
