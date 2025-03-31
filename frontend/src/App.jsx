import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import './App.css';
import Header from './general/Header';
import GitHubIssuesPage from './pages/GitHubIssuesPage.jsx';
import SqlancerBugReportsPage from './pages/SqlancerBugReportsPage.jsx';
import SummaryPage from './pages/SummaryPage';
import SupportedDbmsPage from './pages/SupportedDbmsPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow pt-[100px]">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Routes>
              <Route path="/" element={<GitHubIssuesPage />} />
              <Route path="/sqlancer-bug-reports" element={<SqlancerBugReportsPage />} />
              <Route path="/summary" element={<SummaryPage />} />
              <Route path="/supported-dbms" element={<SupportedDbmsPage />} />
            </Routes>
        </LocalizationProvider>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
