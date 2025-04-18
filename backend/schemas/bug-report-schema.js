import { z } from 'zod';

export const BugReport = z.object({
  dbms: z.enum([
    'Citus', 'ClickHouse', 'CnosDB', 'CockroachDB', 'Databend', 'DataFusion',
    'Doris', 'DuckDB', 'H2', 'HSQLDB', 'MariaDB', 'Materialize', 'MySQL',
    'OceanBase', 'PostgreSQL', 'Presto', 'QuestDB', 'SQLite3', 'TiDB', 'YugabyteDB',
    'ArangoDB', 'Cosmos', 'MongoDB', 'StarRocks', 'StoneDB', // Previously supported DBMSs
    'N/A',
  ]),
  // Oracle values obtained from:
  // https://github.com/sqlancer/bugs/blob/7a1e9edcaa63b04408c96b12777141485da3c714/bugs.py#L38-L44
  oracle: z.enum([
    'PQS',
    'error',
    'crash',
    'NoREC',
    'hang',
    'TLP (aggregate)',
    'TLP (HAVING)',
    'TLP (WHERE)',
    'TLP (GROUP BY)',
    'TLP (DISTINCT)',
    'N/A',
  ]),
  status: z.enum(['Open', 'Fixed', 'Closed', 'Not a bug']),
});
