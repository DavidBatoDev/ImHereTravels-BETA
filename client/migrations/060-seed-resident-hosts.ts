/**
 * 060 — Seed the `residentHost` collection from the static www host data.
 *
 * WHY
 * ───
 * The admin now has a Resident Hosts module backed by a new `residentHost`
 * Firestore collection. The www still renders these pages from static data
 * (www/web/data/travelWith*.ts), so this migration transcribes that same
 * content (Dev, Roxana, Jess) into Firestore so the admin list/editor has real
 * data to manage. Each host's `attachedTourIds` is resolved from its upcoming
 * trips' `tourSlug` values against the existing tourPackages collection — this
 * attachment is the basis for separating hosted tours from normal tours.
 *
 * Docs are written with the host slug as the document ID so the seed is
 * idempotent (re-running overwrites) and rollback is deterministic.
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run060   # preview
 *   npx tsx migrations/migrate.ts 060           # apply
 *   npx tsx migrations/migrate.ts rollback060   # undo (deletes the 3 docs)
 */

import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "060-seed-resident-hosts";
const COLLECTION_NAME = "residentHost";
const TOURS_COLLECTION = "tourPackages";

type GalleryMediaItem = {
  seq: number;
  type: "photo" | "video" | "placeholder";
  size: "tall" | "short";
  src?: string;
  alt?: string;
  objectPosition?: string;
};

type SeedHost = {
  slug: string;
  displayName: string;
  pageTitle: string;
  status: "active" | "draft" | "archived";
  comingSoon?: boolean;
  instagram?: string;
  heroImage?: string | null;
  heroImageAlt: string;
  heroImages?: string[];
  profileImage?: string;
  seo?: { title?: string; description?: string };
  intro: string[];
  upcomingTrips: Array<Record<string, unknown>>;
  whyTravel: string[];
  whyTravelNotes?: string[];
  howItWorks: string[];
  gallerySlides?: GalleryMediaItem[][][];
  galleryImages?: { src: string; alt: string }[];
};

// Firestore forbids nested arrays, so the [][][] gallerySlides shape is stored
// as array-of-maps: { columns: { items: GalleryMediaItem[] }[] }[].
const encodeGallerySlides = (slides: GalleryMediaItem[][][] | undefined) =>
  slides?.map((slide) => ({ columns: slide.map((col) => ({ items: col })) }));

const photo = (seq: number, size: "tall" | "short", src: string, objectPosition?: string): GalleryMediaItem =>
  objectPosition
    ? { seq, type: "photo", size, src, alt: "Group trip moment", objectPosition }
    : { seq, type: "photo", size, src, alt: "Group trip moment" };
const video = (seq: number, size: "tall" | "short", src: string): GalleryMediaItem =>
  ({ seq, type: "video", size, src });

const WHY_TRAVEL = [
  "End-to-end planning — we handle everything",
  "Trusted local teams and guides",
  "Carefully curated, experience-first itineraries",
  "Strong community-focused trips",
  "Available on-ground support",
];
const WHY_TRAVEL_NOTES = [
  "A single, coordinated plan keeps the trip feeling smooth from first enquiry to departure.",
  "Local teams bring practical knowledge and on-the-ground context that generic planning cannot replace.",
  "Curated itineraries keep the best parts front and center instead of stretching the schedule thin.",
  "Community-led travel works best when the group vibe is intentional, welcoming, and easy to join.",
  "Support matters most when plans change, so help stays close throughout the trip.",
];
const HOW_IT_WORKS = [
  "Choose your host & trip",
  "Secure your spot with a deposit",
  "Pay in installments up to 4 times",
  "Travel and meet your community",
];

