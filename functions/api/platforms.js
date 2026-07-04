import '../_lib/crypto-polyfill.js';
import Meting from '@meting/core';

export const onRequestGet = async () => {
  const platforms = Meting.getSupportedPlatforms();
  return Response.json({ platforms, default: 'netease' });
};
