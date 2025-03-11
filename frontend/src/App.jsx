import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import './App.css';
import Header from './general/Header';
import IssuesPage from './pages/IssuesPage';
import SummaryPage from './pages/SummaryPage';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Routes>
          <Route path="/" element={<IssuesPage />} />
          <Route path="/summary" element={<SummaryPage />} />
        </Routes>
      </LocalizationProvider>
    </BrowserRouter>
  );
}

export default App;
