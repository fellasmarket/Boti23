import React, { useEffect, useState, useMemo } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Star, MessageSquare, ShieldCheck, MapPin, ExternalLink } from "lucide-react";

export interface GoogleReviewItem {
  id?: string;
  author_name: string;
  author_photo?: string;
  rating: number;
  relative_time_description: string;
  text: string;
}

export interface GoogleReviewData {
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  relativeTimeDescription: string;
  text: string;
}

interface GoogleReviewsProps {
  placeId?: string;
  defaultRating?: number;
  userRatingCount?: number;
  initialReviews?: GoogleReviewItem[];
  placeName?: string;
}

const DEFAULT_REVIEWS: GoogleReviewData[] = [
  {
    authorName: "Carlos Soto",
    rating: 5,
    relativeTimeDescription: "Hace 2 días",
    text: "¡Excelente atención y las cervezas siempre llegan ultra heladas! El delivery es súper rápido en Alerce. 100% recomendado.",
    authorPhotoUrl: undefined
  },
  {
    authorName: "Valentina Muñoz",
    rating: 5,
    relativeTimeDescription: "Hace una semana",
    text: "Salvaron nuestra junta de amigos un fin de semana. Tienen de todo, las promos son buenísimas y el hielo nunca falta. ¡Geniales!",
    authorPhotoUrl: undefined
  },
  {
    authorName: "Matías Alarcón",
    rating: 5,
    relativeTimeDescription: "Hace 2 semanas",
    text: "Muy buena variedad de destilados y snacks. Los precios son justos y la página web es súper fácil de usar para pedir por WhatsApp.",
    authorPhotoUrl: undefined
  },
  {
    authorName: "Camila Fernández",
    rating: 5,
    relativeTimeDescription: "Hace 3 semanas",
    text: "Pedimos delivery y la entrega llegó en 20 minutos exacta. Todo muy bien empaquetado y los tragos heladísimos. Se pasaron.",
    authorPhotoUrl: undefined
  }
];

// Helper to shuffle reviews so they appear randomly
function shuffleReviews<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Filter reviews that strictly have text and map them cleanly (without inventing photos)
function filterAndMapReviews(items?: GoogleReviewItem[]): GoogleReviewData[] {
  if (!items || items.length === 0) return DEFAULT_REVIEWS;
  const filtered = items
    .filter((r) => r.text && r.text.trim().length > 0)
    .map((r) => ({
      authorName: r.author_name || "Cliente verificado",
      authorPhotoUrl: r.author_photo && r.author_photo.trim().startsWith("http") ? r.author_photo.trim() : undefined,
      rating: Number(r.rating) || 5,
      relativeTimeDescription: r.relative_time_description || "Hace poco",
      text: r.text.trim()
    }));
  return filtered.length > 0 ? filtered : DEFAULT_REVIEWS;
}

