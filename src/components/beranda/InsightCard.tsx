import { Clock, LockSimple } from '@phosphor-icons/react/dist/ssr';
import { archetypeDirections } from '@/lib/archetypes';
import { creativeRoleLabels, type CreativeRole } from '@/lib/creativeRoles';
import { formatDate } from '@/lib/dates';
import type { BrandContext } from '@/lib/elias/types';
import { sources, type Insight } from '@/lib/insights/types';
import EliasTrendCard from './EliasTrendCard';
import SaveButton from './SaveButton';
import VerdictBadge from './VerdictBadge';

/** Who the card is written for. Null renders the generic guest card (BR-4). */
export type Flavour = { role: CreativeRole; archetype: string | null; brand: BrandContext } | null;

const sectionLabel = 'font-mono text-[11px] leading-4 font-bold tracking-wide text-disabled-content uppercase';

/**
 * The archetype only changes the recommended output, never Elias's voice or
 * the insight itself (V4). A skip stays a skip whatever the archetype.
 */
function ArchetypeLine({ insight, archetype }: { insight: Insight; archetype: string }) {
  const entry = archetypeDirections[archetype];
  if (!entry) return null;
  return (
    <p className="text-sm text-neutral-600">
      Archetype brand ini {entry.name}
      {insight.verdict === 'skip'
        ? ' — rekomendasi tetap lewati. Insight-nya sama seperti brand lain.'
        : ` — rekomendasi: ${entry.direction} Insight-nya sama seperti brand lain.`}
    </p>
  );
}

export default function InsightCard({ insight, flavour }: { insight: Insight; flavour: Flavour }) {
  return (
    <article data-animate="page-item" className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <VerdictBadge verdict={insight.verdict} />
        <p className="font-mono text-xs text-gray-600">
          {sources[insight.source].label} · {insight.category}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold md:text-xl">{insight.signal}</h2>
        <p className="text-md text-neutral-600">{insight.whyItMatters}</p>
        {insight.lifecycle && (
          <p className="flex items-center gap-1.5 text-sm text-neutral-700">
            <Clock size={16} aria-hidden className="shrink-0 text-gray-600" />
            {insight.lifecycle}
          </p>
        )}
      </div>

      {insight.evidence && insight.evidence.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Sumber">
          <h3 className={sectionLabel}>Berdasarkan</h3>
          <ul className="flex flex-col gap-1.5">
            {insight.evidence.map((item) => (
              <li key={item.url} className="text-sm">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-1 font-medium underline decoration-neutral-300 underline-offset-2 hover:decoration-current"
                >
                  {item.title}
                </a>
                <span className="text-xs text-gray-600">{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="h-px bg-neutral-200" />

      {flavour ? (
        <section className="flex flex-col gap-2" aria-label={`Rekomendasi untuk ${creativeRoleLabels[flavour.role]}`}>
          <h3 className={sectionLabel}>Untuk {creativeRoleLabels[flavour.role]}</h3>
          <p className="text-md font-medium">{insight.recommendations[flavour.role]}</p>
          {flavour.archetype && <ArchetypeLine insight={insight} archetype={flavour.archetype} />}
          <div className="pt-2">
            <EliasTrendCard insight={insight} brandContext={flavour.brand} userRole={flavour.role} />
          </div>
        </section>
      ) : (
        <p className="flex items-start gap-2 text-sm text-gray-600">
          <LockSimple size={18} aria-hidden className="mt-px shrink-0" />
          Rekomendasi per peran dan archetype muncul setelah profil brand dibuat.
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-600">
          Teramati <time dateTime={insight.observedOn}>{formatDate(insight.observedOn, { year: undefined })}</time>
        </p>
        <SaveButton insight={insight} />
      </div>
    </article>
  );
}
