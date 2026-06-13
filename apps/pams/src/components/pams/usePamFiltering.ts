import { useState, useMemo, useCallback } from 'react';
import type { AdvancedFilters, AdvancedFieldFilter, DateFilter, FilterType, StatusFilter } from './types';

export function usePamFiltering(
  workingPams: any[],
  pamsRecords: any[],
  modifiedPamIds: Set<number>
) {
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    textFilters: [],
    dateFilters: [],
  });

  const checkTextFilter = useCallback((pam: any, filter: AdvancedFieldFilter): boolean => {
    const value = String(pam[filter.field] || '');
    const filterValue = filter.value;
    switch (filter.operator) {
      case 'equals':
        return value.toLowerCase() === filterValue.toLowerCase();
      case 'contains':
        return value.toLowerCase().includes(filterValue.toLowerCase());
      case 'startsWith':
        return value.toLowerCase().startsWith(filterValue.toLowerCase());
      case 'endsWith':
        return value.toLowerCase().endsWith(filterValue.toLowerCase());
      case 'isEmpty':
        return !value || value.trim() === '';
      case 'isNotEmpty':
        return Boolean(value && value.trim() !== '');
      default:
        return true;
    }
  }, []);

  const checkDateFilter = useCallback((pam: any, filter: DateFilter): boolean => {
    const pamDate = pam[filter.field] ? new Date(pam[filter.field]) : null;
    if (!pamDate || !filter.value) return filter.operator === 'equals' ? !pamDate && !filter.value : true;

    const filterDate = new Date(filter.value);
    switch (filter.operator) {
      case 'equals':
        return pamDate.toDateString() === filterDate.toDateString();
      case 'before':
        return pamDate < filterDate;
      case 'after':
        return pamDate > filterDate;
      case 'between': {
        if (!filter.valueTo) return true;
        const toDate = new Date(filter.valueTo);
        return pamDate >= filterDate && pamDate <= toDate;
      }
      default:
        return true;
    }
  }, []);

  const originalPamIds = useMemo(() => {
    return new Set(pamsRecords.map((p) => Number(p.Id || p.id)));
  }, [pamsRecords]);

  const filteredPams = useMemo(() => {
    const filtered = workingPams.filter((pam) => {
      const pamId = Number(pam.Id || pam.id);

      if (filterType === 'single' && pam.IsGroup === 'Group') return false;
      if (filterType === 'group' && pam.IsGroup !== 'Group') return false;

      if (statusFilter === 'modified' && (!modifiedPamIds.has(pamId) || !originalPamIds.has(pamId))) return false;
      if (statusFilter === 'new' && originalPamIds.has(pamId)) return false;

      if (searchText.trim()) {
        const search = searchText.toLowerCase();
        const matchesAnyField = Object.entries(pam).some(([key, value]) => {
          if (key.startsWith('Fk_') || key === 'idRecordSchema' || key === 'idTableSchema') return false;
          const strValue = value === null || value === undefined ? '' : String(value).toLowerCase();
          return strValue.includes(search);
        });
        if (!matchesAnyField) return false;
      }

      for (const filter of advancedFilters.textFilters) {
        if (!checkTextFilter(pam, filter)) return false;
      }
      for (const filter of advancedFilters.dateFilters) {
        if (!checkDateFilter(pam, filter)) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const aId = Number(a.Id || a.id);
      const bId = Number(b.Id || b.id);

      const aIsNew = !originalPamIds.has(aId);
      const bIsNew = !originalPamIds.has(bId);
      const aIsModified = modifiedPamIds.has(aId) && originalPamIds.has(aId);
      const bIsModified = modifiedPamIds.has(bId) && originalPamIds.has(bId);

      const getStatusRank = (isNew: boolean, isModified: boolean) => {
        if (isNew) return 0;
        if (isModified) return 1;
        return 2;
      };

      const aStatusRank = getStatusRank(aIsNew, aIsModified);
      const bStatusRank = getStatusRank(bIsNew, bIsModified);
      if (aStatusRank !== bStatusRank) return aStatusRank - bStatusRank;

      const aIsGroup = a.IsGroup === 'Group';
      const bIsGroup = b.IsGroup === 'Group';
      if (aIsGroup && !bIsGroup) return 1;
      if (!aIsGroup && bIsGroup) return -1;

      // Default sort by ID ascending
      return Number(aId) - Number(bId);
    });
  }, [workingPams, searchText, filterType, statusFilter, advancedFilters, checkTextFilter, checkDateFilter, modifiedPamIds, originalPamIds]);

  const activeFilterCount = advancedFilters.textFilters.length + advancedFilters.dateFilters.length;

  const { singleCount, groupCount } = useMemo(() => {
    let singles = 0;
    let groups = 0;
    pamsRecords.forEach((pam) => {
      if (pam.IsGroup === 'Group') groups++;
      else singles++;
    });
    return { singleCount: singles, groupCount: groups };
  }, [pamsRecords]);

  return {
    searchText,
    filterType,
    statusFilter,
    advancedFilters,
    showAdvancedFilters,
    setSearchText,
    setFilterType,
    setStatusFilter,
    setAdvancedFilters,
    setShowAdvancedFilters,
    filteredPams,
    originalPamIds,
    activeFilterCount,
    singleCount,
    groupCount,
  };
}
