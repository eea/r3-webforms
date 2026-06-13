import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { ValidationRow } from '../validation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortablePamItem from './SortablePamItem';
import BlurTextField from './BlurTextField';

type PamListPanelProps = {
  displayPams: any[];
  pamIds: (number | string)[];
  filteredPams: any[];
  workingPams: any[];
  originalPamIds: Set<number>;
  modifiedPamIds: Set<number>;
  selectedPamId: number | null;
  selectedPam: any;
  isPamListHidden: boolean;
  setIsPamListHidden: (hidden: boolean) => void;
  searchText: string;
  setSearchText: (text: string) => void;
  isReorderMode: boolean;
  isSelectMode: boolean;
  reorderIdMode: 'keep' | 'update';
  setReorderIdMode: (mode: 'keep' | 'update') => void;
  selectedPamIds: Set<number>;
  onSelectPam: (id: number) => void;
  onToggleReorderMode: () => void;
  onDragEnd: (event: DragEndEvent) => void;
  onSaveOrder: () => void;
  onCancelReorder: () => void;
  onToggleSelectMode: () => void;
  onTogglePamSelection: (id: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onQuickAddPam: () => void;
  onClonePam: () => void;
  onDiscardPamChanges: (id: number) => void;
  pamValidationMap?: Record<number, { errors: number; warnings: number }>;
  pamValidationRows?: Record<number, ValidationRow[]>;
  onNavigateToValidation?: (pamId: number, table: string, column: string) => void;
};

function PamListPanel({
  displayPams,
  pamIds,
  filteredPams,
  workingPams,
  originalPamIds,
  modifiedPamIds,
  selectedPamId,
  selectedPam,
  isPamListHidden,
  setIsPamListHidden,
  searchText,
  setSearchText,
  isReorderMode,
  isSelectMode,
  reorderIdMode,
  setReorderIdMode,
  selectedPamIds,
  onSelectPam,
  onToggleReorderMode,
  onDragEnd,
  onSaveOrder,
  onCancelReorder,
  onToggleSelectMode,
  onTogglePamSelection,
  onSelectAll,
  onDeselectAll,
  onQuickAddPam,
  onClonePam,
  onDiscardPamChanges,
  pamValidationMap,
  pamValidationRows,
  onNavigateToValidation,
}: PamListPanelProps) {
  const [valPopoverAnchor, setValPopoverAnchor] = useState<HTMLElement | null>(null);
  const [valPopoverPamId, setValPopoverPamId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <Box
      sx={{
        width: isPamListHidden ? 48 : 320,
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.3s ease',
      }}
    >
      {/* Search Box and Mode Toggles */}
      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tooltip title={isPamListHidden ? 'Show PAM list' : 'Hide PAM list'}>
          <IconButton
            size="small"
            onClick={() => setIsPamListHidden(!isPamListHidden)}
            color="primary"
            sx={{ mb: isPamListHidden ? 0 : 1 }}
          >
            {isPamListHidden ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>

        {!isPamListHidden && (
          <>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <BlurTextField
                fullWidth
                size="small"
                placeholder="Search PAMs..."
                value={searchText}
                onChange={(value) => setSearchText(value)}
                disabled={isReorderMode}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchText && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchText('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Tooltip title={isSelectMode ? 'Exit select mode' : 'Select multiple PAMs'}>
                <IconButton
                  size="small"
                  color={isSelectMode ? 'primary' : 'default'}
                  onClick={onToggleSelectMode}
                  disabled={isReorderMode}
                >
                  {isSelectMode ? (
                    <CheckBoxIcon fontSize="small" />
                  ) : (
                    <CheckBoxOutlineBlankIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title={isReorderMode ? 'Exit reorder mode' : 'Reorder PAMs'}>
                <IconButton
                  size="small"
                  color={isReorderMode ? 'primary' : 'default'}
                  onClick={onToggleReorderMode}
                  disabled={isSelectMode}
                >
                  <SwapVertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem />
              <Tooltip title="Add new PAM">
                <IconButton
                  size="small"
                  color="success"
                  onClick={onQuickAddPam}
                  disabled={isReorderMode || isSelectMode}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clone selected PAM">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={onClonePam}
                  disabled={isReorderMode || isSelectMode || !selectedPam}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>

            {isSelectMode && (
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Button size="small" variant="text" onClick={onSelectAll}>
                  Select All ({filteredPams.length})
                </Button>
                <Button size="small" variant="text" onClick={onDeselectAll} disabled={selectedPamIds.size === 0}>
                  Deselect All
                </Button>
                {selectedPamIds.size > 0 && (
                  <Typography variant="caption" color="primary" sx={{ alignSelf: 'center' }}>
                    {selectedPamIds.size} selected
                  </Typography>
                )}
              </Stack>
            )}

            {filteredPams.length !== workingPams.length && !isReorderMode && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Showing {filteredPams.length} of {workingPams.length} PAMs
              </Typography>
            )}

            {isReorderMode && (
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    IDs:
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    value={reorderIdMode}
                    exclusive
                    onChange={(_, value) => value && setReorderIdMode(value)}
                  >
                    <ToggleButton value="keep" sx={{ py: 0.25, px: 1, fontSize: '0.7rem' }}>
                      Keep
                    </ToggleButton>
                    <ToggleButton value="update" sx={{ py: 0.25, px: 1, fontSize: '0.7rem' }}>
                      Update
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <Tooltip
                    title={
                      reorderIdMode === 'keep'
                        ? 'Keep original IDs - only display order changes'
                        : 'Update IDs to match new order (1, 2, 3...)'
                    }
                  >
                    <InfoOutlinedIcon fontSize="small" color="action" sx={{ cursor: 'help' }} />
                  </Tooltip>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={onSaveOrder}>
                    Save Order
                  </Button>
                  <Button size="small" variant="outlined" onClick={onCancelReorder}>
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            )}
          </>
        )}
      </Box>

      {/* PAM List */}
      {!isPamListHidden && (
        <>
          {displayPams.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No PAMs match your filter
              </Typography>
            </Box>
          ) : isReorderMode ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={pamIds} strategy={verticalListSortingStrategy}>
                <List dense sx={{ flex: 1, overflow: 'auto' }}>
                  {displayPams.map((pam) => {
                    const pamId = pam.Id || pam.id;
                    const isNew = !originalPamIds.has(pamId);
                    const isModified = modifiedPamIds.has(pamId) && originalPamIds.has(pamId);
                    return (
                      <SortablePamItem
                        key={pamId}
                        pam={pam}
                        isSelected={selectedPamId === pamId}
                        isReorderMode={isReorderMode}
                        isNew={isNew}
                        isModified={isModified}
                        onClick={() => onSelectPam(pamId)}
                      />
                    );
                  })}
                </List>
              </SortableContext>
            </DndContext>
          ) : (
            <List dense sx={{ flex: 1, overflow: 'auto' }}>
              {displayPams.map((pam) => {
                const pamId = pam.Id || pam.id;
                const isSelected = selectedPamId === pamId;
                const isChecked = selectedPamIds.has(pamId);
                const isGroup = pam.IsGroup === 'Group';
                const isNew = !originalPamIds.has(pamId);
                const isModified = modifiedPamIds.has(pamId) && originalPamIds.has(pamId);
                const valInfo = pamValidationMap?.[pamId];
                const hasErrors = valInfo && valInfo.errors > 0;
                const hasWarnings = valInfo && valInfo.warnings > 0;

                let bgColor = undefined;
                if (isChecked) {
                  bgColor = 'action.selected';
                } else if (isNew) {
                  bgColor = 'rgba(76, 175, 80, 0.12)';
                } else if (isModified) {
                  bgColor = 'rgba(255, 152, 0, 0.12)';
                }

                return (
                  <ListItemButton
                    key={pamId}
                    selected={isSelected}
                    onClick={() => {
                      if (isSelectMode) {
                        onTogglePamSelection(pamId);
                      } else {
                        onSelectPam(pamId);
                      }
                    }}
                    sx={{
                      borderLeft: isSelected || isNew || isModified ? '3px solid' : '3px solid transparent',
                      borderColor: isSelected
                        ? 'primary.main'
                        : isNew
                          ? 'success.main'
                          : isModified
                            ? 'warning.main'
                            : 'transparent',
                      backgroundColor: bgColor,
                    }}
                  >
                    {isSelectMode && (
                      <Checkbox
                        checked={isChecked}
                        size="small"
                        sx={{ p: 0.5, mr: 1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePamSelection(pamId);
                        }}
                      />
                    )}
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {isGroup ? (
                        <Tooltip title="Group of PaMs">
                          <GroupWorkIcon color="secondary" fontSize="small" />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Single PaM">
                          <DescriptionIcon color="action" fontSize="small" />
                        </Tooltip>
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ fontWeight: isSelected ? 'bold' : 'normal' }}
                          >
                            {pam.Title || `PaM ${pamId}`}
                          </Typography>
                          {isNew && (
                            <Chip
                              label="New"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.65rem', ml: 0.5 }}
                            />
                          )}
                          {isModified && !isNew && (
                            <Chip
                              label="Modified"
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.65rem', ml: 0.5 }}
                            />
                          )}
                          {isModified && !isNew && (
                            <Tooltip title="Remove changes for this PAM">
                              <IconButton
                                size="small"
                                color="warning"
                                sx={{ p: 0.25, ml: 0.25 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDiscardPamChanges(pamId);
                                }}
                              >
                                <RestartAltIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {(hasErrors || hasWarnings) && (
                            <Tooltip title={`${valInfo.errors} error(s), ${valInfo.warnings} warning(s) — click to see`}>
                              <IconButton
                                size="small"
                                sx={{ p: 0.25, ml: 0.25 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setValPopoverAnchor(e.currentTarget);
                                  setValPopoverPamId(pamId);
                                }}
                              >
                                {hasErrors ? (
                                  <ErrorOutlineIcon sx={{ fontSize: 16, color: 'error.main' }} />
                                ) : (
                                  <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          #{pamId} {isGroup ? '(Group)' : '(Single)'}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}

          {/* Validation details popover */}
          <Popover
            open={Boolean(valPopoverAnchor)}
            anchorEl={valPopoverAnchor}
            onClose={() => { setValPopoverAnchor(null); setValPopoverPamId(null); }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{ paper: { sx: { maxWidth: 400, maxHeight: 350 } } }}
          >
            {valPopoverPamId && pamValidationRows?.[valPopoverPamId] && (
              <Box sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Validations for PAM #{valPopoverPamId}
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
                  {pamValidationRows[valPopoverPamId].map((row, idx) => {
                    const isError = row.level?.toUpperCase() === 'ERROR' || row.level?.toUpperCase() === 'BLOCKER';
                    const isClickable = !!row.column;
                    return (
                      <Box
                        key={idx}
                        onClick={() => {
                          if (!isClickable) return;
                          onSelectPam(valPopoverPamId);
                          setValPopoverAnchor(null);
                          setValPopoverPamId(null);
                          if (onNavigateToValidation) {
                            setTimeout(() => onNavigateToValidation(valPopoverPamId, row.table, row.column), 150);
                          }
                        }}
                        sx={{
                          py: 0.75,
                          px: 1,
                          cursor: isClickable ? 'pointer' : 'default',
                          borderLeft: `3px solid ${isError ? '#d32f2f' : '#ed6c02'}`,
                          mb: 0.75,
                          borderRadius: '0 4px 4px 0',
                          backgroundColor: isError ? 'rgba(211,47,47,0.04)' : 'rgba(237,108,2,0.04)',
                          '&:hover': isClickable ? { backgroundColor: isError ? 'rgba(211,47,47,0.1)' : 'rgba(237,108,2,0.1)' } : {},
                        }}
                      >
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip
                            label={row.level}
                            size="small"
                            color={isError ? 'error' : 'warning'}
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {row.table}{row.column ? ` → ${row.column}` : ''}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
                          {row.message}
                        </Typography>
                        {isClickable && (
                          <Typography variant="caption" color="primary" sx={{ fontSize: '0.6rem' }}>
                            Click to navigate to field
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Popover>
        </>
      )}
    </Box>
  );
}

export default PamListPanel;
