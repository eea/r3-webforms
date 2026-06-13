import './App.css'
import Navbar from './components/Navbar'
import DataOpsPage from './components/DataOpsPage'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <DataOpsPage />
    </AuthProvider>
  )
}

export default App
