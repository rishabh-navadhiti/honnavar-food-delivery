/**
 * next/image custom loader. Uploaded photos are served from /media/<id>/<variant>,
 * where `s` is 320 px wide and `l` is 800 px wide (research R7). Other sources pass through.
 */
export default function mediaLoader({ src, width }: { src: string; width: number }): string {
  const match = /^\/media\/([0-9a-f-]{36})$/.exec(src);
  if (!match) return src;
  return `/media/${match[1]}/${width <= 320 ? 's' : 'l'}`;
}

export function mediaSrc(imageId: string): string {
  return `/media/${imageId}`;
}
