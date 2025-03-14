function DatabaseSupportedPage() {
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
    <div className="p-2">
      <div className="flex justify-between mb-2">
        <h2 className="font-bold">Database Supported by SQLancer</h2>
      </div>

      <div className="grid grid-cols-4 gap-4 p-2">
        {databases.map((db) => (
          <div key={db.name} className="flex flex-col items-center p-2 border rounded-lg shadow">
            <img src={db.logo} alt={`${db.name} logo`} className="h-30 w-42 object-contain mb-2" />
            <p className="font-semibold">{db.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DatabaseSupportedPage;
