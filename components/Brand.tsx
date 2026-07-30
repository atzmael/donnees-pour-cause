import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link className="wordmark" href="/" aria-label="Données en cause, accueil">
      <Image className="brand-logo" src="/logo.png" alt="" width={40} height={40} priority />
      <span className="brand-name">données<span>/en cause</span></span>
    </Link>
  );
}
