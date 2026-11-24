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
import ArtistTracks from './pages/ArtistTracks';
import LabelDashboard from './pages/LabelDashboard';
import AlbumDetailPage from './pages/AlbumDetail';
import Landing from './pages/Landing';
import RequireAuth from './components/RequireAuth';
import MixPage from './pages/MixPage';
import RecommendationSettings from './pages/RecommendationSettings';
import NewReleases from './pages/NewReleases';
import Popular from './pages/Popular';

function App() {
  const { loadFromStorage } = useAuth();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<Landing />} />
        <Route path="/label" element={<RequireAuth><LabelDashboard /></RequireAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Home />} />
          <Route path="recommendations" element={<RecommendationSettings />} />
          <Route path="mix/:id" element={<MixPage />} />
          <Route path="new-releases" element={<NewReleases />} />
          <Route path="popular" element={<Popular />} />
          <Route path="artist" element={<ArtistDetail />} />
          <Route path="artist/:id" element={<ArtistDetail />} />
          <Route path="/album/:id" element={<AlbumDetailPage />} />
          <Route path="profile" element={<Profile />} />
          <Route path="search" element={<Search />} />
          <Route path="library" element={<Library />} />
          <Route path="liked" element={<LikedTracks />} />
          <Route path="playlist/:id" element={<PlaylistDetail />} />
          <Route path="artist/:id/tracks" element={<ArtistTracks />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;