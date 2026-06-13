import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type AuthContextType = {
  isConnected: boolean
  setIsConnected: (v: boolean) => void
}

const AuthContext = createContext<AuthContextType>({
  isConnected: false,
  setIsConnected: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)

  return (
    <AuthContext.Provider value={{ isConnected, setIsConnected }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
