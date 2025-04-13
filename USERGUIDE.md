---
layout: page
title: User Guide
---

# Bug Analysis Website User Guide

Welcome to the user guide for the bug analysis website for SQLancer. <br>

This website is designed to **compile bugs found by SQLancer** reported in different sources and **aggregating the data collected into graphs and tables** to derive useful information. <br>

If you are a database designer or database tester this website can help you to keep track and take note of currently open bug reports as well as bugs that have already been fixed! <br>

If you are a database user this website can help you to find interesting trends such as which database management system has had the least bugs in recent months or fix bug reports the quickest! <br>

Refer to the `Quick Start` section to get the website running and the `Features` section on the features that are available.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Features](#features)
   - [Viewing bug reports](#viewing-bug-reports)
   - [Searching and filtering bug reports](#searching-and-filtering-bug-reports)
   - [Sorting and grouping bug reports](#sorting-and-grouping-bug-reports)
   - [Editing bug reports](#editing-bug-reports)
   - [Deleting bug reports](#deleting-bug-reports)
   - [Refreshing list of bug reports](#refreshing-list-of-bug-reports)
   - [Generating charts for selected bug reports](#generating-charts-for-selected-bug-reports)
   - [Viewing summary statistics](#viewing-summary-statistics)
   - [Viewing supported DBMSs](#viewing-supported-dbmss)

## Quick Start

1. Ensure you have [Node.js](https://nodejs.org/en/download) version 18 or later installed.
2. Download and unzip the source code archive file from [here](https://github.com/NUS-CS3213-AY2425S2/bug-analysis-project-group-13/releases/latest).
3. Download the `.env` file from [Google Drive](https://drive.google.com/file/d/1h-SdR_qSfQC5Fzs8qkBQ3JCDehea29-l/view?usp=sharing) and save it in the `backend/` directory.

   > When downloading the `.env` file, make sure the filename includes the leading `.`.

4. Open two command terminals and `cd` to the project directory.

   On the first terminal, run the following commands:

   ```
   cd frontend
   npm install
   npm run dev
   ```

   On the second terminal, run the following commands:

   ```
   cd backend
   npm install
   node server.js
   ```
5. The website can be accessed at http://localhost:5173/.

## Features

### Viewing bug reports

The **GitHub Issues** page consists GitHub Issues that are related to [SQLancer Bugs](https://github.com/search?q=sqlancer&type=issues&s=created&o=desc).

<img alt="GitHub Issues" width="800" align="center" src="images/GiHubIssues.png">

<br/>

The **SQLancer Bug Report** page consists bugs that are listed in [SQLancer Bugs Repository](https://github.com/sqlancer/bugs).

<img alt="SQLancer Bug Reports" width="800" align="center" src="images/SQLancerBugReports.png">

### Searching and filtering bug reports

You can use the **search bar** to look for bugs in the table. The search is case-insensitive and returns matches in the title, DBMS, test oracle, or status fields.

<img alt="Search" width="800" align="center" src="images/Search.png">

<br/>

Click on the filter toggle button to show or hide filters.

<img alt="Filter Toggle" width="800" align="center" src="images/FilterToggle.png">

<br/>

Alternatively, you can also click on column action to filter by certain column.

<img alt="Filter" width="800" align="center" src="images/Filter.png">

### Sorting and grouping bug reports

The Title, DBMS, Test Oracle, Status, Date Posted, Last Updated, and Severity columns can be sorted in ascending or descending order. By default, the list is sorted in descending order based on the Date Posted column.

<img alt="Sort Toggle" width="800" align="center" src="images/SortToggle.png">

<br/>

Alternatively, you can also click on column action to sort by certain column.

<img alt="Sort" width="800" align="center" src="images/Sort.png">

<br/>

The DBMS, Test Oracle, Status and Severity columns can be grouped by dragging the move button into the drop region.

<img alt="Sort" width="800" align="center" src="images/Grouping.gif">

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

<!-- Insert screenshot here -->

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
