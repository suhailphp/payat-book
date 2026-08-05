import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

/* Line icons ported 1:1 from the PWA's ICON map. */

type P = { size?: number; color?: string };

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24' });

export const HomeIcon = ({ size = 26, color = '#5C6657' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9}>
    <Path d="M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5v-13zM13 4h5.5A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5H13V4z" />
    <Path d="M6.5 8h2M6.5 11h2M15.5 8h2M15.5 11h2" />
  </Svg>
);

/* Dashboard: 2×2 tiles — distinguishes the overview tab from the book tab,
   which keeps the open-book HomeIcon. */
export const DashboardIcon = ({ size = 26, color = '#5C6657' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9}>
    <Rect x={4} y={4} width={7} height={7} rx={1.5} />
    <Rect x={13} y={4} width={7} height={7} rx={1.5} />
    <Rect x={4} y={13} width={7} height={7} rx={1.5} />
    <Rect x={13} y={13} width={7} height={7} rx={1.5} />
  </Svg>
);

export const PeopleIcon = ({ size = 26, color = '#5C6657' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9}>
    <Circle cx={9} cy={8} r={3.2} />
    <Path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6S13.9 16 14.5 19" />
    <Circle cx={17} cy={9} r={2.4} />
    <Path d="M15.8 14.6c2.4.2 4.1 1.7 4.7 4.4" />
  </Svg>
);

export const EnvIcon = ({ size = 26, color = '#5C6657' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9}>
    <Rect x={3} y={5.5} width={18} height={13} rx={2} />
    <Path d="M3.5 6.5L12 13l8.5-6.5" />
  </Svg>
);

export const PlusIcon = ({ size = 22, color = '#fff' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={2.4}>
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

export const BackIcon = ({ size = 24, color = '#0A3F2A' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={2.2}>
    <Path d="M15 5l-7 7 7 7" />
  </Svg>
);

/* Proper cog: toothed ring + hub (the old radial-spoke glyph read as a sun) */
export const GearIcon = ({ size = 24, color = '#0A3F2A' }: P) => (
  <Svg {...base(size)}>
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <G key={a} rotation={a} origin="12, 12">
        <Rect x={10.9} y={2.2} width={2.2} height={3.6} rx={1} fill={color} />
      </G>
    ))}
    <Circle cx={12} cy={12} r={6.6} fill="none" stroke={color} strokeWidth={1.9} />
    <Circle cx={12} cy={12} r={2.7} fill="none" stroke={color} strokeWidth={1.9} />
  </Svg>
);

export const TrashIcon = ({ size = 20, color = '#5C6657' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9}>
    <Path d="M4.5 7h15M9.5 7V5a1 1 0 011-1h3a1 1 0 011 1v2M7 7l.8 12a1.5 1.5 0 001.5 1.4h5.4A1.5 1.5 0 0016.2 19L17 7" />
  </Svg>
);

export const EditIcon = ({ size = 24, color = '#0A3F2A' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9}>
    <Path d="M14.5 5.5l4 4L8 20H4v-4L14.5 5.5z" />
  </Svg>
);

export const HostIcon = ({ size = 22, color = '#fff' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9}>
    <Path d="M3 10.5L12 4l9 6.5" />
    <Path d="M5.5 9.5V19a1 1 0 001 1h11a1 1 0 001-1V9.5" />
    <Path d="M9.5 20v-5.5h5V20" />
  </Svg>
);

/* Giving hand offering a coin — clean line icon for the Payments tab. */
export const PayHandsIcon = ({ size = 22, color = '#0A3F2A' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={15} cy={5.5} r={2.2} />
    <Path d="M3 14.5h3l3 1.8c.8.5 1.8.6 2.7.3l7.6-2.5c.8-.3 1.7.1 2 .9.3.8-.1 1.6-.9 2l-8.6 3.6c-.9.4-1.9.4-2.8 0L3 18.5" />
    <Path d="M3 13v7.5" />
  </Svg>
);

/* Download-into-tray icon for backup */
export const SaveIcon = ({ size = 26, color = '#0E5A3C' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 4v9M8.5 9.5L12 13l3.5-3.5" />
    <Path d="M4.5 15v3a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5v-3" />
  </Svg>
);

/* Globe icon for the onboarding language toggle */
export const GlobeIcon = ({ size = 24, color = '#0A3F2A' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9}>
    <Circle cx={12} cy={12} r={8.5} />
    <Path d="M3.5 12h17" />
    <Path d="M12 3.5c2.6 2.4 3.9 5.2 3.9 8.5s-1.3 6.1-3.9 8.5M12 3.5C9.4 5.9 8.1 8.7 8.1 12s1.3 6.1 3.9 8.5" />
  </Svg>
);

export const CalendarIcon = ({ size = 20, color = '#5C6657' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
    <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} />
    <Path d="M3.5 9.5h17M8 2.8v4M16 2.8v4" />
    <Path d="M7.5 13.5h.5M11.75 13.5h.5M16 13.5h.5M7.5 17h.5M11.75 17h.5" />
  </Svg>
);

export const ChevronRightIcon = ({ size = 20, color = '#5C6657' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={2}>
    <Path d="M9 5l7 7-7 7" />
  </Svg>
);

export const InfoIcon = ({ size = 22, color = '#0A3F2A' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
    <Circle cx={12} cy={12} r={8.5} />
    <Path d="M12 11v5M12 7.6v.4" />
  </Svg>
);

export const WaIcon = ({ size = 22, color = '#fff' }: P) => (
  <Svg {...base(size)} fill={color}>
    <Path d="M12 3a9 9 0 00-7.7 13.6L3 21l4.5-1.2A9 9 0 1012 3zm0 2a7 7 0 110 14 7 7 0 01-3.5-.9l-.4-.2-2.4.6.6-2.3-.2-.4A7 7 0 0112 5zm-2.4 3.6c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.9 4.5 3.9 2.2.9 2.7.7 3.1.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.4-1.8-.1-.3 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.8-1.9c-.2-.4-.4-.4-.6-.4h-.2z" />
  </Svg>
);

/* Smartphone outline — marks the "this phone" backup card. */
export const PhoneIcon = ({ size = 22, color = '#0E5A3C' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={7} y={3} width={10} height={18} rx={2.4} />
    <Path d="M11 18h2" />
  </Svg>
);

/* Simple green check — the "backed up / connected" affirmation. */
export const CheckIcon = ({ size = 18, color = '#0E5A3C' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 12.5l4.2 4.2L19 6.8" />
  </Svg>
);
