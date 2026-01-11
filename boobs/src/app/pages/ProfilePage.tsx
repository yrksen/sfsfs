import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, User, Search, X } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { DarkModeToggle } from '../components/DarkModeToggle';
import { RecentMoviesCarousel } from '../components/RecentMoviesCarousel';
import { Input } from '../components/ui/input';
import logoImage from 'figma:asset/7065e9310f2eb159d975d545f142962e3664b41e.png';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ea58c774`;

interface ProfilePageProps {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
  currentUser: any;
  setCurrentUser: (user: any) => void;
}

type ProfileSection = 'profile' | 'comments' | 'ratings' | 'logout';

export function ProfilePage({ isDarkMode, setIsDarkMode, currentUser, setCurrentUser }: ProfilePageProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<ProfileSection>('profile');
  const [userComments, setUserComments] = useState<any[]>([]);
  const [userRatings, setUserRatings] = useState<any[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Profile edit states
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState(currentUser?.profilePicture || '');
  const [updateMessage, setUpdateMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentMovies, setRecentMovies] = useState<any[]>([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Load recent movies for carousel
  useEffect(() => {
    loadRecentMovies();
  }, []);

  const loadRecentMovies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/movies`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        // Get 10 most recent movies
        const recent = [...data.movies]
          .sort((a, b) => b.dateAdded - a.dateAdded)
          .slice(0, 10);
        setRecentMovies(recent);
      }
    } catch (error) {
      console.error('Error loading recent movies:', error);
    }
  };

  const handleMovieClick = (movieId: string) => {
    navigate(`/movie/${movieId}`);
  };

  const handleTryMyLuck = () => {
    if (movies.length > 0) {
      const randomMovie = movies[Math.floor(Math.random() * movies.length)];
      navigate(`/movie/${randomMovie.id}`);
    }
  };

  // Fetch user comments
  useEffect(() => {
    if (activeSection === 'comments' && currentUser) {
      fetchUserComments();
    }
  }, [activeSection, currentUser]);

  // Fetch user ratings
  useEffect(() => {
    if (activeSection === 'ratings' && currentUser) {
      fetchUserRatings();
    }
  }, [activeSection, currentUser]);

  const fetchUserComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/comments`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        // Filter comments by this user
        const filtered = data.comments.filter((c: any) => c.username === currentUser.username);
        setUserComments(filtered);
        
        // Fetch movies to get titles
        const moviesResponse = await fetch(`${API_BASE_URL}/movies`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        const moviesData = await moviesResponse.json();
        if (moviesData.success) {
          setMovies(moviesData.movies);
        }
      }
    } catch (error) {
      console.error('Error fetching user comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRatings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user-ratings/${currentUser.username}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      
      console.log('User ratings response:', data);
      
      if (data.success) {
        // Convert userRatings object to array
        const ratingsArray = Object.entries(data.userRatings).map(([movieId, rating]) => ({
          movieId,
          rating: Number(rating),
        }));
        
        console.log('Ratings array:', ratingsArray);
        
        setUserRatings(ratingsArray);
        
        // Fetch both regular movies and "to watch" movies
        const [moviesResponse, toWatchResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/movies`, {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          }),
          fetch(`${API_BASE_URL}/towatch`, {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          }),
        ]);
        
        const moviesData = await moviesResponse.json();
        const toWatchData = await toWatchResponse.json();
        
        // Combine both movie lists
        const allMovies = [
          ...(moviesData.success ? moviesData.movies : []),
          ...(toWatchData.success ? toWatchData.movies : []),
        ];
        
        console.log('All movies:', allMovies);
        
        setMovies(allMovies);
      }
    } catch (error) {
      console.error('Error fetching user ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    navigate('/');
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMessage('');
    
    if (newPassword && newPassword !== confirmPassword) {
      setUpdateMessage('Passwords do not match');
      return;
    }
    
    // Update user data in localStorage
    const updatedUser = {
      ...currentUser,
      email: newEmail,
      profilePicture: profilePicture,
    };
    
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setUpdateMessage('Profile updated successfully!');
    
    // Clear password fields
    setNewPassword('');
    setConfirmPassword('');
  };

  const getMovieTitle = (movieId: string) => {
    const movie = movies.find(m => m.id === parseInt(movieId));
    return movie?.title || 'Unknown Movie';
  };

  if (!currentUser) return null;

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Main Header - Top section */}
      <div className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="relative flex items-center justify-between px-6 py-[14px]">
          {/* Left side - Logo */}
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => navigate('/')}
          >
            <img src={logoImage} alt="Trash Bin Logo" className="size-6" />
            <h1 className={`text-sm font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Trash Bin
            </h1>
          </div>
          
          {/* Center - Search Bar with Random */}
          <div className="absolute hidden md:flex items-center gap-4" style={{ left: 'calc(100vw / 8)', width: 'auto' }}>
            <div className="relative" style={{ width: 'calc(100vw / 8 * 3)' }}>
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 size-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              <Input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) {
                    navigate(`/?search=${encodeURIComponent(e.target.value)}`);
                  }
                }}
                className={`h-10 pl-10 pr-10 border rounded-lg ${isDarkMode ? 'bg-black text-white border-gray-800' : 'bg-white text-black border-gray-300'}`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-opacity hover:opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            
            {/* Random button */}
            <button
              onClick={handleTryMyLuck}
              className={`text-sm font-medium cursor-pointer hover:opacity-70 transition-opacity tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}
            >
              🎲 Random
            </button>
          </div>
          
          {/* Right side - To watch, Theme toggle and Profile */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* To watch for desktop */}
            <h1 
              className={`hidden md:block text-sm font-medium cursor-pointer hover:opacity-70 transition-opacity tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}
              onClick={() => navigate('/?view=towatch')}
            >
              To watch
            </h1>
            
            {/* To watch for mobile */}
            <h1 
              className={`md:hidden text-sm font-medium cursor-pointer hover:opacity-70 transition-opacity tracking-tight ${isDarkMode ? 'text-white' : 'text-black'}`}
              onClick={() => navigate('/?view=towatch')}
            >
              To watch
            </h1>
            
            <DarkModeToggle isDark={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
            
            <button
              onClick={() => navigate('/profile')}
              className={`text-sm font-medium cursor-pointer hover:opacity-70 transition-opacity tracking-tight whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}
            >
              Profile
            </button>
          </div>
        </div>
      </div>

      {/* Recent Movies Navigation - Full Width */}
      <header className="border-b w-full">
        <div className="w-full">
          <RecentMoviesCarousel movies={recentMovies} onMovieClick={handleMovieClick} />
        </div>
      </header>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className="mb-6 text-center">
                <div className={`w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className={`size-10 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  )}
                </div>
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  {currentUser.username}
                </h2>
                <p className={`text-[13px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {currentUser.email}
                </p>
              </div>

              <nav className="space-y-1">
                <button
                  onClick={() => setActiveSection('profile')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                    activeSection === 'profile'
                      ? isDarkMode
                        ? 'bg-white text-black'
                        : 'bg-black text-white'
                      : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  My Profile
                </button>
                
                <button
                  onClick={() => setActiveSection('comments')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                    activeSection === 'comments'
                      ? isDarkMode
                        ? 'bg-white text-black'
                        : 'bg-black text-white'
                      : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  My Comments
                </button>
                
                <button
                  onClick={() => setActiveSection('ratings')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                    activeSection === 'ratings'
                      ? isDarkMode
                        ? 'bg-white text-black'
                        : 'bg-black text-white'
                      : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  My Ratings
                </button>
                
                <button
                  onClick={handleLogout}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                    isDarkMode
                      ? 'text-red-400 hover:bg-gray-700'
                      : 'text-red-600 hover:bg-gray-200'
                  }`}
                >
                  Log Out
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">
            <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              {/* My Profile Section */}
              {activeSection === 'profile' && (
                <div>
                  <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    Edit Profile
                  </h2>
                  
                  {updateMessage && (
                    <div className={`mb-4 p-3 rounded-lg text-[13px] ${
                      updateMessage.includes('success')
                        ? isDarkMode ? 'bg-green-900/50 text-green-200' : 'bg-green-50 text-green-800'
                        : isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-800'
                    }`}>
                      {updateMessage}
                    </div>
                  )}
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                    <div>
                      <label className={`block mb-2 text-[13px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Profile Picture URL
                      </label>
                      <input
                        type="url"
                        value={profilePicture}
                        onChange={(e) => setProfilePicture(e.target.value)}
                        placeholder="Enter image URL"
                        className={`w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-black placeholder-gray-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block mb-2 text-[13px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                        className={`w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-black placeholder-gray-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block mb-2 text-[13px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        New Password (optional)
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current password"
                        className={`w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-black placeholder-gray-500'
                        }`}
                      />
                    </div>

                    {newPassword && (
                      <div>
                        <label className={`block mb-2 text-[13px] font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          required
                          className={`w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-black placeholder-gray-500'
                          }`}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className={`px-6 py-2.5 text-[13px] font-medium rounded-lg transition-opacity hover:opacity-90 ${
                        isDarkMode ? 'bg-white text-black' : 'bg-black text-white'
                      }`}
                    >
                      Update Profile
                    </button>
                  </form>
                </div>
              )}

              {/* My Comments Section */}
              {activeSection === 'comments' && (
                <div>
                  <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    My Comments
                  </h2>
                  
                  {loading ? (
                    <p className={`text-[13px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Loading comments...
                    </p>
                  ) : userComments.length === 0 ? (
                    <p className={`text-[13px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      You haven't posted any comments yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {userComments.map((comment) => (
                        <button
                          key={comment.id}
                          onClick={() => navigate(`/movie/${comment.movieId}`)}
                          className={`w-full text-left p-4 rounded-lg transition-colors hover:opacity-80 ${
                            isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className={`font-medium text-[14px] ${isDarkMode ? 'text-white' : 'text-black'}`}>
                              {getMovieTitle(comment.movieId)}
                            </h3>
                            <span className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(comment.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className={`text-[13px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {comment.text}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* My Ratings Section */}
              {activeSection === 'ratings' && (
                <div>
                  <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                    My Ratings
                  </h2>
                  
                  {loading ? (
                    <p className={`text-[13px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Loading ratings...
                    </p>
                  ) : userRatings.length === 0 ? (
                    <p className={`text-[13px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      You haven't rated any movies yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {userRatings.map((rating) => (
                        <button
                          key={rating.movieId}
                          onClick={() => navigate(`/movie/${rating.movieId}`)}
                          className={`w-full p-4 rounded-lg flex items-center justify-between transition-colors hover:opacity-80 ${
                            isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          <h3 className={`font-medium text-[14px] text-left ${isDarkMode ? 'text-white' : 'text-black'}`}>
                            {getMovieTitle(rating.movieId)}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`text-lg ${
                                  star <= rating.rating ? 'text-yellow-500' : isDarkMode ? 'text-gray-600' : 'text-gray-300'
                                }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="flex items-center justify-between px-6 py-[14px]">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Trash Bin Logo" className="size-7" />
            <span className={`text-[14px] font-medium uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Trash Bin
            </span>
          </div>
          <span className={`text-xs md:text-sm ${isDarkMode ? 'text-white/70' : 'text-gray-700'}`}>
            © {new Date().getFullYear()} All rights reserved
          </span>
        </div>
      </footer>
    </div>
  );
}