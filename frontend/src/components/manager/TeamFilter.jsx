export default function TeamFilter({ teams, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange('')}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          value === ''
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        All Teams
      </button>

      {teams.map(team => (
        <button
          key={team.teamId}
          type="button"
          onClick={() => onChange(team.teamId)}
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
            value === team.teamId
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {team.teamName || team.teamId}
        </button>
      ))}
    </div>
  );
}
