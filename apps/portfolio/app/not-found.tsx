import Link from 'next/link';
import { Container } from '@/components/layout/Container';

export default function NotFound() {
  return (
    <section className="py-32">
      <Container className="space-y-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Pagina niet gevonden</h1>
        <p className="text-muted-foreground">
          Deze pagina bestaat niet (meer).
        </p>
        <Link href="/" className="inline-block font-medium text-primary hover:underline">
          Terug naar home
        </Link>
      </Container>
    </section>
  );
}
