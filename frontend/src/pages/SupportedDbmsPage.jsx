import { Box, Grid, Typography, Card, CardContent } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  borderRadius: '12px',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
  },
}));

function SupportedDbmsPage() {
  const databases = [
    { name: "Citus", logo: "https://dbdb.io/media/logos/citus.svg" },
    { name: "ClickHouse", logo: "https://dbdb.io/media/logos/clickhouse.svg" },
    { name: "CnosDB", logo: "https://dbdb.io/media/logos/cnosdb.svg" },
    { name: "CockroachDB", logo: "https://github.com/cockroachdb/cockroach/blob/master/docs/media/cockroach_db.png?raw=true" },
    { name: "Databend", logo: "https://www.databend.com/img/resource/png/light-databend-vertical.png" },
    { name: "DataFusion", logo: "https://datafusion.apache.org/_images/2x_bgwhite_original.png" },
    { name: "Doris", logo: "https://dbdb.io/media/logos/doris.svg" },
    { name: "DuckDB", logo: "https://github.com/duckdb/duckdb/blob/main/logo/DuckDB_Logo-horizontal-dark-mode.svg?raw=true" },
    { name: "H2", logo: "https://dbdb.io/media/logos/h2-logo.svg" },
    { name: "HSQLDB", logo: "https://hsqldb.org/images/hypersql_logo.png" },
    { name: "MariaDB", logo: "https://dbdb.io/media/logos/mariadb2023.svg" },
    { name: "Materialize", logo: "https://dbdb.io/media/logos/materialize.svg" },
    { name: "MySQL", logo: "https://dbdb.io/media/logos/MySQL.svg" },
    { name: "OceanBase", logo: "https://github.com/oceanbase/oceanbase/blob/develop/images/logo.svg?raw=true" },
    { name: "PostgreSQL", logo: "https://dbdb.io/media/logos/postgres-horizontal.svg" },
    { name: "Presto", logo: "https://dbdb.io/media/logos/presto.svg" },
    { name: "QuestDB", logo: "https://dbdb.io/media/logos/questdb.svg" },
    { name: "SQLite3", logo: "https://dbdb.io/media/logos/SQLite.svg" },
    { name: "TiDB", logo: "https://dbdb.io/media/logos/ti-db.svg" },
    { name: "YugabyteDB", logo: "https://dbdb.io/media/logos/yugabyte.svg" },
  ];

  return (
    <Box sx={{ pb: 3, px: 3, bgcolor: '#f0f4f8', minHeight: '100vh' }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <StyledCard>
            <CardContent>
              <Typography variant="h5" fontWeight="bold" color="#1976d2">
                DBMSs Supported by SQLancer
              </Typography>
            </CardContent>
          </StyledCard>
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={3}>
            {databases.map((db) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={db.name}>
                <StyledCard>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, height: '100%' }}>
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                      <img
                        src={db.logo}
                        alt={`${db.name} logo`}
                        style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight="medium"
                      color="#424242"
                      textAlign="center"
                      sx={{ mt: 2 }}
                    >
                      {db.name}
                    </Typography>
                  </CardContent>
                </StyledCard>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SupportedDbmsPage;
