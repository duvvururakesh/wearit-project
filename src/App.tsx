import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WardrobeProvider } from '@/hooks/useWardrobe'
import TopNav from '@/components/TopNav'
import Home from '@/pages/Home'
import OutfitBuilder from '@/pages/OutfitBuilder'
import Closet from '@/pages/Closet'
import Collection from '@/pages/Collection'
import ItemDetail from '@/pages/ItemDetail'
import SavedLooks from '@/pages/SavedLooks'
import TryFit from '@/pages/TryFit'
import AddItem from '@/pages/AddItem'
import Backup from '@/pages/Backup'
import Account from '@/pages/Account'

export default function App() {
  return (
    <WardrobeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-bg">
          <TopNav />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/builder" element={<OutfitBuilder />} />
              <Route path="/closet" element={<Closet />} />
              <Route path="/collection" element={<Collection />} />
              <Route path="/item/:id" element={<ItemDetail />} />
              <Route path="/looks" element={<SavedLooks />} />
              <Route path="/tryfit" element={<TryFit />} />
              <Route path="/add" element={<AddItem />} />
              <Route path="/upload" element={<AddItem />} />
              <Route path="/backup" element={<Backup />} />
              <Route path="/account" element={<Account />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </WardrobeProvider>
  )
}
