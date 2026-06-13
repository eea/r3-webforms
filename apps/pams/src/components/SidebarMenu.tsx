import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PolicyIcon from '@mui/icons-material/Policy';
import BarChartIcon from '@mui/icons-material/BarChart';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';

export type MenuKey = 'export' | 'import' | 'dataflow' | 'treeview' | 'pamsdetails' | 'statistics';

type SidebarMenuProps = {
  activeMenu: MenuKey;
  onSelect: (menu: MenuKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

function SidebarMenu({ activeMenu, onSelect, collapsed, onToggleCollapse }: SidebarMenuProps) {
  const sidebarWidth = collapsed ? 72 : 240;

  return (
    <Box
      sx={{
        backgroundColor: 'whitesmoke',
        borderRadius: 0,
        border: '1px solid',
        borderColor: 'divider',
        p: collapsed ? 1 : 2,
        width: sidebarWidth,
        position: 'sticky',
        top: 0,
        height: 'calc(100vh - 64px)',
        overflowY: 'auto',
        transition: 'width 200ms ease',
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 1,
        }}
      >
        {!collapsed && (
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Menu
          </Typography>
        )}
        <IconButton
          size="small"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          sx={{
            color: 'text.primary',
            bgcolor: 'transparent',
            border: 'none',
            p: 0.5,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {collapsed ? (
            <KeyboardDoubleArrowRightIcon fontSize="small" />
          ) : (
            <KeyboardDoubleArrowLeftIcon fontSize="small" />
          )}
        </IconButton>
      </Box>
      <Stack spacing={1} sx={{ mt: 2 }}>
        <Tooltip title="Pull" placement="right" disableHoverListener={!collapsed}>
          <Button
            variant="text"
            onClick={() => onSelect('export')}
            fullWidth
            startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
            aria-current={activeMenu === 'export' ? 'page' : undefined}
            aria-label={collapsed ? 'Pull' : undefined}
            sx={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              textTransform: 'none',
              textAlign: 'left',
              pl: collapsed ? 0 : 1,
              minWidth: 0,
              '& .MuiButton-startIcon': {
                marginRight: collapsed ? 0 : undefined,
                marginLeft: collapsed ? 0 : undefined,
              },
            }}
          >
            {!collapsed && 'Pull'}
          </Button>
        </Tooltip>
        <Tooltip title="Push" placement="right" disableHoverListener={!collapsed}>
          <Button
            variant="text"
            onClick={() => onSelect('import')}
            fullWidth
            startIcon={<FileUploadOutlinedIcon fontSize="small" />}
            aria-current={activeMenu === 'import' ? 'page' : undefined}
            aria-label={collapsed ? 'Push' : undefined}
            sx={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              textTransform: 'none',
              textAlign: 'left',
              pl: collapsed ? 0 : 1,
              minWidth: 0,
              '& .MuiButton-startIcon': {
                marginRight: collapsed ? 0 : undefined,
                marginLeft: collapsed ? 0 : undefined,
              },
            }}
          >
            {!collapsed && 'Push'}
          </Button>
        </Tooltip>
        <Tooltip title="Dataflow" placement="right" disableHoverListener={!collapsed}>
          <Button
            variant="text"
            onClick={() => onSelect('dataflow')}
            fullWidth
            startIcon={<AccountTreeOutlinedIcon fontSize="small" />}
            aria-current={activeMenu === 'dataflow' ? 'page' : undefined}
            aria-label={collapsed ? 'Dataflow' : undefined}
            sx={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              textTransform: 'none',
              textAlign: 'left',
              pl: collapsed ? 0 : 1,
              minWidth: 0,
              '& .MuiButton-startIcon': {
                marginRight: collapsed ? 0 : undefined,
                marginLeft: collapsed ? 0 : undefined,
              },
            }}
          >
            {!collapsed && 'Dataflow'}
          </Button>
        </Tooltip>
        <Tooltip title="Dataflow tree view" placement="right" disableHoverListener={!collapsed}>
          <Button
            variant="text"
            onClick={() => onSelect('treeview')}
            fullWidth
            startIcon={<AccountTreeIcon fontSize="small" />}
            aria-current={activeMenu === 'treeview' ? 'page' : undefined}
            aria-label={collapsed ? 'Dataflow tree view' : undefined}
            sx={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              textTransform: 'none',
              textAlign: 'left',
              pl: collapsed ? 0 : 1,
              minWidth: 0,
              '& .MuiButton-startIcon': {
                marginRight: collapsed ? 0 : undefined,
                marginLeft: collapsed ? 0 : undefined,
              },
            }}
          >
            {!collapsed && 'Dataflow tree view'}
          </Button>
        </Tooltip>
        <Tooltip title="PAMs Details" placement="right" disableHoverListener={!collapsed}>
          <Button
            variant="text"
            onClick={() => onSelect('pamsdetails')}
            fullWidth
            startIcon={<PolicyIcon fontSize="small" />}
            aria-current={activeMenu === 'pamsdetails' ? 'page' : undefined}
            aria-label={collapsed ? 'PAMs Details' : undefined}
            sx={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              textTransform: 'none',
              textAlign: 'left',
              pl: collapsed ? 0 : 1,
              minWidth: 0,
              '& .MuiButton-startIcon': {
                marginRight: collapsed ? 0 : undefined,
                marginLeft: collapsed ? 0 : undefined,
              },
            }}
          >
            {!collapsed && 'PAMs Details'}
          </Button>
        </Tooltip>
        <Tooltip title="Statistics" placement="right" disableHoverListener={!collapsed}>
          <Button
            variant="text"
            onClick={() => onSelect('statistics')}
            fullWidth
            startIcon={<BarChartIcon fontSize="small" />}
            aria-current={activeMenu === 'statistics' ? 'page' : undefined}
            aria-label={collapsed ? 'Statistics' : undefined}
            sx={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              textTransform: 'none',
              textAlign: 'left',
              pl: collapsed ? 0 : 1,
              minWidth: 0,
              '& .MuiButton-startIcon': {
                marginRight: collapsed ? 0 : undefined,
                marginLeft: collapsed ? 0 : undefined,
              },
            }}
          >
            {!collapsed && 'Statistics'}
          </Button>
        </Tooltip>
      </Stack>
    </Box>
  );
}

export default SidebarMenu;
