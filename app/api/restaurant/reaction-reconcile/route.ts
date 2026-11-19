import { restaurantOutboundRoute } from '@/server/restaurantOutboundRoute';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = (request: Request) => restaurantOutboundRoute(request, 'reaction');
