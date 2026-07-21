import Image, { type ImageProps } from "next/image";

type BrandLogoProps = Omit<ImageProps, "src" | "alt"> & {
  alt?: string;
};

export function BrandLogo({
  alt = "Fev's Diner",
  className = "",
  ...props
}: BrandLogoProps) {
  return (
    <Image
      src="/fevs-diner-logo.png"
      alt={alt}
      className={`bg-transparent ${className}`.trim()}
      {...props}
    />
  );
}