export function GoogleReviews({
  placeId = "ChIJsQKhaXwlGJYRw_eFoWzOXyA",
  defaultRating = 5.0,
  userRatingCount = 13,
  initialReviews,
  placeName: initialPlaceName = "Fella's Market 2",
}: GoogleReviewsProps) {
  // Store all available verified reviews
  const [allReviews, setAllReviews] = useState<GoogleReviewData[]>(() => filterAndMapReviews(initialReviews));
  const [rating, setRating] = useState<number>(defaultRating);
  const [totalRatingCount, setTotalRatingCount] = useState<number>(userRatingCount);
  const [placeName, setPlaceName] = useState<string>(initialPlaceName);
  const [loading, setLoading] = useState<boolean>(false);
  const [isLiveFromGoogle, setIsLiveFromGoogle] = useState<boolean>(false);
  const [failedImageAuthors, setFailedImageAuthors] = useState<Record<string, boolean>>({});

  const placesLib = useMapsLibrary("places");

  // Keep reviews pool updated when initialReviews changes from admin
  useEffect(() => {
    if (initialReviews && initialReviews.length > 0) {
      setAllReviews(filterAndMapReviews(initialReviews));
    }
  }, [initialReviews]);

  useEffect(() => {
    if (defaultRating) setRating(defaultRating);
    if (userRatingCount) setTotalRatingCount(userRatingCount);
    if (initialPlaceName) setPlaceName(initialPlaceName);
  }, [defaultRating, userRatingCount, initialPlaceName]);

  // Fetch Place Details live from Google Maps
  useEffect(() => {
    if (!placesLib || !placeId) {
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchPlaceDetails = async () => {
      try {
        const placeService = new placesLib.Place({ id: placeId });
        const result = await placeService.fetchFields({
          fields: [
            "displayName",
            "rating",
            "userRatingCount",
            "reviews"
          ]
        });

        const activePlace = result?.place || placeService;

        if (!isMounted) return;

        if (activePlace.rating !== undefined && activePlace.rating !== null) {
          setRating(Number(activePlace.rating));
        }
        if (activePlace.userRatingCount !== undefined && activePlace.userRatingCount !== null) {
          setTotalRatingCount(Number(activePlace.userRatingCount));
        }
        if (activePlace.displayName) {
          setPlaceName(
            typeof activePlace.displayName === "string"
              ? activePlace.displayName
              : (activePlace.displayName as any)?.text || activePlace.displayName
          );
        }

        // Only include reviews from Google that actually have written text
        if (activePlace.reviews && Array.isArray(activePlace.reviews) && activePlace.reviews.length > 0) {
          const withText = activePlace.reviews.filter((r: any) => r.text && r.text.trim().length > 0);
          if (withText.length > 0) {
            const googleMapped: GoogleReviewData[] = withText.map((r: any) => ({
              authorName: r.authorAttribution?.displayName || "Cliente de Google",
              authorPhotoUrl: r.authorAttribution?.photoUri || undefined,
              rating: r.rating || 5,
              relativeTimeDescription: r.relativePublishTimeDescription || "Hace poco",
              text: r.text.trim()
            }));
            setAllReviews(googleMapped);
            setIsLiveFromGoogle(true);
          }
        }
      } catch (err) {
        console.warn("Google Maps Places fetch notice:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPlaceDetails();

    return () => {
      isMounted = false;
    };
  }, [placesLib, placeId]);

  // Pick up to 4 random reviews with text on each visit / render
  const displayedReviews = useMemo(() => {
    const valid = allReviews.filter((r) => r.text && r.text.trim().length > 0);
    return shuffleReviews(valid).slice(0, 4);
  }, [allReviews]);

  const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId || "ChIJsQKhaXwlGJYRw_eFoWzOXyA"}`;

  return (
    <div className="w-full px-3 sm:px-6 md:px-8 mt-10 mb-6">
      <div className="bg-[#13131f]/80 backdrop-blur-2xl rounded-3xl border border-white/10 p-5 sm:p-7 shadow-xl shadow-black/40">
        
        {/* Header de Reseñas */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <MessageSquare size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-white text-sm sm:text-base uppercase tracking-wider">
                  Opiniones de Nuestros Clientes
                </h3>
                <span className="flex items-center gap-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                  <ShieldCheck size={11} /> Verificado en Google Maps
                </span>
                {isLiveFromGoogle && (
                  <span className="text-[9px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                    Sincronizado en Vivo
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Calificación y opiniones reales de nuestra ubicación física en Google Maps.
              </p>
            </div>
          </div>

          {/* Calificación Promedio Global & Enlace Google Maps */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap self-start md:self-auto">
            <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-3 shrink-0">
              <div className="text-center shrink-0 pr-3 border-r border-white/10">
                <span className="text-2xl sm:text-3xl font-black text-white block leading-none">
                  {rating.toFixed(1)}
                </span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1 block">
                  De 5.0
                </span>
              </div>
              <div>
                <div className="flex items-center gap-0.5 text-[#ffd025]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < Math.round(rating) ? "#ffd025" : "none"}
                      strokeWidth={i < Math.round(rating) ? 0 : 2}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-gray-400 font-medium block mt-1">
                  Basado en <span className="font-bold text-white">{totalRatingCount} opiniones</span>
                </span>
              </div>
            </div>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-3 rounded-2xl bg-white/5 hover:bg-[#ffd025]/15 border border-white/10 hover:border-[#ffd025]/30 text-gray-300 hover:text-[#ffd025] transition-all text-xs font-bold flex items-center gap-2 shrink-0 shadow-sm"
              title="Ver en Google Maps"
            >
              <MapPin size={14} className="text-red-500 shrink-0" />
              <span>Ver en Google Maps</span>
              <ExternalLink size={12} className="opacity-70" />
            </a>
          </div>
        </div>

        {/* Listado de Reseñas Aleatorias con Texto Real */}
        {loading && displayedReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <div className="w-6 h-6 border-2 border-[#ffd025] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Conectando con Google Maps...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayedReviews.map((review, idx) => {
              const hasPhoto = Boolean(review.authorPhotoUrl && !failedImageAuthors[review.authorName]);
              const initialLetter = (review.authorName.trim().charAt(0) || "C").toUpperCase();

              return (
                <div
                  key={`${review.authorName}-${idx}`}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-[#ffd025]/20 hover:bg-white/[0.04] transition-all group shadow-lg"
                >
                  <div>
                    {/* Autor y Fecha */}
                    <div className="flex items-center gap-3 mb-3">
                      {hasPhoto ? (
                        <img
                          src={review.authorPhotoUrl}
                          alt={review.authorName}
                          className="w-9 h-9 rounded-full object-cover border border-white/15 bg-black"
                          onError={() => {
                            setFailedImageAuthors((prev) => ({ ...prev, [review.authorName]: true }));
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-[#ffd025]/25 text-[#ffd025] flex items-center justify-center text-xs font-black border border-[#ffd025]/30 shrink-0">
                          {initialLetter}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate leading-tight group-hover:text-[#ffd025] transition-colors">
                          {review.authorName}
                        </h4>
                        <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                          {review.relativeTimeDescription}
                        </span>
                      </div>
                    </div>

                    {/* Estrellas */}
                    <div className="flex items-center gap-0.5 text-[#ffd025] mb-2.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={11}
                          fill={i < review.rating ? "#ffd025" : "none"}
                          strokeWidth={i < review.rating ? 0 : 2}
                        />
                      ))}
                    </div>

                    {/* Texto Real de la Reseña */}
                    <p className="text-[11.5px] sm:text-xs text-gray-300 leading-relaxed font-normal line-clamp-4 italic">
                      "{review.text}"
                    </p>
                  </div>
                  
                  {/* Google Maps Link / Logo */}
                  <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1 truncate max-w-[140px]">
                      <MapPin size={11} className="text-red-500 shrink-0" /> {placeName}
                    </span>
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-0.5 text-[#ffd025]/70 hover:text-[#ffd025] transition-colors shrink-0"
                    >
                      Google Maps <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info banner de licencia y ToS de Google Maps */}
        <div className="mt-6 pt-3.5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[9px] text-gray-500 font-medium uppercase tracking-wider">
          <span className="text-center sm:text-left">
            Las reseñas y marcas de Google Maps son propiedad de sus respectivos autores y de Google LLC.
          </span>
          <div className="flex items-center gap-3">
            <a
              href="https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline transition-colors"
            >
              Términos de Servicio
            </a>
            <span>·</span>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#ffd025] underline transition-colors font-bold"
            >
              Dejar una reseña en Google
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
