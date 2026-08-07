import { Hero } from "@/components/sections/Hero";
import { Servicios } from "@/components/sections/Servicios";
import { Galeria } from "@/components/sections/Galeria";
import { Flor } from "@/components/sections/Flor";
import { Resenas } from "@/components/sections/Resenas";

export default function Page() {
  return (
    <main>
      <Hero />
      <Servicios />
      <Galeria />
      <Flor />
      <Resenas />
    </main>
  );
}
