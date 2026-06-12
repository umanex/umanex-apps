import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { copy } from '@/lib/copy';

export default function NotFound() {
  return (
    <section className="py-32">
      <Container className="space-y-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{copy.notFound.title}</h1>
        <p className="text-muted-foreground">{copy.notFound.body}</p>
        <Link
          href={copy.notFound.link.href}
          className="inline-block font-medium text-primary hover:underline"
        >
          {copy.notFound.link.label}
        </Link>
      </Container>
    </section>
  );
}
