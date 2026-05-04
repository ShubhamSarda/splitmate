import { useState } from 'react'
import { storage } from '../data/storage'
import { AuthContext } from './AuthContextValue'

function loadInitialUser() {
  storage.init()
  const id = storage.getCurrentUserId()
  if (!id) return null
  const u = storage.getUserById(id)
  if (!u) {
    storage.setCurrentUserId(null)
    return null
  }
  return u
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadInitialUser)

  function login(email, password) {
    const u = storage.getUserByEmail(email)
    if (!u) return { ok: false, error: 'No account with that email.' }
    if (u.password !== password) return { ok: false, error: 'Incorrect password.' }
    storage.setCurrentUserId(u.id)
    setUser(u)
    return { ok: true }
  }

  function register({ name, email, password }) {
    if (!name.trim()) return { ok: false, error: 'Name is required.' }
    if (!email.trim()) return { ok: false, error: 'Email is required.' }
    if (!password) return { ok: false, error: 'Password is required.' }
    if (storage.getUserByEmail(email)) {
      return { ok: false, error: 'An account with that email already exists.' }
    }
    const u = storage.createUser({ name, email, password })
    storage.setCurrentUserId(u.id)
    setUser(u)
    return { ok: true }
  }

  function logout() {
    storage.setCurrentUserId(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, ready: true, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
