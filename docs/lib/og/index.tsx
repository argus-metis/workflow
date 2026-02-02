import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/** Standard OpenGraph image dimensions */
export const OG_IMAGE_SIZE = { width: 1200, height: 628 };

export type OgImageOptions = {
  title: string;
  description?: string;
  badge?: {
    text: string;
    color: string;
  };
};

let fontsPromise: Promise<{ regular: Buffer; semibold: Buffer }> | null = null;
let backgroundPromise: Promise<ArrayBuffer> | null = null;

const loadFonts = () => {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      readFile(join(process.cwd(), 'lib/og/assets/geist-sans-regular.ttf')),
      readFile(join(process.cwd(), 'lib/og/assets/geist-sans-semibold.ttf')),
    ]).then(([regular, semibold]) => ({ regular, semibold }));
  }
  return fontsPromise;
};

const loadBackground = () => {
  if (!backgroundPromise) {
    backgroundPromise = readFile(
      join(process.cwd(), 'lib/og/assets/background.png')
    ).then((buf) =>
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    );
  }
  return backgroundPromise;
};

export const createOgImage = async ({
  title,
  description,
  badge,
}: OgImageOptions) => {
  const [fonts, backgroundImage] = await Promise.all([
    loadFonts(),
    loadBackground(),
  ]);

  return new ImageResponse(
    <div style={{ fontFamily: 'Geist' }} tw="flex h-full w-full">
      {/** biome-ignore lint/performance/noImgElement: Required for Satori */}
      <img
        alt="Background"
        height={OG_IMAGE_SIZE.height}
        src={backgroundImage as never}
        width={OG_IMAGE_SIZE.width}
      />
      <div tw="flex flex-col absolute w-[600px] left-[60px] top-[140px]">
        {badge && (
          <span
            style={{ backgroundColor: badge.color }}
            tw="text-sm font-semibold text-white px-4 py-1.5 rounded-full mb-5 self-start uppercase tracking-wide"
          >
            {badge.text}
          </span>
        )}
        <div
          style={{ letterSpacing: '-0.04em' }}
          tw="flex flex-wrap text-[56px] font-semibold leading-[1.15] mb-4"
        >
          <span tw="text-white">Workflow:&nbsp;</span>
          <span tw="text-[#888888]">{title}</span>
        </div>
        {description && (
          <div
            style={{
              lineHeight: '32px',
            }}
            tw="text-[24px] text-[#666666]"
          >
            {description}
          </div>
        )}
      </div>
    </div>,
    {
      ...OG_IMAGE_SIZE,
      fonts: [
        {
          name: 'Geist',
          data: fonts.regular,
          weight: 400,
        },
        {
          name: 'Geist',
          data: fonts.semibold,
          weight: 600,
        },
      ],
    }
  );
};
