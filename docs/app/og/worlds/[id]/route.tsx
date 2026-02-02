import type { NextRequest } from 'next/server';
import { createOgImage } from '@/lib/og';
import { getWorldData, getWorldIds } from '@/lib/worlds-data';

export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
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
};

export const generateStaticParams = () => getWorldIds().map((id) => ({ id }));
