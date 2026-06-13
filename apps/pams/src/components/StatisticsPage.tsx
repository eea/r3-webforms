import { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ghgExAnteYears, resExAnteYears, eeExAnteYears } from '../schema/pamViewConfig';

type StatisticsPageProps = {
  allTables: Array<{ name: string; records: any[]; index: number }>;
  hasData: boolean;
};

function StatisticsPage({ allTables, hasData }: StatisticsPageProps) {
  // Get PAMs records
  const pamsRecords = useMemo(() => {
    const pamsTable = allTables.find(t => t.name === 'PaMs');
    return pamsTable?.records || [];
  }, [allTables]);

  // Get related tables data
  const getTableRecords = (tableName: string) => {
    const table = allTables.find(t => t.name === tableName);
    return table?.records || [];
  };

  const ghgExAnteRecords = useMemo(() => getTableRecords('GHG_ExAnte'), [allTables]);
  const ghgExPostRecords = useMemo(() => getTableRecords('GHG_ExPost_emissions'), [allTables]);
  const resExAnteRecords = useMemo(() => getTableRecords('RES_ExAnte'), [allTables]);
  const resExPostRecords = useMemo(() => getTableRecords('RES_ExPost'), [allTables]);
  const eeExAnteRecords = useMemo(() => getTableRecords('EE_ExAnte'), [allTables]);
  const eeExPostRecords = useMemo(() => getTableRecords('EE_ExPost'), [allTables]);

  // Calculate status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    pamsRecords.forEach(pam => {
      const status = pam.StatusImplementation || 'Not specified';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, y]) => ({ name, y }))
      .sort((a, b) => b.y - a.y);
  }, [pamsRecords]);

  // Calculate type distribution (Single vs Group)
  const typeData = useMemo(() => {
    const singleCount = pamsRecords.filter(p => p.IsGroup !== 'Group').length;
    const groupCount = pamsRecords.filter(p => p.IsGroup === 'Group').length;
    return [
      { name: 'Single', y: singleCount },
      { name: 'Group', y: groupCount },
    ];
  }, [pamsRecords]);

  // Calculate sector distribution from Dimensions table
  const sectorData = useMemo(() => {
    const dimensionsRecords = getTableRecords('Dimensions');
    const counts: Record<string, number> = {};
    dimensionsRecords.forEach(dim => {
      const sector = dim.Sector || dim.SectorAffected || 'Not specified';
      if (sector) {
        counts[sector] = (counts[sector] || 0) + 1;
      }
    });
    // Fallback to PAMs if no Dimensions data
    if (Object.keys(counts).length === 0) {
      pamsRecords.forEach(pam => {
        const sectors = pam.Sectors || pam.Sector || 'Not specified';
        const sectorList = typeof sectors === 'string' ? sectors.split(',').map((s: string) => s.trim()) : [sectors];
        sectorList.forEach((sector: string) => {
          if (sector) {
            counts[sector] = (counts[sector] || 0) + 1;
          }
        });
      });
    }
    return Object.entries(counts)
      .map(([name, y]) => ({ name, y }))
      .sort((a, b) => b.y - a.y)
      .slice(0, 10);
  }, [allTables, pamsRecords]);

  // Calculate GHG emissions reductions by year (Ex-Ante)
  const ghgEmissionsByYear = useMemo(() => {
    const yearData: Record<number, { euets: number; esr: number; lulucf: number; total: number }> = {};

    ghgExAnteYears.forEach(({ year, fields }) => {
      const [euetsField, esrField, lulucfField, totalField] = fields;
      let euetsSum = 0, esrSum = 0, lulucfSum = 0, totalSum = 0;

      ghgExAnteRecords.forEach(record => {
        if (record[euetsField]) euetsSum += parseFloat(record[euetsField]) || 0;
        if (record[esrField]) esrSum += parseFloat(record[esrField]) || 0;
        if (record[lulucfField]) lulucfSum += parseFloat(record[lulucfField]) || 0;
        if (record[totalField]) totalSum += parseFloat(record[totalField]) || 0;
      });

      if (euetsSum !== 0 || esrSum !== 0 || lulucfSum !== 0 || totalSum !== 0) {
        yearData[year] = { euets: euetsSum, esr: esrSum, lulucf: lulucfSum, total: totalSum };
      }
    });

    return yearData;
  }, [ghgExAnteRecords]);

  // Calculate Renewable Energy production by year (Ex-Ante)
  const resProductionByYear = useMemo(() => {
    const yearData: Record<number, number> = {};

    resExAnteYears.forEach(({ year, field }) => {
      let sum = 0;
      resExAnteRecords.forEach(record => {
        if (record[field]) sum += parseFloat(record[field]) || 0;
      });
      if (sum !== 0) {
        yearData[year] = sum;
      }
    });

    return yearData;
  }, [resExAnteRecords]);

  // Calculate Energy Efficiency reductions by year (Ex-Ante)
  const eeReductionsByYear = useMemo(() => {
    const yearData: Record<number, number> = {};

    eeExAnteYears.forEach(({ year, field }) => {
      let sum = 0;
      eeExAnteRecords.forEach(record => {
        if (record[field]) sum += parseFloat(record[field]) || 0;
      });
      if (sum !== 0) {
        yearData[year] = sum;
      }
    });

    return yearData;
  }, [eeExAnteRecords]);

  // Calculate Ex-Ante vs Ex-Post coverage
  const assessmentCoverage = useMemo(() => {
    const ghgExAnteCount = ghgExAnteRecords.length;
    const ghgExPostCount = ghgExPostRecords.length;
    const resExAnteCount = resExAnteRecords.length;
    const resExPostCount = resExPostRecords.length;
    const eeExAnteCount = eeExAnteRecords.length;
    const eeExPostCount = eeExPostRecords.length;

    return {
      ghg: { exAnte: ghgExAnteCount, exPost: ghgExPostCount },
      res: { exAnte: resExAnteCount, exPost: resExPostCount },
      ee: { exAnte: eeExAnteCount, exPost: eeExPostCount },
    };
  }, [ghgExAnteRecords, ghgExPostRecords, resExAnteRecords, resExPostRecords, eeExAnteRecords, eeExPostRecords]);

  // Calculate policy instrument distribution
  const policyInstrumentData = useMemo(() => {
    const counts: Record<string, number> = {};
    pamsRecords.forEach(pam => {
      const instrument = pam.TypePolicyInstrument || 'Not specified';
      counts[instrument] = (counts[instrument] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, y]) => ({ name, y }))
      .sort((a, b) => b.y - a.y);
  }, [pamsRecords]);

  // Calculate geographical coverage distribution
  const geoData = useMemo(() => {
    const counts: Record<string, number> = {};
    pamsRecords.forEach(pam => {
      const geo = pam.GeographicalCoverage || 'Not specified';
      counts[geo] = (counts[geo] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, y]) => ({ name, y }))
      .sort((a, b) => b.y - a.y);
  }, [pamsRecords]);

  // Calculate implementation period stats
  const implementationStats = useMemo(() => {
    const years: number[] = [];
    pamsRecords.forEach(pam => {
      if (pam.ImplementationPeriodStart) {
        const year = parseInt(pam.ImplementationPeriodStart);
        if (!isNaN(year) && year > 1900 && year < 2100) {
          years.push(year);
        }
      }
    });

    if (years.length === 0) return null;

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const avgYear = Math.round(years.reduce((a, b) => a + b, 0) / years.length);

    const byDecade: Record<string, number> = {};
    years.forEach(year => {
      const decade = `${Math.floor(year / 10) * 10}s`;
      byDecade[decade] = (byDecade[decade] || 0) + 1;
    });

    return {
      minYear,
      maxYear,
      avgYear,
      byDecade: Object.entries(byDecade)
        .map(([name, y]) => ({ name, y }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [pamsRecords]);

  // Chart color palette (EEA-inspired)
  const colors = {
    primary: '#004494',    // EEA blue
    secondary: '#00a651',  // EEA green
    accent: '#f7941d',     // Orange
    purple: '#7b1fa2',
    red: '#d32f2f',
    cyan: '#00bcd4',
    grey: '#607d8b',
  };

  // GHG Emissions by Year Chart (Stacked Bar)
  const ghgYears = Object.keys(ghgEmissionsByYear).map(Number).sort((a, b) => a - b);
  const ghgChartOptions: Highcharts.Options = {
    chart: {
      type: 'column',
      height: 400,
    },
    title: {
      text: 'GHG Emission Reductions by Target Year (Ex-Ante)',
      style: { fontSize: '16px', fontWeight: 'bold' },
    },
    subtitle: {
      text: 'kt CO2-equivalent per year',
    },
    xAxis: {
      categories: ghgYears.map(String),
      title: { text: 'Target Year' },
    },
    yAxis: {
      title: { text: 'kt CO2-eq' },
      stackLabels: {
        enabled: true,
        style: { fontWeight: 'bold' },
      },
    },
    tooltip: {
      headerFormat: '<b>Year {point.x}</b><br/>',
      pointFormat: '{series.name}: <b>{point.y:.1f}</b> kt CO2-eq<br/>',
      shared: false,
    },
    plotOptions: {
      column: {
        stacking: 'normal',
        dataLabels: {
          enabled: false,
        },
      },
    },
    series: [
      {
        type: 'column',
        name: 'EU ETS',
        data: ghgYears.map(year => ghgEmissionsByYear[year]?.euets || 0),
        color: colors.primary,
      },
      {
        type: 'column',
        name: 'ESR',
        data: ghgYears.map(year => ghgEmissionsByYear[year]?.esr || 0),
        color: colors.secondary,
      },
      {
        type: 'column',
        name: 'LULUCF',
        data: ghgYears.map(year => ghgEmissionsByYear[year]?.lulucf || 0),
        color: colors.accent,
      },
    ],
    legend: { enabled: true },
    credits: { enabled: false },
  };

  // RES and EE Combined Line Chart
  const resYears = Object.keys(resProductionByYear).map(Number).sort((a, b) => a - b);
  const eeYears = Object.keys(eeReductionsByYear).map(Number).sort((a, b) => a - b);
  const allYears = [...new Set([...resYears, ...eeYears])].sort((a, b) => a - b);

  const resEeChartOptions: Highcharts.Options = {
    chart: {
      type: 'line',
      height: 350,
    },
    title: {
      text: 'Renewable Energy & Energy Efficiency Projections',
      style: { fontSize: '16px', fontWeight: 'bold' },
    },
    subtitle: {
      text: 'ktoe/year (Ex-Ante)',
    },
    xAxis: {
      categories: allYears.map(String),
      title: { text: 'Target Year' },
    },
    yAxis: {
      title: { text: 'ktoe' },
    },
    tooltip: {
      headerFormat: '<b>Year {point.x}</b><br/>',
      pointFormat: '{series.name}: <b>{point.y:.1f}</b> ktoe<br/>',
    },
    plotOptions: {
      line: {
        marker: {
          enabled: true,
          radius: 5,
        },
        dataLabels: {
          enabled: true,
          format: '{point.y:.0f}',
        },
      },
    },
    series: [
      {
        type: 'line',
        name: 'Renewable Energy Production',
        data: allYears.map(year => resProductionByYear[year] || null),
        color: colors.accent,
      },
      {
        type: 'line',
        name: 'Energy Efficiency Reductions',
        data: allYears.map(year => eeReductionsByYear[year] || null),
        color: colors.purple,
      },
    ],
    legend: { enabled: true },
    credits: { enabled: false },
  };

  // Ex-Ante vs Ex-Post Coverage Chart
  const coverageChartOptions: Highcharts.Options = {
    chart: {
      type: 'bar',
      height: 280,
    },
    title: {
      text: 'Ex-Ante vs Ex-Post Assessment Coverage',
      style: { fontSize: '14px', fontWeight: 'bold' },
    },
    xAxis: {
      categories: ['GHG', 'Renewable Energy', 'Energy Efficiency'],
    },
    yAxis: {
      title: { text: 'Number of PAMs' },
    },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.y}</b> PAMs',
    },
    plotOptions: {
      bar: {
        dataLabels: {
          enabled: true,
        },
      },
    },
    series: [
      {
        type: 'bar',
        name: 'Ex-Ante (Projected)',
        data: [assessmentCoverage.ghg.exAnte, assessmentCoverage.res.exAnte, assessmentCoverage.ee.exAnte],
        color: colors.primary,
      },
      {
        type: 'bar',
        name: 'Ex-Post (Achieved)',
        data: [assessmentCoverage.ghg.exPost, assessmentCoverage.res.exPost, assessmentCoverage.ee.exPost],
        color: colors.secondary,
      },
    ],
    legend: { enabled: true },
    credits: { enabled: false },
  };

  // Status chart options (Donut)
  const statusChartOptions: Highcharts.Options = {
    chart: {
      type: 'pie',
      height: 350,
    },
    title: {
      text: 'PAMs by Implementation Status',
      style: { fontSize: '16px', fontWeight: 'bold' },
    },
    tooltip: {
      pointFormat: '<b>{point.y}</b> PAMs ({point.percentage:.1f}%)',
    },
    plotOptions: {
      pie: {
        innerSize: '50%',
        colors: [colors.secondary, colors.primary, colors.accent, colors.purple, colors.red, colors.cyan, colors.grey],
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.y}',
          style: { fontSize: '11px' },
        },
      },
    },
    series: [{
      type: 'pie',
      name: 'PAMs',
      data: statusData,
    }],
    credits: { enabled: false },
  };

  // Type chart options (Single vs Group)
  const typeChartOptions: Highcharts.Options = {
    chart: {
      type: 'pie',
      height: 250,
    },
    title: {
      text: 'Single vs Group PAMs',
      style: { fontSize: '14px', fontWeight: 'bold' },
    },
    tooltip: {
      pointFormat: '<b>{point.y}</b> PAMs ({point.percentage:.1f}%)',
    },
    plotOptions: {
      pie: {
        innerSize: '50%',
        colors: [colors.primary, colors.purple],
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.y}',
        },
      },
    },
    series: [{
      type: 'pie',
      name: 'PAMs',
      data: typeData,
    }],
    credits: { enabled: false },
  };

  // Sector bar chart
  const sectorChartOptions: Highcharts.Options = {
    chart: {
      type: 'bar',
      height: 350,
    },
    title: {
      text: 'PAMs by Sector Affected',
      style: { fontSize: '16px', fontWeight: 'bold' },
    },
    xAxis: {
      categories: sectorData.map(d => d.name.length > 30 ? d.name.substring(0, 30) + '...' : d.name),
      labels: { style: { fontSize: '10px' } },
    },
    yAxis: {
      title: { text: 'Number of PAMs' },
    },
    tooltip: {
      pointFormat: '<b>{point.y}</b> PAMs',
    },
    plotOptions: {
      bar: {
        color: colors.primary,
        dataLabels: { enabled: true },
      },
    },
    series: [{
      type: 'bar',
      name: 'PAMs',
      data: sectorData.map(d => d.y),
    }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  // Policy instrument bar chart
  const policyInstrumentChartOptions: Highcharts.Options = {
    chart: {
      type: 'bar',
      height: 300,
    },
    title: {
      text: 'PAMs by Policy Instrument Type',
      style: { fontSize: '16px', fontWeight: 'bold' },
    },
    xAxis: {
      categories: policyInstrumentData.map(d => d.name),
      labels: { style: { fontSize: '11px' } },
    },
    yAxis: {
      title: { text: 'Number of PAMs' },
    },
    tooltip: {
      pointFormat: '<b>{point.y}</b> PAMs',
    },
    plotOptions: {
      bar: {
        color: colors.secondary,
        dataLabels: { enabled: true },
      },
    },
    series: [{
      type: 'bar',
      name: 'PAMs',
      data: policyInstrumentData.map(d => d.y),
    }],
    legend: { enabled: false },
    credits: { enabled: false },
  };

  // Geographical coverage chart
  const geoChartOptions: Highcharts.Options = {
    chart: {
      type: 'pie',
      height: 250,
    },
    title: {
      text: 'Geographical Coverage',
      style: { fontSize: '14px', fontWeight: 'bold' },
    },
    tooltip: {
      pointFormat: '<b>{point.y}</b> PAMs ({point.percentage:.1f}%)',
    },
    plotOptions: {
      pie: {
        innerSize: '50%',
        colors: [colors.secondary, colors.accent, colors.primary, colors.purple],
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.y}',
        },
      },
    },
    series: [{
      type: 'pie',
      name: 'PAMs',
      data: geoData,
    }],
    credits: { enabled: false },
  };

  // Implementation timeline chart
  const timelineChartOptions: Highcharts.Options = implementationStats ? {
    chart: {
      type: 'column',
      height: 250,
    },
    title: {
      text: 'Implementation Start by Decade',
      style: { fontSize: '14px', fontWeight: 'bold' },
    },
    xAxis: {
      categories: implementationStats.byDecade.map(d => d.name),
    },
    yAxis: {
      title: { text: 'Number of PAMs' },
    },
    tooltip: {
      pointFormat: '<b>{point.y}</b> PAMs',
    },
    plotOptions: {
      column: {
        color: colors.accent,
        dataLabels: { enabled: true },
      },
    },
    series: [{
      type: 'column',
      name: 'PAMs',
      data: implementationStats.byDecade.map(d => d.y),
    }],
    legend: { enabled: false },
    credits: { enabled: false },
  } : {};

  if (!hasData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartIcon /> Statistics Dashboard
        </Typography>
        <Alert severity="info">
          No data loaded. Please export data first from the Export page.
        </Alert>
      </Box>
    );
  }

  if (pamsRecords.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartIcon /> Statistics Dashboard
        </Typography>
        <Alert severity="warning">
          No PAMs data found in the loaded dataset.
        </Alert>
      </Box>
    );
  }

  const totalGhgReduction = ghgYears.length > 0
    ? ghgEmissionsByYear[Math.max(...ghgYears)]?.total || 0
    : 0;

  return (
    <Box>
      <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0 }}>
          <BarChartIcon /> Statistics Dashboard
        </Typography>
      </Box>
      <Box sx={{ p: 3 }}>

      <Stack spacing={3}>
        {/* Summary Cards - EEA Style */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr', md: 'repeat(6, 1fr)' }, gap: 2 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd', borderLeft: '4px solid', borderColor: colors.primary }}>
            <Typography variant="h4" sx={{ color: colors.primary, fontWeight: 'bold' }}>{pamsRecords.length}</Typography>
            <Typography variant="caption" color="text.secondary">Total PAMs</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9', borderLeft: '4px solid', borderColor: colors.secondary }}>
            <Typography variant="h4" sx={{ color: colors.secondary, fontWeight: 'bold' }}>{typeData[0].y}</Typography>
            <Typography variant="caption" color="text.secondary">Single PAMs</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5', borderLeft: '4px solid', borderColor: colors.purple }}>
            <Typography variant="h4" sx={{ color: colors.purple, fontWeight: 'bold' }}>{typeData[1].y}</Typography>
            <Typography variant="caption" color="text.secondary">Group PAMs</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0', borderLeft: '4px solid', borderColor: colors.accent }}>
            <Typography variant="h4" sx={{ color: colors.accent, fontWeight: 'bold' }}>{ghgExAnteRecords.length}</Typography>
            <Typography variant="caption" color="text.secondary">GHG Assessments</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e0f7fa', borderLeft: '4px solid', borderColor: colors.cyan }}>
            <Typography variant="h4" sx={{ color: colors.cyan, fontWeight: 'bold' }}>{resExAnteRecords.length}</Typography>
            <Typography variant="caption" color="text.secondary">RES Assessments</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fce4ec', borderLeft: '4px solid', borderColor: colors.red }}>
            <Typography variant="h4" sx={{ color: colors.red, fontWeight: 'bold' }}>{eeExAnteRecords.length}</Typography>
            <Typography variant="caption" color="text.secondary">EE Assessments</Typography>
          </Paper>
        </Box>

        {/* GHG Emissions Chart - Main Feature */}
        {ghgYears.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <HighchartsReact highcharts={Highcharts} options={ghgChartOptions} />
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Total projected GHG emission reductions by {Math.max(...ghgYears)}: <strong>{totalGhgReduction.toLocaleString()} kt CO2-eq</strong>
              </Typography>
            </Box>
          </Paper>
        )}

        {/* RES/EE Projections and Coverage Side by Side */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          {allYears.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <HighchartsReact highcharts={Highcharts} options={resEeChartOptions} />
            </Paper>
          )}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <HighchartsReact highcharts={Highcharts} options={coverageChartOptions} />
          </Paper>
        </Box>

        {/* Status and Sectors */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <HighchartsReact highcharts={Highcharts} options={statusChartOptions} />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <HighchartsReact highcharts={Highcharts} options={sectorChartOptions} />
          </Paper>
        </Box>

        {/* Policy Instruments */}
        {policyInstrumentData.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <HighchartsReact highcharts={Highcharts} options={policyInstrumentChartOptions} />
          </Paper>
        )}

        {/* Small Charts Row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <HighchartsReact highcharts={Highcharts} options={typeChartOptions} />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <HighchartsReact highcharts={Highcharts} options={geoChartOptions} />
          </Paper>
          {implementationStats && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <HighchartsReact highcharts={Highcharts} options={timelineChartOptions} />
            </Paper>
          )}
        </Box>

        <Divider />

        {/* Data Tables */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          {/* Status Breakdown Table */}
          <Paper variant="outlined">
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#e3f2fd' }}>
              <Typography variant="subtitle1" fontWeight="bold">Implementation Status Breakdown</Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 350 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Count</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>%</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statusData.map(({ name, y }) => (
                    <TableRow key={name} hover>
                      <TableCell>
                        <Chip label={name} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">{y}</TableCell>
                      <TableCell align="right">{((y / pamsRecords.length) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* GHG by Year Table */}
          {ghgYears.length > 0 && (
            <Paper variant="outlined">
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#e8f5e9' }}>
                <Typography variant="subtitle1" fontWeight="bold">GHG Emission Reductions by Year (kt CO2-eq)</Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 350 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Year</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>EU ETS</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>ESR</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>LULUCF</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ghgYears.map(year => (
                      <TableRow key={year} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{year}</TableCell>
                        <TableCell align="right">{ghgEmissionsByYear[year]?.euets.toLocaleString() || '-'}</TableCell>
                        <TableCell align="right">{ghgEmissionsByYear[year]?.esr.toLocaleString() || '-'}</TableCell>
                        <TableCell align="right">{ghgEmissionsByYear[year]?.lulucf.toLocaleString() || '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: colors.secondary }}>
                          {ghgEmissionsByYear[year]?.total.toLocaleString() || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>

        {/* Implementation Timeline Stats */}
        {implementationStats && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Implementation Timeline</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mt: 2 }}>
              <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: colors.primary }}>{implementationStats.minYear}</Typography>
                <Typography variant="body2" color="text.secondary">Earliest Start Year</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: colors.secondary }}>{implementationStats.avgYear}</Typography>
                <Typography variant="body2" color="text.secondary">Average Start Year</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: colors.accent }}>{implementationStats.maxYear}</Typography>
                <Typography variant="body2" color="text.secondary">Latest Start Year</Typography>
              </Box>
            </Box>
          </Paper>
        )}
      </Stack>
      </Box>
    </Box>
  );
}

export default StatisticsPage;
