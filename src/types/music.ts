export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  uri: string;
  popularity: number;
  explicit: boolean;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
  uri: string;
  images?: SpotifyImage[];
  genres?: string[];
  popularity?: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  images: SpotifyImage[];
  release_date: string;
  external_urls: {
    spotify: string;
  };
  uri: string;
}

export interface SpotifyImage {
  height: number;
  width: number;
  url: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  owner: {
    id: string;
    display_name: string;
  };
  tracks: {
    total: number;
  };
  external_urls: {
    spotify: string;
  };
  uri: string;
  public: boolean;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: SpotifyImage[];
  followers: {
    total: number;
  };
  country: string;
  product: string;
}

export interface AppleMusicTrack {
  id: string;
  type: "songs";
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    durationInMillis: number;
    previews?: {
      url: string;
    }[];
    artwork: {
      width: number;
      height: number;
      url: string;
    };
    playParams?: {
      id: string;
      kind: string;
    };
    isrc?: string;
    url: string;
  };
}

export interface VibeMode {
  id: string;
  name: string;
  emoji: string;
  description: string;
  gradient: [string, string];
}

export interface UserPreferences {
  favoriteGenres: string[];
  skipExplicit: boolean;
  preferredLanguage: string;
  audioQuality: "normal" | "high";
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  position: number;
  duration: number;
  volume: number;
}

export interface LikedTrack {
  track: SpotifyTrack;
  likedAt: string;
  vibeMode?: string;
}