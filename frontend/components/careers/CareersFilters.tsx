import { CAREER_LOCATIONS, CAREER_SENIORITY, CAREER_TEAMS, CAREER_WORK_TYPES, careersCopy } from "../../data/careersConstants";

export interface CareerFilters {
  search: string;
  location: string;
  workType: string;
  team: string;
  seniority: string;
}

interface CareersFiltersProps {
  filters: CareerFilters;
  onChange: (next: CareerFilters) => void;
}

export default function CareersFilters({ filters, onChange }: CareersFiltersProps) {
  return (
    <div className="bg-surface rounded-2xl shadow-card border p-4 space-y-4">
      <div className="text-sm font-semibold text-strong">{careersCopy.filtersTitle}</div>
      <input
        className="w-full border rounded-md px-3 py-2"
        placeholder="Search by role or keyword"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
      />
      <select
        className="w-full border rounded-md px-3 py-2"
        value={filters.location}
        onChange={(e) => onChange({ ...filters, location: e.target.value })}
      >
        <option value="">Location</option>
        {CAREER_LOCATIONS.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>
      <select
        className="w-full border rounded-md px-3 py-2"
        value={filters.workType}
        onChange={(e) => onChange({ ...filters, workType: e.target.value })}
      >
        <option value="">Work type</option>
        {CAREER_WORK_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <select
        className="w-full border rounded-md px-3 py-2"
        value={filters.team}
        onChange={(e) => onChange({ ...filters, team: e.target.value })}
      >
        <option value="">Team</option>
        {CAREER_TEAMS.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
      <select
        className="w-full border rounded-md px-3 py-2"
        value={filters.seniority}
        onChange={(e) => onChange({ ...filters, seniority: e.target.value })}
      >
        <option value="">Seniority</option>
        {CAREER_SENIORITY.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onChange({ search: "", location: "", workType: "", team: "", seniority: "" })}
        className="px-3 py-2 border rounded-md text-sm text-muted"
      >
        Clear filters
      </button>
    </div>
  );
}
