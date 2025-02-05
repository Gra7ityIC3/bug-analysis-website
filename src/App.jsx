import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import Header from './general/Header'
import IssuesPage from './pages/IssuesPage'

function App() {
  return (
    <>
      <Header/>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IssuesPage />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
