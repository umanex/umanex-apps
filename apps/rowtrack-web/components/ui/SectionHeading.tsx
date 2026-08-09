type Props = {
  eyebrow: string;
  title: string;
  body?: string;
};

/**
 * De kop van een sectie: een klein label, de H2 en een inleidende zin.
 *
 * De eyebrow is bewust een `<p>` en geen kop-element. Hij ziet eruit als een label
 * maar draagt geen documentstructuur; als `<h3>` zou hij vóór de `<h2>` staan en de
 * koppenhiërarchie omdraaien voor wie met een schermlezer door de pagina springt.
 */
export const SectionHeading = ({ eyebrow, title, body }: Props) => (
  <header className="max-w-2xl">
    <p className="text-sm font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>
    <h2 className="mt-3 font-serif text-4xl text-fg-primary">{title}</h2>
    {body ? <p className="mt-4 text-lg leading-relaxed text-fg-secondary">{body}</p> : null}
  </header>
);
