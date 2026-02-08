export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'zkproofport-landing',
    timestamp: new Date().toISOString(),
  });
}
