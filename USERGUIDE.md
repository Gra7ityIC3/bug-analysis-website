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

# Table of Contents
1. [Quick Start](#quick-start)
2. [Features](#features)
   
   3. [View Bug Reports Related to SQLancer](#viewing-bug-reports-related-to-sqlancer)
   4. [Filter Bug Reports](#filter-bug-reports)
   5. [Edit Listed Bug Reports](#edit-listed-bug-reports)
   6. [Delete Listed Bug Reports](#delete-listed-bug-reports)
   7. [Refresh List of Bugs](#refresh-list-of-bugs)
   8. [View List of Supported Database Management Systems](#view-list-of-supported-database-management-systems)
   9. [View Summary Statistics](#view-summary-statistics)

--------------------------------------------------------------------------------------------------------------------

<div style="page-break-after: always;"></div>

## Quick Start ⚡
<!-- Have to explain the setting up of .env files to link to a local PGSQL database -->

--------------------------------------------------------------------------------------------------------------------

<div style="page-break-after: always;"></div>

## Features

### Viewing Bug Reports Related to SQLancer
<!-- Mention both pages with listed bug reports -->

### Filter Bug Reports
<!-- Mention all the different ways of sorting and filtering -->

### Edit Listed Bug Reports


### Delete Listed Bug Reports


<div style="page-break-after: always;"></div>

### Refresh List of Bugs
<!-- For the Github issues -->

### View List of Supported Database Management Systems
The **Suppported DBMSs** page showcases DBMS compatible with SQLancer.

#### How to Use:
1. Navigate to **Supported DBMSs** from the header.
2. Browse the list of supported DBMS.
3. Note: This page is informational and does not require interaction.

####Supported DBMSs
Citus, ClickHouse, CnosDB, CockroachDB, Databend, DataFusion, Doris, DuckDB, H2, HSQLDB, MariaDB, Materialize, MySQL, OceanBase, PostgreSQL, Presto, QuestDB, SQLite3, TiDB, YugabyteDB.

---

### View Summary Statistics
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

---
