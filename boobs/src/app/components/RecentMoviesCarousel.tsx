import { Movie } from "./MovieCard";
import { Star } from "lucide-react";

interface RecentMoviesCarouselProps {
  movies: Movie[];
  onMovieClick?: (movie: Movie) => void;
}

export function RecentMoviesCarousel({ movies, onMovieClick }: RecentMoviesCarouselProps) {
  // Get the 8 most recently added movies
  const recentMovies = movies.slice(0, 8);

  if (!recentMovies.length) return null;

  return (
    <div className="w-full">
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-4 px-3 md:px-4 py-2">
        {recentMovies.map((movie) => (
          <div
            key={movie.id}
            className="rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onMovieClick?.(movie)}
          >
            <img
              src={movie.image}
              alt={movie.title}
              className="w-full h-[200px] md:h-[240px] object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}