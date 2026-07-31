import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/* Line icons ported 1:1 from the PWA's ICON map. */

type P = { size?: number; color?: string };

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24' });

export const HomeIcon = ({ size = 26, color = '#5C6657' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9}>
    <Path d="M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5v-13zM13 4h5.5A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5H13V4z" />
    <Path d="M6.5 8h2M6.5 11h2M15.5 8h2M15.5 11h2" />
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

export const GearIcon = ({ size = 24, color = '#0A3F2A' }: P) => (
  <Svg {...base(size)} fill="none" stroke={color} strokeWidth={1.9}>
    <Circle cx={12} cy={12} r={3.2} />
    <Path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4L6 18M18 18l-1.6-1.6M7.6 7.6L6 6" />
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

export const WaIcon = ({ size = 22, color = '#fff' }: P) => (
  <Svg {...base(size)} fill={color}>
    <Path d="M12 3a9 9 0 00-7.7 13.6L3 21l4.5-1.2A9 9 0 1012 3zm0 2a7 7 0 110 14 7 7 0 01-3.5-.9l-.4-.2-2.4.6.6-2.3-.2-.4A7 7 0 0112 5zm-2.4 3.6c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.9 4.5 3.9 2.2.9 2.7.7 3.1.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.4-1.8-.1-.3 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.8-1.9c-.2-.4-.4-.4-.6-.4h-.2z" />
  </Svg>
);
