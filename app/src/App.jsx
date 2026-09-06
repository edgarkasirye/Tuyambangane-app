import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import Login from './auth/Login'
import Layout from './components/Layout'
import SalesView from './sales/SalesView'
import RecordSale from './sale/RecordSale'
import StylesList from './catalog/StylesList'
import StyleDetail from './catalog/StyleDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/sales" replace />} />
        <Route path="sales" element={<SalesView />} />
        <Route path="sales/record" element={<RecordSale />} />
        <Route path="catalog" element={<StylesList />} />
        <Route path="catalog/new" element={<StyleDetail isNew />} />
        <Route path="catalog/:styleId" element={<StyleDetail />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