// ── Dev ────────────────────────────────────────────────────────────────────
const devGallerySlides: GalleryMediaItem[][][] = [
  // Slide 1
  [
    [
      photo(1, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480553191_image00024.jpeg?alt=media&token=5c2d1dc9-12a8-47e7-9940-c0f419c789d4"),
      photo(9, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778490701001_image00025%201.png?alt=media&token=0508d7bb-8113-4fc4-b815-f567f39f1046"),
      photo(5, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778490697358_image00011%201.png?alt=media&token=93862b60-9c91-441e-823a-fcd3a4bde730"),
    ],
    [
      photo(8, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480534121_image00014.jpeg?alt=media&token=531c799b-ae81-4fe8-a073-af5184b3b062"),
      photo(2, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480549820_image00023.jpeg?alt=media&token=63739dbd-cc0b-40d8-b3b6-d5531a9e8629"),
      photo(12, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480574602_image00016.jpeg?alt=media&token=5054a637-2a0a-421e-9623-3b73d3be642d"),
    ],
    [
      photo(11, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480540490_image00018.jpeg?alt=media&token=ffa89d46-acca-403e-a071-633a83e99b3f"),
      photo(10, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480582720_image00021.jpeg?alt=media&token=a87fff45-b982-4554-a8a9-85f7b4109862"),
      photo(6, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480578635_image00017.jpeg?alt=media&token=e6198d36-1cba-4583-9f2b-5bd31b006b8c"),
    ],
    [
      photo(4, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480537572_image00015.jpeg?alt=media&token=fa2033d8-d0d2-4891-8b8e-787bbf84884f"),
      photo(7, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480543437_image00019.jpeg?alt=media&token=771caa67-5ac8-4dbb-a4c4-d2827f8d5613"),
      photo(3, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480568133_image00007.jpeg?alt=media&token=8288b151-4c9b-4601-9604-0ba13b81ab9c"),
    ],
  ],
  // Slide 2
  [
    [
      photo(1, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1777891784535_frame.png?alt=media&token=4b97cf80-63a2-4fae-81ea-42560e517455"),
      photo(9, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480527071_image00012.jpeg?alt=media&token=4fa37648-b053-4c83-bf12-67f50e0e6fbc"),
      photo(5, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1777891735622_2e4f3d29-5be7-4465-89aa-f6f33493fd64.jpg?alt=media&token=c17f0121-c04b-4301-b8bb-0910fcdfe936"),
    ],
    [
      photo(8, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480560219_image00001.jpeg?alt=media&token=c8e8bb88-967f-4390-aa02-949133af0898"),
      photo(2, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1777896787661_frame%20(2).png?alt=media&token=de8ba2d5-e3ff-411d-8050-e8017b64ce4b"),
      photo(12, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1777891752929_98c9d811-9e55-478c-99ee-e238b55f23d8.jpg?alt=media&token=211ec8bd-c10b-4d97-ad1d-3a56820deb2a"),
    ],
    [
      photo(11, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1777891748548_08.png?alt=media&token=2d20d3d7-eaea-4949-a3a9-c62971286cbc"),
      photo(10, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1777896783964_frame%20(1).png?alt=media&token=7b2f8863-e6ce-4bbe-80a0-dba31367daa3"),
      photo(6, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1777891730097_2c35b783-d3a9-4a87-a6d7-c451e1c7ac07.jpg?alt=media&token=aed7bf06-c9c7-40b2-8594-a2ed9fed48fb"),
    ],
    [
      photo(4, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1777891770252_frame%20(3).png?alt=media&token=bd3709b8-1ce7-4841-8fb6-ce0887c65721"),
      photo(7, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480530387_image00013.jpeg?alt=media&token=e403474c-26fa-494c-a596-98fb082e4516"),
      photo(3, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480509258_image00002.jpeg?alt=media&token=635e44f6-bdf5-4ee6-a0b9-1b7845ae26d9"),
    ],
  ],
  // Slide 3
  [
    [
      photo(1, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778489293738_07.png?alt=media&token=962f1741-3529-4e92-9953-2d66627320e3"),
      video(9, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/videos%2F1777891757301_e8c841a0-ba11-449c-8349-f6c8b3fc35ee.mp4?alt=media&token=39dc8866-a5b0-4573-9ecb-26261a226889"),
      photo(5, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480571836_image00010.jpeg?alt=media&token=4072f961-1dee-44b5-9d5e-53d5e6dfd8cd"),
    ],
    [
      video(8, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/videos%2F1777898934156_38dd363d-7cd1-400b-92fd-6120218a00fb.mp4?alt=media&token=88db3ec6-0470-437d-86ae-31ca115c8899"),
      photo(2, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778489370757_image00005.jpeg?alt=media&token=0b1427ab-6f05-4635-bbc7-8e0b477c212e"),
      photo(12, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480509258_image00002.jpeg?alt=media&token=635e44f6-bdf5-4ee6-a0b9-1b7845ae26d9"),
    ],
    [
      photo(11, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480521068_image00009.jpeg?alt=media&token=649671e5-2e17-4089-b8ce-f6dcc35cd1a0"),
      video(10, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/videos%2F1777888423053_WhatsApp%20Video%202026-05-04%20at%205.10.08%20PM.mp4?alt=media&token=7fc9d547-5c1b-4782-a713-0d6d53dd0625"),
      photo(6, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480563797_image00006.jpeg?alt=media&token=de14e134-6128-485d-b1e8-794287d69cc0"),
    ],
    [
      photo(4, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1777891752929_98c9d811-9e55-478c-99ee-e238b55f23d8.jpg?alt=media&token=211ec8bd-c10b-4d97-ad1d-3a56820deb2a"),
      photo(7, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480546594_image00022.jpeg?alt=media&token=307509f9-6a4b-447b-b402-b4bed685ce6b"),
      photo(3, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778480530387_image00013.jpeg?alt=media&token=e403474c-26fa-494c-a596-98fb082e4516"),
    ],
  ],
];

// ── Roxana ─────────────────────────────────────────────────────────────────
const roxanaGallerySlides: GalleryMediaItem[][][] = [
  [
    [
      photo(1, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422260770_WhatsApp%20Image%202026-05-21%20at%2010.14.06%20PM.jpeg?alt=media&token=98166b96-f5a0-4b87-be11-1f77179c2460"),
      photo(5, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422267410_WhatsApp%20Image%202026-05-21%20at%2010.14.08%20PM%20(1).jpeg?alt=media&token=598e5918-7943-44ea-89ab-e4520cb13998"),
      photo(9, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422283599_WhatsApp%20Image%202026-05-21%20at%2010.14.13%20PM.jpeg?alt=media&token=3d75cf1d-4672-47b9-a068-153a9670d43a"),
    ],
    [
      photo(2, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422264587_WhatsApp%20Image%202026-05-21%20at%2010.14.07%20PM.jpeg?alt=media&token=6e6fa456-6cfe-4d7e-b31f-1072c2b05427"),
      photo(6, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422272770_WhatsApp%20Image%202026-05-21%20at%2010.14.09%20PM.jpeg?alt=media&token=18e2b109-905c-4841-b224-013a8c0c59b2"),
      photo(10, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422278157_WhatsApp%20Image%202026-05-21%20at%2010.14.11%20PM.jpeg?alt=media&token=c744d1bd-9199-4d8f-aae1-cf03364a34b4"),
    ],
    [
      photo(3, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422291926_WhatsApp%20Image%202026-05-21%20at%2010.14.15%20PM.jpeg?alt=media&token=257486ef-5756-450e-9684-05e250d2c1af"),
      photo(7, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422289158_WhatsApp%20Image%202026-05-21%20at%2010.14.14%20PM.jpeg?alt=media&token=b22c71e5-6b62-4400-852b-d95d9ce039df"),
      photo(11, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422286313_WhatsApp%20Image%202026-05-21%20at%2010.14.14%20PM%20(1).jpeg?alt=media&token=1e72738d-4229-4d28-a3df-41c9d00441b8"),
    ],
    [
      photo(4, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422275499_WhatsApp%20Image%202026-05-21%20at%2010.14.10%20PM.jpeg?alt=media&token=43424dca-ef2f-462e-8531-1cba5520abd8"),
      photo(8, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422280918_WhatsApp%20Image%202026-05-21%20at%2010.14.12%20PM.jpeg?alt=media&token=e18dcd4c-b1ed-46fe-92fb-81f4529737b5"),
      photo(12, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422270139_WhatsApp%20Image%202026-05-21%20at%2010.14.08%20PM.jpeg?alt=media&token=6ef6c563-016e-4500-a5ab-1be79f50ea5d"),
    ],
  ],
];

// ── Jess ───────────────────────────────────────────────────────────────────
const jessGallerySlides: GalleryMediaItem[][][] = [
  [
    [
      photo(1, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651101402_Screenshot%202026-05-13%20134417.png?alt=media&token=d2057a66-9323-4760-8cb5-2b29b152f8eb"),
      photo(5, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651084856_1000040797.jpg?alt=media&token=d71e2bd9-875a-4ad5-9ea9-33e4db749ce6"),
    ],
    [
      photo(2, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651088765_1000040798.jpg?alt=media&token=858525f0-db69-4e1e-80c0-2a975267700c"),
      photo(6, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651079825_1000040796.jpg?alt=media&token=1099185a-dabe-4532-83d1-8c25a9afc472"),
    ],
    [
      photo(3, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651097066_1000040800.jpg?alt=media&token=d5ee451c-933a-4fb4-a581-95d88901330e"),
      photo(7, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651093232_1000040799.jpg?alt=media&token=e8692e75-28c2-4358-af5e-79580b3956e0"),
    ],
    [
      photo(4, "tall", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651084856_1000040797.jpg?alt=media&token=d71e2bd9-875a-4ad5-9ea9-33e4db749ce6"),
      photo(8, "short", "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651088765_1000040798.jpg?alt=media&token=858525f0-db69-4e1e-80c0-2a975267700c", "top"),
    ],
  ],
];

const HOSTS: SeedHost[] = [
  {
    slug: "dev",
    displayName: "Dev",
    pageTitle: "Travel with Dev",
    status: "active",
    instagram: "dev_skehan",
    heroImage: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1777899796799_Frame%20201%20(1).png?alt=media&token=46bc3d00-8577-494f-9d87-c6865d65e328",
    heroImageAlt: "Dev's group travel adventures",
    profileImage: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1777891757001_652874611_18570825235025847_3768940051839134984_n.jpg?alt=media&token=8a465834-6fb5-4f6f-8776-670a2093074f",
    seo: {
      title: "Travel with Dev | I'm Here Travels",
      description:
        "Join Dev on her group trips designed to bring her community together through travel. Cultural experiences, adventure-filled itineraries, and meaningful connections.",
    },
    intro: [
      "Join Dev on her group trips designed to bring her community together through travel.",
      "Dev has been hosting with us since 2024 and has successfully led multiple sold-out trips — creating unforgettable experiences and strong connections within her community.",
      "From cultural experiences to adventure-filled itineraries, each trip is designed to create meaningful connections, lasting memories, and real shared experiences.",
      "Whether you're joining solo or with friends, you'll be part of a welcoming group that travels with intention.",
    ],
    upcomingTrips: [
      {
        name: "India Holi + Yoga with Dev",
        dates: "March 19, 2027",
        image: "/images/wp-content/uploads/2025/01/india-header-2.webp",
        imageAlt: "India Holi + Yoga with Dev",
        duration: "13 Days and 12 Nights",
        description: "Explore India's vibrant culture, ancient wonders, and the stunning colors of the Holi Festival.",
        price: "GBP £1,299",
        tourSlug: "india-holi-festival-tour",
      },
      {
        name: "PH Sunrise & Sunset",
        dates: "TBA",
        image: "/tours/philippine-sunrise/hero-1.jpg",
        imageAlt: "Philippines Sunrise & Sunset",
        description: "Island-hop the Philippines with Dev — canyoneering, sardine runs, surfing, and unforgettable sunsets across Cebu, Moalboal, and Siargao.",
      },
      {
        name: "Brazil",
        dates: "TBA",
        image: "/images/wp-content/uploads/2025/07/brazil-trip-highlight-1.webp",
        imageAlt: "Brazil's Treasures",
        description: "From São Paulo's street art to Copacabana Beach and the vibrant Carnival — join Dev for an energy-packed Brazilian adventure.",
      },
    ],
    whyTravel: WHY_TRAVEL,
    whyTravelNotes: WHY_TRAVEL_NOTES,
    howItWorks: HOW_IT_WORKS,
    gallerySlides: devGallerySlides,
    galleryImages: [
      { src: "/images/wp-content/uploads/2025/01/india-triphighlight-1.webp", alt: "India Holi Festival" },
      { src: "/images/wp-content/uploads/2025/01/india-day-5.webp", alt: "India Holi Festival" },
      { src: "/tours/philippine-sunrise/community-1.jpg", alt: "Philippines Sunrise" },
      { src: "/tours/philippine-sunrise/community-3.jpg", alt: "Philippines Sunrise" },
      { src: "/images/wp-content/uploads/2025/07/brazil-trip-highlight-2.webp", alt: "Brazil's Treasures" },
      { src: "/images/wp-content/uploads/2025/07/brazil-day-3.webp", alt: "Brazil's Treasures" },
    ],
  },
  {
    slug: "roxana",
    displayName: "Roxana",
    pageTitle: "Travel with Roxana",
    status: "active",
    instagram: "roxadventures",
    heroImage: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422767288_Roxana%20Banner.png?alt=media&token=b1d5f387-3961-4098-b03e-28b28c95d6b5",
    heroImageAlt: "Roxana's group travel adventures",
    profileImage: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422919871_455866158_898344442182543_3439868931459199326_n.jpg?alt=media&token=ae0c5325-23a9-46f2-9c4c-28cd4402b5ae",
    seo: {
      title: "Travel with Roxana | I'm Here Travels",
      description:
        "Join Roxana on her group trips designed to bring her community together through travel. Cultural experiences, adventure-filled itineraries, and meaningful connections.",
    },
    intro: [
      "Roxana is a passionate traveller who believes the best adventures are the ones shared with great people.",
      "With a love for discovering new cultures, hidden gems, and authentic local experiences, she curates trips that go beyond the tourist trail.",
      "Each journey is thoughtfully planned to balance exploration and relaxation — so you can fully immerse yourself without the stress of organising it all yourself.",
      "Whether you're a solo traveller or coming with a friend, you'll feel right at home in Roxana's group.",
    ],
    upcomingTrips: [
      {
        name: "Philippines Sunset with Roxana",
        dates: "Feb 18–28, 2027",
        image: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422291926_WhatsApp%20Image%202026-05-21%20at%2010.14.15%20PM.jpeg?alt=media&token=257486ef-5756-450e-9684-05e250d2c1af",
        imageAlt: "Philippines Sunset with Roxana",
        duration: "11 Days and 10 Nights",
        description: "Itinerary TBA.",
        price: "GBP £1,199",
        priceNote: "£1,199 for first 8 pax, £1,299 after",
        tourSlug: "philippine-sunset-with-roxana",
        comingSoon: true,
      },
    ],
    whyTravel: WHY_TRAVEL,
    whyTravelNotes: WHY_TRAVEL_NOTES,
    howItWorks: HOW_IT_WORKS,
    gallerySlides: roxanaGallerySlides,
    galleryImages: [
      { src: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422260770_WhatsApp%20Image%202026-05-21%20at%2010.14.06%20PM.jpeg?alt=media&token=98166b96-f5a0-4b87-be11-1f77179c2460", alt: "Group trip moment" },
      { src: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422264587_WhatsApp%20Image%202026-05-21%20at%2010.14.07%20PM.jpeg?alt=media&token=6e6fa456-6cfe-4d7e-b31f-1072c2b05427", alt: "Group trip moment" },
      { src: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422291926_WhatsApp%20Image%202026-05-21%20at%2010.14.15%20PM.jpeg?alt=media&token=257486ef-5756-450e-9684-05e250d2c1af", alt: "Group trip moment" },
      { src: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422275499_WhatsApp%20Image%202026-05-21%20at%2010.14.10%20PM.jpeg?alt=media&token=43424dca-ef2f-462e-8531-1cba5520abd8", alt: "Group trip moment" },
      { src: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422267410_WhatsApp%20Image%202026-05-21%20at%2010.14.08%20PM%20(1).jpeg?alt=media&token=598e5918-7943-44ea-89ab-e4520cb13998", alt: "Group trip moment" },
      { src: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1779422272770_WhatsApp%20Image%202026-05-21%20at%2010.14.09%20PM.jpeg?alt=media&token=18e2b109-905c-4841-b224-013a8c0c59b2", alt: "Group trip moment" },
    ],
  },
  {
    slug: "jess",
    displayName: "Jess",
    pageTitle: "Travel with Jess",
    status: "active",
    instagram: "jessicaallott_",
    heroImage: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651079825_1000040796.jpg?alt=media&token=1099185a-dabe-4532-83d1-8c25a9afc472",
    heroImages: [
      "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651093232_1000040799.jpg?alt=media&token=e8692e75-28c2-4358-af5e-79580b3956e0",
      "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651079825_1000040796.jpg?alt=media&token=1099185a-dabe-4532-83d1-8c25a9afc472",
      "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651084856_1000040797.jpg?alt=media&token=d71e2bd9-875a-4ad5-9ea9-33e4db749ce6",
    ],
    heroImageAlt: "Jess's group travel adventures",
    profileImage: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1780081966916_706504635_18212408944335159_2174542554172203577_n.jpg?alt=media&token=813bb94b-3c46-4e7e-82cd-1bb44c4b4ead",
    seo: {
      title: "Travel with Jess | I'm Here Travels",
      description:
        "Join Jess on her group trips designed to bring her community together through travel. Cultural experiences, adventure-filled itineraries, and meaningful connections.",
    },
    intro: [
      "Jess is a passionate traveller and community builder who believes the best experiences are shared ones.",
      "With a love for discovering new cultures, hidden gems, and unforgettable moments, Jess brings her community along for the ride — turning trips into memories that last a lifetime.",
      "Whether you're a seasoned traveller or stepping out for the first time, Jess creates a space where everyone feels welcome, included, and inspired.",
    ],
    upcomingTrips: [
      {
        name: "Philippines Sunset with Jess",
        dates: "Nov 8–18",
        tourSlug: "philippine-sunset-with-jess",
        image: "https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1778651079825_1000040796.jpg?alt=media&token=1099185a-dabe-4532-83d1-8c25a9afc472",
        imageAlt: "Philippines Sunset with Jess",
        duration: "11 Days and 10 Nights",
        description: "Manila, Port Barton, El Nido, and Isla Darocotan with island hopping, snorkeling, and sunset experiences.",
        price: "GBP £1,199",
      },
    ],
    whyTravel: WHY_TRAVEL,
    howItWorks: HOW_IT_WORKS,
    gallerySlides: jessGallerySlides,
    galleryImages: [
      { src: "/images/wp-content/uploads/2025/01/india-triphighlight-1.webp", alt: "Trip moment" },
      { src: "/images/wp-content/uploads/2025/01/india-day-5.webp", alt: "Trip moment" },
      { src: "/tours/philippine-sunrise/community-1.jpg", alt: "Trip moment" },
      { src: "/tours/philippine-sunrise/community-3.jpg", alt: "Trip moment" },
      { src: "/images/wp-content/uploads/2025/07/brazil-trip-highlight-2.webp", alt: "Trip moment" },
      { src: "/images/wp-content/uploads/2025/07/brazil-day-3.webp", alt: "Trip moment" },
    ],
  },
];

/** Build a slug → docId map for the tourPackages collection. */
async function buildTourSlugMap(): Promise<Record<string, string>> {
  const snap = await getDocs(collection(db, TOURS_COLLECTION));
  const map: Record<string, string> = {};
  snap.docs.forEach((d) => {
    const slug = (d.data() as Record<string, unknown>).slug;
    if (typeof slug === "string") map[slug] = d.id;
  });
  return map;
}

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID} (dryRun=${dryRun})`);

  const tourSlugMap = await buildTourSlugMap();
  console.log(`📦 Loaded ${Object.keys(tourSlugMap).length} tour slugs for attachment resolution`);

  const now = Timestamp.now();
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const host of HOSTS) {
    // Resolve attachedTourIds from each trip's tourSlug.
    const attachedTourIds = Array.from(
      new Set(
        host.upcomingTrips
          .map((t) => t.tourSlug)
          .filter((s): s is string => typeof s === "string" && s.length > 0)
          .map((slug) => tourSlugMap[slug])
          .filter((id): id is string => typeof id === "string"),
      ),
    );

    const unresolved = host.upcomingTrips
      .map((t) => t.tourSlug)
      .filter((s): s is string => typeof s === "string" && s.length > 0)
      .filter((slug) => !tourSlugMap[slug]);
    if (unresolved.length) {
      console.warn(`  ⚠️  ${host.slug}: unresolved tour slugs → ${unresolved.join(", ")}`);
    }

    // Strip undefined keys so Firestore never receives them.
    const docData: Record<string, unknown> = JSON.parse(
      JSON.stringify({
        ...host,
        attachedTourIds,
      }),
    );
    // Firestore forbids nested arrays — store gallerySlides as array-of-maps.
    if (Array.isArray(docData.gallerySlides)) {
      docData.gallerySlides = encodeGallerySlides(
        docData.gallerySlides as GalleryMediaItem[][][],
      );
    }
    docData.metadata = {
      createdAt: now,
      updatedAt: now,
      createdBy: "migration-script",
    };

    try {
      if (dryRun) {
        console.log(
          `  🧪 [dry-run] would seed: ${host.slug} (${attachedTourIds.length} attached, ${host.upcomingTrips.length} trips, ${host.gallerySlides?.length ?? 0} slides)`,
        );
        created++;
        continue;
      }

      await setDoc(doc(db, COLLECTION_NAME, host.slug), docData);
      console.log(`  ✅ seeded: ${host.slug} (${attachedTourIds.length} attached tours)`);
      created++;
    } catch (err) {
      console.error(`  ❌ error seeding ${host.slug}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Hosts:   ${HOSTS.length}`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors:  ${errors}`);

  if (dryRun) {
    console.log(`\n🧪 DRY RUN complete — no changes written to Firestore.`);
  } else {
    console.log(`\n✅ Migration complete!`);
  }

  return {
    message: `${MIGRATION_ID} completed`,
    details: { total: HOSTS.length, created, skipped, errors },
  };
}

export async function rollbackMigration() {
  console.log(`\n↩️  Rolling back ${MIGRATION_ID} — deleting seeded resident hosts`);

  let deleted = 0;
  let errors = 0;

  for (const host of HOSTS) {
    try {
      const ref = doc(db, COLLECTION_NAME, host.slug);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        console.log(`  ⏭️  ${host.slug}: not found — skipping`);
        continue;
      }
      await deleteDoc(ref);
      console.log(`  ✅ deleted: ${host.slug}`);
      deleted++;
    } catch (err) {
      console.error(`  ❌ error deleting ${host.slug}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Rollback summary: ${deleted} deleted, ${errors} errors`);
  return { message: `${MIGRATION_ID} rolled back`, details: { deleted, errors } };
}
