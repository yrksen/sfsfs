import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Star, Calendar, Clock, Film, Users, ExternalLink, Trash2, Search, X, User, Check, Tag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Movie } from '../components/MovieCard';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { DarkModeToggle } from '../components/DarkModeToggle';
import { LoginModal } from '../components/LoginModal';
import { AddMovieDialog } from '../components/AddMovieDialog';
import logoImage from 'figma:asset/7065e9310f2eb159d975d545f142962e3664b41e.png';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ea58c774`;

interface Comment {
  id: number;
  movieId: number;
  username: string;
  text: string;
  timestamp: number;
  profilePicture?: string;
}

interface MovieDetailPageProps {
  currentUser: any;
  setCurrentUser: (user: any) => void;
}

export function MovieDetailPage({ currentUser, setCurrentUser }: MovieDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [username, setUsername] = useState('');
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [communityRating, setCommunityRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  
  // Password prompt state for deleting comments
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<number | null>(null);
  const [pendingDeleteUsername, setPendingDeleteUsername] = useState('');
  
  // Password prompt state for updating poster
  const [showPosterPrompt, setShowPosterPrompt] = useState(false);
  const [posterPassword, setPosterPassword] = useState('');
  const [posterPasswordError, setPosterPasswordError] = useState('');
  const [newPosterUrl, setNewPosterUrl] = useState('');
  
  // Password prompt state for deleting movie
  const [showDeleteMoviePrompt, setShowDeleteMoviePrompt] = useState(false);
  const [deleteMoviePassword, setDeleteMoviePassword] = useState('');
  const [deleteMoviePasswordError, setDeleteMoviePasswordError] = useState('');

  // Tags state
  const [newTag, setNewTag] = useState('');

  // For AddMovieDialog
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  
  // Track if this movie is from the "to watch" list
  const [isFromToWatch, setIsFromToWatch] = useState(false);

  // Generate or retrieve anonymous user ID for non-logged-in users
  const getAnonymousUserId = () => {
    let anonymousId = localStorage.getItem('anonymousUserId');
    if (!anonymousId) {
      // Generate a unique ID using timestamp + random string
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('anonymousUserId', anonymousId);
    }
    return anonymousId;
  };

  const handleTryMyLuck = () => {
    // Navigate to home page and let it handle the random selection
    navigate('/');
  };

  // Apply dark mode on load and when it changes
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (id) {
      loadMovieData();
      loadComments();
      loadUserRating();
    }
  }, [id, currentUser]);

  const loadMovieData = async () => {
    try {
      setIsLoading(true);
      
      // Load from main movies
      const moviesResponse = await fetch(`${API_BASE_URL}/movies`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const moviesData = await moviesResponse.json();
      
      // Load from to watch
      const toWatchResponse = await fetch(`${API_BASE_URL}/towatch`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const toWatchData = await toWatchResponse.json();
      
      // Combine and find the movie
      const allMoviesData = [...moviesData.movies, ...toWatchData.movies];
      setAllMovies(allMoviesData);
      const foundMovie = allMoviesData.find((m: Movie) => m.id === parseInt(id!));
      
      if (foundMovie) {
        setMovie(foundMovie);
        // Don't set userRating here - let loadUserRating handle it
        
        // Set the poster URL input to current poster by default
        setNewPosterUrl(foundMovie.image);
        
        // Find recommended movies based on the first genre (randomly ordered)
        if (foundMovie.genre) {
          // Get the first genre from the current movie
          const firstGenre = foundMovie.genre.split(',')[0].trim().toLowerCase();
          
          // Filter movies that have the same first genre
          const filtered = allMoviesData.filter((m: Movie) => 
            m.id !== foundMovie.id && // Exclude current movie
            m.genre && 
            m.genre.split(',').some((g: string) => 
              g.trim().toLowerCase() === firstGenre
            )
          );
          
          // Randomize and take 5
          const shuffled = filtered.sort(() => Math.random() - 0.5);
          const similar = shuffled.slice(0, 5);
          
          setSimilarMovies(similar);
        }
        
        // Check if this movie is from the "to watch" list
        setIsFromToWatch(toWatchData.movies.some((m: Movie) => m.id === foundMovie.id));
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading movie:', error);
      setIsLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/comments`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      
      const movieComments = data.comments.filter((c: Comment) => c.movieId === parseInt(id!));
      setComments(movieComments.sort((a: Comment, b: Comment) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadUserRating = async () => {
    if (!id) return;

    console.log('Loading user rating for movie ID:', id);

    try {
      // Load community rating for this movie
      const ratingsResponse = await fetch(`${API_BASE_URL}/ratings/${id}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const ratingsData = await ratingsResponse.json();
      console.log('Community ratings data:', ratingsData);
      
      if (ratingsData.success) {
        setCommunityRating(ratingsData.average || 0);
        setRatingCount(ratingsData.count || 0);
        
        // Update movie object with community rating
        if (movie) {
          setMovie({
            ...movie,
            communityRating: ratingsData.average,
            ratingCount: ratingsData.count
          });
        }
      }

      // Determine user identifier
      let userIdentifier = '';
      if (currentUser) {
        userIdentifier = currentUser.username;
      } else {
        userIdentifier = getAnonymousUserId();
      }

      console.log('Fetching ratings for user identifier:', userIdentifier);

      // Load user's personal rating
      const userRatingsResponse = await fetch(`${API_BASE_URL}/user-ratings/${userIdentifier}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const userData = await userRatingsResponse.json();
      console.log('User ratings data:', userData);
      
      if (userData.success && userData.userRatings) {
        const rating = userData.userRatings[id] || 0;
        console.log(`User's rating for movie ${id}:`, rating);
        setUserRating(rating);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  };

  const handleAddComment = async () => {
    // For logged-in users, use their username automatically
    const finalUsername = currentUser ? currentUser.username : username.trim();
    
    if (!newComment.trim() || !finalUsername) {
      alert('Please fill in all fields (username and comment)');
      return;
    }

    try {
      const comment = {
        id: Date.now(),
        movieId: parseInt(id!),
        username: finalUsername,
        text: newComment.trim(),
        timestamp: Date.now(),
        profilePicture: currentUser?.profilePicture || ''
      };

      await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(comment),
      });

      setNewComment('');
      if (!currentUser) {
        setUsername('');
      }
      loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: number, commentUsername: string) => {
    // If user is logged in and owns the comment, delete without password
    if (currentUser && currentUser.username === commentUsername) {
      const confirm = window.confirm('Are you sure you want to delete this comment?');
      if (!confirm) return;
      
      try {
        await fetch(`${API_BASE_URL}/comments/${commentId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        });
        loadComments();
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
      return;
    }

    // For other cases, prompt for master password
    setShowDeletePrompt(true);
    setPendingDeleteCommentId(commentId);
    setPendingDeleteUsername(commentUsername);
  };

  const handleDeletePasswordSubmit = async () => {
    if (!pendingDeleteCommentId) return;

    // Check master password "hassle"
    if (deletePassword !== 'hassle') {
      setDeletePasswordError('Incorrect password');
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/comments/${pendingDeleteCommentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      loadComments();
      setShowDeletePrompt(false);
      setDeletePassword('');
      setDeletePasswordError('');
    } catch (error) {
      console.error('Error deleting comment:', error);
      setShowDeletePrompt(false);
      setDeletePassword('');
      setDeletePasswordError('');
    }
  };

  const handleRatingChange = async (rating: number) => {
    if (!movie) return;

    let userIdentifier = '';

    // If logged in, use their username
    if (currentUser) {
      userIdentifier = currentUser.username;
    } else {
      // For non-logged-in users, use anonymous ID
      userIdentifier = getAnonymousUserId();
    }

    console.log('Submitting rating:', { movieId: movie.id, rating, userIdentifier });

    try {
      // Submit rating to the ratings API
      const response = await fetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieId: movie.id,
          rating: rating,
          userIdentifier: userIdentifier,
        }),
      });

      const data = await response.json();
      console.log('Rating submission response:', data);
      
      if (data.success) {
        setUserRating(rating);
        console.log('Rating submitted successfully, reloading ratings...');
        // Reload ratings to update community rating
        await loadUserRating();
      } else {
        console.error('Failed to submit rating:', data.error);
        alert(`Failed to submit rating: ${data.error}`);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    }
  };

  const handleUpdatePoster = () => {
    if (newPosterUrl.trim() !== '') {
      setShowPosterPrompt(true);
      setPosterPassword('');
      setPosterPasswordError('');
    }
  };

  const handlePosterPasswordSubmit = async () => {
    if (!movie) return;

    // Check master password "hassle"
    if (posterPassword !== 'hassle') {
      setPosterPasswordError('Incorrect password');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/movies/${movie.id}/poster`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: newPosterUrl }), // Changed from imageUrl to image
      });
      
      if (!response.ok) {
        throw new Error('Failed to update poster');
      }

      const data = await response.json();
      console.log('Poster updated successfully:', data);
      
      // Update the movie state
      setMovie({ ...movie, image: newPosterUrl });
      setNewPosterUrl('');
      setShowPosterPrompt(false);
      setPosterPassword('');
      setPosterPasswordError('');
      
      alert('Poster updated successfully!');
    } catch (error) {
      console.error('Error updating poster:', error);
      setPosterPasswordError('Failed to update poster');
    }
  };

  const handleDeleteMovie = () => {
    setShowDeleteMoviePrompt(true);
    setDeleteMoviePassword('');
    setDeleteMoviePasswordError('');
  };

  const handleDeleteMoviePasswordSubmit = async () => {
    if (!movie) return;

    // Check master password "hassle"
    if (deleteMoviePassword !== 'hassle') {
      setDeleteMoviePasswordError('Incorrect password');
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/movies/${movie.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      
      // Navigate back to home after deleting
      navigate('/');
    } catch (error) {
      console.error('Error deleting movie:', error);
      setDeleteMoviePasswordError('Failed to delete movie');
    }
  };

  const handleAddMovie = async (newMovie: Movie) => {
    try {
      // Add to main movies collection
      await fetch(`${API_BASE_URL}/movies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(newMovie),
      });
      
      // Reload movies list
      await loadMovieData();
    } catch (error) {
      console.error('Error adding movie:', error);
    }
  };

  const handleMarkAsWatched = async () => {
    if (!movie) return;

    const confirmed = window.confirm(`Mark "${movie.title}" as watched and move to main list?`);
    if (!confirmed) return;

    try {
      // Delete from to-watch
      await fetch(`${API_BASE_URL}/towatch/${movie.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });

      // Add to main movies with updated timestamp
      const movieToAdd = {
        ...movie,
        dateAdded: Date.now(), // Update the timestamp so it appears in recently added
      };

      await fetch(`${API_BASE_URL}/movies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(movieToAdd),
      });

      // Navigate back to home
      navigate('/');
    } catch (error) {
      console.error('Error marking movie as watched:', error);
      alert('Failed to mark movie as watched. Please try again.');
    }
  };

  const handleAddTag = async () => {
    if (!movie || !newTag.trim()) return;

    const currentTags = movie.tags || [];
    const updatedTags = [...currentTags, newTag.trim()];

    try {
      const endpoint = isFromToWatch ? 'towatch' : 'movies';
      const response = await fetch(`${API_BASE_URL}/${endpoint}/${movie.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (response.ok) {
        setMovie({ ...movie, tags: updatedTags });
        setNewTag('');
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!movie) return;

    const currentTags = movie.tags || [];
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);

    try {
      const endpoint = isFromToWatch ? 'towatch' : 'movies';
      const response = await fetch(`${API_BASE_URL}/${endpoint}/${movie.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (response.ok) {
        setMovie({ ...movie, tags: updatedTags });
      }
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-lg dark:text-white">Loading...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4 dark:text-white">Movie not found</h1>
          <Button onClick={() => navigate('/')}>Go Back Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark' : ''}`}>
      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* Header - Minimal B&W Style */}
      <div 
        className="border-b py-4 sticky top-0 z-40 md:relative backdrop-blur-sm md:backdrop-blur-none bg-white dark:bg-black"
      >
        <div className="flex items-center justify-between gap-4 px-6">
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
                onChange={(e) => setSearchQuery(e.target.value)}
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
              className={`text-sm font-medium cursor-pointer hover:opacity-70 transition-opacity tracking-tight whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}
            >
              🎲 Random
            </button>
          </div>
          
          {/* Right side - To watch, Theme toggle and Sign in */}
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
            
            {/* Add Movie button */}
            <AddMovieDialog
              onAddMovie={handleAddMovie}
              existingMovies={allMovies}
            />
            
            <DarkModeToggle isDark={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
            
            {currentUser ? (
              <button
                onClick={() => navigate('/profile')}
                className={`text-sm font-medium cursor-pointer hover:opacity-70 transition-opacity tracking-tight whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}
              >
                Profile
              </button>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className={`text-sm font-medium cursor-pointer hover:opacity-70 transition-opacity tracking-tight whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-black'}`}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pb-8">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            className="mb-6 dark:text-white dark:hover:bg-gray-800"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>

          {/* Main Layout with Sidebar */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column - Poster */}
            <div className="lg:w-80 shrink-0">
              {/* Movie Poster Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <img 
                  src={movie.image} 
                  alt={movie.title}
                  className="w-full object-cover"
                />
                
                {/* Update Poster - directly under poster */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="mb-3">
                    <input
                      type="text"
                      value={newPosterUrl}
                      onChange={(e) => setNewPosterUrl(e.target.value)}
                      className="w-full px-3 py-2 text-[11px] border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={movie.image}
                    />
                  </div>
                  <button
                    onClick={handleUpdatePoster}
                    className="w-full px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-black dark:text-white text-[13px] font-medium rounded hover:opacity-90 transition-opacity"
                  >
                    Update Poster
                  </button>
                </div>
              </div>
            </div>

            {/* Middle Column - Movie Details */}
            <div className="flex-1">
              {/* Movie Details Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden p-6 mb-8">
                {/* Name */}
                <h1 className="text-2xl font-bold mb-3 dark:text-white">{movie.title}</h1>
                
                {/* Year, Length, Genres */}
                <div className="flex flex-wrap gap-4 mb-4 text-[13px] text-gray-600 dark:text-gray-400">
                  {movie.year && (
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4" />
                      <span>{movie.year}</span>
                    </div>
                  )}
                  {movie.runtime && (
                    <div className="flex items-center gap-2">
                      <Clock className="size-4" />
                      <span>{movie.runtime}</span>
                    </div>
                  )}
                  {movie.genre && (
                    <div className="flex items-center gap-2">
                      <Film className="size-4" />
                      <span>{movie.genre}</span>
                    </div>
                  )}
                </div>

                {/* Ratings Row: IMDb (left) + User Rating (right) */}
                <div className="flex flex-wrap items-start justify-between gap-8 mb-4">
                  {/* IMDb Rating (Left) */}
                  <div>
                    <h3 className="text-[13px] text-gray-600 dark:text-gray-400 mb-2">IMDb Rating</h3>
                    <div className="flex items-center gap-2">
                      {(movie.imdbRating || movie.rating) && (
                        <>
                          <Star className="size-5 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold dark:text-white text-lg">
                            {movie.imdbRating || movie.rating}
                          </span>
                          <span className="text-sm text-gray-400 dark:text-gray-500">/ 10</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* User Rating (Right) */}
                  <div>
                    <h3 className="text-[13px] text-gray-600 dark:text-gray-400 mb-2">Your Rating</h3>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRatingChange(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`size-5 ${
                              star <= (hoverRating || userRating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-none text-gray-300 dark:text-gray-600 stroke-2'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Community Rating */}
                {movie.communityRating && movie.communityRating > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="size-4 text-blue-500" />
                    <span className="font-semibold dark:text-white text-[15px]">
                      {movie.communityRating.toFixed(1)}
                    </span>
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">
                      ({movie.ratingCount || 0} {movie.ratingCount === 1 ? 'rating' : 'ratings'})
                    </span>
                  </div>
                )}

                {/* Director */}
                {movie.director && (
                  <div className="mb-2 flex items-center gap-2">
                    <User className="size-4 text-gray-600 dark:text-gray-400" />
                    <span className="font-semibold dark:text-white text-[13px]">Director: </span>
                    <span className="text-gray-700 dark:text-gray-300 text-[13px]">{movie.director}</span>
                  </div>
                )}

                {/* Cast */}
                {movie.cast && (
                  <div className="mb-2 flex items-start gap-2">
                    <Users className="size-4 text-gray-600 dark:text-gray-400 mt-0.5" />
                    <div>
                      <span className="font-semibold dark:text-white text-[13px]">Cast: </span>
                      <span className="text-gray-700 dark:text-gray-300 text-[13px]">
                        {Array.isArray(movie.cast) ? movie.cast.join(", ") : movie.cast}
                      </span>
                    </div>
                  </div>
                )}

                {/* Plot */}
                {movie.plot && (
                  <div className="mb-3">
                    <h3 className="font-semibold mb-1 dark:text-white text-[13px]">Plot:</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-[13px]">{movie.plot}</p>
                  </div>
                )}

                {/* View on IMDb */}
                {movie.imdbId && (
                  <div className="mb-4">
                    <a
                      href={`https://www.imdb.com/title/${movie.imdbId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-full text-yellow-900 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors text-[13px] font-medium"
                    >
                      <ExternalLink className="size-4" />
                      View on IMDb
                    </a>
                  </div>
                )}

                {/* Tags */}
                {movie.tags && movie.tags.length > 0 && (
                  <div className="mb-3">
                    <h3 className="font-semibold mb-2 dark:text-white text-[13px]">Tags:</h3>
                    <div className="flex flex-wrap gap-2">
                      {movie.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-[11px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Trailer */}
              {movie.trailerUrl && (
                <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4 dark:text-white">Trailer</h2>
                  <div className="aspect-video">
                    <iframe
                      src={movie.trailerUrl}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                      title="Movie Trailer"
                    />
                  </div>
                </div>
              )}

              {/* Mark as Watched Button - Only show for to-watch movies */}
              {isFromToWatch && (
                <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4 dark:text-white">Mark as Watched</h2>
                  <button
                    onClick={handleMarkAsWatched}
                    className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="size-4" />
                    Mark as Watched
                  </button>
                </div>
              )}

              {/* Delete Movie Section */}
              <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-base font-bold mb-4 dark:text-white">Delete Movie</h2>
                <button
                  onClick={handleDeleteMovie}
                  className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
              </div>

              {/* Comments Section */}
              <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
                <h2 className="text-base font-bold mb-4 dark:text-white">Comments</h2>

                {/* Add Comment Form */}
                <div className="mb-6 space-y-3">
                  {/* Show username field only if not logged in */}
                  {!currentUser && (
                    <input
                      type="text"
                      placeholder="Your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 text-[13px] border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  {/* Show logged-in user info */}
                  {currentUser && (
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                        {currentUser.profilePicture ? (
                          <img src={currentUser.profilePicture} alt={currentUser.username} className="w-full h-full object-cover" />
                        ) : (
                          <User className={`size-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        )}
                      </div>
                      <span className={`text-[13px] font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        Commenting as {currentUser.username}
                      </span>
                    </div>
                  )}
                  <textarea
                    placeholder="Write your comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-[13px] border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <button 
                    onClick={handleAddComment} 
                    className="w-full px-4 py-2.5 bg-blue-500 text-white text-[13px] font-medium rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Add Comment
                  </button>
                </div>

                {/* Comments List */}
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-[13px]">
                      No comments yet. Be the first to comment!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-start gap-3 mb-2">
                          {/* Profile Picture */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                            {comment.profilePicture ? (
                              <img src={comment.profilePicture} alt={comment.username} className="w-full h-full object-cover" />
                            ) : (
                              <User className={`size-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            )}
                          </div>
                          
                          {/* Comment Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <span className="font-semibold dark:text-white text-[13px]">{comment.username}</span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-2">
                                  {new Date(comment.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              {/* Show delete button for everyone */}
                              <button
                                onClick={() => handleDeleteComment(comment.id, comment.username)}
                                className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 text-[13px] leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar - Recommended */}
            <div className="lg:w-80 space-y-6">
              {/* Tags Section */}
              <div className={`rounded-lg shadow-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-[#F3EAF9]'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="size-5 dark:text-white" />
                  <h2 className="text-lg font-bold dark:text-white">Tags</h2>
                </div>
                
                {/* Existing Tags or No tags message */}
                {movie.tags && movie.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {movie.tags.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-[11px]"
                      >
                        <span>{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:opacity-70 transition-opacity"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic text-sm mb-4">
                    No tags yet
                  </p>
                )}

                {/* Add Tag Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tag..."
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-purple-400 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}
                  />
                  <button
                    onClick={handleAddTag}
                    className={`px-5 py-2 text-sm font-medium rounded-lg transition-opacity hover:opacity-90 ${isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-500 text-white'}`}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Recommended Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-8">
                <h2 className="text-lg font-bold mb-4 dark:text-white">Recommended</h2>
                
                {similarMovies.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-[13px]">
                    No recommendations found
                  </p>
                ) : (
                  <div className="space-y-4">
                    {similarMovies.map((similarMovie) => (
                      <div
                        key={similarMovie.id}
                        onClick={() => navigate(`/movie/${similarMovie.id}`)}
                        className="cursor-pointer group"
                      >
                        <div className="flex gap-3">
                          <img
                            src={similarMovie.image}
                            alt={similarMovie.title}
                            className="w-20 h-28 object-cover rounded-lg group-hover:opacity-80 transition-opacity"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[13px] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                              {similarMovie.title}
                            </h3>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                              {similarMovie.year}
                            </p>
                            {(similarMovie.imdbRating || similarMovie.rating) && (
                              <div className="flex items-center gap-1 mt-2">
                                <Star className="size-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-[11px] font-medium dark:text-white">
                                  {similarMovie.imdbRating || similarMovie.rating}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t">
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

      {/* Delete Comment Password Prompt */}
      {showDeletePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 dark:text-white">Delete Comment</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Enter the password to delete this comment:
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {deletePasswordError && (
              <p className="text-red-500 text-[13px] mt-2">{deletePasswordError}</p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowDeletePrompt(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 transition-colors mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePasswordSubmit}
                className="px-4 py-2 bg-red-500 text-white text-[13px] font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Poster Password Prompt */}
      {showPosterPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 dark:text-white">Update Poster</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Enter the password to update the poster:
            </p>
            <input
              type="password"
              value={posterPassword}
              onChange={(e) => setPosterPassword(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {posterPasswordError && (
              <p className="text-red-500 text-[13px] mt-2">{posterPasswordError}</p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowPosterPrompt(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 transition-colors mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handlePosterPasswordSubmit}
                className="px-4 py-2 bg-blue-500 text-white text-[13px] font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Movie Password Prompt */}
      {showDeleteMoviePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 dark:text-white">Delete Movie</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Enter the password to delete this movie:
            </p>
            <input
              type="password"
              value={deleteMoviePassword}
              onChange={(e) => setDeleteMoviePassword(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {deleteMoviePasswordError && (
              <p className="text-red-500 text-[13px] mt-2">{deleteMoviePasswordError}</p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowDeleteMoviePrompt(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 transition-colors mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMoviePasswordSubmit}
                className="px-4 py-2 bg-red-500 text-white text-[13px] font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}