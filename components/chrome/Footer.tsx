import { Wordmark } from "@/components/ui/Wordmark";
import { Container } from "@/components/ui/Section";
import { footer } from "@/content/data";

export function Footer() {
  return (
    <footer className="border-t border-hairline pb-14 pt-10">
      <Container className="flex flex-col items-center gap-4 text-center text-[13.5px] text-crema-dim min-[760px]:flex-row min-[760px]:justify-between min-[760px]:text-left">
        <Wordmark className="text-[13px]" />
        <span>{footer.tagline}</span>
        <span>{footer.copyright}</span>
      </Container>
    </footer>
  );
}
