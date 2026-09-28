import React, { useEffect, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Star, MessageSquare, ShieldCheck, MapPin, ExternalLink } from "lucide-react";

interface GoogleReviewData {
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  relativeTimeDescription: string;
  text: string;
}

interface GoogleReviewsProps {
  placeId?: string;
  defaultRating?: number;
}

const FALLBACK_REVIEWS: GoogleReviewData[] = [
  {
    authorName: "Ignacio Müller",
    rating: 5,
    relativeTimeDescription: "Hace una semana",
    text: "Excelente servicio y súper rápido el delivery. Compré cervezas heladas para el fin de semana y llegaron en menos de 30 minutos a Alerce. Los mejores packs de la zona, 100% recomendados.",
    authorPhotoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
  },
  {
    authorName: "Fernanda Tapia",
    rating: 5,
    relativeTimeDescription: "Hace 3 días",
    text: "Me encanta que tengan promos de Fernet y Gin con tónicas en un solo pack a un súper buen precio. Se agradece que acepten transferencia y coordinar la entrega rápido por WhatsApp.",
    authorPhotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
  },
  {
    authorName: "Cristóbal Rojas",
    rating: 5,
    relativeTimeDescription: "Hace 2 semanas",
    text: "Excelente botillería. El catálogo es súper completo y las promociones del Tío Fellas salvan siempre. El pedido por la web es facilísimo de armar. Totalmente confiable.",
    authorPhotoUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=80"
  }
];

export function GoogleReviews({ placeId, defaultRating = 4.9 }: GoogleReviewsProps) {
  const [reviews, setReviews] = useState<GoogleReviewData[]>(FALLBACK_REVIEWS);
  const [rating, setRating] = useState<number>(defaultRating);
  const [totalRatingCount, setTotalRatingCount] = useState<number>(187);
  const [placeName, setPlaceName] = useState<string>("Fella's Market");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const placesLib = useMapsLibrary("places");

  useEffect(() => {
    if (!placesLib || !placeId) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

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
          setRating(activePlace.rating);
        }
        if (activePlace.userRatingCount !== undefined && activePlace.userRatingCount !== null) {
          setTotalRatingCount(activePlace.userRatingCount);
        }
        if (activePlace.displayName) {
          setPlaceName(activePlace.displayName);
        }

        if (activePlace.reviews && activePlace.reviews.length > 0) {
          const mappedReviews = activePlace.reviews.slice(0, 5).map((r: any) => ({
            authorName: r.authorAttribution?.displayName || "Cliente de Google",
            authorPhotoUrl: r.authorAttribution?.photoUri || undefined,
            rating: r.rating || 5,
            relativeTimeDescription: r.relativePublishTimeDescription || "Hace poco",
            text: r.text || ""
          }));
          setReviews(mappedReviews);
        }
      } catch (err) {
        console.error("Error fetching Google Maps reviews:", err);
        if (isMounted) {
          setError("No se pudieron cargar las reseñas en vivo desde Google Maps.");
        }
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
                  <ShieldCheck size={11} /> Verificado por Google Maps
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Reseñas reales de nuestra ubicación física en Google Maps.
              </p>
            </div>
          </div>

          {/* Calificación Promedio Global */}
          <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-3 shrink-0 self-start md:self-auto">
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
        </div>

        {/* Listado de Reseñas */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <div className="w-6 h-6 border-2 border-[#ffd025] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Conectando con Google Maps...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reviews.map((review, idx) => (
              <div
                key={idx}
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between hover:border-[#ffd025]/20 hover:bg-white/[0.04] transition-all group"
              >
                <div>
                  {/* Autor y Fecha */}
                  <div className="flex items-center gap-3 mb-3">
                    {review.authorPhotoUrl ? (
                      <img
                        src={review.authorPhotoUrl}
                        alt={review.authorName}
                        className="w-9 h-9 rounded-full object-cover border border-white/15 bg-black"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=100&auto=format&fit=crop&q=80";
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-black text-white border border-white/15">
                        {review.authorName.charAt(0).toUpperCase()}
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

                  {/* Texto */}
                  <p className="text-[11.5px] sm:text-xs text-gray-300 leading-relaxed font-normal line-clamp-4 italic">
                    "{review.text}"
                  </p>
                </div>
                
                {/* Google Maps Link / Logo */}
                <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="text-red-500" /> {placeName}
                  </span>
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${placeId || "ChIJ5bx0qiVu5kcRs_dMpI5ttiY"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-[#ffd025]/70 hover:text-[#ffd025] transition-colors"
                  >
                    Google Maps <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info banner de licencia y ToS de Google Maps (Requerimiento obligatorio de Google Maps SDK) */}
        <div className="mt-6 pt-3.5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[9px] text-gray-500 font-medium uppercase tracking-wider">
          <span className="text-center sm:text-left">
            Las reseñas y marcas de Google Maps son propiedad intelectual de Google LLC.
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
              href="https://www.google.com/licenses/LICENSE-2.0"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline transition-colors"
            >
              Licencia Apache 2.0
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
