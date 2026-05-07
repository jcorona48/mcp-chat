import { NextIntlClientProvider } from "next-intl";

export function NextIntlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider>
      {children}
    </NextIntlClientProvider>
  );
}
