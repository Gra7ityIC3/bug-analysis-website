import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import './App.css';
import Header from './general/Header';
import IssuesPage from './pages/IssuesPage';
import SummaryPage from './pages/SummaryPage';
import DatabaseSupportedPage from './pages/DatabaseSupportedPage';

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow pt-[100px]">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Routes>
              <Route path="/" element={<IssuesPage />} />
              <Route path="/summary" element={<SummaryPage />} />
              <Route path="/database-supported" element={<DatabaseSupportedPage />} />
            </Routes>
        </LocalizationProvider>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
