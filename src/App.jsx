import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Admin from './pages/Admin'
import AcceptInvite from './pages/AcceptInvite'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/accept-invite" element={<AcceptInvite />} />
    </Routes>
  )
}
