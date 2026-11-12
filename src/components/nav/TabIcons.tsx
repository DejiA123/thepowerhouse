/**
 * Solid icons for the open tab in the bottom bar, like YouVersion's: drawn as solid
 * shapes with their details cut out (the house's door, the book's spine, the church's
 * cross), because filling the outline icons turned them into blobs.
 */
type Props = { className?: string };

const Svg = ({ className, children }: Props & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    {children}
  </svg>
);

/** House with its door cut out */
const HomeSolid = ({ className }: Props) => (
  <Svg className={className}>
    <path
      fillRule="evenodd"
      d="M10.6 2.9a2.2 2.2 0 0 1 2.8 0l7.1 5.8c.6.5 1 1.2 1 2V19a2.6 2.6 0 0 1-2.6 2.6H15V16a1.6 1.6 0 0 0-1.6-1.6h-2.8A1.6 1.6 0 0 0 9 16v5.6H5.1A2.6 2.6 0 0 1 2.5 19v-8.3c0-.8.4-1.5 1-2z"
    />
  </Svg>
);

/** An open book: two solid pages either side of the spine */
const BibleSolid = ({ className }: Props) => (
  <Svg className={className}>
    <path d="M11.2 6.2v14.2a.6.6 0 0 1-.9.5A11 11 0 0 0 3.6 19.6a1.1 1.1 0 0 1-1.1-1.1V5.6c0-.5.4-1 .9-1.1a11.2 11.2 0 0 1 7.3 1.1c.3.2.5.4.5.6z" />
    <path d="M12.8 6.2v14.2c0 .4.5.7.9.5a11 11 0 0 1 6.7-1.3c.6.1 1.1-.4 1.1-1.1V5.6c0-.5-.4-1-.9-1.1a11.2 11.2 0 0 0-7.3 1.1c-.3.2-.5.4-.5.6z" />
  </Svg>
);

/** A church with its cross and door cut out */
const ChurchSolid = ({ className }: Props) => (
  <Svg className={className}>
    <path
      fillRule="evenodd"
      d="M12.8 1.8v1.5h1.4a.8.8 0 0 1 0 1.6h-1.4v1.6l4.4 3.4c.4.3.6.8.6 1.3v1.1l2.6 1.4c.6.3.9.9.9 1.5v5.1c0 .9-.7 1.6-1.6 1.6H4.3c-.9 0-1.6-.7-1.6-1.6v-5.1c0-.6.3-1.2.9-1.5l2.6-1.4v-1.1c0-.5.2-1 .6-1.3l4.4-3.4V4.9H9.8a.8.8 0 0 1 0-1.6h1.4V1.8a.8.8 0 0 1 1.6 0zM12 14.3a2 2 0 0 0-2 2v4.6h4v-4.6a2 2 0 0 0-2-2zm0-4.9a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z"
    />
  </Svg>
);

/** Two people */
const TeamsSolid = ({ className }: Props) => (
  <Svg className={className}>
    <circle cx="9" cy="7.5" r="4" />
    <path d="M1.8 19.3C1.8 15.9 5 13.4 9 13.4s7.2 2.5 7.2 5.9c0 .8-.6 1.4-1.4 1.4H3.2c-.8 0-1.4-.6-1.4-1.4z" />
    <path d="M15.6 3.8a3.8 3.8 0 0 1 0 7.4 5.9 5.9 0 0 0 0-7.4z" />
    <path d="M17.6 13.6c2.6.6 4.6 2.6 4.6 5.4 0 .9-.7 1.7-1.6 1.7h-2.2c.3-.4.4-.9.4-1.4 0-2.3-.5-4.1-1.2-5.7z" />
  </Svg>
);

/** One person */
const MeSolid = ({ className }: Props) => (
  <Svg className={className}>
    <circle cx="12" cy="7.6" r="4.6" />
    <path d="M3.4 19.4c0-3.7 3.8-6.3 8.6-6.3s8.6 2.6 8.6 6.3c0 .9-.7 1.6-1.6 1.6H5c-.9 0-1.6-.7-1.6-1.6z" />
  </Svg>
);

export const SOLID_TAB_ICONS: Record<string, (p: Props) => JSX.Element> = {
  home: HomeSolid,
  bible: BibleSolid,
  church: ChurchSolid,
  teams: TeamsSolid,
  me: MeSolid,
};
