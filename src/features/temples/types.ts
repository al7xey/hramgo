export type SundaySchoolStatus = "YES" | "NO" | "UNKNOWN";
export type TempleModerationStatus =
  | "DRAFT"
  | "REVIEW"
  | "PUBLISHED"
  | "REJECTED";

export type TemplePhotoView = {
  id: string;
  imageUrl: string;
  alt: string;
  isMain: boolean;
  sourceUrl?: string | null;
  license?: string | null;
  author?: string | null;
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
  routeVerified?: boolean;
  walkEstimated?: boolean;
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

export type TempleView = {
  id: string;
  slug: string;
  name: string;
  shortName?: string | null;
  aliases?: string[];
  mergedSlugs?: string[];
  description?: string | null;
  descriptionSourceUrl?: string | null;
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
  lastVerifiedAt?: string | null;
  photos: TemplePhotoView[];
  socialLinks: TempleSocialLinkView[];
  clergy: TempleClergyView[];
  historySummary?: string | null;
  shrines?: string | null;
  parishServices: TempleParishServiceView[];
  hasParking?: boolean;
  childFriendly?: boolean;
  scheduleEntries?: ScheduleEntry[];
  sources?: {
    url: string;
    sourceType: string;
    lastVerifiedAt?: string | null;
  }[];
};

export type ScheduleEntry = {
  id: string;
  templeId: string;
  serviceDate?: string | null;
  weekdays?: number[] | null;
  startsAt: string;
  kind: "liturgy" | "evening" | "prayer" | "other";
  title: string;
  comment?: string | null;
  scopeNote?: string | null;
  isSpecial: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  sourceUrl: string;
  verifiedAt: string;
  confidence: number;
  status: "REVIEW" | "VERIFIED" | "REJECTED";
  recurrenceUnspecified?: boolean;
};

export type TempleSearchInput = {
  scheduleMode?: "regular" | "date";
  weekday?: number;
  date?: string;
  timeFrom?: string;
  timeTo?: string;
  worship?: "liturgy" | "evening" | "vigil" | "confession" | "prayer";
  ids?: string[];
  query?: string;
  district?: string[];
  metro?: string[];
  metroLine?: string[];
  service?: TempleParishServiceView["kind"][];
  objectType?: "all" | "church" | "monastery";
  liturgyTime?: string;
  eveningTime?: string;
  sundaySchool?: boolean;
  hasSchedule?: boolean;
  hasWebsite?: boolean;
  hasPhotos?: boolean;
  childFriendly?: boolean;
  hasParking?: boolean;
  sort?: "relevance" | "distance" | "alphabet" | "sundaySchool";
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
  | "photos"
  | "transit"
  | "scheduleEntries"
>;

export type TempleMapView = Pick<
  TempleView,
  | "id"
  | "slug"
  | "name"
  | "address"
  | "latitude"
  | "longitude"
  | "websiteUrl"
  | "transit"
> & {
  photoUrl?: string | null;
};
