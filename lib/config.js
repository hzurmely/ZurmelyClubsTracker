export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'ZurmelyClubsTracker',
  // Left empty on purpose: without an override the tagline comes from the
  // dictionary, so it follows the language the visitor is reading in.
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || '',
};

export const MY_CLUB = {
  id: process.env.NEXT_PUBLIC_MY_CLUB_ID || '',
  platform: process.env.NEXT_PUBLIC_MY_CLUB_PLATFORM || 'common-gen5',
};

export const PLATFORMS = [
  { id: 'common-gen5', label: 'PS5 / Xbox Series / PC', short: 'Gen5' },
  { id: 'common-gen4', label: 'PS4 / Xbox One', short: 'Gen4' },
  { id: 'nx', label: 'Nintendo Switch', short: 'Switch' },
];

export const PLATFORM_LABEL = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p.label]),
);
