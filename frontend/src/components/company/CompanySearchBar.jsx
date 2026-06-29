/**
 * CompanySearchBar.jsx
 *
 * Self-contained search input + filter pills + sort buttons.
 *
 * Key performance win:
 *  - `isFocused` state lives HERE, not in the parent page component.
 *    Previously, toggling focus caused the entire parent (including the full
 *    company grid) to re-render. Now only this small component re-renders.
 *  - Debounce is 250ms (within the 200–300ms spec).
 *  - All callbacks received from the parent are expected to be stable
 *    useCallback refs so this component stays memoised between parent renders.
 */
import { useState, useRef, useCallback, memo } from 'react';
import { FaSearch } from 'react-icons/fa';
import { ORANGE, FILTER_PILLS } from '../../utils/companyUtils';

// ─── Static style objects (module-level, never recreated) ─────────────────────
const ICON_BASE_STYLE   = { flexShrink: 0, transition: 'color 0.2s' };
const INPUT_INNER_STYLE = { border: 'none', padding: 0, outline: 'none', boxShadow: 'none', background: 'transparent' };

function CompanySearchBarInner({ onSearchChange, onFilterChange, onSortChange, activeFilter, sortDir }) {
  const [localSearch, setLocalSearch] = useState('');
  const [isFocused,   setIsFocused]   = useState(false);
  const debounceTimer = useRef(null);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setLocalSearch(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => onSearchChange(val), 250);
  }, [onSearchChange]);

  const handleClear = useCallback(() => {
    setLocalSearch('');
    onSearchChange('');
  }, [onSearchChange]);

  const handleFocus = useCallback(() => setIsFocused(true),  []);
  const handleBlur  = useCallback(() => setIsFocused(false), []);

  // Derived styles — computed inside render but cheap (two primitive comparisons).
  const wrapperStyle = {
    backgroundColor: '#141414',
    border: isFocused ? `1px solid ${ORANGE}` : '1px solid #1e1e1e',
    boxShadow: isFocused ? '0 0 24px rgba(255,107,26,0.15), 0 8px 32px rgba(0,0,0,0.4)' : 'none',
    transform: isFocused ? 'translateY(-1px)' : 'translateY(0)',
    height: '56px',
  };

  const iconStyle = { ...ICON_BASE_STYLE, color: isFocused ? ORANGE : '#4b5563' };

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8">
      {/* Search input */}
      <div className="flex items-center gap-3.5 rounded-2xl px-6 transition-all duration-200 flex-1 min-w-[280px]" style={wrapperStyle}>
        <FaSearch size={14} style={iconStyle} />
        <input
          value={localSearch}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search tech companies..."
          className="bg-transparent flex-1 outline-none text-[14px] text-white placeholder-[#4b5563]"
          style={INPUT_INNER_STYLE}
        />
        {localSearch && (
          <button
            onClick={handleClear}
            className="text-[#4b5563] hover:text-[#9ca3af] transition-colors text-lg leading-none bg-transparent border-none cursor-pointer"
          >
            ×
          </button>
        )}
      </div>

      {/* Filter pills + Sort */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
        {/* Category filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_PILLS.map((pill) => {
            const isActive = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => onFilterChange(pill.id)}
                className="whitespace-nowrap text-[13px] font-semibold transition-all duration-150 cursor-pointer"
                style={{
                  padding: '7px 18px',
                  borderRadius: '20px',
                  backgroundColor: isActive ? 'rgba(255,107,26,0.12)' : '#111111',
                  border: isActive ? `1px solid ${ORANGE}` : '1px solid #1e1e1e',
                  color: isActive ? ORANGE : '#6b7280',
                }}
              >
                {pill.emoji} {pill.label}
              </button>
            );
          })}
        </div>

        {/* Sort toggles */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {['asc', 'desc'].map((dir) => {
            const isActive = sortDir === dir;
            return (
              <button
                key={dir}
                onClick={() => onSortChange(dir)}
                className="text-[12px] font-bold px-4 py-2 rounded-xl transition-all duration-150 cursor-pointer"
                style={{
                  backgroundColor: isActive ? ORANGE : '#111111',
                  border: isActive ? `1px solid ${ORANGE}` : '1px solid #1e1e1e',
                  color: isActive ? '#fff' : '#4b5563',
                }}
              >
                {dir === 'asc' ? 'Sort A-Z' : 'Sort Z-A'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Memoised: only re-renders when active filter or sort direction changes.
// Typing (localSearch) is local state, so parent never re-renders from it.
export const CompanySearchBar = memo(CompanySearchBarInner, (prev, next) =>
  prev.activeFilter === next.activeFilter &&
  prev.sortDir      === next.sortDir
);
