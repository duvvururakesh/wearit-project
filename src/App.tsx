import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WardrobeProvider } from '@/hooks/useWardrobe'
import TopNav from '@/components/TopNav'
import Home from '@/pages/Home'
import OutfitBuilder from '@/pages/OutfitBuilder'
import Closet from '@/pages/Closet'
import ItemDetail from '@/pages/ItemDetail'
import SavedLooks from '@/pages/SavedLooks'
import TryFit from '@/pages/TryFit'
import AddItem from '@/pages/AddItem'

export default function App() {
  return (
    <WardrobeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-bg">
          <TopNav />
          <main className="pt-[96px] md:pt-[56px]">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/builder" element={<OutfitBuilder />} />
              <Route path="/closet" element={<Closet />} />
              <Route path="/item/:id" element={<ItemDetail />} />
              <Route path="/looks" element={<SavedLooks />} />
              <Route path="/tryfit" element={<TryFit />} />
              <Route path="/add" element={<AddItem />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </WardrobeProvider>
  )
}
