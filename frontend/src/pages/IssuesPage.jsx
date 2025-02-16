import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';

function IssuesPage() {
    // useEffect(() => {
  //   axios.get("http://127.0.0.1:5000/github_issues?datetime=2025-01-15T00:00:00Z")
  //   .then((resp) => setIssues(resp.data.issues))
  //   .catch(error => console.log(error))
  // }, [])
  
  const data = [
    {
      title: 'Index Corruption in PostgreSQL',
      database: 'PostgreSQL',
      date: '2025-02-10',
      state: 'Open',
      description: 'Indexes become corrupted after multiple concurrent updates.',
      link: 'https://bugs.example.com/pg-index-corruption'
    },
    {
      title: 'MySQL Deadlock on Insert',
      database: 'MySQL',
      date: '2025-01-25',
      state: 'Resolved',
      description: 'Deadlocks occur when inserting into a table with foreign keys.',
      link: 'https://bugs.example.com/mysql-insert-deadlock'
    },
    {
      title: 'MongoDB Aggregation Performance Regression',
      database: 'MongoDB',
      date: '2025-02-05',
      state: 'In Progress',
      description: 'Aggregation queries are slower in version 6.0 compared to 5.0.',
      link: 'https://bugs.example.com/mongo-agg-performance'
    },
    {
      title: 'SQL Server Memory Leak on Large Joins',
      database: 'SQL Server',
      date: '2025-02-12',
      state: 'Open',
      description: 'Memory usage increases significantly when running complex joins.',
      link: 'https://bugs.example.com/sqlserver-memory-leak'
    },
    {
      title: 'Oracle Deadlock Issue with PL/SQL Procedures',
      database: 'Oracle',
      date: '2025-01-30',
      state: 'Resolved',
      description: 'PL/SQL procedures intermittently cause deadlocks in multi-user environments.',
      link: 'https://bugs.example.com/oracle-plsql-deadlock'
    },
  ];

  const [tableData] = useState(data)

  const columns = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        size: 200,
      },
      {
        accessorKey: 'database',
        header: 'Database',
        size: 150,
      },
      {
        accessorKey: 'date',
        header: 'Date posted',
        size: 150,
      },
      {
        accessorKey: 'state',
        header: 'State',
        size: 150,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        size: 200,
      },
      {
        accessorKey: 'link',
        header: 'Link',
        size: 150,
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: tableData, //data must be memoized or stable (useState, useMemo, defined outside of this component, etc.)
  });

  return (
    <div class='p-2'>
      <div class='flex justify-between mb-2'>
        <h2 class='font-bold'>Issues Found</h2>
      </div>
      
      <MaterialReactTable table={table} />
    </div>
  )
}

export default IssuesPage
