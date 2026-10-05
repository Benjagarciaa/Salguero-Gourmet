import { Hero } from "@/components/sections/Hero";
import { Servicios } from "@/components/sections/Servicios";
import { Empresas } from "@/components/sections/Empresas";
import { Galeria } from "@/components/sections/Galeria";
import { Flor } from "@/components/sections/Flor";
import { Resenas } from "@/components/sections/Resenas";
import { Proceso } from "@/components/sections/Proceso";
import { Faq } from "@/components/sections/Faq";
import { Cotizador } from "@/components/sections/Cotizador";

export default function Page() {
  return (
    <main>
      <Hero />
      <Servicios />
      {/* Empresas justo después de Servicios (Benjamin, 30/9/2026). */}
      <Empresas />
      <Galeria />
      <Flor />
      <Resenas />
      <Proceso />
      <Faq />
      <Cotizador />
    </main>
  );
}
