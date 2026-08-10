import { Hero } from "@/components/sections/Hero";
import { Servicios } from "@/components/sections/Servicios";
import { Galeria } from "@/components/sections/Galeria";
import { Flor } from "@/components/sections/Flor";
import { Resenas } from "@/components/sections/Resenas";
import { Proceso } from "@/components/sections/Proceso";
import { Empresas } from "@/components/sections/Empresas";
import { Faq } from "@/components/sections/Faq";
import { CotizadorLazy } from "@/components/sections/CotizadorLazy";

export default function Page() {
  return (
    <main>
      <Hero />
      <Servicios />
      <Galeria />
      <Flor />
      <Resenas />
      <Proceso />
      <Empresas />
      <Faq />
      <CotizadorLazy />
    </main>
  );
}
