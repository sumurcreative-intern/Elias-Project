'use client';

import { useId, useState, type ReactNode } from 'react';
import { CaretDown, FunnelSimple, MagnifyingGlass, X } from '@phosphor-icons/react';
import { priorityLabels, statusLabels, type ArchivePriority, type ArchiveStatus } from '@/lib/archive';
import { activeFilterCount, noFilters, sortLabels, type ArchiveFilters as Filters, type ArchiveSort } from '@/lib/archiveQuery';
import { sources, type SourceId } from '@/lib/insights/types';

// Only sources Elias can query (AR-1). TikTok and Instagram stay listed but
// disabled and labelled, so nobody reads their absence as an oversight
const sourceOptions = (Object.keys(sources) as SourceId[]).filter((id) => sources[id].tier === 1);
const unavailableSources = ['TikTok', 'Instagram'];

const control =
  'h-11 w-full appearance-none rounded-lg border border-disabled-surface bg-white pr-9 pl-3 text-sm text-txt-black outline-none transition-colors hover:border-neutral-500 focus:border-primary';

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-gray-600">
        {label}
      </label>
      <div className="relative">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={control}>
          {children}
        </select>
        <CaretDown size={16} aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-gray-600" />
      </div>
    </div>
  );
}

function DateInput({ label, value, onChange, min, max }: { label: string; value: string; onChange: (value: string) => void; min?: string; max?: string }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-gray-600">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={`${control} pr-3`}
      />
    </div>
  );
}

type ArchiveFiltersProps = {
  filters: Filters;
  sort: ArchiveSort;
  categories: string[];
  /** Guests can't use the priority filter or sort (AR-8) */
  showPriority: boolean;
  onFilters: (filters: Filters) => void;
  onSort: (sort: ArchiveSort) => void;
};

export default function ArchiveFilters({ filters, sort, categories, showPriority, onFilters, onSort }: ArchiveFiltersProps) {
  const searchId = useId();
  const panelId = useId();
  const [panelOpen, setPanelOpen] = useState(false);
  const active = activeFilterCount(filters);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onFilters({ ...filters, [key]: value });
  const sorts = (Object.keys(sortLabels) as ArchiveSort[]).filter((value) => showPriority || value !== 'priority');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={searchId} className="text-xs font-medium text-gray-600">
            Cari
          </label>
          <div className="relative">
            <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-600" />
            <input
              id={searchId}
              type="search"
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
              placeholder="Judul, tag, atau catatan"
              className={`${control} pr-3 pl-10 placeholder:text-disabled-content`}
            />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1 md:w-52 md:flex-none">
            <Select label="Urutkan" value={sort} onChange={(value) => onSort(value as ArchiveSort)}>
              {sorts.map((value) => (
                <option key={value} value={value}>
                  {sortLabels[value]}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls={panelId}
            onClick={() => setPanelOpen((open) => !open)}
            className="flex h-11 items-center gap-2 rounded-lg border border-disabled-surface px-3 text-sm font-semibold transition-colors hover:border-txt-black laptop:hidden"
          >
            <FunnelSimple size={18} aria-hidden />
            Filter{active > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-bg-white">{active}</span>}
          </button>
        </div>
      </div>

      {/* Always open on laptop; a toggle below that keeps the list in view */}
      <div
        id={panelId}
        className={`${panelOpen ? 'grid' : 'hidden'} grid-cols-2 gap-3 md:grid-cols-3 laptop:grid laptop:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]`}
      >
        <Select label="Status" value={filters.status} onChange={(value) => set('status', value as ArchiveStatus | '')}>
          <option value="">Semua status</option>
          {(Object.keys(statusLabels) as ArchiveStatus[]).map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </Select>
        <Select label="Kategori" value={filters.category} onChange={(value) => set('category', value)}>
          <option value="">Semua kategori</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
        <Select label="Sumber" value={filters.source} onChange={(value) => set('source', value as SourceId | '')}>
          <option value="">Semua sumber</option>
          {sourceOptions.map((id) => (
            <option key={id} value={id}>
              {sources[id].label}
            </option>
          ))}
          {unavailableSources.map((label) => (
            <option key={label} disabled>
              {label} (belum tersedia)
            </option>
          ))}
        </Select>
        {showPriority && (
          <Select
            label="Prioritas"
            value={filters.priority}
            onChange={(value) => set('priority', value as ArchivePriority | 'none' | '')}
          >
            <option value="">Semua prioritas</option>
            {(Object.keys(priorityLabels) as ArchivePriority[]).map((value) => (
              <option key={value} value={value}>
                {priorityLabels[value]}
              </option>
            ))}
            <option value="none">Tanpa prioritas</option>
          </Select>
        )}
        <DateInput label="Disimpan dari" value={filters.from} max={filters.to || undefined} onChange={(value) => set('from', value)} />
        <DateInput label="Sampai" value={filters.to} min={filters.from || undefined} onChange={(value) => set('to', value)} />
      </div>

      {active > 0 && (
        <button
          type="button"
          onClick={() => onFilters({ ...noFilters, search: filters.search })}
          className="flex w-fit items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-txt-black"
        >
          <X size={16} aria-hidden />
          Hapus {active} filter
        </button>
      )}
    </div>
  );
}
