import { createOgImage, OG_IMAGE_SIZE } from '@/lib/og';

export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return createOgImage({
    title: 'Make any TypeScript Function Durable',
    description:
      '"use workflow" brings durability, reliability, and observability to async JavaScript. Build apps and AI Agents that can suspend, resume, and maintain state with ease.',
  });
}
