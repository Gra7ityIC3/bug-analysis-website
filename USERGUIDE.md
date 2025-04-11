---
layout: page
title: User Guide
---

Welcome to the user guide for the bug analysis website for SQLancer. <br>

This website is designed to **compile bugs found by SQLancer** reported in different sources and **aggregating the data collected into graphs and tables** to derive useful information. <br>

If you are a database designer or database tester this website can help you to keep track and take note of currently open bug reports as well as bugs that have already been fixed! <br>

If you are a database user this website can help you to find interesting trends such as which database management system has had the least bugs in recent months or fix bug reports the quickest! <br>

Refer to the `Quick Start` section to get the website running and the `Features` section on the features that are available. <br>

<div style="page-break-after: always;"></div>

## Table of Contents

1. [Quick Start](#quick-start)
2. [Features](#features)
   - [Viewing bug reports](#viewing-bug-reports)
   - [Searching and filtering bug reports](#searching-and-filtering-bug-reports)
   - [Editing bug reports](#editing-bug-reports)
   - [Deleting bug reports](#deleting-bug-reports)
   - [Refreshing list of bug reports](#refreshing-list-of-bug-reports)
   - [Generating charts for selected bug reports](#generating-charts-for-selected-bug-reports)
   - [Viewing summary statistics](#viewing-summary-statistics)
   - [Viewing supported DBMSs](#viewing-supported-dbmss)

## Quick Start

<!-- TODO: add link to release -->
1. Ensure you have Java `17` and npm `10.9.2` installed on your computer. <br>
   Note that other versions of Java and npm may encounter errors when launching the website.

2. Download the latest release from [here](). <!-- add link to release -->

3. Copy the file to the folder you want to use as the _home folder_ for the website.

4. Open two command terminals and `cd` into the folder.
   1. For the `backend`
        1. `cd` into the `backend` folder and run the command `npm install` to install the required prerequisites.
        2. Create a `.env` file in the `backend` folder with the following lines:
           ```
           DATABASE_URL=<insert link to the database>
           OPENAI_API_KEY=<insert openai api key>
           ```
        3. Run the command `node server.js` to launch the backend.

   2. For the `frontend`
      1. `cd` into the `frontend` folder and run the command `npm install` to install the required prerequisites.
      2. Run the command `npm run dev` to launch the website.
      3. The website can be accessed through `http://localhost:5173/`

5. Access the website to explore the available features as explained below.

## Features

### Viewing bug reports

### Searching and filtering bug reports

### Editing bug reports

### Deleting bug reports

### Refreshing list of bug reports

### Generating charts for selected bug reports

### Viewing summary statistics

The **Summary Statistics** page provides a dashboard to analyze bug data across DBMS.

#### Key Features:
- **View Modes**:
  - Toggle between **Table**, **Bar Chart**, and **Line Chart** using icons:
    - **Table** (📋): Lists DBMS with counts for Open, Total, and Fixed issues.
    - **Bar Chart** (📊): Visualizes Open and Fixed issues per DBMS in stacked bars.
    - **Line Chart** (📈): Shows monthly bug trends over time.
- **Table View**:
  - Filter by DBMS or use range filters for issue counts.
  - Sort by clicking column headers.
- **Bar Chart View**:
  - Compare Open vs. Fixed issues visually for each DBMS.
- **Line Chart View**:
  - **Date Range Filter**: Select **From Month** and **To Month** using date pickers to focus on a specific period.
  - **DBMS Filter**: Click chips (e.g., "PostgreSQL", "MySQL") to include/exclude specific DBMS.
  - **Reset**: Click the "Reset" button to clear date and DBMS filters.
  - Displays a "Total Bugs" line alongside individual DBMS trends.

#### How to Use:
1. Navigate to **Summary Statistics** from the header.
2. Choose a view mode:
   - Use **Table** for raw data.
   - Switch to **Bar Chart** for a quick visual comparison.
   - Select **Line Chart** for trend analysis.
3. In Line Chart mode:
   - Pick a date range (e.g., Jan 2024 to Apr 2025).
   - Click DBMS chips to focus on specific databases.
   - Reset filters if needed.
4. Hover over chart points for detailed tooltips (e.g., "PostgreSQL, March 2025: 15 bugs").

### Viewing supported DBMSs

The **Suppported DBMSs** page shows all database management systems currently supported by SQLancer.

> [!NOTE]
> This page is informational and does not require interaction.

**Supported DBMSs:**

- Citus
- ClickHouse
- CnosDB
- CockroachDB
- Databend
- DataFusion
- Doris
- DuckDB
- H2
- HSQLDB
- MariaDB
- Materialize
- MySQL
- OceanBase
- PostgreSQL
- Presto
- QuestDB
- SQLite3
- TiDB
- YugabyteDB
