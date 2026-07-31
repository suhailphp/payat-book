import React, { useState } from 'react';
import { Image } from 'react-native';
import { useData } from '../data';

const EN_LOGO = require('../../assets/logo-h.png'); // 633×200
const ML_LOGO = require('../../assets/logo-h-ml.png'); // 820×200

const EN_ASPECT = 633 / 200;
const ML_ASPECT = 820 / 200;

/* Horizontal brand logo that follows the app language. If the ML asset
   fails to load at runtime, falls back to the EN logo. */
export function BrandLogo({ height = 38 }: { height?: number }) {
  const { lang } = useData();
  const [mlFailed, setMlFailed] = useState(false);
  const useMl = lang === 'ml' && !mlFailed;
  return (
    <Image
      source={useMl ? ML_LOGO : EN_LOGO}
      onError={() => setMlFailed(true)}
      style={{ height, width: height * (useMl ? ML_ASPECT : EN_ASPECT) }}
      resizeMode="contain"
      accessibilityLabel="Payat Book"
    />
  );
}
