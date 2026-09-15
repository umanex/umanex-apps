import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@umanex/ui/components/ui/card';
import { Badge } from '@umanex/ui/components/ui/badge';
import { GeenMeting } from '@/components/cockpit/GeenMeting';
import { Meetstempel } from '@/components/cockpit/Meetstempel';
import { Tegel } from '@/components/cockpit/Tegel';

export type KlantSamenvatting = {
  slug: string;
  naam: string;
  rol: 'eigen' | 'klant' | 'systeem';
  /** Null wanneer er nog niet gemeten is — dan toont de kaart geen enkel getal. */
  meting: {
    moment: string;
    dagen: number;
    staat: 'vers' | 'verouderd';
    projecten: number;
    openItems: number;
    openNoemer: number;
    briefings: number;
    zonderBewijs: number;
    itemsTotaal: number;
    laagAfwijkend: number;
    laagRijen: number;
    debtMeetbaar: boolean;
    debtReden: string;
    debtTotaal: number;
    debtBestanden: number;
  } | null;
  reden: string | null;
};

const ROL_LABEL: Record<KlantSamenvatting['rol'], string> = {
  eigen: 'eigen werk',
  klant: 'klant',
  systeem: 'systeem',
};

/**
 * Eén klant op de portfolio-pagina: vier assen, elk met zijn noemer en een weg naar binnen.
 *
 * Er staat bewust geen samenvattend rapportcijfer op. Vier getallen die je kunt natrekken
 * zeggen meer dan één dat je moet geloven, en een score verbergt welke as beweegt.
 */
export const KlantKaart = ({ klant }: { klant: KlantSamenvatting }) => (
  <Card>
    <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
      <div className="min-w-0">
        <CardTitle className="text-base">
          <Link
            href={`/cockpit/${klant.slug}`}
            className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {klant.naam}
          </Link>
        </CardTitle>
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="font-normal">
            {ROL_LABEL[klant.rol]}
          </Badge>
          {klant.meting ? <span>{klant.meting.projecten} projecten</span> : null}
        </p>
      </div>
      <Meetstempel
        moment={klant.meting?.moment ?? null}
        dagen={klant.meting?.dagen ?? null}
        staat={klant.meting?.staat ?? 'ontbreekt'}
      />
    </CardHeader>

    <CardContent>
      {klant.meting === null ? (
        <GeenMeting
          reden={klant.reden ?? 'er is voor deze klant nog geen meting geschreven'}
          zet={`pnpm --filter dashboard cockpit:collect ${klant.slug}`}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tegel
            label="Open werk"
            waarde={klant.meting.openItems}
            noemer={`van ${klant.meting.openNoemer} entries`}
            href={`/cockpit/${klant.slug}#werkvoorraad`}
          />
          <Tegel
            label="Zonder bewijs"
            waarde={klant.meting.zonderBewijs}
            noemer={`van ${klant.meting.itemsTotaal} items`}
            href={`/cockpit/${klant.slug}#briefings`}
            toon={klant.meting.zonderBewijs > 0 ? 'waarschuwing' : 'neutraal'}
          />
          <Tegel
            label="Laag-drift"
            waarde={klant.meting.laagAfwijkend}
            noemer={`van ${klant.meting.laagRijen} canon-rijen`}
            href="/cockpit/systeem"
            toon={klant.meting.laagAfwijkend > 0 ? 'waarschuwing' : 'neutraal'}
          />
          <Tegel
            label="Design-debt"
            waarde={klant.meting.debtMeetbaar ? klant.meting.debtTotaal : null}
            noemer={
              klant.meting.debtMeetbaar
                ? `in ${klant.meting.debtBestanden} bestanden`
                : klant.meting.debtReden
            }
            href={`/cockpit/${klant.slug}#debt`}
          />
        </div>
      )}
    </CardContent>
  </Card>
);
