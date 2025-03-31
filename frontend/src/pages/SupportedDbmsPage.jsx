import { Box, Grid, Typography, Card, CardContent } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
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
    { name: "Citus", logo: "https://github.com/citusdata/citus_docs/blob/master/logo.png?raw=true" },
    { name: "ClickHouse", logo: "https://github.com/ClickHouse/clickhouse-docs/assets/9611008/4ef9c104-2d3f-4646-b186-507358d2fe28" },
    { name: "CnosDB", logo: "https://github.com/cnosdb/cnosdb/blob/main/docs/source/_static/img/cnosdb_logo_white.svg?raw=true" },
    { name: "CockroachDB", logo: "https://github.com/cockroachdb/cockroach/blob/master/docs/media/cockroach_db.png?raw=true" },
    { name: "Databend", logo: "https://www.databend.com/img/resource/png/light-databend-vertical.png" },
    { name: "DataFusion", logo: "https://th.bing.com/th/id/OIP.Jveu0xgxspP8llHZKyKdpwHaBj?rs=1&pid=ImgDetMainhttps://datafusion.apache.org/comet/_images/DataFusionComet-Logo-Light.png" },
    { name: "Doris", logo: "https://sslprod.oss-cn-shanghai.aliyuncs.com/stable/head_pic/head_29294-678122.png" },
    { name: "DuckDB", logo: "https://github.com/duckdb/duckdb/blob/main/logo/DuckDB_Logo-horizontal-dark-mode.svg?raw=true" },
    { name: "H2", logo: "https://dbdb.io/media/logos/h2-logo.svg" },
    { name: "HSQLDB", logo: "https://hsqldb.org/images/hypersql_logo.png" },
    { name: "MariaDB", logo: "https://mariadb.com/wp-content/themes/mariadb-sage/public/images/mariadb-logo-white@2x.afc16b.png" },
    { name: "Materialize", logo: "https://github.com/MaterializeInc/materialize/assets/23521087/39270ecb-7ac4-4829-b98b-c5b5699a16b8" },
    { name: "MySQL", logo: "https://www.mysql.com/common/logos/logo-mysql-170x115.png" },
    { name: "OceanBase", logo: "https://github.com/oceanbase/oceanbase/blob/develop/images/logo.svg?raw=true" },
    { name: "PostgreSQL", logo: "https://www.postgresql.org/media/img/about/press/elephant.png" },
    { name: "Presto", logo: "https://dbdb.io/media/logos/presto.svg" },
    { name: "QuestDB", logo: "https://questdb.io/img/questdb-logo-themed.svg" },
    { name: "SQLite3", logo: "https://www.sqlite.org/images/sqlite370_banner.svg" },
    { name: "TiDB", logo: "https://dbdb.io/media/logos/ti-db.svg" },
    { name: "YugabyteDB", logo: "https://cloud.yugabyte.com/logo-big.png" },
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
          <StyledCard>
            <CardContent>
              <Grid container spacing={3}>
                {databases.map((db) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={db.name}>
                    <StyledCard>
                      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                        <img
                          src={db.logo}
                          alt={`${db.name} logo`}
                          style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain', marginBottom: '12px' }}
                          onError={(e) => (e.target.src = 'https://via.placeholder.com/80?text=Logo+Not+Found')} // Fallback for broken images
                        />
                        <Typography variant="subtitle1" fontWeight="medium" color="#424242" textAlign="center">
                          {db.name}
                        </Typography>
                      </CardContent>
                    </StyledCard>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SupportedDbmsPage;
