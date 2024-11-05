'use client'
import Link from "next/link"
import Image from "next/image";

export default function Footer() {
  const companyLinks = [
    { href: "/nosotros", label: "Sobre Nosotros" },
    { href: "/contacto", label: "Contacto" },
  ];

  const servicesLinks = [
    { href: "#web", label: "Desarrollo Web" },
    { href: "#landing", label: "Landing pages" },
    { href: "#integrations", label: "Integraciones" },
    { href: "#consulting", label: "Consultoría" },
  ];

  const legalLinks = [
    { href: "#privacy", label: "Privacidad" },
    { href: "#terms", label: "Términos" },
  ];

  // const socialLinks = [
  //   { href: "https://www.facebook.com/ProMediaMexico/", label: "Facebook", icon: <Facebook className="h-6 w-6" /> },
  //   { href: "https://www.instagram.com/promediamx", label: "Instagram", icon: <Instagram className="h-6 w-6" /> },
  //   { href: "https://www.linkedin.com/company/promediamexico", label: "LinkedIn", icon: <Linkedin className="h-6 w-6" /> },
  // ];

  return (
    <footer className="bg-muted py-12 px-6 sm:px-6 lg:px-8 bg-black">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start">

        {/* Logo y descripción */}
        <div className="mb-8 md:mb-0 md:w-1/3 ">
          <Link href="/" className="flex items-center">
            <span className="sr-only">ProMedia México</span>
            <Image
              src="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logo_dark_gray.svg" alt="ProMedia" width={120} height={30} className="block h-5 md:h-8 w-auto"
            />
          </Link>
          <p className="text-sm text-muted-foreground pr-12 mt-5">
            Ayudamos a crear una oferta comercial para tu empresa a través de la tecnología y la innovación.
          </p>
        </div>

        {/* Enlaces y redes sociales */}
        <div className="flex flex-wrap md:w-2/3 justify-end">
          {/* Enlaces */}
          <div className="w-full sm:w-1/2 md:w-1/4 lg:w-1/4 mb-8 md:mb-0">
            <h3 className="text-sm font-semibold mb-4">Empresa</h3>
            <ul className="space-y-2">
              {companyLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full sm:w-1/2 md:w-1/4 lg:w-1/4 mb-8 md:mb-0">
            <h3 className="text-sm font-semibold mb-4">Servicios</h3>
            <ul className="space-y-2">
              {servicesLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full sm:w-1/2 md:w-1/4 lg:w-1/4 mb-8 md:mb-0">
            <h3 className="text-sm font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Redes sociales */}
          <div className="w-full sm:w-1/2 md:w-1/4 lg:w-1/4">
            <h3 className="text-sm font-semibold mb-4">Síguenos</h3>
            <div className="flex space-x-4">
              {/* {socialLinks.map(link => (
                <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
                  <span className="sr-only">{link.label}</span>
                  {link.icon}
                </Link>
              ))} */}
            </div>
          </div>
        </div>
      </div>

      {/* Derechos de autor */}
      <div className="mt-8 pt-8 border-t border-muted-foreground/10">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ProMedia México. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}