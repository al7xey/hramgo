export type SundaySchoolStatus = "YES" | "NO" | "UNKNOWN";
export type TempleModerationStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "REJECTED";

export type TemplePhotoView = {
  id: string;
  imageUrl: string;
  alt: string;
  isMain: boolean;
  sourceUrl?: string | null;
};

export type TransitLineView = {
  id: string;
  name: string;
  color: string;
  system: "metro" | "mcc" | "mcd";
};

export type TempleTransitView = {
  station: string;
  line: TransitLineView;
  distanceMeters: number;
  walkMinutes: number;
};

export type TransitStationOptionView = {
  name: string;
  lineId: string;
  lineName: string;
  lineColor: string;
  system: TransitLineView["system"];
};

export type TempleSocialLinkView = {
  label: string;
  url: string;
  type: "website" | "vk" | "telegram" | "youtube" | "instagram" | "other";
};

export type TempleClergyView = {
  name: string;
  rank?: string;
  role: string;
  details?: string;
};

export type TempleParishServiceView = {
  id: string;
  title: string;
  description: string;
  kind:
    | "sundaySchool"
    | "adultSchool"
    | "youth"
    | "social"
    | "refectory"
    | "cafe"
    | "shop"
    | "choir"
    | "pilgrimage"
    | "meetings"
    | "other";
  sourceUrl?: string | null;
};

export type TempleReviewView = {
  id: string;
  authorName: string;
  text: string;
  rating: number;
  helpfulCount: number;
  visitType: string;
  publishedAt: string;
  tags: string[];
};

export type TempleView = {
  id: string;
  slug: string;
  name: string;
  shortName?: string | null;
  description?: string | null;
  address?: string | null;
  district?: string | null;
  metro?: string | null;
  transit: TempleTransitView[];
  latitude?: number | null;
  longitude?: number | null;
  websiteUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  rectorName?: string | null;
  vicariate?: string | null;
  deanery?: string | null;
  objectType?: string | null;
  scheduleSummary?: string | null;
  scheduleSourceUrl?: string | null;
  sundaySchoolStatus: SundaySchoolStatus;
  sundaySchoolDescription?: string | null;
  sundaySchoolSourceUrl?: string | null;
  sundaySchoolConfidence?: number | null;
  sourcePrimaryUrl?: string | null;
  dataConfidence: number;
  moderationStatus: TempleModerationStatus;
  averageHelpfulnessRating: number;
  reviewsCount: number;
  approvedReviewsCount: number;
  lastVerifiedAt?: string | null;
  photos: TemplePhotoView[];
  reviews: TempleReviewView[];
  socialLinks: TempleSocialLinkView[];
  clergy: TempleClergyView[];
  historySummary?: string | null;
  shrines?: string | null;
  parishServices: TempleParishServiceView[];
  hasParking?: boolean;
  childFriendly?: boolean;
};

export type TempleSearchInput = {
  ids?: string[];
  query?: string;
  district?: string[];
  metro?: string[];
  metroLine?: string[];
  service?: TempleParishServiceView["kind"][];
  sundaySchool?: boolean;
  hasSchedule?: boolean;
  hasWebsite?: boolean;
  hasPhotos?: boolean;
  childFriendly?: boolean;
  hasParking?: boolean;
  sort?: "relevance" | "distance" | "alphabet" | "sundaySchool" | "impressions";
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
};

export type TempleCardView = Pick<
  TempleView,
  | "id"
  | "slug"
  | "name"
  | "shortName"
  | "address"
  | "averageHelpfulnessRating"
  | "reviewsCount"
  | "approvedReviewsCount"
  | "photos"
  | "transit"
>;

export type TempleMapView = Pick<
  TempleView,
  "id" | "slug" | "name" | "shortName" | "address" | "latitude" | "longitude" | "websiteUrl" | "transit"
> & {
  photoUrl?: string | null;
  photoAlt?: string | null;
};
