function DatabaseSupportedPage() {
  return (
    <div className="p-2">
      <div className="flex justify-between mb-2">
        <h2 className="font-bold">Database Supported by SQLancer</h2>
      </div>

      <ul className="list-disc pl-5 mb-2">
        <li>Citus</li>
        <li>ClickHouse</li>
        <li>CnosDB</li>
        <li>CockroachDB</li>
        <li>Databend</li>
        <li>(Apache) DataFusion</li>
        <li>(Apache) Doris</li>
        <li>DuckDB</li>
        <li>H2</li>
        <li>HSQLDB</li>
        <li>MariaDB</li>
        <li>Materialize</li>
        <li>MySQL</li>
        <li>OceanBase</li>
        <li>PostgreSQL</li>
        <li>Presto</li>
        <li>QuestDB</li>
        <li>SQLite3</li>
        <li>TiDB</li>
        <li>YugabyteDB</li>
      </ul>
    </div>
  );
}

export default DatabaseSupportedPage;
