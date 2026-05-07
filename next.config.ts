import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
};

export default withBotId(withNextIntl(nextConfig));
