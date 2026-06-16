import './App.css'
import Navbar from './components/Navbar'
import DataOpsPage from './components/DataOpsPage'
import { AuthProvider } from './contexts/AuthContext'
import { SignalRProvider } from './contexts/SignalRContext'

function App() {
  return (
    <AuthProvider>
      <SignalRProvider>
        <Navbar />
        <DataOpsPage />
      </SignalRProvider>
    </AuthProvider>
  )
}

export default App
