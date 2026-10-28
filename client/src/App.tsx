import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './store/auth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ArtistDetail from './pages/ArtistDetail';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Library from './pages/Library';
import LikedTracks from './pages/LikedTracks';
import PlaylistDetail from './pages/PlaylistDetail';

function App() {
  const { loadFromStorage } = useAuth();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="artist" element={<ArtistDetail />} />
          <Route path="artist/:id" element={<ArtistDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="search" element={<Search />} />
          <Route path="library" element={<Library />} />
          <Route path="liked" element={<LikedTracks />} />
          <Route path="playlist/:id" element={<PlaylistDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;