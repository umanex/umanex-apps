type Props = {
  eyebrow: string;
  title: string;
  body?: string;
};

/**
 * De kop van een sectie: een klein label met accentlijn, de H2 en een inleidende zin.
 *
 * De eyebrow is bewust een `<p>` en geen kop-element. Hij ziet eruit als een label
 * maar draagt geen documentstructuur; als `<h3>` zou hij vóór de `<h2>` staan en de
 * koppenhiërarchie omdraaien voor wie met een schermlezer door de pagina springt.
 *
 * De accentlijn vóór de eyebrow is decoratief (aria-hidden) en tekent zichzelf bij
 * de scroll-onthulling — de `rule-draw`-class uit globals.css. Zonder JavaScript of
 * met reduced motion staat hij er gewoon.
 */
export const SectionHeading = ({ eyebrow, title, body }: Props) => (
  <header className="max-w-2xl">
    <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-accent">
      <span aria-hidden="true" className="rule-draw h-px w-8 bg-accent" />
      {eyebrow}
    </p>
    <h2 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-fg-primary md:text-5xl md:leading-tight">
      {title}
    </h2>
    {body ? <p className="mt-5 text-lg leading-relaxed text-fg-secondary">{body}</p> : null}
  </header>
);
