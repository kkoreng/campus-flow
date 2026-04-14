import Image from 'next/image'

interface Props {
  size?: number
  className?: string
}

export default function LogoIcon({ size = 24, className }: Props) {
  return (
    <Image
      src="/logo.svg"
      alt="CampusFlow logo"
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  )
}
