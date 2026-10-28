import logo from '@/assets/logo.png'
import { cn } from '@/lib/utils'

/** Logo Harrasima (PNG transparan, oranye). Atur ukuran lewat className, mis. "size-10". */
export default function BrandLogo({ className }) {
  return (
    <img
      src={logo}
      alt="Harrasima"
      width={512}
      height={494}
      className={cn('shrink-0 object-contain', className)}
    />
  )
}
