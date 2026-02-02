import { createOgImage, OG_IMAGE_SIZE } from '@/lib/og';
import { getWorldData, getWorldIds } from '@/lib/worlds-data';

export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

export function generateStaticParams() {
  const ids = getWorldIds();
  return ids.map((id) => ({ id }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getWorldData(id);

  if (!data) {
    return new Response('Not found', { status: 404 });
  }

  const { world } = data;

  return createOgImage({
    title: `${world.name} World`,
    description: world.description,
    badge: {
      text: world.type === 'official' ? 'Official' : 'Community',
      color: world.type === 'official' ? '#3b82f6' : '#8b5cf6',
    },
  });
}
